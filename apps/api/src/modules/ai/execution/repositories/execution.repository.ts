import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../common/database/prisma.service";
import { AgentExecution } from "@aiops-hub/db";

@Injectable()
export class ExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    agentId: string;
    agentVersionId: string;
    providerConfigId: string;
    model: string;
    organizationId: string;
    userId: string;
    input: any;
    requestId: string;
    status: "PENDING" | "RUNNING";
  }): Promise<AgentExecution> {
    return this.prisma.agentExecution.create({
      data: {
        id: data.id,
        agentId: data.agentId,
        agentVersionId: data.agentVersionId,
        providerConfigId: data.providerConfigId,
        model: data.model,
        organizationId: data.organizationId,
        userId: data.userId,
        input: data.input,
        requestId: data.requestId,
        status: data.status,
      },
    });
  }

  async update(
    id: string,
    data: {
      status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMEOUT";
      output?: any;
      completedAt?: Date;
      cancelledAt?: Date;
      latencyMs?: number;
      promptTokens?: number;
      completionTokens?: number;
      totalCost?: number;
      toolsInvoked?: any;
      errorMessage?: string;
    },
  ): Promise<AgentExecution> {
    return this.prisma.agentExecution.update({
      where: { id },
      data,
    });
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<AgentExecution | null> {
    return this.prisma.agentExecution.findFirst({
      where: { id, organizationId },
    });
  }
}
