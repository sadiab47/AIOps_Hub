import { Injectable, Inject, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { INVITATION_REPOSITORY_TOKEN, InvitationRepositoryInterface } from '../repositories/invitation-repository.interface';
import { MEMBER_REPOSITORY_TOKEN, MemberRepositoryInterface } from '../repositories/member-repository.interface';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface } from '../repositories/organization-repository.interface';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { Invitation, Member, OrgRole, InvitationStatus } from '@aiops-hub/db';
import { EventBusService } from '../../../common/events/event-bus.service';
import { MemberJoinedEvent, InvitationAcceptedEvent, InvitationRevokedEvent } from '../../../common/events/types/member.events';

import { AuthorizationService } from '../../../common/auth/authorization.service';
import { RequestContext } from '../../../common/auth/request-context.interface';

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
    private readonly authorizationService: AuthorizationService,
    private readonly eventBus: EventBusService,
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

    const member = await this.invitationRepository.acceptInvitationTx(
      invite.id,
      userId,
      invite.organizationId,
      invite.role,
    );

    // Publish events post-commit
    const correlation = { userId, ipAddress, userAgent, organizationId: invite.organizationId };
    
    this.eventBus.publish(new InvitationAcceptedEvent({
      invitationId: invite.id,
      organizationId: invite.organizationId,
      email: invite.email,
      role: invite.role,
    }, correlation));

    this.eventBus.publish(new MemberJoinedEvent({
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
    }, correlation));

    return member;
  }

  async revoke(
    invitationId: string,
    orgId: string,
    revokedById: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<Invitation> {
    const invite = await this.invitationRepository.findById(invitationId);
    const actorCtx: RequestContext = {
      userId: revokedById,
      organizationId: orgId,
    };

    const policyResult = this.authorizationService.canManageInvitation(actorCtx, invite);
    if (!policyResult.allowed || !invite) {
      throw new NotFoundException(policyResult.reason ?? 'Invitation not found');
    }

    if (invite.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    // Update status to REVOKED and set deletedAt
    const updated = await this.invitationRepository.update(invite.id, {
      status: InvitationStatus.REVOKED,
      deletedAt: new Date(),
    });

    // Publish event post-commit
    this.eventBus.publish(new InvitationRevokedEvent({
      invitationId: invite.id,
      organizationId: orgId,
      revokedByUserId: revokedById,
    }, {
      userId: revokedById,
      ipAddress,
      userAgent,
      organizationId: orgId,
    }));

    return updated;
  }

  async listPending(orgId: string): Promise<Invitation[]> {
    return this.invitationRepository.listPendingByOrg(orgId);
  }
}
