# Marketplace — Missing / Partial Items Requiring Implementation

**Date:** 2026-07-16  
**Source of truth:** Code audit of `backlyst-backend` (see `MARKETPLACE-SPECIFICATION-AUDIT-CLINE-2026-07-16.md`).  
**Scope:** Only items that are *missing* or *partially implemented* and need work. Fully-implemented sections are excluded.

> Every item below is backed by actual code references. No code was modified.

**Overall:** ~88% implemented. **0 sections entirely missing.** 6 sections partially implemented + 5 architectural/correctness gaps. All gaps are Low or Medium complexity.

---

## Summary Table

| # | Item | Section | Status | Complexity | Priority |
|---|------|--------|--------|-----------|---------|
| M1 | Auto-refund requester credit on rejected (non-disputed) submission | §24 Credit | Partial | Low | 1 (High) |
| M2 | Surface trust indicators to end users (reliability/reputation/completed) | §22 Trust | Partial | Low | 2 |
| M3 | Add availability/fallback message to opportunities listing | §29 UX | Partial | Low | 3 |
| M4 | Make ABUSE RiskEvent actually raise site riskScore | §15 Risk | Partial | Low/Med | 4 |
| M5 | Admin CRUD endpoints for `NicheDistributionCap` | §12 Niche | Partial | Low | 5 |
| M6 | De-duplicate `recordApprovedDomainInteraction` | §8 / §30 | Partial | Low | 6 |
| M7 | Supply/demand automatic balancing (beyond monitoring) | §19 Supply/Demand | Partial | Medium | 7 |
| M8 | Split `ValidationEngine` into per-level validators + use-case layer | §30 Arch | Refactor | Medium | 8 |
| M9 | DB: composite index + mode-config audit field | DB | Partial | Low | 9 |
| M10 | RiskRecalcCron (timed decay for dormant profiles) | §15 / Jobs | Partial | Low/Med | 10 |
| M11 | Emit `REPEAT_BURST` / `RECIPROCAL_RING` pattern flags (optional) | §14 Pattern | Partial | Low | 11 |
| M12 | Admin endpoint for tier velocity profile overrides | §16 Tier / API | Missing endpoint | Low | 12 |
| M13 | Explicit daily spacing rule (if required beyond daily count) | §13 Velocity | Partial | Low | 13 |

---

## M1 — Auto-refund requester credit on rejected submission (§24)

**Current (code):** `CreditTaskService` has `deductTaskCredit`, `refundTaskCredit`, `rewardProviderCredit`. Refund is wired for requester cancellation and dispute-resolution paths. In `task-requester.service.ts`, the `reviewTask` REJECT branch (lines ~1093-1148) lowers provider reputation/visibility via `updateScoresAfterTask(..., false)` but does **not** call `refundTaskCredit` for the requester.

**Missing:** The requester's originally-deducted credit is not automatically returned when a submission is REJECTED and NOT escalated to dispute.

**Files:** `src/modules/task/task-requester/task-requester.service.ts`, `src/modules/credit/credit-task/credit-task.service.ts`

**Change:** In the REJECT-without-dispute path, call `creditTaskService.refundTaskCredit(...)` (or document an explicit retention policy).

**Complexity:** Low

---

## M2 — Surface trust indicators to end users (§22)

**Current (code):** `WebsiteMatchingProfile` stores `completedInteractions`, `reliabilityScore`, `reputationScore`, `completionRate`, `avgQualityRating`. These are used internally for ranking only. No public endpoint/DTO exposes them on provider/website profiles or opportunity cards.

**Missing:** User-visible trust metrics.

**Files:** `src/modules/task/provider-task/provider-task.service.ts`, `src/modules/task/task-requester/task-requester.service.ts`, dashboard services (no exposure found in code).

**Change:** Add a public trust-profile response (or extend existing website/provider detail DTOs) returning reliabilityScore, completedInteractions, reputationScore, avgQualityRating.

**Complexity:** Low

---

## M3 — Availability / fallback message on opportunities listing (§29)

**Current (code):** `getProviderOpportunities` (`provider-task.service.ts:121-177`) returns `[]` when the pool is empty/low with no explanatory message. `SAFE_MESSAGES` + `publicMessage` exist in `validation-result.ts`/`validation.engine.ts` but are only used to throw `ForbiddenException` at apply/accept, not shown as a soft hint on browse.

**Missing:** Soft availability/fallback message when result set is empty or restricted; blocked opportunities are silently omitted.

**Files:** `src/modules/task/provider-task/provider-task.service.ts:121-177`, `src/modules/task/market-algoritm/validation-result.ts`

**Change:** Return an `availability`/`message` field in the opportunities response (e.g. LOW_POOL note, manual-match-queued hint) when `ranked.length === 0`.

**Complexity:** Low

---

## M4 — ABUSE RiskEvent must actually raise site riskScore (§15)

**Current (code):** `PatternMonitorService` (pattern-monitor.service.ts:333-344) writes ABUSE `RiskEvent` rows with `delta: 0` and `riskScoreAfter: 0`. The profile's `riskScore` is only updated inside `ScoringService.updateScoresAfterTask` (scoring.service.ts:84-103). So a HIGH-severity cluster does NOT raise the affected websites' riskScore.

**Missing:** Real ABUSE risk delta applied to affected profiles.

**Files:** `src/modules/task/market-algoritm/pattern-monitor.service.ts`, `src/modules/task/market-algoritm/scoring.service.ts`, `scoring.utils.ts`

**Change:** Compute and persist a real ABUSE delta to each affected profile (reuse `calculateRiskScore` + the immutable `RiskEvent` writer) instead of writing placeholder `delta:0`.

**Complexity:** Low / Medium

---

## M5 — Admin CRUD for `NicheDistributionCap` (§12)

**Current (code):** `NicheDistributionCap` model exists (marketplace.prisma:359-377) and is consumed by `DistributionEngine.isNicheWithinCap` + `validateTransition` LEVEL 5. No controller/service creates or manages rows — caps only take effect if seeded manually.

**Missing:** Admin endpoint to create/update/list/delete niche caps.

**Files:** `prisma/schema/marketplace.prisma:359-377`, `src/modules/task/market-algoritm/distribution-engine.service.ts:103-139`, `src/modules/admin/*`

**Change:** Add `admin-niche-cap` module (controller + service + DTO) behind `AdminGuard`. Follow the pattern of `admin-marketplace-config`.

**Complexity:** Low

---

## M6 — De-duplicate `recordApprovedDomainInteraction` (§8 / §30)

**Current (code):** `DomainInteractionRecorderService.record` was added to consolidate the previously-duplicated logic. However `task-requester.service.ts:1138` still calls a *local* `recordApprovedDomainInteraction`, and `admin-task.service.ts` historically had its own copy. Risk of divergent cooldown/niche logic.

**Missing:** Full consolidation onto `DomainInteractionRecorderService`.

**Files:** `src/modules/task/task-requester/task-requester.service.ts:1138`, `src/modules/task/admin-task/admin-task.service.ts`, `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts`

**Change:** Replace local `recordApprovedDomainInteraction` calls with `domainInteractionRecorderService.record(tx, {...})`.

**Complexity:** Low

---

## M7 — Supply/demand automatic balancing (§19)

**Current (code):** `LiquidityService.getLiquiditySnapshot` (admin-analytics/services/liquidity.service.ts) computes supply/demand ratios and `LOW_SUPPLY`/`LOW_DEMAND` flags, but only surfaces them. No automatic action (mode switch, supply generation) is taken.

**Missing (if spec requires active balancing):** Automated reaction to imbalance.

**Files:** `src/modules/admin/admin-analytics/services/liquidity.service.ts`

**Change:** Wire flags into marketplace-mode auto-switch or supply-generation automation (optional — current monitoring is acceptable if spec only requires visibility).

**Complexity:** Medium

---

## M8 — Refactor `ValidationEngine` + add use-case layer (§30)

**Current (code):** `ValidationEngine` is an 831-line god-class owning normalisation (`normalizeRootDomain`), cooldown-day math, eligibility, tier/velocity, niche enforcement, and audit logging. Orchestration is embedded in fat `provider-task`/`task-requester` services.

**Missing:** Better SRP separation (no behaviour change required).

**Files:** `src/modules/task/market-algoritm/validation.engine.ts`, `src/modules/task/provider-task/provider-task.service.ts`, `src/modules/task/task-requester/task-requester.service.ts`

**Change:** Extract per-level validators (`EligibilityValidator`, `GovernanceValidator`, `CapacityValidator`, `BehaviourValidator`, `NicheValidator`) orchestrated by a thin `ValidationEngine`; move `normalizeRootDomain`/cooldown math to a `DomainUtils` value object; add a use-case/orchestration layer between controllers and engines.

**Complexity:** Medium (refactor, no behaviour change)

---

## M9 — Database: index + audit field (DB)

**Current (code):** `WebsiteMatchingProfile` is filtered by the daily crons on `(marketplaceStatus, isSuppressed, suppressedUntil)` using single-column indexes. `MarketplaceModeConfig` has no `updatedById`.

**Missing:** Composite index for cron performance; audit field for mode config.

**Files:** `prisma/schema/marketplace.prisma` (`WebsiteMatchingProfile` indexes ~87-98; `MarketplaceModeConfig` 482-490)

**Change:** Add `@@index([marketplaceStatus, isSuppressed, suppressedUntil])`; add `updatedById String?` to `MarketplaceModeConfig`. Optionally drop dead `enforceRevalidationAt*` fields.

**Complexity:** Low

---

## M10 — RiskRecalcCron (timed decay) (§15 / Jobs)

**Current (code):** Risk decay is applied per-event in `calculateRiskScore` (scoring.utils.ts:58-80). There is no scheduled job that recomputes decay across dormant profiles; an inactive site keeps its last `riskScore` until its next interaction.

**Missing (if spec requires timed decay for inactive sites):** Periodic risk recalc cron.

**Files:** `src/modules/task/market-algoritm/scoring.utils.ts`, `src/modules/task/market-algoritm/*cron.ts`

**Change:** Add a cron that re-runs `calculateRiskScore` decay for all profiles on a schedule (idempotent, batched).

**Complexity:** Low / Medium

---

## M11 — Emit `REPEAT_BURST` / `RECIPROCAL_RING` flags (§14, optional)

**Current (code):** `PatternFlagType` enum has `CLUSTER_CONCENTRATION`, `RECIPROCAL_RING`, `REPEAT_BURST`. Only `CLUSTER_CONCENTRATION` is produced; reciprocal/repeat are observed-for-logging only (pairwise cooldowns handle enforcement).

**Missing:** Optional emission of the other two flag types for visibility.

**Files:** `src/modules/task/market-algoritm/pattern-monitor.service.ts`, `prisma/schema/marketplace.prisma:396-400`

**Change:** Optionally persist `REPEAT_BURST`/`RECIPROCAL_RING` `PatternFlag` rows. Not required (pairwise cooldowns already enforce).

**Complexity:** Low

---

## M12 — Admin endpoint for tier velocity profile overrides (§16 / API)

**Current (code):** `TierEngine` reads `weeklyInteractionLimit`/`tierVelocityLimit` from `WebsiteMatchingProfile` (marketplace.prisma:78-79) but there is no admin endpoint to set them per profile.

**Missing:** Admin endpoint to override a website's tier velocity limits.

**Files:** `src/modules/task/market-algoritm/tier-engine.service.ts`, `src/modules/admin/*`

**Change:** Add admin endpoint (extend `admin-website-status` or new module) to set `weeklyInteractionLimit`/`tierVelocityLimit`.

**Complexity:** Low

---

## M13 — Explicit daily spacing rule (§13, conditional)

**Current (code):** Daily velocity is enforced as a count (`maxProviderMatchesPerDay`) in ranking + `validateTransition` LEVEL 3. There is no minimum *time gap* between consecutive matches for a provider.

**Missing (only if spec requires time-gap spacing, not just count-per-day):** Spacing rule.

**Files:** `src/modules/task/market-algoritm/validation.engine.ts:589-627`, `ranking.service.ts:77-92`

**Change:** Add a minimum-inter-match spacing check (e.g. using `lastMatchedAt`) if required.

**Complexity:** Low

---

## What is NOT missing (no action needed)

- No new Prisma models/tables are required — every spec-implied entity already exists.
- No section is entirely unimplemented.
- Authorization (AdminGuard, ownership checks) is present at the service layer.
- Background jobs cover all required categories (score/opportunity, cleanup, pattern, liquidity, boost-decay, notifications).

---

## Suggested build order

1. M1 (credit refund) — highest user/credit correctness impact, low effort.
2. M2 (trust indicators) — high product value, low effort.
3. M3 (fallback message) — UX/transparency.
4. M4 (ABUSE risk delta) — correctness of risk enforcement.
5. M5 (niche cap CRUD) — completes configurability.
6. M6 (de-duplicate recorder) — removes divergence risk.
7. M12 (tier override endpoint) — admin completeness.
8. M9 (DB index/field) — performance/audit.
9. M7 (auto-balance) — only if active balancing mandated.
10. M10 (risk recalc cron) — only if timed decay mandated.
11. M11 (extra flags) — optional.
12. M13 (spacing rule) — conditional.
13. M8 (refactor) — maintainability, schedule independently.
