import { Injectable } from '@nestjs/common';
import { Response, CookieOptions } from 'express';

@Injectable()
export class CookieService {
  private readonly isProd = process.env.NODE_ENV === 'production';

  getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      path: '/',
    };
  }

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie(
      'aiops_access_token',
      accessToken,
      { ...this.getCookieOptions(), maxAge: 15 * 60 * 1000 }, // 15 minutes
    );

    res.cookie(
      'aiops_refresh_token',
      refreshToken,
      { ...this.getCookieOptions(), maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    );
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('aiops_access_token', this.getCookieOptions());
    res.clearCookie('aiops_refresh_token', this.getCookieOptions());
  }
}
