import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditLogRepositoryInterface } from './audit-log-repository.interface';
import { AuditLog, Prisma } from '@aiops-hub/db';

@Injectable()
export class AuditLogRepository implements AuditLogRepositoryInterface {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }
}
