import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvitationsService, hashToken } from '../services/invitations.service';
import { INVITATION_REPOSITORY_TOKEN, InvitationRepositoryInterface } from '../repositories/invitation-repository.interface';
import { MEMBER_REPOSITORY_TOKEN, MemberRepositoryInterface } from '../repositories/member-repository.interface';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface } from '../repositories/organization-repository.interface';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../../users/repositories/user-repository.interface';
import { AUDIT_LOG_REPOSITORY_TOKEN, AuditLogRepositoryInterface } from '../../../common/database/audit-log-repository.interface';
import { OrgRole, InvitationStatus } from '@aiops-hub/db';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationRepository: jest.Mocked<InvitationRepositoryInterface>;
  let memberRepository: jest.Mocked<MemberRepositoryInterface>;
  let organizationRepository: jest.Mocked<OrganizationRepositoryInterface>;
  let userRepository: jest.Mocked<UserRepositoryInterface>;
  let auditLogRepository: jest.Mocked<AuditLogRepositoryInterface>;

  beforeEach(async () => {
    const mockInvitationRepository = {
      create: jest.fn(),
      findActiveByTokenHash: jest.fn(),
      findPendingByEmailAndOrg: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      listPendingByOrg: jest.fn(),
      acceptInvitationTx: jest.fn(),
    };
    const mockMemberRepository = {
      findMembership: jest.fn(),
    };
    const mockOrganizationRepository = {
      createWithMemberAndAudit: jest.fn(),
      existsBySlug: jest.fn(),
      findById: jest.fn(),
    };
    const mockUserRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    const mockAuditLogRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: INVITATION_REPOSITORY_TOKEN, useValue: mockInvitationRepository },
        { provide: MEMBER_REPOSITORY_TOKEN, useValue: mockMemberRepository },
        { provide: ORGANIZATION_REPOSITORY_TOKEN, useValue: mockOrganizationRepository },
        { provide: USER_REPOSITORY_TOKEN, useValue: mockUserRepository },
        { provide: AUDIT_LOG_REPOSITORY_TOKEN, useValue: mockAuditLogRepository },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    invitationRepository = module.get(INVITATION_REPOSITORY_TOKEN);
    memberRepository = module.get(MEMBER_REPOSITORY_TOKEN);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY_TOKEN);
    userRepository = module.get(USER_REPOSITORY_TOKEN);
    auditLogRepository = module.get(AUDIT_LOG_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('invite', () => {
    it('should throw BadRequestException if role is OWNER', async () => {
      await expect(
        service.invite('test@example.com', OrgRole.OWNER, 'org-uuid', 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user is already a member', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-user-uuid' } as any);
      memberRepository.findMembership.mockResolvedValue({ id: 'member-uuid' } as any);

      await expect(
        service.invite('test@example.com', OrgRole.MEMBER, 'org-uuid', 'user-uuid'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reuse and extend duplicate pending invitations', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const mockPending = { id: 'invite-uuid', email: 'test@example.com' } as any;
      invitationRepository.findPendingByEmailAndOrg.mockResolvedValue(mockPending);
      invitationRepository.update.mockResolvedValue({ ...mockPending, role: OrgRole.ADMIN } as any);

      const result = await service.invite('test@example.com', OrgRole.ADMIN, 'org-uuid', 'user-uuid');

      expect(invitationRepository.findPendingByEmailAndOrg).toHaveBeenCalledWith('test@example.com', 'org-uuid');
      expect(invitationRepository.update).toHaveBeenCalledWith('invite-uuid', expect.objectContaining({
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        role: OrgRole.ADMIN,
      }));
      expect(result.rawToken).toBeDefined();
    });

    it('should create a fresh invitation if no duplicate exists', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      invitationRepository.findPendingByEmailAndOrg.mockResolvedValue(null);
      invitationRepository.create.mockResolvedValue({ id: 'fresh-invite-uuid' } as any);

      const result = await service.invite('test@example.com', OrgRole.MEMBER, 'org-uuid', 'user-uuid');

      expect(invitationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        role: OrgRole.MEMBER,
        tokenHash: expect.any(String),
        organizationId: 'org-uuid',
        invitedById: 'user-uuid',
        expiresAt: expect.any(Date),
      }));
      expect(result.rawToken).toBeDefined();
    });
  });

  describe('getInvitationMetadata', () => {
    it('should throw NotFoundException if invitation does not exist/expired', async () => {
      invitationRepository.findActiveByTokenHash.mockResolvedValue(null);
      await expect(service.getInvitationMetadata('dummy')).rejects.toThrow(NotFoundException);
    });

    it('should return metadata if active invitation exists', async () => {
      const mockInvite = {
        organizationId: 'org-uuid',
        email: 'alice@example.com',
        role: OrgRole.MEMBER,
        status: InvitationStatus.PENDING,
      } as any;
      invitationRepository.findActiveByTokenHash.mockResolvedValue(mockInvite);
      organizationRepository.findById.mockResolvedValue({ name: 'Acme' } as any);

      const res = await service.getInvitationMetadata('dummy');
      expect(res).toEqual({
        organization: 'Acme',
        email: 'alice@example.com',
        role: OrgRole.MEMBER,
        status: InvitationStatus.PENDING,
      });
    });
  });

  describe('accept', () => {
    it('should throw ForbiddenException if userEmail does not match invite email', async () => {
      const mockInvite = { email: 'alice@example.com' } as any;
      invitationRepository.findActiveByTokenHash.mockResolvedValue(mockInvite);

      await expect(
        service.accept('token', 'user-uuid', 'wrong@example.com'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle idempotency if already member', async () => {
      const mockInvite = { id: 'invite-uuid', email: 'alice@example.com', organizationId: 'org-uuid', status: InvitationStatus.PENDING } as any;
      invitationRepository.findActiveByTokenHash.mockResolvedValue(mockInvite);
      const mockMember = { id: 'member-uuid' } as any;
      memberRepository.findMembership.mockResolvedValue(mockMember);

      const res = await service.accept('token', 'user-uuid', 'alice@example.com');

      expect(invitationRepository.update).toHaveBeenCalledWith('invite-uuid', expect.objectContaining({
        status: InvitationStatus.ACCEPTED,
      }));
      expect(res).toEqual(mockMember);
    });
  });
});
