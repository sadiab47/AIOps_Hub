import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { REFRESH_TOKEN_REPOSITORY_TOKEN, RefreshTokenRepositoryInterface } from '../repositories/refresh-token-repository.interface';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../../common/database/audit-log-repository.interface';
import { PasswordService } from '../../../common/auth/password.service';
import { TokenService } from '../../../common/auth/token.service';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let userRepository: jest.Mocked<UserRepositoryInterface>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepositoryInterface>;
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
    const mockTokenService = {
      generateAccess: jest.fn(),
      generateRefresh: jest.fn(),
      verify: jest.fn(),
    };
    const mockRefreshTokenRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllByUser: jest.fn(),
      deleteExpired: jest.fn(),
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
        { provide: REFRESH_TOKEN_REPOSITORY_TOKEN, useValue: mockRefreshTokenRepository },
        { provide: AUDIT_LOG_REPOSITORY_TOKEN, useValue: mockAuditLogRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    userRepository = module.get(USER_REPOSITORY_TOKEN);
    passwordService = module.get(PasswordService);
    tokenService = module.get(TokenService);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY_TOKEN);
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
      tokenService.generateAccess.mockResolvedValue('mock_access_token');
      tokenService.generateRefresh.mockResolvedValue('mock_refresh_token');

      const result = await service.register(dto);

      expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
      expect(usersService.create).toHaveBeenCalledWith({
        email: dto.email,
        passwordHash: 'hashed_password',
        name: dto.name,
      });

      expect(tokenService.generateAccess).toHaveBeenCalled();
      expect(tokenService.generateRefresh).toHaveBeenCalled();
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          tokenHash: crypto.createHash('sha256').update('mock_refresh_token').digest('hex'),
        }),
      );

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt,
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
      tokenService.generateAccess.mockResolvedValue('mock_access_token');
      tokenService.generateRefresh.mockResolvedValue('mock_refresh_token');

      const result = await service.login(dto, '127.0.0.1', 'Mozilla/5.0');

      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(passwordService.compare).toHaveBeenCalledWith(dto.password, mockUser.passwordHash);
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
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
