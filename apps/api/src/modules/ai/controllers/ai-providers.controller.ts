import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { PermissionGuard } from '../../../common/auth/permission.guard';
import { RequirePermissions } from '../../../common/auth/require-permissions.decorator';
import { Permissions } from '../../../common/constants/permissions';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CreateProviderConfigDto } from '../dto/create-provider-config.dto';
import { UpdateProviderConfigDto } from '../dto/update-provider-config.dto';
import { AiProviderService } from '../services/ai-provider.service';

@ApiTags('AI Providers')
@ApiCookieAuth('aiops_access_token')
@ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
@Controller('ai/providers')
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class AiProvidersController {
  constructor(private readonly aiProviderService: AiProviderService) {}

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.provider.create)
  @ApiOperation({ summary: 'Create a new AI provider configuration' })
  @ApiResponse({ status: 201, description: 'Provider configuration created and validated successfully.' })
  @ApiResponse({ status: 400, description: 'Credential validation failed or malformed input.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires provider.create permission.' })
  @ApiResponse({ status: 409, description: 'Duplicate provider configuration name in organization.' })
  async create(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: CreateProviderConfigDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.aiProviderService.create(orgId, actorId, dto, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.provider.view)
  @ApiOperation({ summary: 'List all AI provider configurations for active organization' })
  @ApiResponse({ status: 200, description: 'Provider configurations retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires provider.view permission.' })
  async list(@TenantId() orgId: string) {
    return this.aiProviderService.list(orgId);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.provider.view)
  @ApiOperation({ summary: 'Get single AI provider configuration by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Provider configuration retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 404, description: 'Provider configuration not found.' })
  async getOne(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aiProviderService.getOne(orgId, id);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.provider.update)
  @ApiOperation({ summary: 'Update an existing AI provider configuration' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Provider configuration updated successfully.' })
  @ApiResponse({ status: 400, description: 'Credential validation failed or malformed input.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires provider.update permission.' })
  @ApiResponse({ status: 404, description: 'Provider configuration not found.' })
  async update(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderConfigDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.aiProviderService.update(orgId, id, actorId, dto, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.provider.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an AI provider configuration' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Provider configuration deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires provider.delete permission.' })
  @ApiResponse({ status: 404, description: 'Provider configuration not found.' })
  async delete(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.aiProviderService.delete(orgId, id, actorId, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
    return { message: 'Provider configuration deleted successfully' };
  }

  @Post(':id/validate')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.provider.validate)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test and validate stored credentials against provider endpoint' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Credentials validated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 404, description: 'Provider configuration not found.' })
  async validate(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aiProviderService.validateStored(orgId, id);
  }

  @Post(':id/default')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.provider.setDefault)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set provider configuration as organization default' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Provider set as organization default.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires provider.setDefault permission.' })
  @ApiResponse({ status: 404, description: 'Provider configuration not found.' })
  async setDefault(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.aiProviderService.setDefault(orgId, id, actorId, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  }
}
