import { Member } from '@aiops-hub/db';

export const MEMBER_REPOSITORY_TOKEN = 'MemberRepositoryInterface';

export interface MemberRepositoryInterface {
  findMembership(userId: string, organizationId: string): Promise<Member | null>;
}
