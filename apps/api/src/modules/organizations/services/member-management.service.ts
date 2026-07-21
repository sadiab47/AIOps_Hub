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
import { EventBusService } from '../../../common/events/event-bus.service';
import { EventCorrelationContext } from '../../../common/events/domain-event';
import {
  MemberRoleChangedEvent,
  MemberRemovedEvent,
  OwnershipTransferredEvent,
  MemberLeftEvent,
} from '../../../common/events/types/member.events';
import { MemberSummaryDto } from '../dto/member-summary.dto';

@Injectable()
export class MemberManagementService {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryInterface,
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

    if (target.userId === actorId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    this.enforceRoleConflictMatrix(actorMembership.role, target.role);

    // Last-owner protection: cannot demote the sole OWNER
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

    if (target.userId === actorId) {
      throw new ForbiddenException(
        'You cannot remove yourself. Use the leave endpoint instead',
      );
    }

    this.enforceRoleConflictMatrix(actorMembership.role, target.role);

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

    if (!actorMembership || actorMembership.role !== OrgRole.OWNER) {
      throw new ForbiddenException('Only the current owner can transfer ownership');
    }

    if (!target) {
      throw new NotFoundException('Target member not found in this organization');
    }

    if (target.userId === actorId) {
      throw new ForbiddenException('You cannot transfer ownership to yourself');
    }

    await this.memberRepository.transferOwnershipTx(orgId, actorMembership.id, targetMemberId);

    this.eventBus.publish(
      new OwnershipTransferredEvent(
        {
          organizationId: orgId,
          fromUserId: actorId,
          toUserId: target.userId,
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

    // OWNER can leave only if other owners exist
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

  /**
   * Enforces the role conflict matrix:
   *   OWNER  → can act on anyone
   *   ADMIN  → can act on MANAGER / MEMBER / VIEWER only (not OWNER or ADMIN)
   *   Others → cannot act on anyone (shouldn't reach here if RolesGuard is applied)
   */
  private enforceRoleConflictMatrix(actorRole: OrgRole, targetRole: OrgRole): void {
    if (actorRole === OrgRole.OWNER) return;

    if (actorRole === OrgRole.ADMIN) {
      if (targetRole === OrgRole.OWNER || targetRole === OrgRole.ADMIN) {
        throw new ForbiddenException('Admins cannot modify Owners or other Admins');
      }
      return;
    }

    throw new ForbiddenException('Insufficient permissions to perform this action');
  }

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
