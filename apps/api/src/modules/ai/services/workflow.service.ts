import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { CreateWorkflowDto, UpdateWorkflowDto } from "../dto/workflow.dto";
import { WorkflowCreatedEvent, WorkflowUpdatedEvent } from "../events/workflow.events";

@Injectable()
export class WorkflowService {
  constructor(
    private readonly workflowRepo: WorkflowRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organizationId: string,
    dto: CreateWorkflowDto,
    userId?: string,
  ): Promise<any> {
    const existing = await this.workflowRepo.findByName(organizationId, dto.name);
    if (existing) {
      throw new ConflictException("Workflow name already exists in this organization");
    }

    const workflow = await this.workflowRepo.create(organizationId, {
      name: dto.name,
      description: dto.description,
      definition: dto.definition,
      createdById: userId,
    });

    this.eventEmitter.emit(
      "workflow.created",
      new WorkflowCreatedEvent(workflow.id, organizationId, workflow.name),
    );

    return workflow;
  }

  async findById(organizationId: string, id: string): Promise<any> {
    const workflow = await this.workflowRepo.findById(organizationId, id);
    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }
    return workflow;
  }

  async findAll(organizationId: string): Promise<any[]> {
    return this.workflowRepo.findAll(organizationId);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateWorkflowDto,
    userId?: string,
  ): Promise<any> {
    const workflow = await this.workflowRepo.findById(organizationId, id);
    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    if (dto.name && dto.name !== workflow.name) {
      const existing = await this.workflowRepo.findByName(organizationId, dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException("Workflow name already exists in this organization");
      }
    }

    const updated = await this.workflowRepo.update(organizationId, id, {
      name: dto.name,
      description: dto.description,
      status: dto.status,
      definition: dto.definition,
      createdById: userId,
    });

    this.eventEmitter.emit(
      "workflow.updated",
      new WorkflowUpdatedEvent(updated.id, organizationId, updated.name),
    );

    return updated;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const workflow = await this.workflowRepo.findById(organizationId, id);
    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }
    await this.workflowRepo.delete(organizationId, id);
  }
}
