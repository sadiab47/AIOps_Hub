import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { OrgRole, InvitationStatus } from '@aiops-hub/db';

import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';

jest.setTimeout(30000);

describe('Invitations Integration Tests (ORG-002)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerEmail: string;
  let inviteeEmail: string;
  let ownerCookies: string[];
  let inviteeCookies: string[];
  let ownerUserId: string;
  let inviteeUserId: string;
  let orgId: string;

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
    ownerEmail = `owner-${Date.now()}@example.com`;
    inviteeEmail = `invitee-${Date.now()}@example.com`;

    // 1. Register Owner
    const regOwnerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Password123!', name: 'Owner User' })
      .expect(201);
    ownerCookies = regOwnerRes.headers['set-cookie'] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    ownerUserId = owner!.id;

    // 2. Register Invitee
    const regInvRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: inviteeEmail, password: 'Password123!', name: 'Invitee User' })
      .expect(201);
    inviteeCookies = regInvRes.headers['set-cookie'] as unknown as string[];
    const invitee = await prisma.user.findUnique({ where: { email: inviteeEmail } });
    inviteeUserId = invitee!.id;

    // 3. Create Org for Owner
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'Acme Test Corp' })
      .expect(201);
    orgId = orgRes.body.data.id;
  });

  afterAll(async () => {
    if (prisma) {
      // Cleanup: delete invitations, members, audit logs, refresh tokens, org, and users
      await prisma.invitation.deleteMany({ where: { organizationId: orgId } });
      await prisma.member.deleteMany({ where: { organizationId: orgId } });
      await prisma.auditLog.deleteMany({ where: { entityId: orgId } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: [ownerUserId, inviteeUserId] } } });
      await prisma.organization.delete({ where: { id: orgId } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, inviteeUserId] } } });
    }
    if (app) {
      await app.close();
    }
  });

  it('should support full invitation lifecycle: invite -> inspect metadata -> accept', async () => {
    // 1. Invite User B (Invitee)
    const inviteRes = await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({
        email: inviteeEmail,
        role: OrgRole.MEMBER,
      })
      .expect(201);

    expect(inviteRes.body.success).toBe(true);
    expect(inviteRes.body.data.inviteLink).toBeDefined();

    const rawToken = inviteRes.body.data.inviteLink.split('token=')[1];
    expect(rawToken).toBeDefined();

    // 2. Inspect Metadata Publicly
    const metaRes = await request(app.getHttpServer())
      .get(`/api/v1/invitations/${rawToken}`)
      .expect(200);

    expect(metaRes.body.success).toBe(true);
    expect(metaRes.body.data.organization).toBe('Acme Test Corp');
    expect(metaRes.body.data.email).toBe(inviteeEmail);
    expect(metaRes.body.data.role).toBe(OrgRole.MEMBER);
    expect(metaRes.body.data.status).toBe(InvitationStatus.PENDING);

    // 3. Accept Invitation as Invitee
    const acceptRes = await request(app.getHttpServer())
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set('Cookie', inviteeCookies)
      .expect(201);

    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.role).toBe(OrgRole.MEMBER);

    // Verify member mapping exists in db
    const membership = await prisma.member.findFirst({
      where: { userId: inviteeUserId, organizationId: orgId },
    });
    expect(membership).toBeDefined();
    expect(membership!.role).toBe(OrgRole.MEMBER);

    // Verify invitation is marked ACCEPTED
    const inviteInDb = await prisma.invitation.findFirst({
      where: { email: inviteeEmail, organizationId: orgId },
    });
    expect(inviteInDb!.status).toBe(InvitationStatus.ACCEPTED);
  });

  it('should prevent OWNER role invitations', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({
        email: 'somebody@example.com',
        role: OrgRole.OWNER,
      })
      .expect(400);
  });

  it('should return 409 Conflict if user is already a member', async () => {
    // Invitee is now a member. Trying to invite again:
    await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({
        email: inviteeEmail,
        role: OrgRole.MEMBER,
      })
      .expect(409);
  });

  it('should reuse and extend duplicate pending invitations instead of creating new ones', async () => {
    const freshEmail = `fresh-${Date.now()}@example.com`;

    // Invite 1
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({ email: freshEmail, role: OrgRole.MEMBER })
      .expect(201);

    // Invite 2 (duplicate)
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({ email: freshEmail, role: OrgRole.ADMIN }) // Updates role too
      .expect(201);

    expect(res2.body.data.id).toBe(res1.body.data.id);
    expect(res2.body.data.role).toBe(OrgRole.ADMIN);

    // Clean up fresh invitation
    await prisma.invitation.delete({ where: { id: res1.body.data.id } });
  });

  it('should support invitation revocation by owners/admins', async () => {
    const revokeEmail = `revoke-${Date.now()}@example.com`;

    // 1. Create Invite
    const invite = await request(app.getHttpServer())
      .post('/api/v1/invitations')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({ email: revokeEmail, role: OrgRole.VIEWER })
      .expect(201);

    const inviteId = invite.body.data.id;

    // 2. Revoke
    const revokeRes = await request(app.getHttpServer())
      .delete(`/api/v1/invitations/${inviteId}`)
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(revokeRes.body.success).toBe(true);
    expect(revokeRes.body.data.status).toBe(InvitationStatus.REVOKED);

    // Verify database shows status
    const inviteInDb = await prisma.invitation.findUnique({ where: { id: inviteId } });
    expect(inviteInDb!.status).toBe(InvitationStatus.REVOKED);
    expect(inviteInDb!.deletedAt).not.toBeNull();
  });
});
