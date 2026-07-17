# 06 AI Architecture

AIOps Hub encapsulates LLM and vector store interfaces away from core business modules to ensure flexibility.

## Components

### AIService
A unified service class wrapping provider operations.

### Provider Abstraction
Allows swapping AI model providers via:
- `OpenAIProvider`
- `AnthropicProvider`
- `AzureProvider`

### Vector Store (Sprint 3)
Connects to **Qdrant** to store and search documents using context embeddings.
