import { Member, OrgRole, User } from '@aiops-hub/db';

export const MEMBER_REPOSITORY_TOKEN = 'MemberRepositoryInterface';

export type MemberWithUser = Member & {
  user: Pick<User, 'id' | 'email' | 'name'>;
};

export interface MemberRepositoryInterface {
  /** Check if a user is an active member of an organization. */
  findMembership(userId: string, organizationId: string): Promise<Member | null>;

  /** List all active members of an organization, with user profile fields. */
  findMembersByOrganization(organizationId: string): Promise<MemberWithUser[]>;

  /** Fetch a single member by their member record ID, scoped to an organization. */
  findMemberById(memberId: string, organizationId: string): Promise<MemberWithUser | null>;

  /**
   * Return the first active OWNER of the organization.
   * Used for "who owns this org?" queries — prefer over countOwners when
   * the identity of the owner matters, not just the count.
   */
  findOwner(organizationId: string): Promise<Member | null>;

  /** Count active OWNER-role members. Used for last-owner protection checks. */
  countOwners(organizationId: string): Promise<number>;

  /** Update the role of a member record. */
  updateRole(memberId: string, role: OrgRole): Promise<Member>;

  /**
   * Remove a member from the organization.
   * Implementation detail (soft-delete via deletedAt) is hidden from the service layer.
   */
  removeMember(memberId: string): Promise<Member>;

  /**
   * Atomically transfer ownership in a single transaction:
   *   fromMember.role → MEMBER
   *   toMember.role   → OWNER
   */
  transferOwnershipTx(
    organizationId: string,
    fromMemberId: string,
    toMemberId: string,
  ): Promise<void>;
}
