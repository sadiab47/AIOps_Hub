import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { OrgRole, Member } from '@aiops-hub/db';
import {
  MEMBER_REPOSITORY_TOKEN,
  MemberRepositoryInterface,
} from '../repositories/member-repository.interface';
import { AuthorizationService } from '../../../common/auth/authorization.service';
import { EventBusService } from '../../../common/events/event-bus.service';
import { EventCorrelationContext } from '../../../common/events/domain-event';
import {
  MemberRoleChangedEvent,
  MemberRemovedEvent,
  OwnershipTransferredEvent,
  MemberLeftEvent,
} from '../../../common/events/types/member.events';
import { MemberSummaryDto } from '../dto/member-summary.dto';
import { RequestContext } from '../../../common/auth/request-context.interface';

@Injectable()
export class MemberManagementService {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryInterface,
    private readonly authorizationService: AuthorizationService,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  async listMembers(orgId: string): Promise<MemberSummaryDto[]> {
    const members = await this.memberRepository.findMembersByOrganization(orgId);
    return members.map(this.toSummaryDto);
  }

  async getMember(orgId: string, memberId: string): Promise<MemberSummaryDto> {
    const member = await this.memberRepository.findMemberById(memberId, orgId);
    if (!member) throw new NotFoundException('Member not found in this organization');
    return this.toSummaryDto(member);
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  async changeRole(
    actorId: string,
    orgId: string,
    memberId: string,
    newRole: OrgRole,
    correlation: EventCorrelationContext = {},
  ): Promise<Member> {
    const [actorMembership, target] = await Promise.all([
      this.memberRepository.findMembership(actorId, orgId),
      this.memberRepository.findMemberById(memberId, orgId),
    ]);

    if (!actorMembership) throw new ForbiddenException('You are not a member of this organization');
    if (!target) throw new NotFoundException('Member not found in this organization');

    const actorCtx: RequestContext = {
      userId: actorId,
      organizationId: orgId,
      organizationRole: actorMembership.role,
      permissions: this.authorizationService.getPermissionsForRole(actorMembership.role as OrgRole),
    };

    // Evaluate policy-based authorization
    const policyResult = this.authorizationService.canManageMember(actorCtx, target, newRole);
    if (!policyResult.allowed) {
      if (policyResult.code === 'NOT_FOUND') throw new NotFoundException(policyResult.reason);
      throw new ForbiddenException(policyResult.reason);
    }

    // Business Invariant: Last-owner protection (sole OWNER cannot be demoted)
    if (target.role === OrgRole.OWNER) {
      const ownerCount = await this.memberRepository.countOwners(orgId);
      if (ownerCount <= 1) {
        throw new ConflictException(
          'Cannot demote the last owner of this organization',
        );
      }
    }

    const updated = await this.memberRepository.updateRole(memberId, newRole);

    this.eventBus.publish(
      new MemberRoleChangedEvent(
        {
          memberId,
          organizationId: orgId,
          userId: target.userId,
          oldRole: target.role,
          newRole,
          actorUserId: actorId,
        },
        correlation,
      ),
    );

    return updated;
  }

  async removeMember(
    actorId: string,
    orgId: string,
    memberId: string,
    correlation: EventCorrelationContext = {},
  ): Promise<void> {
    const [actorMembership, target] = await Promise.all([
      this.memberRepository.findMembership(actorId, orgId),
      this.memberRepository.findMemberById(memberId, orgId),
    ]);

    if (!actorMembership) throw new ForbiddenException('You are not a member of this organization');
    if (!target) throw new NotFoundException('Member not found in this organization');

    const actorCtx: RequestContext = {
      userId: actorId,
      organizationId: orgId,
      organizationRole: actorMembership.role,
      permissions: this.authorizationService.getPermissionsForRole(actorMembership.role as OrgRole),
    };

    // Evaluate policy-based authorization
    const policyResult = this.authorizationService.canManageMember(actorCtx, target);
    if (!policyResult.allowed) {
      if (policyResult.code === 'NOT_FOUND') throw new NotFoundException(policyResult.reason);
      throw new ForbiddenException(policyResult.reason);
    }

    // Business Invariant: Last-owner protection (sole OWNER cannot be removed)
    if (target.role === OrgRole.OWNER) {
      const ownerCount = await this.memberRepository.countOwners(orgId);
      if (ownerCount <= 1) {
        throw new ConflictException(
          'Cannot remove the last owner of this organization',
        );
      }
    }

    await this.memberRepository.removeMember(memberId);

    this.eventBus.publish(
      new MemberRemovedEvent(
        {
          memberId,
          organizationId: orgId,
          userId: target.userId,
          actorUserId: actorId,
        },
        correlation,
      ),
    );
  }

  async transferOwnership(
    actorId: string,
    orgId: string,
    targetMemberId: string,
    correlation: EventCorrelationContext = {},
  ): Promise<void> {
    const [actorMembership, target] = await Promise.all([
      this.memberRepository.findMembership(actorId, orgId),
      this.memberRepository.findMemberById(targetMemberId, orgId),
    ]);

    if (!actorMembership) throw new ForbiddenException('You are not a member of this organization');

    const actorCtx: RequestContext = {
      userId: actorId,
      organizationId: orgId,
      organizationRole: actorMembership.role,
      permissions: this.authorizationService.getPermissionsForRole(actorMembership.role as OrgRole),
    };

    // Evaluate policy-based authorization
    const policyResult = this.authorizationService.canTransferOwnership(actorCtx, target);
    if (!policyResult.allowed) {
      if (policyResult.code === 'NOT_FOUND') throw new NotFoundException(policyResult.reason);
      throw new ForbiddenException(policyResult.reason);
    }

    await this.memberRepository.transferOwnershipTx(orgId, actorMembership.id, targetMemberId);

    this.eventBus.publish(
      new OwnershipTransferredEvent(
        {
          organizationId: orgId,
          fromUserId: actorId,
          toUserId: target!.userId,
          toMemberId: targetMemberId,
          actorUserId: actorId,
        },
        correlation,
      ),
    );
  }

  async leaveOrganization(
    actorId: string,
    orgId: string,
    correlation: EventCorrelationContext = {},
  ): Promise<void> {
    const actorMembership = await this.memberRepository.findMembership(actorId, orgId);
    if (!actorMembership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Business Invariant: OWNER can leave only if other owners exist
    if (actorMembership.role === OrgRole.OWNER) {
      const ownerCount = await this.memberRepository.countOwners(orgId);
      if (ownerCount <= 1) {
        throw new ConflictException(
          'Cannot leave organization while you are the last owner. ' +
          'Transfer ownership or delete the organization.',
        );
      }
    }

    await this.memberRepository.removeMember(actorMembership.id);

    this.eventBus.publish(
      new MemberLeftEvent(
        {
          memberId: actorMembership.id,
          organizationId: orgId,
          userId: actorId,
        },
        correlation,
      ),
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private toSummaryDto(member: any): MemberSummaryDto {
    return {
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: member.user.name ?? null,
      role: member.role,
      joinedAt: member.createdAt,
    };
  }
}
