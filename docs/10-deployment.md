# 10 Deployment

## Production Targets
- **AWS ECS (Fargate)**: For stateless API and worker containers.
- **Vercel**: For Next.js frontend builds.
- **AWS RDS (PostgreSQL)**: Scalable relational database.
- **AWS ElastiCache (Redis)**: Serverless job queue and caching.

## Environment Configs
Production environments require validation of all config variables defined in the Zod env validation schema.
