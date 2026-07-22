import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { EventBusService } from '../../../common/events/event-bus.service';
import { AiUsageLoggedEvent } from '../events/chat.events';
import { USAGE_REPOSITORY_TOKEN, UsageRepositoryInterface } from '../repositories/usage-repository.interface';

@Injectable()
export class UsageEventListener implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    @Inject(USAGE_REPOSITORY_TOKEN)
    private readonly repository: UsageRepositoryInterface,
  ) {}

  onModuleInit() {
    // Subscribe to AiUsageLoggedEvent to persist usage logs asynchronously
    this.eventBus.ofType(AiUsageLoggedEvent).subscribe((event) => {
      this.repository
        .createLog({
          requestId: event.payload.requestId,
          organization: { connect: { id: event.payload.organizationId } },
          conversation: event.payload.conversationId
            ? { connect: { id: event.payload.conversationId } }
            : undefined,
          providerConfigId: event.payload.providerConfigId,
          provider: event.payload.provider,
          model: event.payload.model,
          promptTokens: event.payload.promptTokens,
          completionTokens: event.payload.completionTokens,
          totalTokens: event.payload.totalTokens,
          estimatedCostUsd: event.payload.estimatedCostUsd,
          status: event.payload.status,
          errorCode: event.payload.errorCode,
          latencyMs: event.payload.latencyMs,
        })
        .catch(() => {});
    });
  }
}
