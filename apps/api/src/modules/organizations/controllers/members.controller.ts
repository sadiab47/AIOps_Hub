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
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import { OrgRole } from '@aiops-hub/db';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { MemberManagementService } from '../services/member-management.service';
import { ChangeMemberRoleDto } from '../dto/change-member-role.dto';

@ApiTags('Members')
@ApiCookieAuth()
@Controller('organizations/members')
@UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard)
export class MembersController {
  constructor(private readonly memberManagementService: MemberManagementService) {}

  // ── Queries (any member) ─────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all active members of the current organization' })
  @ApiResponse({ status: 200, description: 'Members listed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Not a member of this organization.' })
  async list(@TenantId() orgId: string) {
    const members = await this.memberManagementService.listMembers(orgId);
    return { success: true, data: members };
  }

  /**
   * POST /leave must be declared BEFORE /:memberId to prevent NestJS
   * from treating "leave" as a memberId path parameter.
   */
  @Post('leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave the current organization' })
  @ApiResponse({ status: 200, description: 'Successfully left the organization.' })
  @ApiResponse({ status: 403, description: 'Not a member of this organization.' })
  @ApiResponse({
    status: 409,
    description: 'Last owner must transfer ownership before leaving.',
  })
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
    return { success: true, message: 'You have left the organization' };
  }

  @Get(':memberId')
  @ApiOperation({ summary: 'Get a single member by ID' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Member retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async getOne(
    @TenantId() orgId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const member = await this.memberManagementService.getMember(orgId, memberId);
    return { success: true, data: member };
  }

  // ── Commands (OWNER / ADMIN) ─────────────────────────────────────────────

  @Patch(':memberId')
  @UseGuards(RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.ADMIN)
  @ApiOperation({ summary: 'Change a member\'s role (OWNER cannot be assigned here)' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid role (e.g. OWNER attempted via this endpoint).' })
  @ApiResponse({ status: 403, description: 'Forbidden — role conflict matrix violation.' })
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
    const updated = await this.memberManagementService.changeRole(
      actorId,
      orgId,
      memberId,
      dto.role,
      { userId: actorId, organizationId: orgId, ipAddress: ip || null, userAgent: userAgent || null },
    );
    return { success: true, data: updated };
  }

  @Delete(':memberId')
  @UseGuards(RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Member removed successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden — role conflict matrix violation.' })
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
    return { success: true, message: 'Member removed successfully' };
  }

  @Post(':memberId/transfer-owner')
  @UseGuards(RolesGuard)
  @Roles(OrgRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomically transfer organization ownership to another member' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Ownership transferred successfully.' })
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
    return { success: true, message: 'Ownership transferred successfully' };
  }
}
