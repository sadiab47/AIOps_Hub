import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiHeader,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAccessGuard } from "../../../common/auth/jwt-access.guard";
import { TenantContextGuard } from "../../../common/auth/tenant-context.guard";
import { MembershipGuard } from "../../../common/auth/membership.guard";
import { TenantId } from "../../../common/auth/tenant-id.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { WorkflowService } from "../services/workflow.service";
import { WorkflowExecutionService } from "../services/workflow-execution.service";
import { CreateWorkflowDto, UpdateWorkflowDto } from "../dto/workflow.dto";

@ApiTags("Workflows Orchestrator")
@ApiCookieAuth("aiops_access_token")
@ApiHeader({
  name: "x-organization-id",
  description: "Active Organization ID",
  required: true,
})
@Controller("ai/workflows")
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutionService: WorkflowExecutionService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new workflow pipeline" })
  @ApiResponse({ status: 201, description: "Workflow created successfully." })
  async create(
    @TenantId() organizationId: string,
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.workflowService.create(organizationId, dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: "Get all workflows configured for this organization" })
  @ApiResponse({ status: 200, description: "List of workflows retrieved successfully." })
  async findAll(@TenantId() organizationId: string): Promise<any[]> {
    return this.workflowService.findAll(organizationId);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiOperation({ summary: "Get a specific workflow with version history" })
  @ApiResponse({ status: 200, description: "Workflow configuration details." })
  async findById(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.workflowService.findById(organizationId, id);
  }

  @Patch(":id")
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiOperation({ summary: "Modify a workflow structure or state" })
  @ApiResponse({ status: 200, description: "Workflow updated successfully." })
  async update(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.workflowService.update(organizationId, id, dto, user.userId);
  }

  @Delete(":id")
  @HttpCode(240)
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiOperation({ summary: "Soft delete a workflow pipeline" })
  @ApiResponse({ status: 240, description: "Workflow deleted successfully." })
  async delete(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.workflowService.delete(organizationId, id);
  }

  @Post(":id/execute")
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiOperation({ summary: "Execute a workflow configuration sequentially (blocking)" })
  @ApiResponse({ status: 201, description: "Workflow execution completed." })
  async execute(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { input: any },
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.workflowExecutionService.execute(id, organizationId, user.userId, body.input);
  }
}
