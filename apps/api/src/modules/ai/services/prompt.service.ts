import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { Prompt, PromptVersion, PromptVisibility, PromptType } from '@aiops-hub/db';
import {
  PROMPT_REPOSITORY_TOKEN,
  PromptRepositoryInterface,
} from '../repositories/prompt-repository.interface';
import { PromptVariableEngineService } from './prompt-variable-engine.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { EventCorrelationContext } from '../../../common/events/domain-event';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  PromptCreatedEvent,
  PromptUpdatedEvent,
  PromptVersionCreatedEvent,
  PromptDeletedEvent,
} from '../../../common/events/types/prompt.events';
import { CreatePromptDto } from '../dto/create-prompt.dto';
import { UpdatePromptDto } from '../dto/update-prompt.dto';
import { CreateVersionDto } from '../dto/create-version.dto';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

@Injectable()
export class PromptService implements OnModuleInit {
  constructor(
    @Inject(PROMPT_REPOSITORY_TOKEN)
    private readonly repository: PromptRepositoryInterface,
    private readonly variableEngine: PromptVariableEngineService,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Seed default categories
    const categories = [
      { name: 'Support', description: 'Customer support templates' },
      { name: 'Sales', description: 'Sales outreach and pitches' },
      { name: 'Marketing', description: 'Marketing copy and content' },
      { name: 'Engineering', description: 'Code review, refactoring, and dev tools' },
      { name: 'Custom', description: 'Generic custom prompts' },
    ];

    for (const cat of categories) {
      const slug = slugify(cat.name);
      await this.prisma.promptCategory.upsert({
        where: { slug },
        update: {},
        create: {
          name: cat.name,
          slug,
          description: cat.description,
        },
      });
    }
  }

  async create(
    orgId: string,
    actorId: string,
    dto: CreatePromptDto,
    correlation: EventCorrelationContext = {},
  ): Promise<Prompt & { latestVersion?: PromptVersion }> {
    const categoryExists = await this.prisma.promptCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!categoryExists) {
      throw new NotFoundException('Prompt category not found');
    }

    const baseSlug = slugify(dto.name) || 'prompt';
    let slug = baseSlug;
    let suffix = 2;

    while (await this.repository.existsSlug(orgId, slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const result = await this.repository.executeTransaction(async (tx) => {
      const prompt = await this.repository.create(
        {
          organization: dto.visibility === PromptVisibility.SYSTEM ? undefined : { connect: { id: orgId } },
          category: { connect: { id: dto.categoryId } },
          createdBy: { connect: { id: actorId } },
          name: dto.name,
          slug,
          description: dto.description,
          visibility: dto.visibility,
          type: dto.type,
        },
        tx,
      );

      const version = await this.repository.createVersion(
        {
          prompt: { connect: { id: prompt.id } },
          version: 1,
          template: dto.template,
          changeLog: dto.changeLog || 'Initial version',
          createdBy: { connect: { id: actorId } },
        },
        tx,
      );

      return { ...prompt, latestVersion: version };
    });

    this.eventBus.publish(
      new PromptCreatedEvent(
        {
          promptId: result.id,
          organizationId: orgId,
          name: result.name,
          slug: result.slug,
          actorUserId: actorId,
        },
        correlation,
      ),
    );

    return result;
  }

  async list(
    orgId: string,
    categoryId?: string,
    visibility?: PromptVisibility,
  ): Promise<Prompt[]> {
    return this.repository.list(orgId, categoryId, visibility);
  }

  async getOne(
    orgId: string,
    id: string,
    actorId: string,
  ): Promise<Prompt & { latestVersion?: PromptVersion; variables: string[] }> {
    const prompt = await this.repository.findById(id, orgId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    this.enforceAccess(prompt, orgId, actorId);

    const latest = await this.repository.getLatestVersion(prompt.id);
    const variables = latest ? this.variableEngine.extractVariables(latest.template) : [];

    return {
      ...prompt,
      latestVersion: latest || undefined,
      variables,
    };
  }

  async update(
    orgId: string,
    id: string,
    actorId: string,
    dto: UpdatePromptDto,
    correlation: EventCorrelationContext = {},
  ): Promise<Prompt> {
    const prompt = await this.repository.findById(id, orgId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    this.enforceAccess(prompt, orgId, actorId, true); // True meaning require write access

    let slug = prompt.slug;
    if (dto.name && dto.name !== prompt.name) {
      const baseSlug = slugify(dto.name) || 'prompt';
      slug = baseSlug;
      let suffix = 2;
      while (await this.repository.existsSlug(orgId, slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }
    }

    const updated = await this.repository.update(id, {
      ...(dto.name && { name: dto.name, slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
      ...(dto.visibility && { visibility: dto.visibility }),
      ...(dto.type && { type: dto.type }),
    });

    this.eventBus.publish(
      new PromptUpdatedEvent(
        {
          promptId: id,
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
    const prompt = await this.repository.findById(id, orgId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    this.enforceAccess(prompt, orgId, actorId, true);

    await this.repository.delete(id);

    this.eventBus.publish(
      new PromptDeletedEvent(
        {
          promptId: id,
          organizationId: orgId,
          actorUserId: actorId,
        },
        correlation,
      ),
    );
  }

  async createVersion(
    orgId: string,
    id: string,
    actorId: string,
    dto: CreateVersionDto,
    correlation: EventCorrelationContext = {},
  ): Promise<PromptVersion> {
    const prompt = await this.repository.findById(id, orgId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    this.enforceAccess(prompt, orgId, actorId, true);

    const latest = await this.repository.getLatestVersion(id);
    const nextVer = latest ? latest.version + 1 : 1;

    const version = await this.repository.createVersion({
      prompt: { connect: { id } },
      version: nextVer,
      template: dto.template,
      changeLog: dto.changeLog || `Version ${nextVer}`,
      createdBy: { connect: { id: actorId } },
    });

    this.eventBus.publish(
      new PromptVersionCreatedEvent(
        {
          promptId: id,
          organizationId: orgId,
          version: nextVer,
          actorUserId: actorId,
        },
        correlation,
      ),
    );

    return version;
  }

  async listVersions(orgId: string, id: string, actorId: string): Promise<PromptVersion[]> {
    const prompt = await this.repository.findById(id, orgId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }
    this.enforceAccess(prompt, orgId, actorId);
    return this.repository.listVersions(id);
  }

  async render(
    orgId: string,
    id: string,
    actorId: string,
    variables: Record<string, string>,
    versionNum?: number,
  ): Promise<{
    rendered: string;
    variables: string[];
    missing: string[];
    unused: string[];
  }> {
    const prompt = await this.repository.findById(id, orgId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }
    this.enforceAccess(prompt, orgId, actorId);

    const targetVersion = versionNum
      ? await this.repository.getVersion(id, versionNum)
      : await this.repository.getLatestVersion(id);

    if (!targetVersion) {
      throw new NotFoundException('Prompt version not found');
    }

    return this.variableEngine.preview(targetVersion.template, variables);
  }

  private enforceAccess(
    prompt: Prompt,
    orgId: string,
    actorId: string,
    writeRequired = false,
  ): void {
    if (prompt.visibility === PromptVisibility.SYSTEM) {
      if (writeRequired && prompt.createdById !== actorId) {
        throw new ForbiddenException('Only system administrators can modify SYSTEM prompt templates');
      }
      return;
    }

    if (prompt.organizationId !== orgId) {
      throw new ForbiddenException('Access denied to other organization resources');
    }

    if (prompt.visibility === PromptVisibility.PRIVATE && prompt.createdById !== actorId) {
      throw new ForbiddenException('This prompt template is marked private and only accessible by its creator');
    }
  }
}
