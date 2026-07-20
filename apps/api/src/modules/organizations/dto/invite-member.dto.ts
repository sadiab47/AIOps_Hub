import { IsEmail, IsNotEmpty, IsEnum, IsIn } from 'class-validator';
import { OrgRole } from '@aiops-hub/db';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@example.com', description: 'The email address of the invitee' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: OrgRole.MEMBER, enum: OrgRole, description: 'The role to assign to the user within the organization' })
  @IsEnum(OrgRole, { message: 'Invalid role' })
  @IsIn([OrgRole.ADMIN, OrgRole.MANAGER, OrgRole.MEMBER, OrgRole.VIEWER], {
    message: 'Cannot invite users with OWNER role',
  })
  role!: OrgRole;
}
