# BACKLYST Marketplace — Section 10 Repeat Pair Rules: Audit Follow-Up Implementation

**Date:** 2026-07-18 (follow-up)
**Implements:** R-Repeat-1, R-Repeat-2, R-Repeat-3, R-Repeat-4, R-Repeat-5, R-Repeat-6 from `MARKETPLACE-REPEAT-PAIR-RULES-AUDIT-2026-07-18.md`
**Result:** All six gaps are now **Implemented**. Compliance raised from ~90% → ~100%.

---

## Migration

`prisma/migrations/20260718150000_repeat_pair_audit_followups/migration.sql`
- Adds `MarketplaceValidationLog.marketplaceMode` (+ index) — R-Repeat-2.
- Adds `MarketplaceScoringConfig.relationshipEventRetentionDays` (default 180) — R-Repeat-4.
- Creates `DomainRelationshipEventArchive` cold-storage table (id-preserving) — R-Repeat-4.

## Schema

`prisma/schema/marketplace.prisma`
- `DomainRelationshipEventArchive` model added.
- `MarketplaceValidationLog.marketplaceMode String?` added.
- `MarketplaceScoringConfig.relationshipEventRetentionDays Int @default(180)` added.

---

## R-Repeat-1 — Repeat vs reciprocal distinction in governance output ✅
- `ValidationResult` now carries `blockedReason?: 'REPEAT' | 'RECIPROCAL' | null` (non-user-facing).
- `ValidationEngine.getBlockedDirection(...)` determines which direction is blocked so `validateTransition` LEVEL 2 sets `result.blockedReason` accordingly.
- A HIGH-severity `REPEAT_BURST` flag sets `blockedReason = 'REPEAT'` (R-Repeat-5).
- `publicMessage` remains generic (user-safe).
- Evidence: `validation-result.ts`, `validation.engine.ts` (`getBlockedDirection`, LEVEL 2, LEVEL 2c).

## R-Repeat-2 — `marketplaceMode` on validation log ✅
- `ValidationEngine.getActiveMarketplaceMode()` reads the cached merged config mode.
- `logValidation` populates `marketplaceLog.marketplaceMode` from it (best-effort, never blocks the operation).
- Evidence: `validation.engine.ts` (`getActiveMarketplaceMode`, `logValidation`).

## R-Repeat-3 — Isolated repeat-pair validation timing ✅
- `validateTransition` LEVEL 2 cooldown check is timed (`cooldownCheckStart`/`cooldownCheckMs`).
- `ValidationResult.cooldownCheckMs?` carries the isolated duration for dashboards/metrics.
- Evidence: `validation.engine.ts` LEVEL 2 + `validation-result.ts`.

## R-Repeat-4 — `DomainRelationshipEvent` retention ✅
- New `RelationshipRetentionCron` (`relationship-retention.cron.ts`), registered in `MarketplaceCronModule`.
- Runs daily (03:00); archives events older than `relationshipEventRetentionDays` into `DomainRelationshipEventArchive` (idempotent on id) then deletes the source rows.
- Bounded batches (500/run, 200 runs cap) to avoid long transactions.
- Evidence: `relationship-retention.cron.ts`, `marketplace-cron.module.ts`, migration + schema.

## R-Repeat-5 — Repeat-burst real-time prevention ✅
- `validateTransition` LEVEL 2c now hard-blocks (fail-closed) when the candidate's provider/requester root domain is a member of an OPEN **HIGH**-severity pattern flag, including `REPEAT_BURST` (in addition to `CLUSTER_CONCENTRATION` / `RECIPROCAL_RING`).
- Overridable via `adminOverride` rule `PATTERN_FLAG_BLOCKED` (intentional, audited).
- Evidence: `validation.engine.ts` LEVEL 2c.

## R-Repeat-6 — Repeat-pair-specific admin surface ✅
- `validateTransition` admin override supports a structured `scope` (`REPEAT_PAIR`); a scoped `restore` clears only the repeat cooldown (reciprocal cooldown preserved for genuine reciprocal cycling).
- `InspectDomainPairQueryDto.scope` (`REPEAT_PAIR` | `RECIPROCAL`) lets admins request a rule-focused inspection; the service returns only the relevant `MarketplaceOverrideAudit` history via `overrideHistory(...)`.
- Evidence: `admin-domain-pair-inspection.dto.ts`, `admin-domain-pair-inspection.service.ts`, `validation.engine.ts` (scoped restore).

---

## Residual notes
- The two eslint warnings flagged at `validation.engine.ts:115/139` are pre-existing `async`/`return` style notes unrelated to these changes (the methods return promises correctly).
- `RelationshipRetentionCron` references `prisma.domainRelationshipEventArchive`, which becomes available after `prisma generate` runs against the updated schema.
- Real-time `REPEAT_BURST` block uses the existing batch `PatternMonitorService.detectRepeatBursts` flag source (HIGH severity), so no change is needed in `pattern-monitor.service.ts` itself.

## Verification
- Run `npx prisma generate` (regenerates client incl. `domainRelationshipEventArchive`).
- Run `npx prisma migrate deploy` (applies `20260718150000_repeat_pair_audit_followups`).
- Build: `npm run build` (or `nest build`) to typecheck all dependent services.
