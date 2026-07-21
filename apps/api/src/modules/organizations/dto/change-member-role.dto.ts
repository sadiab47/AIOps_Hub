import { IsIn } from 'class-validator';
import { OrgRole } from '@aiops-hub/db';

export class ChangeMemberRoleDto {
  /**
   * The new role to assign.
   * OrgRole.OWNER is intentionally excluded — use POST /transfer-owner to assign ownership.
   * @IsIn is used here (not @IsNotIn) because @IsIn is more explicit and reliable
   * for enum-based allowlist validation.
   */
  @IsIn([OrgRole.ADMIN, OrgRole.MANAGER, OrgRole.MEMBER, OrgRole.VIEWER], {
    message: 'Use the transfer-owner endpoint to assign the OWNER role',
  })
  role!: OrgRole;
}
