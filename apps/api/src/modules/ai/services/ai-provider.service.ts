import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AiProviderConfig, AiProvider as AiProviderEnum } from '@aiops-hub/db';
import {
  AI_PROVIDER_REPOSITORY_TOKEN,
  AiProviderRepositoryInterface,
} from '../repositories/ai-provider-repository.interface';
import { CredentialService } from '../../../common/ai/services/credential.service';
import { AiProviderFactory } from '../../../common/ai/factories/ai-provider.factory';
import { EventBusService } from '../../../common/events/event-bus.service';
import { EventCorrelationContext } from '../../../common/events/domain-event';
import {
  ProviderConfiguredEvent,
  ProviderUpdatedEvent,
  ProviderDeletedEvent,
  DefaultProviderChangedEvent,
} from '../../../common/events/types/provider.events';
import { CreateProviderConfigDto } from '../dto/create-provider-config.dto';
import { UpdateProviderConfigDto } from '../dto/update-provider-config.dto';

@Injectable()
export class AiProviderService {
  constructor(
    @Inject(AI_PROVIDER_REPOSITORY_TOKEN)
    private readonly repository: AiProviderRepositoryInterface,
    private readonly credentialService: CredentialService,
    private readonly providerFactory: AiProviderFactory,
    private readonly eventBus: EventBusService,
  ) {}

  async create(
    orgId: string,
    actorId: string,
    dto: CreateProviderConfigDto,
    correlation: EventCorrelationContext = {},
  ): Promise<AiProviderConfig> {
    const existingName = await this.repository.findByName(orgId, dto.name);
    if (existingName) {
      throw new ConflictException(`Provider configuration with name '${dto.name}' already exists in this organization`);
    }

    const providerInstance = this.providerFactory.getProvider(dto.provider);
    const validation = await providerInstance.validateCredentials(dto.credentials);

    if (!validation.valid) {
      throw new BadRequestException(`Provider credential validation failed: ${validation.error}`);
    }

    const encryptedCredentials = this.credentialService.encryptCredentials(dto.credentials);

    // Extract capability keys supported by provider instance
    const capabilities = Object.entries(providerInstance.capabilities)
      .filter(([_, supported]) => supported)
      .map(([capKey]) => capKey);

    const config = await this.repository.executeTransaction(async (tx) => {
      if (dto.isDefault) {
        await this.repository.unsetDefault(orgId, tx);
      }

      return this.repository.create(
        {
          organization: { connect: { id: orgId } },
          provider: dto.provider,
          name: dto.name,
          encryptedCredentials,
          defaultModel: dto.defaultModel || validation.models[0] || null,
          temperature: dto.temperature ?? 0.7,
          maxTokens: dto.maxTokens ?? 2048,
          capabilities,
          isDefault: dto.isDefault ?? false,
          isActive: true,
        },
        tx,
      );
    });

    this.eventBus.publish(
      new ProviderConfiguredEvent(
        {
          providerConfigId: config.id,
          organizationId: orgId,
          provider: config.provider,
          name: config.name,
          actorUserId: actorId,
        },
        correlation,
      ),
    );

    return config;
  }

  async list(orgId: string): Promise<Omit<AiProviderConfig, 'encryptedCredentials'>[]> {
    const configs = await this.repository.listByOrg(orgId);
    return configs.map(({ encryptedCredentials, ...rest }) => rest as any);
  }

  async getOne(orgId: string, id: string): Promise<Omit<AiProviderConfig, 'encryptedCredentials'>> {
    const config = await this.repository.findById(id, orgId);
    if (!config) {
      throw new NotFoundException('AI Provider configuration not found');
    }
    const { encryptedCredentials, ...rest } = config;
    return rest as any;
  }

  async update(
    orgId: string,
    id: string,
    actorId: string,
    dto: UpdateProviderConfigDto,
    correlation: EventCorrelationContext = {},
  ): Promise<AiProviderConfig> {
    const existing = await this.repository.findById(id, orgId);
    if (!existing) {
      throw new NotFoundException('AI Provider configuration not found');
    }

    let encryptedCredentials = existing.encryptedCredentials;
    let capabilities = existing.capabilities;

    if (dto.credentials) {
      const providerInstance = this.providerFactory.getProvider(existing.provider);
      const validation = await providerInstance.validateCredentials(dto.credentials);
      if (!validation.valid) {
        throw new BadRequestException(`Provider credential validation failed: ${validation.error}`);
      }
      encryptedCredentials = this.credentialService.encryptCredentials(dto.credentials);
    }

    const updated = await this.repository.executeTransaction(async (tx) => {
      if (dto.isDefault) {
        await this.repository.unsetDefault(orgId, tx);
      }

      return this.repository.update(
        id,
        {
          ...(dto.name && { name: dto.name }),
          ...(dto.credentials && { encryptedCredentials }),
          ...(dto.defaultModel !== undefined && { defaultModel: dto.defaultModel }),
          ...(dto.temperature !== undefined && { temperature: dto.temperature }),
          ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        },
        tx,
      );
    });

    this.eventBus.publish(
      new ProviderUpdatedEvent(
        {
          providerConfigId: id,
          organizationId: orgId,
          actorUserId: actorId,
        },
        correlation,
      ),
    );

    return updated;
  }

  async delete(
    orgId: string,
    id: string,
    actorId: string,
    correlation: EventCorrelationContext = {},
  ): Promise<void> {
    const existing = await this.repository.findById(id, orgId);
    if (!existing) {
      throw new NotFoundException('AI Provider configuration not found');
    }

    await this.repository.delete(id);

    this.eventBus.publish(
      new ProviderDeletedEvent(
        {
          providerConfigId: id,
          organizationId: orgId,
          actorUserId: actorId,
        },
        correlation,
      ),
    );
  }

  async validateStored(orgId: string, id: string): Promise<{ valid: boolean; models: string[]; error?: string }> {
    const existing = await this.repository.findById(id, orgId);
    if (!existing) {
      throw new NotFoundException('AI Provider configuration not found');
    }

    const credentials = this.credentialService.decryptCredentials(existing.encryptedCredentials);
    const providerInstance = this.providerFactory.getProvider(existing.provider);

    return providerInstance.validateCredentials(credentials);
  }

  async setDefault(
    orgId: string,
    id: string,
    actorId: string,
    correlation: EventCorrelationContext = {},
  ): Promise<{ success: boolean }> {
    const existing = await this.repository.findById(id, orgId);
    if (!existing) {
      throw new NotFoundException('AI Provider configuration not found');
    }

    await this.repository.executeTransaction(async (tx) => {
      await this.repository.unsetDefault(orgId, tx);
      await this.repository.update(id, { isDefault: true }, tx);
    });

    this.eventBus.publish(
      new DefaultProviderChangedEvent(
        {
          providerConfigId: id,
          organizationId: orgId,
          actorUserId: actorId,
        },
        correlation,
      ),
    );

    return { success: true };
  }
}
