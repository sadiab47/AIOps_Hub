export interface MemoryBudget {
  model: string;
  maxContextTokens: number;
  reservedCompletionTokens: number;
  availablePromptTokens: number;
  safetyBuffer: number;
  maxHistoryTokens: number;
  maxSummaryTokens: number;
}
