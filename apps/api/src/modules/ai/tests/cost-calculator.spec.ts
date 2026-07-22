import { Test, TestingModule } from '@nestjs/testing';
import { PricingCatalog } from '../services/pricing-catalog';
import { CostCalculator } from '../services/cost-calculator';

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingCatalog, CostCalculator],
    }).compile();

    calculator = module.get<CostCalculator>(CostCalculator);
  });

  it('should calculate estimated costs for gpt-4o accurately', () => {
    // GPT-4o pricing: Input $5.00/1M output $15.00/1M
    // 100,000 input tokens = $0.50
    // 50,000 output tokens = $0.75
    // Total = $1.25
    const cost = calculator.calculateCost('gpt-4o', 100000, 50000);
    expect(cost).toBe(1.25);
  });

  it('should fallback to 0 cost for unknown models', () => {
    const cost = calculator.calculateCost('unknown-local-llama', 10000, 10000);
    expect(cost).toBe(0.0);
  });
});
