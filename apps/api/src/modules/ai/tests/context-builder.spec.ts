import { Test, TestingModule } from '@nestjs/testing';
import { MessageRole } from '@aiops-hub/db';
import { ContextBuilder } from '../services/context-builder';

describe('ContextBuilder', () => {
  let builder: ContextBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContextBuilder],
    }).compile();

    builder = module.get<ContextBuilder>(ContextBuilder);
  });

  it('should assemble system prompt, latest summary, and remaining history correctly', () => {
    const systemPrompt = 'System Prompt instruction';
    const summaryText = 'This is historical context summary';
    const messages = [
      { role: MessageRole.USER, content: 'Hello' },
      { role: MessageRole.ASSISTANT, content: 'Hi there!' },
    ];

    const context = builder.assemble(systemPrompt, summaryText, messages);

    expect(context.length).toBe(4);
    expect(context[0]).toEqual({ role: 'system', content: 'System Prompt instruction' });
    expect(context[1]).toEqual({ role: 'system', content: 'Summary of earlier conversation: This is historical context summary' });
    expect(context[2]).toEqual({ role: 'user', content: 'Hello' });
    expect(context[3]).toEqual({ role: 'assistant', content: 'Hi there!' });
  });

  it('should omit duplicate system messages from history if they match the primary prompt', () => {
    const systemPrompt = 'System Prompt instruction';
    const messages = [
      { role: MessageRole.SYSTEM, content: 'System Prompt instruction' },
      { role: MessageRole.USER, content: 'Hi' },
    ];

    const context = builder.assemble(systemPrompt, null, messages);

    expect(context.length).toBe(2);
    expect(context[0]).toEqual({ role: 'system', content: 'System Prompt instruction' });
    expect(context[1]).toEqual({ role: 'user', content: 'Hi' });
  });
});
