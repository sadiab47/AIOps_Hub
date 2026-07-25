export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>; // JSON Schema v7 format object
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
}

export interface AgentTool {
  definition: ToolDefinition;
  execute(input: any): Promise<any>;
}
