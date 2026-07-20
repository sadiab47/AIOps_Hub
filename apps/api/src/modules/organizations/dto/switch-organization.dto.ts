import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchOrganizationDto {
  @ApiProperty({ example: '12345678-1234-1234-1234-1234567890ab', description: 'The UUID of the organization to switch to' })
  @IsUUID('all', { message: 'Invalid organization ID format' })
  @IsNotEmpty({ message: 'Organization ID is required' })
  organizationId!: string;
}
