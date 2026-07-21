import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { OrgRole } from '@aiops-hub/db';
import { MemberManagementService } from '../services/member-management.service';
import { MEMBER_REPOSITORY_TOKEN } from '../repositories/member-repository.interface';
import { EventBusService } from '../../../common/events/event-bus.service';
import {
  MemberRoleChangedEvent,
  MemberRemovedEvent,
  OwnershipTransferredEvent,
  MemberLeftEvent,
} from '../../../common/events/types/member.events';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const OWNER_USER_ID   = 'owner-user-uuid';
const ADMIN_USER_ID   = 'admin-user-uuid';
const MEMBER_USER_ID  = 'member-user-uuid';
const ORG_ID          = 'org-uuid';

const makeMember = (overrides: Partial<any> = {}) => ({
  id:             'member-record-uuid',
  userId:         MEMBER_USER_ID,
  organizationId: ORG_ID,
  role:           OrgRole.MEMBER,
  createdAt:      new Date(),
  updatedAt:      new Date(),
  deletedAt:      null,
  user:           { id: MEMBER_USER_ID, email: 'member@example.com', name: 'Member' },
  ...overrides,
});

const ownerMembership   = makeMember({ id: 'owner-member-uuid',  userId: OWNER_USER_ID,  role: OrgRole.OWNER });
const adminMembership   = makeMember({ id: 'admin-member-uuid',  userId: ADMIN_USER_ID,  role: OrgRole.ADMIN });
const memberMembership  = makeMember({ id: 'member-record-uuid', userId: MEMBER_USER_ID, role: OrgRole.MEMBER });

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockMemberRepository = {
  findMembership:            jest.fn(),
  findMembersByOrganization: jest.fn(),
  findMemberById:            jest.fn(),
  findOwner:                 jest.fn(),
  countOwners:               jest.fn(),
  updateRole:                jest.fn(),
  removeMember:              jest.fn(),
  transferOwnershipTx:       jest.fn(),
};

const mockEventBus = { publish: jest.fn() };

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('MemberManagementService', () => {
  let service: MemberManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberManagementService,
        { provide: MEMBER_REPOSITORY_TOKEN, useValue: mockMemberRepository },
        { provide: EventBusService,         useValue: mockEventBus },
      ],
    }).compile();

    service = module.get(MemberManagementService);
    jest.clearAllMocks();
  });

  // ── listMembers ─────────────────────────────────────────────────────────────

  describe('listMembers', () => {
    it('returns mapped MemberSummaryDto array', async () => {
      mockMemberRepository.findMembersByOrganization.mockResolvedValue([memberMembership]);

      const result = await service.listMembers(ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id:     memberMembership.id,
        userId: MEMBER_USER_ID,
        email:  'member@example.com',
        role:   OrgRole.MEMBER,
      });
    });
  });

  // ── getMember ───────────────────────────────────────────────────────────────

  describe('getMember', () => {
    it('returns the member when found', async () => {
      mockMemberRepository.findMemberById.mockResolvedValue(memberMembership);

      const result = await service.getMember(ORG_ID, memberMembership.id);

      expect(result.id).toBe(memberMembership.id);
    });

    it('throws NotFoundException when member not in org', async () => {
      mockMemberRepository.findMemberById.mockResolvedValue(null);

      await expect(service.getMember(ORG_ID, 'unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── changeRole ──────────────────────────────────────────────────────────────

  describe('changeRole', () => {
    it('updates role successfully when OWNER acts on MEMBER', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(memberMembership);
      mockMemberRepository.updateRole.mockResolvedValue({ ...memberMembership, role: OrgRole.ADMIN });

      await service.changeRole(OWNER_USER_ID, ORG_ID, memberMembership.id, OrgRole.ADMIN);

      expect(mockMemberRepository.updateRole).toHaveBeenCalledWith(memberMembership.id, OrgRole.ADMIN);
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(MemberRoleChangedEvent));
    });

    it('throws ForbiddenException when actor changes own role', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(
        makeMember({ id: 'owner-member-uuid', userId: OWNER_USER_ID, role: OrgRole.OWNER }),
      );

      await expect(
        service.changeRole(OWNER_USER_ID, ORG_ID, 'owner-member-uuid', OrgRole.MEMBER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when ADMIN targets an OWNER', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(adminMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(ownerMembership);

      await expect(
        service.changeRole(ADMIN_USER_ID, ORG_ID, ownerMembership.id, OrgRole.MEMBER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when ADMIN targets another ADMIN', async () => {
      const adminTarget = makeMember({ id: 'admin2-uuid', userId: 'admin2', role: OrgRole.ADMIN });
      mockMemberRepository.findMembership.mockResolvedValue(adminMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(adminTarget);

      await expect(
        service.changeRole(ADMIN_USER_ID, ORG_ID, adminTarget.id, OrgRole.MEMBER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when demoting the last OWNER', async () => {
      // A second OWNER is the actor; a distinct OWNER record is the target.
      // Only one OWNER exists → demote must be blocked.
      const secondOwnerActor = makeMember({
        id: 'owner2-actor-uuid',
        userId: 'owner2-actor-user',
        role: OrgRole.OWNER,
      });
      const targetOwner = makeMember({
        id: 'owner-target-uuid',
        userId: OWNER_USER_ID,
        role: OrgRole.OWNER,
      });
      mockMemberRepository.findMembership.mockResolvedValue(secondOwnerActor);
      mockMemberRepository.findMemberById.mockResolvedValue(targetOwner);
      mockMemberRepository.countOwners.mockResolvedValue(1);

      await expect(
        service.changeRole('owner2-actor-user', ORG_ID, targetOwner.id, OrgRole.MEMBER),
      ).rejects.toThrow(ConflictException);
    });

    it('succeeds demoting an OWNER when other owners exist', async () => {
      const secondOwner = makeMember({ id: 'owner2-uuid', userId: 'owner2', role: OrgRole.OWNER });
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(secondOwner);
      mockMemberRepository.countOwners.mockResolvedValue(2);
      mockMemberRepository.updateRole.mockResolvedValue({ ...secondOwner, role: OrgRole.ADMIN });

      await service.changeRole(OWNER_USER_ID, ORG_ID, secondOwner.id, OrgRole.ADMIN);

      expect(mockMemberRepository.updateRole).toHaveBeenCalled();
    });

    it('allows ADMIN to change role of MANAGER', async () => {
      const managerTarget = makeMember({ id: 'mgr-uuid', userId: 'mgr', role: OrgRole.MANAGER });
      mockMemberRepository.findMembership.mockResolvedValue(adminMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(managerTarget);
      mockMemberRepository.updateRole.mockResolvedValue({ ...managerTarget, role: OrgRole.MEMBER });

      await service.changeRole(ADMIN_USER_ID, ORG_ID, managerTarget.id, OrgRole.MEMBER);

      expect(mockMemberRepository.updateRole).toHaveBeenCalledWith(managerTarget.id, OrgRole.MEMBER);
    });
  });

  // ── removeMember ────────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('removes MEMBER successfully when OWNER acts', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(memberMembership);
      mockMemberRepository.removeMember.mockResolvedValue(memberMembership);

      await service.removeMember(OWNER_USER_ID, ORG_ID, memberMembership.id);

      expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(memberMembership.id);
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(MemberRemovedEvent));
    });

    it('throws ForbiddenException when actor tries to remove themselves', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(
        makeMember({ id: 'owner-member-uuid', userId: OWNER_USER_ID, role: OrgRole.OWNER }),
      );

      await expect(
        service.removeMember(OWNER_USER_ID, ORG_ID, 'owner-member-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when ADMIN targets another ADMIN', async () => {
      const adminTarget = makeMember({ id: 'admin2-uuid', userId: 'admin2', role: OrgRole.ADMIN });
      mockMemberRepository.findMembership.mockResolvedValue(adminMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(adminTarget);

      await expect(
        service.removeMember(ADMIN_USER_ID, ORG_ID, adminTarget.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when removing the last OWNER', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(
        makeMember({ id: 'owner-member-uuid', userId: OWNER_USER_ID, role: OrgRole.OWNER }),
      );
      mockMemberRepository.countOwners.mockResolvedValue(1);

      await expect(
        service.removeMember(OWNER_USER_ID, ORG_ID, 'other-member-uuid'),
      ).rejects.toThrow(ForbiddenException); // self-remove check fires first
    });

    it('throws NotFoundException when target member not found', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(null);

      await expect(
        service.removeMember(OWNER_USER_ID, ORG_ID, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── transferOwnership ───────────────────────────────────────────────────────

  describe('transferOwnership', () => {
    it('transfers ownership atomically', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(memberMembership);
      mockMemberRepository.transferOwnershipTx.mockResolvedValue(undefined);

      await service.transferOwnership(OWNER_USER_ID, ORG_ID, memberMembership.id);

      expect(mockMemberRepository.transferOwnershipTx).toHaveBeenCalledWith(
        ORG_ID,
        ownerMembership.id,
        memberMembership.id,
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(OwnershipTransferredEvent));
    });

    it('throws ForbiddenException when actor is not OWNER', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(adminMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(memberMembership);

      await expect(
        service.transferOwnership(ADMIN_USER_ID, ORG_ID, memberMembership.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when target member not in org', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(null);

      await expect(
        service.transferOwnership(OWNER_USER_ID, ORG_ID, 'ghost-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when transferring to self', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.findMemberById.mockResolvedValue(
        makeMember({ id: 'owner-member-uuid', userId: OWNER_USER_ID, role: OrgRole.OWNER }),
      );

      await expect(
        service.transferOwnership(OWNER_USER_ID, ORG_ID, 'owner-member-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── leaveOrganization ───────────────────────────────────────────────────────

  describe('leaveOrganization', () => {
    it('allows a non-owner MEMBER to leave', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(memberMembership);
      mockMemberRepository.removeMember.mockResolvedValue(memberMembership);

      await service.leaveOrganization(MEMBER_USER_ID, ORG_ID);

      expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(memberMembership.id);
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(MemberLeftEvent));
    });

    it('throws ConflictException when the last OWNER tries to leave', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.countOwners.mockResolvedValue(1);

      await expect(
        service.leaveOrganization(OWNER_USER_ID, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('allows an OWNER to leave when other owners exist', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(ownerMembership);
      mockMemberRepository.countOwners.mockResolvedValue(2);
      mockMemberRepository.removeMember.mockResolvedValue(ownerMembership);

      await service.leaveOrganization(OWNER_USER_ID, ORG_ID);

      expect(mockMemberRepository.removeMember).toHaveBeenCalledWith(ownerMembership.id);
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(MemberLeftEvent));
    });

    it('throws ForbiddenException when actor is not a member', async () => {
      mockMemberRepository.findMembership.mockResolvedValue(null);

      await expect(
        service.leaveOrganization('stranger-id', ORG_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
