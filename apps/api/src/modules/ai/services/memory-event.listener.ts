import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../common/events/event-bus.service';
import { MessageStreamedEvent } from '../events/chat.events';
import { ConversationMemoryService } from './conversation-memory.service';

@Injectable()
export class MemoryEventListener implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly memoryService: ConversationMemoryService,
  ) {}

  onModuleInit() {
    // Subscribe to MessageStreamedEvent to trigger summarization check asynchronously
    this.eventBus.ofType(MessageStreamedEvent).subscribe((event) => {
      this.memoryService
        .triggerSummarizationIfNeeded(event.payload.conversationId)
        .catch(() => {});
    });
  }
}
