# System Architecture Diagrams

This document outlines the architecture flows of the AIOps Hub platform.

## 1. Platform Hierarchy

```mermaid
graph TD
    Frontend[Next.js Frontend Console] -->|HTTPS Requests / SSE| API[NestJS API Gateway]

    subgraph NestJS Core Application
        API --> Auth[Authentication Guard]
        API --> Tenant[Tenant Context Guard]
        API --> Modules[Feature Modules: Org, AI, Auth, Health]
    end

    Modules -->|Prisma Client| Prisma[Prisma ORM Layer]
    Prisma -->|Query Operations| DB[(PostgreSQL Database)]
```

## 2. Agent Execution Runtime Flow (AGENT-003)

```mermaid
graph TD
    Client([Client API Request]) -->|POST /execute| Controller[ExecutionController]
    Controller -->|Init Session| Service[ExecutionService]
    Service -->|Start Context| Runtime[ExecutionRuntime]

    subgraph Execution Loop Runtime
        Runtime -->|Load Memory Strategy| Memory[Conversation Memory]
        Runtime -->|Process System Templates| Prompts[Prompt Library]
        Runtime -->|Format Payload| Provider[AI Provider Client]

        Provider -->|Tool Request?| ToolLoop[Tool Loop Handler]
        ToolLoop -->|Check Whitelist| Registry[Tool Registry]
        Registry -->|Execute| Tool[Agent Tool]
        Tool -->|Result| ToolLoop
        ToolLoop -->|Append Message| Provider
    end

    Provider -->|Final Answer| Telemetry[Telemetry Analytics Logs]
    Telemetry -->|Save Cost & Latency| DB[(PostgreSQL)]
```

## 3. Agent Configuration & Relations Structure

```mermaid
erDiagram
    Agent ||--o{ AgentVersion : "maintains versions"
    Agent ||--o{ AgentExecution : "tracks runs"
    AgentVersion ||--|| AiProviderConfig : "requires keys"
    AgentVersion ||--o| PromptVersion : "references prompt"
    AgentExecution ||--|| Conversation : "binds history"
    AgentExecution ||--o{ AiUsageLog : "creates telemetry"
```
