# Product Roadmap

The AIOps Hub product roadmap is structured into versioned sprints, taking the application from monorepo orchestration to multi-agent production deployment.

## Sprints & Release Timeline

### ✅ v0.1.0 — Sprint 0 & 1: Authentication Core
- Setup monorepo workspaces, Turborepo configurations, Docker services (Postgres, Redis).
- Implemented cookie-based JWT access and stateful refresh session rotation.
- Created `JwtAccessGuard` and `@CurrentUser()` decorator modules.
- Formulated security safeguards including rotation reuse invalidation, token hashes, and XSS cookie protection.
- Passed 30+ unit/integration tests with 100% build validity.

### ✅ v0.2.0 — Sprint 1: Organizations & RBAC
- Organization CRUD and tenant isolation pipelines.
- Organization switcher components and header contexts.
- Role-Based Access Control (RBAC) guards mapping user permissions.
- Fine-grained permission matrices and pure resource policies.

### ✅ v0.3.0 — Sprint 2: AIOps Core (AI Infrastructure & Telemetry)
- Integrated Provider Management (`AiProviderFactory`, credentials encryption).
- Built Prompts Library with versioned templates and dynamic variable rendering.
- Implemented Chat Service featuring Server-Sent Events (SSE) streaming.
- Developed Conversation Memory Engine supporting context budget allocation and background summarization workers.
- Formulated Usage & Cost Analytics platforms capturing token counts, cost estimation metrics, latency, and status groupings.

### ⏳ v0.4.0 — Sprint 3: File Management & Vector Store
- S3/MinIO upload pipelines and tenant workspace object buckets.
- Qdrant Vector database configuration, embeddings, and document parsing.

### ⏳ v0.5.0 — Sprint 4: AI Agents
- LangGraph orchestration for multi-agent workflows.

### ⏳ v1.0.0 — Sprint 5: Workflow Automation & Production Deployments
- Webhook triggers, sequential action runners, and Terraform orchestration.
