# Stock Field Service Platform

Production-oriented monorepo for stock management and field service intervention reporting.

## Apps

- `backend`: NestJS REST API with Prisma, PostgreSQL, JWT auth, RBAC, uploads, PDF generation, audit logs, and notifications.
- `web`: Next.js admin dashboard with React Query and TailwindCSS.
- `mobile`: Flutter technician app with offline-ready intervention workflow and sync queue.
- `docker`: Local infrastructure, reverse proxy, and deployment artifacts.
- `docs`: Architecture, API, database, and deployment guides.

## Quick Start

1. Copy `.env.example` files in `backend` and `web`.
2. Start infrastructure:
   ```bash
   cd docker
   docker compose up -d --build
   ```
3. Run Prisma migrations:
   ```bash
   cd ../backend
   npm install
   npx prisma migrate dev
   npm run seed
   npm run start:dev
   ```
4. Start web app:
   ```bash
   cd ../web
   npm install
   npm run dev
   ```
5. Start Flutter app:
   ```bash
   cd ../mobile
   flutter pub get
   flutter run
   ```

See [`docs/architecture.md`](/Users/flapaabid/Downloads/stock-field-service/docs/architecture.md), [`docs/api.md`](/Users/flapaabid/Downloads/stock-field-service/docs/api.md), and [`docs/deployment.md`](/Users/flapaabid/Downloads/stock-field-service/docs/deployment.md) for operational details.
