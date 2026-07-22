import { Injectable } from '@nestjs/common';
import { MessageRole } from '@aiops-hub/db';
import { ChatMessageInput } from '../../../common/ai/types/ai-provider.interface';

@Injectable()
export class ContextBuilder {
  /**
   * Assembles the final ChatMessageInput array from summary, system prompt, and message history.
   */
  assemble(
    systemPrompt: string | null,
    summaryText: string | null,
    messages: { role: MessageRole; content: string }[],
  ): ChatMessageInput[] {
    const context: ChatMessageInput[] = [];

    // 1. Inject primary system prompt instruction
    if (systemPrompt) {
      context.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // 2. Inject latest conversation summary if present
    if (summaryText) {
      context.push({
        role: 'system',
        content: `Summary of earlier conversation: ${summaryText}`,
      });
    }

    // 3. Append messages, mapping DB MessageRole to provider string literals
    for (const msg of messages) {
      // Avoid duplicate System message if it's already injected as the primary systemPrompt
      if (msg.role === MessageRole.SYSTEM && systemPrompt && msg.content === systemPrompt) {
        continue;
      }

      let roleVal: 'system' | 'user' | 'assistant' = 'user';
      if (msg.role === MessageRole.SYSTEM) {
        roleVal = 'system';
      } else if (msg.role === MessageRole.ASSISTANT) {
        roleVal = 'assistant';
      }

      context.push({
        role: roleVal,
        content: msg.content,
      });
    }

    return context;
  }
}
