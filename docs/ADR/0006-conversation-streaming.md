# ADR 0006: Conversation & Streaming Architecture

## Status
Accepted

## Context
To build a production-grade chat module, we need a standardized approach to manage conversation lifecycles, real-time message streaming (SSE), resilient connection retries, provider timeout handling, client cancellations, context trimming, and domain events.

## Decisions

### 1. Conversation Lifecycle
- Conversations are created on demand.
- Supports state transitions: `ACTIVE`, `ARCHIVED`, `DELETED`.

### 2. Message Persistence & Roles
- Messages are persisted immediately in the database.
- Standard roles: `SYSTEM`, `USER`, `ASSISTANT`, `TOOL`.

### 3. Server-Sent Events (SSE) Format
- Encoded using standard Event Source formats:
  - `event: start` -> Start message payload.
  - `event: metadata` -> Yields provider and model keys.
  - `event: token` -> Yields raw token character chunks.
  - `event: usage` -> Yields prompt/completion token count and cost estimations.
  - `event: error` -> Yields failure codes.
  - `event: done` -> Final string indicator `[DONE]`.

### 4. Resilient Streaming & Cancellations
- Client-triggered cancellations (e.g. AbortController) result in the stream aborting, partial messages being saved up to the cancellation point, and status logged as `CANCELLED`.
- Latency and token accounting are computed and saved asynchronously using domain events.

### 5. Memory Management
- Budget calculations slice messages into system instruction buffers, sliding history windows, and compressed background summaries.

## Consequences
- Clean separation of real-time streaming operations from data analytics processing.
- Highly scalable memory configurations with zero impact on main execution latency.
