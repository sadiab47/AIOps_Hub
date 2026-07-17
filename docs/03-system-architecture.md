# 03 System Architecture

AIOps Hub is structured as a modular monolith running in containerized environments.

## Component Overview

### Frontend Client (`apps/web`)
- A React-based web dashboard built inside Next.js 15.
- Connects to the API Gateway using standard HTTP requests.

### Backend API (`apps/api`)
- A NestJS-based API Gateway.
- Hosts route modules (Auth, Org, Document, AI).
- Exposes API v1 endpoints.

### Shared DB Package (`packages/db`)
- Centralized database configuration.
- Generates Prisma client types shared across the monorepo workspace.

### Services Layer
- Worker processes (`services/worker`) consuming job payloads from Redis queues.

---

## Block Diagram

Refer to the root [README.md](../../README.md#🏛️-architecture) or the [system-architecture diagram](diagrams/system-architecture.md) for details.
