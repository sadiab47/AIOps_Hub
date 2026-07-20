import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MembershipGuard } from '../../../common/auth/membership.guard';
import { MEMBER_REPOSITORY_TOKEN, MemberRepositoryInterface } from '../repositories/member-repository.interface';
import { OrgRole } from '@aiops-hub/db';

describe('MembershipGuard', () => {
  let guard: MembershipGuard;
  let memberRepository: jest.Mocked<MemberRepositoryInterface>;

  beforeEach(async () => {
    const mockMemberRepository = {
      findMembership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipGuard,
        {
          provide: MEMBER_REPOSITORY_TOKEN,
          useValue: mockMemberRepository,
        },
      ],
    }).compile();

    guard = module.get<MembershipGuard>(MembershipGuard);
    memberRepository = module.get(MEMBER_REPOSITORY_TOKEN);
  });

  const createMockContext = (contextObj: any): ExecutionContext => {
    const req = {
      context: contextObj,
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

  it('should throw ForbiddenException if context userId or organizationId is missing', async () => {
    const context1 = createMockContext({ userId: 'user-uuid' });
    const context2 = createMockContext({ organizationId: 'org-uuid' });

    await expect(guard.canActivate(context1)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context2)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if membership is not found', async () => {
    const requestContext = { userId: 'user-uuid', organizationId: 'org-uuid' };
    const context = createMockContext(requestContext);
    memberRepository.findMembership.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(memberRepository.findMembership).toHaveBeenCalledWith('user-uuid', 'org-uuid');
  });

  it('should attach organizationRole and return true if membership is found', async () => {
    const requestContext = { userId: 'user-uuid', organizationId: 'org-uuid' };
    const context = createMockContext(requestContext);
    const mockMembership = {
      id: 'member-uuid',
      userId: 'user-uuid',
      organizationId: 'org-uuid',
      role: OrgRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    memberRepository.findMembership.mockResolvedValue(mockMembership);

    const result = await guard.canActivate(context);

    const req = context.switchToHttp().getRequest();
    expect(result).toBe(true);
    expect(req.context).toEqual({
      userId: 'user-uuid',
      organizationId: 'org-uuid',
      organizationRole: OrgRole.ADMIN,
    });
  });
});
