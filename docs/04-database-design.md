# 04 Database Design

We use PostgreSQL as our primary relational store, managed via Prisma ORM.

## Schema Conventions
- **UUID IDs**: All IDs use random UUID values to prevent enumeration attacks.
- **Soft Deletes**: Active models use `deletedAt` timestamps. Soft deleted records are excluded in the repository layers.
- **Audit Columns**: Core tables have `createdAt` and `updatedAt`.

## Core Models

### User
Stores account details, email matches, and password hashes.

### Organization
Stores company profiles and unique slugs.

### Member
Maps Users to Organizations with role memberships (`OWNER`, `ADMIN`, `MEMBER`, etc.).

### AuditLog
Maintains immutable records of security events (e.g. login attempts, member additions).
