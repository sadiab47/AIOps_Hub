import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { OrganizationRepositoryInterface, AuditEvent } from './organization-repository.interface';
import { Organization, Prisma, OrgRole, Member, OrganizationSettings } from '@aiops-hub/db';

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

  async existsBySlugExcept(slug: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: {
        slug,
        id: { not: orgId },
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

  async findUserOrganizations(userId: string): Promise<(Organization & { role: string })[]> {
    const memberships = await this.prisma.member.findMany({
      where: {
        userId,
        deletedAt: null,
        organization: {
          deletedAt: null,
        },
      },
      include: {
        organization: true,
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  async findOrganizationContext(
    userId: string,
    orgId: string,
  ): Promise<{
    organization: Organization;
    membership: Member;
    settings: OrganizationSettings | null;
  } | null> {
    const membership = await this.prisma.member.findFirst({
      where: {
        userId,
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        organization: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    const { organization } = membership;
    const { settings } = organization;

    // Disconnect settings from organization relation before returning
    const cleanedOrg = { ...organization };
    delete (cleanedOrg as any).settings;

    return {
      organization: cleanedOrg,
      membership,
      settings,
    };
  }

  async updateProfileAndSettings(
    orgId: string,
    orgData: Prisma.OrganizationUpdateInput,
    settingsData: Prisma.OrganizationSettingsUpdateWithoutOrganizationInput,
    audits: { userId: string; action: string; entityName: string; entityId: string; details?: any; ipAddress?: string | null; userAgent?: string | null }[],
  ): Promise<{ organization: Organization; settings: OrganizationSettings }> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({
        where: { id: orgId },
        data: orgData,
      });

      const settings = await tx.organizationSettings.update({
        where: { organizationId: orgId },
        data: settingsData,
      });

      for (const audit of audits) {
        await tx.auditLog.create({
          data: {
            userId: audit.userId,
            action: audit.action,
            entityName: audit.entityName,
            entityId: audit.entityId,
            details: audit.details ? (audit.details as any) : undefined,
            ipAddress: audit.ipAddress,
            userAgent: audit.userAgent,
          },
        });
      }

      return { organization, settings };
    });
  }
}
