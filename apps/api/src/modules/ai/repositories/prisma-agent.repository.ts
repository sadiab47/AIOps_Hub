import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { Agent, AgentVersion } from '@aiops-hub/db';
import {
  AgentRepositoryInterface,
  AgentWithVersions,
  CreateAgentInput,
} from './agent-repository.interface';

@Injectable()
export class PrismaAgentRepository implements AgentRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAgentInput): Promise<AgentWithVersions> {
    return this.prisma.$transaction(async (tx) => {
      const agent = await tx.agent.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          createdById: data.createdById,
          currentVersion: 1,
        },
      });

      const version = await tx.agentVersion.create({
        data: {
          agentId: agent.id,
          version: 1,
          providerConfigId: data.version.providerConfigId,
          model: data.version.model,
          promptVersionId: data.version.promptVersionId || undefined,
          temperature: data.version.temperature ?? 0.7,
          maxTokens: data.version.maxTokens || undefined,
        },
      });

      return {
        ...agent,
        versions: [version],
      };
    });
  }

  async findById(id: string, orgId: string): Promise<AgentWithVersions | null> {
    return this.prisma.agent.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
  }

  async findBySlug(slug: string, orgId: string): Promise<Agent | null> {
    return this.prisma.agent.findFirst({
      where: { slug, organizationId: orgId, deletedAt: null },
    });
  }

  async list(orgId: string): Promise<Agent[]> {
    return this.prisma.agent.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateVersion(
    id: string,
    orgId: string,
    nextVersion: number,
    data: CreateAgentInput['version'],
  ): Promise<AgentWithVersions> {
    return this.prisma.$transaction(async (tx) => {
      const agent = await tx.agent.update({
        where: { id },
        data: {
          currentVersion: nextVersion,
        },
      });

      await tx.agentVersion.create({
        data: {
          agentId: agent.id,
          version: nextVersion,
          providerConfigId: data.providerConfigId,
          model: data.model,
          promptVersionId: data.promptVersionId || undefined,
          temperature: data.temperature ?? 0.7,
          maxTokens: data.maxTokens || undefined,
        },
      });

      const updatedAgent = await tx.agent.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: { version: 'desc' },
          },
        },
      });

      return updatedAgent!;
    });
  }

  async updateMetadata(
    id: string,
    orgId: string,
    data: { name?: string; description?: string },
  ): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async softDelete(id: string, orgId: string): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        enabled: false,
      },
    });
  }

  async enable(id: string, orgId: string): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id },
      data: { enabled: true },
    });
  }

  async disable(id: string, orgId: string): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id },
      data: { enabled: false },
    });
  }

  async existsByName(name: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.agent.count({
      where: { name, organizationId: orgId, deletedAt: null },
    });
    return count > 0;
  }

  async existsBySlug(slug: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.agent.count({
      where: { slug, organizationId: orgId, deletedAt: null },
    });
    return count > 0;
  }
}
