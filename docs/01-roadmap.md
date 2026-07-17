# Product Roadmap

The AIOps Hub product roadmap is structured into versioned sprints, taking the application from monorepo orchestration to multi-agent production deployment.

## Sprints & Release Timeline

### ✅ v0.1.0 — Sprint 0 & 1: Authentication Core
- Setup monorepo workspaces, Turborepo configurations, Docker services (Postgres, Redis).
- Implemented cookie-based JWT access and stateful refresh session rotation.
- Created `JwtAccessGuard` and `@CurrentUser()` decorator modules.
- Formulated security safeguards including rotation reuse invalidation, token hashes, and XSS cookie protection.
- Passed 30+ unit/integration tests with 100% build validity.

### 🚧 v0.2.0 — Sprint 1: Organizations & RBAC (Next Release)
- Organization CRUD and tenant isolation pipelines.
- Organization switcher components and header contexts.
- Role-Based Access Control (RBAC) guards mapping user permissions.

### ⏳ v0.3.0 — Sprint 2: File Management
- S3/MinIO upload pipelines and tenant workspace object buckets.
- Asynchronous BullMQ background worker setups.
- Document parsing, file OCR, and raw text chunking engines.

### ⏳ v0.4.0 — Sprint 3: AI Knowledge Base
- Qdrant Vector database configuration.
- Embeddings models and metadata mapping.
- Chat UI with source citations.

### ⏳ v0.5.0 — Sprint 4: AI Agents
- LangGraph orchestration for multi-agent workflows.
- Dynamic prompts and context memory.

### ⏳ v0.6.0 — Sprint 5: Workflow Automation
- Sequential action runner engines.
- Webhook trigger structures and integration APIs.

### ⏳ v1.0.0 — Sprint 6: Production Deployment
- CI/CD deployments and AWS Terraform modules.
- Production readiness check.
