# Product Roadmap

The AIOps Hub product roadmap is structured into versioned sprints, taking the application from monorepo orchestration to multi-agent production deployment.

## Sprints & Release Timeline

### ✅ v0.1.0 — Authentication Core

- Setup monorepo workspaces, Turborepo configurations, Docker services (Postgres, Redis).
- Implemented cookie-based JWT access and stateful refresh session rotation.
- Created `JwtAccessGuard` and `@CurrentUser()` decorator modules.
- Formulated security safeguards including rotation reuse invalidation, token hashes, and XSS cookie protection.
- Passed 30+ unit/integration tests with 100% build validity.

### ✅ v0.2.0 — Organizations & RBAC

- Organization CRUD and tenant isolation pipelines.
- Organization switcher components and header contexts.
- Role-Based Access Control (RBAC) guards mapping user permissions.
- Fine-grained permission matrices and pure resource policies.

### ✅ v0.3.0 — AIOps Core (AI Infrastructure & Telemetry)

- Integrated Provider Management (`AiProviderFactory`, credentials encryption).
- Built Prompts Library with versioned templates and dynamic variable rendering.
- Implemented Chat Service featuring Server-Sent Events (SSE) streaming.
- Developed Conversation Memory Engine supporting context budget allocation and background summarization workers.
- Formulated Usage & Cost Analytics platforms capturing token counts, cost estimation metrics, latency, and status groupings.

### ✅ v0.4.0-beta1 — Agent Platform & Frontend Shell (In Progress)

- **AGENT-001**: Agent Registry and versioning systems with optimistic locking revision counters.
- **AGENT-002**: Tool Execution Framework (AJV schema validator, registry, resolver) and built-in tools (Calculator, DateTime, UUID Generator, JSON Utils, Text Utils, Http Client).
- **AGENT-003**: Agent Execution Engine (loop orchestrator, SSE events execution streams, telemetry traces logs, and comprehensive integration testing coverage).
- **Frontend Console Layout**: React Query, Axios configured credentials instance, organization selectors, system health monitors, and user settings menus.
- **Protected Routing**: Login/signup page integrations and middleware guarding dashboard layouts.
- **Features UI**: Monaco Editor prompt templates workspaces, 5-step Agent creation wizards, Provider management panels (validation/duplication triggers), and Recharts Cost/Token analytics.
- **AGENT-004 (Next)**: Playground Chat console interface.
- **AGENT-005 (Next)**: Sequential Workflow automation engine.

### ⏳ v0.5.0 — Advanced Workflows & Integrations

- Workflow DAG orchestrators (conditions, loops, retries, parallel branches).
- **AGENT-006**: Model Context Protocol (MCP) integrations and connectors marketplace (GitHub, Slack, Jira).
- External vector data source pipelines (MinIO / Qdrant RAG configurations).
