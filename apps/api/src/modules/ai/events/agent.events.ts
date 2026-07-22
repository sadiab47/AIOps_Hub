import { DomainEvent, EventCorrelationContext } from '../../../common/events/domain-event';

export const EVENT_NAME_AGENT_CREATED = 'agent.created';
export const EVENT_NAME_AGENT_UPDATED = 'agent.updated';
export const EVENT_NAME_AGENT_DELETED = 'agent.deleted';
export const EVENT_NAME_AGENT_ENABLED = 'agent.enabled';
export const EVENT_NAME_AGENT_DISABLED = 'agent.disabled';

export class AgentCreatedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_AGENT_CREATED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      agentId: string;
      organizationId: string;
      name: string;
      slug: string;
      currentVersion: number;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class AgentUpdatedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_AGENT_UPDATED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      agentId: string;
      organizationId: string;
      newVersion: number;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class AgentDeletedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_AGENT_DELETED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      agentId: string;
      organizationId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class AgentEnabledEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_AGENT_ENABLED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      agentId: string;
      organizationId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class AgentDisabledEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_AGENT_DISABLED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      agentId: string;
      organizationId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}
