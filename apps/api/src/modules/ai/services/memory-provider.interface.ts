import { Conversation, Message } from '@aiops-hub/db';
import { ChatMessageInput } from '../../../common/ai/types/ai-provider.interface';
import { MemoryBudget } from './memory-budget.interface';

export const MEMORY_PROVIDER_TOKEN = Symbol('MEMORY_PROVIDER_TOKEN');

export interface MemoryMessageInput {
  role: any;
  content: string;
}

export interface MemoryProvider {
  buildContext(
    conversation: Conversation & { messages: Message[]; summaries: any[] },
    budget: MemoryBudget,
  ): Promise<ChatMessageInput[]>;

  shouldSummarize(
    conversation: Conversation & { messages: Message[]; summaries: any[] },
    budget: MemoryBudget,
  ): Promise<boolean>;

  summarize(
    conversation: Conversation & { messages: Message[]; summaries: any[] },
  ): Promise<void>;
}
