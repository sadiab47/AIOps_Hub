import { Injectable, NotFoundException } from '@nestjs/common';
import { Conversation, Message, MemoryStrategy, ConversationSummary } from '@aiops-hub/db';
import { ChatMessageInput } from '../../../common/ai/types/ai-provider.interface';
import { PrismaService } from '../../../common/database/prisma.service';
import { MemoryBudgetCalculator } from './memory-budget.calculator';
import { SlidingWindowMemoryProvider } from './sliding-window-memory.provider';
import { SummaryMemoryProvider } from './summary-memory.provider';
import { EventBusService } from '../../../common/events/event-bus.service';
import { ContextBuiltEvent } from '../events/chat.events';

@Injectable()
export class ConversationMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetCalculator: MemoryBudgetCalculator,
    private readonly slidingWindowProvider: SlidingWindowMemoryProvider,
    private readonly summaryProvider: SummaryMemoryProvider,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Builds context using the selected memory strategy.
   */
  async buildContext(conversationId: string, orgId: string): Promise<ChatMessageInput[]> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: orgId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        summaries: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const budget = this.budgetCalculator.calculate(conversation.model, conversation.maxContextTokens);
    const provider = this.resolveProvider(conversation.memoryStrategy);

    const context = await provider.buildContext(conversation as any, budget);

    const totalChars = context.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
    const tokensUsed = Math.ceil(totalChars / 4);

    this.eventBus.publish(
      new ContextBuiltEvent({
        conversationId,
        messageCount: context.length,
        tokenBudgetUsed: tokensUsed,
      }),
    );

    return context;
  }

  /**
   * Triggers LLM summarization if boundary conditions are met.
   */
  async triggerSummarizationIfNeeded(conversationId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        summaries: true,
      },
    });
    if (!conversation || conversation.memoryStrategy === MemoryStrategy.SLIDING_WINDOW) {
      return;
    }

    const budget = this.budgetCalculator.calculate(conversation.model, conversation.maxContextTokens);
    const provider = this.resolveProvider(conversation.memoryStrategy);

    const shouldSummarize = await provider.shouldSummarize(conversation as any, budget);
    if (shouldSummarize) {
      await provider.summarize(conversation as any);
    }
  }

  private resolveProvider(strategy: MemoryStrategy) {
    if (strategy === MemoryStrategy.SUMMARY || strategy === MemoryStrategy.HYBRID) {
      return this.summaryProvider;
    }
    return this.slidingWindowProvider;
  }
}
