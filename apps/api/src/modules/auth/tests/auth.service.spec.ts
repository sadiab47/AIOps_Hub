import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../../common/database/audit-log-repository.interface';
import { PasswordService } from '../../../common/auth/password.service';
import { TokenService } from '../../../common/auth/token.service';
import { SessionService } from '../services/session.service';
import * as nodeCrypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let userRepository: jest.Mocked<UserRepositoryInterface>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let sessionService: jest.Mocked<SessionService>;
  let auditLogRepository: jest.Mocked<AuditLogRepositoryInterface>;

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    const mockUserRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    const mockPasswordService = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    const mockTokenService = {
      generateAccess: jest.fn(),
      generateRefresh: jest.fn(),
      verify: jest.fn(),
    };
    const mockSessionService = {
      createSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      findSession: jest.fn(),
      findActiveSession: jest.fn(),
      rotateSession: jest.fn(),
      cleanupExpiredSessions: jest.fn(),
    };
    const mockAuditLogRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: USER_REPOSITORY_TOKEN, useValue: mockUserRepository },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: AUDIT_LOG_REPOSITORY_TOKEN, useValue: mockAuditLogRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    userRepository = module.get(USER_REPOSITORY_TOKEN);
    passwordService = module.get(PasswordService);
    tokenService = module.get(TokenService);
    sessionService = module.get(SessionService);
    auditLogRepository = module.get(AUDIT_LOG_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user and return tokens', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: dto.email,
        passwordHash: 'hashed_password',
        name: dto.name,
        isActive: true,
        lockedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      passwordService.hash.mockResolvedValue('hashed_password');
      usersService.create.mockResolvedValue(mockUser);
      sessionService.createSession.mockResolvedValue({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        sessionId: '12345678-1234-1234-1234-123456789012',
      });

      const result = await service.register(dto);

      expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
      expect(usersService.create).toHaveBeenCalledWith({
        email: dto.email,
        passwordHash: 'hashed_password',
        name: dto.name,
      });

      expect(sessionService.createSession).toHaveBeenCalledWith(mockUser.id, mockUser.email, null, null);

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt,
      });
      expect(result.tokens).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
    });
  });

  describe('login', () => {
    const dto = {
      email: 'login@example.com',
      password: 'Password123!',
    };

    it('should successfully login user with correct credentials', async () => {
      const mockUser = {
        id: 'user-uuid-login',
        email: dto.email,
        passwordHash: 'hashed_password',
        name: 'Jane Doe',
        isActive: true,
        lockedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      sessionService.createSession.mockResolvedValue({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        sessionId: '12345678-1234-1234-1234-123456789012',
      });

      const result = await service.login(dto, '127.0.0.1', 'Mozilla/5.0');

      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(passwordService.compare).toHaveBeenCalledWith(dto.password, mockUser.passwordHash);
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(sessionService.createSession).toHaveBeenCalledWith(mockUser.id, mockUser.email, '127.0.0.1', 'Mozilla/5.0');
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: 'USER_LOGIN_SUCCESS',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      );

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
        tokens: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
        },
      });
    });

    it('should throw UnauthorizedException on non-existent user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_LOGIN_FAILED',
          details: expect.objectContaining({ reason: 'User not found' }),
        }),
      );
    });

    it('should throw UnauthorizedException on inactive user', async () => {
      const mockUser = {
        id: 'user-uuid-login',
        email: dto.email,
        passwordHash: 'hashed_password',
        name: 'Jane Doe',
        isActive: false,
        lockedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.login(dto, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: 'USER_LOGIN_FAILED',
          details: expect.objectContaining({ reason: 'User inactive' }),
        }),
      );
    });

    it('should throw UnauthorizedException on locked account', async () => {
      const mockUser = {
        id: 'user-uuid-login',
        email: dto.email,
        passwordHash: 'hashed_password',
        name: 'Jane Doe',
        isActive: true,
        lockedAt: new Date(),
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.login(dto, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: 'USER_LOGIN_FAILED',
          details: expect.objectContaining({ reason: 'Account locked' }),
        }),
      );
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const mockUser = {
        id: 'user-uuid-login',
        email: dto.email,
        passwordHash: 'hashed_password',
        name: 'Jane Doe',
        isActive: true,
        lockedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(false);

      await expect(service.login(dto, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: 'USER_LOGIN_FAILED',
          details: expect.objectContaining({ reason: 'Incorrect password' }),
        }),
      );
    });
  });

  describe('refreshSession', () => {
    const mockToken = 'mock_refresh_token_value';
    const mockTokenHash = nodeCrypto.createHash('sha256').update(mockToken).digest('hex');

    it('should successfully rotate tokens on valid session', async () => {
      const mockPayload = {
        sub: 'user-uuid-login',
        email: 'test@example.com',
        sessionId: '12345678-1234-1234-1234-123456789012',
      };

      const mockSession = {
        id: '12345678-1234-1234-1234-123456789012',
        userId: 'user-uuid-login',
        tokenHash: mockTokenHash,
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-uuid-login',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Jane Doe',
        isActive: true,
        lockedAt: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      tokenService.verify.mockResolvedValue(mockPayload);
      sessionService.findActiveSession.mockResolvedValue(mockSession);
      usersService.findById.mockResolvedValue(mockUser);
      tokenService.generateAccess.mockResolvedValue('new_access_token');
      tokenService.generateRefresh.mockResolvedValue('new_refresh_token');

      const result = await service.refreshSession(mockToken, '127.0.0.1', 'Mozilla/5.0');

      expect(tokenService.verify).toHaveBeenCalledWith(mockToken);
      expect(sessionService.findActiveSession).toHaveBeenCalledWith(mockPayload.sessionId);
      expect(usersService.findById).toHaveBeenCalledWith(mockSession.userId);
      expect(sessionService.rotateSession).toHaveBeenCalledWith(mockSession.id, 'new_refresh_token');
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: 'TOKEN_REFRESH_SUCCESS',
        }),
      );

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
    });

    it('should throw UnauthorizedException on verification failure', async () => {
      tokenService.verify.mockRejectedValue(new Error('Invalid signature'));

      await expect(service.refreshSession(mockToken, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TOKEN_REFRESH_FAILED',
          details: expect.objectContaining({ reason: 'Invalid or expired token signature' }),
        }),
      );
    });

    it('should throw UnauthorizedException on session not found', async () => {
      tokenService.verify.mockResolvedValue({
        sub: 'user-uuid-login',
        email: 'test@example.com',
        sessionId: '12345678-1234-1234-1234-123456789012',
      });
      sessionService.findActiveSession.mockResolvedValue(null);

      await expect(service.refreshSession(mockToken, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TOKEN_REFRESH_FAILED',
          details: expect.objectContaining({ reason: 'Session not found' }),
        }),
      );
    });

    it('should throw UnauthorizedException on session revoked', async () => {
      tokenService.verify.mockResolvedValue({
        sub: 'user-uuid-login',
        email: 'test@example.com',
        sessionId: '12345678-1234-1234-1234-123456789012',
      });

      const mockSession = {
        id: '12345678-1234-1234-1234-123456789012',
        userId: 'user-uuid-login',
        tokenHash: mockTokenHash,
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sessionService.findActiveSession.mockResolvedValue(mockSession);

      await expect(service.refreshSession(mockToken, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TOKEN_REFRESH_FAILED',
          details: expect.objectContaining({ reason: 'Session revoked' }),
        }),
      );
    });

    it('should throw UnauthorizedException on session expired', async () => {
      tokenService.verify.mockResolvedValue({
        sub: 'user-uuid-login',
        email: 'test@example.com',
        sessionId: '12345678-1234-1234-1234-123456789012',
      });

      const mockSession = {
        id: '12345678-1234-1234-1234-123456789012',
        userId: 'user-uuid-login',
        tokenHash: mockTokenHash,
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() - 100000),
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sessionService.findActiveSession.mockResolvedValue(mockSession);

      await expect(service.refreshSession(mockToken, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TOKEN_REFRESH_FAILED',
          details: expect.objectContaining({ reason: 'Session expired' }),
        }),
      );
    });

    it('should detect reuse and immediately revoke all user sessions', async () => {
      tokenService.verify.mockResolvedValue({
        sub: 'user-uuid-login',
        email: 'test@example.com',
        sessionId: '12345678-1234-1234-1234-123456789012',
      });

      const mockSession = {
        id: '12345678-1234-1234-1234-123456789012',
        userId: 'user-uuid-login',
        tokenHash: 'different_stale_token_hash',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: 'user-uuid-login',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Jane Doe',
        isActive: true,
        lockedAt: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      sessionService.findActiveSession.mockResolvedValue(mockSession);
      usersService.findById.mockResolvedValue(mockUser);

      await expect(service.refreshSession(mockToken, '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith(mockSession.userId);
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TOKEN_REUSE_DETECTED',
          userId: mockSession.userId,
        }),
      );
    });
  });
});
