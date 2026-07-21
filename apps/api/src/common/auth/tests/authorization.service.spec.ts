import { AuthorizationService } from '../authorization.service';
import { OrgRole } from '@aiops-hub/db';
import { Permissions, WILDCARD_PERMISSION } from '../../constants/permissions';
import { ALL_PERMISSIONS } from '../../constants/role-permission-matrix';

describe('AuthorizationService (RBAC-001)', () => {
  let service: AuthorizationService;

  beforeEach(() => {
    service = new AuthorizationService();
  });

  describe('getPermissionsForRole', () => {
    it('returns pre-computed ALL_PERMISSIONS for OWNER (wildcard expansion)', () => {
      const permissions = service.getPermissionsForRole(OrgRole.OWNER);
      expect(permissions).toBe(ALL_PERMISSIONS);
      expect(permissions.length).toBeGreaterThan(5);
    });

    it('returns granted permissions for ADMIN', () => {
      const permissions = service.getPermissionsForRole(OrgRole.ADMIN);
      expect(permissions).toContain(Permissions.member.remove);
      expect(permissions).toContain(Permissions.settings.update);
      expect(permissions).not.toContain(WILDCARD_PERMISSION);
    });

    it('returns limited permissions for MANAGER', () => {
      const permissions = service.getPermissionsForRole(OrgRole.MANAGER);
      expect(permissions).toContain(Permissions.invitation.create);
      expect(permissions).not.toContain(Permissions.member.update);
      expect(permissions).not.toContain(Permissions.member.remove);
    });

    it('returns minimal permissions for VIEWER', () => {
      const permissions = service.getPermissionsForRole(OrgRole.VIEWER);
      expect(permissions).toEqual([Permissions.organization.view]);
    });
  });

  describe('hasPermissions (AND logic)', () => {
    it('returns true when user holds WILDCARD_PERMISSION', () => {
      const result = service.hasPermissions(
        [Permissions.member.remove, Permissions.settings.update],
        [WILDCARD_PERMISSION],
      );
      expect(result).toBe(true);
    });

    it('returns true when user possesses all required permissions', () => {
      const userPerms = [Permissions.member.list, Permissions.member.view];
      const result = service.hasPermissions([Permissions.member.list], userPerms);
      expect(result).toBe(true);
    });

    it('returns false if any required permission is missing', () => {
      const userPerms = [Permissions.member.list];
      const result = service.hasPermissions(
        [Permissions.member.list, Permissions.member.remove],
        userPerms,
      );
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission (OR logic)', () => {
    it('returns true when user holds WILDCARD_PERMISSION', () => {
      const result = service.hasAnyPermission(
        [Permissions.member.remove],
        [WILDCARD_PERMISSION],
      );
      expect(result).toBe(true);
    });

    it('returns true if user possesses at least one required permission', () => {
      const userPerms = [Permissions.organization.view];
      const result = service.hasAnyPermission(
        [Permissions.organization.view, Permissions.member.remove],
        userPerms,
      );
      expect(result).toBe(true);
    });

    it('returns false if user possesses none of the required permissions', () => {
      const userPerms = [Permissions.organization.view];
      const result = service.hasAnyPermission([Permissions.member.remove], userPerms);
      expect(result).toBe(false);
    });
  });
});
