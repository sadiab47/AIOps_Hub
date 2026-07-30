export class WorkflowCreatedEvent {
  constructor(
    public readonly workflowId: string,
    public readonly organizationId: string,
    public readonly name: string,
  ) {}
}

export class WorkflowUpdatedEvent {
  constructor(
    public readonly workflowId: string,
    public readonly organizationId: string,
    public readonly name: string,
  ) {}
}

export class WorkflowExecutionStartedEvent {
  constructor(
    public readonly executionId: string,
    public readonly workflowId: string,
    public readonly organizationId: string,
  ) {}
}

export class WorkflowExecutionCompletedEvent {
  constructor(
    public readonly executionId: string,
    public readonly workflowId: string,
    public readonly organizationId: string,
    public readonly status: string,
  ) {}
}
