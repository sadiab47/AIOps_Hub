import { CanActivate, ExecutionContext, Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface } from '../../modules/organizations/repositories/organization-repository.interface';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private organizationRepository: OrganizationRepositoryInterface,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.headers['x-organization-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization ID header (x-organization-id) is missing');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof organizationId !== 'string' || !uuidRegex.test(organizationId)) {
      throw new BadRequestException('Invalid Organization ID format');
    }

    const exists = await this.organizationRepository.findById(organizationId);
    if (!exists) {
      throw new NotFoundException('Organization not found');
    }

    request.context = {
      ...request.context,
      organizationId,
    };

    return true;
  }
}
