# Missing Tasks — Marketplace Gap Implementation Backlog

**Source:** `docs/TECHNICAL-GAP-ANALYSIS-2026-07-15.md` (audit dated 2026-07-15)
**Scope:** Only the genuinely *missing* or *non-functional* items extracted from the 30-section audit.
**Rule:** Every task is backed by a code reference proving the gap. "Verified" = confirmed in code.

Legend: ❌ Missing entirely · 🟡 Partial-but-broken (declared, not working) · 🔧 Complexity

---

## BLOCK A — Confirmed Missing (no implementation)

### T-01 · Dispute data model + credit adjustment  ❌ 🔧 Medium
- **Spec:** §25 Dispute System.
- **Gap (verified):** No `model Dispute` / `enum DisputeStatus` in any `prisma/schema/*` (grep = none).
  `reviewTask` only sets `lifecycleStatus = DISPUTED`; admin `resolveDispute` writes a domain
  interaction but no explicit `CreditLog`/`CreditAdjustment` and no DISPUTE risk event.
- **Files:** `prisma/schema/*` (add model), `task-requester.service.ts:1033`, `admin-task.service.ts:713-716`.
- **Do:** Add `Dispute` (status, reason, evidence, openedById, resolvedById, creditAdjustmentId,
  timestamps) + `DisputeStatus` enum; make resolution write an explicit auditable credit
  adjustment and a DISPUTE `RiskEvent`.

### T-02 · Pattern Monitoring Engine (cluster / group concentration)  ❌ 🔧 Very High
- **Spec:** §14 Pattern Monitoring.
- **Gap (verified):** Only pairwise repeat/reciprocal detection exists. No `PatternMonitor`,
  no cluster/group/coordinated-ring detection anywhere in `src` (grep = none).
- **Files:** `src/modules/task/market-algoritm/*` (new engine), `DomainPairStat`, `DomainInteraction`.
- **Do:** New `PatternMonitorEngine` scanning `DomainPairStat`/`DomainInteraction` for rings,
  group concentration, abnormal cadence; emit risk events + admin notifications.

### T-03 · Admin-assisted / Manual Match Queue  ❌ 🔧 Very High
- **Spec:** §18 Liquidity Protection, §21 Fallback, §27 Admin Controls.
- **Gap (verified):** No `ManualMatchQueue`, no admin match-injection API (grep = none).
  On persistent `LOW_POOL` the engine just returns `[]` with a `MatchingAuditLog` entry.
- **Files:** `matching.engine.ts:84-114`, `admin-task/*` (new endpoint), `prisma/schema` (new model).
- **Do:** Add `ManualMatchQueue` model + admin endpoint to inject a match; surface `LOW_POOL`
  to an ops notification.

### T-04 · Marketplace Modes (Early Stage / Scaling)  ❌ 🔧 Medium
- **Spec:** §28 Marketplace Modes.
- **Gap (verified):** No `MarketplaceModeConfig` / mode enum; `marketplaceMode` is only a
  transient `NORMAL`/`LOW_POOL` runtime string, not persisted/configurable (grep = none).
- **Files:** `matching.engine.ts:84-85`, `prisma/schema` (new model), `marketplace.prisma:184-186` (vestigial flags).
- **Do:** Add `MarketplaceModeConfig` (enum, presets, isActive) and inject into matching /
  relaxation / validation decision points.

### T-05 · Supply/Demand Balancing Logic  ❌ 🔧 High
- **Spec:** §19 Supply vs Demand.
- **Gap (verified):** `MatchingAuditLog.marketplaceMode` is a signal only; nothing adjusts
  visibility/boost toward under-supplied segments. Analytics are read-only, not fed back.
- **Files:** `matching.engine.ts:100-112`, `admin-analytics/*`, `marketplace.prisma:127-145`.
- **Do:** New `LiquidityEngine`/`AnalyticsEngine` reading supply/demand snapshots and nudging
  visibility/boost.

### T-06 · Secondary-niche capture on interactions  ❌ 🔧 Low
- **Spec:** §12 Niche Distribution.
- **Gap (verified):** `DomainInteraction` stores only `sourcePrimaryCategoryKey` /
  `targetPrimaryCategoryKey`; `secondaryCategoryKey` not on the model (grep = none) → SECONDARY
  scope `NicheDistributionCap` cannot function.
- **Files:** `marketplace.prisma:235-258` (`DomainInteraction`), `task-requester.service.ts:221-222`, `admin-task.service.ts:171-172`.
- **Do:** Add `secondaryCategoryKey` (+ source/target) to `DomainInteraction`; populate on record.

---

## BLOCK B — Partial-but-broken (declared, not working) — must be completed

### T-07 · Niche distribution gate not wired into validation  🟡 🔧 Low
- **Spec:** §12, §17.
- **Gap (verified):** `DistributionEngine.isNicheWithinCap` exists but is NEVER called
  (grep outside the engine = none). `validateTransition` LEVEL 5 explicitly defers it.
- **Files:** `distribution-engine.service.ts:103-128`, `validation.engine.ts:528-530`.
- **Do:** Call `isNicheWithinCap` in `validateTransition` LEVEL 5 (restriction) + candidate filter.

### T-08 · Tier priority never applied in ranking  🟡 🔧 Low
- **Spec:** §16.
- **Gap (verified):** `TierEngine.PRIORITY_BY_TIER` is computed but NOT used in
  `ranking.service.ts` (grep = not applied). Higher tiers get no ranking priority.
- **Files:** `tier-engine.service.ts:25-31`, `ranking.service.ts` (formula).
- **Do:** Multiply score by `tierVelocityLimit` (resolved in `TierEngine`) in ranking formula.

### T-09 · Diversity score never persisted  🟡 🔧 Medium
- **Spec:** §6, §11.
- **Gap (verified):** `scoring.service.ts:48-50` computes `diversityScore` then discards it
  (`.catch(() => profile.diversityScore)`); the `.update()` block has no `diversityScore:` field.
- **Files:** `scoring.service.ts:47-50,98-130`, `distribution-engine.service.ts:23-53`.
- **Do:** Persist `diversityScore` from `DistributionEngine.computeDiversityScore` into the profile.

### T-10 · Reliability score never computed  🟡 🔧 Medium
- **Spec:** §6, §22.
- **Gap (verified):** `reliabilityScore` only seeded to 50 (`validation.engine.ts:328`);
  no computation anywhere in `market-algoritm` (grep = only the seed).
- **Files:** `marketplace.prisma:38`, `scoring.service.ts`, `ranking.service.ts` (not read).
- **Do:** Compute from completed/successful-interaction ratio; expose as a trust metric.

### T-11 · Risk not fed from reject / abuse / dispute flows  🟡 🔧 Medium
- **Spec:** §15.
- **Gap (verified):** `riskPenaltyDisputeWeight` only reached via narrow
  `lastRiskReason === 'DISPUTE'` branch in `ranking.service.ts:77-81`; no caller passes
  REJECTION/ABUSE `RiskEventType` from review/reject/flag flows; no `RiskEvent` log.
- **Files:** `scoring.utils.ts:29-74`, `scoring.service.ts:86-92`, `task-requester.service.ts` (REJECTED),
  `admin-task.service.ts:716` (flagAbusePattern).
- **Do:** Feed REJECTION/ABUSE/DISPUTE events into `calculateRiskScore` at source; add `RiskEvent` table.

### T-12 · Website-status differentiated behaviour  🟡 🔧 Medium
- **Spec:** §7.
- **Gap (verified):** All six `WebsiteMarketplaceStatus` values modelled, but behaviour is
  binary — `marketplaceStatus !== 'ACTIVE' → return false` (`validation.engine.ts:357,521`).
  No LOW_PRIORITY / LIMITED_ACCESS / UNDER_REVIEW / RESTRICTED / SUSPENDED distinction.
- **Files:** `marketplace.prisma:10-17,36`, `validation.engine.ts:336-366,513-526`.
- **Do:** Per-status behaviour (reduced priority/visibility/frequency; grace vs hard block).

### T-13 · Visibility priority & frequency reduction  🟡 🔧 Medium
- **Spec:** §5.
- **Gap (verified):** `internalPriorityScore` seeded (default 50) but never read/decremented
  in ranking; `matchCount7d`/`applicationCount7d` declared but not consistently updated →
  no true frequency cap.
- **Files:** `marketplace.prisma:37,68-70`, `ranking.service.ts`, `matching.engine.ts`.
- **Do:** Wire `internalPriorityScore` into formula; increment counters in selection/apply;
  add soft frequency cap.

### T-14 · Failed / Rejected credit settlement + provider reward  🟡 🔧 Medium
- **Spec:** §24.
- **Gap (verified):** Deduction/refund present. No explicit FAILED credit-settlement branch;
  REJECTED credit disposition not a clear rule; `providerRewardCredits` not credited on completion.
- **Files:** `credit-task/*`, `task-requester.service.ts`, `placement.prisma:36`.
- **Do:** Add FAILED/REJECTED settlement rules; credit provider reward on completion.

### T-15 · Trust indicators surfaced to users  🟡 🔧 Low
- **Spec:** §22.
- **Gap (verified):** Data exists but no user-facing trust endpoint on profiles/dashboards.
- **Files:** `marketplace.prisma:41-54`, `provider-dashboard/*`, `requester-dashboard/*`.
- **Do:** Expose trust summary DTO (completion rate, reliability, reputation).

### T-16 · Restriction / blocked-opportunity surfacing (UX)  🟡 🔧 Low
- **Spec:** §29.
- **Gap (verified):** Safe rejection messages exist; restrictions list is placeholder;
  clients not told which opportunities are blocked or the relaxation level.
- **Files:** `validation-result.ts`, `validation.engine.ts:533-544`, `provider-task.service.ts:331-333`.
- **Do:** Surface restriction reasons + relaxation level; add LOW_POOL UX copy.

### T-17 · Automated output-quality signals  🟡 🔧 Medium
- **Spec:** §23.
- **Gap (verified):** Manual review + optional rating only; no automated proof-validity /
  revision-count signal feeding risk/reputation.
- **Files:** `task-requester.service.ts:999-1090`, `provider-task.service.ts` (submit).
- **Do:** Feed revision count / proof checks into risk & reputation.

---

## BLOCK C — Background jobs missing (spec §30 / Background Jobs audit)

### T-18 · Score / boost-decay cron (scheduled)  ❌ 🔧 Medium
- **Gap:** Boost decay currently only on task completion; `boostDecayCount` not decremented on schedule.
- **Files:** `scoring.service.ts`, `marketplace.prisma:56`.

### T-19 · Risk-decay / risk-update cron  ❌ 🔧 Medium
- **Gap:** `calculateRiskScore` time-decay exists but no scheduled job recomputes decay.
- **Files:** `scoring.utils.ts:52-74`.

### T-20 · Pattern-monitor cron  ❌ 🔧 Very High
- **Gap:** Supports T-02.

### T-21 · Cleanup cron  ❌ 🔧 Medium
- **Gap:** Expire `suppressedUntil`, `forceMatchNext`, `MarketplaceOverride.activeUntil`;
  rotate `OpportunityImpression`/`MatchingAuditLog` by `impressionRetentionDays`.
- **Files:** `marketplace.prisma:54-68,207-213`.

### T-22 · Analytics aggregation cron  ❌ 🔧 Medium
- **Gap:** Supports T-05 supply/demand rollups.

---

## BLOCK D — Architecture refactor (spec §30)

### T-23 · Top-level MarketplaceModule + dedupe  ⚠ 🔧 Very High
- **Gap (verified):** No `MarketplaceModule`; orchestration embedded in task services;
  `recordApprovedDomainInteraction` duplicated in `task-requester.service.ts:190-251` and
  `admin-task.service.ts:93-250`; folder misnamed `market-algoritm`.
- **Do:** Extract `MarketplaceModule`; single shared interaction-recording method; rename folder;
  promote Liquidity/Analytics/PatternMonitor to engines.

---

## BLOCK E — Minor API / validation hardening

### T-24 · Harden `CreateMarketplaceOverrideDto`  🔧 Low
- **Gap:** Inline class in `marketplace-override.service.ts` lacks `class-validator` decorators.

### T-25 · Expand `update-scoring-config` DTO  🔧 Low
- **Gap:** Does not cover actually-used fields (`newWebsiteBoostFactor`, `riskPenaltyDisputeWeight`,
  `repeatPairCooldownDays`, `reciprocalCooldownDays`).
- **Files:** `admin-marketplace-config/dto/update-scoring-config.dto.ts`.

### T-26 · Provider opportunity-listing endpoint  🔧 Low
- **Gap:** Matching/Ranking engines exist but confirm a dedicated provider-facing
  "get opportunities" route wired to `findCandidates` + `rankAndFilter`.

---

## Suggested execution order (dependencies first)

| # | Task | Complexity | Why first |
|---|------|-----------|-----------|
| 1 | T-07 Niche gate in validation | Low | closes spec gap with existing schema |
| 2 | T-06 Secondary niche capture | Low | prerequisite for T-07 SECONDARY scope |
| 3 | T-08 Tier priority in ranking | Low | one-line wiring fix |
| 4 | T-09 Persist diversity score | Medium | existing compute, just persist |
| 5 | T-10 Compute reliability score | Medium | trust metric foundation |
| 6 | T-13 Visibility priority/frequency | Medium | uses existing fields |
| 7 | T-12 Status differentiation | Medium | enum already modelled |
| 8 | T-11 Risk event feeding | Medium | needs T-01 (Dispute) for full value |
| 9 | T-01 Dispute model + credit | Medium | explicit spec §25 requirement |
| 10 | T-14 Failed/rejected credit + reward | Medium | credit completeness |
| 11 | T-17 Automated quality signals | Medium | feeds T-11 |
| 12 | T-04 Marketplace modes | Medium | config only, low risk |
| 13 | T-15 Trust surfacing | Low | depends on T-10 |
| 14 | T-16 Restriction UX | Low | depends on T-07/T-13 |
| 15 | T-26 Opportunity endpoint | Low | wiring |
| 16 | T-24/25 API hardening | Low | validation gaps |
| 17 | T-18/19/21/22 Background jobs | Medium | operational stability |
| 18 | T-02 Pattern Monitor | Very High | new engine + detection logic |
| 19 | T-03 Admin-assisted matching | Very High | new queue + admin API |
| 20 | T-05 Supply/demand balancing | High | new engines |
| 21 | T-23 Architecture refactor | Very High | structural; do after engines stabilise |

**Counts:** 6 Confirmed-Missing (A) · 11 Partial-broken (B) · 5 Background-jobs (C) ·
1 Refactor (D) · 3 API-hardening (E) = **26 tasks**.
