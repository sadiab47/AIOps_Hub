import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogListener } from '../listeners/audit-log.listener';
import { EventBusService } from '../event-bus.service';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../database/audit-log-repository.interface';
import { OrganizationCreatedEvent } from '../types/organization.events';

describe('AuditLogListener', () => {
  let listener: AuditLogListener;
  let eventBus: EventBusService;
  let auditLogRepository: jest.Mocked<AuditLogRepositoryInterface>;

  beforeEach(async () => {
    const mockAuditLogRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogListener,
        EventBusService,
        {
          provide: AUDIT_LOG_REPOSITORY_TOKEN,
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    listener = module.get<AuditLogListener>(AuditLogListener);
    eventBus = module.get<EventBusService>(EventBusService);
    auditLogRepository = module.get(AUDIT_LOG_REPOSITORY_TOKEN);

    listener.onModuleInit();
  });

  it('should create audit log when OrganizationCreatedEvent is published', async () => {
    auditLogRepository.create.mockResolvedValue({} as any);

    const event = new OrganizationCreatedEvent(
      { id: 'org-123', name: 'Acme', slug: 'acme', ownerUserId: 'user-123' },
      { userId: 'user-123', ipAddress: '127.0.0.1', userAgent: 'Chrome' },
    );

    eventBus.publish(event);

    // Wait slightly since RxJS subscription executes asynchronously in macro/microtasks
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(auditLogRepository.create).toHaveBeenCalledWith({
      userId: 'user-123',
      action: 'ORGANIZATION_CREATED',
      entityName: 'organization',
      entityId: 'org-123',
      details: { name: 'Acme', slug: 'acme' },
      ipAddress: '127.0.0.1',
      userAgent: 'Chrome',
    });
  });

  it('should isolate errors thrown by repository', async () => {
    // Force repository to throw error
    auditLogRepository.create.mockRejectedValue(new Error('Database down'));

    const event = new OrganizationCreatedEvent(
      { id: 'org-123', name: 'Acme', slug: 'acme', ownerUserId: 'user-123' },
      { userId: 'user-123' },
    );

    // Should NOT throw exception up to caller
    expect(() => {
      eventBus.publish(event);
    }).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(auditLogRepository.create).toHaveBeenCalled();
  });
});
