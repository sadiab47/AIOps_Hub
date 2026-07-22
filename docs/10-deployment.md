# Deployment Guide

This guide describes production deployment options and procedures for the AIOps Hub.

---

## 1. Local Production Deployment (Docker Compose)
To run the production profile locally:
1. Ensure all environment parameters are configured in a `.env.prod` file:
   - `POSTGRES_PASSWORD` (strong secret)
   - `REDIS_PASSWORD` (strong secret)
   - `JWT_SECRET` (min 8 characters)
   - `AI_ENCRYPTION_KEY` (exactly 32 bytes)
2. Run the compose file pointing to the production configurations:
   ```bash
   docker compose -f infra/docker/docker-compose.prod.yml --env-file .env.prod up -d
   ```

## 2. Cloud Infrastructure Recommendations
- **Frontend Gateway**: Deploy Next.js using **Vercel** or **AWS Amplify**.
- **Backend API Server**: Containerized deployment on **AWS ECS Fargate** or **Google Cloud Run**.
- **Database Engine**: Managed PostgreSQL (RDS or Cloud SQL).
- **Redis Cache**: AWS ElastiCache or Redis Cloud.
