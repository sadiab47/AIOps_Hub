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

export const EVENT_NAME_CONVERSATION_SUMMARIZED = 'chat.conversation_summarized';
export const EVENT_NAME_MEMORY_COMPRESSED = 'chat.memory_compressed';
export const EVENT_NAME_CONTEXT_BUILT = 'chat.context_built';

export class ConversationSummarizedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_CONVERSATION_SUMMARIZED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      conversationId: string;
      summaryVersion: number;
      tokenCount: number;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class MemoryCompressedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_MEMORY_COMPRESSED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      conversationId: string;
      tokensBefore: number;
      tokensAfter: number;
      compressionRatio: number;
      strategyUsed: string;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export class ContextBuiltEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_CONTEXT_BUILT;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      conversationId: string;
      messageCount: number;
      tokenBudgetUsed: number;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}

export const EVENT_NAME_AI_USAGE_LOGGED = 'chat.ai_usage_logged';

export class AiUsageLoggedEvent implements DomainEvent {
  readonly eventName = EVENT_NAME_AI_USAGE_LOGGED;
  readonly occurredAt = new Date();

  constructor(
    readonly payload: {
      requestId: string;
      organizationId: string;
      conversationId?: string | null;
      providerConfigId: string;
      provider: any;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      status: any;
      errorCode?: string | null;
      latencyMs: number;
    },
    readonly correlation: EventCorrelationContext = {},
  ) {}
}
