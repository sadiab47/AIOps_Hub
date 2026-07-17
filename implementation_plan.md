# AIOps Hub Monorepo Setup & Week 1 Foundation

This plan outlines the steps to initialize the AIOps Hub project structure as a Turborepo monorepo using pnpm workspaces, and build the initial Next.js, NestJS, and Database foundation.

## User Review Required

> [!IMPORTANT]
> Since `pnpm` is not globally installed, we will first install it globally via `npm install -g pnpm`, or run it via `npx pnpm` if prefered. We will proceed with installing it globally to ensure smooth workspace commands.
> We will also require docker-compose running locally for PostgreSQL.

## Proposed Changes

### Root Configuration

#### [NEW] [pnpm-workspace.yaml](file:///e:/AIOps_Hub/pnpm-workspace.yaml)
Define the workspaces matching our Repository Structure:
- `apps/*`
- `packages/*`

#### [NEW] [package.json](file:///e:/AIOps_Hub/package.json)
Configure monorepo root settings, dependencies (like `turbo`), and setup scripts.

#### [NEW] [turbo.json](file:///e:/AIOps_Hub/turbo.json)
Configure Turborepo pipelines for `build`, `lint`, `dev`, and database migrations.

### Core Apps & Packages

#### [NEW] Next.js Web App in `apps/web`
Initialize a Next.js 15 app inside `apps/web` with TypeScript, Tailwind CSS, and shadcn/ui.
This will contain the Dashboard shell.

#### [NEW] NestJS API in `apps/api`
Initialize a NestJS API server inside `apps/api`.
Configure NestJS modules, including the Authentication module (JWT/Session based) and DB connections.

#### [NEW] Database Configuration in `packages/db` or root
Add Docker Compose (`docker-compose.yml`) containing PostgreSQL and Redis.
Initialize Prisma schema mapping `User`, `Session`, `Organization` models.

## Verification Plan

### Automated Tests
- Build verification: `pnpm build`
- Dev server execution: `pnpm dev`
- Prisma lint/generate validation

### Manual Verification
- Test NestJS REST API endpoints (health checks, login).
- Test UI responsiveness and login pages of Next.js app.
