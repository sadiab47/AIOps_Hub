import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAccessGuard } from "../../../../common/auth/jwt-access.guard";
import { TenantContextGuard } from "../../../../common/auth/tenant-context.guard";
import { ExecutionService } from "../services/execution.service";
import { ExecutionRuntimeService } from "../services/execution-runtime.service";
import { PrismaService } from "../../../../common/database/prisma.service";

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiHeader,
  ApiParam,
} from "@nestjs/swagger";
import { AgentExecution } from "@aiops-hub/db";

@ApiTags("Agent Executions")
@ApiCookieAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Active organization context ID",
})
@Controller("ai/agents")
@UseGuards(JwtAccessGuard, TenantContextGuard)
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly runtimeService: ExecutionRuntimeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(":id/execute")
  @ApiOperation({ summary: "Execute agent loop synchronously (blocking)" })
  @ApiParam({ name: "id", description: "Target agent ID" })
  @ApiResponse({ status: 201, description: "Execution finished successfully." })
  @ApiResponse({ status: 400, description: "Bad request or validation error." })
  @ApiResponse({
    status: 401,
    description: "Authentication credentials missing.",
  })
  @ApiResponse({
    status: 403,
    description: "Access denied or tenant context mismatch.",
  })
  @ApiResponse({
    status: 404,
    description: "Agent or associated prompt template not found.",
  })
  @ApiResponse({
    status: 500,
    description: "LLM provider or runtime loop exception.",
  })
  async execute(
    @Param("id") id: string,
    @Body() body: { input: any; variables?: Record<string, string> },
    @Req() req: any,
  ) {
    const orgId = req.headers["x-organization-id"];
    const userId = req.context.userId;
    const requestId = crypto.randomUUID();

    const { execution, agent, version } =
      await this.executionService.createExecution({
        agentId: id,
        organizationId: orgId,
        userId,
        input: body.input,
        requestId,
      });

    // Populate Context dependencies
    let promptVersion: any = null;
    if (version.promptVersionId) {
      promptVersion = await this.prisma.promptVersion.findUnique({
        where: { id: version.promptVersionId },
      });
    }

    const linkedTools = await this.prisma.agentTool.findMany({
      where: { agentId: agent.id },
    });
    // Map tool details from tool database config mocks if tools exist
    const availableToolsList: any[] = [];
    for (const t of linkedTools) {
      availableToolsList.push({
        name: t.toolId,
        description: `Agent custom utility tool ${t.toolId}`,
        inputSchema: { type: "object", properties: {} },
      });
    }

    const context = {
      requestId,
      organizationId: orgId,
      userId,
      executionId: execution.id,
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
            typeof body.input === "string"
              ? body.input
              : JSON.stringify(body.input),
        },
      ],
      availableTools: availableToolsList,
    };

    try {
      const output = await this.runtimeService.run(context);
      return { success: true, data: output };
    } catch (err: any) {
      await this.executionService.failExecution(
        execution.id,
        orgId,
        agent.id,
        err.message,
      );
      throw err;
    }
  }

  @Post(":id/execute/stream")
  @ApiOperation({
    summary:
      "Execute agent loop and stream results back via Server-Sent Events (SSE)",
  })
  @ApiParam({ name: "id", description: "Target agent ID" })
  @ApiResponse({
    status: 201,
    description:
      "Event stream initiated. Streams events: start -> metadata -> tool -> tool-result -> token -> usage -> done",
  })
  @ApiResponse({ status: 400, description: "Bad request or validation error." })
  @ApiResponse({
    status: 401,
    description: "Authentication credentials missing.",
  })
  @ApiResponse({
    status: 403,
    description: "Access denied or tenant context mismatch.",
  })
  @ApiResponse({
    status: 500,
    description: "LLM provider or runtime loop exception.",
  })
  async executeStream(
    @Param("id") id: string,
    @Body() body: { input: any; variables?: Record<string, string> },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const orgId = req.headers["x-organization-id"];
    const userId = req.context.userId;
    const requestId = crypto.randomUUID();

    // SSE headers setup
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendSse = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const { execution, agent, version } =
      await this.executionService.createExecution({
        agentId: id,
        organizationId: orgId,
        userId,
        input: body.input,
        requestId,
      });

    let promptVersion: any = null;
    if (version.promptVersionId) {
      promptVersion = await this.prisma.promptVersion.findUnique({
        where: { id: version.promptVersionId },
      });
    }

    const linkedTools = await this.prisma.agentTool.findMany({
      where: { agentId: agent.id },
    });
    const availableToolsList: any[] = [];
    for (const t of linkedTools) {
      availableToolsList.push({
        name: t.toolId,
        description: `Agent custom utility tool ${t.toolId}`,
        inputSchema: { type: "object", properties: {} },
      });
    }

    const context = {
      requestId,
      organizationId: orgId,
      userId,
      executionId: execution.id,
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
            typeof body.input === "string"
              ? body.input
              : JSON.stringify(body.input),
        },
      ],
      availableTools: availableToolsList,
    };

    try {
      await this.runtimeService.run(context, sendSse);
      sendSse("done", {});
      res.end();
    } catch (err: any) {
      await this.executionService.failExecution(
        execution.id,
        orgId,
        agent.id,
        err.message,
      );
      sendSse("error", { message: err.message });
      res.end();
    }
  }

  @Get("executions")
  @ApiOperation({
    summary: "List execution history for the active organization",
  })
  @ApiResponse({
    status: 200,
    description: "List of execution records retrieved.",
  })
  async listExecutions(
    @Req() req: any,
  ): Promise<{ success: boolean; data: AgentExecution[] }> {
    const orgId = req.headers["x-organization-id"];
    const executions = await this.prisma.agentExecution.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: executions };
  }

  @Get("executions/:executionId")
  @ApiOperation({ summary: "Get details of a single execution by ID" })
  @ApiParam({ name: "executionId", description: "Execution ID" })
  @ApiResponse({ status: 200, description: "Execution details retrieved." })
  @ApiResponse({ status: 404, description: "Execution not found." })
  async getExecution(
    @Param("executionId") executionId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; data: AgentExecution }> {
    const orgId = req.headers["x-organization-id"];
    const execution = await this.prisma.agentExecution.findFirst({
      where: { id: executionId, organizationId: orgId },
    });
    if (!execution) {
      throw new NotFoundException(`Execution '${executionId}' not found.`);
    }
    return { success: true, data: execution };
  }
}
