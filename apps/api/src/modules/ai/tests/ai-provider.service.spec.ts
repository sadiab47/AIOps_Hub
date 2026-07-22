import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AiProvider as AiProviderEnum } from '@aiops-hub/db';
import { AiProviderService } from '../services/ai-provider.service';
import { AI_PROVIDER_REPOSITORY_TOKEN } from '../repositories/ai-provider-repository.interface';
import { CredentialService } from '../../../common/ai/services/credential.service';
import { AiProviderFactory } from '../../../common/ai/factories/ai-provider.factory';
import { EventBusService } from '../../../common/events/event-bus.service';

describe('AiProviderService', () => {
  let service: AiProviderService;
  let repository: any;
  let credentialService: any;
  let providerFactory: any;
  let eventBus: any;

  const mockProviderInstance = {
    providerId: 'OPENAI',
    capabilities: { streaming: true, embeddings: true, vision: true, functionCalling: true, jsonMode: true },
    validateCredentials: jest.fn(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findDefault: jest.fn(),
      listByOrg: jest.fn(),
      unsetDefault: jest.fn(),
      executeTransaction: jest.fn((cb) => cb(repository)),
    };

    credentialService = {
      encryptCredentials: jest.fn().mockReturnValue('encrypted:credentials:payload'),
      decryptCredentials: jest.fn().mockReturnValue({ apiKey: 'sk-test-key' }),
    };

    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockProviderInstance),
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProviderService,
        { provide: AI_PROVIDER_REPOSITORY_TOKEN, useValue: repository },
        { provide: CredentialService, useValue: credentialService },
        { provide: AiProviderFactory, useValue: providerFactory },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<AiProviderService>(AiProviderService);
  });

  describe('create', () => {
    it('should throw ConflictException if provider configuration name exists in org', async () => {
      repository.findByName.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.create('org-1', 'user-1', {
          provider: AiProviderEnum.OPENAI,
          name: 'Prod OpenAI',
          credentials: { apiKey: 'sk-test-key' },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if credential validation fails', async () => {
      repository.findByName.mockResolvedValue(null);
      mockProviderInstance.validateCredentials.mockResolvedValue({ valid: false, models: [], error: 'Invalid API Key' });

      await expect(
        service.create('org-1', 'user-1', {
          provider: AiProviderEnum.OPENAI,
          name: 'Prod OpenAI',
          credentials: { apiKey: 'bad-key' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should encrypt credentials and create config successfully', async () => {
      repository.findByName.mockResolvedValue(null);
      mockProviderInstance.validateCredentials.mockResolvedValue({ valid: true, models: ['gpt-4o'] });
      repository.create.mockResolvedValue({
        id: 'cfg-1',
        organizationId: 'org-1',
        provider: 'OPENAI',
        name: 'Prod OpenAI',
        encryptedCredentials: 'encrypted:credentials:payload',
      });

      const result = await service.create('org-1', 'user-1', {
        provider: AiProviderEnum.OPENAI,
        name: 'Prod OpenAI',
        credentials: { apiKey: 'sk-valid-key' },
        isDefault: true,
      });

      expect(repository.unsetDefault).toHaveBeenCalledWith('org-1', repository);
      expect(credentialService.encryptCredentials).toHaveBeenCalledWith({ apiKey: 'sk-valid-key' });
      expect(eventBus.publish).toHaveBeenCalled();
      expect(result.id).toBe('cfg-1');
    });
  });

  describe('setDefault', () => {
    it('should unset previous defaults and set target provider as default', async () => {
      repository.findById.mockResolvedValue({ id: 'cfg-1', organizationId: 'org-1' });

      const res = await service.setDefault('org-1', 'cfg-1', 'user-1');

      expect(repository.unsetDefault).toHaveBeenCalledWith('org-1', repository);
      expect(repository.update).toHaveBeenCalledWith('cfg-1', { isDefault: true }, repository);
      expect(res).toEqual({ success: true });
    });
  });
});
