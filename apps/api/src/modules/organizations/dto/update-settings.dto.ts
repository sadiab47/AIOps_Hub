import { IsString, IsOptional, Matches, IsEnum, IsUrl, IsNumber, IsBoolean, IsInt, Min, Max, ValidateNested, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AiProvider } from '@aiops-hub/db';

export class UpdateOrganizationProfileDto {
  @ApiProperty({ example: 'Acme Inc', required: false })
  @IsString()
  @IsOptional()
  @Length(1, 100, { message: 'Organization name must be between 1 and 100 characters' })
  name?: string;

  @ApiProperty({ example: 'acme-inc', required: false })
  @IsString()
  @IsOptional()
  @Length(3, 50, { message: 'Slug must be between 3 and 50 characters' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric characters and single hyphens only, and cannot start or end with a hyphen',
  })
  slug?: string;
}

export class UpdateOrganizationSettingsDto {
  @ApiProperty({ example: 'UTC', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiProperty({ example: '#2563EB', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Branding color must be a valid hex color code (e.g. #RGB or #RRGGBB)',
  })
  brandingColor?: string;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['https'] }, { message: 'Logo URL must be a secure HTTPS link' })
  logoUrl?: string;

  @ApiProperty({ enum: AiProvider, required: false })
  @IsEnum(AiProvider, { message: 'Invalid AI provider' })
  @IsOptional()
  defaultAiProvider?: AiProvider;

  @ApiProperty({ example: 'gpt-4', required: false })
  @IsString()
  @IsOptional()
  defaultAiModel?: string;

  @ApiProperty({ example: 0.7, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  defaultAiTemperature?: number;

  @ApiProperty({ example: 'text-embedding-3-small', required: false })
  @IsString()
  @IsOptional()
  defaultEmbeddingModel?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  allowPublicInvitations?: boolean;

  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  retentionDays?: number;
}

export class UpdateOrganizationProfileAndSettingsDto {
  @ApiProperty({ type: UpdateOrganizationProfileDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrganizationProfileDto)
  profile?: UpdateOrganizationProfileDto;

  @ApiProperty({ type: UpdateOrganizationSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsDto)
  settings?: UpdateOrganizationSettingsDto;
}
