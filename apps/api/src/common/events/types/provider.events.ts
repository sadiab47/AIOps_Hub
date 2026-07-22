import { DomainEvent, EventCorrelationContext } from '../domain-event';

export const EVENT_NAME_PROVIDER_CONFIGURED = 'provider.configured';
export const EVENT_NAME_PROVIDER_UPDATED = 'provider.updated';
export const EVENT_NAME_PROVIDER_DELETED = 'provider.deleted';
export const EVENT_NAME_PROVIDER_VALIDATED = 'provider.validated';
export const EVENT_NAME_DEFAULT_PROVIDER_CHANGED = 'provider.default_changed';

export class ProviderConfiguredEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_PROVIDER_CONFIGURED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      providerConfigId: string;
      organizationId: string;
      provider: string;
      name: string;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class ProviderUpdatedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_PROVIDER_UPDATED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      providerConfigId: string;
      organizationId: string;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class ProviderDeletedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_PROVIDER_DELETED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      providerConfigId: string;
      organizationId: string;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class DefaultProviderChangedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_DEFAULT_PROVIDER_CHANGED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      providerConfigId: string;
      organizationId: string;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}
