# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### AUTH-003 - Refresh Token

#### Added
- Refresh token rotation endpoint (`POST /api/v1/auth/refresh`)
- Integrated `cookie-parser` middleware inside NestJS app bootstrap
- Added `findById` and `updateTokenHash` query methods to `RefreshTokenRepository`
- Added `rotateSession` and `findActiveSession` to `SessionService`
- Exported `USER_REPOSITORY_TOKEN` from `UsersModule` to resolve cross-module dependency injections

#### Testing
- Added comprehensive unit tests in `auth.service.spec.ts` for token verification, expiration validation, revocation checking, user account status, and reuse detection
- Implemented supertest integration tests inside `auth.integration.spec.ts` testing the complete register -> login -> refresh -> reuse block lifecycles

#### Security
- Implemented automated Refresh Token Reuse Detection which immediately invalidates all active sessions for a user upon detecting a replay/reuse attempt
- Added security audit logs: `TOKEN_REFRESH_SUCCESS`, `TOKEN_REFRESH_FAILED`, and `TOKEN_REUSE_DETECTED`
- Enforced atomic cookie replacement (overwriting both access and refresh cookies) on rotation

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
