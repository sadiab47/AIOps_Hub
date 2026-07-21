import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { EventBusService } from '../event-bus.service';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../database/audit-log-repository.interface';
import {
  OrganizationCreatedEvent,
  OrganizationUpdatedEvent,
  OrganizationSettingsUpdatedEvent,
  SlugChangedEvent,
} from '../types/organization.events';
import {
  MemberJoinedEvent,
  InvitationAcceptedEvent,
  InvitationRevokedEvent,
  MemberRoleChangedEvent,
  MemberRemovedEvent,
  OwnershipTransferredEvent,
  MemberLeftEvent,
} from '../types/member.events';

@Injectable()
export class AuditLogListener implements OnModuleInit {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN)
    private readonly auditLogRepository: AuditLogRepositoryInterface,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(OrganizationCreatedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.correlation.userId || event.payload.ownerUserId,
          action: OrganizationCreatedEvent.EVENT_NAME,
          entityName: 'organization',
          entityId: event.payload.id,
          details: { name: event.payload.name, slug: event.payload.slug },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${OrganizationCreatedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(OrganizationUpdatedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.correlation.userId || null,
          action: OrganizationUpdatedEvent.EVENT_NAME,
          entityName: 'organization',
          entityId: event.payload.id,
          details: { field: 'name', old: event.payload.oldName, new: event.payload.newName },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${OrganizationUpdatedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(OrganizationSettingsUpdatedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.correlation.userId || null,
          action: OrganizationSettingsUpdatedEvent.EVENT_NAME,
          entityName: 'organization_settings',
          entityId: event.payload.id,
          details: event.payload.changedFields,
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${OrganizationSettingsUpdatedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(SlugChangedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.correlation.userId || null,
          action: SlugChangedEvent.EVENT_NAME,
          entityName: 'organization',
          entityId: event.payload.id,
          details: { old: event.payload.oldSlug, new: event.payload.newSlug },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${SlugChangedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(MemberJoinedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.payload.userId,
          action: MemberJoinedEvent.EVENT_NAME,
          entityName: 'member',
          entityId: event.payload.organizationId,
          details: { role: event.payload.role },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${MemberJoinedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(InvitationAcceptedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.correlation.userId || null,
          action: InvitationAcceptedEvent.EVENT_NAME,
          entityName: 'invitation',
          entityId: event.payload.invitationId,
          details: { email: event.payload.email, role: event.payload.role },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${InvitationAcceptedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(InvitationRevokedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.payload.revokedByUserId,
          action: InvitationRevokedEvent.EVENT_NAME,
          entityName: 'invitation',
          entityId: event.payload.invitationId,
          details: { revokedBy: event.payload.revokedByUserId },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${InvitationRevokedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(MemberRoleChangedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.payload.actorUserId,
          action: MemberRoleChangedEvent.EVENT_NAME,
          entityName: 'member',
          entityId: event.payload.memberId,
          details: {
            userId: event.payload.userId,
            oldRole: event.payload.oldRole,
            newRole: event.payload.newRole,
            actorUserId: event.payload.actorUserId,
          },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${MemberRoleChangedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(MemberRemovedEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.payload.actorUserId,
          action: MemberRemovedEvent.EVENT_NAME,
          entityName: 'member',
          entityId: event.payload.memberId,
          details: {
            userId: event.payload.userId,
            actorUserId: event.payload.actorUserId,
          },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${MemberRemovedEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(OwnershipTransferredEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.payload.actorUserId,
          action: OwnershipTransferredEvent.EVENT_NAME,
          entityName: 'organization',
          entityId: event.payload.organizationId,
          details: {
            fromUserId: event.payload.fromUserId,
            toUserId: event.payload.toUserId,
            toMemberId: event.payload.toMemberId,
          },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${OwnershipTransferredEvent.EVENT_NAME}`, err);
      }
    });

    this.eventBus.ofType(MemberLeftEvent).subscribe(async (event) => {
      try {
        await this.auditLogRepository.create({
          userId: event.payload.userId,
          action: MemberLeftEvent.EVENT_NAME,
          entityName: 'member',
          entityId: event.payload.memberId,
          details: { organizationId: event.payload.organizationId },
          ipAddress: event.correlation.ipAddress || null,
          userAgent: event.correlation.userAgent || null,
        });
      } catch (err) {
        this.logger.error(`Failed to log ${MemberLeftEvent.EVENT_NAME}`, err);
      }
    });
  }
}
