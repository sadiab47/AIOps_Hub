export type PolicyErrorCode =
  | 'NOT_FOUND'
  | 'SELF_ACTION'
  | 'ROLE_HIERARCHY_VIOLATION'
  | 'TENANT_MISMATCH'
  | 'INVALID_ROLE'
  | 'FORBIDDEN';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  code?: PolicyErrorCode;
}

export function allow(): PolicyResult {
  return { allowed: true };
}

export function deny(reason: string, code: PolicyErrorCode = 'FORBIDDEN'): PolicyResult {
  return { allowed: false, reason, code };
}
