import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Conversation, Message, MessageRole, FinishReason, AiRequestStatus, Prisma } from '@aiops-hub/db';
import {
  CONVERSATION_REPOSITORY_TOKEN,
  ConversationRepositoryInterface,
} from '../repositories/conversation-repository.interface';
import { MEMORY_PROVIDER_TOKEN, MemoryProvider } from './memory-provider.interface';
import { CredentialService } from '../../../common/ai/services/credential.service';
import { AiProviderFactory } from '../../../common/ai/factories/ai-provider.factory';
import { PromptVariableEngineService } from './prompt-variable-engine.service';
import { PrismaService } from '../../../common/database/prisma.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatCompletionRequest, ChatMessageInput } from '../../../common/ai/types/ai-provider.interface';
import {
  MessageSentEvent,
  MessageStreamedEvent,
} from '../events/chat.events';
import { EventCorrelationContext } from '../../../common/events/domain-event';

@Injectable()
export class ChatOrchestrator {
  constructor(
    @Inject(CONVERSATION_REPOSITORY_TOKEN)
    private readonly repository: ConversationRepositoryInterface,
    @Inject(MEMORY_PROVIDER_TOKEN)
    private readonly memoryProvider: MemoryProvider,
    private readonly credentialService: CredentialService,
    private readonly providerFactory: AiProviderFactory,
    private readonly variableEngine: PromptVariableEngineService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Orchestrates sending a message and yields an async generator of stream events.
   */
  async *streamMessage(
    orgId: string,
    conversationId: string,
    actorId: string,
    dto: SendMessageDto,
    requestId: string,
    correlation: EventCorrelationContext = {},
  ): AsyncGenerator<
    | { event: 'start'; data: { conversationId: string; requestId: string } }
    | { event: 'metadata'; data: { provider: string; model: string } }
    | { event: 'token'; data: { token: string } }
    | { event: 'usage'; data: any }
    | { event: 'error'; data: { code: string; message: string } }
    | { event: 'done'; data: string },
    void,
    void
  > {
    const conversation = (await this.repository.getConversation(conversationId, orgId)) as any;
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const providerConfig = conversation.providerConfig;
    if (!providerConfig) {
      throw new NotFoundException('AI Provider configuration associated with conversation is missing');
    }

    const credentials = this.credentialService.decryptCredentials(providerConfig.encryptedCredentials);
    const providerInstance = this.providerFactory.getProvider(providerConfig.provider);

    let messageContent = dto.content;

    // 1. If using prompt library, render template variables
    if (dto.promptVersionId) {
      const promptVersion = await this.prisma.promptVersion.findUnique({
        where: { id: dto.promptVersionId },
      });
      if (!promptVersion) {
        throw new NotFoundException('Selected prompt template version not found');
      }

      const preview = this.variableEngine.preview(promptVersion.template, dto.variables || {});
      messageContent = preview.rendered;
    }

    // Yield immediately start & metadata event
    yield { event: 'start', data: { conversationId, requestId } };
    yield { event: 'metadata', data: { provider: providerConfig.provider, model: conversation.model } };

    // 2. Persist User Message
    const userMessage = await this.repository.createMessage({
      conversation: { connect: { id: conversationId } },
      role: MessageRole.USER,
      content: messageContent,
      promptVersion: dto.promptVersionId ? { connect: { id: dto.promptVersionId } } : undefined,
    });

    this.eventBus.publish(
      new MessageSentEvent(
        {
          messageId: userMessage.id,
          conversationId,
          role: MessageRole.USER,
          actorUserId: actorId,
        },
        correlation,
      ),
    );

    // 3. Load entire conversation history for context building
    const rawHistory = await this.repository.listMessages(conversationId);
    const memoryInputs = rawHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 4. Memory Trimming Strategy
    const trimmedInputs = this.memoryProvider.trimMessages(conversation.model, memoryInputs);

    // Map MessageRole enum to provider string literals ('system' | 'user' | 'assistant')
    const messagesInput: ChatMessageInput[] = trimmedInputs.map((m) => {
      let roleVal: 'system' | 'user' | 'assistant' = 'user';
      if (m.role === MessageRole.SYSTEM) roleVal = 'system';
      else if (m.role === MessageRole.ASSISTANT) roleVal = 'assistant';
      return {
        role: roleVal,
        content: m.content,
      };
    });

    // 5. Construct ChatCompletionRequest
    const streamReq: ChatCompletionRequest = {
      model: conversation.model,
      messages: messagesInput,
      temperature: conversation.temperature,
    };

    let generatedText = '';
    const startTimestamp = Date.now();
    let tokenUsage: any = null;

    try {
      const stream = providerInstance.streamCompletion(streamReq, credentials);

      for await (const chunk of stream) {
        generatedText += chunk;
        yield { event: 'token', data: { token: chunk } };
      }

      // Stream completed successfully - construct estimated usage
      const latencyMs = Date.now() - startTimestamp;
      const promptTokens = this.memoryProvider.estimateTokenCount(trimmedInputs);
      const completionTokens = Math.ceil(generatedText.length / 4);

      tokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: this.calculateEstimatedCost(conversation.model, promptTokens, completionTokens),
        latencyMs,
      };

      // Yield final usage summary
      yield { event: 'usage', data: tokenUsage };

      // Persist Assistant Message
      const assistantMessage = await this.repository.createMessage({
        conversation: { connect: { id: conversationId } },
        role: MessageRole.ASSISTANT,
        content: generatedText,
        finishReason: FinishReason.STOP,
        latencyMs,
      });

      // Write Usage Log
      await this.repository.createUsageLog({
        requestId,
        organization: { connect: { id: orgId } },
        conversation: { connect: { id: conversationId } },
        providerConfigId: providerConfig.id,
        provider: providerConfig.provider,
        model: conversation.model,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        totalTokens: tokenUsage.totalTokens,
        estimatedCostUsd: tokenUsage.estimatedCostUsd,
        status: AiRequestStatus.SUCCESS,
        latencyMs,
      });

      this.eventBus.publish(
        new MessageStreamedEvent(
          {
            messageId: assistantMessage.id,
            conversationId,
            actorUserId: actorId,
            tokens: tokenUsage.totalTokens,
          },
          correlation,
        ),
      );

      yield { event: 'done', data: '[DONE]' };
    } catch (error: any) {
      const latencyMs = Date.now() - startTimestamp;
      const isCancellation = error.name === 'AbortError' || error.message?.includes('aborted');

      const promptTokens = this.memoryProvider.estimateTokenCount(trimmedInputs);
      const completionTokens = Math.ceil(generatedText.length / 4);

      if (isCancellation) {
        if (generatedText.length > 0) {
          // Persist partial message if anything was generated
          await this.repository.createMessage({
            conversation: { connect: { id: conversationId } },
            role: MessageRole.ASSISTANT,
            content: generatedText,
            finishReason: FinishReason.CANCELLED,
            latencyMs,
          });
        }

        await this.repository.createUsageLog({
          requestId,
          organization: { connect: { id: orgId } },
          conversation: { connect: { id: conversationId } },
          providerConfigId: providerConfig.id,
          provider: providerConfig.provider,
          model: conversation.model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCostUsd: this.calculateEstimatedCost(conversation.model, promptTokens, completionTokens),
          status: AiRequestStatus.CANCELLED,
          latencyMs,
        });

        yield { event: 'error', data: { code: 'CANCELLED', message: 'Request cancelled by user' } };
      } else {
        // Real stream error (timeouts / provider issues)
        await this.repository.createUsageLog({
          requestId,
          organization: { connect: { id: orgId } },
          conversation: { connect: { id: conversationId } },
          providerConfigId: providerConfig.id,
          provider: providerConfig.provider,
          model: conversation.model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCostUsd: this.calculateEstimatedCost(conversation.model, promptTokens, completionTokens),
          status: AiRequestStatus.FAILED,
          errorCode: error.message || 'UNKNOWN_ERROR',
          latencyMs,
        });

        yield { event: 'error', data: { code: 'PROVIDER_ERROR', message: error.message || 'Streaming failed' } };
      }
    }
  }

  private calculateEstimatedCost(model: string, promptTokens: number, completionTokens: number): number {
    const key = model.toLowerCase();
    if (key.includes('gpt-4o-mini')) {
      return (promptTokens * 0.00000015) + (completionTokens * 0.0000006);
    }
    if (key.includes('gpt-4o')) {
      return (promptTokens * 0.000005) + (completionTokens * 0.000015);
    }
    return 0.0;
  }
}
