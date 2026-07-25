import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentVersionDto {
  @ApiProperty({ description: 'AI Provider configuration ID' })
  @IsUUID()
  @IsNotEmpty()
  providerConfigId!: string;

  @ApiProperty({ description: 'AI Model key name' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiPropertyOptional({ description: 'Linked prompt library template version ID' })
  @IsUUID()
  @IsOptional()
  promptVersionId?: string;

  @ApiPropertyOptional({ description: 'Model temperature (0.0 to 2.0)', minimum: 0, maximum: 2 })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Maximum tokens to yield' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Execution timeout limit in milliseconds' })
  @IsNumber()
  @Min(500)
  @IsOptional()
  executionTimeoutMs?: number;

  @ApiPropertyOptional({ description: 'Number of execution retry attempts' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  retryLimit?: number;

  @ApiPropertyOptional({ description: 'Flag enabling SSE execution responses stream' })
  @IsOptional()
  streamingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Custom strategy to compute sliding window budget' })
  @IsString()
  @IsOptional()
  memoryStrategyOverride?: string;
}

export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Unique agent slug parameter' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ description: 'Description of agent goals' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: AgentVersionDto })
  @ValidateNested()
  @Type(() => AgentVersionDto)
  version!: AgentVersionDto;
}
