import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, VersioningType } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../../../app.module";
import { PrismaService } from "../../../common/database/prisma.service";
import { ResponseEnvelopeInterceptor } from "../../../common/interceptors/response-envelope.interceptor";
import { GlobalHttpExceptionFilter } from "../../../common/filters/http-exception.filter";

describe("Workflow Controller Integration Tests (AGENT-005.0)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookies: string[];
  let orgId: string;

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
    const email = `workflow-owner-${Date.now()}@example.com`;

    // 1. Register Owner
    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: "Password123!", name: "Workflow Manager" })
      .expect(201);
    ownerCookies = regRes.headers["set-cookie"] as unknown as string[];

    // 2. Create Organization
    const orgRes = await request(app.getHttpServer())
      .post("/api/v1/organizations")
      .set("Cookie", ownerCookies)
      .send({ name: "Workflow Org" })
      .expect(201);
    orgId = orgRes.body.data.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("CRUD Workflow Endpoints", () => {
    let createdWorkflowId: string;

    it("should successfully configure a new workflow and create version 1", async () => {
      const definition = {
        version: 1,
        entryStepId: "step-1",
        steps: [
          {
            id: "step-1",
            type: "AGENT",
            name: "Research Agent",
            config: {},
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post("/api/v1/ai/workflows")
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .send({
          name: "Sequential Research Pipe",
          description: "Pipeline for customer support research",
          definition,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Sequential Research Pipe");
      expect(res.body.data.versions).toHaveLength(1);
      expect(res.body.data.versions[0].versionNumber).toBe(1);

      createdWorkflowId = res.body.data.id;
    });

    it("should list all configured workflows for organization context", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/ai/workflows")
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should fetch a workflow by id with active versions", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ai/workflows/${createdWorkflowId}`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdWorkflowId);
      expect(res.body.data.versions).toHaveLength(1);
    });

    it("should increment workflow version on definition update", async () => {
      const newDefinition = {
        version: 1,
        entryStepId: "step-1",
        steps: [
          {
            id: "step-1",
            type: "AGENT",
            name: "Research Agent",
            config: {},
          },
          {
            id: "step-2",
            type: "TOOL",
            name: "Formatter Tool",
            config: {},
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/ai/workflows/${createdWorkflowId}`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .send({
          definition: newDefinition,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      // Versions are sorted desc in db, so index 0 is version 2
      expect(res.body.data.versions[0].versionNumber).toBe(2);
      expect(res.body.data.versions).toHaveLength(2);
    });

    it("should soft delete a workflow", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/ai/workflows/${createdWorkflowId}`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .expect(240);

      // Verify that findById now throws 404
      await request(app.getHttpServer())
        .get(`/api/v1/ai/workflows/${createdWorkflowId}`)
        .set("Cookie", ownerCookies)
        .set("x-organization-id", orgId)
        .expect(404);
    });
  });
});
