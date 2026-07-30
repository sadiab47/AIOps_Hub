export type WorkflowStepType = "AGENT" | "TOOL" | "CONDITION" | "PARALLEL";

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  config: Record<string, any>;
  next?: string[];
}

export interface WorkflowDefinition {
  version: number;
  entryStepId: string;
  steps: WorkflowStep[];
}
