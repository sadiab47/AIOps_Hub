import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../../common/database/audit-log-repository.interface';
import { PasswordService } from '../../../common/auth/password.service';
import { SessionService } from '../services/session.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let userRepository: jest.Mocked<UserRepositoryInterface>;
  let passwordService: jest.Mocked<PasswordService>;
  let sessionService: jest.Mocked<SessionService>;
  let auditLogRepository: jest.Mocked<AuditLogRepositoryInterface>;

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
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
    const mockSessionService = {
      createSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      findSession: jest.fn(),
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
        { provide: SessionService, useValue: mockSessionService },
        { provide: AUDIT_LOG_REPOSITORY_TOKEN, useValue: mockAuditLogRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    userRepository = module.get(USER_REPOSITORY_TOKEN);
    passwordService = module.get(PasswordService);
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
});
