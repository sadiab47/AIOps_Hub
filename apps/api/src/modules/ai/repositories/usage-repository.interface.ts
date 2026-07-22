import { AiUsageLog, Prisma } from '@aiops-hub/db';

export const USAGE_REPOSITORY_TOKEN = Symbol('USAGE_REPOSITORY_TOKEN');

export interface UsageSummary {
  requests: number;
  successfulRequests: number;
  failedRequests: number;
  cancelledRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  averageLatencyMs: number;
  averageCostPerRequest: number;
}

export interface GroupedMetrics {
  group: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface DailyTrend {
  date: string;
  requests: number;
  cost: number;
}

export interface UsageRepositoryInterface {
  createLog(data: Prisma.AiUsageLogCreateInput): Promise<AiUsageLog>;

  getSummary(orgId: string, startDate?: Date, endDate?: Date): Promise<UsageSummary>;

  getProviderDistribution(orgId: string): Promise<GroupedMetrics[]>;

  getModelDistribution(orgId: string): Promise<GroupedMetrics[]>;

  getDailyCosts(orgId: string, daysLimit?: number): Promise<DailyTrend[]>;

  getConversationUsage(conversationId: string): Promise<UsageSummary>;

  getUserUsage(orgId: string, userId: string): Promise<UsageSummary>;

  getLatencyMetrics(orgId: string): Promise<{ averageLatencyMs: number; maxLatencyMs: number }>;

  getStatusDistribution(orgId: string): Promise<GroupedMetrics[]>;

  listLogs(orgId: string, limit?: number): Promise<AiUsageLog[]>;
}
