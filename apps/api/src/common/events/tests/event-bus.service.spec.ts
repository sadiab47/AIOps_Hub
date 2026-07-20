import { EventBusService } from '../event-bus.service';
import { DomainEvent } from '../domain-event';

class TestEvent extends DomainEvent<{ data: string }> {
  readonly eventName = 'TEST_EVENT';
}

class AnotherTestEvent extends DomainEvent<{ value: number }> {
  readonly eventName = 'ANOTHER_TEST_EVENT';
}

describe('EventBusService', () => {
  let eventBus: EventBusService;

  beforeEach(() => {
    eventBus = new EventBusService();
  });

  it('should publish and receive events', (done) => {
    const event = new TestEvent({ data: 'hello' });

    eventBus.ofType(TestEvent).subscribe((emitted) => {
      expect(emitted).toBe(event);
      expect(emitted.payload.data).toBe('hello');
      done();
    });

    eventBus.publish(event);
  });

  it('should filter events using ofType', () => {
    const testCallback = jest.fn();
    const anotherCallback = jest.fn();

    eventBus.ofType(TestEvent).subscribe(testCallback);
    eventBus.ofType(AnotherTestEvent).subscribe(anotherCallback);

    eventBus.publish(new TestEvent({ data: 'one' }));
    eventBus.publish(new AnotherTestEvent({ value: 100 }));

    expect(testCallback).toHaveBeenCalledTimes(1);
    expect(anotherCallback).toHaveBeenCalledTimes(1);
  });
});
