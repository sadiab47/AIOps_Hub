import { RequestContext } from '../../auth/request-context.interface';
import { InvitationResource } from '../types/invitation-resource.interface';
import { PolicyResult, allow, deny } from '../types/policy-result.interface';

export class InvitationPolicy {
  /**
   * Policy: Can actor manage (revoke / inspect) invitation?
   * Pure function: Returns PolicyResult without throwing exceptions or querying DB.
   */
  static canManageInvitation(
    actorCtx: RequestContext,
    invitation?: InvitationResource | null,
  ): PolicyResult {
    if (!invitation || invitation.organizationId !== actorCtx.organizationId) {
      return deny('Invitation not found', 'NOT_FOUND');
    }

    return allow();
  }
}
