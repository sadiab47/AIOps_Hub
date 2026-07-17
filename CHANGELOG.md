# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.1.0] - 2026-07-17

### Added
- **Monorepo Architecture**: Setup workspaces using `pnpm` and Turborepo configurations.
- **NestJS & Next.js Skeletons**: API and web application scaffolds with TypeScript and shared ESLint configs.
- **Dockerized Environment**: Orchestration for PostgreSQL and Redis services.
- **Prisma DB Integration**: Configured models for `User`, `Organization`, `Member`, `AuditLog`, and `RefreshToken` with relational keys.
- **User Registration**: Sign up with automatic cookie distribution (`POST /api/v1/auth/register`).
- **User Login**: Secure authentication (`POST /api/v1/auth/login`) recording login time and binding metadata.
- **Refresh Token Rotation**: Endpoint (`POST /api/v1/auth/refresh`) providing single-use token exchanges.
- **Idempotent Logout**: Current session termination (`POST /api/v1/auth/logout`) and multi-device termination (`POST /api/v1/auth/logout-all`).
- **Current User Endpoint**: Route (`GET /api/v1/auth/me`) protected by custom JWT cookie guards.
- **Authentication Core Services**: Created `AuthService`, `SessionService`, `PasswordService` (bcrypt), `TokenService` (JWT), and `CookieService` (HTTP-only).
- **JwtAccessGuard & CurrentUser Decorator**: Custom guard for access token validation and decorator for user payload extraction.
- **API Swagger Documentation**: Fully documented endpoints with request models, response types, and cookie specifications.

### Security
- **Bcrypt Hashing**: Secure password hashing to prevent plain-text exposure.
- **Token Rotation**: Dynamic rotation of refresh tokens to limit token lifespan.
- **Token Reuse Detection**: Instant revocation of all user sessions upon detecting rotated token replay/reuse.
- **SHA-256 Hashing**: Refresh tokens stored as SHA-256 hashes in the database.
- **HTTP-only Cookies**: Guard against Cross-Site Scripting (XSS) by isolating auth tokens.
- **Idempotent Cleans**: Session logouts safely clean client cookies without leaking login states.
- **Multi-Device Isolation**: Individual session tracking allowing targeted single logouts or cascading global logouts.
- **Security Auditing**: Structured audit logs for logins, failed access attempts, refreshes, token reuses, and logouts.
- **Enumeration Prevention**: Generic error responses to prevent account enumeration attacks.

### Testing
- **30 Passing Tests**: High coverage across modules.
- **Unit Testing**: Isolated verification for `AuthService` and `UsersService`.
- **Integration Testing**: Supertest integration suite verifying registration, login, token rotations, reuses, and multi-device logouts.
- **Build Verification**: Turborepo build pipeline configured for pre-commit and CI/CD validation.

### Documentation
- **Roadmap Outline**: Detailed sprint roadmap (`docs/01-roadmap.md`).
- **Architecture ADRs**: Documented patterns for Monolith architecture, Multi-Tenancy database designs, and monorepo configurations.
- **Authentication Architecture**: Exhaustive guide detailing flows, lifecycles, and security behaviors (`docs/auth-architecture.md`).
