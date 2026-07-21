import { MemberPolicy } from '../policies/member.policy';
import { InvitationPolicy } from '../policies/invitation.policy';
import { OrganizationPolicy } from '../policies/organization.policy';
import { RequestContext } from '../../auth/request-context.interface';
import { OrgRole } from '@aiops-hub/db';

describe('Pure Resource Authorization Policies (RBAC-002)', () => {
  const mockOwnerCtx: RequestContext = {
    userId: 'owner-user-id',
    organizationId: 'org-1',
    organizationRole: OrgRole.OWNER,
    permissions: ['*'],
  };

  const mockAdminCtx: RequestContext = {
    userId: 'admin-user-id',
    organizationId: 'org-1',
    organizationRole: OrgRole.ADMIN,
    permissions: ['member:update', 'member:remove'],
  };

  const mockManagerCtx: RequestContext = {
    userId: 'manager-user-id',
    organizationId: 'org-1',
    organizationRole: OrgRole.MANAGER,
    permissions: ['member:list'],
  };

  describe('MemberPolicy', () => {
    const memberTarget = {
      id: 'member-1',
      userId: 'target-user-id',
      organizationId: 'org-1',
      role: OrgRole.MEMBER,
    };

    const adminTarget = {
      id: 'admin-1',
      userId: 'other-admin-id',
      organizationId: 'org-1',
      role: OrgRole.ADMIN,
    };

    const outOfTenantMember = {
      id: 'member-99',
      userId: 'target-user-id',
      organizationId: 'other-org',
      role: OrgRole.MEMBER,
    };

    it('denies access with NOT_FOUND if member does not exist or belongs to another tenant', () => {
      const result = MemberPolicy.canManageMember(mockOwnerCtx, null);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('NOT_FOUND');

      const outOfTenantResult = MemberPolicy.canManageMember(mockOwnerCtx, outOfTenantMember);
      expect(outOfTenantResult.allowed).toBe(false);
      expect(outOfTenantResult.code).toBe('NOT_FOUND');
    });

    it('denies self-action with SELF_ACTION code', () => {
      const selfMember = { ...memberTarget, userId: 'owner-user-id' };
      const result = MemberPolicy.canManageMember(mockOwnerCtx, selfMember);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('SELF_ACTION');
    });

    it('allows OWNER to manage any member (including ADMINs)', () => {
      const result = MemberPolicy.canManageMember(mockOwnerCtx, adminTarget);
      expect(result.allowed).toBe(true);
    });

    it('denies ADMIN from managing another ADMIN or OWNER', () => {
      const result = MemberPolicy.canManageMember(mockAdminCtx, adminTarget);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ROLE_HIERARCHY_VIOLATION');
    });

    it('allows ADMIN to manage a MEMBER or VIEWER', () => {
      const result = MemberPolicy.canManageMember(mockAdminCtx, memberTarget);
      expect(result.allowed).toBe(true);
    });

    it('denies assigning OWNER role via role change policy', () => {
      const result = MemberPolicy.canManageMember(mockOwnerCtx, memberTarget, OrgRole.OWNER);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('INVALID_ROLE');
    });

    it('validates ownership transfer policy correctly', () => {
      const nonOwnerResult = MemberPolicy.canTransferOwnership(mockAdminCtx, memberTarget);
      expect(nonOwnerResult.allowed).toBe(false);
      expect(nonOwnerResult.code).toBe('ROLE_HIERARCHY_VIOLATION');

      const selfResult = MemberPolicy.canTransferOwnership(mockOwnerCtx, { ...memberTarget, userId: 'owner-user-id' });
      expect(selfResult.allowed).toBe(false);
      expect(selfResult.code).toBe('SELF_ACTION');

      const validResult = MemberPolicy.canTransferOwnership(mockOwnerCtx, memberTarget);
      expect(validResult.allowed).toBe(true);
    });
  });

  describe('InvitationPolicy', () => {
    const inviteResource = {
      id: 'invite-1',
      organizationId: 'org-1',
      status: 'PENDING',
    };

    it('allows managing invitation in same tenant context', () => {
      const result = InvitationPolicy.canManageInvitation(mockAdminCtx, inviteResource);
      expect(result.allowed).toBe(true);
    });

    it('denies managing invitation from another tenant with NOT_FOUND', () => {
      const outOfTenantInvite = { ...inviteResource, organizationId: 'other-org' };
      const result = InvitationPolicy.canManageInvitation(mockAdminCtx, outOfTenantInvite);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
    });
  });

  describe('OrganizationPolicy', () => {
    it('allows updating settings for active tenant context', () => {
      const result = OrganizationPolicy.canUpdateSettings(mockOwnerCtx, 'org-1');
      expect(result.allowed).toBe(true);
    });

    it('denies updating settings for different organization ID', () => {
      const result = OrganizationPolicy.canUpdateSettings(mockOwnerCtx, 'other-org');
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('TENANT_MISMATCH');
    });
  });
});
