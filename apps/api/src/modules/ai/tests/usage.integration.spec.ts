import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { AiProvider, AiRequestStatus } from '@aiops-hub/db';

jest.setTimeout(45000);

describe('AI Usage Analytics Integration Tests (AI-005)', () => {
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
    ownerEmail = `usage-owner-${Date.now()}@example.com`;

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Password123!', name: 'Usage Owner' })
      .expect(201);
    ownerCookies = regRes.headers['set-cookie'] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    ownerUserId = owner!.id;

    // 2. Create Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'Usage Test Org' })
      .expect(201);
    orgId = orgRes.body.data.id;

    // 3. Create Provider Config
    const provRes = await prisma.aiProviderConfig.create({
      data: {
        organizationId: orgId,
        provider: AiProvider.OPENAI,
        name: 'Usage Config',
        encryptedCredentials: 'enc',
      },
    });
    providerConfigId = provRes.id;

    // 4. Seed Mock Usage Logs
    await prisma.aiUsageLog.createMany({
      data: [
        {
          requestId: 'e01ce16a-7ad2-4a0f-acb2-ca21d01ab001',
          organizationId: orgId,
          providerConfigId,
          provider: AiProvider.OPENAI,
          model: 'gpt-4o',
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          estimatedCostUsd: 0.0125,
          status: AiRequestStatus.SUCCESS,
          latencyMs: 500,
          createdAt: new Date(),
        },
        {
          requestId: 'e01ce16a-7ad2-4a0f-acb2-ca21d01ab002',
          organizationId: orgId,
          providerConfigId,
          provider: AiProvider.OPENAI,
          model: 'gpt-4o-mini',
          promptTokens: 500,
          completionTokens: 200,
          totalTokens: 700,
          estimatedCostUsd: 0.000195,
          status: AiRequestStatus.SUCCESS,
          latencyMs: 200,
          createdAt: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    if (prisma && orgId) {
      await prisma.aiUsageLog.deleteMany({ where: { organizationId: orgId } });
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

  describe('REST Usage Analytics Endpoints', () => {
    it('should retrieve overall telemetry summary logs count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/usage')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should aggregate metrics correctly in summary endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/usage/summary')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.requests).toBe(2);
      expect(res.body.data.totalTokens).toBe(2200);
      expect(res.body.data.estimatedCostUsd).toBeCloseTo(0.012695, 6);
    });

    it('should aggregate metrics grouped by models', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/usage/models')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.some((d: any) => d.group === 'gpt-4o')).toBe(true);
      expect(res.body.data.some((d: any) => d.group === 'gpt-4o-mini')).toBe(true);
    });
  });
});
