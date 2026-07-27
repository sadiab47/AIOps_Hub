import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ToolRegistry } from "../tools/services/tool-registry.service";
import { ToolResolver } from "../tools/services/tool-resolver.service";
import { ToolExecutor } from "../tools/services/tool-executor.service";
import { AgentTool } from "../tools/interfaces/tool.interface";
import { CalculatorTool } from "../tools/builtins/calculator.tool";
import { DateTimeTool } from "../tools/builtins/datetime.tool";
import { UuidGeneratorTool } from "../tools/builtins/uuid-generator.tool";
import { JsonUtilsTool } from "../tools/builtins/json-utils.tool";
import { TextUtilsTool } from "../tools/builtins/text-utils.tool";
import { HttpClientTool } from "../tools/builtins/http-client.tool";

describe("Tool Framework (AGENT-002)", () => {
  let registry: ToolRegistry;
  let resolver: ToolResolver;
  let executor: ToolExecutor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToolRegistry, ToolResolver, ToolExecutor],
    }).compile();

    registry = module.get<ToolRegistry>(ToolRegistry);
    resolver = module.get<ToolResolver>(ToolResolver);
    executor = module.get<ToolExecutor>(ToolExecutor);
  });

  describe("ToolRegistry & ToolResolver", () => {
    it("should register and resolve tools correctly", () => {
      const mockTool: AgentTool = {
        definition: {
          name: "test_tool",
          description: "A mock test tool",
          inputSchema: { type: "object", properties: {} },
        },
        execute: jest.fn().mockResolvedValue("success"),
      };

      registry.register(mockTool);
      expect(registry.has("test_tool")).toBe(true);
      expect(registry.has("TEST_TOOL")).toBe(true); // Case insensitivity

      const resolved = resolver.resolve("test_tool");
      expect(resolved).toBe(mockTool);
    });

    it("should throw ConflictException on duplicate name registration", () => {
      const mockTool1: AgentTool = {
        definition: {
          name: "duplicate_tool",
          description: "First version",
          inputSchema: { type: "object" },
        },
        execute: jest.fn(),
      };

      const mockTool2: AgentTool = {
        definition: {
          name: "DUPLICATE_TOOL",
          description: "Second version",
          inputSchema: { type: "object" },
        },
        execute: jest.fn(),
      };

      registry.register(mockTool1);
      expect(() => registry.register(mockTool2)).toThrow(ConflictException);
    });

    it("should throw NotFoundException when resolving unregistered tool", () => {
      expect(() => resolver.resolve("non_existent")).toThrow(NotFoundException);
    });
  });

  describe("ToolExecutor", () => {
    let mockTool: AgentTool;

    beforeEach(() => {
      mockTool = {
        definition: {
          name: "schema_tool",
          description: "Schema testing tool",
          inputSchema: {
            type: "object",
            properties: {
              value: { type: "number" },
            },
            required: ["value"],
          },
        },
        execute: jest.fn().mockImplementation(async (input) => input.value * 2),
      };
    });

    it("should validate inputs successfully and execute", async () => {
      const result = await executor.execute(mockTool, { value: 10 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(20);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(mockTool.execute).toHaveBeenCalledWith({ value: 10 });
    });

    it("should return failure result on invalid schema inputs", async () => {
      const result = await executor.execute(mockTool, {
        value: "not-a-number",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
      expect(mockTool.execute).not.toHaveBeenCalled();
    });

    it("should wrap runtime execution exceptions cleanly", async () => {
      const failingTool: AgentTool = {
        definition: {
          name: "failing_tool",
          description: "Will fail",
          inputSchema: { type: "object" },
        },
        execute: jest.fn().mockRejectedValue(new Error("Internal breakdown")),
      };

      const result = await executor.execute(failingTool, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Internal breakdown");
    });
  });

  describe("Built-in Tools", () => {
    describe("CalculatorTool", () => {
      const calculator = new CalculatorTool();

      it("should add, subtract, multiply, and divide numbers", async () => {
        await expect(
          calculator.execute({ operation: "add", a: 10, b: 5 }),
        ).resolves.toBe(15);
        await expect(
          calculator.execute({ operation: "subtract", a: 10, b: 5 }),
        ).resolves.toBe(5);
        await expect(
          calculator.execute({ operation: "multiply", a: 10, b: 5 }),
        ).resolves.toBe(50);
        await expect(
          calculator.execute({ operation: "divide", a: 10, b: 5 }),
        ).resolves.toBe(2);
      });

      it("should throw error on division by zero", async () => {
        await expect(
          calculator.execute({ operation: "divide", a: 10, b: 0 }),
        ).rejects.toThrow("Division by zero is not allowed");
      });
    });

    describe("DateTimeTool", () => {
      const datetime = new DateTimeTool();

      it("should return current date/time structures", async () => {
        const result = await datetime.execute();
        expect(result.iso).toBeDefined();
        expect(result.formatted).toBeDefined();
        expect(result.timezone).toBe("UTC");
      });

      it("should support timezone parameter", async () => {
        const result = await datetime.execute({ timezone: "America/New_York" });
        expect(result.timezone).toBe("America/New_York");
      });

      it("should reject invalid timezones", async () => {
        await expect(
          datetime.execute({ timezone: "Invalid/Zone" }),
        ).rejects.toThrow();
      });
    });

    describe("UuidGeneratorTool", () => {
      const uuidGen = new UuidGeneratorTool();

      it("should generate a list of UUIDs matching the count", async () => {
        const result = await uuidGen.execute({ count: 5 });
        expect(result).toHaveLength(5);
        result.forEach((id) => {
          expect(id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );
        });
      });
    });

    describe("JsonUtilsTool", () => {
      const jsonUtils = new JsonUtilsTool();

      it("should format, minify, and parse json payloads", async () => {
        const payload = '{"hello":"world"}';
        const parsed = await jsonUtils.execute({ action: "parse", payload });
        expect(parsed).toEqual({ hello: "world" });

        const stringified = await jsonUtils.execute({
          action: "stringify",
          payload,
          spaces: 4,
        });
        expect(stringified).toContain('\n    "hello"');

        const minified = await jsonUtils.execute({ action: "minify", payload });
        expect(minified).toBe(payload);
      });
    });

    describe("TextUtilsTool", () => {
      const textUtils = new TextUtilsTool();

      it("should lowercase, uppercase, trim, stats, and replace texts", async () => {
        await expect(
          textUtils.execute({ action: "lowercase", text: "HELLO" }),
        ).resolves.toBe("hello");
        await expect(
          textUtils.execute({ action: "uppercase", text: "world" }),
        ).resolves.toBe("WORLD");
        await expect(
          textUtils.execute({ action: "trim", text: "  text  " }),
        ).resolves.toBe("text");

        const stats = await textUtils.execute({
          action: "stats",
          text: "Hello world\nAnother line",
        });
        expect(stats).toEqual({ charCount: 24, wordCount: 4, lineCount: 2 });

        const replaced = await textUtils.execute({
          action: "replace",
          text: "one apple, two apples",
          replaceTarget: "apple",
          replaceValue: "banana",
        });
        expect(replaced).toBe("one banana, two bananas");
      });
    });

    describe("HttpClientTool", () => {
      const client = new HttpClientTool();

      it("should reject access to domains not in the allow-list", async () => {
        await expect(
          client.execute({
            method: "GET",
            url: "https://malicious-endpoint.com/api/data",
          }),
        ).rejects.toThrow(
          "Domain 'malicious-endpoint.com' is not in the allow-list",
        );
      });

      it("should request allow-listed domains successfully (using mock endpoint)", async () => {
        // Mock fetch globally
        const mockResponse = {
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: async () => ({ ok: true }),
        };
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await client.execute({
          method: "GET",
          url: "https://httpbin.org/json",
        });
        expect(result.status).toBe(200);
        expect(result.data).toEqual({ ok: true });

        global.fetch = originalFetch;
      });
    });
  });
});
