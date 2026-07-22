import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersionDto {
  @ApiProperty({ example: 'Hello {{customerName}}, how can {{company}} help you today?', description: 'Updated template body' })
  @IsString()
  @IsNotEmpty({ message: 'Template body is required' })
  template!: string;

  @ApiPropertyOptional({ example: 'Improved customer support tone', description: 'Changelog description' })
  @IsOptional()
  @IsString()
  changeLog?: string;
}
