import { Controller, Post, Body, UseGuards, Ip, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
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
}
