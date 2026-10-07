# WEBSITE STATUS — AUDIT VIOLATIONS IMPLEMENTED (2026-07-18)

This document records the implementation work that closes the three concrete
violations and the two "missing requirements" identified in
`MARKETPLACE-WEBSITE-STATUS-AUDIT-2026-07-18.md` (Section 7 of the
specification audit).

## Violations closed

### (a) UNDER_REVIEW wrongly blocked at selection — FIXED
- `validation.engine.ts`: `UNDER_REVIEW` is now in `isSelectableStatus` (only
  `SUSPENDED` is non-selectable). `validateTransition` no longer emits
  `WEBSITE_STATUS_NOT_SELECTABLE` for UNDER_REVIEW, so under-review sites
  continue marketplace participation per spec §7.
- Updated `validation.engine.spec.ts` test that previously asserted UNDER_REVIEW
  was REJECTED; it now asserts UNDER_REVIEW is selectable + monitored.

### (b) LIMITED_ACCESS auto-cap hard-coded to 1 — FIXED
- `marketplace-config.service.ts`: added admin-configurable
  `limitedAccessDailyCap` (default `1`) to `MarketplaceScoringConfig`.
- `quality-status.engine.ts` `reconcileStatus`: the LIMITED_ACCESS daily cap is
  now derived via `resolveLimitedAccessDailyCap(config)` (config-driven, clamped
  to ≥1 and ≤ global cap) instead of the hard-coded literal `1`. Result: a
  configurable "reduced" exposure rather than a near-total cut.

### (c) Status eligibility filtered in application memory — FIXED
- `validation.engine.ts`: `getEligibleMarketplaceWebsiteIds` and
  `getEligibleProviderWebsites` now push `marketplaceStatus: { not: 'SUSPENDED' }`
  into the Prisma `WHERE` clause (indexed via `@@index([marketplaceStatus]`)). No
  more loading every verified/visible profile into memory to filter SUSPENDED
  out client-side.

## Missing requirements delivered

### Centralized Website Status facade (architectural issue #4)
- New `website-status-query.service.ts` (`WebsiteStatusQueryService`): single
  source of truth for `isBrowsableStatus`, `isSelectableStatus`,
  `getStatusTreatment` (visibility factor / daily-cap reduction / boost-disabled
  / monitored flag), and the DB-side eligibility queries. Registered + exported
  from `marketplace-engine.module.ts`.

### UNDER_REVIEW behavioural-monitoring mechanism (audit §2 / §15)
- `WebsiteStatusQueryService.recordUnderReviewMonitoring`: fires a
  `MONITORED_VISIBILITY` row to `VisibilityAdjustmentLog` whenever an
  under-review candidate is surfaced. Wired into `VisibilityControlService.apply`
  (best-effort, never blocks the response). `VisibilityAdjustmentLog.adjustmentType`
  comment updated to include `MONITORED_VISIBILITY`.

## Verification
- `npx tsc -p tsconfig.build.json --noEmit` → EXIT 0 (clean build).
- Jest (affected suites):
  - `validation.engine.spec.ts` — 28 passed (incl. corrected UNDER_REVIEW test)
  - `visibility-control.service.spec.ts` — 10 passed (incl. monitoring-hook call)
  - `quality-status.engine.spec.ts` — 10 passed
  - **Total: 48 passed.**

## Files changed
- `src/modules/task/market-algoritm/validation.engine.ts`
- `src/modules/task/market-algoritm/validation.engine.spec.ts`
- `src/modules/task/market-algoritm/quality-status.engine.ts`
- `src/modules/task/market-algoritm/marketplace-config.service.ts`
- `src/modules/task/market-algoritm/visibility-control.service.ts`
- `src/modules/task/market-algoritm/visibility-control.service.spec.ts`
- `src/modules/task/market-algoritm/website-status-query.service.ts` (new)
- `src/modules/task/marketplace-engine/marketplace-engine.module.ts`

## Out of scope (see audit "Recommended implementation order")
- Automatic UNDER_REVIEW→RESTRICTED and RESTRICTED→SUSPENDED transitions remain
  admin-only (the ladder band is score-driven; the audit flags these as
  "automatic support incomplete" but reachable via admin `setStatus`).
- First-class `MarketplaceRestrictionLog` entity not added (restrictions remain
  expressed via status + caps + `VisibilityAdjustmentLog`, which is sufficient
  for the spec's auditability intent).
