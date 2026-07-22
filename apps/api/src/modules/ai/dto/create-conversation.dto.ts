import { IsNotEmpty, IsString, IsUUID, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: 'Customer Support chat', description: 'Title of the conversation thread' })
  @IsString()
  @IsNotEmpty({ message: 'Conversation title is required' })
  title!: string;

  @ApiProperty({ example: '11a1111a-1111-1111-1111-111111111111', description: 'Provider Config ID' })
  @IsUUID(4, { message: 'Provider Config ID must be a valid UUID' })
  providerConfigId!: string;

  @ApiProperty({ example: 'gpt-4o', description: 'Model name to execute completion requests' })
  @IsString()
  @IsNotEmpty({ message: 'Model name is required' })
  model!: string;

  @ApiPropertyOptional({ example: 0.7, description: 'Temperature value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ example: 'You are a professional assistant.', description: 'Custom overriding system prompt' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}
