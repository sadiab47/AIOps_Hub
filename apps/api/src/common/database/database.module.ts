import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AUDIT_LOG_REPOSITORY_TOKEN } from './audit-log-repository.interface';
import { AuditLogRepository } from './audit-log.repository';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: AUDIT_LOG_REPOSITORY_TOKEN,
      useClass: AuditLogRepository,
    },
  ],
  exports: [
    PrismaService,
    AUDIT_LOG_REPOSITORY_TOKEN,
  ],
})
export class DatabaseModule {}
