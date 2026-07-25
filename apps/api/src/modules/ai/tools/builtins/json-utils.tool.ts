import { AgentTool, ToolDefinition } from '../interfaces/tool.interface';

export class JsonUtilsTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: 'json_utilities',
    description: 'Utility for safely parsing JSON strings, format/prettify JSON objects, or minifying JSON strings.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['parse', 'stringify', 'minify'],
          description: 'The JSON operation to perform.',
        },
        payload: {
          type: 'string',
          description: 'A JSON string (required for parse) or any serialized data string (required for stringify/minify).',
        },
        spaces: {
          type: 'integer',
          minimum: 0,
          maximum: 8,
          description: 'Indent spaces for formatting. Defaults to 2.',
        },
      },
      required: ['action', 'payload'],
      additionalProperties: false,
    },
  };

  async execute(input: { action: 'parse' | 'stringify' | 'minify'; payload: string; spaces?: number }): Promise<any> {
    const { action, payload, spaces = 2 } = input;

    try {
      if (action === 'parse') {
        return JSON.parse(payload);
      }

      if (action === 'stringify') {
        const obj = JSON.parse(payload);
        return JSON.stringify(obj, null, spaces);
      }

      if (action === 'minify') {
        const obj = JSON.parse(payload);
        return JSON.stringify(obj);
      }

      throw new Error(`Unsupported action: ${action}`);
    } catch (err: any) {
      throw new Error(`Invalid JSON content: ${err.message}`);
    }
  }
}
