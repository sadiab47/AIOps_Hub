import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiParam, ApiHeader } from '@nestjs/swagger';
import { OrgRole } from '@aiops-hub/db';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { PermissionGuard } from '../../../common/auth/permission.guard';
import { RequirePermissions } from '../../../common/auth/require-permissions.decorator';
import { Permissions } from '../../../common/constants/permissions';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { MemberManagementService } from '../services/member-management.service';
import { ChangeMemberRoleDto } from '../dto/change-member-role.dto';

@ApiTags('Members')
@ApiCookieAuth('aiops_access_token')
@ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
@Controller('organizations/members')
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class MembersController {
  constructor(private readonly memberManagementService: MemberManagementService) {}

  // ── Queries (any member with member:list / member:view) ─────────────────

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.member.list)
  @ApiOperation({ summary: 'List all active members of the current organization' })
  @ApiResponse({ status: 200, description: 'Members listed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Not a member of this organization or missing member:list permission.' })
  async list(@TenantId() orgId: string) {
    return this.memberManagementService.listMembers(orgId);
  }

  /**
   * POST /leave must be declared BEFORE /:memberId to prevent NestJS
   * from treating "leave" as a memberId path parameter.
   */
  @Post('leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave the current organization' })
  @ApiResponse({ status: 200, description: 'Successfully left the organization.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Not a member of this organization.' })
  @ApiResponse({ status: 409, description: 'Last owner must transfer ownership or delete the organization before leaving.' })
  async leave(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.memberManagementService.leaveOrganization(actorId, orgId, {
      userId: actorId,
      organizationId: orgId,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
    return { message: 'You have left the organization' };
  }

  @Get(':memberId')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.member.view)
  @ApiOperation({ summary: 'Get a single member by ID' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Member retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async getOne(
    @TenantId() orgId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.memberManagementService.getMember(orgId, memberId);
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  @Patch(':memberId')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.member.update)
  @ApiOperation({ summary: 'Change a member\'s role (OWNER cannot be assigned here)' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid role (e.g. OWNER attempted via this endpoint).' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permission or role matrix conflict.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  @ApiResponse({ status: 409, description: 'Cannot demote the last owner.' })
  async changeRole(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: ChangeMemberRoleDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.memberManagementService.changeRole(
      actorId,
      orgId,
      memberId,
      dto.role,
      { userId: actorId, organizationId: orgId, ipAddress: ip || null, userAgent: userAgent || null },
    );
  }

  @Delete(':memberId')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permissions.member.remove)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Member removed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permission or role matrix conflict.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  @ApiResponse({ status: 409, description: 'Cannot remove the last owner.' })
  async remove(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.memberManagementService.removeMember(
      actorId,
      orgId,
      memberId,
      { userId: actorId, organizationId: orgId, ipAddress: ip || null, userAgent: userAgent || null },
    );
    return { message: 'Member removed successfully' };
  }

  /**
   * Transfer Ownership is an explicitly OWNER-only domain action.
   * Kept on RolesGuard per design requirement #1.
   */
  @Post(':memberId/transfer-owner')
  @UseGuards(RolesGuard)
  @Roles(OrgRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomically transfer organization ownership to another member' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Ownership transferred successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Only the current owner can transfer ownership.' })
  @ApiResponse({ status: 404, description: 'Target member not found.' })
  async transferOwner(
    @TenantId() orgId: string,
    @CurrentUser('sub') actorId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.memberManagementService.transferOwnership(
      actorId,
      orgId,
      memberId,
      { userId: actorId, organizationId: orgId, ipAddress: ip || null, userAgent: userAgent || null },
    );
    return { message: 'Ownership transferred successfully' };
  }
}
