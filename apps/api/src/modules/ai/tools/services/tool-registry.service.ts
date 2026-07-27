import { Injectable, ConflictException, Logger } from "@nestjs/common";
import { AgentTool } from "../interfaces/tool.interface";

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    const name = tool.definition.name.toLowerCase();
    if (this.tools.has(name)) {
      this.logger.error(
        `Duplicate tool registration attempted for tool: ${tool.definition.name}`,
      );
      throw new ConflictException(
        `Tool with name '${tool.definition.name}' is already registered.`,
      );
    }
    this.tools.set(name, tool);
    this.logger.log(`Registered tool: ${tool.definition.name}`);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name.toLowerCase());
  }

  has(name: string): boolean {
    return this.tools.has(name.toLowerCase());
  }

  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }
}
