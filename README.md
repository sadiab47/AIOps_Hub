# AIOps Hub

```text
  █████╗ ██╗ ██████╗ ██████╗ ███████╗    ██╗  ██╗██╗   ██╗██████╗ 
 ██╔══██╗██║██╔═══██╗██╔══██╗██╔════╝    ██║  ██║██║   ██║██╔══██╗
 ███████║██║██║   ██║██████╔╝███████╗    ███████║██║   ██║██████╔╝
 ██╔══██║██║██║   ██║██╔═══╝ ╚════██║    ██╔══██║██║   ██║██╔══██╗
 ██║  ██║██║╚██████╔╝██║     ███████║    ██║  ██║╚██████╔╝██████╔╝
 ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚══════╝    ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ 
```

*Production-ready, multi-tenant AI Automation Platform built with Next.js, NestJS, Prisma, PostgreSQL, Redis, LangGraph, and OpenAI.*

---

[![CI Build Status](https://github.com/sadiab47/AIOps_Hub/actions/workflows/ci.yml/badge.svg)](https://github.com/sadiab47/AIOps_Hub/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-Check%20%3E%3D22.0.0-blue.svg)](https://nodejs.org)
[![Package Manager](https://img.shields.io/badge/pnpm-v11.x-orange.svg)](https://pnpm.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/sadiab47/AIOps_Hub/pulls)

---

## 🎯 Project Vision

AIOps Hub is an enterprise-grade, multi-tenant Software-as-a-Service (SaaS) platform designed for workflow automation, custom AI agents, knowledge bases, and advanced operational integrations. Built with a robust modular monolith architecture, this codebase serves as a world-class foundation for premium AI consulting projects.

---

## 🏛️ System Architecture

```text
                    Browser
                       │
                Next.js Frontend
                       │
               NestJS REST API
                       │
      ┌───────────────┼───────────────┐
      │               │               │
 PostgreSQL        Redis          OpenAI
      │               │               │
      └──────── Prisma ───────────────┘
```

### Future Architectural Extensions

Later, our architecture will expand to support:
- **Qdrant** (Vector Database for RAG & semantic search)
- **LangGraph** (Stateful multi-agent orchestration workflows)
- **MCP** (Model Context Protocol for tool integration)
- **BullMQ Workers** (High-throughput background jobs processing)
- **S3 Storage** (Secure object storage for tenant documents)

---

## 🚀 Key Features

* **Multi-Tenant from Day 1**: Full logical tenant separation utilizing PostgreSQL schemas, membership roles, and custom workspace contexts.
* **DDD-Lite Architecture**: Structured using a Controller -> Service -> Repository layer pattern in NestJS to keep the business core isolated from the Prisma ORM.
* **Hybrid Authentication**: Secure HTTP-only cookies for the Next.js web application, paired with Bearer JWT tokens for future API, CLI, and integration access.
* **Soft Deletes & Auditing**: Strict database lifecycle tracking (`createdAt`, `updatedAt`, `deletedAt`) and an early audit log module recording admin activities.
* **API Versioning**: Scalable endpoint schema starting with `/api/v1` default versioning.
* **Strict Validation**: Mandatory Zod verification for system configurations and `class-validator` schema compliance for DTO payloads.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide Icons, TanStack Query, Zustand.
* **Backend**: NestJS, Prisma Client, `@nestjs/terminus` (Health checks).
* **AI (Sprint 3+)**: OpenAI Responses API, LangGraph, MCP, Qdrant.
* **DevOps & DB**: Docker, PostgreSQL 16, Redis 7, GitHub Actions CI/CD.

---

## 📂 Repository Workspace Structure

We manage the project as a Turborepo monorepo with `pnpm` workspaces:

```text
aiops-hub/
├── .github/
│   ├── ISSUE_TEMPLATE/    # Bug, feature, and arch markdown templates
│   └── workflows/         # Github Action CI pipelines
├── apps/
│   ├── api/               # NestJS API (Port 3001)
│   └── web/               # Next.js 15 App (Port 3000)
├── packages/
│   ├── db/                # Shared Prisma client, migrations & schema
│   ├── tsconfig/          # Shared typescript compiler profiles
│   └── eslint-config/     # Shared linting configs
├── infra/
│   └── docker/            # Docker Compose services (Postgres, Redis)
├── docs/
│   ├── ADR/               # Architecture Decision Records
│   ├── architecture/      # Architectural deep-dives
│   ├── database/          # Database schemas and design
│   ├── api/               # API contract specifications
│   └── deployment/        # Staging and production deployment guides
├── scripts/               # Utility scripts (GitHub label configs, etc.)
└── package.json           # Monorepo root config
```

---

## ⚙️ Quick Start

### Prerequisites
- Node.js >= 22.0.0
- pnpm >= 11.0.0
- Docker Desktop

### 1. Installation
Install workspace dependencies and link modules:
```bash
pnpm install
```

### 2. Infrastructure Setup
Spin up the local PostgreSQL database and Redis caches:
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### 3. Database Sync & Generate
Synchronize your local Postgres instance and compile the shared Prisma client:
```bash
pnpm --filter @aiops-hub/db db:migrate
pnpm --filter @aiops-hub/db db:generate
```

### 4. Running Locally
Start both backend and frontend servers in development mode:
```bash
pnpm dev
```
- **Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001/api/v1/health`

---

## 📅 Roadmap

### 🏁 Sprint 0: Infrastructure & Foundation (Complete)
- [x] Initialized monorepo workspace & Turborepo pipelines.
- [x] Configured PostgreSQL & Redis local environments via Docker.
- [x] Implemented global validation, Pino logging, and environment schemas.
- [x] Established `@aiops-hub/db` Prisma package (UUIDs, soft deletes).
- [x] Implemented API Versioning and `/api/v1/health` check endpoint.

### 🔑 Sprint 1: Authentication & Organizations (Upcoming)
- [ ] User register & hybrid login (JWT-cookies / API bearer tokens).
- [ ] Multi-tenant Organization context switching.
- [ ] Role-Based Access Control (RBAC) definitions.
- [ ] Audit Log recording services.

### 📁 Sprint 2: Files & Background Jobs
- [ ] Tenant S3 File upload integration.
- [ ] Document parsing engine module.
- [ ] Background job worker queues using BullMQ.

### 🧠 Sprint 3: Vector Search & AI Chat
- [ ] Qdrant Vector database setup.
- [ ] Embeddings creation & RAG indexers.
- [ ] AI chat interface with metadata citations.

### 🤖 Sprint 4: AI Agents & Custom Workflows
- [ ] LangGraph multi-agent orchestration.
- [ ] Prompt templates library & system memory.

---

## 📸 Screenshots

*Screenshots will be added as features are developed in upcoming sprints.*

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to align on our coding standards, branch conventions (`feat/`, `fix/`), and conventional commit message structures.

## 📄 License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.
