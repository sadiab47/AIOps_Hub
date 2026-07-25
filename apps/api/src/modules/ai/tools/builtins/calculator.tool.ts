import { AgentTool, ToolDefinition } from '../interfaces/tool.interface';

export class CalculatorTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: 'calculator',
    description: 'Perform basic arithmetic operations (add, subtract, multiply, divide).',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The arithmetic operation to perform.',
        },
        a: {
          type: 'number',
          description: 'The first operand.',
        },
        b: {
          type: 'number',
          description: 'The second operand.',
        },
      },
      required: ['operation', 'a', 'b'],
      additionalProperties: false,
    },
  };

  async execute(input: { operation: 'add' | 'subtract' | 'multiply' | 'divide'; a: number; b: number }): Promise<number> {
    const { operation, a, b } = input;
    switch (operation) {
      case 'add':
        return a + b;
      case 'subtract':
        return a - b;
      case 'multiply':
        return a * b;
      case 'divide':
        if (b === 0) {
          throw new Error('Division by zero is not allowed.');
        }
        return a / b;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }
}
