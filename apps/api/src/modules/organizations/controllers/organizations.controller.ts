import { Controller, Post, Get, Patch, Body, UseGuards, Ip, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { OrgRole } from '@aiops-hub/db';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { SwitchOrganizationDto } from '../dto/switch-organization.dto';
import { OrganizationSummaryDto } from '../dto/organization-summary.dto';
import { CurrentOrganizationDto } from '../dto/current-organization.dto';
import { UpdateOrganizationProfileAndSettingsDto } from '../dto/update-settings.dto';
import { OrganizationsService } from '../services/organizations.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation or invalid request parameters.' })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const org = await this.organizationsService.create(
      dto.name,
      userId,
      ip || null,
      userAgent || null,
    );

    return {
      success: true,
      data: org,
    };
  }

  @Get()
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'List all organizations the user belongs to' })
  @ApiResponse({ status: 200, description: 'Organizations listed successfully.', type: [OrganizationSummaryDto] })
  async list(
    @CurrentUser('sub') userId: string,
    @Headers('x-organization-id') activeOrgId?: string,
  ) {
    const orgs = await this.organizationsService.listUserOrganizations(userId);
    const mapped = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: org.role,
      isCurrent: org.id === activeOrgId,
    }));

    return {
      success: true,
      data: mapped,
    };
  }

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Switch active organization context and validate membership' })
  @ApiResponse({ status: 200, description: 'Switched organization context successfully.', type: CurrentOrganizationDto })
  @ApiResponse({ status: 403, description: 'Forbidden access to this organization.' })
  async switch(
    @Body() dto: SwitchOrganizationDto,
    @CurrentUser('sub') userId: string,
  ) {
    const ctx = await this.organizationsService.switchOrganization(userId, dto.organizationId);
    return {
      success: true,
      data: ctx,
    };
  }

  @Patch('settings')
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update organization profile and configuration settings' })
  @ApiResponse({ status: 200, description: 'Organization settings updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation or invalid request parameters.' })
  @ApiResponse({ status: 403, description: 'Forbidden administrative settings access.' })
  async updateSettings(
    @Body() dto: UpdateOrganizationProfileAndSettingsDto,
    @TenantId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.organizationsService.updateProfileAndSettings(
      userId,
      orgId,
      dto,
      ip || null,
      userAgent || null,
    );

    return {
      success: true,
      data: result,
    };
  }
}
