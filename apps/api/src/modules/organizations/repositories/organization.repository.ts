import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { OrganizationRepositoryInterface, AuditEvent } from './organization-repository.interface';
import { Organization, Prisma, OrgRole } from '@aiops-hub/db';

@Injectable()
export class OrganizationRepository implements OrganizationRepositoryInterface {
  constructor(private prisma: PrismaService) {}

  async createWithMemberAndAudit(
    data: Prisma.OrganizationCreateInput,
    ownerUserId: string,
    audit: AuditEvent,
  ): Promise<Organization> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the Organization
      const org = await tx.organization.create({ data });

      // 2. Create the Owner Member
      await tx.member.create({
        data: {
          userId: ownerUserId,
          organizationId: org.id,
          role: OrgRole.OWNER,
        },
      });

      // 3. Create Default Settings for the new organization
      await tx.organizationSettings.create({
        data: {
          organizationId: org.id,
          timezone: 'UTC',
          locale: 'en',
        },
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: ownerUserId,
          action: audit.action,
          entityName: audit.entityName,
          entityId: org.id,
          details: audit.details ? (audit.details as any) : undefined,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
        },
      });

      return org;
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: {
        slug,
        deletedAt: null,
      },
    });
    return count > 0;
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }
}
