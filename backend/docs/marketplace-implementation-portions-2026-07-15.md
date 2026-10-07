# Marketplace Implementation Portions (Sequenced Remediation Plan)

**Source audit:** `docs/marketplace-specification-audit-2026-07-15.md`
**Date:** 2026-07-15
**Purpose:** Break every required fix into a **logical, separately-implementable portion**, ordered so the earliest portions are applied first. Each portion is scoped to be coded, tested, and shipped on its own. Dependencies are called out explicitly; portions with no dependencies can be parallelised within a wave.

**How to use:** Apply portions top-to-bottom. A portion may be started only after every portion listed under *Depends on* is merged. Items marked **Independent** have no prerequisite beyond the current codebase.

---

## SEQUENCE OVERVIEW

| # | Portion | Wave | Complexity | Depends on |
|---|---------|------|-----------|------------|
| 1 | Schema reconciliation (drop/wire dead fields + key indexes) | 1 | Low | — |
| 2 | Remove validation bypass guard + auto-create profile | 1 | Low | 1 |
| 3 | Activate relaxation engine (inline → service) | 1 | Low | 1 |
| 4 | Verify cooldown/rule windows are admin-configurable (close-out) | 1 | Low | 1 |
| 5 | Centralize constraint checks in ValidationEngine | 1 | Medium | 2,3 |
| 6 | MarketplaceOverride wiring + admin override/priority/status APIs | 2 | High | 1 |
| 7 | Ranking/scoring event updates (consume dead counters/weights) | 2 | Medium | 1 |
| 8 | VelocityEngine (weekly/daily/frequency limits) | 2 | High | 5 |
| 9 | TierEngine (tier → limits/priority) | 2 | High | 5 |
| 10 | Dispute model + service + APIs | 2 | Medium | 1 |
| 11 | DistributionEngine (diversity/repeat/network) | 3 | Very High | 5,7 |
| 12 | RiskEngine (risk calculation + recalc) | 3 | High | 5 |
| 13 | PatternMonitoringEngine (cluster/group) | 3 | Very High | 11,12 |
| 14 | Marketplace modes config (Early Stage / Scaling) | 4 | Medium | 1 |
| 15 | LiquidityEngine + supply/demand analytics + manual match queue | 4 | Very High | 11,14 |
| 16 | Trust indicators + fallback UX + opportunity alerts | 5 | Low | 1 |
| 17 | Refactor into cohesive MarketplaceModule | 5 | Refactor | 5,6,8,9,11,12 |
| 18 | Marketplace background jobs (risk/score/cleanup/analytics) | 5 | Medium | 12,15 |

---

## PORTION 1 — Schema Reconciliation (dead fields + key indexes)

- **Wave / Sequence:** 1 (earliest)
- **Complexity:** Low
- **Independent?** Yes
- **Goal:** Remove schema/implementation drift so downstream portions build on clean ground.
- **Scope:**
  - Decide for each dead field in `prisma/schema/marketplace.prisma` (`diversityScore`, `reliabilityScore`, `internalPriorityScore`, `firstSuccessBoostActive`, `forceNewDomainNext`, `forceNewDomainUntil`, `weeklyInteractionLimit`, `tierVelocityLimit`, `matchCount7d`, `applicationCount7d`) whether to **consume** it (later portion) or **drop** it. Remove drop candidates from model + migration.
  - Add indexes: `Website.rootDomain`, `PlacementTask.requesterWebsiteId`, `DomainInteraction.sourcePrimaryCategoryKey`, `DomainInteraction.targetPrimaryCategoryKey`.
  - Leave `riskPenaltyDisputeWeight`, `maxRequesterExposurePerDay` in place (consumed by later portions 7/8).
- **Files:** `prisma/schema/marketplace.prisma`, `prisma/schema/website.prisma`, `prisma/schema/placement.prisma`, new migration.
- **Acceptance:** `prisma validate` passes; no runtime code references removed fields; new indexes exist in migration.
- **Notes:** Pure structural cleanup, no behaviour change.

---

## PORTION 2 — Remove Validation Bypass Guard + Auto-create Profile

- **Wave / Sequence:** 1
- **Complexity:** Low
- **Depends on:** Portion 1
- **Goal:** Close the #1 architectural risk — the global `enforceRevalidationAtAcceptance/Approval` rollout guard (validation.engine.ts:312) that can silently skip Stages 4 & 5.
- **Scope:**
  - Gate or remove the bypass so re-validation at `TASK_ACCEPTANCE` and `INTERACTION_APPROVAL` always runs.
  - Auto-create `WebsiteMatchingProfile` (with safe defaults) before any eligibility check so a missing profile never bypasses status/risk/suppression gates (today only `INTERACTION_APPROVAL` fails closed).
- **Files:** `src/modules/task/market-algoritm/validation.engine.ts`.
- **Acceptance:** Re-validation cannot be disabled at runtime; missing profile yields a safe reject, not a bypass.
- **Notes:** Small change, highest leverage. Do before Portion 5.

---

## PORTION 3 — Activate Relaxation Engine

- **Wave / Sequence:** 1
- **Complexity:** Low
- **Depends on:** Portion 1
- **Goal:** Replace the disabled placeholder `matching-relaxation.engine.ts` with the real logic currently inlined in `matching.engine.ts:351`.
- **Scope:**
  - Move `applyRelaxation` into `MatchingRelaxationEngine`.
  - Express stages semantically: `EXACT` / `RELATED` / `BROAD` / `FALLBACK`.
  - Keep thresholds (category/tag/country/language/authority) configurable-ready (read from `MarketplaceScoringConfig` later).
- **Files:** `src/modules/task/market-algoritm/matching-relaxation.engine.ts`, `matching.engine.ts`.
- **Acceptance:** Behaviour identical to current; logic lives in the dedicated engine; unit test for each stage.
- **Notes:** No new config yet — just extraction. Enables Portion 14 (modes).

---

## PORTION 4 — Verify Cooldown/Rule Windows Are Admin-Configurable (Close-out)

- **Wave / Sequence:** 1
- **Complexity:** Low
- **Depends on:** Portion 1
- **Goal:** Confirm §9/§10 windows are operator-controllable and not hardcoded.
- **Scope:**
  - `ValidationEngine.getCooldownDays()` (validation.engine.ts:269) already reads `MarketplaceScoringConfig.repeatPairCooldownDays`/`reciprocalCooldownDays`. Verify seed/defaults exist and admin can update the row.
  - If no admin update path exists for `MarketplaceScoringConfig`, add a minimal admin GET/PUT (can be folded into Portion 6 admin APIs).
- **Files:** `prisma/schema/marketplace.prisma` (seed), optional admin endpoint.
- **Acceptance:** Updating the config row changes cooldown behaviour without redeploy.
- **Notes:** Mostly already done; this portion is a verification + small seed/API fill.

---

## PORTION 5 — Centralize Constraint Checks in ValidationEngine

- **Wave / Sequence:** 1
- **Complexity:** Medium
- **Depends on:** Portion 2, Portion 3
- **Goal:** Make `validateTransition(event)` the single source of truth, eliminating duplicated inline checks in task services.
- **Scope:**
  - Keep the 5-level structure (Eligibility / Governance / Capacity / Behaviour / Optimization).
  - Replace inline `isWebsiteEligible`/`isMarketplaceWebsiteEligible`/`canMatch` calls in `provider-task.service.ts:316` and `task-requester.service.ts` with `validateTransition` calls (already partially present at apply/select/review — extend to all entry points).
  - Complete the **Capacity** level stubs (validation.engine.ts:386-395) by delegating to Velocity/Tier engines once they exist (Portions 8/9) — for now leave explicit TODO hooks.
- **Files:** `src/modules/task/market-algoritm/validation.engine.ts`, `provider-task.service.ts`, `task-requester.service.ts`.
- **Acceptance:** No constraint logic duplicated outside `ValidationEngine`; all marketplace entry points call `validateTransition`; safe messages returned on reject.
- **Notes:** Foundation for Portions 8, 9, 11, 12.

---

## PORTION 6 — MarketplaceOverride Wiring + Admin Override/Priority/Status APIs

- **Wave / Sequence:** 2
- **Complexity:** High
- **Depends on:** Portion 1
- **Goal:** Make `MarketplaceOverride` (currently 0 runtime consumers) actually affect matching/ranking, and give admins control.
- **Scope:**
  - New admin APIs: create/revoke override, adjust priority (`internalPriorityScore`), change marketplace status (`WebsiteMarketplaceStatus`), manage restrictions.
  - Resolve active overrides in `matching.engine.ts` / `ranking.service.ts` (BOOST, SUPPRESS, FORCE_MATCH, SCORE_OVERRIDE, PENALTY).
  - Record `MarketplaceOverrideAudit` on apply/revoke.
- **Files:** new `src/modules/admin/admin-marketplace-control/*` (controller/service/module/DTOs); modify `ranking.service.ts`, `validation.engine.ts`; `prisma/schema/marketplace.prisma` (audit already present).
- **Acceptance:** Admin override changes a website's ranking/visibility within minutes; audit row written; read-only monitoring endpoint reflects state.
- **Notes:** Satisfies §5 and §27. Independent of Portion 5 (can run in parallel after Portion 1).

---

## PORTION 7 — Ranking/Scoring Event Updates (consume dead counters/weights)

- **Wave / Sequence:** 2
- **Complexity:** Medium
- **Depends on:** Portion 1
- **Goal:** Wire the dead scoring fields/counters so ranking reflects real activity.
- **Scope:**
  - Update `matchCount7d`, `applicationCount7d`, `lastMatchedAt`, `lastSelectedAt` in selection/ranking flow.
  - Consume `riskPenaltyDisputeWeight` in `ranking.service.ts` once RiskEngine (Portion 12) writes dispute-driven risk.
  - Optionally fold `internalPriorityScore`/`diversityScore` into the final formula (only after Portion 1 keeps them).
- **Files:** `src/modules/task/market-algoritm/ranking.service.ts`, `scoring.service.ts`, `provider-task.service.ts`, `task-requester.service.ts`.
- **Acceptance:** Counters increment on real events; ranking uses them.
- **Notes:** Feeds DistributionEngine (Portion 11).

---

## PORTION 8 — VelocityEngine (weekly/daily/frequency limits)

- **Wave / Sequence:** 2
- **Complexity:** High
- **Depends on:** Portion 5
- **Goal:** Enforce weekly + daily + per-requester frequency limits (§13).
- **Scope:**
  - New `VelocityEngine` computing per-user/website/domain/tier weekly + daily interaction frequency.
  - Read `weeklyInteractionLimit`, `tierVelocityLimit` (after Portion 9), `maxRequesterExposurePerDay` (after Portion 1 keeps it).
  - Inject into `ValidationEngine` Capacity level (Portion 5 hook) and ranking exposure penalty.
- **Files:** new `src/modules/task/market-algoritm/velocity.engine.ts` + module; modify `validation.engine.ts`, `ranking.service.ts`.
- **Acceptance:** Exceeding weekly/daily/frequency limits yields safe reject or restriction; counters roll correctly.
- **Notes:** Depends on Portion 5's Capacity hook being in place.

---

## PORTION 9 — TierEngine (tier → limits/priority)

- **Wave / Sequence:** 2
- **Complexity:** High
- **Depends on:** Portion 5
- **Goal:** Map `PlanTier` to marketplace weekly limits, priority, and velocity enforcement (§16).
- **Scope:**
  - New `TierEngine` deriving limits/priority from `SubscriptionPlan.tier` (FREE/SILVER/GOLD/PLATINUM/ENTERPRISE).
  - Write `tierVelocityLimit` on profile from active subscription; inject into `VelocityEngine` (Portion 8) and ranking priority.
  - Link `SubscriptionPlan` → profile velocity (add relation/field if needed).
- **Files:** new `src/modules/task/market-algoritm/tier.engine.ts`; modify `validation.engine.ts`, `ranking.service.ts`, `subscription` services; `prisma/schema/*`.
- **Acceptance:** Tier changes alter limits/priority; free tier is most restricted.
- **Notes:** Can follow or parallel Portion 8 (both need Portion 5).

---

## PORTION 10 — Dispute Model + Service + APIs

- **Wave / Sequence:** 2
- **Complexity:** Medium
- **Depends on:** Portion 1
- **Goal:** Replace implicit `DISPUTED` task status with a structured dispute system (§25).
- **Scope:**
  - New models `Dispute`, `DisputeResolution` (parties, evidence, SLA, resolution notes, credit-link metadata).
  - New `DisputeService` + admin/user APIs; link resolution → credit adjustment + risk update (Portion 12).
  - Keep `TaskStatus.DISPUTED` as a pointer to the `Dispute` row.
- **Files:** new `prisma/schema` models + migration; new `src/modules/task/dispute/*`; modify `task-requester.service.ts` review path.
- **Acceptance:** Dispute can be opened, resolved, and linked to a credit adjustment + risk event.
- **Notes:** Independent of Portion 5; pairs well with Portion 6 admin work.

---

## PORTION 11 — DistributionEngine (diversity / repeat / network)

- **Wave / Sequence:** 3
- **Complexity:** Very High
- **Depends on:** Portion 5, Portion 7
- **Goal:** Prevent network concentration and over-repeated pairs; enforce niche distribution (§11, §12).
- **Scope:**
  - New `DistributionEngine` with diversity quotas, repeated-pair reduction beyond cooldown, network-concentration ranking penalties.
  - Consume `diversityScore` (after Portion 1) and `secondaryCategoryKey` (add to `Website` in Portion 1 or here).
  - Inject into ranking + candidate selection.
- **Files:** new `src/modules/task/market-algoritm/distribution.engine.ts`; modify `matching.engine.ts`, `ranking.service.ts`; `prisma/schema/website.prisma` (secondary category).
- **Acceptance:** A single network/domain cannot dominate a requester's matches; repeated pairs are reduced.
- **Notes:** Largest engine; build after scoring events are reliable (Portion 7).

---

## PORTION 12 — RiskEngine (risk calculation + recalc)

- **Wave / Sequence:** 3
- **Complexity:** High
- **Depends on:** Portion 5
- **Goal:** Actually compute `riskScore` from disputes/rejections/cancellations/failures (§15).
- **Scope:**
  - New `RiskEngine` recalculating `riskScore`; consume `riskPenaltyDisputeWeight` (Portion 7) and dispute outcomes (Portion 10).
  - Keep existing penalty consumption in `ranking.service.ts` and `>=75` reject gate in `validation.engine.ts`.
- **Files:** new `src/modules/task/market-algoritm/risk.engine.ts`; modify `scoring.service.ts`, `validation.engine.ts`; Portion 18 job.
- **Acceptance:** `riskScore` reflects real behaviour; high-risk sites are throttled/rejected.
- **Notes:** Feeds PatternMonitoring (Portion 13) and Dispute (Portion 10).

---

## PORTION 13 — PatternMonitoringEngine (cluster / group)

- **Wave / Sequence:** 3
- **Complexity:** Very High
- **Depends on:** Portion 11, Portion 12
- **Goal:** Detect coordinated rings / group concentration beyond pairwise (§14).
- **Scope:**
  - New `PatternMonitoringEngine` over the `DomainInteraction` graph (scheduled queries).
  - Emit risk events (→ RiskEngine, Portion 12) and admin notifications for clusters/group concentration.
- **Files:** new `src/modules/task/market-algoritm/pattern-monitoring.engine.ts` + scheduler; modify `risk.engine.ts`.
- **Acceptance:** Coordinated multi-domain patterns are flagged and raise risk/admin alert.
- **Notes:** Depends on Distribution + Risk being live.

---

## PORTION 14 — Marketplace Modes Config (Early Stage / Scaling)

- **Wave / Sequence:** 4
- **Complexity:** Medium
- **Depends on:** Portion 1
- **Goal:** Add configurable marketplace modes (§28).
- **Scope:**
  - New `MarketplaceModeConfig` model (NORMAL / EARLY_STAGE / SCALING + tunables).
  - Inject mode into matching/ranking/fallback/monitoring (relaxation engine from Portion 3, fallback from §18/§21).
- **Files:** new `prisma/schema` model + migration; new `src/modules/admin/admin-marketplace-mode/*`; modify `matching.engine.ts`, `ranking.service.ts`.
- **Acceptance:** Switching mode changes relaxation/fallback behaviour without code change.
- **Notes:** Only needs Portion 1 + Portion 3; can start early but sequenced here to avoid churn.

---

## PORTION 15 — LiquidityEngine + Supply/Demand Analytics + Manual Match Queue

- **Wave / Sequence:** 4
- **Complexity:** Very High
- **Depends on:** Portion 11, Portion 14
- **Goal:** Balance supply/demand, alert on low pools, enable admin-assisted matching (§18, §19).
- **Scope:**
  - New `MarketplaceMetricSnapshot` model + `MarketplaceAnalyticsEngine` (supply/demand by niche/country/language/tier/placement).
  - New `LiquidityEngine` using `marketplaceMode` (Portion 14) for fallback/assist.
  - Admin manual match queue + low-pool alerts.
- **Files:** new `prisma/schema` models; new `src/modules/task/market-algoritm/liquidity.engine.ts`, `src/modules/admin/admin-liquidity/*`; modify `matching.engine.ts`.
- **Acceptance:** Low-pool situations trigger alerts; admin can manually match; supply/demand report available.
- **Notes:** Top of the value chain; build last among engines.

---

## PORTION 16 — Trust Indicators + Fallback UX + Opportunity Alerts

- **Wave / Sequence:** 5
- **Complexity:** Low
- **Depends on:** Portion 1
- **Goal:** Surface safe trust metrics, empty-state/fallback messages, and send new-opportunity alerts (§22, §26, §29).
- **Scope:**
  - Expose safe trust metrics (completion rate, completed count) in opportunity/applicant APIs.
  - Add empty-state reasons + blocked-opportunity diagnostics.
  - Emit `PROVIDER_NEW_OPPORTUNITY` / `MARKETPLACE_LOW_ACTIVITY_REMINDER` (declared in `notification.prisma` but never sent).
- **Files:** modify `provider-task.service.ts` (response shaping), `notification`/`task-notification` mappers; new templates.
- **Acceptance:** Users see trust metrics + safe fallback messages; opportunity alerts delivered.
- **Notes:** Pure UX; safe to do anytime after Portion 1.

---

## PORTION 17 — Refactor into Cohesive MarketplaceModule

- **Wave / Sequence:** 5
- **Complexity:** Refactor
- **Depends on:** Portion 5, 6, 8, 9, 11, 12
- **Goal:** Remove god-services; own marketplace logic in one module (§30).
- **Scope:**
  - Create `MarketplaceModule` owning matching/ranking/validation/scoring/distribution/risk/tier/liquidity/velocity engines.
  - Move domain-interaction writes, scoring updates, and validation calls out of `provider-task.service.ts` / `task-requester.service.ts` into event-driven handlers.
  - Collapse duplicated `buildPairKey`/`normalizeRootDomain` usage.
- **Files:** new `src/modules/marketplace/*`; large edits to `provider-task`, `task-requester`, `admin-task` services + modules.
- **Acceptance:** Task services no longer import engine internals; marketplace behaviour isolated; tests green.
- **Notes:** Do after engines exist; this is structural clean-up, not new behaviour.

---

## PORTION 18 — Marketplace Background Jobs

- **Wave / Sequence:** 5
- **Complexity:** Medium
- **Depends on:** Portion 12, Portion 15
- **Goal:** Add scheduled jobs beyond `OpportunityGuaranteeCron` (Background Jobs Audit).
- **Scope:**
  - Risk recalculation job (→ RiskEngine, Portion 12).
  - Independent boost-decay + score-refresh jobs.
  - Impression retention cleanup (consume `impressionRetentionDays`).
  - Analytics/supply-demand snapshots (→ LiquidityEngine, Portion 15).
  - Low-liquidity alerts; velocity-counter rollup.
- **Files:** new `src/modules/task/market-algoritm/*.cron.ts`; register in module + `ScheduleModule`.
- **Acceptance:** Each job runs on schedule, is idempotent, and logs; no manual trigger needed.
- **Notes:** Depends on the engines it maintains being live.

---

## DEPENDENCY GRAPH (what can be parallelised)

- **Wave 1 (parallel-safe, no inter-dependencies except 2/3/4 need 1):** Portions 1 → {2, 3, 4}
- **Wave 2 (after Wave 1):** Portion 5 (needs 2,3); Portions 6, 7, 10 can start after 1 in parallel; 8/9 need 5.
- **Wave 3:** 11 (needs 5,7), 12 (needs 5); 13 needs 11+12.
- **Wave 4:** 14 (needs 1); 15 (needs 11,14).
- **Wave 5:** 16 (needs 1); 17 (needs 5,6,8,9,11,12); 18 (needs 12,15).

**Critical path:** 1 → 2/3 → 5 → 8/9 → 11 → 13, and 5 → 12 → 13, and 11+14 → 15. The earliest must-ship items are Portions 1, 2, 3, 5 (risk removal + foundation).
