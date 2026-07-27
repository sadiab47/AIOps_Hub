import { Module, OnModuleInit } from "@nestjs/common";
import { AiCommonModule } from "../../common/ai/ai-common.module";
import { DatabaseModule } from "../../common/database/database.module";
import { EventsModule } from "../../common/events/events.module";
import { CommonAuthModule } from "../../common/auth/common-auth.module";
import { OrganizationsModule } from "../organizations/organizations.module";

// Repositories & Services
import { AI_PROVIDER_REPOSITORY_TOKEN } from "./repositories/ai-provider-repository.interface";
import { PrismaAiProviderRepository } from "./repositories/prisma-ai-provider.repository";
import { AiProviderService } from "./services/ai-provider.service";
import { AiProvidersController } from "./controllers/ai-providers.controller";

import { PROMPT_REPOSITORY_TOKEN } from "./repositories/prompt-repository.interface";
import { PrismaPromptRepository } from "./repositories/prisma-prompt.repository";
import { PromptVariableEngineService } from "./services/prompt-variable-engine.service";
import { PromptService } from "./services/prompt.service";
import { PromptsController } from "./controllers/prompts.controller";

import { CONVERSATION_REPOSITORY_TOKEN } from "./repositories/conversation-repository.interface";
import { PrismaConversationRepository } from "./repositories/prisma-conversation.repository";
import { MEMORY_PROVIDER_TOKEN } from "./services/memory-provider.interface";
import { SlidingWindowMemoryProvider } from "./services/sliding-window-memory.provider";
import { SummaryMemoryProvider } from "./services/summary-memory.provider";
import { ConversationMemoryService } from "./services/conversation-memory.service";
import { MemoryBudgetCalculator } from "./services/memory-budget.calculator";
import { ContextBuilder } from "./services/context-builder";
import { MemoryEventListener } from "./services/memory-event.listener";
import { ConversationService } from "./services/conversation.service";
import { ChatOrchestrator } from "./services/chat-orchestrator.service";
import { ChatController } from "./controllers/chat.controller";

import { USAGE_REPOSITORY_TOKEN } from "./repositories/usage-repository.interface";
import { PrismaUsageRepository } from "./repositories/prisma-usage.repository";
import { PricingCatalog } from "./services/pricing-catalog";
import { CostCalculator } from "./services/cost-calculator";
import { UsageAnalyticsService } from "./services/usage-analytics.service";
import { UsageEventListener } from "./services/usage-event.listener";
import { UsageController } from "./controllers/usage.controller";

import { AGENT_REPOSITORY_TOKEN } from "./repositories/agent-repository.interface";
import { PrismaAgentRepository } from "./repositories/prisma-agent.repository";
import { AgentService } from "./services/agent.service";
import { AgentController } from "./controllers/agent.controller";

// Tool Framework Components
import { ToolRegistry } from "./tools/services/tool-registry.service";
import { ToolResolver } from "./tools/services/tool-resolver.service";
import { ToolExecutor } from "./tools/services/tool-executor.service";
import { ToolController } from "./tools/controllers/tool.controller";

// Built-in tools
import { CalculatorTool } from "./tools/builtins/calculator.tool";
import { DateTimeTool } from "./tools/builtins/datetime.tool";
import { UuidGeneratorTool } from "./tools/builtins/uuid-generator.tool";
import { JsonUtilsTool } from "./tools/builtins/json-utils.tool";
import { HttpClientTool } from "./tools/builtins/http-client.tool";
import { TextUtilsTool } from "./tools/builtins/text-utils.tool";

import { EventEmitterModule } from "@nestjs/event-emitter";

// Execution Engine Components
import { ExecutionRepository } from "./execution/repositories/execution.repository";
import { ExecutionService } from "./execution/services/execution.service";
import { ToolLoopService } from "./execution/services/tool-loop.service";
import { ExecutionRuntimeService } from "./execution/services/execution-runtime.service";
import { ExecutionController } from "./execution/controllers/execution.controller";

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    CommonAuthModule,
    OrganizationsModule,
    AiCommonModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    AiProvidersController,
    PromptsController,
    ChatController,
    UsageController,
    AgentController,
    ToolController,
    ExecutionController,
  ],
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
    {
      provide: USAGE_REPOSITORY_TOKEN,
      useClass: PrismaUsageRepository,
    },
    {
      provide: AGENT_REPOSITORY_TOKEN,
      useClass: PrismaAgentRepository,
    },
    SlidingWindowMemoryProvider,
    AiProviderService,
    PromptVariableEngineService,
    PromptService,
    ConversationService,
    ChatOrchestrator,
    SummaryMemoryProvider,
    ConversationMemoryService,
    MemoryBudgetCalculator,
    ContextBuilder,
    MemoryEventListener,
    PricingCatalog,
    CostCalculator,
    UsageAnalyticsService,
    UsageEventListener,
    AgentService,

    // Tool Framework
    ToolRegistry,
    ToolResolver,
    ToolExecutor,

    // Built-in tools
    CalculatorTool,
    DateTimeTool,
    UuidGeneratorTool,
    JsonUtilsTool,
    HttpClientTool,
    TextUtilsTool,

    // Execution Engine
    ExecutionRepository,
    ExecutionService,
    ToolLoopService,
    ExecutionRuntimeService,
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
    ConversationMemoryService,
    MemoryBudgetCalculator,
    ContextBuilder,
    USAGE_REPOSITORY_TOKEN,
    PricingCatalog,
    CostCalculator,
    UsageAnalyticsService,
    AGENT_REPOSITORY_TOKEN,
    AgentService,

    // Tool Framework
    ToolRegistry,
    ToolResolver,
    ToolExecutor,

    // Execution Engine
    ExecutionService,
    ExecutionRuntimeService,
  ],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly calculator: CalculatorTool,
    private readonly datetime: DateTimeTool,
    private readonly uuidGen: UuidGeneratorTool,
    private readonly jsonUtils: JsonUtilsTool,
    private readonly httpClient: HttpClientTool,
    private readonly textUtils: TextUtilsTool,
  ) {}

  onModuleInit() {
    // Register built-in tools into registry at startup
    this.registry.register(this.calculator);
    this.registry.register(this.datetime);
    this.registry.register(this.uuidGen);
    this.registry.register(this.jsonUtils);
    this.registry.register(this.httpClient);
    this.registry.register(this.textUtils);
  }
}
