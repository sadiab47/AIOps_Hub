import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { AiProviderConfig, Prisma } from '@aiops-hub/db';
import { AiProviderRepositoryInterface } from './ai-provider-repository.interface';

@Injectable()
export class PrismaAiProviderRepository implements AiProviderRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.AiProviderConfigCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AiProviderConfig> {
    const client = tx || this.prisma;
    return client.aiProviderConfig.create({ data });
  }

  async update(
    id: string,
    data: Prisma.AiProviderConfigUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AiProviderConfig> {
    const client = tx || this.prisma;
    return client.aiProviderConfig.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.aiProviderConfig.delete({
      where: { id },
    });
  }

  async findById(id: string, orgId: string): Promise<AiProviderConfig | null> {
    return this.prisma.aiProviderConfig.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  async findByName(orgId: string, name: string): Promise<AiProviderConfig | null> {
    return this.prisma.aiProviderConfig.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name,
        },
      },
    });
  }

  async findDefault(orgId: string): Promise<AiProviderConfig | null> {
    return this.prisma.aiProviderConfig.findFirst({
      where: { organizationId: orgId, isDefault: true, isActive: true },
    });
  }

  async listByOrg(orgId: string): Promise<AiProviderConfig[]> {
    return this.prisma.aiProviderConfig.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unsetDefault(orgId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.aiProviderConfig.updateMany({
      where: { organizationId: orgId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
