# Implementation Plan — Missing Marketplace Portion

**Source documents:**
- `docs/TECHNICAL-GAP-ANALYSIS-2026-07-15.md` (full audit)
- `docs/MISSING-TASKS-2026-07-15.md` (26-task backlog)

**Objective:** Implement only the *missing / broken* portion, in a sequence that respects
dependencies — each phase delivers a working, testable increment. Sequences are ordered so
prerequisites land before the features that need them.

**Principle:** No new behaviour bypasses `ValidationEngine.validateTransition`. Every new
engine is `@Injectable()` under `src/modules/task/market-algoritm/` and consumed through
existing orchestration points.

---

## Dependency map (what blocks what)

```
T-06 secondary-niche capture ──► T-07 niche gate in validation (SECONDARY scope)
T-07 niche gate ──────────────► T-16 restriction UX
T-09 persist diversity ───────► (trust/quality foundation)
T-10 compute reliability ─────► T-15 trust surfacing
T-13 visibility priority/freq ─► T-16 restriction UX
T-11 risk event feeding ──────► needs T-01 Dispute for DISPUTE path
T-01 Dispute model ───────────► T-11 full risk coverage / T-17 quality signal
T-02 Pattern Monitor ─────────► T-20 pattern cron
T-03 Admin-assisted matching ─► T-18/22 jobs reuse LOW_POOL signal
T-05 Supply/demand ───────────► T-22 analytics cron
T-23 Architecture refactor ───► done LAST (after engines are stable)
T-04 Marketplace modes ───────► consumed by T-03/T-05 decision points
```

---

## PHASE 0 — Foundation (DB schema + shared helpers)
**Goal:** Land all schema changes and the single shared interaction recorder before feature work.

### P0.1 · Prisma schema — `prisma/schema/marketplace.prisma`
Add (migrations required):
- `model Dispute { id, taskId, requesterWebsiteId, providerWebsiteId, openedById,
  resolvedById?, status DisputeStatus, reason, evidence Json?, creditAdjustmentId?,
  openedAt, resolvedAt?, createdAt, updatedAt }` + `enum DisputeStatus { OPEN, UNDER_REVIEW,
  RESOLVED, REJECTED }`.
- `model RiskEvent { id, websiteId, type RiskEventType, delta, riskScoreAfter, createdAt }`
  (+ `enum` reuse from `scoring.utils.ts`).
- `model MarketplaceModeConfig { id, mode MarketplaceMode, isActive, preset Json, ... }` +
  `enum MarketplaceMode { EARLY_STAGE, SCALING }`.
- `model ManualMatchQueue { id, taskId, providerWebsiteId, requesterWebsiteId, status,
  createdById, note?, createdAt, resolvedAt? }`.
- `DomainInteraction`: add `sourceSecondaryCategoryKey?`, `targetSecondaryCategoryKey?`.
- Backfill `WebsiteMatchingProfile.diversityScore`/`reliabilityScore` via script
  (`src/scripts/backfill-website-matching-profiles.ts` pattern).

### P0.2 · Deduplicate interaction recorder (prereq for T-07/T-11/T-01)
Extract `recordApprovedDomainInteraction(...)` out of `task-requester.service.ts:190-251` and
`admin-task.service.ts:93-250` into a **single** shared service (e.g.
`src/modules/task/market-algoritm/domain-interaction.service.ts`) that:
- writes `DomainInteraction` (incl. secondary niche),
- upserts `DomainPairStat` (direction + both cooldowns);
- writes a `RiskEvent` when a `RiskEventType` is supplied.
Both existing call-sites delegate to it.

**Exit criteria:** migration applies; one recorder; tests green.

---

## PHASE 1 — Quick wins (Low complexity, high spec coverage)
**Order matters:** T-06 before T-07 (secondary niche needed for SECONDARY scope).

### 1.1 · T-06 Secondary-niche capture — `Low`
- Populate `sourceSecondaryCategoryKey`/`targetSecondaryCategoryKey` in the P0.2 recorder
  (read `website.secondaryCategoryKey`).

### 1.2 · T-07 Niche gate in validation — `Low`
- In `validation.engine.ts` LEVEL 5, call `DistributionEngine.isNicheWithinCap(primaryKey,
  'PRIMARY')` and `('SECONDARY')`; push `NICHE_CAP_EXCEEDED` to `restrictions[]` (non-blocking)
  and optionally to `failedRules` when mode demands. Wire into `buildHardRuleCandidates` filter.

### 1.3 · T-08 Tier priority in ranking — `Low`
- `ranking.service.ts`: resolve `tierVelocityLimit` via `TierEngine.resolveTierLimits` per
  provider user; multiply final score by `tierVelocityLimit` (or add as additive bonus).

### 1.4 · T-26 Provider opportunity endpoint — `Low`
- New `provider-task` (or `marketplace`) controller route `GET /marketplace/opportunities`
  calling `MatchingEngine.findCandidates` + `TommacayRankingService.rankAndFilter` +
  `recordOpportunityImpressions`. Confirm `provider-task.module.ts` already imports the engines.

### 1.5 · T-24 / T-25 API hardening — `Low`
- Decorate `CreateMarketplaceOverrideDto` (`marketplace-override.service.ts`) with
  `class-validator`; add `newWebsiteBoostFactor`, `riskPenaltyDisputeWeight`,
  `repeatPairCooldownDays`, `reciprocalCooldownDays` to `UpdateScoringConfigDto`.

**Exit criteria:** niche caps enforced; tiers ranked by priority; provider sees opportunities.

---

## PHASE 2 — Score & quality completeness (Medium)
**Order:** T-09 and T-10 are independent; T-13 after T-09 (uses diversity); T-17 after T-11.

### 2.1 · T-09 Persist diversity score — `Medium`
- In `scoring.service.ts:98-130`, set `diversityScore:` from
  `DistributionEngine.computeDiversityScore(website.rootDomain)` (replace the discarded `.catch`).

### 2.2 · T-10 Compute reliability score — `Medium`
- Add `calculateReliabilityScore(profile)` in `scoring.utils.ts` from
  `successfulInteractions / max(1,totalInteractions)` (+ reputation blend).
- Persist `reliabilityScore` in `scoring.service.ts`. Expose getter for T-15.

### 2.3 · T-13 Visibility priority & frequency — `Medium`
- Increment `matchCount7d`/`applicationCount7d` in selection/apply flows.
- Use `internalPriorityScore` in `ranking.service.ts` (decrement on exposure).
- Add soft frequency cap (e.g. skip if `matchCount7d >= profile cap`).

### 2.4 · T-12 Website-status differentiation — `Medium`
- Replace binary `marketplaceStatus !== 'ACTIVE'` block (`validation.engine.ts:357,521`) with
  per-status logic: LOW_PRIORITY → reduce visibility weight; LIMITED_ACCESS → frequency cut;
  UNDER_REVIEW → exclude from new matches, keep existing; RESTRICTED → reduced exposure;
  SUSPENDED → hard block. Keep fail-closed default.

**Exit criteria:** profiles carry live diversity/reliability; statuses behave graduatedly.

---

## PHASE 3 — Risk, Disputes & Credits (Medium)
**Order:** T-01 (Dispute model) first so T-11 can emit DISPUTE risk; T-14 independent.

### 3.1 · T-01 Dispute model + credit adjustment — `Medium`
- Schema (P0.1). `admin-task.service.ts resolveDispute` writes `Dispute` row +
  explicit `CreditLog`/`CreditAdjustment` + calls P0.2 recorder with `RiskEventType.DISPUTE`.
- Add dispute CRUD admin endpoint (`admin-task` or new `admin-dispute`).

### 3.2 · T-11 Risk event feeding — `Medium`
- From `task-requester.service.ts` REJECTED path → `calculateRiskScore(...,'REJECTION')` +
  `RiskEvent` write. From `admin-task.service.ts flagAbusePattern` → `'ABUSE'`. From T-01 →
  `'DISPUTE'`. Use `riskPenaltyDisputeWeight` generally once DISPUTE is recorded.

### 3.3 · T-14 Failed/Rejected credit + provider reward — `Medium`
- Add FAILED settlement branch in `task-requester.service.ts`/`credit-task`;
  define REJECTED refund/forfeit rule; credit `providerRewardCredits` on completion.

### 3.4 · T-17 Automated output-quality signals — `Medium`
- Feed revision count / proof-validity into `calculateRiskScore`/`reputationScore` during
  `reviewTask`.

**Exit criteria:** disputes tracked + adjust credits; risk reacts to reject/abuse/dispute.

---

## PHASE 4 — Modes, UX surfacing & trust (Low/Medium)

### 4.1 · T-04 Marketplace Modes — `Medium`
- Schema (P0.1). `MarketplaceModeService` resolves active mode; inject into
  `matching.engine.ts` (relaxation ceiling / `minViableMatches`) and `validation.engine.ts`.

### 4.2 · T-15 Trust surfacing — `Low`
- DTO in `provider-dashboard`/`requester-dashboard` exposing completionRate, reliabilityScore,
  reputationScore, successfulInteractions.

### 4.3 · T-16 Restriction / blocked-opportunity UX — `Low`
- Return `restrictions[]` + `relaxationLevel` from `validateTransition` to clients;
  add LOW_POOL copy in `provider-task` opportunity response.

**Exit criteria:** modes switch behaviour; users see trust + restriction reasons.

---

## PHASE 5 — Background jobs (Medium)
**Order:** independent; T-21 cleanup supports all; T-22 feeds T-05; T-20 feeds T-02.

### 5.1 · T-18 Score / boost-decay cron — `Medium`
- Scheduled `boostDecayCount` decrement + `visibilityScore` recompute (mirror
  `OpportunityGuaranteeCron` pattern).

### 5.2 · T-19 Risk-decay cron — `Medium`
- Recompute `riskScore` decay via `calculateRiskScore` across profiles; write `RiskEvent`.

### 5.3 · T-21 Cleanup cron — `Medium`
- Expire `suppressedUntil`, `forceMatchNext`, `MarketplaceOverride.activeUntil`;
  rotate `OpportunityImpression`/`MatchingAuditLog` by `impressionRetentionDays`.

### 5.4 · T-22 Analytics aggregation cron — `Medium`
- Rollups feeding T-05 supply/demand snapshots.

**Exit criteria:** scheduled maintenance runs; retention enforced.

---

## PHASE 6 — Advanced engines (High / Very High)
**Order:** T-02 before T-20 (cron calls engine); T-03 before T-18 reuse; T-05 after T-22.

### 6.1 · T-02 Pattern Monitor Engine — `Very High`
- New `PatternMonitorEngine` scanning `DomainPairStat`/`DomainInteraction` for rings, group
  concentration, cadence anomalies; emits `RiskEvent`(ABUSE) + admin notification.

### 6.2 · T-03 Admin-assisted matching — `Very High`
- `ManualMatchQueue` model + admin endpoint to inject a match (bypasses relaxation only,
  never eligibility/ownership/security via `validateTransition` ADMIN_FORCE); surfaces on LOW_POOL.

### 6.3 · T-05 Supply/Demand balancing — `High`
- `LiquidityEngine` + `AnalyticsEngine` reading T-22 snapshots; nudges visibility/boost toward
  under-supplied segments inside `ranking.service.ts`.

**Exit criteria:** coordinated abuse detectable; admins can assist liquidity; marketplace self-balances.

---

## PHASE 7 — Architecture refactor (Very High, LAST)
**Order:** after all engines stable so the refactor has stable boundaries.

### 7.1 · T-23 Top-level MarketplaceModule — `Very High`
- Create `src/modules/marketplace/` aggregating the engines; move
  `src/modules/task/market-algoritm/` → `marketplace/engine/` (rename `market-algoritm`).
- Remove duplicated orchestration from `task-requester`/`provider-task`/`admin-task`;
  they call the `MarketplaceModule` facade only.
- Promote Liquidity/Analytics/PatternMonitor to first-class engines.

**Exit criteria:** single marketplace domain module; no duplicated rule logic.

---

## Master sequence (single ordered list)

1. P0.1 Schema (Dispute, RiskEvent, MarketplaceModeConfig, ManualMatchQueue, secondary niche)
2. P0.2 Shared domain-interaction recorder (dedupe)
3. 1.1 T-06 Secondary-niche capture
4. 1.2 T-07 Niche gate in validation
5. 1.3 T-08 Tier priority in ranking
6. 1.4 T-26 Provider opportunity endpoint
7. 1.5 T-24 / T-25 API hardening
8. 2.1 T-09 Persist diversity score
9. 2.2 T-10 Compute reliability score
10. 2.3 T-13 Visibility priority & frequency
11. 2.4 T-12 Website-status differentiation
12. 3.1 T-01 Dispute model + credit adjustment
13. 3.2 T-11 Risk event feeding
14. 3.3 T-14 Failed/Rejected credit + provider reward
15. 3.4 T-17 Automated output-quality signals
16. 4.1 T-04 Marketplace Modes
17. 4.2 T-15 Trust surfacing
18. 4.3 T-16 Restriction / blocked-opportunity UX
19. 5.1 T-18 Score / boost-decay cron
20. 5.2 T-19 Risk-decay cron
21. 5.3 T-21 Cleanup cron
22. 5.4 T-22 Analytics aggregation cron
23. 6.1 T-02 Pattern Monitor Engine
24. 6.2 T-03 Admin-assisted matching
25. 6.3 T-05 Supply/Demand balancing
26. 7.1 T-23 Architecture refactor (MarketplaceModule)

---

## Effort summary by phase

| Phase | Tasks | Complexity mix | Outcome |
|-------|-------|---------------|----------|
| 0 | P0.1, P0.2 | Schema + refactor | Foundation ready |
| 1 | T-06,07,08,26,24,25 | 6 × Low | Spec gaps closed cheaply |
| 2 | T-09,10,13,12 | 4 × Medium | Live quality scores |
| 3 | T-01,11,14,17 | 4 × Medium | Risk/dispute/credit complete |
| 4 | T-04,15,16 | 1 Med + 2 Low | Modes + UX |
| 5 | T-18,19,21,22 | 4 × Medium | Ops stability |
| 6 | T-02,03,05 | 2 V.High + 1 High | Advanced engines |
| 7 | T-23 | Very High | Clean architecture |

**Total: 26 tasks across 8 phases, dependency-ordered.**
