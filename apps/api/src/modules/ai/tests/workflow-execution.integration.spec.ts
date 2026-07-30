import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, VersioningType } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../../../app.module";
import { PrismaService } from "../../../common/database/prisma.service";
import { ResponseEnvelopeInterceptor } from "../../../common/interceptors/response-envelope.interceptor";
import { GlobalHttpExceptionFilter } from "../../../common/filters/http-exception.filter";
import { ExecutionRuntimeService } from "../execution/services/execution-runtime.service";
import { ToolRegistry } from "../tools/services/tool-registry.service";

describe("Workflow Execution Integration Tests (AGENT-005.1)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookies: string[];
  let orgId: string;
  let otherOrgId: string;
  let registeredAgentId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalFilters(new GlobalHttpExceptionFilter());

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Mock global fetch for AI provider validation endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "gpt-4" }] }),
    } as any);

    // Mock ExecutionRuntimeService to avoid real AI API requests
    const runtimeService = moduleFixture.get<ExecutionRuntimeService>(ExecutionRuntimeService);
    jest.spyOn(runtimeService, "run").mockResolvedValue("Classified Category: support");

    // Register a mock tool in ToolRegistry
    const toolRegistry = moduleFixture.get<ToolRegistry>(ToolRegistry);
    toolRegistry.register({
      definition: {
        name: "test_formatter",
        description: "Formats test text",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
        },
      },
      execute: async (args: { text: string }) => {
        return { formatted: `[TEST] ${args.text}` };
      },
    });

    const email = `workflow-exec-owner-${Date.now()}@example.com`;

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: "Password123!", name: "Workflow Exec Manager" })
      .expect(201);
    ownerCookies = regRes.headers["set-cookie"] as unknown as string[];
    const owner = await prisma.user.findUnique({ where: { email } });
    ownerUserId = owner!.id;

    // 2. Create Organizations
    const orgRes = await request(app.getHttpServer())
      .post("/api/v1/organizations")
      .set("Cookie", ownerCookies)
      .send({ name: "Workflow Exec Org" })
      .expect(201);
    orgId = orgRes.body.data.id;

    const otherOrgRes = await request(app.getHttpServer())
      .post("/api/v1/organizations")
      .set("Cookie", ownerCookies)
      .send({ name: "Other Org" })
      .expect(201);
    otherOrgId = otherOrgRes.body.data.id;

    // 3. Create Provider Config via controller to auto-encrypt
    const providerConfigRes = await request(app.getHttpServer())
      .post("/api/v1/ai/providers")
      .set("Cookie", ownerCookies)
      .set("x-organization-id", orgId)
      .send({
        provider: "OPENAI",
        name: "OpenAI Config",
        credentials: { apiKey: "sk-mock-key" },
      })
      .expect(201);
    const providerConfigId = providerConfigRes.body.data.id;

    // 4. Create Agent
    const agent = await prisma.agent.create({
      data: {
        name: "Exec Classifier Agent",
        slug: "exec-classifier-agent",
        organizationId: orgId,
        createdById: ownerUserId,
        versions: {
          create: {
            version: 1,
            model: "gpt-4",
            providerConfigId,
          },
        },
      },
    });
    registeredAgentId = agent.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("POST /api/v1/ai/workflows/:id/execute", () => {
    let activeWorkflowId: string;
    let disabledWorkflowId: string;

    beforeAll(async () => {
      // 1. Create Active Workflow with step config
      const activeWorkflow = await request(app.getHttpServer())
        .post("/api/v1/ai/workflows")
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .send({
          name: "Active Support Pipeline",
          definition: {
            entryStepId: "step-1",
            steps: [
              {
                id: "step-1",
                type: "AGENT",
                name: "Classifier Agent Step",
                config: {
                  agentId: registeredAgentId,
                  input: "Query priority of {{input.query}}",
                },
                next: ["step-2"],
              },
              {
                id: "step-2",
                type: "TOOL",
                name: "Format Output Step",
                config: {
                  toolId: "test_formatter",
                  arguments: {
                    text: "{{steps.step-1.output}}",
                  },
                },
                next: [],
              },
            ],
          },
        })
        .expect(201);

      activeWorkflowId = activeWorkflow.body.data.id;

      // Make workflow active
      await prisma.workflow.update({
        where: { id: activeWorkflowId },
        data: { status: "ACTIVE" },
      });

      // 2. Create Disabled Workflow
      const disabledWorkflow = await request(app.getHttpServer())
        .post("/api/v1/ai/workflows")
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .send({
          name: "Disabled Pipeline",
          definition: {
            entryStepId: "step-1",
            steps: [
              {
                id: "step-1",
                type: "TOOL",
                name: "Format Output Step",
                config: {
                  toolId: "test_formatter",
                  arguments: { text: "hello" },
                },
                next: [],
              },
            ],
          },
        })
        .expect(201);

      disabledWorkflowId = disabledWorkflow.body.data.id;
    });

    it("should execute active workflow sequentially and resolve variables", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/ai/workflows/${activeWorkflowId}/execute`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .send({
          input: {
            query: "Can you refund my subscription?",
          },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.output).toEqual({
        formatted: "[TEST] Classified Category: support",
      });

      // Verify db execution logs
      const execution = await prisma.workflowExecution.findFirst({
        where: { workflowId: activeWorkflowId },
        include: { stepExecutions: true },
      });

      expect(execution).toBeDefined();
      expect(execution!.status).toBe("COMPLETED");
      expect(execution!.stepExecutions).toHaveLength(2);
      expect(execution!.stepExecutions.find(s => s.stepId === "step-1")!.status).toBe("COMPLETED");
      expect(execution!.stepExecutions.find(s => s.stepId === "step-2")!.status).toBe("COMPLETED");
    });

    it("should fail execution if a variable is missing", async () => {
      // Execute the same active workflow but supply missing context
      const res = await request(app.getHttpServer())
        .post(`/api/v1/ai/workflows/${activeWorkflowId}/execute`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .send({
          input: {
            wrongField: "missing query key",
          },
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("Variable resolution failed");
    });

    it("should reject execution of a disabled workflow", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/ai/workflows/${disabledWorkflowId}/execute`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .send({
          input: { query: "hello" },
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("is not ACTIVE");
    });

    it("should prevent cross-organization workflow execution", async () => {
      // Execute workflow owned by orgId using header x-organization-id of otherOrgId
      await request(app.getHttpServer())
        .post(`/api/v1/ai/workflows/${activeWorkflowId}/execute`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", otherOrgId)
        .send({
          input: { query: "unauthorized request" },
        })
        .expect(404);
    });
  });
});
