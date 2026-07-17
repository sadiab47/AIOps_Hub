# 01 Roadmap

The AIOps Hub product roadmap is structured into 6 distinct Sprints, moving from initial scaffolding to production deployment.

## Sprints Summary

### ✅ Sprint 0: Infrastructure & Foundation
- Setup monorepo workspaces and Turborepo configurations.
- Configure Docker local Postgres & Redis services.
- Establish shared Prisma client package.
- Bootstrap NestJS & Next.js skeletons with validation/logging pipelines.

### ⏳ Sprint 1: Authentication & Organizations
- Cookie-based session auth and bearer tokens hybrid design.
- Organization CRUD and context routing.
- Role-Based Access Control (RBAC).

### ⏳ Sprint 2: File Management
- Tenant S3/MinIO upload integrations.
- Document parsing and text chunking engines.
- Asynchronous BullMQ background worker setups.

### ⏳ Sprint 3: AI Knowledge Base
- Qdrant Vector database configuration.
- Embeddings models and metadata mapping.
- Chat UI with source citations.

### ⏳ Sprint 4: AI Agents
- LangGraph orchestration for multi-agent workflows.
- Dynamic prompts and context memory.

### ⏳ Sprint 5: Workflow Automation
- Sequential action runner engines.
- Webhook trigger structures and integration APIs.

### ⏳ Sprint 6: Production Deployment
- CI/CD deployments and AWS Terraform modules.
