import { MessageRole } from '@aiops-hub/db';
import { DomainEvent, EventCorrelationContext } from '../../../common/events/domain-event';

export const EVENT_NAME_MESSAGE_SENT = 'chat.message_sent';
export const EVENT_NAME_MESSAGE_STREAMED = 'chat.message_streamed';
export const EVENT_NAME_CONVERSATION_COMPLETED = 'chat.conversation_completed';
export const EVENT_NAME_CONVERSATION_CANCELLED = 'chat.conversation_cancelled';

export class MessageSentEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_MESSAGE_SENT;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      messageId: string;
      conversationId: string;
      role: MessageRole;
      actorUserId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class MessageStreamedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_MESSAGE_STREAMED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      messageId: string;
      conversationId: string;
      actorUserId: string;
      tokens: number;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class ConversationCompletedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_CONVERSATION_COMPLETED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      conversationId: string;
      actorUserId: string;
      requestId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class ConversationCancelledEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_CONVERSATION_CANCELLED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      conversationId: string;
      actorUserId: string;
      requestId: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}
