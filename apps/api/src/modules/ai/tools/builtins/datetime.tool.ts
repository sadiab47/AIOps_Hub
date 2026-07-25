import { AgentTool, ToolDefinition } from '../interfaces/tool.interface';

export class DateTimeTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: 'datetime',
    description: 'Get the current date and time in a specified timezone or ISO format.',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'IANA timezone name (e.g., UTC, America/New_York). Defaults to UTC.',
        },
      },
      additionalProperties: false,
    },
  };

  async execute(input?: { timezone?: string }): Promise<{ iso: string; formatted: string; timezone: string }> {
    const tz = input?.timezone || 'UTC';
    try {
      const date = new Date();
      // Test timezone validity by attempting formatting
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'long',
      });
      return {
        iso: date.toISOString(),
        formatted: formatter.format(date),
        timezone: tz,
      };
    } catch (err: any) {
      throw new Error(`Invalid timezone: ${tz}. Error: ${err.message}`);
    }
  }
}
