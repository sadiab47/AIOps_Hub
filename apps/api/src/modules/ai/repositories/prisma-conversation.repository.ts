import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { Conversation, Message, AiUsageLog, Prisma } from '@aiops-hub/db';
import { ConversationRepositoryInterface } from './conversation-repository.interface';

@Injectable()
export class PrismaConversationRepository implements ConversationRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(
    data: Prisma.ConversationCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Conversation> {
    const client = tx || this.prisma;
    return client.conversation.create({ data });
  }

  async getConversation(id: string, orgId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: { id, organizationId: orgId },
      include: {
        providerConfig: true,
      },
    });
  }

  async listConversations(orgId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.delete({
      where: { id },
    });
  }

  async createMessage(
    data: Prisma.MessageCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Message> {
    const client = tx || this.prisma;
    return client.message.create({ data });
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createUsageLog(
    data: Prisma.AiUsageLogCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AiUsageLog> {
    const client = tx || this.prisma;
    return client.aiUsageLog.create({ data });
  }

  async executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
