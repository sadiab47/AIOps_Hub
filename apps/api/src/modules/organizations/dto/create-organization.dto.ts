import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corp', description: 'The display name of the organization' })
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  @MinLength(3, { message: 'Organization name must be at least 3 characters long' })
  @MaxLength(100, { message: 'Organization name cannot exceed 100 characters' })
  name!: string;
}
