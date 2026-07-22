import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiHeader, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PromptVisibility } from '@aiops-hub/db';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { PermissionGuard } from '../../../common/auth/permission.guard';
import { RequirePermissions } from '../../../common/auth/require-permissions.decorator';
import { Permissions } from '../../../common/constants/permissions';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CreatePromptDto } from '../dto/create-prompt.dto';
import { UpdatePromptDto } from '../dto/update-prompt.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { RenderPromptDto } from '../dto/render-prompt.dto';
import { PromptService } from '../services/prompt.service';
import { PrismaService } from '../../../common/database/prisma.service';

@ApiTags('Prompt Library')
@ApiCookieAuth('aiops_access_token')
@ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
@Controller('prompts')
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class PromptsController {
  constructor(
    private readonly promptService: PromptService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'List all available prompt categories' })
  @ApiResponse({ status: 200, description: 'Prompt categories list.' })
  async listCategories() {
    return this.prisma.promptCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.create)
  @ApiOperation({ summary: 'Create a new prompt template' })
  @ApiResponse({ status: 201, description: 'Prompt and initial version created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid validation or missing template.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires prompt.create permission.' })
  async create(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: CreatePromptDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.promptService.create(orgId, actorId, dto, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.view)
  @ApiOperation({ summary: 'List accessible prompts for active organization' })
  @ApiQuery({ name: 'categoryId', type: String, required: false })
  @ApiQuery({ name: 'visibility', enum: PromptVisibility, required: false })
  @ApiResponse({ status: 200, description: 'List of prompt templates retrieved successfully.' })
  async list(
    @TenantId() orgId: string,
    @Query('categoryId') categoryId?: string,
    @Query('visibility') visibility?: PromptVisibility,
  ) {
    return this.promptService.list(orgId, categoryId, visibility);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.view)
  @ApiOperation({ summary: 'Get details of a single prompt template including active version variables' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Prompt metadata and variables retrieved.' })
  @ApiResponse({ status: 404, description: 'Prompt not found.' })
  async getOne(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.promptService.getOne(orgId, id, actorId);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.update)
  @ApiOperation({ summary: 'Update prompt metadata (name, description, visibility, category)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Prompt metadata updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Prompt not found.' })
  async update(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: UpdatePromptDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.promptService.update(orgId, id, actorId, dto, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a prompt template and its version history' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Prompt template deleted successfully.' })
  async delete(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.promptService.delete(orgId, id, actorId, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
    return { message: 'Prompt template deleted successfully' };
  }

  @Post(':id/versions')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.versionCreate)
  @ApiOperation({ summary: 'Add a new template version to prompt history' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 201, description: 'New version added successfully.' })
  async createVersion(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: CreateVersionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.promptService.createVersion(orgId, id, actorId, dto, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  }

  @Get(':id/versions')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.versionView)
  @ApiOperation({ summary: 'List version history of a prompt template' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Version history list.' })
  async listVersions(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.promptService.listVersions(orgId, id, actorId);
  }

  @Post(':id/render')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.prompt.render)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview template rendering with test variables' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rendered text and validation diagnostic information.' })
  async render(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: RenderPromptDto,
  ) {
    return this.promptService.render(orgId, id, actorId, dto.variables, dto.version);
  }
}
