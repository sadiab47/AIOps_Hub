import { Permission } from '../constants/permissions';

export interface RequestContext {
  userId?: string;
  email?: string;
  sessionId?: string;
  organizationId?: string;
  organizationRole?: string;
  organizationName?: string;
  organizationSlug?: string;
  organizationSettings?: {
    timezone: string;
    locale: string;
  } | null;
  permissions?: ReadonlyArray<Permission>;
  requestId?: string;
}

export interface OrganizationContext {
  organizationId: string;
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}
