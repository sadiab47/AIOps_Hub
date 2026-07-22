import { MessageRole } from '@aiops-hub/db';

export interface MemoryMessageInput {
  role: MessageRole;
  content: string;
}

export interface MemoryProvider {
  /**
   * Trims the provided array of messages to stay safely within the model context limit.
   * Ensures that index 0 (if it is a SYSTEM prompt) is always preserved at the very top of the list.
   */
  trimMessages(
    model: string,
    messages: MemoryMessageInput[],
    maxTokensLimit?: number,
  ): MemoryMessageInput[];

  /**
   * Estimates token count for a list of messages.
   */
  estimateTokenCount(messages: MemoryMessageInput[]): number;
}
export const MEMORY_PROVIDER_TOKEN = Symbol('MEMORY_PROVIDER_TOKEN');
