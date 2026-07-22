import { IsNotEmpty, IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromptVisibility, PromptType } from '@aiops-hub/db';

export class CreatePromptDto {
  @ApiProperty({ example: 'Customer Support Welcome', description: 'Name of the prompt template' })
  @IsString()
  @IsNotEmpty({ message: 'Prompt name is required' })
  name!: string;

  @ApiPropertyOptional({ example: 'A prompt to greet customers and set expectations', description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '11a1111a-1111-1111-1111-111111111111', description: 'Associated category UUID' })
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  categoryId!: string;

  @ApiProperty({ enum: PromptVisibility, example: PromptVisibility.ORGANIZATION, description: 'Visibility level' })
  @IsEnum(PromptVisibility, { message: 'Invalid visibility level' })
  visibility!: PromptVisibility;

  @ApiProperty({ enum: PromptType, example: PromptType.CHAT, description: 'Type of prompt' })
  @IsEnum(PromptType, { message: 'Invalid prompt type' })
  type!: PromptType;

  @ApiProperty({ example: 'Hello {{customerName}}, welcome to {{company}}!', description: 'Mustache/Handlebars template body' })
  @IsString()
  @IsNotEmpty({ message: 'Template body is required for the initial version' })
  template!: string;

  @ApiPropertyOptional({ example: 'Initial release', description: 'Version changelog comment' })
  @IsOptional()
  @IsString()
  changeLog?: string;
}
