import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../repositories/user-repository.interface';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<UserRepositoryInterface>;

  beforeEach(async () => {
    const mockUserRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPOSITORY_TOKEN, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(USER_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentProfile', () => {
    const userId = 'user-uuid-123';

    it('should successfully return the user profile DTO when active', async () => {
      const mockUser = {
        id: userId,
        email: 'jane@example.com',
        name: 'Jane Doe',
        passwordHash: 'hash',
        isActive: true,
        lockedAt: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getCurrentProfile(userId);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        organizations: [],
        roles: [],
      });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getCurrentProfile(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const mockUser = {
        id: userId,
        email: 'jane@example.com',
        name: 'Jane Doe',
        passwordHash: 'hash',
        isActive: false,
        lockedAt: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(service.getCurrentProfile(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is locked', async () => {
      const mockUser = {
        id: userId,
        email: 'jane@example.com',
        name: 'Jane Doe',
        passwordHash: 'hash',
        isActive: true,
        lockedAt: new Date(),
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(service.getCurrentProfile(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
