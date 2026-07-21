# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.2.0] - 2026-07-21

### Added
- **Permission Matrix (RBAC-001)**: Decoupled authorization from hardcoded role checks to fine-grained permission evaluation (`@RequirePermissions`, `@RequireAnyPermission`, `PermissionGuard`).
- **Pre-computed Role Matrix**: Pre-computed `ALL_PERMISSIONS` and wildcard `WILDCARD_PERMISSION = '*'` expansion to optimize evaluation speed per request.
- **Pure Resource Policy Engine (RBAC-002)**: Framework-independent `MemberPolicy`, `InvitationPolicy`, and `OrganizationPolicy` returning pure `PolicyResult` objects `{ allowed: boolean, reason?: string, code?: PolicyErrorCode }`.
- **Member Lifecycle Management**: Complete suite of member endpoints (`GET /members`, `GET /members/:id`, `PATCH /members/:id`, `DELETE /members/:id`, `POST /members/:id/transfer-owner`, `POST /members/leave`).
- **Role Hierarchy Enforcement**: Prevented non-owners from modifying owners or admins, blocked self-removal/self-role-edits, and restricted `OWNER` role assignments to atomic ownership transfers.
- **Organization Invitation Workflow**: Inviting users (`POST /invitations`), listing pending invitations (`GET /invitations`), metadata inspection (`GET /invitations/:token`), accepting (`POST /invitations/:token/accept`), and revoking (`DELETE /invitations/:id`).
- **Organization Switching & Settings**: Organization context switching (`POST /organizations/switch`) and administrative profile/settings updates (`PATCH /organizations/settings`).
- **Domain Event Bus**: Event publishing post-database commit (`MemberRoleChangedEvent`, `MemberRemovedEvent`, `OwnershipTransferredEvent`, `MemberLeftEvent`, `InvitationAcceptedEvent`, `InvitationRevokedEvent`).
- **Standardized API Response Envelopes**: `ResponseEnvelopeInterceptor` wrapping responses into `{ success: true, data: ..., meta: ... }` and global `GlobalHttpExceptionFilter` formatting errors into `{ success: false, error: { code, message }, requestId, timestamp }`.
- **Comprehensive OpenAPI / Swagger Docs**: Grouped endpoint tags (`Authentication`, `Organizations`, `Members`, `Invitations`), cookie-based auth schemes (`aiops_access_token`, `aiops_refresh_token`), `x-organization-id` header decorators, and realistic DTO property examples.

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
