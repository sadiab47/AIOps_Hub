import { DomainEvent } from './domain-event';

export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}
