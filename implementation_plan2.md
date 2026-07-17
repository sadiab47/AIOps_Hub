# AIOps Hub Implementation Plan - Sprint 0: Infrastructure & Foundation

This plan implements **Sprint 0: Infrastructure & Foundation** as defined by the updated architectural guidelines. We will establish the monorepo structure, local services (PostgreSQL, Redis) via Docker, shared packages (tsconfig, eslint-config, Prisma DB), and basic NestJS / Next.js app skeletons with health check endpoints.

## Proposed Changes

### 1. Monorepo & Workspaces

#### [NEW] [pnpm-workspace.yaml](file:///e:/AIOps_Hub/pnpm-workspace.yaml)
Configure the workspaces:
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
```

#### [NEW] [package.json](file:///e:/AIOps_Hub/package.json)
Configure global scripts (`dev`, `build`, `lint`, `db:migrate`, `db:generate`) using Turborepo and workspace settings.

#### [NEW] [turbo.json](file:///e:/AIOps_Hub/turbo.json)
Define Turborepo pipeline with task dependencies:
- `build`: depends on `^build`
- `db:generate`: cache outputs
- `db:migrate`: no-cache
- `lint`: cache outputs
- `dev`: persistent

#### [NEW] `packages/tsconfig` and `packages/eslint-config`
Establish shared configuration packages for compiler and linting options.

---

### 2. Infrastructure & Shared DB

#### [NEW] [docker-compose.yml](file:///e:/AIOps_Hub/infra/docker/docker-compose.yml)
Define local services:
- **PostgreSQL** (v16) for primary storage.
- **Redis** (v7) for caching and background jobs (BullMQ).

#### [NEW] Prisma Schema in `packages/db`
Initialize Prisma schema (`packages/db/prisma/schema.prisma`) using:
- **UUIDs** for all entity IDs (`id String @id @default(uuid()) @db.Uuid`).
- **Soft Delete** columns (`deletedAt DateTime?`).
- Audit fields (`createdAt`, `updatedAt`).
- Core models: `User`, `Organization`, `Member`, `AuditLog`.

Add a Prisma service provider to export the `PrismaClient` to other applications.

---

### 3. Backend API (`apps/api`)

#### [NEW] NestJS Skeleton
Initialize NestJS in `apps/api` with:
- Global prefix: `api/v1` (explicit versioning).
- Environment variable validation using **Zod** in `src/common/config`.
- Logger setup (Pino).
- Global validation pipe using `class-validator` and `class-transformer`.
- Database module wrapping the shared `packages/db` Prisma client with custom repositories.
- Health Check module (`/api/v1/health`) checking database and Redis connection.

---

### 4. Next.js Frontend (`apps/web`)

#### [NEW] Next.js Skeleton
Initialize Next.js 15 in `apps/web` with:
- Tailwind CSS & Tailwind-compatible CSS.
- Basic routing structure and placeholder for the dashboard.
- Configured environment variable validation.

---

### 5. CI/CD Pipeline

#### [NEW] [.github/workflows/ci.yml](file:///e:/AIOps_Hub/.github/workflows/ci.yml)
Create a GitHub Actions workflow to run checks on PRs and pushes to main:
- pnpm install
- Linting checks (`turbo lint`)
- Type checking (`turbo typecheck`)
- Build checks (`turbo build`)

---

## Verification Plan

### Automated Tests
- Run `npx turbo run build` to ensure all packages and applications compile successfully.
- Run `npx turbo run lint` to verify lint rules.

### Manual Verification
- Start docker compose: `docker compose -f infra/docker/docker-compose.yml up -d`
- Run Prisma migrations: `pnpm --filter db db:migrate` or similar.
- Validate health check: `curl http://localhost:3001/api/v1/health` (should return `{ status: "ok", db: "up", redis: "up" }`).
- Launch dev servers: `pnpm dev` and view frontend/backend working.
