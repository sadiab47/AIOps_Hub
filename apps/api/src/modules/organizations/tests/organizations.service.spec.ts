import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from '../services/organizations.service';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface } from '../repositories/organization-repository.interface';
import { Organization } from '@aiops-hub/db';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<OrganizationRepositoryInterface>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      createWithMemberAndAudit: jest.fn(),
      existsBySlug: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: ORGANIZATION_REPOSITORY_TOKEN,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY_TOKEN);
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
        expect.objectContaining({
          action: 'ORGANIZATION_CREATE',
          entityName: 'organization',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla',
        }),
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
        expect.any(Object),
      );
      expect(result).toEqual(mockOrg);
    });
  });
});
