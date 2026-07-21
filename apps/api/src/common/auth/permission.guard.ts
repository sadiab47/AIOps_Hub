import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  PermissionMode,
} from './require-permissions.decorator';
import { Permission } from '../constants/permissions';
import { RequestContext } from './request-context.interface';
import { AuthorizationService } from './authorization.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Un-annotated routes require no specific permissions
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const mode =
      this.reflector.getAllAndOverride<PermissionMode>(PERMISSIONS_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || PermissionMode.ALL;

    const request = context.switchToHttp().getRequest();
    const reqContext = request.context as RequestContext | undefined;

    if (!reqContext || !reqContext.permissions) {
      throw new ForbiddenException('Access denied: Missing tenant context');
    }

    const userPermissions = reqContext.permissions;
    const isAuthorized =
      mode === PermissionMode.ANY
        ? this.authorizationService.hasAnyPermission(requiredPermissions, userPermissions)
        : this.authorizationService.hasPermissions(requiredPermissions, userPermissions);

    if (!isAuthorized) {
      throw new ForbiddenException(
        `Access denied: Insufficient permissions [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
