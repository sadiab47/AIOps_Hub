import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface, AuditEvent } from '../repositories/organization-repository.interface';
import { Organization } from '@aiops-hub/db';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY_TOKEN)
    private organizationRepository: OrganizationRepositoryInterface,
  ) {}

  async create(
    name: string,
    userId: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<Organization> {
    const baseSlug = slugify(name) || 'org';
    let slug = baseSlug;
    let suffix = 2;

    while (await this.organizationRepository.existsBySlug(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const audit: AuditEvent = {
      action: 'ORGANIZATION_CREATE',
      entityName: 'organization',
      ipAddress,
      userAgent,
      details: { name, slug },
    };

    return this.organizationRepository.createWithMemberAndAudit(
      { name, slug },
      userId,
      audit,
    );
  }

  async listUserOrganizations(userId: string) {
    return this.organizationRepository.findUserOrganizations(userId);
  }

  async switchOrganization(userId: string, orgId: string) {
    const context = await this.organizationRepository.findOrganizationContext(userId, orgId);

    if (!context) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // TODO: Switch safety checks
    // 1. Check if organization is archived
    // if (context.organization.status === 'ARCHIVED') throw new ForbiddenException('Organization is archived');
    // 2. Check if organization is deleted
    // if (context.organization.deletedAt) throw new ForbiddenException('Organization has been deleted');

    return {
      id: context.organization.id,
      name: context.organization.name,
      slug: context.organization.slug,
      role: context.membership.role,
      permissions: [],
      settings: context.settings ? {
        timezone: context.settings.timezone,
        locale: context.settings.locale,
      } : {
        timezone: 'UTC',
        locale: 'en',
      },
    };
  }
}
