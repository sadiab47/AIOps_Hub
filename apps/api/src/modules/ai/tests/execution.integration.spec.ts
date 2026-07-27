import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../common/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Agent Execution Engine (AGENT-003)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let token: string;
  let orgId: string;
  let agentId: string;
  let providerConfigId: string;

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
    eventEmitter = moduleFixture.get(EventEmitter2);
    await app.init();

    // Register dynamic mock tools into ToolRegistry
    const { ToolRegistry } = require('../tools/services/tool-registry.service');
    const toolRegistry = moduleFixture.get(ToolRegistry);
    
    const mockCalculatorTool = {
      definition: {
        name: 'calculator',
        description: 'Mock calculator tool',
        inputSchema: {
          type: 'object',
          properties: {
            expression: { type: 'string' }
          },
          required: ['expression']
        }
      },
      execute: async (input: { expression: string }) => {
        return { result: 42 };
      }
    };

    const mockTimeoutTool = {
      definition: {
        name: 'timeout_tool',
        description: 'Mock timeout tool',
        inputSchema: { type: 'object', properties: {} }
      },
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { success: true };
      }
    };

    if (!toolRegistry.has('calculator')) {
      toolRegistry.register(mockCalculatorTool);
    }
    if (!toolRegistry.has('timeout_tool')) {
      toolRegistry.register(mockTimeoutTool);
    }

    // Mock the OpenAI provider in the factory
    const { AiProviderFactory } = require('../../../common/ai/factories/ai-provider.factory');
    const factory = moduleFixture.get(AiProviderFactory);
    const mockOpenAiProvider = {
      providerId: 'OPENAI',
      capabilities: { streaming: true, embeddings: false, vision: false, functionCalling: true, jsonMode: false },
      generateCompletion: jest.fn().mockImplementation((req) => {
        const findMessage = (flag: string) => req.messages.some((m: any) => m.content && m.content.includes(flag));
        
        if (findMessage('FAIL_NETWORK')) {
          throw new Error('Network Error: connection refused');
        }
        if (findMessage('FAIL_CREDENTIALS')) {
          throw new Error('Incorrect API key provided');
        }
        if (findMessage('FAIL_TIMEOUT')) {
          throw new Error('Gateway Timeout');
        }
        if (findMessage('TRIGGER_UNAUTHORIZED_TOOL')) {
          return {
            content: 'Let me call an unauthorized tool.',
            finishReason: 'tool_calls',
            toolCalls: [{ id: 'call-1', type: 'function', function: { name: 'unauthorized_tool', arguments: '{}' } }],
            usage: { promptTokens: 5, completionTokens: 5 },
          };
        }
        if (findMessage('TRIGGER_TOOL_NOT_FOUND')) {
          const lastMsg = req.messages[req.messages.length - 1];
          if (lastMsg.role === 'tool' && lastMsg.content.includes('not found')) {
            throw new Error(`Tool 'tool_not_found' not found in registry.`);
          }
          return {
            content: 'Let me call a missing tool.',
            finishReason: 'tool_calls',
            toolCalls: [{ id: 'call-2', type: 'function', function: { name: 'tool_not_found', arguments: '{}' } }],
            usage: { promptTokens: 5, completionTokens: 5 },
          };
        }
        if (findMessage('TRIGGER_TOOL_LOOP')) {
          return {
            content: 'Let me call calculator in a loop.',
            finishReason: 'tool_calls',
            toolCalls: [{ id: 'call-loop', type: 'function', function: { name: 'calculator', arguments: '{"expression":"2+2"}' } }],
            usage: { promptTokens: 5, completionTokens: 5 },
          };
        }
        if (findMessage('TRIGGER_SUCCESS_TOOL')) {
          // If we already called the tool and have the tool message, return final answer
          const hasToolResult = req.messages.some((m: any) => m.role === 'tool');
          if (hasToolResult) {
            return {
              content: 'The calculator result is 42.',
              finishReason: 'stop',
              usage: { promptTokens: 15, completionTokens: 10 },
            };
          }
          return {
            content: 'I need to calculate something.',
            finishReason: 'tool_calls',
            toolCalls: [{ id: 'call-calc', type: 'function', function: { name: 'calculator', arguments: '{"expression":"2+2"}' } }],
            usage: { promptTokens: 5, completionTokens: 5 },
          };
        }

        return {
          content: 'This is a mocked execution response content text.',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25, estimatedCostUsd: 0.0005, latencyMs: 150 },
        };
      }),
      streamCompletion: async function* (req: any) {
        const lastMsg = req.messages[req.messages.length - 1].content;
        if (lastMsg.includes('FAIL_STREAM_INTERRUPT')) {
          throw new Error('Streaming connection interrupted');
        }
        yield 'This ';
        yield 'is ';
        yield 'mocked ';
        yield 'tokens.';
      },
    };
    factory.registerProvider(mockOpenAiProvider);

    // Seed user, org, and provider config
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
    providerConfigId = providerConfig.id;

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
            retryLimit: 3, // Set low retry limit for loop tests
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

  it('should successfully trigger simple prompt executions and verify telemetry & events', async () => {
    const events: string[] = [];
    const startedListener = () => events.push('started');
    const completedListener = () => events.push('completed');

    eventEmitter.on('execution.started', startedListener);
    eventEmitter.on('execution.completed', completedListener);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'Explain quantum physics in one sentence.' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toBeDefined();

    // Verify database execution log was created and contains correct metrics
    const execution = await prisma.agentExecution.findFirst({
      where: { agentId, organizationId: orgId, input: { equals: 'Explain quantum physics in one sentence.' } },
    });
    expect(execution).toBeDefined();
    expect(execution?.status).toBe('COMPLETED');
    expect(execution?.promptTokens).toBeGreaterThan(0);
    expect(execution?.completionTokens).toBeGreaterThan(0);
    expect(execution?.totalCost).toBeGreaterThan(0);
    expect(execution?.latencyMs).toBeGreaterThan(0);

    // Verify domain events sequence
    expect(events).toContain('started');
    expect(events).toContain('completed');

    eventEmitter.off('execution.started', startedListener);
    eventEmitter.off('execution.completed', completedListener);
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

  it('should handle provider network failures and mark status as FAILED', async () => {
    const events: string[] = [];
    const failedListener = () => events.push('failed');
    eventEmitter.on('execution.failed', failedListener);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'FAIL_NETWORK' });

    expect(res.statusCode).toBe(500);

    const execution = await prisma.agentExecution.findFirst({
      where: { agentId, organizationId: orgId, input: { equals: 'FAIL_NETWORK' } },
    });
    expect(execution?.status).toBe('FAILED');
    expect(execution?.errorMessage).toContain('Network Error: connection refused');
    expect(events).toContain('failed');

    eventEmitter.off('execution.failed', failedListener);
  });

  it('should handle provider credentials validation errors', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'FAIL_CREDENTIALS' });

    expect(res.statusCode).toBe(500);

    const execution = await prisma.agentExecution.findFirst({
      where: { agentId, organizationId: orgId, input: { equals: 'FAIL_CREDENTIALS' } },
    });
    expect(execution?.status).toBe('FAILED');
    expect(execution?.errorMessage).toContain('Incorrect API key provided');
  });

  it('should stream error event if provider failure occurs in stream', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute/stream`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'FAIL_NETWORK' });

    expect(res.statusCode).toBe(201);
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('connection refused');
  });

  it('should handle unauthorized tool execution failure', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'TRIGGER_UNAUTHORIZED_TOOL' });

    expect(res.statusCode).toBe(500);

    const execution = await prisma.agentExecution.findFirst({
      where: { agentId, organizationId: orgId, input: { equals: 'TRIGGER_UNAUTHORIZED_TOOL' } },
    });
    expect(execution?.status).toBe('FAILED');
    expect(execution?.errorMessage).toContain('Tool unauthorized');
  });

  it('should handle missing tool resolver failure gracefully', async () => {
    // Whitelist it first by linking in agentTools table
    await prisma.agentTool.create({
      data: {
        agentId,
        toolId: 'tool_not_found',
      }
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'TRIGGER_TOOL_NOT_FOUND' });

    expect(res.statusCode).toBe(500);

    const execution = await prisma.agentExecution.findFirst({
      where: { agentId, organizationId: orgId, input: { equals: 'TRIGGER_TOOL_NOT_FOUND' } },
    });
    expect(execution?.status).toBe('FAILED');
    expect(execution?.errorMessage).toContain('Tool \'tool_not_found\' not found');

    // Clean up
    await prisma.agentTool.deleteMany({ where: { agentId, toolId: 'tool_not_found' } });
  });

  it('should successfully execute valid tools and track event logs', async () => {
    const events: string[] = [];
    const toolInvokedListener = () => events.push('tool_invoked');
    const toolCompletedListener = () => events.push('tool_completed');

    eventEmitter.on('tool.invoked', toolInvokedListener);
    eventEmitter.on('tool.completed', toolCompletedListener);

    // Clean up any stray links first
    await prisma.agentTool.deleteMany({ where: { agentId, toolId: 'calculator' } });

    // Create registry agent tool config link
    await prisma.agentTool.create({
      data: {
        agentId,
        toolId: 'calculator',
      }
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'TRIGGER_SUCCESS_TOOL' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.text).toContain('The calculator result is 42.');
    expect(events).toContain('tool_invoked');
    expect(events).toContain('tool_completed');

    // Clean up registry agent tool link
    await prisma.agentTool.deleteMany({ where: { agentId, toolId: 'calculator' } });
    eventEmitter.off('tool.invoked', toolInvokedListener);
    eventEmitter.off('tool.completed', toolCompletedListener);
  });

  it('should stop and fail if max iterations loop limit is exceeded', async () => {
    // Clean up any stray links first
    await prisma.agentTool.deleteMany({ where: { agentId, toolId: 'calculator' } });

    await prisma.agentTool.create({
      data: {
        agentId,
        toolId: 'calculator',
      }
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/ai/agents/${agentId}/execute`)
      .set('Cookie', `aiops_access_token=${token}`)
      .set('x-organization-id', orgId)
      .send({ input: 'TRIGGER_TOOL_LOOP' });

    expect(res.statusCode).toBe(500);

    const execution = await prisma.agentExecution.findFirst({
      where: { agentId, organizationId: orgId, input: { equals: 'TRIGGER_TOOL_LOOP' } },
    });
    expect(execution?.status).toBe('FAILED');
    expect(execution?.errorMessage).toContain('exceeded maximum iterations cap');

    await prisma.agentTool.deleteMany({ where: { agentId, toolId: 'calculator' } });
  });
});
