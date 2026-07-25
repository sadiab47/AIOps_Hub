import { Controller, Post, Body, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAccessGuard } from '../../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../../common/auth/tenant-context.guard';
import { ExecutionService } from '../services/execution.service';
import { ExecutionRuntimeService } from '../services/execution-runtime.service';
import { PrismaService } from '../../../../common/database/prisma.service';

@Controller('ai/agents')
@UseGuards(JwtAccessGuard, TenantContextGuard)
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly runtimeService: ExecutionRuntimeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':id/execute')
  async execute(
    @Param('id') id: string,
    @Body() body: { input: any; variables?: Record<string, string> },
    @Req() req: any,
  ) {
    const orgId = req.headers['x-organization-id'];
    const userId = req.context.userId;
    const requestId = crypto.randomUUID();

    const { execution, agent, version } = await this.executionService.createExecution({
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
        inputSchema: { type: 'object', properties: {} },
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
      memory: [{ role: 'user', content: typeof body.input === 'string' ? body.input : JSON.stringify(body.input) }],
      availableTools: availableToolsList,
    };

    try {
      const output = await this.runtimeService.run(context);
      return { success: true, data: output };
    } catch (err: any) {
      await this.executionService.failExecution(execution.id, orgId, agent.id, err.message);
      throw err;
    }
  }

  @Post(':id/execute/stream')
  async executeStream(
    @Param('id') id: string,
    @Body() body: { input: any; variables?: Record<string, string> },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const orgId = req.headers['x-organization-id'];
    const userId = req.context.userId;
    const requestId = crypto.randomUUID();

    // SSE headers setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendSse = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const { execution, agent, version } = await this.executionService.createExecution({
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
        inputSchema: { type: 'object', properties: {} },
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
      memory: [{ role: 'user', content: typeof body.input === 'string' ? body.input : JSON.stringify(body.input) }],
      availableTools: availableToolsList,
    };

    try {
      await this.runtimeService.run(context, sendSse);
      sendSse('done', {});
      res.end();
    } catch (err: any) {
      await this.executionService.failExecution(execution.id, orgId, agent.id, err.message);
      sendSse('error', { message: err.message });
      res.end();
    }
  }
}
