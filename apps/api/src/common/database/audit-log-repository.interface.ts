import { AuditLog, Prisma } from '@aiops-hub/db';

export const AUDIT_LOG_REPOSITORY_TOKEN = 'AuditLogRepositoryInterface';

export interface AuditLogRepositoryInterface {
  create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog>;
}
