# BACKLYST MARKETPLACE RELEASE CHECKLIST

## Pre-Deployment Verification
- [x] All 15+ maintenance crons transitioned to `MarketplaceMaintenanceWorker` BullMQ logic.
- [x] Linter (`pnpm lint`) passes with zero marketplace-specific algorithmic errors.
- [x] Test suite (`pnpm test`) achieves 100% pass rate in `market-algoritm` bounds.
- [x] `pnpm tsc --noEmit` build passes without type-checking regressions.
- [x] Prisma migrations validated locally (`npx prisma validate`).
- [ ] Staging-environment transaction tests for high-concurrency 5-domain weekly limits executed safely on a Postgres replica.

## Data Migration & Backfill
- [ ] Execute canonical taxonomy backfill mapping script (`src/scripts/backfill-taxonomy.ts`).
- [ ] Confirm `MarketplaceCategory` hierarchy generation matches production needs.
- [ ] Verify `WebsiteMatchingProfile` records seamlessly tie to legacy `Website` references during cutover.

## Deployment Operations
- [ ] Ensure Redis cluster possesses sufficient capacity to handle `QUEUE_NAMES.MARKETPLACE_MAINTENANCE` scale under a 15-job concurrent load.
- [ ] Scale down legacy NestJS crons instances explicitly before migrating up new code layer.
- [ ] Validate `MARKETPLACE_MAINTENANCE` queue health metrics on BullMQ Dashboard within 5 minutes of launch.
- [ ] Rollout API Pods.

## Rollback Triggers
- Abnormally high provider rejection rate indicating `ValidationEngine` false-positives.
- OOM errors in `MarketplaceMaintenanceWorker` due to non-paginated batch scoring arrays.
- Database locking deadlocks indicating `DomainInteraction` limits are colliding aggressively.
