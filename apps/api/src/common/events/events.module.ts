import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { AuditLogListener } from './listeners/audit-log.listener';

@Global()
@Module({
  providers: [EventBusService, AuditLogListener],
  exports: [EventBusService],
})
export class EventsModule {}
