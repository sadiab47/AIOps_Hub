import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { Prompt, PromptVersion, PromptVisibility, Prisma } from '@aiops-hub/db';
import { PromptRepositoryInterface } from './prompt-repository.interface';

@Injectable()
export class PrismaPromptRepository implements PromptRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.PromptCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Prompt> {
    const client = tx || this.prisma;
    return client.prompt.create({ data });
  }

  async update(
    id: string,
    data: Prisma.PromptUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Prompt> {
    const client = tx || this.prisma;
    return client.prompt.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.prompt.delete({
      where: { id },
    });
  }

  async findById(id: string, orgId: string | null): Promise<Prompt | null> {
    return this.prisma.prompt.findFirst({
      where: {
        id,
        OR: [
          { organizationId: orgId },
          { visibility: PromptVisibility.SYSTEM },
        ],
      },
      include: {
        category: true,
      },
    });
  }

  async findBySlug(orgId: string | null, slug: string): Promise<Prompt | null> {
    return this.prisma.prompt.findFirst({
      where: {
        organizationId: orgId,
        slug,
      },
      include: {
        category: true,
      },
    });
  }

  async list(
    orgId: string | null,
    categoryId?: string,
    visibility?: PromptVisibility,
  ): Promise<Prompt[]> {
    return this.prisma.prompt.findMany({
      where: {
        OR: [
          { organizationId: orgId },
          { visibility: PromptVisibility.SYSTEM },
        ],
        ...(categoryId && { categoryId }),
        ...(visibility && { visibility }),
      },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLatestVersion(promptId: string): Promise<PromptVersion | null> {
    return this.prisma.promptVersion.findFirst({
      where: { promptId, isActive: true },
      orderBy: { version: 'desc' },
    });
  }

  async getVersion(promptId: string, version: number): Promise<PromptVersion | null> {
    return this.prisma.promptVersion.findUnique({
      where: {
        promptId_version: {
          promptId,
          version,
        },
      },
    });
  }

  async listVersions(promptId: string): Promise<PromptVersion[]> {
    return this.prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: { version: 'desc' },
    });
  }

  async createVersion(
    data: Prisma.PromptVersionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PromptVersion> {
    const client = tx || this.prisma;
    return client.promptVersion.create({ data });
  }

  async existsSlug(orgId: string | null, slug: string): Promise<boolean> {
    const count = await this.prisma.prompt.count({
      where: {
        organizationId: orgId,
        slug,
      },
    });
    return count > 0;
  }

  async executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
