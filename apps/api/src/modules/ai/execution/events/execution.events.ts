export class ExecutionStartedEvent {
  constructor(
    public readonly executionId: string,
    public readonly organizationId: string,
    public readonly agentId: string,
    public readonly input: any,
  ) {}
}

export class ExecutionCompletedEvent {
  constructor(
    public readonly executionId: string,
    public readonly organizationId: string,
    public readonly agentId: string,
    public readonly output: any,
    public readonly metrics: {
      promptTokens: number;
      completionTokens: number;
      latencyMs: number;
      cost: number;
    },
  ) {}
}

export class ExecutionFailedEvent {
  constructor(
    public readonly executionId: string,
    public readonly organizationId: string,
    public readonly agentId: string,
    public readonly error: string,
    public readonly metrics?: {
      promptTokens: number;
      completionTokens: number;
      latencyMs: number;
    },
  ) {}
}

export class ExecutionCancelledEvent {
  constructor(
    public readonly executionId: string,
    public readonly organizationId: string,
  ) {}
}

export class ToolInvokedEvent {
  constructor(
    public readonly executionId: string,
    public readonly toolId: string,
    public readonly input: any,
  ) {}
}

export class ToolCompletedEvent {
  constructor(
    public readonly executionId: string,
    public readonly toolId: string,
    public readonly output: any,
    public readonly latencyMs: number,
  ) {}
}
