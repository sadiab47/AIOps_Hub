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

    const userId = request.context?.userId;
    let organization;
    let membership = null;
    let settings = null;

    if (userId) {
      const contextResult = await this.organizationRepository.findOrganizationContext(userId, organizationId);
      if (contextResult) {
        organization = contextResult.organization;
        membership = contextResult.membership;
        settings = contextResult.settings;
      } else {
        const org = await this.organizationRepository.findById(organizationId);
        if (!org) {
          throw new NotFoundException('Organization not found');
        }
        organization = org;
      }
    } else {
      const org = await this.organizationRepository.findById(organizationId);
      if (!org) {
        throw new NotFoundException('Organization not found');
      }
      organization = org;
    }

    request.context = {
      ...request.context,
      organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationRole: membership?.role,
      organizationSettings: settings ? {
        timezone: settings.timezone,
        locale: settings.locale,
      } : null,
    };

    return true;
  }
}
