import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/database/prisma.service";
import { WorkflowRepository } from "./workflow.repository";

@Injectable()
export class PrismaWorkflowRepository implements WorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      definition: any;
      createdById?: string;
    },
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          organizationId,
          name: data.name,
          description: data.description,
          status: "DRAFT",
        },
      });

      const version = await tx.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          versionNumber: 1,
          definition: data.definition,
          createdById: data.createdById,
        },
      });

      return {
        ...workflow,
        versions: [version],
      };
    });
  }

  async findById(organizationId: string, id: string): Promise<any | null> {
    return this.prisma.workflow.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
      },
    });
  }

  async findByName(organizationId: string, name: string): Promise<any | null> {
    return this.prisma.workflow.findFirst({
      where: {
        name,
        organizationId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
      },
    });
  }

  async findAll(organizationId: string): Promise<any[]> {
    return this.prisma.workflow.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: any;
      definition?: any;
      createdById?: string;
    },
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.findFirst({
        where: { id, organizationId, deletedAt: null },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      // If definition changed, create a new immutable version snapshot
      let newVersion: any = null;
      if (data.definition) {
        const latest = await tx.workflowVersion.findFirst({
          where: { workflowId: id },
          orderBy: { versionNumber: "desc" },
        });

        const nextVer = latest ? latest.versionNumber + 1 : 1;

        newVersion = await tx.workflowVersion.create({
          data: {
            workflowId: id,
            versionNumber: nextVer,
            definition: data.definition,
            createdById: data.createdById,
          },
        });
      }

      const updated = await tx.workflow.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          description: data.description !== undefined ? data.description : undefined,
          status: data.status !== undefined ? data.status : undefined,
        },
        include: {
          versions: {
            orderBy: {
              versionNumber: "desc",
            },
          },
        },
      });

      return updated;
    });
  }

  async delete(organizationId: string, id: string): Promise<boolean> {
    const updated = await this.prisma.workflow.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return updated.count > 0;
  }

  async findLatestVersion(workflowId: string): Promise<any | null> {
    return this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { versionNumber: "desc" },
    });
  }

  async findVersion(workflowId: string, versionNumber: number): Promise<any | null> {
    return this.prisma.workflowVersion.findFirst({
      where: { workflowId, versionNumber },
    });
  }
}
