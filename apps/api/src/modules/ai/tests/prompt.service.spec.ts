import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PromptVisibility, PromptType } from '@aiops-hub/db';
import { PromptService } from '../services/prompt.service';
import { PROMPT_REPOSITORY_TOKEN } from '../repositories/prompt-repository.interface';
import { PromptVariableEngineService } from '../services/prompt-variable-engine.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { PrismaService } from '../../../common/database/prisma.service';

describe('PromptService', () => {
  let service: PromptService;
  let repository: any;
  let prisma: any;
  let eventBus: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      getLatestVersion: jest.fn(),
      getVersion: jest.fn(),
      listVersions: jest.fn(),
      createVersion: jest.fn(),
      existsSlug: jest.fn(),
      executeTransaction: jest.fn((cb) => cb(repository)),
    };

    prisma = {
      promptCategory: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        PromptVariableEngineService,
        { provide: PROMPT_REPOSITORY_TOKEN, useValue: repository },
        { provide: PrismaService, useValue: prisma },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  describe('create', () => {
    it('should throw NotFoundException if category is invalid', async () => {
      prisma.promptCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.create('org-1', 'user-1', {
          name: 'Template',
          categoryId: 'invalid-cat-id',
          visibility: PromptVisibility.ORGANIZATION,
          type: PromptType.CHAT,
          template: 'Hello {{name}}',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create prompt and version v1 with sequential slug incrementation', async () => {
      prisma.promptCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
      repository.existsSlug
        .mockResolvedValueOnce(true) // 'test-slug' exists
        .mockResolvedValueOnce(false); // 'test-slug-2' is free

      repository.create.mockResolvedValue({
        id: 'prompt-1',
        organizationId: 'org-1',
        name: 'Test Slug',
        slug: 'test-slug-2',
      });

      repository.createVersion.mockResolvedValue({
        id: 'ver-1',
        version: 1,
      });

      const res = await service.create('org-1', 'user-1', {
        name: 'Test Slug',
        categoryId: 'cat-1',
        visibility: PromptVisibility.ORGANIZATION,
        type: PromptType.CHAT,
        template: 'Hello {{name}}',
      });

      expect(repository.existsSlug).toHaveBeenCalledWith('org-1', 'test-slug');
      expect(repository.existsSlug).toHaveBeenCalledWith('org-1', 'test-slug-2');
      expect(res.slug).toBe('test-slug-2');
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('enforceAccess (Visibility rules)', () => {
    it('should allow creator to access private prompt', async () => {
      repository.findById.mockResolvedValue({
        id: 'prompt-1',
        organizationId: 'org-1',
        visibility: PromptVisibility.PRIVATE,
        createdById: 'user-1',
      });
      repository.getLatestVersion.mockResolvedValue(null);

      const res = await service.getOne('org-1', 'prompt-1', 'user-1');
      expect(res.id).toBe('prompt-1');
    });

    it('should block non-creator from reading private prompt', async () => {
      repository.findById.mockResolvedValue({
        id: 'prompt-1',
        organizationId: 'org-1',
        visibility: PromptVisibility.PRIVATE,
        createdById: 'user-1',
      });

      await expect(service.getOne('org-1', 'prompt-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should allow system administrator to write system prompt', async () => {
      repository.findById.mockResolvedValue({
        id: 'prompt-1',
        organizationId: null,
        visibility: PromptVisibility.SYSTEM,
        createdById: 'admin-1',
      });

      repository.update.mockResolvedValue({ id: 'prompt-1' });

      await service.update('org-1', 'prompt-1', 'admin-1', { name: 'Updated System' });
      expect(repository.update).toHaveBeenCalled();
    });

    it('should block normal user from updating system prompt', async () => {
      repository.findById.mockResolvedValue({
        id: 'prompt-1',
        organizationId: null,
        visibility: PromptVisibility.SYSTEM,
        createdById: 'admin-1',
      });

      await expect(
        service.update('org-1', 'prompt-1', 'other-user', { name: 'Updated System' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
