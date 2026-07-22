import { IsNotEmpty, IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Can you help me write an email?', description: 'Raw message content or template rendering input' })
  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  content!: string;

  @ApiPropertyOptional({ example: '11a1111a-1111-1111-1111-111111111111', description: 'Reference to PromptVersion used' })
  @IsOptional()
  @IsUUID(4, { message: 'Prompt Version ID must be a valid UUID' })
  promptVersionId?: string;

  @ApiPropertyOptional({
    example: { customerName: 'Alice', company: 'Acme Corp' },
    description: 'Variables if promptVersionId is specified',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
