import { Injectable, Logger } from '@nestjs/common';
import { Conversation, Message, ConversationSummary, MessageRole } from '@aiops-hub/db';
import { ChatMessageInput } from '../../../common/ai/types/ai-provider.interface';
import { MemoryProvider } from './memory-provider.interface';
import { MemoryBudget } from './memory-budget.interface';
import { ContextBuilder } from './context-builder';
import { PrismaService } from '../../../common/database/prisma.service';
import { AiProviderFactory } from '../../../common/ai/factories/ai-provider.factory';
import { CredentialService } from '../../../common/ai/services/credential.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { ConversationSummarizedEvent } from '../events/chat.events';

@Injectable()
export class SummaryMemoryProvider implements MemoryProvider {
  private readonly logger = new Logger(SummaryMemoryProvider.name);

  constructor(
    private readonly contextBuilder: ContextBuilder,
    private readonly prisma: PrismaService,
    private readonly providerFactory: AiProviderFactory,
    private readonly credentialService: CredentialService,
    private readonly eventBus: EventBusService,
  ) {}

  async buildContext(
    conversation: Conversation & { messages: Message[]; summaries: ConversationSummary[] },
    budget: MemoryBudget,
  ): Promise<ChatMessageInput[]> {
    // 1. Get latest summary
    const latestSummary = this.getLatestSummary(conversation.summaries);
    const summaryText = latestSummary ? latestSummary.summary : null;

    // 2. Identify messages after the latest summary endpoint
    let activeHistory = conversation.messages;
    if (latestSummary && latestSummary.endMessageId) {
      const lastSummaryIndex = conversation.messages.findIndex(
        (m: Message) => m.id === latestSummary.endMessageId,
      );
      if (lastSummaryIndex !== -1) {
        activeHistory = conversation.messages.slice(lastSummaryIndex + 1);
      }
    }

    // 3. Trim active history to fit budget.maxHistoryTokens
    const trimmedHistory = this.trimToBudget(activeHistory, budget.maxHistoryTokens);

    // 4. Assemble context with summary and remaining messages
    return this.contextBuilder.assemble(
      conversation.systemPrompt,
      summaryText,
      trimmedHistory,
    );
  }

  async shouldSummarize(
    conversation: Conversation & { messages: Message[]; summaries: ConversationSummary[] },
    budget: MemoryBudget,
  ): Promise<boolean> {
    const unsummarizedCount = await this.getUnsummarizedMessagesCount(conversation);
    return unsummarizedCount >= conversation.summaryInterval;
  }

  async summarize(
    conversation: Conversation & { messages: Message[]; summaries: ConversationSummary[] },
  ): Promise<void> {
    const unsummarized = await this.getUnsummarizedMessages(conversation);
    if (unsummarized.length === 0) return;

    const providerConfig = await this.prisma.aiProviderConfig.findUnique({
      where: { id: conversation.providerConfigId },
    });
    if (!providerConfig) return;

    const credentials = this.credentialService.decryptCredentials(providerConfig.encryptedCredentials);
    const providerInstance = this.providerFactory.getProvider(providerConfig.provider);

    // Build summarization prompt context
    const chatLogs = unsummarized
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const systemInstruction = 'You are a system assistant summarizing conversation history. Summarize the following dialogue concisely, preserving all user preferences, key metrics, and choices. Do not lose context.';
    const prompt = `Summarize the following chat conversation logs:\n\n${chatLogs}`;

    try {
      let summaryText = '';
      const stream = providerInstance.streamCompletion(
        {
          model: conversation.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        },
        credentials,
      );

      for await (const chunk of stream) {
        summaryText += chunk;
      }

      // Add summary record to DB
      const latestSummary = this.getLatestSummary(conversation.summaries);
      const nextVersion = latestSummary ? latestSummary.version + 1 : 1;

      await this.prisma.conversationSummary.create({
        data: {
          conversationId: conversation.id,
          version: nextVersion,
          summary: summaryText,
          startMessageId: unsummarized[0].id,
          endMessageId: unsummarized[unsummarized.length - 1].id,
          tokenCount: Math.ceil(summaryText.length / 4),
        },
      });

      this.eventBus.publish(
        new ConversationSummarizedEvent({
          conversationId: conversation.id,
          summaryVersion: nextVersion,
          tokenCount: Math.ceil(summaryText.length / 4),
        }),
      );
    } catch (err: any) {
      this.logger.error(`Async summarization failed for conversation ${conversation.id}: ${err.message}`, err.stack);
    }
  }

  private getLatestSummary(summaries: ConversationSummary[]): ConversationSummary | null {
    if (!summaries || summaries.length === 0) return null;
    return [...summaries].sort((a, b) => b.version - a.version)[0];
  }

  private async getUnsummarizedMessagesCount(
    conversation: Conversation & { messages: Message[]; summaries: ConversationSummary[] },
  ): Promise<number> {
    const latestSummary = this.getLatestSummary(conversation.summaries);
    if (!latestSummary) {
      return conversation.messages.length;
    }
    const idx = conversation.messages.findIndex((m: Message) => m.id === latestSummary.endMessageId);
    if (idx === -1) return conversation.messages.length;
    return conversation.messages.length - (idx + 1);
  }

  private async getUnsummarizedMessages(
    conversation: Conversation & { messages: Message[]; summaries: ConversationSummary[] },
  ): Promise<Message[]> {
    const latestSummary = this.getLatestSummary(conversation.summaries);
    if (!latestSummary) {
      return conversation.messages;
    }
    const idx = conversation.messages.findIndex((m: Message) => m.id === latestSummary.endMessageId);
    if (idx === -1) return conversation.messages;
    return conversation.messages.slice(idx + 1);
  }

  private trimToBudget(messages: Message[], limit: number): Message[] {
    let currentTokens = this.estimateTokenCount(messages);
    if (currentTokens <= limit) {
      return [...messages];
    }
    const workingHistory = [...messages];
    while (workingHistory.length > 0 && this.estimateTokenCount(workingHistory) > limit) {
      workingHistory.shift();
    }
    return workingHistory;
  }

  private estimateTokenCount(messages: Message[]): number {
    let totalChars = 0;
    for (const msg of messages) {
      totalChars += msg.content?.length ?? 0;
    }
    return Math.ceil(totalChars / 4);
  }
}
