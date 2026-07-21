import { OrgRole } from '@aiops-hub/db';
import { RequestContext } from '../../auth/request-context.interface';
import { MemberResource } from '../types/member-resource.interface';
import { PolicyResult, allow, deny } from '../types/policy-result.interface';

export class MemberPolicy {
  /**
   * Policy: Can actor manage (update role / remove) target member?
   * Pure function: Returns PolicyResult without throwing exceptions or querying DB.
   */
  static canManageMember(
    actorCtx: RequestContext,
    targetMember?: MemberResource | null,
    newRole?: OrgRole,
  ): PolicyResult {
    if (!targetMember || targetMember.organizationId !== actorCtx.organizationId) {
      return deny('Member not found', 'NOT_FOUND');
    }

    if (targetMember.userId === actorCtx.userId) {
      return deny(
        'You cannot modify your own membership. Use /leave to leave or transfer ownership.',
        'SELF_ACTION',
      );
    }

    const actorRole = actorCtx.organizationRole as OrgRole;
    const targetRole = targetMember.role;

    if (targetRole === OrgRole.OWNER && actorRole !== OrgRole.OWNER) {
      return deny('Only an organization OWNER can modify another OWNER', 'ROLE_HIERARCHY_VIOLATION');
    }

    if (actorRole === OrgRole.ADMIN && (targetRole === OrgRole.ADMIN || targetRole === OrgRole.OWNER)) {
      return deny('ADMINs cannot modify other ADMINs or the OWNER', 'ROLE_HIERARCHY_VIOLATION');
    }

    if (newRole && newRole === OrgRole.OWNER) {
      return deny('Use the transfer-owner endpoint to assign the OWNER role', 'INVALID_ROLE');
    }

    return allow();
  }

  /**
   * Policy: Can actor transfer ownership to target member?
   * Pure function: Returns PolicyResult without throwing exceptions or querying DB.
   */
  static canTransferOwnership(
    actorCtx: RequestContext,
    targetMember?: MemberResource | null,
  ): PolicyResult {
    if (actorCtx.organizationRole !== OrgRole.OWNER) {
      return deny('Only the current OWNER can transfer organization ownership', 'ROLE_HIERARCHY_VIOLATION');
    }

    if (!targetMember || targetMember.organizationId !== actorCtx.organizationId) {
      return deny('Target member not found', 'NOT_FOUND');
    }

    if (targetMember.userId === actorCtx.userId) {
      return deny('You are already the OWNER of this organization', 'SELF_ACTION');
    }

    return allow();
  }
}
