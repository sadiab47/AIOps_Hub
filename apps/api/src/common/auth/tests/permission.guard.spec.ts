import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../permission.guard';
import { AuthorizationService } from '../authorization.service';
import { Permissions, WILDCARD_PERMISSION } from '../../constants/permissions';
import { PERMISSIONS_KEY, PERMISSIONS_MODE_KEY, PermissionMode } from '../require-permissions.decorator';

describe('PermissionGuard (RBAC-001)', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: AuthorizationService;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    authService = new AuthorizationService();
    guard = new PermissionGuard(reflector, authService);
  });

  const createMockContext = (permissions?: string[]): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          context: permissions ? { permissions } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('allows access when route requires no permissions', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const mockContext = createMockContext();
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('allows access when user possesses WILDCARD_PERMISSION', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return [Permissions.member.remove];
      if (key === PERMISSIONS_MODE_KEY) return PermissionMode.ALL;
      return undefined;
    });

    const mockContext = createMockContext([WILDCARD_PERMISSION]);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('allows access when user has required permissions in ALL mode', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return [Permissions.member.list];
      if (key === PERMISSIONS_MODE_KEY) return PermissionMode.ALL;
      return undefined;
    });

    const mockContext = createMockContext([Permissions.member.list, Permissions.member.view]);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('throws ForbiddenException when user lacks required permission', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return [Permissions.member.remove];
      if (key === PERMISSIONS_MODE_KEY) return PermissionMode.ALL;
      return undefined;
    });

    const mockContext = createMockContext([Permissions.member.list]);
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('allows access in ANY mode when user possesses at least one matching permission', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) return [Permissions.member.remove, Permissions.organization.view];
      if (key === PERMISSIONS_MODE_KEY) return PermissionMode.ANY;
      return undefined;
    });

    const mockContext = createMockContext([Permissions.organization.view]);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('throws ForbiddenException when request has no tenant context', () => {
    reflector.getAllAndOverride.mockReturnValue([Permissions.member.list]);
    const mockContext = createMockContext(undefined);
    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
