import { WorkflowContextService, WorkflowVariableResolutionError } from "../services/workflow-context.service";
import { WorkflowExecutionService } from "../services/workflow-execution.service";
import { PrismaService } from "../../../common/database/prisma.service";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { ExecutionService } from "../execution/services/execution.service";
import { ExecutionRuntimeService } from "../execution/services/execution-runtime.service";
import { ToolRegistry } from "../tools/services/tool-registry.service";
import { ToolExecutor } from "../tools/services/tool-executor.service";

describe("Workflow Runtime & Variables Resolution Unit Tests (AGENT-005.1)", () => {
  let contextService: WorkflowContextService;

  beforeEach(() => {
    contextService = new WorkflowContextService();
  });

  describe("Variable Resolution Engine", () => {
    const mockContext: any = {
      input: {
        customerName: "Saad",
        ticket: {
          priority: "HIGH",
        },
      },
      steps: {
        classify: {
          status: "COMPLETED",
          output: {
            category: "billing",
            score: 0.95,
          },
        },
      },
    };

    it("should resolve single values directly from inputs and steps", () => {
      const resName = contextService.resolve("{{input.customerName}}", mockContext, "step-1");
      expect(resName).toBe("Saad");

      const resCategory = contextService.resolve("{{steps.classify.output.category}}", mockContext, "step-1");
      expect(resCategory).toBe("billing");
    });

    it("should resolve multiple placeholders inline within one string", () => {
      const template = "Customer {{input.customerName}} has priority {{input.ticket.priority}}";
      const res = contextService.resolve(template, mockContext, "step-1");
      expect(res).toBe("Customer Saad has priority HIGH");
    });

    it("should preserve full structured objects on single value interpolation", () => {
      const template = "{{steps.classify.output}}";
      const res = contextService.resolve(template, mockContext, "step-1");
      expect(res).toEqual({
        category: "billing",
        score: 0.95,
      });
    });

    it("should recursively resolve object keys and array elements", () => {
      const config = {
        meta: {
          name: "User: {{input.customerName}}",
        },
        tags: ["{{input.ticket.priority}}", "billing"],
      };

      const res = contextService.resolve(config, mockContext, "step-1");
      expect(res).toEqual({
        meta: {
          name: "User: Saad",
        },
        tags: ["HIGH", "billing"],
      });
    });

    it("should throw WorkflowVariableResolutionError if path does not exist", () => {
      expect(() => {
        contextService.resolve("{{input.missingField}}", mockContext, "step-1");
      }).toThrow(WorkflowVariableResolutionError);
    });
  });

  describe("Workflow Graph Cycle Verification", () => {
    let executionService: WorkflowExecutionService;
    let mockPrisma: any;
    let mockWorkflowRepo: any;
    let mockAgentExecution: any;
    let mockAgentRuntime: any;
    let mockToolRegistry: any;
    let mockToolExecutor: any;

    beforeEach(() => {
      mockPrisma = {};
      mockWorkflowRepo = {};
      mockAgentExecution = {};
      mockAgentRuntime = {};
      mockToolRegistry = {};
      mockToolExecutor = {};

      executionService = new WorkflowExecutionService(
        mockPrisma as PrismaService,
        mockWorkflowRepo as WorkflowRepository,
        contextService,
        mockAgentExecution as ExecutionService,
        mockAgentRuntime as ExecutionRuntimeService,
        mockToolRegistry as ToolRegistry,
        mockToolExecutor as ToolExecutor,
      );
    });

    it("should pass graph validation for acyclic graphs", () => {
      const definition = {
        entryStepId: "step-1",
        steps: [
          { id: "step-1", next: ["step-2"] },
          { id: "step-2", next: [] },
        ],
      };

      expect(() => executionService.validateDefinition(definition)).not.toThrow();
    });

    it("should throw error during graph cycle detection", () => {
      const definition = {
        entryStepId: "step-1",
        steps: [
          { id: "step-1", next: ["step-2"] },
          { id: "step-2", next: ["step-3"] },
          { id: "step-3", next: ["step-2"] }, // Cycle B -> C -> B
        ],
      };

      expect(() => executionService.validateDefinition(definition)).toThrow(/Cycle detected/);
    });
  });
});
