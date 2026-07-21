import { OrgRole } from '@aiops-hub/db';
import { ApiProperty } from '@nestjs/swagger';

export class MemberSummaryDto {
  @ApiProperty({ example: 'mem-12345' })
  id!: string;

  @ApiProperty({ example: 'usr-12345' })
  userId!: string;

  @ApiProperty({ example: 'member@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane Doe', nullable: true })
  name!: string | null;

  @ApiProperty({ enum: OrgRole, example: OrgRole.MEMBER })
  role!: OrgRole;

  @ApiProperty({ example: '2026-07-21T10:52:00.000Z' })
  joinedAt!: Date;
}
