import { Injectable, Inject, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { INVITATION_REPOSITORY_TOKEN, InvitationRepositoryInterface } from '../repositories/invitation-repository.interface';
import { MEMBER_REPOSITORY_TOKEN, MemberRepositoryInterface } from '../repositories/member-repository.interface';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface, AuditEvent } from '../repositories/organization-repository.interface';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../../common/database/audit-log-repository.interface';
import { Invitation, Member, OrgRole, InvitationStatus } from '@aiops-hub/db';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(INVITATION_REPOSITORY_TOKEN)
    private readonly invitationRepository: InvitationRepositoryInterface,
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryInterface,
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private readonly organizationRepository: OrganizationRepositoryInterface,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN)
    private readonly auditLogRepository: AuditLogRepositoryInterface,
  ) {}

  async invite(
    email: string,
    role: OrgRole,
    orgId: string,
    invitedById: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{ rawToken: string; invitation: Invitation }> {
    if (role === OrgRole.OWNER) {
      throw new BadRequestException('Cannot invite users as OWNER');
    }

    // 1. Check if user is already a member
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      const membership = await this.memberRepository.findMembership(existingUser.id, orgId);
      if (membership) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 2. Check for duplicate pending invitations
    const pendingInvite = await this.invitationRepository.findPendingByEmailAndOrg(email, orgId);
    if (pendingInvite) {
      // Reuse and extend expiry
      const updatedInvite = await this.invitationRepository.update(pendingInvite.id, {
        tokenHash,
        expiresAt,
        role, // Update role if they requested a different one
      });
      return { rawToken, invitation: updatedInvite };
    }

    // 3. Create fresh invitation
    const invitation = await this.invitationRepository.create({
      email,
      role,
      tokenHash,
      organizationId: orgId,
      invitedById,
      expiresAt,
    });

    return { rawToken, invitation };
  }

  async getInvitationMetadata(token: string) {
    const tokenHash = hashToken(token);
    const invite = await this.invitationRepository.findActiveByTokenHash(tokenHash);

    if (!invite) {
      throw new NotFoundException('Invitation not found, expired, or already accepted');
    }

    const org = await this.organizationRepository.findById(invite.organizationId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      organization: org.name,
      email: invite.email,
      role: invite.role,
      status: invite.status,
    };
  }

  async accept(
    token: string,
    userId: string,
    userEmail: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<Member> {
    const tokenHash = hashToken(token);
    const invite = await this.invitationRepository.findActiveByTokenHash(tokenHash);

    if (!invite) {
      throw new NotFoundException('Invitation not found or expired');
    }

    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    // Idempotency: check if already a member
    const existingMember = await this.memberRepository.findMembership(userId, invite.organizationId);
    if (existingMember) {
      // Mark accepted anyway if it wasn't
      if (invite.status !== InvitationStatus.ACCEPTED) {
        await this.invitationRepository.update(invite.id, {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        });
      }
      return existingMember;
    }

    const audit: AuditEvent = {
      action: 'MEMBER_JOINED',
      entityName: 'member',
      ipAddress,
      userAgent,
      details: { invitationId: invite.id, email: invite.email, role: invite.role },
    };

    return this.invitationRepository.acceptInvitationTx(
      invite.id,
      userId,
      invite.organizationId,
      invite.role,
      audit,
    );
  }

  async revoke(
    invitationId: string,
    orgId: string,
    revokedById: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<Invitation> {
    const invite = await this.invitationRepository.findById(invitationId);

    if (!invite || invite.organizationId !== orgId) {
      throw new NotFoundException('Invitation not found');
    }

    if (invite.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    // Update status to REVOKED and set deletedAt
    const updated = await this.invitationRepository.update(invite.id, {
      status: InvitationStatus.REVOKED,
      deletedAt: new Date(),
    });

    // Create Audit Log inside transaction or directly (it is non-atomic for membership creation, so directly is fine here)
    // Actually, we can just create the audit log using Prisma directly or via OrganizationRepository
    const audit: AuditEvent = {
      action: 'INVITATION_REVOKED',
      entityName: 'invitation',
      entityId: invite.id,
      ipAddress,
      userAgent,
      details: { email: invite.email, role: invite.role },
    };

    await this.prismaAuditLog(revokedById, audit);

    return updated;
  }

  async listPending(orgId: string): Promise<Invitation[]> {
    return this.invitationRepository.listPendingByOrg(orgId);
  }

  // Helper to log audit events
  private async prismaAuditLog(userId: string, audit: AuditEvent) {
    await this.auditLogRepository.create({
      userId,
      action: audit.action,
      entityName: audit.entityName,
      entityId: audit.entityId || null,
      details: audit.details ? (audit.details as any) : undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }
}
