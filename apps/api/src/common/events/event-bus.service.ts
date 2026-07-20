import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DomainEvent } from './domain-event';

@Injectable()
export class EventBusService {
  private readonly eventSubject = new Subject<DomainEvent>();

  publish(event: DomainEvent): void {
    this.eventSubject.next(event);
  }

  publishMany(events: DomainEvent[]): void {
    events.forEach((e) => this.publish(e));
  }

  ofType<T extends DomainEvent>(eventClass: new (...args: any[]) => T): Observable<T> {
    return this.eventSubject.asObservable().pipe(
      filter((e): e is T => e instanceof eventClass),
    );
  }
}
