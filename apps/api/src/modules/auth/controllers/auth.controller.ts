import { Controller, Post, Body, Res, Ip, Headers, Req, UnauthorizedException, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { CookieService } from '../../../common/auth/cookie.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
  ) {}

  @Post('register')
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

    return {
      success: true,
      data: result.user,
    };
  }

  @Post('login')
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

    return {
      success: true,
      data: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate active session refresh and access tokens' })
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

    return {
      success: true,
    };
  }
}
