import { Module } from '@nestjs/common';
import { AiCommonModule } from '../../common/ai/ai-common.module';
import { DatabaseModule } from '../../common/database/database.module';
import { EventsModule } from '../../common/events/events.module';
import { CommonAuthModule } from '../../common/auth/common-auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AI_PROVIDER_REPOSITORY_TOKEN } from './repositories/ai-provider-repository.interface';
import { PrismaAiProviderRepository } from './repositories/prisma-ai-provider.repository';
import { AiProviderService } from './services/ai-provider.service';
import { AiProvidersController } from './controllers/ai-providers.controller';
import { PROMPT_REPOSITORY_TOKEN } from './repositories/prompt-repository.interface';
import { PrismaPromptRepository } from './repositories/prisma-prompt.repository';
import { PromptVariableEngineService } from './services/prompt-variable-engine.service';
import { PromptService } from './services/prompt.service';
import { PromptsController } from './controllers/prompts.controller';
import { CONVERSATION_REPOSITORY_TOKEN } from './repositories/conversation-repository.interface';
import { PrismaConversationRepository } from './repositories/prisma-conversation.repository';
import { MEMORY_PROVIDER_TOKEN } from './services/memory-provider.interface';
import { SlidingWindowMemoryProvider } from './services/sliding-window-memory.provider';
import { ConversationService } from './services/conversation.service';
import { ChatOrchestrator } from './services/chat-orchestrator.service';
import { ChatController } from './controllers/chat.controller';

@Module({
  imports: [DatabaseModule, EventsModule, CommonAuthModule, OrganizationsModule, AiCommonModule],
  controllers: [AiProvidersController, PromptsController, ChatController],
  providers: [
    {
      provide: AI_PROVIDER_REPOSITORY_TOKEN,
      useClass: PrismaAiProviderRepository,
    },
    {
      provide: PROMPT_REPOSITORY_TOKEN,
      useClass: PrismaPromptRepository,
    },
    {
      provide: CONVERSATION_REPOSITORY_TOKEN,
      useClass: PrismaConversationRepository,
    },
    {
      provide: MEMORY_PROVIDER_TOKEN,
      useClass: SlidingWindowMemoryProvider,
    },
    AiProviderService,
    PromptVariableEngineService,
    PromptService,
    ConversationService,
    ChatOrchestrator,
  ],
  exports: [
    AiProviderService,
    AI_PROVIDER_REPOSITORY_TOKEN,
    PromptService,
    PromptVariableEngineService,
    PROMPT_REPOSITORY_TOKEN,
    ConversationService,
    ChatOrchestrator,
    CONVERSATION_REPOSITORY_TOKEN,
    MEMORY_PROVIDER_TOKEN,
  ],
})
export class AiModule {}
