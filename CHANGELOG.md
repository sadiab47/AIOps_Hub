# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### AUTH-002 - User Login

#### Added
- User login endpoint (`POST /api/v1/auth/login`)
- Common authentication helpers (`PasswordService`, `TokenService`, `CookieService`)
- Namespaced session cookies (`aiops_access_token`, `aiops_refresh_token`)
- Device metadata support (`userAgent`, `ipAddress`) inside `RefreshToken` sessions
- User account status fields (`isActive`, `lockedAt`, `lastLoginAt`)
- Structured security auditing logs (`USER_LOGIN_SUCCESS`, `USER_LOGIN_FAILED`)
- OpenAPI documentation decorated on Auth endpoints at `/api/docs`

#### Testing
- Expanded Jest unit test suites for registration and login authentication flows
- Monorepo production build verification

#### Security
- Validation for email casing/whitespace normalization and password presence
- Generic 401 response on any failed lookup, suspension, or credential mismatch (prevents user enumeration)
- Decoupled ORM dependencies from services using abstract repository interfaces

### AUTH-001 - User Registration

#### Added
- User registration endpoint
- Password hashing with bcrypt
- JWT access and refresh tokens
- Refresh token hashing (SHA-256)
- HTTP-only cookie support
- User and RefreshToken repositories

#### Testing
- Unit tests for registration flow
- Monorepo build verification

#### Security
- Passwords stored as bcrypt hashes
- Refresh tokens stored as hashes
- HTTP-only cookies enabled

## [0.1.0] - 2026-07-17

### Added
- Monorepo structure using `pnpm` workspaces and `turbo` pipelines.
- Shared typescript (`@aiops-hub/tsconfig`) and eslint (`@aiops-hub/eslint-config`) configurations.
- Docker Compose local environment defining PostgreSQL 16 and Redis 7.
- Database package (`@aiops-hub/db`) with Prisma schema. Models defined: `User`, `Organization`, `Member`, `AuditLog` featuring UUID ids, audit dates, and soft deletes.
- NestJS API skeleton (`apps/api`) featuring Zod environment validation, Pino logging, global validation pipes, and terminus health check endpoints.
- Next.js 15 Web Application (`apps/web`) landing page configured with Tailwind CSS.
- GitHub Actions CI workflow for linting, typechecking, and verifying workspace builds.
