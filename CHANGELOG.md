# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Organization Creation**: Exposed `POST /api/v1/organizations` to create organizations with automatic owner membership assignment and audit logging in an atomic transaction.
- **Tenant Context Resolution**: Created `TenantContextGuard` to extract and validate `x-organization-id` from headers.
- **Membership Validation**: Created `MembershipGuard` to check active user-organization memberships.
- **Sequential Slug Suffixing**: Implemented auto-generating slugs with sequential suffixing (e.g. `acme`, `acme-2`) on name duplicates.
- **Request Context Standardization**: Standardized `request.context` container for multi-tenant tracing.
- **Organization Invitations**: Implemented a secure organization invitation workflow (`POST /api/v1/invitations`, `GET /api/v1/invitations`, `GET /api/v1/invitations/:token`, `POST /api/v1/invitations/:token/accept`, `DELETE /api/v1/invitations/:id`).
- **Cryptographic Token Hashing**: Added SHA-256 hashing for invitation tokens (`tokenHash`) to protect links if DB leaks.
- **Invitation Status Tracking**: Added `InvitationStatus` enum (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`).
- **Role validation**: Enforced validation blocking invitations with `OWNER` role.
- **Roles Guard (RBAC)**: Added `@Roles()` decorator and `RolesGuard` for declarative controller authorization.
- **Organization Switching**: Exposed `POST /api/v1/organizations/switch` to validate membership and issue organization contexts, and `GET /api/v1/organizations` to retrieve a list of organizations the user belongs to.
- **Request Context Enrichment**: Enriched `request.context` with timezone and locale preferences from `OrganizationSettings`.
- **Query Context Consolidation**: Added repository resolution methods to fetch organization, member, and settings contexts in a single database query, optimizing performance and eliminating N+1 DB roundtrips.

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
