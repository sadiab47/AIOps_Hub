import { Invitation, Member, Prisma, OrgRole } from '@aiops-hub/db';
import { AuditEvent } from './organization-repository.interface';

export const INVITATION_REPOSITORY_TOKEN = 'InvitationRepositoryInterface';

export interface InvitationRepositoryInterface {
  create(data: Prisma.InvitationUncheckedCreateInput): Promise<Invitation>;
  findActiveByTokenHash(tokenHash: string): Promise<Invitation | null>;
  findPendingByEmailAndOrg(email: string, orgId: string): Promise<Invitation | null>;
  findById(id: string): Promise<Invitation | null>;
  update(id: string, data: Prisma.InvitationUpdateInput): Promise<Invitation>;
  listPendingByOrg(orgId: string): Promise<Invitation[]>;
  acceptInvitationTx(
    invitationId: string,
    userId: string,
    orgId: string,
    role: OrgRole,
    audit: AuditEvent,
  ): Promise<Member>;
}
