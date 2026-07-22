import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptVariableEngineService {
  private readonly variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

  /**
   * Extracts all unique variable names from a Handlebars/Mustache style template.
   */
  extractVariables(template: string): string[] {
    const variables = new Set<string>();
    let match;
    // Reset regex index
    this.variableRegex.lastIndex = 0;
    while ((match = this.variableRegex.exec(template)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  }

  /**
   * Identifies missing required variables and any unused inputs.
   */
  validateVariables(
    template: string,
    inputs: Record<string, string>,
  ): { required: string[]; missing: string[]; unused: string[] } {
    const required = this.extractVariables(template);
    const inputKeys = Object.keys(inputs);

    const missing = required.filter((reqVar) => !inputKeys.includes(reqVar));
    const unused = inputKeys.filter((inputVar) => !required.includes(inputVar));

    return {
      required,
      missing,
      unused,
    };
  }

  /**
   * Safely interpolates variables into the template.
   */
  render(template: string, inputs: Record<string, string>): string {
    const { required } = this.validateVariables(template, inputs);
    let rendered = template;

    for (const key of required) {
      const val = inputs[key] ?? '';
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, val);
    }

    return rendered;
  }

  /**
   * Detailed validation and rendering output for frontend previewing.
   */
  preview(
    template: string,
    inputs: Record<string, string>,
  ): {
    rendered: string;
    variables: string[];
    missing: string[];
    unused: string[];
  } {
    const { required, missing, unused } = this.validateVariables(template, inputs);
    const rendered = this.render(template, inputs);

    return {
      rendered,
      variables: required,
      missing,
      unused,
    };
  }
}
