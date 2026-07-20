import { ApiProperty } from '@nestjs/swagger';

export class OrganizationSettingsResponseDto {
  @ApiProperty({ example: 'UTC' })
  timezone!: string;

  @ApiProperty({ example: 'en' })
  locale!: string;
}

export class CurrentOrganizationDto {
  @ApiProperty({ example: '12345678-1234-1234-1234-1234567890ab' })
  id!: string;

  @ApiProperty({ example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  slug!: string;

  @ApiProperty({ example: 'OWNER' })
  role!: string;

  @ApiProperty({ example: [] })
  permissions!: string[];

  @ApiProperty({ type: OrganizationSettingsResponseDto })
  settings!: OrganizationSettingsResponseDto;
}
