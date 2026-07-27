import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { JwtAccessGuard } from "../../../../common/auth/jwt-access.guard";
import { TenantContextGuard } from "../../../../common/auth/tenant-context.guard";
import { MembershipGuard } from "../../../../common/auth/membership.guard";
import { PermissionGuard } from "../../../../common/auth/permission.guard";
import { RequirePermissions } from "../../../../common/auth/require-permissions.decorator";
import { ToolRegistry } from "../services/tool-registry.service";
import { ToolResolver } from "../services/tool-resolver.service";

@ApiTags("AI Tools")
@ApiCookieAuth("aiops_access_token")
@ApiHeader({
  name: "x-organization-id",
  description: "Active Organization ID",
  required: true,
})
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, PermissionGuard)
@Controller({ path: "ai/tools", version: "1" })
export class ToolController {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly resolver: ToolResolver,
  ) {}

  @Get()
  @RequirePermissions("agent:view")
  @ApiOperation({ summary: "List all registered AI tools with schemas" })
  @ApiResponse({
    status: 200,
    description: "Return all registered tool metadata definitions",
  })
  listTools() {
    return {
      success: true,
      data: this.registry.list().map((tool) => tool.definition),
    };
  }

  @Get(":name")
  @RequirePermissions("agent:view")
  @ApiOperation({ summary: "Get details of a single registered AI tool" })
  @ApiResponse({ status: 200, description: "Return single tool definition" })
  @ApiResponse({ status: 404, description: "Tool not found" })
  getTool(@Param("name") name: string) {
    const tool = this.resolver.resolve(name);
    return {
      success: true,
      data: tool.definition,
    };
  }
}
