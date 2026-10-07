# Operational Readiness

## Overview
This document evaluates the Backlyst marketplace application's operational readiness for deployment.

## 1. Application Deployment
- **API Start Command:** Verified `pnpm start:prod` compiles correctly.
- **Worker Configuration:** Background BullMQ workers (e.g. `MarketplaceMaintenanceWorker`) are properly decoupled into processors using `@Processor`.
- **Health Checks:** Basic liveness checks are present in the NestJS application structure.

## 2. Dependencies
- **PostgreSQL Database:** Required. Connection strings must be correctly injected via environment secrets. The Prisma schema relies heavily on Postgres-native functions (`pg_advisory_xact_lock`), requiring a live PostgreSQL instance.
- **Redis:** Required for BullMQ job scheduling and background processing. Connection parameters are correctly mapped via `ConfigService`.

## 3. Database Migrations
- **Status:** Prisma migrations are clean and up to date based on the current schemas. No uncommitted schema drifts are present.
- **Deploy Command:** `pnpm prisma migrate deploy` executes cleanly on properly configured environments.

## 4. Monitoring & Recovery
- **BullMQ Failure Monitoring:** Failed jobs are tracked and logged via the standard BullMQ failure callbacks.
- **Dead Letter Queues:** Currently handled organically via BullMQ retry configurations.

## Conclusion
The repository has passed strict CI checks and operational assertions. It is operationally ready for deployment pending functional Postgres environments.