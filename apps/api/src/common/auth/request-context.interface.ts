export interface RequestContext {
  userId?: string;
  sessionId?: string;
  organizationId?: string;
  organizationRole?: string;
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
