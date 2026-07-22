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

describe('Chat Engine Integration Tests (AI-003)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerEmail: string;
  let ownerCookies: string[];
  let ownerUserId: string;
  let orgId: string;
  let providerConfigId: string;
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
    ownerEmail = `chat-owner-${Date.now()}@example.com`;

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: 'Password123!', name: 'Chat Owner' })
      .expect(201);
    ownerCookies = regRes.headers['set-cookie'] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    ownerUserId = owner!.id;

    // 2. Create Organization
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', ownerCookies)
      .send({ name: 'Chat Test Org' })
      .expect(201);
    orgId = orgRes.body.data.id;

    // 3. Create Valid AI Provider Config
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'gpt-4o' }] }),
    } as any);

    const provRes = await request(app.getHttpServer())
      .post('/api/v1/ai/providers')
      .set('Cookie', ownerCookies)
      .set('x-organization-id', orgId)
      .send({
        provider: AiProvider.OPENAI,
        name: 'Chat Config',
        credentials: { apiKey: 'sk-proj-chat-valid-key' },
        defaultModel: 'gpt-4o',
        isDefault: true,
      })
      .expect(201);
    providerConfigId = provRes.body.data.id;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (prisma && orgId) {
      await prisma.message.deleteMany({ where: { conversation: { organizationId: orgId } } });
      await prisma.aiUsageLog.deleteMany({ where: { organizationId: orgId } });
      await prisma.conversation.deleteMany({ where: { organizationId: orgId } });
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

  describe('Conversations and Token Streaming', () => {
    let conversationId: string;

    it('should create conversation successfully with system prompt message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/chat/conversations')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          title: 'AIOps Thread',
          providerConfigId,
          model: 'gpt-4o',
          systemPrompt: 'You are an AIOps assistant.',
          temperature: 0.5,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('AIOps Thread');
      expect(res.body.data.status).toBe('ACTIVE');

      conversationId = res.body.data.id;

      // Verify System message was persisted
      const msgs = await prisma.message.findMany({ where: { conversationId } });
      expect(msgs.length).toBe(1);
      expect(msgs[0].role).toBe('SYSTEM');
    });

    it('should list active conversations for organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should connect to SSE endpoint and receive model token chunks', async () => {
      const mockStreamIterator = async function* () {
        const textEncoder = new TextEncoder();
        yield textEncoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n');
        yield textEncoder.encode('data: {"choices":[{"delta":{"content":" "}}]}\n');
        yield textEncoder.encode('data: {"choices":[{"delta":{"content":"world!"}}]}\n');
        yield textEncoder.encode('data: [DONE]\n');
      };

      const iterator = mockStreamIterator();
      const mockReader = {
        read: async () => {
          const next = await iterator.next();
          return { done: next.done, value: next.value };
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      } as any);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${conversationId}/stream`)
        .set('Cookie', ownerCookies)
        .set('x-organization-id', orgId)
        .send({
          content: 'Hello, repeat: Hello world!',
        })
        .expect(200);

      expect(res.text).toContain('event: start');
      expect(res.text).toContain('event: metadata');
      expect(res.text).toContain('event: token');
      expect(res.text).toContain('event: usage');
      expect(res.text).toContain('event: done');

      // Verify messages were persisted to DB
      const dbMsgs = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
      expect(dbMsgs.some((m) => m.role === 'USER')).toBe(true);
      expect(dbMsgs.some((m) => m.role === 'ASSISTANT')).toBe(true);

      // Verify usage log was generated
      const usage = await prisma.aiUsageLog.findFirst({ where: { conversationId } });
      expect(usage).toBeDefined();
      expect(usage!.status).toBe('SUCCESS');
    });
  });
});
