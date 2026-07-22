import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { ResponseEnvelopeInterceptor } from '../../../common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { PromptVisibility, PromptType } from '@aiops-hub/db';

jest.setTimeout(45000);

describe('Prompt Library Integration Tests (AI-002)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerEmail: string;
  let ownerCookies: string[];
  let ownerUserId: string;
  let orgId: string;
  let categoryId: string;

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
    ownerEmail = `prompt-owner-${Date.now()}@example.com`;

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Password123!', name: 'Prompt Owner' })
      .expect(201);
    ownerCookies = regRes.headers['set-cookie'] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    ownerUserId = owner!.id;

    // 2. Create Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'Prompt Test Org' })
      .expect(201);
    orgId = orgRes.body.data.id;

    // 3. Resolve Support Category ID
    const cat = await prisma.promptCategory.findFirst({ where: { name: 'Support' } });
    categoryId = cat!.id;
  });

  afterAll(async () => {
    if (prisma && orgId) {
      await prisma.promptVersion.deleteMany({ where: { prompt: { organizationId: orgId } } });
      await prisma.prompt.deleteMany({ where: { organizationId: orgId } });
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

  describe('REST Endpoints CRUD & Preview rendering', () => {
    let promptId: string;

    it('should list seeded prompt categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/prompts/categories')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data.some((c: { name: string }) => c.name === 'Support')).toBe(true);
    });

    it('should create prompt and version v1 successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/prompts')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          name: 'Greeting Template',
          categoryId,
          visibility: PromptVisibility.ORGANIZATION,
          type: PromptType.CHAT,
          template: 'Hello {{customerName}}, welcome to {{company}}!',
          changeLog: 'Initial release',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Greeting Template');
      expect(res.body.data.slug).toBe('greeting-template');
      expect(res.body.data.latestVersion.version).toBe(1);

      promptId = res.body.data.id;
    });

    it('should prevent duplicate prompt names in organization by resolving slugs', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/prompts')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          name: 'Greeting Template',
          categoryId,
          visibility: PromptVisibility.ORGANIZATION,
          type: PromptType.CHAT,
          template: 'Other template',
        })
        .expect(201);

      expect(res.body.data.slug).toBe('greeting-template-2');
    });

    it('should list all prompts with category filter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/prompts?categoryId=${categoryId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });

    it('should get single prompt template details with variables', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/prompts/${promptId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.data.variables).toContain('customerName');
      expect(res.body.data.variables).toContain('company');
    });

    it('should update prompt metadata properties', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/prompts/${promptId}`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          description: 'Updated descriptions',
        })
        .expect(200);

      expect(res.body.data.description).toBe('Updated descriptions');
    });

    it('should add a new version v2 to version history', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/prompts/${promptId}/versions`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          template: 'Dear {{customerName}}, welcome to the revamped {{company}}! Support ID: {{id}}',
          changeLog: 'Revamped format adding support ID',
        })
        .expect(201);

      expect(res.body.data.version).toBe(2);
    });

    it('should list prompt version history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/prompts/${promptId}/versions`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].version).toBe(2);
      expect(res.body.data[1].version).toBe(1);
    });

    it('should render template version preview reporting diagnostics', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/prompts/${promptId}/render`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          variables: { customerName: 'John', company: 'Google', unusedVar: 'ignored' },
        })
        .expect(200);

      expect(res.body.data.rendered).toContain('Dear John, welcome to the revamped Google! Support ID: ');
      expect(res.body.data.variables).toContain('customerName');
      expect(res.body.data.variables).toContain('id');
      expect(res.body.data.missing).toContain('id');
      expect(res.body.data.unused).toContain('unusedVar');
    });
  });
});
