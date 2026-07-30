import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WorkflowStatus } from "@aiops-hub/db";

export class CreateWorkflowDto {
  @ApiProperty({ description: "Unique name of the workflow pipeline" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "Optional description explaining the pipeline flow" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "DAG Definition containing version, entryStepId, and steps nodes",
    example: {
      version: 1,
      entryStepId: "step-1",
      steps: [
        {
          id: "step-1",
          type: "AGENT",
          name: "Classifier Agent",
          config: {},
          next: []
        }
      ]
    }
  })
  @IsObject()
  @IsNotEmpty()
  definition!: any;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: "Name of the workflow" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Description explaining the pipeline flow" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Status configuration of the workflow", enum: WorkflowStatus })
  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;

  @ApiPropertyOptional({ description: "New definition JSON metadata structure" })
  @IsObject()
  @IsOptional()
  definition?: any;
}
