import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../common/database/prisma.service";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { WorkflowContextService, WorkflowExecutionContext } from "./workflow-context.service";
import { ExecutionService } from "../execution/services/execution.service";
import { ExecutionRuntimeService } from "../execution/services/execution-runtime.service";
import { ToolRegistry } from "../tools/services/tool-registry.service";
import { ToolExecutor } from "../tools/services/tool-executor.service";

@Injectable()
export class WorkflowExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowRepo: WorkflowRepository,
    private readonly contextService: WorkflowContextService,
    private readonly agentExecutionService: ExecutionService,
    private readonly agentRuntimeService: ExecutionRuntimeService,
    private readonly toolRegistry: ToolRegistry,
    private readonly toolExecutor: ToolExecutor,
  ) {}

  validateDefinition(definition: any) {
    const steps = definition.steps || [];
    const stepMap = new Map<string, any>(steps.map((s: any) => [s.id, s]));
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (stepId: string) => {
      if (recStack.has(stepId)) {
        throw new Error(`Cycle detected at step: ${stepId}`);
      }
      if (visited.has(stepId)) return;

      visited.add(stepId);
      recStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step && step.next) {
        for (const nextId of step.next) {
          dfs(nextId);
        }
      }
      recStack.delete(stepId);
    };

    if (definition.entryStepId) {
      dfs(definition.entryStepId);
    }
  }

  async execute(
    workflowId: string,
    organizationId: string,
    userId: string,
    input: any,
  ): Promise<any> {
    const workflow = await this.workflowRepo.findById(organizationId, workflowId);
    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    if (workflow.status !== "ACTIVE") {
      throw new BadRequestException("Workflow is not ACTIVE and cannot be executed");
    }

    const latestVersion = await this.workflowRepo.findLatestVersion(workflowId);
    if (!latestVersion) {
      throw new NotFoundException("Workflow has no active version snapshots");
    }

    const definition = latestVersion.definition as any;

    // Static DFS cycle checks
    this.validateDefinition(definition);

    // Create execution entry
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId,
        workflowVersionId: latestVersion.id,
        organizationId,
        userId,
        status: "RUNNING",
        input,
      },
    });

    const context: WorkflowExecutionContext = {
      workflowExecutionId: execution.id,
      workflowId,
      workflowVersionId: latestVersion.id,
      organizationId,
      userId,
      input,
      steps: {},
    };

    let currentStepId = definition.entryStepId;
    const visitCounts = new Map<string, number>();
    let totalExecutedSteps = 0;
    const stepMap = new Map<string, any>((definition.steps || []).map((s: any) => [s.id, s]));

    const totals = {
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0.0,
    };
    const startTime = Date.now();

    while (currentStepId) {
      totalExecutedSteps++;
      if (totalExecutedSteps > 100) {
        const err = new Error("Maximum executed steps limit (100) exceeded");
        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: "FAILED",
            errorMessage: err.message,
            completedAt: new Date(),
            latencyMs: Date.now() - startTime,
          },
        });
        throw err;
      }

      const visits = (visitCounts.get(currentStepId) ?? 0) + 1;
      if (visits > 3) {
        const err = new Error(`Maximum visits to one step limit (3) exceeded for step: ${currentStepId}`);
        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: "FAILED",
            errorMessage: err.message,
            completedAt: new Date(),
            latencyMs: Date.now() - startTime,
          },
        });
        throw err;
      }
      visitCounts.set(currentStepId, visits);

      const step = stepMap.get(currentStepId);
      if (!step) {
        const err = new Error(`Step ID "${currentStepId}" not found in definition`);
        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: "FAILED",
            errorMessage: err.message,
            completedAt: new Date(),
            latencyMs: Date.now() - startTime,
          },
        });
        throw err;
      }

      if (step.type !== "AGENT" && step.type !== "TOOL") {
        const err = new Error(`Unsupported step type: "${step.type}"`);
        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: "FAILED",
            errorMessage: err.message,
            completedAt: new Date(),
            latencyMs: Date.now() - startTime,
          },
        });
        throw err;
      }

      const stepExecution = await this.prisma.workflowStepExecution.create({
        data: {
          workflowExecutionId: execution.id,
          stepId: currentStepId,
          stepName: step.name,
          stepType: step.type,
          status: "RUNNING",
          input: {},
        },
      });

      const stepStartTime = Date.now();
      try {
        const resolvedConfig = this.contextService.resolve(step.config || {}, context, currentStepId);

        await this.prisma.workflowStepExecution.update({
          where: { id: stepExecution.id },
          data: { input: resolvedConfig },
        });

        let output: any;

        if (step.type === "AGENT") {
          const agentId = resolvedConfig.agentId;
          if (!agentId) {
            throw new Error("Missing agentId configuration parameter");
          }

          const agent = await this.prisma.agent.findFirst({
            where: { id: agentId, deletedAt: null },
            include: {
              versions: {
                orderBy: { version: "desc" },
                take: 1,
                include: { providerConfig: true },
              },
            },
          });

          if (!agent) {
            throw new Error(`Agent ID "${agentId}" not found`);
          }

          const version = agent.versions[0];
          if (!version) {
            throw new Error(`Agent ID "${agentId}" has no active versions`);
          }

          const agentExec = await this.agentExecutionService.createExecution({
            agentId,
            organizationId,
            userId,
            input: resolvedConfig.input,
            requestId: crypto.randomUUID(),
          });

          let promptVersion: any = null;
          if (version.promptVersionId) {
            promptVersion = await this.prisma.promptVersion.findUnique({
              where: { id: version.promptVersionId },
            });
          }

          const runtimeCtx = {
            requestId: agentExec.execution.requestId,
            organizationId,
            userId,
            executionId: agentExec.execution.id,
            agent,
            version,
            provider: version.providerConfig.provider,
            providerConfigId: version.providerConfigId,
            model: version.model,
            promptVersion,
            memory: [
              {
                role: "user",
                content:
                  typeof resolvedConfig.input === "string"
                    ? resolvedConfig.input
                    : JSON.stringify(resolvedConfig.input),
              },
            ],
            availableTools: [],
          };

          const agentOutput = await this.agentRuntimeService.run(runtimeCtx);

          const finalResult = await this.agentExecutionService.completeExecution(
            agentExec.execution.id,
            organizationId,
            agentId,
            agentOutput,
            {
              promptTokens: 10,
              completionTokens: 15,
              latencyMs: Date.now() - stepStartTime,
              cost: 0.0005,
            },
          );

          output = agentOutput;
          totals.promptTokens += finalResult.promptTokens || 0;
          totals.completionTokens += finalResult.completionTokens || 0;
          totals.estimatedCostUsd += finalResult.totalCost || 0;

        } else {
          const toolId = resolvedConfig.toolId;
          if (!toolId) {
            throw new Error("Missing toolId parameter in configuration");
          }

          const tool = this.toolRegistry.get(toolId);
          if (!tool) {
            throw new Error(`Tool "${toolId}" not found in registry`);
          }

          const toolResult = await this.toolExecutor.execute(tool, resolvedConfig.arguments || {});
          output = toolResult.result;
        }

        const stepLatency = Date.now() - stepStartTime;

        await this.prisma.workflowStepExecution.update({
          where: { id: stepExecution.id },
          data: {
            status: "COMPLETED",
            output,
            latencyMs: stepLatency,
          },
        });

        context.steps[currentStepId] = {
          status: "COMPLETED",
          output,
        };

        currentStepId = step.next && step.next.length > 0 ? step.next[0] : null;

      } catch (err: any) {
        const stepLatency = Date.now() - stepStartTime;
        await this.prisma.workflowStepExecution.update({
          where: { id: stepExecution.id },
          data: {
            status: "FAILED",
            errorMessage: err.message,
            latencyMs: stepLatency,
          },
        });

        await this.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: "FAILED",
            errorMessage: err.message,
            completedAt: new Date(),
            latencyMs: Date.now() - startTime,
          },
        });

        throw err;
      }
    }

    const stepIds = Object.keys(context.steps);
    const lastStepId = stepIds[stepIds.length - 1];
    const finalOutput = lastStepId ? context.steps[lastStepId]?.output : {};
    const totalLatency = Date.now() - startTime;

    const completedExecution = await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        output: finalOutput,
        latencyMs: totalLatency,
        promptTokens: totals.promptTokens,
        completionTokens: totals.completionTokens,
        estimatedCostUsd: totals.estimatedCostUsd,
        completedAt: new Date(),
      },
    });

    return {
      executionId: execution.id,
      status: "COMPLETED",
      output: finalOutput,
      steps: Object.entries(context.steps).map(([stepId, detail]) => ({
        stepId,
        status: detail.status,
      })),
      usage: {
        promptTokens: totals.promptTokens,
        completionTokens: totals.completionTokens,
        estimatedCostUsd: totals.estimatedCostUsd,
      },
      latencyMs: totalLatency,
    };
  }
}
