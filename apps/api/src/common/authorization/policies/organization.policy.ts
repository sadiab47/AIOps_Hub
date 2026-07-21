import { RequestContext } from '../../auth/request-context.interface';
import { PolicyResult, allow, deny } from '../types/policy-result.interface';

export class OrganizationPolicy {
  /**
   * Policy: Can actor update settings for target organization?
   * Pure function: Returns PolicyResult without throwing exceptions or querying DB.
   */
  static canUpdateSettings(
    actorCtx: RequestContext,
    targetOrganizationId: string,
  ): PolicyResult {
    if (targetOrganizationId !== actorCtx.organizationId) {
      return deny('Organization settings access denied', 'TENANT_MISMATCH');
    }

    return allow();
  }
}
