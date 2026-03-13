# Architecture

## Overview

The monorepo is split into five top-level areas:

- `backend`: NestJS modular API with Prisma ORM and PostgreSQL.
- `web`: Next.js admin dashboard for managers and admins.
- `mobile`: Flutter app for technicians with offline-first submission flow.
- `docker`: Local orchestration and reverse proxy configuration.
- `docs`: Architecture, API, and deployment documentation.

## Backend Modules

- `auth`: Login, JWT issuance, current-user lookup.
- `users`: User lifecycle, roles, activation state.
- `products`, `categories`, `suppliers`, `warehouses`: Master data for inventory.
- `stock`: Warehouse balances, movements, low-stock alerts.
- `clients`, `sites`: Customer and intervention destination records.
- `interventions`: Assignment, execution, spare-part usage, completion workflow.
- `uploads`: Image and signature file handling.
- `reports`: PDF generation and reporting aggregates.
- `notifications`: User-facing stock and intervention notifications.
- `audit`: Traceability of privileged actions.

## Request Flow

1. User authenticates with email/password and receives JWT.
2. Web or mobile client sends JWT on subsequent REST calls.
3. Guards enforce authentication and role authorization.
4. Prisma persists business events and related audit logs.
5. Intervention completion creates part usage records, decrements stock, persists photos/signature, and generates a PDF report.

## Mobile Offline Strategy

- Assigned interventions are cached locally in Hive.
- Completion payloads are queued when offline.
- Sync service retries queued submissions when connectivity returns.

## File Storage

- Local filesystem storage under `backend/uploads` is used in this production-ready starter.
- For cloud deployment, swap the upload service to S3-compatible object storage while keeping the same API contract.
