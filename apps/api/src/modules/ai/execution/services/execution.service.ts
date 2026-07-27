import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../../../common/database/prisma.service";
import { ExecutionRepository } from "../repositories/execution.repository";
import {
  ExecutionStartedEvent,
  ExecutionCompletedEvent,
  ExecutionFailedEvent,
} from "../events/execution.events";

import { AgentExecution, Agent, AgentVersion } from "@aiops-hub/db";

@Injectable()
export class ExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ExecutionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createExecution(params: {
    agentId: string;
    organizationId: string;
    userId: string;
    input: any;
    requestId: string;
  }): Promise<{
    execution: AgentExecution;
    agent: Agent;
    version: AgentVersion & { providerConfig: { provider: string } };
  }> {
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: params.agentId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          include: {
            providerConfig: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException("Agent not found or unauthorized");
    }

    const version = agent.versions[0];
    if (!version) {
      throw new NotFoundException("Agent has no active versions");
    }

    const executionId = crypto.randomUUID();

    const execution = await this.repository.create({
      id: executionId,
      agentId: agent.id,
      agentVersionId: version.id,
      providerConfigId: version.providerConfigId,
      model: version.model,
      organizationId: params.organizationId,
      userId: params.userId,
      input: params.input,
      requestId: params.requestId,
      status: "PENDING",
    });

    this.eventEmitter.emit(
      "execution.started",
      new ExecutionStartedEvent(
        executionId,
        params.organizationId,
        agent.id,
        params.input,
      ),
    );

    return { execution, agent, version };
  }

  async completeExecution(
    id: string,
    organizationId: string,
    agentId: string,
    output: any,
    metrics: {
      promptTokens: number;
      completionTokens: number;
      latencyMs: number;
      cost: number;
      toolsInvoked?: any;
    },
  ): Promise<AgentExecution> {
    const updated = await this.repository.update(id, {
      status: "COMPLETED",
      output,
      completedAt: new Date(),
      latencyMs: metrics.latencyMs,
      promptTokens: metrics.promptTokens,
      completionTokens: metrics.completionTokens,
      totalCost: metrics.cost,
      toolsInvoked: metrics.toolsInvoked,
    });

    this.eventEmitter.emit(
      "execution.completed",
      new ExecutionCompletedEvent(id, organizationId, agentId, output, metrics),
    );

    return updated;
  }

  async failExecution(
    id: string,
    organizationId: string,
    agentId: string,
    error: string,
    metrics?: {
      promptTokens: number;
      completionTokens: number;
      latencyMs: number;
    },
  ): Promise<AgentExecution> {
    const updated = await this.repository.update(id, {
      status: "FAILED",
      errorMessage: error,
      completedAt: new Date(),
      latencyMs: metrics?.latencyMs,
      promptTokens: metrics?.promptTokens || 0,
      completionTokens: metrics?.completionTokens || 0,
    });

    this.eventEmitter.emit(
      "execution.failed",
      new ExecutionFailedEvent(id, organizationId, agentId, error, metrics),
    );

    return updated;
  }
}
