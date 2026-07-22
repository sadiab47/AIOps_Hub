import { Injectable } from '@nestjs/common';
import { Conversation, Message, MessageRole } from '@aiops-hub/db';
import { ChatMessageInput } from '../../../common/ai/types/ai-provider.interface';
import { MemoryProvider } from './memory-provider.interface';
import { MemoryBudget } from './memory-budget.interface';
import { ContextBuilder } from './context-builder';

@Injectable()
export class SlidingWindowMemoryProvider implements MemoryProvider {
  constructor(private readonly contextBuilder: ContextBuilder) {}

  async buildContext(
    conversation: Conversation & { messages: Message[]; summaries: any[] },
    budget: MemoryBudget,
  ): Promise<ChatMessageInput[]> {
    // 1. Get raw history messages
    const rawMessages = conversation.messages;

    // 2. Trim older message history to fit in budget.maxHistoryTokens
    const trimmedHistory = this.trimToBudget(rawMessages, budget.maxHistoryTokens);

    // 3. Assemble and return context (sliding window uses no summaries)
    return this.contextBuilder.assemble(
      conversation.systemPrompt,
      null, // sliding window does not prepend summaries
      trimmedHistory,
    );
  }

  async shouldSummarize(
    conversation: Conversation & { messages: Message[]; summaries: any[] },
    budget: MemoryBudget,
  ): Promise<boolean> {
    return false;
  }

  async summarize(
    conversation: Conversation & { messages: Message[]; summaries: any[] },
  ): Promise<void> {
    // No-op for sliding window
  }

  private trimToBudget(messages: Message[], limit: number): Message[] {
    let currentTokens = this.estimateTokenCount(messages);
    if (currentTokens <= limit) {
      return [...messages];
    }

    const workingHistory = [...messages];
    // Remove oldest messages first
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
