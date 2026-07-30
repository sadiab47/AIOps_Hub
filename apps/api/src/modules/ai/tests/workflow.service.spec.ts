import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WorkflowService } from "../services/workflow.service";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { CreateWorkflowDto, UpdateWorkflowDto } from "../dto/workflow.dto";

describe("WorkflowService", () => {
  let service: WorkflowService;
  let repository: any;
  let eventEmitter: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findLatestVersion: jest.fn(),
      findVersion: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: WorkflowRepository,
          useValue: repository,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  describe("create", () => {
    it("should create a workflow successfully and emit workflow.created event", async () => {
      const orgId = "org-1";
      const dto: CreateWorkflowDto = {
        name: "Test Pipeline",
        description: "Test description",
        definition: {
          version: 1,
          entryStepId: "step-1",
          steps: [],
        },
      };

      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        id: "wf-1",
        organizationId: orgId,
        name: dto.name,
      });

      const result = await service.create(orgId, dto, "user-1");

      expect(result.id).toBe("wf-1");
      expect(repository.findByName).toHaveBeenCalledWith(orgId, dto.name);
      expect(repository.create).toHaveBeenCalledWith(orgId, {
        name: dto.name,
        description: dto.description,
        definition: dto.definition,
        createdById: "user-1",
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith("workflow.created", expect.anything());
    });

    it("should throw ConflictException if workflow name already exists", async () => {
      const orgId = "org-1";
      const dto: CreateWorkflowDto = {
        name: "Duplicate Pipeline",
        definition: {},
      };

      repository.findByName.mockResolvedValue({ id: "wf-exist" });

      await expect(service.create(orgId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe("findById", () => {
    it("should return workflow if found", async () => {
      const orgId = "org-1";
      repository.findById.mockResolvedValue({ id: "wf-1", name: "Flow" });

      const result = await service.findById(orgId, "wf-1");
      expect(result.id).toBe("wf-1");
    });

    it("should throw NotFoundException if missing", async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById("org-1", "wf-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update workflow properties and definition successfully", async () => {
      const orgId = "org-1";
      const dto: UpdateWorkflowDto = {
        name: "Updated Flow",
      };

      repository.findById.mockResolvedValue({ id: "wf-1", name: "Old Flow" });
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue({ id: "wf-1", name: "Updated Flow" });

      const result = await service.update(orgId, "wf-1", dto, "user-1");

      expect(result.name).toBe("Updated Flow");
      expect(eventEmitter.emit).toHaveBeenCalledWith("workflow.updated", expect.anything());
    });
  });
});
