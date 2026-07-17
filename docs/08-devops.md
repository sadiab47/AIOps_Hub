# 08 DevOps & Infrastructure

AIOps Hub infrastructure is built on containerized microservices and automations.

## Local Stack
Managed using Docker Compose under `infra/docker/docker-compose.yml`:
- **PostgreSQL 16**: Relational storage.
- **Redis 7**: Cache and background queues.

## CI pipeline
Orchestrated via GitHub Actions under `.github/workflows/ci.yml`:
- Runs package install.
- Verifies Prisma client schema.
- Runs lints, typechecks, and workspace compiles.
