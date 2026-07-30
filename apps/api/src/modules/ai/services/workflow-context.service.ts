import { Injectable, BadRequestException } from "@nestjs/common";

export interface WorkflowExecutionContext {
  workflowExecutionId: string;
  workflowId: string;
  workflowVersionId: string;
  organizationId: string;
  userId: string;
  input: Record<string, any>;
  steps: Record<
    string,
    {
      status: string;
      output?: any;
      error?: string;
    }
  >;
}

export class WorkflowVariableResolutionError extends BadRequestException {
  constructor(public readonly variablePath: string, public readonly stepId: string) {
    super(
      `Variable resolution failed: referenced value "${variablePath}" does not exist (referenced in step "${stepId}")`,
    );
  }
}

@Injectable()
export class WorkflowContextService {
  resolve<T>(value: T, context: WorkflowExecutionContext, stepId: string): T {
    if (typeof value === "string") {
      // 1. Full value interpolation (preserves types/structures)
      const fullMatch = value.match(/^\{\{([^}]+)\}\}$/);
      if (fullMatch) {
        return this.resolvePath(fullMatch[1].trim(), context, stepId);
      }

      // 2. Inline string interpolation (combines placeholders)
      return value.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const resolved = this.resolvePath(path.trim(), context, stepId);
        return resolved !== undefined ? String(resolved) : "";
      }) as unknown as T;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolve(item, context, stepId)) as unknown as T;
    }

    if (value !== null && typeof value === "object") {
      const resolvedObj: any = {};
      for (const [k, v] of Object.entries(value)) {
        resolvedObj[k] = this.resolve(v, context, stepId);
      }
      return resolvedObj as T;
    }

    return value;
  }

  private resolvePath(path: string, context: WorkflowExecutionContext, stepId: string): any {
    const parts = path.split(".");
    let current: any = context;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (current === null || typeof current !== "object" || !(part in current)) {
        throw new WorkflowVariableResolutionError(path, stepId);
      }
      current = current[part];
    }

    return current;
  }
}
