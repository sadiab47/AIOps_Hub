import { Injectable } from '@nestjs/common';
import { OrgRole } from '@aiops-hub/db';
import { Permission, WILDCARD_PERMISSION } from '../constants/permissions';
import { getPermissionsForRole } from '../constants/role-permission-matrix';
import { RequestContext } from './request-context.interface';
import { MemberResource } from '../authorization/types/member-resource.interface';
import { InvitationResource } from '../authorization/types/invitation-resource.interface';
import { PolicyResult } from '../authorization/types/policy-result.interface';
import { MemberPolicy } from '../authorization/policies/member.policy';
import { InvitationPolicy } from '../authorization/policies/invitation.policy';
import { OrganizationPolicy } from '../authorization/policies/organization.policy';

@Injectable()
export class AuthorizationService {
  // ── Permission Resolution ──────────────────────────────────────────

  /**
   * Resolves granted permissions for a given role using the pre-computed matrix.
   */
  getPermissionsForRole(role: OrgRole): ReadonlyArray<Permission> {
    return getPermissionsForRole(role);
  }

  /**
   * Checks if user has ALL required permissions (AND logic).
   * Supports WILDCARD_PERMISSION ('*').
   */
  hasPermissions(
    requiredPermissions: ReadonlyArray<Permission>,
    userPermissions: ReadonlyArray<Permission>,
  ): boolean {
    if (userPermissions.includes(WILDCARD_PERMISSION)) {
      return true;
    }
    return requiredPermissions.every((required) => userPermissions.includes(required));
  }

  /**
   * Checks if user has AT LEAST ONE of the required permissions (OR logic).
   * Supports WILDCARD_PERMISSION ('*').
   */
  hasAnyPermission(
    requiredPermissions: ReadonlyArray<Permission>,
    userPermissions: ReadonlyArray<Permission>,
  ): boolean {
    if (userPermissions.includes(WILDCARD_PERMISSION)) {
      return true;
    }
    return requiredPermissions.some((required) => userPermissions.includes(required));
  }

  // ── Resource Policies (Delegated Facade) ──────────────────────────

  canManageMember(
    actorCtx: RequestContext,
    targetMember?: MemberResource | null,
    newRole?: OrgRole,
  ): PolicyResult {
    return MemberPolicy.canManageMember(actorCtx, targetMember, newRole);
  }

  canTransferOwnership(
    actorCtx: RequestContext,
    targetMember?: MemberResource | null,
  ): PolicyResult {
    return MemberPolicy.canTransferOwnership(actorCtx, targetMember);
  }

  canManageInvitation(
    actorCtx: RequestContext,
    invitation?: InvitationResource | null,
  ): PolicyResult {
    return InvitationPolicy.canManageInvitation(actorCtx, invitation);
  }

  canUpdateSettings(
    actorCtx: RequestContext,
    targetOrganizationId: string,
  ): PolicyResult {
    return OrganizationPolicy.canUpdateSettings(actorCtx, targetOrganizationId);
  }
}
