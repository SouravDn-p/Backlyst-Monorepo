# BACKLYST MARKETPLACE MIGRATION RUNBOOK

## Overview
This runbook covers the procedures for deploying the massive marketplace taxonomy and scaling schema changes to production.

## 1. Pre-Deployment Preparation
- Ensure `DATABASE_URL` is pointing to the staging or target production database.
- Create a backup snapshot of the database via AWS RDS or equivalent managed provider.
- Verify that `npx prisma validate` returns 0 issues locally.

## 2. Structural Migration Deployment
Because `MarketplaceCategory` and `WebsiteMatchingProfile` tables are brand new, there is low risk of data loss. However, modifying `Website` and `PlacementTask` schemas to insert mandatory one-to-many relationship constraints requires care.

```bash
# Execute structural schema changes. This applies the migration sql safely.
npx prisma migrate deploy
```

## 3. Data Backfill
Once the schema is in place, the application MUST backfill categories into existing websites.

1. Generate Prisma Client to reflect the new structure:
   ```bash
   npx prisma generate
   ```
2. Execute the taxonomy backfill script:
   ```bash
   npx ts-node src/scripts/backfill-taxonomy.ts
   ```
3. *Expected output:* The script will identify all active `Website` records without a `MarketplaceCategory`, infer the category via the legacy text field, and map the `WebsiteMatchingProfile`. Ambiguous records will log warnings.

## 4. Rollback & Recovery
If the backfill assigns incorrect taxonomy causing a massive drop in compatibility scores:
1. Stop all Worker nodes to prevent incorrect scoring cascades from committing to DB.
2. The `MarketplaceCategory` schema cannot be easily reversed if columns were dropped. Since we did not drop legacy string columns in Phase 3, you can rollback code to pre-migration release tags. The application will resume reading from the legacy string representations.
3. No manual database truncation should be attempted on live tables; rely on Prisma down-migrations or point-in-time recovery.
