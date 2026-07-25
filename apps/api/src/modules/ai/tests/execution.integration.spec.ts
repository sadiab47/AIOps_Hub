import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';

describe('Agent Execution Engine (AGENT-003)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let orgId: string;
  let agentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const cookieParser = require('cookie-parser');
    const { VersioningType } = require('@nestjs/common');
    const { ResponseEnvelopeInterceptor } = require('../../../common/interceptors/response-envelope.interceptor');
    const { GlobalHttpExceptionFilter } = require('../../../common/filters/http-exception.filter');

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalFilters(new GlobalHttpExceptionFilter());

    prisma = moduleFixture.get(PrismaService);
    await app.init();

    // Mock the OpenAI provider in the factory
    const { AiProviderFactory } = require('../../../common/ai/factories/ai-provider.factory');
    const factory = moduleFixture.get(AiProviderFactory);
    const mockOpenAiProvider = {
      providerId: 'OPENAI',
      capabilities: { streaming: true, embeddings: false, vision: false, functionCalling: false, jsonMode: false },
      generateCompletion: jest.fn().mockResolvedValue({
        content: 'This is a mocked execution response content text.',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25, estimatedCostUsd: 0.0005, latencyMs: 150 },
      }),
      streamCompletion: async function* () {
        yield 'This ';
        yield 'is ';
        yield 'mocked ';
        yield 'tokens.';
      },
    };
    factory.registerProvider(mockOpenAiProvider);

    // 1. Seed user, org, and provider config
    const email = `execution-owner-${Date.now()}@example.com`;
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!', name: 'Execution Owner' });

    const rawCookies = (regRes.headers['set-cookie'] as unknown as string[]) || [];
    const accessCookie = rawCookies.find((c: string) => c.startsWith('aiops_access_token='));
    token = accessCookie ? accessCookie.split(';')[0].split('=')[1] : '';

    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', `aiops_access_token=${token}`)
      .send({ name: 'Execution Org' });

    orgId = orgRes.body.data.id;

    // Get credential service to encrypt mock API key
    const { CredentialService } = require('../../../common/ai/services/credential.service');
    const credentialService = moduleFixture.get(CredentialService);
    const encryptedCredentials = credentialService.encryptCredentials({ apiKey: 'MOCK_API_KEY' });

    // Create provider configuration mock
    const providerConfig = await prisma.aiProviderConfig.create({
      data: {
        organizationId: orgId,
        provider: 'OPENAI',
        name: 'Mock OpenAI Provider',
        encryptedCredentials,
        defaultModel: 'gpt-4o',
      },
    });

    // Create registry agent
    const agent = await prisma.agent.create({
      data: {
        organizationId: orgId,
        name: 'Weather Agent Helper',
        slug: 'weather-helper',
        createdById: regRes.body.data.id,
        status: 'ACTIVE',
        versions: {
          create: {
            version: 1,
            providerConfigId: providerConfig.id,
            model: 'gpt-4o',
            temperature: 0.7,
          },
        },
      },
    });
    agentId = agent.id;
  });

  afterAll(async () => {
    // Soft cleanups
    await prisma.agentExecution.deleteMany({ where: { organizationId: orgId } });
    await prisma.agentVersion.deleteMany({ where: { agentId } });
    await prisma.agent.deleteMany({ where: { id: agentId } });
    await prisma.aiProviderConfig.deleteMany({ where: { organizationId: orgId } });
    await app.close();
  });

  it('should successfully trigger simple prompt executions', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'Explain quantum physics in one sentence.' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toBeDefined();

    // Verify database execution log was created
    const execution = await prisma.agentExecution.findFirst({
      where: { agentId, organizationId: orgId },
    });
    expect(execution).toBeDefined();
    expect(execution?.status).toBe('COMPLETED');
    expect(execution?.promptTokens).toBeGreaterThan(0);
  });

  it('should stream tokens back to client via Server-Sent Events', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute/stream`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'Hello agent, tell me a quick joke.' });

    expect(res.statusCode).toBe(201);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('event: start');
    expect(res.text).toContain('event: metadata');
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: done');
  });
});
