import { Test, TestingModule } from '@nestjs/testing';
import { MemoryBudgetCalculator } from '../services/memory-budget.calculator';

describe('MemoryBudgetCalculator', () => {
  let calculator: MemoryBudgetCalculator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryBudgetCalculator],
    }).compile();

    calculator = module.get<MemoryBudgetCalculator>(MemoryBudgetCalculator);
  });

  it('should calculate budget variables for default gpt-4o model context window', () => {
    const budget = calculator.calculate('gpt-4o');

    expect(budget.model).toBe('gpt-4o');
    expect(budget.maxContextTokens).toBe(100000);
    expect(budget.reservedCompletionTokens).toBe(2048);
    expect(budget.safetyBuffer).toBe(5000);
    expect(budget.availablePromptTokens).toBe(92952);
    expect(budget.maxSummaryTokens).toBe(23238);
    expect(budget.maxHistoryTokens).toBe(69714);
  });

  it('should respect custom context window bounds', () => {
    const budget = calculator.calculate('custom-model', 10000);

    expect(budget.maxContextTokens).toBe(10000);
    expect(budget.reservedCompletionTokens).toBe(2048);
    expect(budget.safetyBuffer).toBe(500);
    expect(budget.availablePromptTokens).toBe(7452);
  });
});
