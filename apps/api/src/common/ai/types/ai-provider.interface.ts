export interface ProviderCapabilities {
  streaming: boolean;
  embeddings: boolean;
  vision: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
}

export interface DecryptedCredentials {
  apiKey: string;
  endpoint?: string;
  apiVersion?: string;
  organizationId?: string;
}

export interface ValidationResult {
  valid: boolean;
  models: string[];
  providerVersion?: string;
  error?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface ChatMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessageInput[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  finishReason?: string;
  usage: TokenUsage;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage: TokenUsage;
}

export interface AiProvider {
  readonly providerId: string;
  readonly capabilities: ProviderCapabilities;

  generateCompletion(
    req: ChatCompletionRequest,
    credentials: DecryptedCredentials,
  ): Promise<ChatCompletionResponse>;

  streamCompletion(
    req: ChatCompletionRequest,
    credentials: DecryptedCredentials,
  ): AsyncGenerator<string, TokenUsage, void>;

  generateEmbedding(
    req: EmbeddingRequest,
    credentials: DecryptedCredentials,
  ): Promise<EmbeddingResponse>;

  validateCredentials(
    credentials: DecryptedCredentials,
  ): Promise<ValidationResult>;
}
