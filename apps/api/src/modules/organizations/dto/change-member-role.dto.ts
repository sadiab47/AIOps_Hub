import { IsIn } from 'class-validator';
import { OrgRole } from '@aiops-hub/db';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeMemberRoleDto {
  /**
   * The new role to assign.
   * OrgRole.OWNER is intentionally excluded — use POST /transfer-owner to assign ownership.
   */
  @ApiProperty({
    enum: [OrgRole.ADMIN, OrgRole.MANAGER, OrgRole.MEMBER, OrgRole.VIEWER],
    example: OrgRole.ADMIN,
    description: 'New role to assign to member (OWNER cannot be assigned via this endpoint)',
  })
  @IsIn([OrgRole.ADMIN, OrgRole.MANAGER, OrgRole.MEMBER, OrgRole.VIEWER], {
    message: 'Use the transfer-owner endpoint to assign the OWNER role',
  })
  role!: OrgRole;
}
