import { Controller, Post, Body, Res, Ip, Headers, Req, UnauthorizedException, HttpCode, Get, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiCookieAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { CookieService } from '../../../common/auth/cookie.service';
import { JwtAccessGuard } from '../../../common/auth/jwt-access.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { CurrentUserResponseDto } from '../../users/dto/current-user-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @Throttle({ register: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully and cookies set.',
    headers: {
      'Set-Cookie': {
        description: 'Attaches aiops_access_token and aiops_refresh_token cookies.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 409, description: 'Email is already registered.' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.cookieService.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  }

  @Post('login')
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate user and start session' })
  @ApiHeader({
    name: 'user-agent',
    description: 'Client browser User-Agent metadata',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully and session cookies set.',
    headers: {
      'Set-Cookie': {
        description: 'Attaches namespaced aiops_access_token and aiops_refresh_token session cookies.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or invalid request parameters.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, ip || null, userAgent || null);
    this.cookieService.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  }

  @Post('refresh')
  @Throttle({ refresh: { limit: 20, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate active session refresh and access tokens' })
  @ApiCookieAuth('aiops_refresh_token')
  @ApiResponse({
    status: 200,
    description: 'Tokens rotated successfully and new secure cookies attached.',
    headers: {
      'Set-Cookie': {
        description: 'Overwrites namespaced aiops_access_token and aiops_refresh_token session cookies.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or revoked refresh token.' })
  async refresh(
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.aiops_refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid session');
    }

    const result = await this.authService.refreshSession(refreshToken, ip || null, userAgent || null);
    this.cookieService.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: 'Session refreshed successfully' };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log out from current session and clear auth cookies' })
  @ApiCookieAuth('aiops_refresh_token')
  @ApiResponse({
    status: 200,
    description: 'Current session invalidated and auth cookies cleared (idempotent).',
    headers: {
      'Set-Cookie': {
        description: 'Clears namespaced aiops_access_token and aiops_refresh_token cookies.',
        schema: { type: 'string' },
      },
    },
  })
  async logout(
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.aiops_refresh_token;

    await this.authService.logout(refreshToken, ip || null, userAgent || null);
    this.cookieService.clearAuthCookies(res);
    return { message: 'Logged out successfully.' };
  }

  @Post('logout-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log out from all active multi-device sessions' })
  @ApiCookieAuth('aiops_refresh_token')
  @ApiResponse({
    status: 200,
    description: 'All active user sessions invalidated and auth cookies cleared (idempotent).',
    headers: {
      'Set-Cookie': {
        description: 'Clears namespaced aiops_access_token and aiops_refresh_token cookies.',
        schema: { type: 'string' },
      },
    },
  })
  async logoutAll(
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.aiops_refresh_token;

    await this.authService.logoutAll(refreshToken, ip || null, userAgent || null);
    this.cookieService.clearAuthCookies(res);
    return { message: 'All sessions logged out successfully.' };
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  @ApiCookieAuth('aiops_access_token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
    type: CurrentUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  async me(@CurrentUser('sub') userId: string) {
    return this.usersService.getCurrentProfile(userId);
  }
}
