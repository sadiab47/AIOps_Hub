import { ApiProperty } from '@nestjs/swagger';

export class OrganizationSummaryDto {
  @ApiProperty({ example: '12345678-1234-1234-1234-1234567890ab' })
  id!: string;

  @ApiProperty({ example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  slug!: string;

  @ApiProperty({ example: 'ADMIN' })
  role!: string;

  @ApiProperty({ example: false })
  isCurrent!: boolean;
}
