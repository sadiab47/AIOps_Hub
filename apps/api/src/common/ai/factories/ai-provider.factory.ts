import { Injectable, NotFoundException } from '@nestjs/common';
import { AiProvider } from '../types/ai-provider.interface';

@Injectable()
export class AiProviderFactory {
  private readonly providers = new Map<string, AiProvider>();

  /**
   * Registers a concrete AiProvider instance with the factory.
   */
  registerProvider(provider: AiProvider): void {
    this.providers.set(provider.providerId.toUpperCase(), provider);
  }

  /**
   * Resolves an AiProvider by provider ID string (e.g. 'OPENAI', 'ANTHROPIC', 'OLLAMA').
   */
  getProvider(providerId: string): AiProvider {
    const key = providerId.toUpperCase();
    const provider = this.providers.get(key);
    if (!provider) {
      throw new NotFoundException(`AI Provider '${providerId}' is not supported or registered`);
    }
    return provider;
  }

  /**
   * Lists all registered provider IDs.
   */
  listRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
