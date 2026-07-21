import { OrgRole } from '@aiops-hub/db';

export class MemberSummaryDto {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: OrgRole;
  joinedAt: Date;
}
