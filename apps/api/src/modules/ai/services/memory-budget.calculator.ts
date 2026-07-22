import { Injectable } from '@nestjs/common';
import { MemoryBudget } from './memory-budget.interface';

@Injectable()
export class MemoryBudgetCalculator {
  calculate(model: string, customMaxTokens?: number | null): MemoryBudget {
    const maxContextTokens = customMaxTokens ?? this.getMaxTokenLimitForModel(model);
    
    // Safety buffer: 5% of max context window or fixed limit
    const safetyBuffer = Math.ceil(maxContextTokens * 0.05);
    
    // Reserve tokens for the model's completion response (standard 2048 tokens headroom)
    const reservedCompletionTokens = 2048;
    
    // Available pool for context prompts
    const availablePromptTokens = maxContextTokens - safetyBuffer - reservedCompletionTokens;
    
    // Allocations within the prompt pool
    // 25% of prompt space allocated for summaries, 75% for message history
    const maxSummaryTokens = Math.ceil(availablePromptTokens * 0.25);
    const maxHistoryTokens = availablePromptTokens - maxSummaryTokens;

    return {
      model,
      maxContextTokens,
      reservedCompletionTokens,
      availablePromptTokens,
      safetyBuffer,
      maxHistoryTokens,
      maxSummaryTokens,
    };
  }

  private getMaxTokenLimitForModel(model: string): number {
    const key = model.toLowerCase();
    if (key.includes('gpt-4o-mini')) {
      return 64000;
    }
    if (key.includes('gpt-4o')) {
      return 100000;
    }
    if (key.includes('claude-3-5')) {
      return 150000;
    }
    return 8000; // default boundary fallback
  }
}
