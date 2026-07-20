import { DomainEvent } from '../domain-event';
import { OrgRole } from '@aiops-hub/db';

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
