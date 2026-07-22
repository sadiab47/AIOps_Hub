import { Conversation, Message, AiUsageLog, Prisma } from '@aiops-hub/db';

export const CONVERSATION_REPOSITORY_TOKEN = Symbol('CONVERSATION_REPOSITORY_TOKEN');

export interface ConversationRepositoryInterface {
  createConversation(
    data: Prisma.ConversationCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Conversation>;

  getConversation(id: string, orgId: string): Promise<Conversation | null>;

  listConversations(orgId: string): Promise<Conversation[]>;

  deleteConversation(id: string): Promise<void>;

  createMessage(
    data: Prisma.MessageCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Message>;

  listMessages(conversationId: string): Promise<Message[]>;

  createUsageLog(
    data: Prisma.AiUsageLogCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AiUsageLog>;

  executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
}
