import { Injectable, NotFoundException } from "@nestjs/common";
import { ToolRegistry } from "./tool-registry.service";
import { AgentTool } from "../interfaces/tool.interface";

@Injectable()
export class ToolResolver {
  constructor(private readonly registry: ToolRegistry) {}

  resolve(name: string): AgentTool {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new NotFoundException(`Tool '${name}' not found in registry.`);
    }
    return tool;
  }
}
