import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Agent, AgentVersion } from '@aiops-hub/db';
import {
  AGENT_REPOSITORY_TOKEN,
  AgentRepositoryInterface,
  AgentWithVersions,
} from '../repositories/agent-repository.interface';
import { AI_PROVIDER_REPOSITORY_TOKEN } from '../repositories/ai-provider-repository.interface';
import { PROMPT_REPOSITORY_TOKEN } from '../repositories/prompt-repository.interface';
import { PrismaService } from '../../../common/database/prisma.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { CreateAgentDto } from '../dto/create-agent.dto';
import {
  AgentCreatedEvent,
  AgentUpdatedEvent,
  AgentDeletedEvent,
  AgentEnabledEvent,
  AgentDisabledEvent,
} from '../events/agent.events';
import { EventCorrelationContext } from '../../../common/events/domain-event';

@Injectable()
export class AgentService {
  constructor(
    @Inject(AGENT_REPOSITORY_TOKEN)
    private readonly repository: AgentRepositoryInterface,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(
    orgId: string,
    createdById: string,
    dto: CreateAgentDto,
    correlation: EventCorrelationContext = {},
  ): Promise<AgentWithVersions> {
    // 1. Uniqueness checks
    const nameExists = await this.repository.existsByName(dto.name, orgId);
    if (nameExists) {
      throw new ConflictException(`Agent with name "${dto.name}" already exists in this organization`);
    }

    const slugExists = await this.repository.existsBySlug(dto.slug, orgId);
    if (slugExists) {
      throw new ConflictException(`Agent with slug "${dto.slug}" already exists in this organization`);
    }

    // 2. Validate provider config
    const providerConfig = await this.prisma.aiProviderConfig.findFirst({
      where: { id: dto.version.providerConfigId, organizationId: orgId },
    });
    if (!providerConfig) {
      throw new BadRequestException('Selected AI Provider configuration does not exist or belongs to another tenant');
    }

    // 3. Validate prompt version
    if (dto.version.promptVersionId) {
      const promptVersion = await this.prisma.promptVersion.findFirst({
        where: { id: dto.version.promptVersionId },
        include: { prompt: true },
      });
      if (!promptVersion || promptVersion.prompt.organizationId !== orgId) {
        throw new BadRequestException('Selected Prompt version does not exist or belongs to another tenant');
      }
    }

    const agent = await this.repository.create({
      organizationId: orgId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      createdById,
      version: dto.version,
    });

    this.eventBus.publish(
      new AgentCreatedEvent(
        {
          agentId: agent.id,
          organizationId: orgId,
          name: agent.name,
          slug: agent.slug,
          currentVersion: 1,
        },
        correlation,
      ),
    );

    return agent;
  }

  async findById(id: string, orgId: string): Promise<AgentWithVersions> {
    const agent = await this.repository.findById(id, orgId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  async list(orgId: string): Promise<Agent[]> {
    return this.repository.list(orgId);
  }

  async updateVersion(
    id: string,
    orgId: string,
    dto: CreateAgentDto['version'],
    correlation: EventCorrelationContext = {},
  ): Promise<AgentWithVersions> {
    const agent = await this.repository.findById(id, orgId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Validate provider config
    const providerConfig = await this.prisma.aiProviderConfig.findFirst({
      where: { id: dto.providerConfigId, organizationId: orgId },
    });
    if (!providerConfig) {
      throw new BadRequestException('Selected AI Provider configuration does not exist or belongs to another tenant');
    }

    // Validate prompt version
    if (dto.promptVersionId) {
      const promptVersion = await this.prisma.promptVersion.findFirst({
        where: { id: dto.promptVersionId },
        include: { prompt: true },
      });
      if (!promptVersion || promptVersion.prompt.organizationId !== orgId) {
        throw new BadRequestException('Selected Prompt version does not exist or belongs to another tenant');
      }
    }

    const nextVersion = agent.currentVersion + 1;
    const updated = await this.repository.updateVersion(id, orgId, nextVersion, dto);

    this.eventBus.publish(
      new AgentUpdatedEvent(
        {
          agentId: id,
          organizationId: orgId,
          newVersion: nextVersion,
        },
        correlation,
      ),
    );

    return updated;
  }

  async enable(id: string, orgId: string, correlation: EventCorrelationContext = {}): Promise<Agent> {
    const agent = await this.repository.findById(id, orgId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.repository.enable(id, orgId);

    this.eventBus.publish(
      new AgentEnabledEvent(
        {
          agentId: id,
          organizationId: orgId,
        },
        correlation,
      ),
    );

    return updated;
  }

  async disable(id: string, orgId: string, correlation: EventCorrelationContext = {}): Promise<Agent> {
    const agent = await this.repository.findById(id, orgId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const updated = await this.repository.disable(id, orgId);

    this.eventBus.publish(
      new AgentDisabledEvent(
        {
          agentId: id,
          organizationId: orgId,
        },
        correlation,
      ),
    );

    return updated;
  }

  async delete(id: string, orgId: string, correlation: EventCorrelationContext = {}): Promise<Agent> {
    const agent = await this.repository.findById(id, orgId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const deleted = await this.repository.softDelete(id, orgId);

    this.eventBus.publish(
      new AgentDeletedEvent(
        {
          agentId: id,
          organizationId: orgId,
        },
        correlation,
      ),
    );

    return deleted;
  }
}
