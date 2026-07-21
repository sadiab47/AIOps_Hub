import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Permission } from '../constants/permissions';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MODE_KEY = 'permissions_mode';

export enum PermissionMode {
  ALL = 'ALL',
  ANY = 'ANY',
}

/**
 * Requires ALL specified permissions (AND logic) to access the route.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Requires AT LEAST ONE of the specified permissions (OR logic) to access the route.
 * Combines PERMISSIONS_KEY and PERMISSIONS_MODE_KEY using NestJS applyDecorators.
 */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_KEY, PermissionMode.ANY),
  );
