# ADR 0004: Multi-Tenancy Architecture

## Status
Approved

## Context
AIOps Hub is designed to serve multiple corporate clients (organizations) within a single deployed instance. Data isolation between these organizations is critical for security, privacy, and regulatory compliance.

We evaluated three standard multi-tenancy database isolation levels:
1. **Database-per-Tenant**: Separate physical database instances for each tenant.
2. **Schema-per-Tenant**: Separate schemas inside a single database instance.
3. **Shared Database, Shared Schema**: All tenant data is stored in the same tables, isolated logically by a `tenantId` (or `organizationId`) column.

## Decision
We chose the **Shared Database, Shared Schema** model with strict application-level context routing.

### Implementation:
- The `Member` model connects users to `Organization` profiles with designated access roles (`OWNER`, `ADMIN`, `MEMBER`, etc.).
- Every tenant-scoped table contains an `organizationId` UUID column.
- Application repositories are configured to always filter queries by the tenant context injected from the request.

## Rationale
- **Low Hosting Cost**: Running a separate database or schema per tenant is extremely expensive and complex to scale at early stages.
- **Simple Database Migrations**: Running Prisma migrations on a single database schema is instantaneous compared to running migrations across hundreds of tenant schemas.
- **Global Dashboards**: Allows global system administration and analytics across tenants without complex cross-database queries.
