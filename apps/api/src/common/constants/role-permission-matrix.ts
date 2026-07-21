import { OrgRole } from '@aiops-hub/db';
import { Permissions, Permission, WILDCARD_PERMISSION } from './permissions';

/**
 * Pre-computed flat array of all permissions defined in the system.
 * Calculated ONCE at module load time so wildcard expansion for OWNER never
 * re-evaluates Object.values() on per-request paths.
 */
export const ALL_PERMISSIONS: ReadonlyArray<Permission> = Object.values(Permissions).flatMap(
  (group) => Object.values(group) as Permission[],
);

/**
 * Default role-to-permission mapping matrix.
 * Named DEFAULT_ROLE_PERMISSIONS to accommodate future database-driven
 * custom roles and per-organization permission overrides.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<OrgRole, ReadonlyArray<Permission>> = {
  [OrgRole.OWNER]: [WILDCARD_PERMISSION],
  [OrgRole.ADMIN]: [
    Permissions.organization.view,
    Permissions.organization.update,
    Permissions.member.list,
    Permissions.member.view,
    Permissions.member.invite,
    Permissions.member.update,
    Permissions.member.remove,
    Permissions.invitation.create,
    Permissions.invitation.view,
    Permissions.invitation.revoke,
    Permissions.settings.update,
  ],
  [OrgRole.MANAGER]: [
    Permissions.organization.view,
    Permissions.member.list,
    Permissions.member.view,
    Permissions.invitation.create,
    Permissions.invitation.view,
  ],
  [OrgRole.MEMBER]: [
    Permissions.organization.view,
    Permissions.member.list,
    Permissions.member.view,
  ],
  [OrgRole.VIEWER]: [
    Permissions.organization.view,
  ],
};

/**
 * Resolves the complete set of granted permissions for a given role.
 * If the role holds WILDCARD_PERMISSION ('*'), returns the pre-computed ALL_PERMISSIONS array.
 */
export function getPermissionsForRole(role: OrgRole): ReadonlyArray<Permission> {
  const granted = DEFAULT_ROLE_PERMISSIONS[role];
  if (granted && granted.includes(WILDCARD_PERMISSION)) {
    return ALL_PERMISSIONS;
  }
  return granted || [];
}
