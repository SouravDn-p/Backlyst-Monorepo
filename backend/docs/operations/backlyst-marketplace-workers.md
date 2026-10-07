# BACKLYST MARKETPLACE BULLMQ WORKERS

## Overview
The application utilizes BullMQ to process background jobs asynchronously. With the deprecation of local NestJS crons (`@Cron`), the `MarketplaceMaintenanceWorker` now acts as the sole authoritative handler for all periodic scoring, decay, maintenance, and synchronization algorithms.

## Worker Definitions
- **Queue Name:** `marketplace-maintenance` (exported as `QUEUE_NAMES.MARKETPLACE_MAINTENANCE`).
- **Worker Class:** `MarketplaceMaintenanceWorker`
- **Location:** `src/modules/task/marketplace-maintenance/marketplace-maintenance.worker.ts`

## Supported Jobs
The worker handles jobs defined in `MARKETPLACE_MAINTENANCE_JOB_NAMES`:
- `marketplace-maintenance:update-opportunity-scores`
- `marketplace-maintenance:decay-boost-factors`
- `marketplace-maintenance:expire-overrides`
- `marketplace-maintenance:cleanup-impressions`
- `marketplace-maintenance:flag-neglected-websites`
- `marketplace-maintenance:recalc-quality`
- `marketplace-maintenance:recalc-behaviour`
- `marketplace-maintenance:rebalance-supply-demand`
- `marketplace-maintenance:monitor-patterns`
- `marketplace-maintenance:retain-relationships`
- `marketplace-maintenance:decay-risk-scores`
- `marketplace-maintenance:expire-tasks`
- `marketplace-maintenance:scan-opportunities`
- `marketplace-maintenance:maintain-visibility`
- `marketplace-maintenance:reminder-provider-response`
- `marketplace-maintenance:reminder-requester-review`
- `marketplace-maintenance:reminder-overdue-escalation`

## Operational Considerations

### Scaling
- **Concurrency:** By default, BullMQ limits concurrent processing per-worker instance. Given the heavy Prisma I/O inside these jobs (e.g. `recomputeAllQuality()`), do not scale the concurrency limit beyond 5 concurrent active jobs per Node instance without tuning Prisma's connection pool.
- **Horizontal Scaling:** You can deploy $N$ replicas of the worker. BullMQ will safely distribute the jobs via Redis locks.

### Error Handling & Retries
- Unknown job names will log a warning but will **not** throw an unhandled promise rejection. This prevents poison pills from endlessly clogging the queue.
- Jobs failing due to DB connectivity or timeout will trigger BullMQ's native retry exponential backoff strategies.

### Startup Command
The worker operates within the standard NestJS lifecycle if imported into the main application. If running as a standalone microservice container:
```bash
node dist/main.js
```
*Ensure `REDIS_URL` environment variable is correctly set in production.*
