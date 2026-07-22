import { PromptVariableEngineService } from '../services/prompt-variable-engine.service';

describe('PromptVariableEngineService', () => {
  let service: PromptVariableEngineService;

  beforeEach(() => {
    service = new PromptVariableEngineService();
  });

  describe('extractVariables', () => {
    it('should extract variables accurately and ignore whitespace inside curly braces', () => {
      const template = 'Hello {{ name }}, welcome to {{company}}! Please contact {{ support_email }}.';
      const variables = service.extractVariables(template);
      expect(variables).toEqual(['name', 'company', 'support_email']);
    });

    it('should return empty array when no variables exist', () => {
      const template = 'Hello world, this is a plain text template without variables.';
      const variables = service.extractVariables(template);
      expect(variables).toEqual([]);
    });

    it('should deduplicate repeating variables', () => {
      const template = 'Hello {{name}}! Repeat {{name}} and {{name}} again.';
      const variables = service.extractVariables(template);
      expect(variables).toEqual(['name']);
    });
  });

  describe('validateVariables', () => {
    it('should identify missing required variables and identify unused variables', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!';
      const inputs = { name: 'Alice', unusedVar: 'test' };

      const { required, missing, unused } = service.validateVariables(template, inputs);

      expect(required).toEqual(['name', 'company']);
      expect(missing).toEqual(['company']);
      expect(unused).toEqual(['unusedVar']);
    });
  });

  describe('render & preview', () => {
    it('should replace placeholder variables and leave missing variables blank', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!';
      const inputs = { name: 'Bob' };

      const result = service.render(template, inputs);
      expect(result).toBe('Hello Bob, welcome to !');
    });

    it('should return rich preview diagnostics', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!';
      const inputs = { name: 'Bob', age: '30' };

      const preview = service.preview(template, inputs);
      expect(preview.rendered).toBe('Hello Bob, welcome to !');
      expect(preview.variables).toEqual(['name', 'company']);
      expect(preview.missing).toEqual(['company']);
      expect(preview.unused).toEqual(['age']);
    });
  });
});
