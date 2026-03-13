# Deployment Guide

## Local Docker Deployment

1. Copy backend and web environment files.
2. Run:
   ```bash
   cd docker
   docker compose up -d --build
   ```
3. Execute migrations from the backend container or locally:
   ```bash
   docker compose exec backend npx prisma migrate deploy
   docker compose exec backend npm run seed
   ```

## Production Recommendations

- Use managed PostgreSQL with automated backups.
- Replace local file storage with S3, MinIO, or equivalent.
- Put Nginx or a cloud load balancer in front of the API and web app.
- Store secrets in a secrets manager, not `.env` files.
- Enable HTTPS and JWT secret rotation.
- Add centralized logs and metrics for API latency, sync failures, and stock alerts.

## Suggested Runtime Topology

- `web`: Next.js server or static deployment behind reverse proxy.
- `backend`: NestJS container with horizontal scaling.
- `postgres`: Managed relational database.
- `object storage`: Photos, signatures, generated PDFs.
- `queue/worker`: Optional future enhancement for heavy PDF and notification workloads.
