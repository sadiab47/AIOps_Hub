import { DomainEvent } from '../domain-event';
import { OrgRole } from '@aiops-hub/db';

// ── Existing events (ORG-002) ────────────────────────────────────────────────

export class MemberJoinedEvent extends DomainEvent<{
  organizationId: string;
  userId: string;
  role: OrgRole;
}> {
  static readonly EVENT_NAME = 'MEMBER_JOINED';
  readonly eventName = MemberJoinedEvent.EVENT_NAME;
}

export class InvitationAcceptedEvent extends DomainEvent<{
  invitationId: string;
  organizationId: string;
  email: string;
  role: OrgRole;
}> {
  static readonly EVENT_NAME = 'INVITATION_ACCEPTED';
  readonly eventName = InvitationAcceptedEvent.EVENT_NAME;
}

export class InvitationRevokedEvent extends DomainEvent<{
  invitationId: string;
  organizationId: string;
  revokedByUserId: string;
}> {
  static readonly EVENT_NAME = 'INVITATION_REVOKED';
  readonly eventName = InvitationRevokedEvent.EVENT_NAME;
}

// ── New events (ORG-005) ─────────────────────────────────────────────────────

/**
 * Fired when a member's role is changed via PATCH /organizations/members/:memberId.
 * actorUserId is explicit in the payload — distinct from correlation.userId so it
 * survives even if correlation context is stripped in async pipelines.
 */
export class MemberRoleChangedEvent extends DomainEvent<{
  memberId: string;
  organizationId: string;
  userId: string;
  oldRole: OrgRole;
  newRole: OrgRole;
  actorUserId: string;
}> {
  static readonly EVENT_NAME = 'MEMBER_ROLE_CHANGED';
  readonly eventName = MemberRoleChangedEvent.EVENT_NAME;
}

/** Fired when a member is removed via DELETE /organizations/members/:memberId. */
export class MemberRemovedEvent extends DomainEvent<{
  memberId: string;
  organizationId: string;
  userId: string;
  actorUserId: string;
}> {
  static readonly EVENT_NAME = 'MEMBER_REMOVED';
  readonly eventName = MemberRemovedEvent.EVENT_NAME;
}

/**
 * Fired when ownership is atomically transferred via
 * POST /organizations/members/:memberId/transfer-owner.
 * Both fromUserId and toUserId are recorded for complete audit history.
 */
export class OwnershipTransferredEvent extends DomainEvent<{
  organizationId: string;
  fromUserId: string;
  toUserId: string;
  toMemberId: string;
  actorUserId: string;
}> {
  static readonly EVENT_NAME = 'OWNERSHIP_TRANSFERRED';
  readonly eventName = OwnershipTransferredEvent.EVENT_NAME;
}

/** Fired when a member voluntarily leaves via POST /organizations/leave. */
export class MemberLeftEvent extends DomainEvent<{
  memberId: string;
  organizationId: string;
  userId: string;
}> {
  static readonly EVENT_NAME = 'MEMBER_LEFT';
  readonly eventName = MemberLeftEvent.EVENT_NAME;
}
