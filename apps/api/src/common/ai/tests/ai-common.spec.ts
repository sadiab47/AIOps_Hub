import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../services/encryption.service';
import { CredentialService } from '../services/credential.service';
import { AiProviderFactory } from '../factories/ai-provider.factory';
import { AiProvider, DecryptedCredentials } from '../types/ai-provider.interface';

describe('AI Common Infrastructure (AI-000)', () => {
  let encryptionService: EncryptionService;
  let credentialService: CredentialService;
  let factory: AiProviderFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        CredentialService,
        AiProviderFactory,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-master-encryption-key-32b!'),
          },
        },
      ],
    }).compile();

    encryptionService = module.get<EncryptionService>(EncryptionService);
    credentialService = module.get<CredentialService>(CredentialService);
    factory = module.get<AiProviderFactory>(AiProviderFactory);
  });

  describe('EncryptionService & CredentialService', () => {
    it('should encrypt and decrypt plaintext credentials accurately with AES-256-GCM', () => {
      const creds: DecryptedCredentials = {
        apiKey: 'sk-proj-1234567890abcdef',
        endpoint: 'https://api.openai.com/v1',
        apiVersion: '2024-02-01',
      };

      const encrypted = credentialService.encryptCredentials(creds);
      expect(encrypted).toContain(':');
      expect(encrypted.split(':').length).toBe(3);

      const decrypted = credentialService.decryptCredentials(encrypted);
      expect(decrypted).toEqual(creds);
    });

    it('should throw error when decrypting tampered payload', () => {
      const tampered = 'invalid:tampered:payload';
      expect(() => credentialService.decryptCredentials(tampered)).toThrow();
    });
  });

  describe('AiProviderFactory', () => {
    const mockProvider: AiProvider = {
      providerId: 'OPENAI',
      capabilities: {
        streaming: true,
        embeddings: true,
        vision: true,
        functionCalling: true,
        jsonMode: true,
      },
      generateCompletion: jest.fn(),
      streamCompletion: jest.fn(),
      generateEmbedding: jest.fn(),
      validateCredentials: jest.fn(),
    };

    it('should register and resolve providers case-insensitively', () => {
      factory.registerProvider(mockProvider);

      expect(factory.listRegisteredProviders()).toContain('OPENAI');
      expect(factory.getProvider('openai')).toBe(mockProvider);
      expect(factory.getProvider('OPENAI')).toBe(mockProvider);
    });

    it('should throw NotFoundException for unregistered provider', () => {
      expect(() => factory.getProvider('UNSUPPORTED')).toThrow('AI Provider \'UNSUPPORTED\' is not supported or registered');
    });
  });
});
