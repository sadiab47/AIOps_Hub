import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { OrgRole, AiProvider } from '@aiops-hub/db';

jest.setTimeout(45000);

describe('AI Providers Integration Tests (AI-001)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerEmail: string;
  let ownerCookies: string[];
  let ownerUserId: string;
  let orgId: string;
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    originalFetch = global.fetch;

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
    ownerEmail = `ai-owner-${Date.now()}@example.com`;

    // 1. Register Owner User
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Password123!', name: 'AI Owner' })
      .expect(201);
    ownerCookies = regRes.headers['set-cookie'] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    ownerUserId = owner!.id;

    // 2. Create Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'AI Test Org' })
      .expect(201);
    orgId = orgRes.body.data.id;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (prisma && orgId) {
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

  describe('Full AI Provider Configuration Lifecycle', () => {
    let providerConfigId: string;

    it('should prevent creating AI provider config with invalid credentials', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Incorrect API key provided' } }),
      } as any);

      await request(app.getHttpServer())
        .post('/api/v1/ai/providers')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          provider: AiProvider.OPENAI,
          name: 'Bad Key Config',
          credentials: { apiKey: 'invalid-sk-key' },
        })
        .expect(400);
    });

    it('should create valid AI provider config and encrypt credentials', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }] }),
      } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/providers')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          provider: AiProvider.OPENAI,
          name: 'Prod OpenAI Key',
          credentials: { apiKey: 'sk-proj-valid-openai-key' },
          defaultModel: 'gpt-4o',
          isDefault: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Prod OpenAI Key');
      expect(res.body.data.isDefault).toBe(true);
      expect(res.body.data.encryptedCredentials).toBeDefined();

      providerConfigId = res.body.data.id;
    });

    it('should list active org provider configurations with decrypted fields hidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/providers')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].encryptedCredentials).toBeUndefined();
    });

    it('should inspect single provider config without revealing plaintext keys', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ai/providers/${providerConfigId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.data.id).toBe(providerConfigId);
      expect(res.body.data.encryptedCredentials).toBeUndefined();
    });

    it('should validate stored provider credentials against OpenAI models endpoint', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'gpt-4o' }] }),
      } as any);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/ai/providers/${providerConfigId}/validate`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.models).toContain('gpt-4o');
    });

    it('should set provider as default organization provider', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/ai/providers/${providerConfigId}/default`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.data.success).toBe(true);
    });

    it('should delete provider configuration', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/ai/providers/${providerConfigId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);
    });
  });
});
