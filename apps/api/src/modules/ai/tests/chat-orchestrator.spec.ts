import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MessageRole, FinishReason, AiRequestStatus, AiProvider as AiProviderEnum } from '@aiops-hub/db';
import { ChatOrchestrator } from '../services/chat-orchestrator.service';
import { CONVERSATION_REPOSITORY_TOKEN } from '../repositories/conversation-repository.interface';
import { ConversationMemoryService } from '../services/conversation-memory.service';
import { MemoryBudgetCalculator } from '../services/memory-budget.calculator';
import { CostCalculator } from '../services/cost-calculator';
import { CredentialService } from '../../../common/ai/services/credential.service';
import { AiProviderFactory } from '../../../common/ai/factories/ai-provider.factory';
import { PromptVariableEngineService } from '../services/prompt-variable-engine.service';
import { PrismaService } from '../../../common/database/prisma.service';
import { EventBusService } from '../../../common/events/event-bus.service';

describe('ChatOrchestrator', () => {
  let orchestrator: ChatOrchestrator;
  let repository: any;
  let conversationMemoryService: any;
  let budgetCalculator: any;
  let credentialService: any;
  let providerFactory: any;
  let prisma: any;
  let eventBus: any;

  const mockConversation = {
    id: 'conv-1',
    organizationId: 'org-1',
    title: 'Support Chat',
    model: 'gpt-4o',
    temperature: 0.7,
    providerConfig: {
      id: 'cfg-1',
      provider: AiProviderEnum.OPENAI,
      encryptedCredentials: 'encrypted:credentials:payload',
    },
  };

  const mockOpenAiProviderInstance = {
    providerId: 'OPENAI',
    capabilities: { streaming: true },
    streamCompletion: async function* (req: any, creds: any) {
      yield 'Hello';
      yield ' ';
      yield 'world!';
    },
  };

  beforeEach(async () => {
    repository = {
      getConversation: jest.fn().mockResolvedValue(mockConversation),
      createMessage: jest.fn().mockResolvedValue({ id: 'msg-1', role: MessageRole.USER }),
      listMessages: jest.fn().mockResolvedValue([]),
      createUsageLog: jest.fn(),
      executeTransaction: jest.fn((cb) => cb(repository)),
    };

    conversationMemoryService = {
      buildContext: jest.fn().mockResolvedValue([
        { role: 'user', content: 'hi {{name}}' },
      ]),
    };

    budgetCalculator = {
      calculate: jest.fn().mockReturnValue({
        model: 'gpt-4o',
        maxContextTokens: 100000,
        maxHistoryTokens: 60000,
      }),
    };

    credentialService = {
      decryptCredentials: jest.fn().mockReturnValue({ apiKey: 'sk-test' }),
    };

    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockOpenAiProviderInstance),
    };

    prisma = {
      promptVersion: {
        findUnique: jest.fn(),
      },
    };

    eventBus = {
      publish: jest.fn(),
    };

    const costCalculator = {
      calculateCost: jest.fn().mockReturnValue(0.01),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatOrchestrator,
        PromptVariableEngineService,
        { provide: CONVERSATION_REPOSITORY_TOKEN, useValue: repository },
        { provide: ConversationMemoryService, useValue: conversationMemoryService },
        { provide: MemoryBudgetCalculator, useValue: budgetCalculator },
        { provide: CostCalculator, useValue: costCalculator },
        { provide: CredentialService, useValue: credentialService },
        { provide: AiProviderFactory, useValue: providerFactory },
        { provide: PrismaService, useValue: prisma },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    orchestrator = module.get<ChatOrchestrator>(ChatOrchestrator);
  });

  describe('streamMessage', () => {
    it('should throw NotFoundException if conversation not found', async () => {
      repository.getConversation.mockResolvedValue(null);

      const stream = orchestrator.streamMessage('org-1', 'invalid-id', 'user-1', { content: 'hi' }, 'req-1');

      await expect(stream.next()).rejects.toThrow(NotFoundException);
    });

    it('should orchestrate template rendering and stream token chunks successfully', async () => {
      const stream = orchestrator.streamMessage(
        'org-1',
        'conv-1',
        'user-1',
        { content: 'hi {{name}}' },
        'req-1',
      );

      const events: any[] = [];
      for await (const chunk of stream) {
        events.push(chunk);
      }

      expect(events).toContainEqual({ event: 'start', data: { conversationId: 'conv-1', requestId: 'req-1' } });
      expect(events).toContainEqual({ event: 'metadata', data: { provider: AiProviderEnum.OPENAI, model: 'gpt-4o' } });
      expect(events).toContainEqual({ event: 'token', data: { token: 'Hello' } });
      expect(events).toContainEqual({ event: 'token', data: { token: ' ' } });
      expect(events).toContainEqual({ event: 'token', data: { token: 'world!' } });
      expect(events).toContainEqual({ event: 'done', data: '[DONE]' });

      expect(repository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({ role: MessageRole.USER, content: 'hi {{name}}' }),
      );
      expect(repository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({ role: MessageRole.ASSISTANT, content: 'Hello world!', finishReason: FinishReason.STOP }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'chat.ai_usage_logged',
          payload: expect.objectContaining({ status: AiRequestStatus.SUCCESS, requestId: 'req-1' }),
        }),
      );
    });
  });
});
