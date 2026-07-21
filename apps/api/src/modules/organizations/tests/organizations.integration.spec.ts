import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { OrgRole } from '@aiops-hub/db';

import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';

jest.setTimeout(30000);

describe('Organizations Integration Tests (ORG-001)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testEmail: string;
  let userId: string;
  let authCookies: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());

    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalFilters(new GlobalHttpExceptionFilter());

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    testEmail = `org-test-${Date.now()}@example.com`;

    // 1. Create a user to authenticate with
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Org Tester',
      })
      .expect(201);

    authCookies = registerRes.headers['set-cookie'] as unknown as string[];
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    userId = user!.id;
  });

  afterAll(async () => {
    if (prisma) {
      // Cleanup: delete audit logs, members, organizations, and user
      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      if (user) {
        // Find all organization memberships of this user
        const memberships = await prisma.member.findMany({ where: { userId: user.id } });
        const orgIds = memberships.map((m) => m.organizationId);

        await prisma.member.deleteMany({ where: { userId: user.id } });
        await prisma.auditLog.deleteMany({ where: { userId: user.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

        if (orgIds.length > 0) {
          await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
        }

        await prisma.user.delete({ where: { id: user.id } });
      }
    }
    if (app) {
      await app.close();
    }
  });

  it('should create an organization, assign creator as OWNER, and record audit log', async () => {
    const orgName = `Test Org ${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', authCookies)
      .send({ name: orgName })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(orgName);
    expect(res.body.data.slug).toBeDefined();

    const orgId = res.body.data.id;

    // Verify Organization is in database
    const orgInDb = await prisma.organization.findUnique({ where: { id: orgId } });
    expect(orgInDb).toBeDefined();
    expect(orgInDb!.name).toBe(orgName);

    // Verify Member role is OWNER
    const memberInDb = await prisma.member.findFirst({
      where: {
        userId,
        organizationId: orgId,
      },
    });
    expect(memberInDb).toBeDefined();
    expect(memberInDb!.role).toBe(OrgRole.OWNER);

    // Verify Audit Log was recorded
    const auditInDb = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'ORGANIZATION_CREATE',
        entityName: 'organization',
        entityId: orgId,
      },
    });
    expect(auditInDb).toBeDefined();
  });

  it('should sequentially suffix the slug on duplicate names', async () => {
    const orgName = `Duplicate Org ${Date.now()}`;

    // Create 1st
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', authCookies)
      .send({ name: orgName })
      .expect(201);

    // Create 2nd (duplicate name)
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', authCookies)
      .send({ name: orgName })
      .expect(201);

    expect(res2.body.data.slug).toBe(`${res1.body.data.slug}-2`);
  });

  it('should support multi-tenant switching and handle list, switch, context resolution, and revocation checks', async () => {
    // 1. User belongs to 5 organizations -> GET list returns exactly 5
    // Note: We already registered the user. Let's create 4 more organizations so they have 5 in total.
    for (let i = 0; i < 4; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Cookie', authCookies)
        .send({ name: `Bulk Org ${i}-${Date.now()}` })
        .expect(201);
    }

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('Cookie', authCookies)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    // At least 5, since sequential slug test created 2, and we just created 4, total = 6. Let's filter by name prefix if needed,
    // or just check that they are returned properly. Let's ensure the list contains the roles.
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(5);
    expect(listRes.body.data[0].role).toBe(OrgRole.OWNER);

    // Pick one org ID to switch to
    const targetOrg = listRes.body.data[0];
    const targetOrgId = targetOrg.id;

    // 2. Switch Organization -> Returns context DTO with correct properties
    const switchRes = await request(app.getHttpServer())
      .post('/api/v1/organizations/switch')
      .set('Cookie', authCookies)
      .send({ organizationId: targetOrgId })
      .expect(200);

    expect(switchRes.body.success).toBe(true);
    expect(switchRes.body.data.id).toBe(targetOrgId);
    expect(switchRes.body.data.role).toBe(OrgRole.OWNER);
    expect(switchRes.body.data.permissions).toBeDefined();
    expect(switchRes.body.data.permissions.length).toBeGreaterThan(0);
    expect(switchRes.body.data.settings.timezone).toBeDefined();

    // 3. Switch Organization -> Immediately call protected endpoint -> Header accepted
    // Let's call POST /api/v1/invitations (which is protected by TenantContextGuard & MembershipGuard & RolesGuard)
    // We expect it to validate since we are OWNER and have correct header.
    // It should give a validation error on input (e.g. 400 bad request / validation error for empty body)
    // instead of 403 Forbidden or 401 Unauthorized!
    const testProtRes = await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', authCookies)
      .set('x-organization-id', targetOrgId)
      .send({ email: 'invitee-integration@example.com', role: OrgRole.MEMBER })
      .expect(201);

    expect(testProtRes.body.success).toBe(true);

    // 4. User removed from organization -> Old header reused -> 403 Forbidden
    // Delete the member record for the user on this targetOrgId
    await prisma.member.deleteMany({
      where: { userId, organizationId: targetOrgId },
    });

    // Make the request again with the old header -> Expect 403 Forbidden
    await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', authCookies)
      .set('x-organization-id', targetOrgId)
      .send({ email: 'another-invitee@example.com', role: OrgRole.MEMBER })
      .expect(403);
  });

  it('should handle PATCH /settings validation, unique conflict, role access, and audit log creation', async () => {
    // 1. Create a temporary organization to test settings updates
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', authCookies)
      .send({ name: 'Acme Settings Org' })
      .expect(201);
    const orgId = orgRes.body.data.id;

    // 2. OWNER can update profile and settings successfully
    const updateRes = await request(app.getHttpServer())
      .patch('/api/v1/organizations/settings')
      .set('Cookie', authCookies)
      .set('x-organization-id', orgId)
      .send({
        profile: { name: 'Acme Renamed', slug: `acme-renamed-${Date.now()}` },
        settings: { timezone: 'EST', locale: 'en-US', brandingColor: '#1E40AF', logoUrl: 'https://logo.png' },
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.organization.name).toBe('Acme Renamed');
    expect(updateRes.body.data.settings.brandingColor).toBe('#1E40AF');

    // Allow async EventBus listeners time to persist audit logs before querying
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify Audit Logs exist in Database
    const audits = await prisma.auditLog.findMany({ where: { entityId: orgId } });
    const actions = audits.map((a) => a.action);
    expect(actions).toContain('ORGANIZATION_UPDATED');
    expect(actions).toContain('SLUG_CHANGED');
    expect(actions).toContain('SETTINGS_UPDATED');

    // 3. Reserved slug returns 400 Bad Request
    await request(app.getHttpServer())
      .patch('/api/v1/organizations/settings')
      .set('Cookie', authCookies)
      .set('x-organization-id', orgId)
      .send({ profile: { slug: 'admin' } })
      .expect(400);

    // 4. Duplicate slug returns 409 Conflict
    // First let's create another org
    const otherOrg = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', authCookies)
      .send({ name: 'Other Unique Org' })
      .expect(201);
    const otherSlug = otherOrg.body.data.slug;

    // Try to update Acme Settings Org to have the same slug -> Expect 409 Conflict
    await request(app.getHttpServer())
      .patch('/api/v1/organizations/settings')
      .set('Cookie', authCookies)
      .set('x-organization-id', orgId)
      .send({ profile: { slug: otherSlug } })
      .expect(409);

    // 5. MEMBER receives 403 Forbidden
    // Create a regular user who is not a member of orgId
    const regularEmail = `reg-${Date.now()}@example.com`;
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: regularEmail, password: 'Password123!', name: 'Regular User' })
      .expect(201);
    const regCookies = regRes.headers['set-cookie'] as unknown as string[];

    await request(app.getHttpServer())
      .patch('/api/v1/organizations/settings')
      .set('Cookie', regCookies)
      .set('x-organization-id', orgId)
      .send({ profile: { name: 'Hack Name' } })
      .expect(403);
  });
});
