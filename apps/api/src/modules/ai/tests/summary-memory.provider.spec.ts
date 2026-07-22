import { Test, TestingModule } from '@nestjs/testing';
import { Conversation, Message, ConversationSummary, AiProvider } from '@aiops-hub/db';
import { SummaryMemoryProvider } from '../services/summary-memory.provider';
import { ContextBuilder } from '../services/context-builder';
import { PrismaService } from '../../../common/database/prisma.service';
import { AiProviderFactory } from '../../../common/ai/factories/ai-provider.factory';
import { CredentialService } from '../../../common/ai/services/credential.service';
import { EventBusService } from '../../../common/events/event-bus.service';

describe('SummaryMemoryProvider', () => {
  let provider: SummaryMemoryProvider;
  let contextBuilder: ContextBuilder;
  let prisma: any;
  let providerFactory: any;
  let credentialService: any;
  let eventBus: any;

  const mockOpenAiInstance = {
    streamCompletion: async function* () {
      yield 'Mocked Summary Text';
    },
  };

  beforeEach(async () => {
    prisma = {
      aiProviderConfig: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cfg-1',
          provider: AiProvider.OPENAI,
          encryptedCredentials: 'enc',
        }),
      },
      conversationSummary: {
        create: jest.fn(),
      },
    };

    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockOpenAiInstance),
    };

    credentialService = {
      decryptCredentials: jest.fn().mockReturnValue({ apiKey: 'sk' }),
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryMemoryProvider,
        ContextBuilder,
        { provide: PrismaService, useValue: prisma },
        { provide: AiProviderFactory, useValue: providerFactory },
        { provide: CredentialService, useValue: credentialService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    provider = module.get<SummaryMemoryProvider>(SummaryMemoryProvider);
    contextBuilder = module.get<ContextBuilder>(ContextBuilder);
  });

  describe('shouldSummarize', () => {
    it('should return true if unsummarized messages count meets summaryInterval threshold', async () => {
      const mockConv: any = {
        summaryInterval: 2,
        messages: [{ id: 'm1' }, { id: 'm2' }],
        summaries: [],
      };

      const result = await provider.shouldSummarize(mockConv, {} as any);
      expect(result).toBe(true);
    });

    it('should return false if unsummarized messages count is below summaryInterval', async () => {
      const mockConv: any = {
        summaryInterval: 5,
        messages: [{ id: 'm1' }, { id: 'm2' }],
        summaries: [],
      };

      const result = await provider.shouldSummarize(mockConv, {} as any);
      expect(result).toBe(false);
    });
  });

  describe('summarize', () => {
    it('should call LLM and persist conversation summary version', async () => {
      const mockConv: any = {
        id: 'conv-123',
        providerConfigId: 'cfg-1',
        model: 'gpt-4o',
        messages: [
          { id: 'm1', role: 'user', content: 'Hello' },
          { id: 'm2', role: 'assistant', content: 'Hi!' },
        ],
        summaries: [],
      };

      await provider.summarize(mockConv);

      expect(prisma.conversationSummary.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: 'conv-123',
          version: 1,
          summary: 'Mocked Summary Text',
          startMessageId: 'm1',
          endMessageId: 'm2',
        }),
      });

      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
