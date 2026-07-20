import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { MEMBER_REPOSITORY_TOKEN, MemberRepositoryInterface } from '../../modules/organizations/repositories/member-repository.interface';

@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private memberRepository: MemberRepositoryInterface,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requestContext = request.context;

    if (!requestContext?.userId || !requestContext?.organizationId) {
      throw new ForbiddenException('User session or tenant context is missing');
    }

    const membership = await this.memberRepository.findMembership(
      requestContext.userId,
      requestContext.organizationId,
    );

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    request.context = {
      ...requestContext,
      organizationRole: membership.role,
    };

    return true;
  }
}
