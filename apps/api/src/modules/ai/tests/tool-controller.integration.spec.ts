import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';

describe('Tool Controller Integration Tests (AGENT-002)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookies: string[];
  let ownerUserId: string;
  let orgId: string;

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
    const email = `tool-owner-${Date.now()}@example.com`;

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!', name: 'Tool Admin' })
      .expect(201);
    ownerCookies = regRes.headers['set-cookie'] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email } });
    ownerUserId = owner!.id;

    // 2. Create Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'Tool Test Org' })
      .expect(201);
    orgId = orgRes.body.data.id;
  });

  afterAll(async () => {
    if (prisma && orgId) {
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

  describe('REST Tool endpoints', () => {
    it('should list all registered built-in tools', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/tools')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6); // Built-ins: calculator, datetime, uuid_generator, json_utilities, text_utilities, http_client
      const toolNames = res.body.data.map((t: any) => t.name);
      expect(toolNames).toContain('calculator');
      expect(toolNames).toContain('datetime');
    });

    it('should resolve a single tool by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/tools/calculator')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('calculator');
      expect(res.body.data.inputSchema).toBeDefined();
    });

    it('should return 404 for an unregistered tool name lookup', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ai/tools/non_existent_tool')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(404);
    });
  });
});
