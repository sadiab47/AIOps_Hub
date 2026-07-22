import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProvider } from '@aiops-hub/db';
import { DecryptedCredentials } from '../../../common/ai/types/ai-provider.interface';

export class CreateProviderConfigDto {
  @ApiProperty({ enum: AiProvider, example: AiProvider.OPENAI, description: 'AI Provider Vendor' })
  @IsEnum(AiProvider, { message: 'Invalid provider vendor' })
  provider!: AiProvider;

  @ApiProperty({ example: 'Production OpenAI Key', description: 'Display name for this provider configuration' })
  @IsString()
  @IsNotEmpty({ message: 'Configuration name is required' })
  name!: string;

  @ApiProperty({
    example: { apiKey: 'sk-proj-1234567890' },
    description: 'Clean provider credentials payload to be encrypted at rest',
  })
  @IsObject()
  @IsNotEmpty()
  credentials!: DecryptedCredentials;

  @ApiPropertyOptional({ example: 'gpt-4o', description: 'Default model name for completions' })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional({ example: 0.7, description: 'Default temperature' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ example: 2048, description: 'Default max tokens' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether to set as organization default provider' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
