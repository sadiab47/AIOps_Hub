export type ExecutionEventType =
  | "start"
  | "prompt"
  | "memory"
  | "tool"
  | "tool-result"
  | "token"
  | "usage"
  | "done"
  | "error";

export interface BaseExecutionEvent {
  id: string;
  timestamp: string;
  executionId: string;
  type: ExecutionEventType;
}

export interface PromptEvent extends BaseExecutionEvent {
  promptVersionId: string | null;
  variables: Record<string, string>;
  systemPrompt: string;
  renderedPrompt: string;
}

export interface MemoryEvent extends BaseExecutionEvent {
  strategy: string;
  reserved: number;
  remaining: number;
  budget: number;
  trimmedCount: number;
}

export interface ToolEvent extends BaseExecutionEvent {
  toolId: string;
  arguments: any;
  callId: string;
}

export interface ToolResultEvent extends BaseExecutionEvent {
  toolId: string;
  output: any;
  durationMs: number;
  status: "SUCCESS" | "WARNING" | "ERROR";
}

export interface TokenEvent extends BaseExecutionEvent {
  text: string;
}

export interface UsageEvent extends BaseExecutionEvent {
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
}

export type ExecutionEvent =
  | BaseExecutionEvent
  | PromptEvent
  | MemoryEvent
  | ToolEvent
  | ToolResultEvent
  | TokenEvent
  | UsageEvent;
