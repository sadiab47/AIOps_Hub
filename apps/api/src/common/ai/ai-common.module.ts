import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './services/encryption.service';
import { CredentialService } from './services/credential.service';
import { AiProviderFactory } from './factories/ai-provider.factory';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, CredentialService, AiProviderFactory, OpenAiProvider],
  exports: [EncryptionService, CredentialService, AiProviderFactory, OpenAiProvider],
})
export class AiCommonModule implements OnModuleInit {
  constructor(
    private readonly factory: AiProviderFactory,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  onModuleInit() {
    this.factory.registerProvider(this.openAiProvider);
  }
}
