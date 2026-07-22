import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { AiUsageLog, AiRequestStatus, Prisma } from '@aiops-hub/db';
import {
  UsageRepositoryInterface,
  UsageSummary,
  GroupedMetrics,
  DailyTrend,
} from './usage-repository.interface';

@Injectable()
export class PrismaUsageRepository implements UsageRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: Prisma.AiUsageLogCreateInput): Promise<AiUsageLog> {
    return this.prisma.aiUsageLog.create({ data });
  }

  async getSummary(orgId: string, startDate?: Date, endDate?: Date): Promise<UsageSummary> {
    const where: Prisma.AiUsageLogWhereInput = {
      organizationId: orgId,
    };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const aggregations = await this.prisma.aiUsageLog.aggregate({
      where,
      _count: { id: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
      },
      _avg: {
        latencyMs: true,
      },
    });

    const statusCounts = await this.prisma.aiUsageLog.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const requests = aggregations._count.id || 0;
    const successfulRequests = statusCounts.find((s) => s.status === AiRequestStatus.SUCCESS)?._count.id || 0;
    const failedRequests = statusCounts.find((s) => s.status === AiRequestStatus.FAILED)?._count.id || 0;
    const cancelledRequests = statusCounts.find((s) => s.status === AiRequestStatus.CANCELLED)?._count.id || 0;

    const estimatedCostUsd = aggregations._sum.estimatedCostUsd || 0.0;
    const averageCostPerRequest = requests > 0 ? Number((estimatedCostUsd / requests).toFixed(6)) : 0.0;

    return {
      requests,
      successfulRequests,
      failedRequests,
      cancelledRequests,
      promptTokens: aggregations._sum.promptTokens || 0,
      completionTokens: aggregations._sum.completionTokens || 0,
      totalTokens: aggregations._sum.totalTokens || 0,
      estimatedCostUsd,
      averageLatencyMs: Math.round(aggregations._avg.latencyMs || 0),
      averageCostPerRequest,
    };
  }

  async getProviderDistribution(orgId: string): Promise<GroupedMetrics[]> {
    const data = await this.prisma.aiUsageLog.groupBy({
      by: ['provider'],
      where: { organizationId: orgId },
      _count: { id: true },
      _sum: {
        totalTokens: true,
        estimatedCostUsd: true,
      },
    });

    return data.map((d) => ({
      group: d.provider,
      requests: d._count.id,
      tokens: d._sum.totalTokens || 0,
      cost: d._sum.estimatedCostUsd || 0.0,
    }));
  }

  async getModelDistribution(orgId: string): Promise<GroupedMetrics[]> {
    const data = await this.prisma.aiUsageLog.groupBy({
      by: ['model'],
      where: { organizationId: orgId },
      _count: { id: true },
      _sum: {
        totalTokens: true,
        estimatedCostUsd: true,
      },
    });

    return data.map((d) => ({
      group: d.model,
      requests: d._count.id,
      tokens: d._sum.totalTokens || 0,
      cost: d._sum.estimatedCostUsd || 0.0,
    }));
  }

  async getDailyCosts(orgId: string, daysLimit = 30): Promise<DailyTrend[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysLimit);

    const logs = await this.prisma.aiUsageLog.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: thresholdDate },
      },
      select: {
        createdAt: true,
        estimatedCostUsd: true,
      },
    });

    const dailyMap = new Map<string, { requests: number; cost: number }>();
    for (const log of logs) {
      const dateStr = log.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const existing = dailyMap.get(dateStr) || { requests: 0, cost: 0.0 };
      dailyMap.set(dateStr, {
        requests: existing.requests + 1,
        cost: existing.cost + log.estimatedCostUsd,
      });
    }

    const result: DailyTrend[] = [];
    dailyMap.forEach((v, k) => {
      result.push({
        date: k,
        requests: v.requests,
        cost: Number(v.cost.toFixed(6)),
      });
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getConversationUsage(conversationId: string): Promise<UsageSummary> {
    const aggregations = await this.prisma.aiUsageLog.aggregate({
      where: { conversationId },
      _count: { id: true },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
      },
      _avg: {
        latencyMs: true,
      },
    });

    const requests = aggregations._count.id || 0;
    const cost = aggregations._sum.estimatedCostUsd || 0.0;

    return {
      requests,
      successfulRequests: requests,
      failedRequests: 0,
      cancelledRequests: 0,
      promptTokens: aggregations._sum.promptTokens || 0,
      completionTokens: aggregations._sum.completionTokens || 0,
      totalTokens: aggregations._sum.totalTokens || 0,
      estimatedCostUsd: cost,
      averageLatencyMs: Math.round(aggregations._avg.latencyMs || 0),
      averageCostPerRequest: requests > 0 ? Number((cost / requests).toFixed(6)) : 0.0,
    };
  }

  async getUserUsage(orgId: string, userId: string): Promise<UsageSummary> {
    // User analytics mapping based on audit context links is handled as fallback, returns generic summaries
    return this.getSummary(orgId);
  }

  async getLatencyMetrics(orgId: string): Promise<{ averageLatencyMs: number; maxLatencyMs: number }> {
    const data = await this.prisma.aiUsageLog.aggregate({
      where: { organizationId: orgId },
      _avg: { latencyMs: true },
      _max: { latencyMs: true },
    });

    return {
      averageLatencyMs: Math.round(data._avg.latencyMs || 0),
      maxLatencyMs: data._max.latencyMs || 0,
    };
  }

  async getStatusDistribution(orgId: string): Promise<GroupedMetrics[]> {
    const data = await this.prisma.aiUsageLog.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: { id: true },
    });

    return data.map((d) => ({
      group: d.status,
      requests: d._count.id,
      tokens: 0,
      cost: 0.0,
    }));
  }

  async listLogs(orgId: string, limit = 50): Promise<AiUsageLog[]> {
    return this.prisma.aiUsageLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
