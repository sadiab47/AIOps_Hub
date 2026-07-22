import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Conversation, Message, MessageRole, Prisma } from '@aiops-hub/db';
import {
  CONVERSATION_REPOSITORY_TOKEN,
  ConversationRepositoryInterface,
} from '../repositories/conversation-repository.interface';
import { PrismaService } from '../../../common/database/prisma.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY_TOKEN)
    private readonly repository: ConversationRepositoryInterface,
    private readonly prisma: PrismaService,
  ) {}

  async create(orgId: string, dto: CreateConversationDto): Promise<Conversation> {
    const providerConfig = await this.prisma.aiProviderConfig.findFirst({
      where: { id: dto.providerConfigId, organizationId: orgId },
    });
    if (!providerConfig) {
      throw new NotFoundException('AI Provider configuration not found in this organization');
    }

    return this.repository.executeTransaction(async (tx) => {
      const conversation = await this.repository.createConversation(
        {
          organization: { connect: { id: orgId } },
          title: dto.title,
          provider: providerConfig.provider,
          providerConfig: { connect: { id: dto.providerConfigId } },
          model: dto.model,
          temperature: dto.temperature ?? 0.7,
          systemPrompt: dto.systemPrompt || null,
        },
        tx,
      );

      if (dto.systemPrompt) {
        await this.repository.createMessage(
          {
            conversation: { connect: { id: conversation.id } },
            role: MessageRole.SYSTEM,
            content: dto.systemPrompt,
          },
          tx,
        );
      }

      return conversation;
    });
  }

  async getOne(orgId: string, id: string): Promise<Conversation & { messages: Message[] }> {
    const conversation = await this.repository.getConversation(id, orgId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    const messages = await this.repository.listMessages(id);
    return {
      ...conversation,
      messages,
    };
  }

  async list(orgId: string): Promise<Conversation[]> {
    return this.repository.listConversations(orgId);
  }

  async delete(orgId: string, id: string): Promise<void> {
    const conversation = await this.repository.getConversation(id, orgId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    await this.repository.deleteConversation(id);
  }
}
