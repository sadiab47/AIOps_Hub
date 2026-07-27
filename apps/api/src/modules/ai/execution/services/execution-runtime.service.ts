import { Injectable, Logger } from "@nestjs/common";
import { AiProviderFactory } from "../../../../common/ai/factories/ai-provider.factory";
import { ToolLoopService } from "./tool-loop.service";
import { ExecutionService } from "./execution.service";
import { ExecutionContext } from "../interfaces/execution.interface";

import { CredentialService } from "../../../../common/ai/services/credential.service";

@Injectable()
export class ExecutionRuntimeService {
  private readonly logger = new Logger(ExecutionRuntimeService.name);

  constructor(
    private readonly providerFactory: AiProviderFactory,
    private readonly toolLoopService: ToolLoopService,
    private readonly executionService: ExecutionService,
    private readonly credentialService: CredentialService,
  ) {}

  async run(
    context: ExecutionContext,
    onSseEvent?: (event: string, data: any) => void,
  ): Promise<any> {
    const startTime = Date.now();

    if (onSseEvent) {
      onSseEvent("start", { executionId: context.executionId });
      onSseEvent("metadata", {
        executionId: context.executionId,
        provider: context.provider,
        model: context.model,
        agentVersion: context.version.version,
      });
    }

    const providerClient = this.providerFactory.getProvider(context.provider);
    let messages = [...context.memory];

    // If there's a system prompt linked
    if (context.promptVersion) {
      messages.unshift({
        role: "system",
        content: context.promptVersion.template,
      });
    }

    let iterations = 0;
    const maxIterations = context.version.retryLimit || 10;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let finalOutput = "";
    const toolsInvokedList: any[] = [];

    while (iterations < maxIterations) {
      iterations++;

      const toolsParam =
        context.availableTools.length > 0
          ? context.availableTools.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.inputSchema,
              },
            }))
          : undefined;

      // Resolve and decrypt provider credentials
      const credentials = this.credentialService.decryptCredentials(
        context.version.providerConfig.encryptedCredentials,
      );
      const response = await providerClient.generateCompletion(
        {
          model: context.model,
          messages,
          temperature: context.version.temperature,
          maxTokens: context.version.maxTokens || undefined,
        },
        credentials,
      );

      totalPromptTokens += response.usage?.promptTokens || 0;
      totalCompletionTokens += response.usage?.completionTokens || 0;

      const assistantMessage = {
        role: "assistant",
        content: response.content,
        toolCalls: (response as any).toolCalls || [],
      };
      messages.push(assistantMessage);

      // If we have token stream delta updates in SSE mode
      if (assistantMessage.content && onSseEvent) {
        onSseEvent("token", { text: assistantMessage.content });
      }

      if (
        response.finishReason === "stop" ||
        !assistantMessage.toolCalls ||
        assistantMessage.toolCalls.length === 0
      ) {
        finalOutput = assistantMessage.content || "";
        break;
      }

      // We have tool calls requests
      const allowedToolIds = context.availableTools.map((t) => t.name);

      const { toolOutputs } = await this.toolLoopService.executeToolLoop(
        context.executionId,
        assistantMessage.toolCalls,
        allowedToolIds,
        onSseEvent,
      );

      for (const call of assistantMessage.toolCalls) {
        toolsInvokedList.push({
          toolId: call.function?.name || call.name,
          arguments: call.function?.arguments || call.arguments,
        });
      }

      // Append tool outputs and rerun cycle loop
      messages = [...messages, ...toolOutputs];
    }

    if (iterations >= maxIterations) {
      throw new Error(
        `Execution exceeded maximum iterations cap threshold of ${maxIterations} cycles`,
      );
    }

    const latencyMs = Date.now() - startTime;
    const cost = totalPromptTokens * 0.00001 + totalCompletionTokens * 0.00003; // Approximate cost formula

    await this.executionService.completeExecution(
      context.executionId,
      context.organizationId,
      context.agent.id,
      { text: finalOutput },
      {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        latencyMs,
        cost,
        toolsInvoked: toolsInvokedList,
      },
    );

    if (onSseEvent) {
      onSseEvent("usage", {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        latencyMs,
        estimatedCostUsd: cost,
      });
      onSseEvent("complete", { output: { text: finalOutput } });
    }

    return { text: finalOutput };
  }
}
