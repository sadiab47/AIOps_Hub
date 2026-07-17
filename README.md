# AIOps Hub

[![CI Build Status](https://github.com/sadiab47/AIOps_Hub/actions/workflows/ci.yml/badge.svg)](https://github.com/sadiab47/AIOps_Hub/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node-Check%20%3E%3D22.0.0-blue.svg)](https://nodejs.org)
[![Package Manager](https://img.shields.io/badge/pnpm-v11.x-orange.svg)](https://pnpm.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/sadiab47/AIOps_Hub/pulls)

A production-ready, multi-tenant **AI Automation Platform** designed as a reusable foundation for premium enterprise consulting. 

---

## 🚀 Key Features

* **Multi-Tenant Architecture**: Deep database division from Day 1 utilizing PostgreSQL schemas, user memberships, and role-based access control (RBAC).
* **Robust Backend Design**: Built on **NestJS**, utilizing a framework-isolated Repository pattern separating business logic from Prisma ORM interfaces.
* **Modern Frontend**: Built with **Next.js 15**, React 19, Tailwind CSS, and global state management.
* **Auditing & Soft Deletes**: Built-in tracking of database entities with soft-deletes (`deletedAt`) and detailed audit logs.
* **Production Observability**: Built-in global validation pipes via `class-validator`, Zod-based environment configurations, and high-performance Pino logging.
* **Local Infrastructure Services**: Self-contained local Postgres & Redis instances managed via Docker Compose.

---

## 🏛️ System Architecture

```mermaid
graph TD
    %% Clients
    User([User Browser])
    APIClient([Third Party API/CLI])

    subgraph apps/web [Next.js 15 Web Client]
        UI[UI Dashboard / React 19]
        CookieSession[HTTP-only Cookie Auth]
    end

    subgraph apps/api [NestJS API Gateway]
        V1[api/v1 Router]
        ZodEnv[Zod Env Validator]
        Validation[Global Validation Pipe]
        Pino[Pino Logger]
        
        subgraph Modules
            AuthMod[Auth Module]
            OrgMod[Org Module]
            HealthMod[Health Module]
        end

        subgraph Repositories [DDD Repositories]
            UserRepo[User Repository]
            OrgRepo[Org Repository]
        end
    end

    subgraph packages/db [Database Package]
        Prisma[Prisma Client]
    end

    subgraph infra [Docker Infra]
        DB[(PostgreSQL)]
        Queue[(Redis / BullMQ)]
    end

    %% Routing Flow
    User -->|HTTP Cookies| UI
    UI -->|JSON REST /api/v1| V1
    APIClient -->|Bearer JWT| V1
    
    %% API internal processing
    V1 --> ZodEnv
    V1 --> Validation
    V1 --> AuthMod
    V1 --> OrgMod
    V1 --> HealthMod
    
    AuthMod --> UserRepo
    OrgMod --> OrgRepo
    
    UserRepo --> Prisma
    OrgRepo --> Prisma
    
    Prisma --> DB
    AuthMod -->|Background Jobs| Queue
```

---

## 📂 Repository Workspace Structure

We orchestrate our monorepo using **Turborepo** and **pnpm workspaces**:

```text
aiops-hub/
├── apps/
│   ├── web/               # Next.js 15 Frontend
│   └── api/               # NestJS API backend
├── packages/
│   ├── db/                # Shared Database client & Prisma models
│   ├── tsconfig/          # Shared tsconfig blueprints
│   └── eslint-config/     # Shared linting configs
├── infra/
│   └── docker/            # Local Docker Compose setup (Postgres, Redis)
├── scripts/               # Project automation and setup utilities
├── docs/                  # Architecture Decision Records (ADRs) & guides
└── package.json           # Monorepo root configuration
```

---

## ⚙️ Local Development Quickstart

### Prerequisites

- [Node.js](https://nodejs.org) >= 22.0.0
- [pnpm](https://pnpm.io) >= 11.0.0
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Installation

Install all workspace dependencies and link packages:
```bash
pnpm install
```

### 2. Infrastructure Setup

Launch the local PostgreSQL database and Redis services:
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### 3. Database Migration & Client Generation

Synchronize the database schema and generate the type-safe Prisma client:
```bash
pnpm --filter @aiops-hub/db db:migrate
pnpm --filter @aiops-hub/db db:generate
```

### 4. Running the Applications

Start all applications in development mode with hot-reloading:
```bash
pnpm dev
```

- **Frontend dashboard**: [http://localhost:3000](http://localhost:3000)
- **REST API health check**: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

---

## 🤝 Contribution Guidelines

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on coding standards, conventional commit messages, and our branching strategies. We strictly adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
