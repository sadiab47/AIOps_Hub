import { DomainEvent, EventCorrelationContext } from '../domain-event';

export const EVENT_NAME_PROMPT_CREATED = 'prompt.created';
export const EVENT_NAME_PROMPT_UPDATED = 'prompt.updated';
export const EVENT_NAME_PROMPT_VERSION_CREATED = 'prompt.version_created';
export const EVENT_NAME_PROMPT_DELETED = 'prompt.deleted';

export class PromptCreatedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_PROMPT_CREATED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      promptId: string;
      organizationId: string;
      name: string;
      slug: string;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class PromptUpdatedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_PROMPT_UPDATED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      promptId: string;
      organizationId: string;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class PromptVersionCreatedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_PROMPT_VERSION_CREATED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      promptId: string;
      organizationId: string;
      version: number;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class PromptDeletedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_PROMPT_DELETED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      promptId: string;
      organizationId: string;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}
