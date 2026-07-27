import { randomUUID } from "crypto";
import { AgentTool, ToolDefinition } from "../interfaces/tool.interface";

export class UuidGeneratorTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: "uuid_generator",
    description:
      "Generate one or more cryptographically secure UUID v4 strings.",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "The number of UUIDs to generate. Defaults to 1.",
        },
      },
      additionalProperties: false,
    },
  };

  async execute(input?: { count?: number }): Promise<string[]> {
    const count = input?.count ?? 1;
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(randomUUID());
    }
    return uuids;
  }
}
