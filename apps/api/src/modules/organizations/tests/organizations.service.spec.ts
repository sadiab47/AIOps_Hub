import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { OrganizationsService } from '../services/organizations.service';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface } from '../repositories/organization-repository.interface';
import { MEMBER_REPOSITORY_TOKEN, MemberRepositoryInterface } from '../repositories/member-repository.interface';
import { EventBusService } from '../../../common/events/event-bus.service';
import { Organization, OrgRole } from '@aiops-hub/db';
import { getPermissionsForRole } from '../../../common/constants/role-permission-matrix';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<OrganizationRepositoryInterface>;
  let memberRepository: jest.Mocked<MemberRepositoryInterface>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      createWithMemberAndAudit: jest.fn(),
      existsBySlug: jest.fn(),
      existsBySlugExcept: jest.fn(),
      findById: jest.fn(),
      findUserOrganizations: jest.fn(),
      findOrganizationContext: jest.fn(),
      updateProfileAndSettings: jest.fn(),
    };

    const mockMemberRepository = {
      findMembership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: ORGANIZATION_REPOSITORY_TOKEN,
          useValue: mockOrganizationRepository,
        },
        {
          provide: MEMBER_REPOSITORY_TOKEN,
          useValue: mockMemberRepository,
        },
        {
          provide: EventBusService,
          useValue: { publish: jest.fn(), publishMany: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY_TOKEN);
    memberRepository = module.get(MEMBER_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should generate a unique slug and call repository transaction', async () => {
      organizationRepository.existsBySlug.mockResolvedValue(false);
      const mockOrg: Organization = {
        id: 'mock-org-uuid',
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      organizationRepository.createWithMemberAndAudit.mockResolvedValue(mockOrg);

      const result = await service.create('Acme Corp', 'user-uuid', '127.0.0.1', 'Mozilla');

      expect(organizationRepository.existsBySlug).toHaveBeenCalledWith('acme-corp');
      expect(organizationRepository.createWithMemberAndAudit).toHaveBeenCalledWith(
        { name: 'Acme Corp', slug: 'acme-corp' },
        'user-uuid',
      );
      expect(result).toEqual(mockOrg);
    });

    it('should sequentially suffix the slug if it already exists', async () => {
      // First slug check returns true (exists), second check returns true (exists), third returns false
      organizationRepository.existsBySlug
        .mockResolvedValueOnce(true)  // acme exists
        .mockResolvedValueOnce(true)  // acme-2 exists
        .mockResolvedValueOnce(false); // acme-3 is free

      const mockOrg: Organization = {
        id: 'mock-org-uuid',
        name: 'Acme',
        slug: 'acme-3',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      organizationRepository.createWithMemberAndAudit.mockResolvedValue(mockOrg);

      const result = await service.create('Acme', 'user-uuid', '127.0.0.1', 'Mozilla');

      expect(organizationRepository.existsBySlug).toHaveBeenCalledTimes(3);
      expect(organizationRepository.existsBySlug).toHaveBeenNthCalledWith(1, 'acme');
      expect(organizationRepository.existsBySlug).toHaveBeenNthCalledWith(2, 'acme-2');
      expect(organizationRepository.existsBySlug).toHaveBeenNthCalledWith(3, 'acme-3');
      expect(organizationRepository.createWithMemberAndAudit).toHaveBeenCalledWith(
        { name: 'Acme', slug: 'acme-3' },
        'user-uuid',
      );
      expect(result).toEqual(mockOrg);
    });
  });

  describe('listUserOrganizations', () => {
    it('should retrieve organizations list with roles from repository', async () => {
      const mockList = [{ id: 'org-1', name: 'Org 1', slug: 'org-1', role: 'MEMBER' }] as any;
      organizationRepository.findUserOrganizations.mockResolvedValue(mockList);

      const result = await service.listUserOrganizations('user-uuid');

      expect(organizationRepository.findUserOrganizations).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual(mockList);
    });
  });

  describe('switchOrganization', () => {
    it('should throw ForbiddenException if user has no membership in organization', async () => {
      organizationRepository.findOrganizationContext.mockResolvedValue(null);
      await expect(service.switchOrganization('user-uuid', 'org-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should return context schema if membership is valid', async () => {
      const mockContext = {
        organization: { id: 'org-uuid', name: 'Acme', slug: 'acme' },
        membership: { role: 'ADMIN' },
        settings: { timezone: 'EST', locale: 'en' },
      } as any;
      organizationRepository.findOrganizationContext.mockResolvedValue(mockContext);

      const result = await service.switchOrganization('user-uuid', 'org-uuid');
      expect(organizationRepository.findOrganizationContext).toHaveBeenCalledWith('user-uuid', 'org-uuid');
      expect(result).toEqual({
        id: 'org-uuid',
        name: 'Acme',
        slug: 'acme',
        role: 'ADMIN',
        permissions: getPermissionsForRole(OrgRole.ADMIN),
        settings: {
          timezone: 'EST',
          locale: 'en',
        },
      });
    });
  });

  describe('updateProfileAndSettings', () => {
    beforeEach(() => {
      memberRepository.findMembership.mockResolvedValue({ role: OrgRole.OWNER } as any);
      organizationRepository.findById.mockResolvedValue({ id: 'org-uuid', name: 'Acme', slug: 'acme' } as any);
    });

    it('should throw ForbiddenException if user lacks administrative access', async () => {
      memberRepository.findMembership.mockResolvedValue({ role: OrgRole.MEMBER } as any);
      await expect(
        service.updateProfileAndSettings('user-uuid', 'org-uuid', { profile: { name: 'New Name' } }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if slug is a reserved word', async () => {
      await expect(
        service.updateProfileAndSettings('user-uuid', 'org-uuid', { profile: { slug: 'admin' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if slug regex fails', async () => {
      await expect(
        service.updateProfileAndSettings('user-uuid', 'org-uuid', { profile: { slug: 'Invalid-Slug' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if slug is already taken by another org', async () => {
      organizationRepository.existsBySlugExcept.mockResolvedValue(true);
      await expect(
        service.updateProfileAndSettings('user-uuid', 'org-uuid', { profile: { slug: 'taken-slug' } }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if brandingColor is not hex', async () => {
      await expect(
        service.updateProfileAndSettings('user-uuid', 'org-uuid', { settings: { brandingColor: 'red' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if logoUrl is not HTTPS', async () => {
      await expect(
        service.updateProfileAndSettings('user-uuid', 'org-uuid', { settings: { logoUrl: 'http://logo.png' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should invoke transaction and publish domain events on valid updates', async () => {
      organizationRepository.existsBySlugExcept.mockResolvedValue(false);
      organizationRepository.updateProfileAndSettings.mockResolvedValue({ success: true } as any);

      const payload = {
        profile: { name: 'Acme Corp', slug: 'acme-corp' },
        settings: { brandingColor: '#1E40AF', logoUrl: 'https://acme.org/logo.png' },
      };

      await service.updateProfileAndSettings('user-uuid', 'org-uuid', payload, '127.0.0.1', 'UA');

      expect(organizationRepository.updateProfileAndSettings).toHaveBeenCalledWith(
        'org-uuid',
        { name: 'Acme Corp', slug: 'acme-corp' },
        { brandingColor: '#1E40AF', logoUrl: 'https://acme.org/logo.png' },
      );
    });
  });
});
