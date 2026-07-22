import { IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RenderPromptDto {
  @ApiProperty({
    example: { customerName: 'Alice', company: 'Acme Corp' },
    description: 'Key-value input map to substitute template variables',
  })
  @IsObject()
  variables!: Record<string, string>;

  @ApiPropertyOptional({ example: 1, description: 'Optional specific version to render (defaults to latest active)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
