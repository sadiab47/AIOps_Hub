import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { AiProvider } from '@aiops-hub/db';

jest.setTimeout(45000);

describe('Agent Registry Integration Tests (AGENT-001)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerEmail: string;
  let ownerCookies: string[];
  let ownerUserId: string;
  let orgId: string;
  let providerConfigId: string;

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
    ownerEmail = `agent-owner-${Date.now()}@example.com`;

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Password123!', name: 'Agent Owner' })
      .expect(201);
    ownerCookies = regRes.headers['set-cookie'] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    ownerUserId = owner!.id;

    // 2. Create Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'Agent Test Org' })
      .expect(201);
    orgId = orgRes.body.data.id;

    // 3. Create Provider Config
    const provRes = await prisma.aiProviderConfig.create({
      data: {
        organizationId: orgId,
        provider: AiProvider.OPENAI,
        name: 'Agent Provider Config',
        encryptedCredentials: 'enc',
      },
    });
    providerConfigId = provRes.id;
  });

  afterAll(async () => {
    if (prisma && orgId) {
      await prisma.agentVersion.deleteMany({ where: { agent: { organizationId: orgId } } });
      await prisma.agent.deleteMany({ where: { organizationId: orgId } });
      await prisma.aiProviderConfig.deleteMany({ where: { organizationId: orgId } });
      await prisma.member.deleteMany({ where: { organizationId: orgId } });
      await prisma.auditLog.deleteMany({ where: { entityId: orgId } });
      await prisma.refreshToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.organization.delete({ where: { id: orgId } });
      await prisma.user.delete({ where: { id: ownerUserId } });
    }
    if (app) {
      await app.close();
    }
  });

  describe('REST Agent Registry endpoints', () => {
    let agentId: string;

    it('should register a new agent and automatically build Version 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/agents')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          name: 'Support Agent',
          slug: 'support-agent',
          description: 'Handles support requests',
          version: {
            providerConfigId,
            model: 'gpt-4o',
            temperature: 0.5,
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Support Agent');
      expect(res.body.data.currentVersion).toBe(1);
      expect(res.body.data.versions.length).toBe(1);
      agentId = res.body.data.id;
    });

    it('should reject registering duplicate slug inside organization context', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/agents')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          name: 'Alternative Agent',
          slug: 'support-agent',
          version: {
            providerConfigId,
            model: 'gpt-4o',
          },
        })
        .expect(409);
    });

    it('should list active agents within organization scope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/agents')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].slug).toBe('support-agent');
    });

    it('should support enabling and disabling agent statuses via actions', async () => {
      // Disable
      const disableRes = await request(app.getHttpServer())
        .post(`/api/v1/ai/agents/${agentId}/disable`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);
      expect(disableRes.body.data.enabled).toBe(false);

      // Enable
      const enableRes = await request(app.getHttpServer())
        .post(`/api/v1/ai/agents/${agentId}/enable`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);
      expect(enableRes.body.data.enabled).toBe(true);
    });

    it('should support updating agent parameters creating Version 2 snapshot', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/ai/agents/${agentId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          providerConfigId,
          model: 'gpt-4o-mini',
          temperature: 0.2,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentVersion).toBe(2);
      expect(res.body.data.versions.length).toBe(2);
      expect(res.body.data.versions[0].model).toBe('gpt-4o-mini');
    });

    it('should soft delete agent successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/ai/agents/${agentId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      // Verify is not listed anymore
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/ai/agents')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);
      expect(listRes.body.data.length).toBe(0);
    });
  });
});
