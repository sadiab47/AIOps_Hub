import { DomainEvent } from '../domain-event';

export class OrganizationCreatedEvent extends DomainEvent<{
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
}> {
  static readonly EVENT_NAME = 'ORGANIZATION_CREATED';
  readonly eventName = OrganizationCreatedEvent.EVENT_NAME;
}

export class OrganizationUpdatedEvent extends DomainEvent<{
  id: string;
  oldName: string;
  newName: string;
}> {
  static readonly EVENT_NAME = 'ORGANIZATION_UPDATED';
  readonly eventName = OrganizationUpdatedEvent.EVENT_NAME;
}

export class OrganizationSettingsUpdatedEvent extends DomainEvent<{
  id: string;
  changedFields: Record<string, any>;
}> {
  static readonly EVENT_NAME = 'SETTINGS_UPDATED';
  readonly eventName = OrganizationSettingsUpdatedEvent.EVENT_NAME;
}

export class SlugChangedEvent extends DomainEvent<{
  id: string;
  oldSlug: string;
  newSlug: string;
}> {
  static readonly EVENT_NAME = 'SLUG_CHANGED';
  readonly eventName = SlugChangedEvent.EVENT_NAME;
}
