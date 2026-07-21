import { OrgRole } from '@aiops-hub/db';

export interface MemberResource {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
}
