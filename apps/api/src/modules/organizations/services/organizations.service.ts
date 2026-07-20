import { Injectable, Inject, ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY_TOKEN, OrganizationRepositoryInterface, AuditEvent } from '../repositories/organization-repository.interface';
import { MEMBER_REPOSITORY_TOKEN, MemberRepositoryInterface } from '../repositories/member-repository.interface';
import { Organization, OrgRole } from '@aiops-hub/db';
import { RESERVED_SLUGS } from '../../../common/constants/reserved-slugs';

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
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private memberRepository: MemberRepositoryInterface,
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

  async updateProfileAndSettings(
    userId: string,
    orgId: string,
    dto: { profile?: any; settings?: any },
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    // 1. Authorize: User must be OWNER or ADMIN of the organization
    const membership = await this.memberRepository.findMembership(userId, orgId);
    if (!membership || (membership.role !== OrgRole.OWNER && membership.role !== OrgRole.ADMIN)) {
      throw new ForbiddenException('You do not have administrative access to this organization');
    }

    const org = await this.organizationRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const audits: any[] = [];
    const orgUpdateData: any = {};
    const settingsUpdateData: any = {};

    // 2. Process profile if present
    if (dto.profile) {
      await this.updateOrganizationProfile(orgId, dto.profile, org, orgUpdateData, audits, userId, ipAddress, userAgent);
    }

    // 3. Process settings if present
    if (dto.settings) {
      this.updateOrganizationSettings(dto.settings, settingsUpdateData, audits, userId, orgId, ipAddress, userAgent);
    }

    // If no changes, return without transaction to avoid no-op query overhead
    if (Object.keys(orgUpdateData).length === 0 && Object.keys(settingsUpdateData).length === 0) {
      const activeCtx = await this.organizationRepository.findOrganizationContext(userId, orgId);
      return {
        organization: activeCtx?.organization,
        settings: activeCtx?.settings,
      };
    }

    const result = await this.organizationRepository.updateProfileAndSettings(
      orgId,
      orgUpdateData,
      settingsUpdateData,
      audits,
    );

    return result;
  }

  private async updateOrganizationProfile(
    orgId: string,
    profileDto: { name?: string; slug?: string },
    org: Organization,
    orgUpdateData: any,
    audits: any[],
    userId: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    if (profileDto.name !== undefined && profileDto.name !== org.name) {
      orgUpdateData.name = profileDto.name;
      audits.push({
        userId,
        action: 'ORGANIZATION_UPDATED',
        entityName: 'organization',
        entityId: orgId,
        details: { field: 'name', old: org.name, new: profileDto.name },
        ipAddress,
        userAgent,
      });
    }

    if (profileDto.slug !== undefined && profileDto.slug !== org.slug) {
      // Validate Slug Regex
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(profileDto.slug)) {
        throw new BadRequestException('Slug must be lowercase alphanumeric characters and single hyphens only, and cannot start/end with a hyphen');
      }

      // Length Checks
      if (profileDto.slug.length < 3 || profileDto.slug.length > 50) {
        throw new BadRequestException('Slug must be between 3 and 50 characters');
      }

      // Check Reserved List
      if (RESERVED_SLUGS.includes(profileDto.slug)) {
        throw new BadRequestException('This organization slug is reserved');
      }

      // Check Uniqueness
      const exists = await this.organizationRepository.existsBySlugExcept(profileDto.slug, orgId);
      if (exists) {
        throw new ConflictException('This slug is already taken');
      }

      orgUpdateData.slug = profileDto.slug;
      audits.push({
        userId,
        action: 'SLUG_CHANGED',
        entityName: 'organization',
        entityId: orgId,
        details: { old: org.slug, new: profileDto.slug },
        ipAddress,
        userAgent,
      });
    }
  }

  private updateOrganizationSettings(
    settingsDto: any,
    settingsUpdateData: any,
    audits: any[],
    userId: string,
    orgId: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    const fields = [
      'timezone',
      'locale',
      'logoUrl',
      'brandingColor',
      'defaultAiProvider',
      'defaultAiModel',
      'defaultAiTemperature',
      'defaultEmbeddingModel',
      'allowPublicInvitations',
      'retentionDays',
    ];

    let hasSettingChanges = false;
    const changedFields: Record<string, any> = {};

    for (const field of fields) {
      if (settingsDto[field] !== undefined) {
        // Branding color validation
        if (field === 'brandingColor' && settingsDto[field] !== null) {
          const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexRegex.test(settingsDto[field])) {
            throw new BadRequestException('Branding color must be a valid hex color code (e.g. #RGB or #RRGGBB)');
          }
        }

        // Logo URL validation
        if (field === 'logoUrl' && settingsDto[field] !== null) {
          if (!settingsDto[field].startsWith('https://')) {
            throw new BadRequestException('Logo URL must be a secure HTTPS link');
          }
        }

        settingsUpdateData[field] = settingsDto[field];
        changedFields[field] = settingsDto[field];
        hasSettingChanges = true;
      }
    }

    if (hasSettingChanges) {
      audits.push({
        userId,
        action: 'SETTINGS_UPDATED',
        entityName: 'organization_settings',
        entityId: orgId,
        details: changedFields,
        ipAddress,
        userAgent,
      });
    }
  }
}
