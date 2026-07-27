import { AgentTool, ToolDefinition } from "../interfaces/tool.interface";

export class TextUtilsTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: "text_utilities",
    description:
      "Perform text manipulations: lowercase, uppercase, trim, count words/chars, or replace substrings.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["lowercase", "uppercase", "trim", "stats", "replace"],
          description: "The text transformation action.",
        },
        text: {
          type: "string",
          description: "The input text string.",
        },
        replaceTarget: {
          type: "string",
          description:
            "The substring to search for (only required for replace action).",
        },
        replaceValue: {
          type: "string",
          description:
            "The string replacing the target (only required for replace action).",
        },
      },
      required: ["action", "text"],
      additionalProperties: false,
    },
  };

  async execute(input: {
    action: "lowercase" | "uppercase" | "trim" | "stats" | "replace";
    text: string;
    replaceTarget?: string;
    replaceValue?: string;
  }): Promise<any> {
    const { action, text, replaceTarget, replaceValue } = input;

    switch (action) {
      case "lowercase":
        return text.toLowerCase();
      case "uppercase":
        return text.toUpperCase();
      case "trim":
        return text.trim();
      case "stats":
        return {
          charCount: text.length,
          wordCount: text.trim().split(/\s+/).filter(Boolean).length,
          lineCount: text.split("\n").length,
        };
      case "replace":
        if (replaceTarget === undefined || replaceValue === undefined) {
          throw new Error(
            "Parameters 'replaceTarget' and 'replaceValue' are required for action 'replace'.",
          );
        }
        return text.replaceAll(replaceTarget, replaceValue);
      default:
        throw new Error(`Unsupported text action: ${action}`);
    }
  }
}
