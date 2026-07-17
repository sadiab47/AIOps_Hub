import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../../common/database/audit-log-repository.interface';
import { PasswordService } from '../../../common/auth/password.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    @Inject(USER_REPOSITORY_TOKEN)
    private userRepository: UserRepositoryInterface,
    private passwordService: PasswordService,
    private sessionService: SessionService,
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

    const session = await this.sessionService.createSession(user.id, user.email, null, null);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      tokens: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
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

    // 1. Establish session and generate tokens
    const session = await this.sessionService.createSession(user.id, user.email, ipAddress, userAgent);

    // 2. Update lastLoginAt
    await this.userRepository.updateLastLogin(user.id);

    // 3. Create SUCCESS audit log
    await this.auditLogRepository.create({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      entityName: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      details: { sessionId: session.sessionId },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
    };
  }
}
