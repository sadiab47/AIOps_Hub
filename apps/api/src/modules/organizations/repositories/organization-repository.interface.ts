import { Organization, Prisma, Member, OrganizationSettings } from '@aiops-hub/db';

export const ORGANIZATION_REPOSITORY_TOKEN = 'OrganizationRepositoryInterface';

export interface AuditEvent {
  action: string;
  entityName: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface OrganizationRepositoryInterface {
  createWithMemberAndAudit(
    data: Prisma.OrganizationCreateInput,
    ownerUserId: string,
  ): Promise<Organization>;
  existsBySlug(slug: string): Promise<boolean>;
  existsBySlugExcept(slug: string, orgId: string): Promise<boolean>;
  findById(id: string): Promise<Organization | null>;
  findUserOrganizations(userId: string): Promise<(Organization & { role: string })[]>;
  findOrganizationContext(userId: string, orgId: string): Promise<{
    organization: Organization;
    membership: Member;
    settings: OrganizationSettings | null;
  } | null>;
  updateProfileAndSettings(
    orgId: string,
    orgData: Prisma.OrganizationUpdateInput,
    settingsData: Prisma.OrganizationSettingsUpdateWithoutOrganizationInput,
  ): Promise<{ organization: Organization; settings: OrganizationSettings }>;
}
