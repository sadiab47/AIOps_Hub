# ADR 0002: Repository Pattern for Prisma ORM Isolation

## Status
Approved

## Context
Prisma is our chosen ORM. However, importing and invoking the Prisma Client directly inside NestJS controllers and services couples our business logic to a specific ORM's syntax and API surface. If we ever decide to optimize queries using raw SQL, swap ORMs, or add global query behavior, we would need to edit files across the entire application.

## Decision
We enforce a strict **Repository Pattern** where business services are prohibited from importing or using the `PrismaClient` directly. 

### Implementation Flow:
```text
Controller ──> Service ──> Repository ──> PrismaClient ──> Database
```

1. Every database entity has a designated repository class (e.g. `UserRepository`).
2. The Repository injects `PrismaService` and encapsulates all database actions, queries, and mutations.
3. Services only inject and call Repository methods.

## Rationale
- **Decoupled Business Logic**: The core business rules do not know how data is stored or retrieved.
- **Simpler Unit Testing**: We can easily mock the repository classes rather than trying to mock the chainable Prisma Client query builders.
- **Single Source of Truth**: Database query optimizations (like adding indexes, raw SQL, or soft-delete filtering) are fully contained within the repository layer.
