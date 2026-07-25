import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import Ajv from 'ajv';
import { AgentTool, ToolExecutionResult } from '../interfaces/tool.interface';

@Injectable()
export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);
  private readonly ajv = new Ajv({ allErrors: true, coerceTypes: true });

  async execute(tool: AgentTool, input: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    this.logger.log(`Executing tool '${tool.definition.name}' with input: ${JSON.stringify(input)}`);

    try {
      // Validate input parameters against tool definition schema
      const validate = this.ajv.compile(tool.definition.inputSchema);
      const valid = validate(input);

      if (!valid) {
        const errors = validate.errors
          ?.map(err => `${err.instancePath || 'root'} ${err.message}`)
          .join(', ') || 'Validation failed';
        this.logger.error(`Validation failed for tool '${tool.definition.name}': ${errors}`);
        return {
          success: false,
          error: `Validation error: ${errors}`,
          durationMs: Date.now() - startTime,
        };
      }

      // Execute tool's code
      const result = await tool.execute(input);

      return {
        success: true,
        result,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      this.logger.error(`Execution failed for tool '${tool.definition.name}': ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message || 'Execution failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
