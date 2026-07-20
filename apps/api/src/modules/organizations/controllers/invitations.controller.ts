import { Controller, Post, Get, Delete, Body, Param, UseGuards, Ip, Headers, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { TenantId } from '../../../common/auth/tenant-id.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { OrgRole } from '@aiops-hub/db';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { InvitationsService } from '../services/invitations.service';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Invite a new collaborator to the organization' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully.' })
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

    // Generate development link
    const inviteLink = `http://localhost:3000/register?token=${rawToken}`;

    return {
      success: true,
      data: {
        ...invitation,
        inviteLink, // Returned in dev context so the client can fetch it
      },
    };
  }

  @Get()
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MANAGER)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'List all pending invitations for the active organization' })
  async list(@TenantId() orgId: string) {
    const invitations = await this.invitationsService.listPending(orgId);
    return {
      success: true,
      data: invitations,
    };
  }

  @Get(':token')
  @ApiOperation({ summary: 'Inspect invitation metadata' })
  @ApiResponse({ status: 200, description: 'Invitation metadata retrieved.' })
  async getMetadata(@Param('token') token: string) {
    const metadata = await this.invitationsService.getInvitationMetadata(token);
    return {
      success: true,
      data: metadata,
    };
  }

  @Post(':token/accept')
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Accept invitation and join organization' })
  async accept(
    @Param('token') token: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('email') email: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const member = await this.invitationsService.accept(
      token,
      userId,
      email,
      ip || null,
      userAgent || null,
    );

    return {
      success: true,
      data: member,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, TenantContextGuard, MembershipGuard, RolesGuard)
  @Roles(OrgRole.OWNER, OrgRole.ADMIN)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  async revoke(
    @Param('id') id: string,
    @TenantId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const invitation = await this.invitationsService.revoke(
      id,
      orgId,
      userId,
      ip || null,
      userAgent || null,
    );

    return {
      success: true,
      data: invitation,
    };
  }
}
