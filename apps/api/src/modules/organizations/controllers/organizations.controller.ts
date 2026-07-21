import { Controller, Post, Get, Patch, Body, UseGuards, Ip, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { PermissionGuard } from '../../../common/auth/permission.guard';
import { RequirePermissions } from '../../../common/auth/require-permissions.decorator';
import { Permissions } from '../../../common/constants/permissions';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { SwitchOrganizationDto } from '../dto/switch-organization.dto';
import { UpdateOrganizationProfileAndSettingsDto } from '../dto/update-settings.dto';
import { OrganizationsService } from '../services/organizations.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth('aiops_access_token')
  @ApiOperation({ summary: 'Create a new organization for the current user' })
  @ApiResponse({ status: 201, description: 'Organization created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation or duplicate organization name.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.organizationsService.create(
      dto.name,
      userId,
      ip || null,
      userAgent || null,
    );
  }

  @Get()
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth('aiops_access_token')
  @ApiOperation({ summary: 'List all organizations the user belongs to' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  async listUserOrganizations(
    @CurrentUser('sub') userId: string,
  ) {
    return this.organizationsService.listUserOrganizations(userId);
  }

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth('aiops_access_token')
  @ApiOperation({ summary: 'Switch active organization context' })
  @ApiResponse({ status: 200, description: 'Context switched successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid organizationId format.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'User is not a member of the specified organization.' })
  async switch(
    @Body() dto: SwitchOrganizationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.organizationsService.switchOrganization(userId, dto.organizationId);
  }

  @Patch('settings')
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, PermissionGuard)
  @RequirePermissions(Permissions.settings.update)
  @ApiCookieAuth('aiops_access_token')
  @ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
  @ApiOperation({ summary: 'Update organization profile and configuration settings' })
  @ApiResponse({ status: 200, description: 'Organization settings updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation or invalid request parameters.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden administrative settings access (Requires settings.update permission).' })
  async updateSettings(
    @Body() dto: UpdateOrganizationProfileAndSettingsDto,
    @TenantId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.organizationsService.updateProfileAndSettings(
      userId,
      orgId,
      dto,
      ip || null,
      userAgent || null,
    );
  }
}
