import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { OrgRole } from '@aiops-hub/db';

import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';

jest.setTimeout(45000);

describe('Members Integration Tests (ORG-005)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Owner (creator)
  let ownerEmail: string;
  let ownerCookies: string[];
  let ownerUserId: string;

  // Second user (invited member)
  let memberEmail: string;
  let memberCookies: string[];
  let memberUserId: string;

  let orgId: string;
  let memberMemberId: string;

  /**
   * Accept an invitation using the full token from inviteLink.
   * Pattern: POST /api/v1/invitations/:rawToken/accept
   */
  const acceptInvitation = (rawToken: string, cookies: string[]) =>
    request(app.getHttpServer())
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set('Cookie', cookies)
      .expect(201);

  /**
   * Invite a user and return the raw token extracted from inviteLink.
   */
  const sendInvite = async (
    ownerCookies: string[],
    email: string,
    role: OrgRole,
  ): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({ email, role })
      .expect(201);
    return res.body.data.inviteLink.split('token=')[1] as string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const ts = Date.now();
    ownerEmail  = `member-owner-${ts}@example.com`;
    memberEmail = `member-user-${ts}@example.com`;

    // 1. Register owner
    const ownerReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Password123!', name: 'Owner' })
      .expect(201);
    ownerCookies = ownerReg.headers['set-cookie'] as unknown as string[];
    const ownerUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    ownerUserId = ownerUser!.id;

    // 2. Register second user
    const memberReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: memberEmail, password: 'Password123!', name: 'Regular Member' })
      .expect(201);
    memberCookies = memberReg.headers['set-cookie'] as unknown as string[];
    const memberUser = await prisma.user.findUnique({ where: { email: memberEmail } });
    memberUserId = memberUser!.id;

    // 3. Owner creates an organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'Members Test Org' })
      .expect(201);
    orgId = orgRes.body.data.id;

    // 4. Invite + accept second user
    const rawToken = await sendInvite(ownerCookies, memberEmail, OrgRole.MEMBER);
    await acceptInvitation(rawToken, memberCookies);

    // Resolve member record for the second user
    const membership = await prisma.member.findFirst({
      where: { userId: memberUserId, organizationId: orgId, deletedAt: null },
    });
    memberMemberId = membership!.id;
  });

  afterAll(async () => {
    if (prisma) {
      if (orgId) {
        await prisma.invitation.deleteMany({ where: { organizationId: orgId } });
        await prisma.auditLog.deleteMany({ where: { entityId: orgId } });
        await prisma.member.deleteMany({ where: { organizationId: orgId } });
        await prisma.organization.deleteMany({ where: { id: orgId } });
      }
      const userIds = [ownerUserId, memberUserId].filter(Boolean);
      for (const uid of userIds) {
        await prisma.auditLog.deleteMany({ where: { userId: uid } });
        await prisma.refreshToken.deleteMany({ where: { userId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      }
    }
    await app.close();
  });

  // ── GET /members ──────────────────────────────────────────────────────────

  describe('GET /organizations/members', () => {
    it('returns all active members to any org member', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/organizations/members')
        .set('Cookie', memberCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const roles = res.body.data.map((m: any) => m.role);
      expect(roles).toContain(OrgRole.OWNER);
      expect(roles).toContain(OrgRole.MEMBER);
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organizations/members')
        .set('x-organization-id', orgId)
        .expect(401);
    });
  });

  // ── GET /members/:memberId ────────────────────────────────────────────────

  describe('GET /organizations/members/:memberId', () => {
    it('returns a single member by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/members/${memberMemberId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(memberMemberId);
      expect(res.body.data.role).toBe(OrgRole.MEMBER);
      expect(res.body.data.email).toBe(memberEmail);
    });

    it('returns 404 for non-existent member ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organizations/members/00000000-0000-0000-0000-000000000000')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(404);
    });

    it('returns 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organizations/members/not-a-uuid')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(400);
    });
  });

  // ── PATCH /members/:memberId ─────────────────────────────────────────────

  describe('PATCH /organizations/members/:memberId', () => {
    it('allows OWNER to promote MEMBER to ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/members/${memberMemberId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({ role: OrgRole.ADMIN })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(OrgRole.ADMIN);

      // Reset back to MEMBER for subsequent tests
      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/members/${memberMemberId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({ role: OrgRole.MEMBER })
        .expect(200);
    });

    it('returns 400 when attempting to assign OWNER via PATCH', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/members/${memberMemberId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({ role: OrgRole.OWNER })
        .expect(400);
    });

    it('returns 403 when MANAGER attempts role change (lacks member:update permission)', async () => {
      // Invite & setup a manager user
      const managerEmail = `manager-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: managerEmail, password: 'Password123!', name: 'Manager User' });
      const managerUser = await prisma.user.findUnique({ where: { email: managerEmail } });
      const mgrLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: managerEmail, password: 'Password123!' });
      const mgrCookies = mgrLogin.headers['set-cookie'] as unknown as string[];

      const rawToken = await sendInvite(ownerCookies, managerEmail, OrgRole.MANAGER);
      await acceptInvitation(rawToken, mgrCookies);

      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/members/${memberMemberId}`)
        .set('Cookie', mgrCookies)
        .set('x-organization-id', orgId)
        .send({ role: OrgRole.VIEWER })
        .expect(403);

      if (managerUser) {
        await prisma.auditLog.deleteMany({ where: { userId: managerUser.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: managerUser.id } });
        await prisma.member.deleteMany({ where: { userId: managerUser.id } });
        await prisma.user.deleteMany({ where: { id: managerUser.id } });
      }
    });

    it('returns 403 when non-OWNER/ADMIN attempts role change', async () => {
      const ownerMember = await prisma.member.findFirst({
        where: { userId: ownerUserId, organizationId: orgId, deletedAt: null },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/members/${ownerMember!.id}`)
        .set('Cookie', memberCookies)
        .set('x-organization-id', orgId)
        .send({ role: OrgRole.MEMBER })
        .expect(403);
    });

    it('returns 403 when OWNER attempts self-demotion via PATCH (use transfer-owner instead)', async () => {
      const ownerMember = await prisma.member.findFirst({
        where: { userId: ownerUserId, organizationId: orgId, deletedAt: null },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/members/${ownerMember!.id}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({ role: OrgRole.ADMIN })
        .expect(403);
    });
  });

  // ── DELETE /members/:memberId ─────────────────────────────────────────────

  describe('DELETE /organizations/members/:memberId', () => {
    it('returns 403 when OWNER tries to remove themselves (use /leave instead)', async () => {
      const ownerMember = await prisma.member.findFirst({
        where: { userId: ownerUserId, organizationId: orgId, deletedAt: null },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/members/${ownerMember!.id}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(403);
    });

    it('returns 403 when MEMBER attempts to remove another member', async () => {
      const ownerMember = await prisma.member.findFirst({
        where: { userId: ownerUserId, organizationId: orgId, deletedAt: null },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/members/${ownerMember!.id}`)
        .set('Cookie', memberCookies)
        .set('x-organization-id', orgId)
        .expect(403);
    });

    it('allows OWNER to remove a MEMBER and verifies audit log', async () => {
      // Invite a throwaway user to remove
      const throwawayEmail = `throwaway-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: throwawayEmail, password: 'Password123!', name: 'Throwaway' });
      const throwawayUser = await prisma.user.findUnique({ where: { email: throwawayEmail } });

      const throwawayLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: throwawayEmail, password: 'Password123!' });
      const throwawayCookies = throwawayLogin.headers['set-cookie'] as unknown as string[];

      const rawToken = await sendInvite(ownerCookies, throwawayEmail, OrgRole.MEMBER);
      await acceptInvitation(rawToken, throwawayCookies);

      const throwawayMember = await prisma.member.findFirst({
        where: { userId: throwawayUser!.id, organizationId: orgId, deletedAt: null },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/members/${throwawayMember!.id}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      // Verify soft-delete
      const deleted = await prisma.member.findUnique({ where: { id: throwawayMember!.id } });
      expect(deleted?.deletedAt).not.toBeNull();

      // Allow async event listeners to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify audit log
      const audits = await prisma.auditLog.findMany({
        where: { entityId: throwawayMember!.id },
      });
      expect(audits.map((a) => a.action)).toContain('MEMBER_REMOVED');

      // Cleanup throwaway user
      if (throwawayUser) {
        await prisma.auditLog.deleteMany({ where: { userId: throwawayUser.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: throwawayUser.id } });
        await prisma.user.deleteMany({ where: { id: throwawayUser.id } });
      }
    });
  });

  // ── POST /members/:memberId/transfer-owner ────────────────────────────────

  describe('POST /organizations/members/:memberId/transfer-owner', () => {
    it('atomically transfers ownership and records audit log', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/members/${memberMemberId}/transfer-owner`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      // Verify roles flipped in DB
      const [ownerAfter, memberAfter] = await Promise.all([
        prisma.member.findFirst({ where: { userId: ownerUserId,  organizationId: orgId, deletedAt: null } }),
        prisma.member.findFirst({ where: { userId: memberUserId, organizationId: orgId, deletedAt: null } }),
      ]);
      expect(ownerAfter?.role).toBe(OrgRole.MEMBER);
      expect(memberAfter?.role).toBe(OrgRole.OWNER);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const audits = await prisma.auditLog.findMany({ where: { entityId: orgId } });
      expect(audits.map((a) => a.action)).toContain('OWNERSHIP_TRANSFERRED');

      // Transfer ownership back so subsequent tests have the original OWNER
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/members/${ownerAfter!.id}/transfer-owner`)
        .set('Cookie', memberCookies)
        .set('x-organization-id', orgId)
        .expect(200);
    });

    it('returns 403 when non-OWNER attempts transfer', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/members/${memberMemberId}/transfer-owner`)
        .set('Cookie', memberCookies)
        .set('x-organization-id', orgId)
        .expect(403);
    });

    it('returns 404 when target member does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organizations/members/00000000-0000-0000-0000-000000000000/transfer-owner')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(404);
    });
  });

  // ── POST /members/leave ───────────────────────────────────────────────────

  describe('POST /organizations/leave', () => {
    it('returns 409 when the last OWNER tries to leave', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organizations/members/leave')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(409);
    });

    it('allows a MEMBER to leave the organization', async () => {
      const leaveEmail = `leaver-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: leaveEmail, password: 'Password123!', name: 'Leaver' });
      const leaverUser = await prisma.user.findUnique({ where: { email: leaveEmail } });

      const leaverLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: leaveEmail, password: 'Password123!' });
      const leaverCookies = leaverLogin.headers['set-cookie'] as unknown as string[];

      const rawToken = await sendInvite(ownerCookies, leaveEmail, OrgRole.MEMBER);
      await acceptInvitation(rawToken, leaverCookies);

      const leaverMember = await prisma.member.findFirst({
        where: { userId: leaverUser!.id, organizationId: orgId, deletedAt: null },
      });

      const leaveRes = await request(app.getHttpServer())
        .post('/api/v1/organizations/members/leave')
        .set('Cookie', leaverCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(leaveRes.body.success).toBe(true);

      // Verify soft-delete
      const leftMember = await prisma.member.findUnique({ where: { id: leaverMember!.id } });
      expect(leftMember?.deletedAt).not.toBeNull();

      // Cleanup
      if (leaverUser) {
        await prisma.auditLog.deleteMany({ where: { userId: leaverUser.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: leaverUser.id } });
        await prisma.user.deleteMany({ where: { id: leaverUser.id } });
      }
    });
  });
});
