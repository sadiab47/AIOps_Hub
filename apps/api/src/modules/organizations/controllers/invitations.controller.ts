import { Controller, Post, Get, Delete, Body, Param, UseGuards, Ip, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { PermissionGuard } from '../../../common/auth/permission.guard';
import { RequirePermissions } from '../../../common/auth/require-permissions.decorator';
import { Permissions } from '../../../common/constants/permissions';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { InvitationsService } from '../services/invitations.service';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, PermissionGuard)
  @RequirePermissions(Permissions.invitation.create)
  @ApiCookieAuth('aiops_access_token')
  @ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
  @ApiOperation({ summary: 'Invite a new collaborator to the organization' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid email or role.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires invitation.create permission.' })
  @ApiResponse({ status: 409, description: 'User is already an active member or pending invitation exists.' })
  async invite(
    @Body() dto: InviteMemberDto,
    @TenantId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const { rawToken, invitation } = await this.invitationsService.invite(
      dto.email,
      dto.role,
      orgId,
      userId,
      ip || null,
      userAgent || null,
    );

    const inviteLink = `http://localhost:3000/register?token=${rawToken}`;

    return {
      ...invitation,
      inviteLink,
    };
  }

  @Get()
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, PermissionGuard)
  @RequirePermissions(Permissions.invitation.view)
  @ApiCookieAuth('aiops_access_token')
  @ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
  @ApiOperation({ summary: 'List all pending invitations for the active organization' })
  @ApiResponse({ status: 200, description: 'Pending invitations retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires invitation.view permission.' })
  async list(@TenantId() orgId: string) {
    return this.invitationsService.listPending(orgId);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Inspect invitation metadata by raw token' })
  @ApiParam({ name: 'token', type: String, description: 'Raw invitation token' })
  @ApiResponse({ status: 200, description: 'Invitation metadata retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired.' })
  async getMetadata(@Param('token') token: string) {
    return this.invitationsService.getInvitationMetadata(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth('aiops_access_token')
  @ApiOperation({ summary: 'Accept invitation and join organization' })
  @ApiParam({ name: 'token', type: String, description: 'Raw invitation token' })
  @ApiResponse({ status: 200, description: 'Invitation accepted and member created.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Invitation email does not match authenticated user email.' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired.' })
  async accept(
    @Param('token') token: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('email') email: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.invitationsService.accept(
      token,
      userId,
      email,
      ip || null,
      userAgent || null,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, PermissionGuard)
  @RequirePermissions(Permissions.invitation.revoke)
  @ApiCookieAuth('aiops_access_token')
  @ApiHeader({ name: 'x-organization-id', description: 'Active Organization ID', required: true })
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully.' })
  @ApiResponse({ status: 400, description: 'Only pending invitations can be revoked.' })
  @ApiResponse({ status: 401, description: 'Unauthenticated.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires invitation.revoke permission.' })
  @ApiResponse({ status: 404, description: 'Invitation not found in active organization.' })
  async revoke(
    @Param('id') id: string,
    @TenantId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.invitationsService.revoke(
      id,
      orgId,
      userId,
      ip || null,
      userAgent || null,
    );
  }
}
