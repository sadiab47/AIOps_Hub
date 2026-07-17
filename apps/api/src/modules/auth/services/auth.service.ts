import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { REFRESH_TOKEN_REPOSITORY_TOKEN, RefreshTokenRepositoryInterface } from '../repositories/refresh-token-repository.interface';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../../common/database/audit-log-repository.interface';
import { PasswordService } from '../../../common/auth/password.service';
import { TokenService } from '../../../common/auth/token.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    @Inject(USER_REPOSITORY_TOKEN)
    private userRepository: UserRepositoryInterface,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private refreshTokenRepository: RefreshTokenRepositoryInterface,
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN)
    private auditLogRepository: AuditLogRepositoryInterface,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const sessionId = crypto.randomUUID();
    const tokens = await this.generateTokens(user.id, user.email, sessionId);

    // Save refresh token session
    await this.saveRefreshToken(user.id, tokens.refreshToken, sessionId, null, null);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async login(dto: LoginDto, ipAddress: string | null, userAgent: string | null) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      await this.auditLogRepository.create({
        action: 'USER_LOGIN_FAILED',
        entityName: 'User',
        ipAddress,
        userAgent,
        details: { email: dto.email, reason: 'User not found' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.auditLogRepository.create({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        entityName: 'User',
        ipAddress,
        userAgent,
        details: { email: dto.email, reason: 'User inactive' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedAt) {
      await this.auditLogRepository.create({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        entityName: 'User',
        ipAddress,
        userAgent,
        details: { email: dto.email, reason: 'Account locked' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.auditLogRepository.create({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        entityName: 'User',
        ipAddress,
        userAgent,
        details: { email: dto.email, reason: 'Incorrect password' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Rate Limiting placeholder
    // TODO: ThrottlerGuard, 5 attempts, 15 minutes lock. Future Sprint.

    // 1. Generate unique session ID
    const sessionId = crypto.randomUUID();

    // 2. Generate access & refresh tokens mapping the session ID
    const tokens = await this.generateTokens(user.id, user.email, sessionId);

    // 3. Save refresh token session with metadata
    await this.saveRefreshToken(user.id, tokens.refreshToken, sessionId, ipAddress, userAgent);

    // 4. Update lastLoginAt
    await this.userRepository.updateLastLogin(user.id);

    // 5. Create SUCCESS audit log
    await this.auditLogRepository.create({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      entityName: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      details: { sessionId },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens,
    };
  }

  async generateTokens(userId: string, email: string, sessionId: string) {
    const payload = { sub: userId, email, sessionId };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccess(payload),
      this.tokenService.generateRefresh(payload),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async saveRefreshToken(
    userId: string,
    token: string,
    sessionId: string,
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
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
  }
}
