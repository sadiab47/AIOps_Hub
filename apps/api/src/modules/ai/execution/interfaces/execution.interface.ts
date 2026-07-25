export interface ExecutionContext {
  requestId: string;
  organizationId: string;
  userId: string;
  executionId: string;
  agent: any;
  version: any;
  provider: string;
  providerConfigId: string;
  model: string;
  conversationId?: string;
  promptVersion?: any;
  memory: any[];
  availableTools: any[];
}
