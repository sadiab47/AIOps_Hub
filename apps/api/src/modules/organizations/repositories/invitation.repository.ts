import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { InvitationRepositoryInterface } from './invitation-repository.interface';
import { AuditEvent } from './organization-repository.interface';
import { Invitation, Member, Prisma, OrgRole, InvitationStatus } from '@aiops-hub/db';

@Injectable()
export class InvitationRepository implements InvitationRepositoryInterface {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.InvitationUncheckedCreateInput): Promise<Invitation> {
    return this.prisma.invitation.create({ data });
  }

  async findActiveByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
    });
  }

  async findPendingByEmailAndOrg(email: string, orgId: string): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        email,
        organizationId: orgId,
        status: InvitationStatus.PENDING,
        deletedAt: null,
      },
    });
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async update(id: string, data: Prisma.InvitationUpdateInput): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data,
    });
  }

  async listPendingByOrg(orgId: string): Promise<Invitation[]> {
    return this.prisma.invitation.findMany({
      where: {
        organizationId: orgId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
    });
  }

  async acceptInvitationTx(
    invitationId: string,
    userId: string,
    orgId: string,
    role: OrgRole,
    audit: AuditEvent,
  ): Promise<Member> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update invitation status to ACCEPTED
      await tx.invitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // 2. Create the Member
      const member = await tx.member.create({
        data: {
          userId,
          organizationId: orgId,
          role,
        },
      });

      // 3. Log Audit event
      await tx.auditLog.create({
        data: {
          userId,
          action: audit.action,
          entityName: audit.entityName,
          entityId: orgId,
          details: audit.details ? (audit.details as any) : undefined,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
        },
      });

      return member;
    });
  }
}
