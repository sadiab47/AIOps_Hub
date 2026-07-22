import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  ProviderCapabilities,
  DecryptedCredentials,
  ValidationResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  TokenUsage,
} from '../types/ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  readonly providerId = 'OPENAI';

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    embeddings: true,
    vision: true,
    functionCalling: true,
    jsonMode: true,
  };

  async validateCredentials(credentials: DecryptedCredentials): Promise<ValidationResult> {
    const baseUrl = credentials.endpoint || 'https://api.openai.com/v1';

    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          ...(credentials.organizationId && { 'OpenAI-Organization': credentials.organizationId }),
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        return {
          valid: false,
          models: [],
          error: errorData?.error?.message || `Validation failed with HTTP status ${response.status}`,
        };
      }

      const data = (await response.json()) as { data: Array<{ id: string }> };
      const models = data.data.map((m) => m.id);

      return {
        valid: true,
        models,
      };
    } catch (error: any) {
      this.logger.error(`OpenAI validation error: ${error.message}`);
      return {
        valid: false,
        models: [],
        error: error.message,
      };
    }
  }

  async generateCompletion(
    req: ChatCompletionRequest,
    credentials: DecryptedCredentials,
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const baseUrl = credentials.endpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      throw new Error(errorData?.error?.message || `OpenAI request failed with status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const choice = data.choices[0];
    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
      estimatedCostUsd: this.calculateEstimatedCost(req.model, data.usage?.prompt_tokens, data.usage?.completion_tokens),
      latencyMs,
    };

    return {
      content: choice?.message?.content || '',
      finishReason: choice?.finish_reason,
      usage,
    };
  }

  async *streamCompletion(
    req: ChatCompletionRequest,
    credentials: DecryptedCredentials,
  ): AsyncGenerator<string, TokenUsage, void> {
    const startTime = Date.now();
    const baseUrl = credentials.endpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      throw new Error(errorData?.error?.message || `OpenAI streaming failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf8');
    let buffer = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || cleanLine === 'data: [DONE]') continue;
          if (cleanLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(cleanLine.slice(6));
              const choice = data.choices?.[0];
              const text = choice?.delta?.content || '';
              if (text) {
                yield text;
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs,
    };
  }

  async generateEmbedding(
    req: EmbeddingRequest,
    credentials: DecryptedCredentials,
  ): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const baseUrl = credentials.endpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model || 'text-embedding-3-small',
        input: req.input,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      throw new Error(errorData?.error?.message || `OpenAI embedding failed with status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const embeddings = data.data.map((item: { embedding: number[] }) => item.embedding);

    return {
      embeddings,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: 0,
        totalTokens: data.usage?.total_tokens ?? 0,
        estimatedCostUsd: (data.usage?.prompt_tokens ?? 0) * 0.00000002,
        latencyMs,
      },
    };
  }

  private calculateEstimatedCost(model: string, promptTokens = 0, completionTokens = 0): number {
    if (model.includes('gpt-4o')) {
      return (promptTokens * 0.000005) + (completionTokens * 0.000015);
    }
    return (promptTokens * 0.0000015) + (completionTokens * 0.000002);
  }
}
