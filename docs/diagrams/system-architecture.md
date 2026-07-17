# System Architecture Diagram

```mermaid
graph TD
    Browser([Browser]) -->|HTTP Cookies| WebApp[Next.js Frontend]
    WebApp -->|REST API| NestJS[NestJS REST API]
    NestJS --> PostgreSQL[PostgreSQL]
    NestJS --> Redis[Redis]
    NestJS --> OpenAI[OpenAI]
    PostgreSQL --> Prisma[Prisma ORM]
    Redis --> Prisma
    OpenAI --> Prisma
```
