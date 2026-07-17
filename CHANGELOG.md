# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-17

### Added
- Monorepo structure using `pnpm` workspaces and `turbo` pipelines.
- Shared typescript (`@aiops-hub/tsconfig`) and eslint (`@aiops-hub/eslint-config`) configurations.
- Docker Compose local environment defining PostgreSQL 16 and Redis 7.
- Database package (`@aiops-hub/db`) with Prisma schema. Models defined: `User`, `Organization`, `Member`, `AuditLog` featuring UUID ids, audit dates, and soft deletes.
- NestJS API skeleton (`apps/api`) featuring Zod environment validation, Pino logging, global validation pipes, and terminus health check endpoints.
- Next.js 15 Web Application (`apps/web`) landing page configured with Tailwind CSS.
- GitHub Actions CI workflow for linting, typechecking, and verifying workspace builds.
