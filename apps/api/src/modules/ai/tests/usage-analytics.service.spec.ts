import { Test, TestingModule } from '@nestjs/testing';
import { USAGE_REPOSITORY_TOKEN } from '../repositories/usage-repository.interface';
import { UsageAnalyticsService } from '../services/usage-analytics.service';

describe('UsageAnalyticsService', () => {
  let service: UsageAnalyticsService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      getSummary: jest.fn().mockResolvedValue({
        requests: 10,
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        estimatedCostUsd: 0.05,
      }),
      getProviderDistribution: jest.fn().mockResolvedValue([]),
      getModelDistribution: jest.fn().mockResolvedValue([]),
      getDailyCosts: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageAnalyticsService,
        { provide: USAGE_REPOSITORY_TOKEN, useValue: repository },
      ],
    }).compile();

    service = module.get<UsageAnalyticsService>(UsageAnalyticsService);
  });

  it('should request and return summary DTO metrics', async () => {
    const summary = await service.getSummary('org-123', '7d');

    expect(summary.requests).toBe(10);
    expect(summary.totalTokens).toBe(1500);
    expect(summary.estimatedCostUsd).toBe(0.05);
    expect(repository.getSummary).toHaveBeenCalledWith('org-123', expect.any(Date), expect.any(Date));
  });
});
