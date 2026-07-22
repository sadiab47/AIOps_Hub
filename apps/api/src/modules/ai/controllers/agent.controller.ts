import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AgentService } from '../services/agent.service';
import { CreateAgentDto, AgentVersionDto } from '../dto/create-agent.dto';

@ApiTags('Agent Registry')
@ApiCookieAuth('aiops_access_token')
@ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
@Controller('ai/agents')
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new agent configuration thread' })
  @ApiResponse({ status: 201, description: 'Agent registered successfully.' })
  async create(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: CreateAgentDto,
    @Req() req: Request,
  ) {
    const correlation = {
      userId: actorId,
      organizationId: orgId,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };
    return this.service.create(orgId, actorId, dto, correlation);
  }

  @Get()
  @ApiOperation({ summary: 'List all agents registered in organization scope' })
  async list(@TenantId() orgId: string) {
    return this.service.list(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get configuration detail of a registered agent' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findById(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(id, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update active version parameters of a registered agent' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async updateVersion(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AgentVersionDto,
    @Req() req: Request,
  ) {
    const correlation = {
      userId: actorId,
      organizationId: orgId,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };
    return this.service.updateVersion(id, orgId, dto, correlation);
  }

  @Post(':id/enable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable registered agent execution access' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async enable(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const correlation = {
      userId: actorId,
      organizationId: orgId,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };
    return this.service.enable(id, orgId, correlation);
  }

  @Post(':id/disable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable registered agent execution access' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async disable(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const correlation = {
      userId: actorId,
      organizationId: orgId,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };
    return this.service.disable(id, orgId, correlation);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a registered agent from search lists' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async delete(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const correlation = {
      userId: actorId,
      organizationId: orgId,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };
    return this.service.delete(id, orgId, correlation);
  }
}
