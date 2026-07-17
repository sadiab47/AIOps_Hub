import { Injectable } from '@nestjs/common';
import { Response, CookieOptions } from 'express';

@Injectable()
export class CookieService {
  private readonly isProd = process.env.NODE_ENV === 'production';

  private getOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge,
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
      this.getOptions(15 * 60 * 1000), // 15 minutes
    );

    res.cookie(
      'aiops_refresh_token',
      refreshToken,
      this.getOptions(30 * 24 * 60 * 60 * 1000), // 30 days
    );
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('aiops_access_token', this.getOptions(0));
    res.clearCookie('aiops_refresh_token', this.getOptions(0));
  }
}
