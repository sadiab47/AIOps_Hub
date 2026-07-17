import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { REFRESH_TOKEN_REPOSITORY_TOKEN, RefreshTokenRepositoryInterface } from '../repositories/refresh-token-repository.interface';
import { TokenService } from '../../../common/auth/token.service';

@Injectable()
export class SessionService {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private refreshTokenRepository: RefreshTokenRepositoryInterface,
    private tokenService: TokenService,
  ) {}

  async createSession(
    userId: string,
    email: string,
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    const sessionId = crypto.randomUUID();
    
    const payload = { sub: userId, email, sessionId };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccess(payload),
      this.tokenService.generateRefresh(payload),
    ]);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days matching JWT expiration

    await this.refreshTokenRepository.create({
      id: sessionId,
      userId,
      tokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  async revokeSession(sessionId: string, reason: string) {
    return this.refreshTokenRepository.revoke(sessionId, reason);
  }

  async rotateSession(sessionId: string, newRefreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await this.refreshTokenRepository.updateTokenHash(sessionId, tokenHash);
  }

  async findActiveSession(sessionId: string) {
    return this.refreshTokenRepository.findById(sessionId);
  }

  async revokeAllSessions(userId: string, reason: string) {
    return this.refreshTokenRepository.revokeAllByUser(userId, reason);
  }

  async findSession(tokenHash: string) {
    return this.refreshTokenRepository.findByTokenHash(tokenHash);
  }

  async cleanupExpiredSessions() {
    return this.refreshTokenRepository.deleteExpired();
  }
}
