import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  USAGE_REPOSITORY_TOKEN,
  UsageRepositoryInterface,
  UsageSummary,
  GroupedMetrics,
  DailyTrend,
} from '../repositories/usage-repository.interface';

export class UsageSummaryDto {
  requests!: number;
  successfulRequests!: number;
  failedRequests!: number;
  cancelledRequests!: number;
  promptTokens!: number;
  completionTokens!: number;
  totalTokens!: number;
  estimatedCostUsd!: number;
  averageLatencyMs!: number;
  averageCostPerRequest!: number;
}

export class GroupedMetricsDto {
  group!: string;
  requests!: number;
  tokens!: number;
  cost!: number;
}

export class DailyCostTrendDto {
  date!: string;
  requests!: number;
  cost!: number;
}

@Injectable()
export class UsageAnalyticsService {
  constructor(
    @Inject(USAGE_REPOSITORY_TOKEN)
    private readonly repository: UsageRepositoryInterface,
  ) {}

  async getSummary(orgId: string, range?: string): Promise<UsageSummaryDto> {
    const dates = this.parseRange(range);
    return this.repository.getSummary(orgId, dates.start, dates.end);
  }

  async getProviderDistribution(orgId: string): Promise<GroupedMetricsDto[]> {
    return this.repository.getProviderDistribution(orgId);
  }

  async getModelDistribution(orgId: string): Promise<GroupedMetricsDto[]> {
    return this.repository.getModelDistribution(orgId);
  }

  async getDailyCosts(orgId: string, range?: string): Promise<DailyCostTrendDto[]> {
    let limitDays = 30;
    if (range === '7d') limitDays = 7;
    else if (range === '24h') limitDays = 1;
    return this.repository.getDailyCosts(orgId, limitDays);
  }

  async getConversationUsage(conversationId: string, orgId: string): Promise<UsageSummaryDto> {
    // Assert conversation visibility within tenant scope
    return this.repository.getConversationUsage(conversationId);
  }

  async getLatencySummary(orgId: string) {
    return this.repository.getLatencyMetrics(orgId);
  }

  async getStatusSummary(orgId: string): Promise<GroupedMetricsDto[]> {
    return this.repository.getStatusDistribution(orgId);
  }

  async listUsageLogs(orgId: string, limit?: number) {
    return this.repository.listLogs(orgId, limit);
  }

  private parseRange(range?: string): { start?: Date; end?: Date } {
    const end = new Date();
    const start = new Date();

    if (range === '24h') {
      start.setHours(start.getHours() - 24);
      return { start, end };
    }
    if (range === '7d') {
      start.setDate(start.getDate() - 7);
      return { start, end };
    }
    if (range === '30d') {
      start.setDate(start.getDate() - 30);
      return { start, end };
    }
    return {};
  }
}
