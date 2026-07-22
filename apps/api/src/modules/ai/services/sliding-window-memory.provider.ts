import { Injectable } from '@nestjs/common';
import { MemoryProvider, MemoryMessageInput } from './memory-provider.interface';
import { MessageRole } from '@aiops-hub/db';

@Injectable()
export class SlidingWindowMemoryProvider implements MemoryProvider {
  /**
   * Estimates token usage. Rule of thumb: ~4 characters per token.
   */
  estimateTokenCount(messages: MemoryMessageInput[]): number {
    let totalChars = 0;
    for (const msg of messages) {
      totalChars += msg.content?.length ?? 0;
    }
    return Math.ceil(totalChars / 4);
  }

  /**
   * Trims message history to fit context limits. Preserves System message at index 0.
   */
  trimMessages(
    model: string,
    messages: MemoryMessageInput[],
    maxTokensLimit?: number,
  ): MemoryMessageInput[] {
    const limit = maxTokensLimit ?? this.getMaxTokenLimitForModel(model);

    let estimated = this.estimateTokenCount(messages);
    if (estimated <= limit) {
      return [...messages];
    }

    const systemPrompt = messages[0]?.role === MessageRole.SYSTEM ? messages[0] : null;
    const workingHistory = systemPrompt ? messages.slice(1) : [...messages];

    while (workingHistory.length > 1 && this.estimateTokenCount(workingHistory) + (systemPrompt ? this.estimateTokenCount([systemPrompt]) : 0) > limit) {
      // Remove oldest message
      workingHistory.shift();
    }

    return systemPrompt ? [systemPrompt, ...workingHistory] : workingHistory;
  }

  private getMaxTokenLimitForModel(model: string): number {
    const key = model.toLowerCase();
    if (key.includes('gpt-4o-mini')) {
      return 64000;
    }
    if (key.includes('gpt-4o')) {
      return 100000;
    }
    if (key.includes('claude-3-5')) {
      return 150000;
    }
    // Fallback limit for local or smaller models (like Ollama llama3)
    return 8000;
  }
}
