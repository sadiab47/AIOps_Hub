export interface EventCorrelationContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export abstract class DomainEvent<T = any> {
  readonly occurredAt = new Date();
  abstract readonly eventName: string;

  constructor(
    public readonly payload: T,
    public readonly correlation: EventCorrelationContext = {},
  ) {}
}
