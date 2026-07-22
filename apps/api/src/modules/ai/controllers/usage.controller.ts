import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiHeader, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { UsageAnalyticsService } from '../services/usage-analytics.service';

@ApiTags('Usage Analytics')
@ApiCookieAuth('aiops_access_token')
@ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
@Controller('ai/usage')
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class UsageController {
  constructor(private readonly service: UsageAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'List recent telemetry raw logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listLogs(@TenantId() orgId: string, @Query('limit') limit?: number) {
    return this.service.listUsageLogs(orgId, limit ? Number(limit) : undefined);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get total prompt token usage and costs metrics summary' })
  @ApiQuery({ name: 'range', required: false, enum: ['24h', '7d', '30d'] })
  async getSummary(@TenantId() orgId: string, @Query('range') range?: string) {
    return this.service.getSummary(orgId, range);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get requests distribution grouped by AI provider' })
  async getProviders(@TenantId() orgId: string) {
    return this.service.getProviderDistribution(orgId);
  }

  @Get('models')
  @ApiOperation({ summary: 'Get requests distribution grouped by AI model' })
  async getModels(@TenantId() orgId: string) {
    return this.service.getModelDistribution(orgId);
  }

  @Get('costs')
  @ApiOperation({ summary: 'Get daily cost trend values' })
  @ApiQuery({ name: 'range', required: false, enum: ['24h', '7d', '30d'] })
  async getCosts(@TenantId() orgId: string, @Query('range') range?: string) {
    return this.service.getDailyCosts(orgId, range);
  }

  @Get('latency')
  @ApiOperation({ summary: 'Get latency distribution metrics' })
  async getLatency(@TenantId() orgId: string) {
    return this.service.getLatencySummary(orgId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get request counts grouped by success/failure status' })
  async getStatus(@TenantId() orgId: string) {
    return this.service.getStatusSummary(orgId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get usage metrics filtered by conversation ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async getConversationUsage(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ) {
    return this.service.getConversationUsage(conversationId, orgId);
  }
}
