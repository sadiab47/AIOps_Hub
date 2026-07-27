import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ToolResolver } from "../../tools/services/tool-resolver.service";
import { ToolExecutor } from "../../tools/services/tool-executor.service";
import {
  ToolInvokedEvent,
  ToolCompletedEvent,
} from "../events/execution.events";

@Injectable()
export class ToolLoopService {
  private readonly logger = new Logger(ToolLoopService.name);

  constructor(
    private readonly toolResolver: ToolResolver,
    private readonly toolExecutor: ToolExecutor,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async executeToolLoop(
    executionId: string,
    toolCalls: any[],
    allowedToolIds: string[],
    onSseEvent?: (event: string, data: any) => void,
  ): Promise<{ toolOutputs: any[]; latencyMs: number }> {
    const startTime = Date.now();
    const toolOutputs: any[] = [];

    for (const call of toolCalls) {
      const toolId = call.function?.name || call.name;
      const input =
        typeof call.function?.arguments === "string"
          ? JSON.parse(call.function.arguments)
          : call.arguments || call.input;

      if (!allowedToolIds.includes(toolId)) {
        throw new Error(`Tool unauthorized: ${toolId}`);
      }

      this.eventEmitter.emit(
        "tool.invoked",
        new ToolInvokedEvent(executionId, toolId, input),
      );
      if (onSseEvent) {
        onSseEvent("tool", { toolId, input });
      }

      const toolStartTime = Date.now();
      let output: any;
      try {
        const tool = this.toolResolver.resolve(toolId);
        if (!tool) {
          throw new Error(`Tool not found: ${toolId}`);
        }
        output = await this.toolExecutor.execute(tool, input);
      } catch (err: any) {
        output = { error: err.message };
      }

      const toolLatency = Date.now() - toolStartTime;
      this.eventEmitter.emit(
        "tool.completed",
        new ToolCompletedEvent(executionId, toolId, output, toolLatency),
      );

      if (onSseEvent) {
        onSseEvent("tool-result", { toolId, output, latencyMs: toolLatency });
      }

      toolOutputs.push({
        tool_call_id: call.id,
        role: "tool",
        name: toolId,
        content: typeof output === "string" ? output : JSON.stringify(output),
      });
    }

    return { toolOutputs, latencyMs: Date.now() - startTime };
  }
}
