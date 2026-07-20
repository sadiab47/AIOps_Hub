import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantContextGuard } from '../../../common/auth/tenant-context.guard';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface } from '../repositories/organization-repository.interface';

describe('TenantContextGuard', () => {
  let guard: TenantContextGuard;
  let organizationRepository: jest.Mocked<OrganizationRepositoryInterface>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      createWithMemberAndAudit: jest.fn(),
      existsBySlug: jest.fn(),
      findById: jest.fn(),
      findOrganizationContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextGuard,
        {
          provide: ORGANIZATION_REPOSITORY_TOKEN,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    guard = module.get<TenantContextGuard>(TenantContextGuard);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY_TOKEN);
  });

  const createMockContext = (headers: Record<string, string>, reqProperties: Record<string, any> = {}): ExecutionContext => {
    const req = {
      headers,
      ...reqProperties,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw BadRequestException if header x-organization-id is missing', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if header x-organization-id is not a valid UUID', async () => {
    const context = createMockContext({ 'x-organization-id': 'invalid-uuid' });
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if organization is not found in database', async () => {
    const validUuid = '12345678-1234-1234-1234-1234567890ab';
    organizationRepository.findById.mockResolvedValue(null);
    const context = createMockContext({ 'x-organization-id': validUuid });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    expect(organizationRepository.findById).toHaveBeenCalledWith(validUuid);
  });

  it('should set request.context.organizationId and return true if organization exists', async () => {
    const validUuid = '12345678-1234-1234-1234-1234567890ab';
    organizationRepository.findById.mockResolvedValue({ id: validUuid, name: 'Acme', slug: 'acme' } as any);
    const reqProps = { context: {} };
    const context = createMockContext({ 'x-organization-id': validUuid }, reqProps);

    const result = await guard.canActivate(context);

    const req = context.switchToHttp().getRequest();
    expect(result).toBe(true);
    expect(req.context).toEqual({
      organizationId: validUuid,
      organizationName: 'Acme',
      organizationSlug: 'acme',
      organizationRole: undefined,
      organizationSettings: null,
      permissions: [],
    });
  });
});
