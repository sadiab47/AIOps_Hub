import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { OrgRole } from '@aiops-hub/db';

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
});
