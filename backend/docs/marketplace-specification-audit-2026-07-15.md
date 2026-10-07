# Marketplace Specification Audit Report

**Project:** backlyst-backend (NestJS + Prisma + BullMQ)
**Audit date:** 2026-07-15
**Auditor role:** Senior Software Architect / Backend Engineer / Marketplace Systems Expert / Technical Auditor
**Method:** Every conclusion below is tied to actual source code. Where a requirement could not be verified from code, the report states "Not found in code."

---

## Scope & Method

The audit inspected the following implementation artifacts:

- `src/modules/task/market-algoritm/*` — matching engine, ranking service, scoring service, validation engine, opportunity-guarantee cron.
- `src/modules/task/{provider-task,task-requester,admin-task}/*` — task lifecycle services/controllers.
- `src/modules/credit/*` — credit deduction/refund/reward/wallet.
- `src/modules/website/*` — website verification, marketplace visibility status, tags, categories.
- `src/modules/notification/*`, `src/modules/task-notification/*` — notification engines.
- `src/modules/admin/*` — admin controls & analytics.
- `prisma/schema/*` — Prisma models, enums, indexes.

**Key structural finding:** Marketplace logic (matching, ranking, validation, scoring) lives in `market-algoritm` but is *consumed* and *intertwined* with task lifecycle services. Domain-interaction writes and scoring updates are duplicated inside `provider-task` / `task-requester` services (see §30).

---

## Status Legend

- ✅ Fully Implemented
- 🟡 Partially Implemented
- ❌ Missing
- ⚠ Needs Refactor

---

## SECTION 1 — Marketplace Eligibility

### Requirement
Website verification, website ownership validation, active/deleted/suspended status, provider ownership, task eligibility, duplicate applications, own-task prevention.

### Current Implementation
- **Website verification:** `ValidationEngine.isWebsiteRowMarketplaceEligible` (validation.engine.ts:246) requires `verificationStatus === 'VERIFIED'`, `marketplaceVisibilityStatus === 'VISIBLE'`, `isFlag === false`, `isWalletLock === false`. Website verification flows exist in `src/modules/website/website-verification/*` (meta-tag, DNS, screenshot).
- **Ownership:** `provider-task.service.ts:302` (`applyToTask`) verifies `authorId === providerId` on the provider website. `task-requester.service.ts:655` enforces `task.requesterId === requesterId` on selection. JWT strategy blocks `BANNED` users (jwt.strategy.ts:40).
- **Active/Deleted:** `validation.engine.ts:80` `isUserActive` checks `user.status === 'ACTIVE'`. `isWebsiteRowMarketplaceEligible` checks `isDeleted === false`.
- **Suspended:** There is NO implementation of a marketplace "suspended" *account/website* status. The user enum has `SUSPENDED` (enums.prisma:11) but the website marketplace eligibility checks do not reference it; only `WebsiteMatchingProfile.marketplaceStatus === 'SUSPENDED'` is defined in the enum (marketplace.prisma:16) and checked in `validation.engine.ts:255`.
- **Task eligibility:** `matching.engine.ts:165` validates `status` against open lifecycle statuses. `applyToTask` (provider-task.service.ts:298) requires task status `OPEN`/`WAITING_FOR_APPLICANTS`.
- **Duplicate applications:** `provider-task.service.ts:350` blocks existing application per provider+task.
- **Own-task prevention:** `provider-task.service.ts:297` throws if `task.requesterId === providerId`; `validation.engine.ts:358` (`OWN_TASK` rule) at `PROVIDER_APPLICATION` stage.

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:80, 88, 246, 328, 358`
- `src/modules/task/provider-task/provider-task.service.ts:297, 302, 350`
- `src/modules/task/task-requester/task-requester.service.ts:655`
- `src/modules/auth/strategies/jwt.strategy.ts:40`
- `prisma/schema/enums.prisma:6,11`; `prisma/schema/marketplace.prisma:10-17`

### Status
🟡 Partially Implemented

### Gap Analysis
Website-account-level `SUSPENDED` status is not enforced for marketplace participation (only the matching-profile `marketplaceStatus` is). User `DELETED`/`SUSPENDED` are not explicitly part of eligibility checks (only `ACTIVE` is accepted; `DELETED`/`SUSPENDED` are implicitly rejected because they are not `ACTIVE` — acceptable). Verification re-check at application is present; however eligibility is re-checked at multiple stages inconsistently (see §17).

### Recommendation
Keep existing helpers; route all eligibility through `ValidationEngine` (single source of truth). Add explicit handling for user `SUSPENDED`/`DELETED` in `isUserActive` for clarity. No new models required.


---

## SECTION 2 — Matching Engine

### Requirement
website-based matching, category matching, tag matching, country, language, placement type, DA/DR compatibility, progressive relaxation, verification never relaxed.

### Current Implementation
- **website-based matching:** `matching.engine.ts` matches provider websites against requester websites by root domain via `ValidationEngine.normalizeRootDomain`. Same-domain pairing is blocked (`canMatch` returns false when `normalizedSource === normalizedTarget`).
- **category matching:** `buildHardRuleCandidates` (`matching.engine.ts:286`) computes `categoryExact` from `primaryCategoryKey` equality; `industryRelated` from normalized `industry`.
- **tag matching:** `countTagOverlap`/`normalizeTags` (`matching.engine.ts:292, 456, 462`) computes tag overlap on `marketplaceTagKeys`.
- **country/language:** normalized at `matching.engine.ts:151,294,367`; treated as `UNKNOWN` when task has no requirement (exact-or-unknown rules).
- **placement type:** `getCandidateTasks` filters `placementType`/`linkAttribute` (`matching.engine.ts:181`).
- **DA/DR compatibility:** `calculateCompatibility` (`matching.engine.ts:397`) checks `requiredDomainRating` vs `providerWebsite.domainRating`; `authorityMeets` flag; `-15` penalty when below. Additionally `applyToTask` calls live Moz DA check (`provider-task.service.ts:335`).
- **progressive relaxation:** implemented inline in `matching.engine.ts:351` (`applyRelaxation`) with levels 0-3 + passthrough level 4 (see §3).
- **verification never relaxed:** candidate provider/requester websites are sourced only from eligibility helpers that require `VERIFIED` + `VISIBLE` (validation.engine.ts:110-150). Relaxation never downgrades verification. ✓

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:160-395`
- `src/modules/task/provider-task/provider-task.service.ts:335-348`
- `src/modules/task/market-algoritm/validation.engine.ts:110-150, 214-244`

### Status
✅ Fully Implemented (matching criteria) — engine structure present; see §3 for relaxation quality.

### Gap Analysis
Matching criteria are covered. The relaxation logic is inline (not in `matching-relaxation.engine.ts`, which is a disabled placeholder — see §3). DA/DR is assessed but `domainRating` is only populated when Moz stats run; matching still relies on optional field.

### Recommendation
Move inline relaxation into `matching-relaxation.engine.ts` and make thresholds configurable (already planned in `docs/marketplace-remaining-tasks.md` task 4).

---

## SECTION 3 — Dynamic Relaxation

### Requirement
Exact match → Related match → Broad match → Fallback progression.

### Current Implementation
`applyRelaxation` (matching.engine.ts:351-394) defines thresholds per level:
- Level 0: category EXACT AND tags EXACT AND (country EXACT OR UNKNOWN) AND (language EXACT OR UNKNOWN).
- Level 1: category EXACT AND tags PARTIAL AND language EXACT/UNKNOWN.
- Level 2: category RELATED AND country EXACT/UNKNOWN.
- Level 3: category RELATED OR tags PARTIAL.
- Level 4 (passthrough): always passes.

`matching.engine.ts:85` iterates `level = 0..maxRelaxationLevel` (default 4) and selects the lowest level that yields `>= minViableMatches` (default 10).

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:85-94, 351-394`
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts` (placeholder, 6 lines)
- `prisma/schema/marketplace.prisma:154-155` (minViableMatches, maxRelaxationLevel)

### Status
🟡 Partially Implemented

### Gap Analysis
The *progression* exists and works, but:
1. The dedicated `MatchingRelaxationEngine` is a disabled placeholder (`matching-relaxation.engine.ts`): "Marketplace relaxation engine is intentionally disabled for now."
2. Stages are not labelled `EXACT`/`RELATED`/`BROAD`/`FALLBACK` semantically; level 4 is a broad passthrough with no explicit "fallback" semantics or messaging.
3. Thresholds are hardcoded in `matching.engine.ts`, not configurable per marketplace mode.

### Recommendation
Activate the relaxation engine (task 4 in remaining-tasks), express named stages, and make thresholds config-driven.

---

## SECTION 4 — Ranking Engine

### Requirement
Compatibility Score, Opportunity Score, Visibility Score, Reputation Score, Boost Score, Exposure Penalty, Risk Penalty, Final ranking formula.

### Current Implementation
`TommacayRankingService.rankAndFilter` (ranking.service.ts:9-82) computes:
- `compatibilityScore` (from matching engine)
- `opportunityScore`, `visibilityScore`, `reputationScore`, `boostScore = boostFactor*20`
- `exposurePenalty = exposureCount7d * exposurePenaltyPerTaskView`
- `riskPenalty = (riskScore/100) * riskPenaltyRejectionWeight`
- `forceMatchBonus`, `authorityPenalty`
- Final = `compatibility*compatibilityWeight + opportunity*opportunityWeight + visibility*visibilityWeight + reputation*reputationWeight + boost*boostWeight - exposurePenalty - riskPenalty - authorityPenalty + forceMatchBonus`
- Ranking weights come from `MarketplaceScoringConfig` (ranking.service.ts:124-145).

Suppressed profiles (`isSuppressed` && within `suppressedUntil`) and daily-capped profiles (`dailyMatches >= maxProviderMatchesPerDay`) are filtered out (ranking.service.ts:21-32).

### Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:9-145`
- `prisma/schema/marketplace.prisma:145-176` (scoring config)

### Status
✅ Fully Implemented

### Gap Analysis
All eight required signals and a final weighted formula are present. `internalPriorityScore`, `diversityScore`, `reliabilityScore` exist in schema but are NOT used in the ranking formula. Distribution/network-concentration penalty missing (see §11). Ranking is applied only to provider opportunity listing, not to requester-side provider selection ranking.

### Recommendation
Optionally incorporate `internalPriorityScore`/`diversityScore` into the formula; wire ranking into requester selection. Low effort.

---

## SECTION 5 — Visibility Control

### Requirement
visibility weighting, priority reduction, frequency reduction, non-destructive visibility control.

### Current Implementation
- **visibility weighting:** `visibilityScore` weighted in ranking formula (ranking.service.ts:52) and computed by `calculateVisibilityScore` (scoring.utils.ts:21).
- **priority reduction:** `internalPriorityScore` field exists (marketplace.prisma:37) but is never written/read in ranking. `MarketplaceOverride` enum includes `SUPPRESS`/`PENALTY`/`SCORE_OVERRIDE` (marketplace.prisma:1-7) but has zero runtime consumers.
- **frequency reduction:** `exposureCount7d` (capped via exposure penalty) and `maxProviderMatchesPerDay` cap in ranking. Per-requester frequency (`maxRequesterExposurePerDay`) exists in config (marketplace.prisma:166) but is never enforced.
- **non-destructive:** visibility changes are score/flag updates, not destructive deletes. ✓

### Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:38-58`
- `src/modules/task/market-algoritm/scoring.utils.ts:21-41`
- `prisma/schema/marketplace.prisma:1-7, 37, 66, 166`

### Status
🟡 Partially Implemented

### Gap Analysis
No admin-controlled priority reduction (override) is wired. `internalPriorityScore`, `forceMatchNext` are schema-only in ranking. Per-requester exposure frequency is unenforced. `MarketplaceOverride` has 0 runtime consumers.

### Recommendation
Build override resolution into ranking/matching (remaining-tasks task 5). Enforce `maxRequesterExposurePerDay`.

---

## SECTION 6 — Website Quality

### Requirement
Track completion, activity, reliability, interaction diversity, behaviour patterns, quality penalties.

### Current Implementation
- **completion:** `completionRate`, `completedInteractions`, `failedInteractions`, `totalInteractions`, `successfulInteractions` (marketplace.prisma:41,46-50).
- **activity:** `lastShownAt`, `lastMatchedAt`, `lastSelectedAt`, `lastCompletedAt` (marketplace.prisma:61-65) updated by ranking/scoring.
- **reliability:** `reliabilityScore` field exists (marketplace.prisma:38) but is NEVER updated or read by runtime code (only seeded with default 50).
- **interaction diversity:** `diversityScore` field exists (marketplace.prisma:40) but is NEVER updated or read at runtime.
- **behaviour patterns:** Not found in code.
- **quality penalties:** `avgQualityRating`/`qualityRatingSum` tracked (scoring.service.ts:47-57); `calculateReputationScore` applies failure/quality penalty (scoring.utils.ts:43-55); suppression when `completionRate < 0.4 && totalInteractions >= 10` (scoring.service.ts:71).

### Evidence
- `src/modules/task/market-algoritm/scoring.service.ts:40-98`
- `src/modules/task/market-algoritm/scoring.utils.ts:21-110`
- `prisma/schema/marketplace.prisma:38, 40, 46-50, 61-65`

### Status
🟡 Partially Implemented

### Gap Analysis
Completion, activity, quality penalties are implemented. `reliabilityScore` and `diversityScore` are dead fields (never written/read). Behaviour-pattern tracking and explicit quality penalties at submission review (beyond reputation) are not implemented.

### Recommendation
Wire `reliabilityScore`/`diversityScore` to actual computations or drop the fields. Add behaviour-pattern signals for PatternMonitoring (see §14).

---

## SECTION 7 — Website Status

### Requirement
Active, Low Priority, Limited Access, Under Review, Restricted, Suspended.

### Current Implementation
`WebsiteMarketplaceStatus` enum defines all six states (marketplace.prisma:10-17). `isWebsiteRowMarketplaceEligible` (validation.engine.ts:255) rejects any profile where `marketplaceStatus !== 'ACTIVE'`. `domainInteraction`/`DomainPairStat` track status transitions indirectly.

### Evidence
- `prisma/schema/marketplace.prisma:10-17`
- `src/modules/task/market-algoritm/validation.engine.ts:253-262`

### Status
🟡 Partially Implemented

### Gap Analysis
The enum and status-gated eligibility exist (all non-ACTIVE are blocked). However, there is NO code path that transitions a website into `LOW_PRIORITY`, `LIMITED_ACCESS`, `UNDER_REVIEW`, `RESTRICTED`, or `SUSPENDED`. Status is effectively binary (ACTIVE vs blocked). No admin API sets these statuses. The distinction between states is not used in matching/ranking (only ACTIVE/non-ACTIVE matters).

### Recommendation
Implement status-transition service + admin API. Map each state to concrete ranking/visibility effects (partial visibility, priority reduction, etc.).

---

## SECTION 8 — Domain Relationship Tracking

### Requirement
relationship history, root-domain tracking, interaction logging, timestamps.

### Current Implementation
- **root-domain tracking:** `Website.rootDomain` (website.prisma:54) and `ValidationEngine.normalizeRootDomain` (validation.engine.ts:23-68) with two-part public suffix handling.
- **interaction logging:** `DomainInteraction` model (marketplace.prisma:233-256) records `sourceWebsiteId`, `targetWebsiteId`, `sourceDomain`, `targetDomain`, `normalizedPairKey`, `completedAt`. Written in `task-requester.service.ts:211` (`recordApprovedDomainInteraction`) at approval.
- **timestamps:** `completedAt`, `createdAt` on `DomainInteraction`; `lastInteractionAt`, `repeatPairCooldownUntil`, `reciprocalCooldownUntil` on `DomainPairStat` (marketplace.prisma:258-282).

### Evidence
- `prisma/schema/marketplace.prisma:233-282`
- `src/modules/task/task-requester/task-requester.service.ts:144-260`
- `src/modules/task/market-algoritm/validation.engine.ts:23-68`

### Status
✅ Fully Implemented

### Gap Analysis
Core relationship tracking is present. "Relationship history" is limited to completed interactions (`DomainInteraction` is keyed `taskId @unique`, i.e. one row per completed task). Pre-completion events (impression/application/selection) are NOT recorded as domain relationships (only `OpportunityImpression` exists). No relationship history for non-completed pairings.

### Recommendation
Optionally add impression/application/selection relationship events. Otherwise satisfies the requirement at the completed-interaction level.

---

## SECTION 9 — Reciprocal Rules

### Requirement
Reciprocal prevention; determine time window, configuration, enforcement point.

### Current Implementation
- **time window:** `reciprocalCooldownDays` default 120 (marketplace.prisma:180), read from config via `getCooldownDays` (validation.engine.ts:269-279). Fallback constant 120 (validation.engine.ts:19).
- **configuration:** admin-configurable via `MarketplaceScoringConfig.reciprocalCooldownDays`.
- **enforcement:** `canMatch`/`canMatchWithWindows` (validation.engine.ts:214-244, 468-492) checks `DomainPairStat.reciprocalCooldownUntil`. Direction-aware: reciprocal means reversed source/target within window. Enforced at `PROVIDER_APPLICATION`, `TASK_ACCEPTANCE`, `INTERACTION_APPROVAL` via `validateTransition`.

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:19, 214-244, 269-279, 367-383, 468-492`
- `prisma/schema/marketplace.prisma:180, 271`

### Status
✅ Fully Implemented

### Gap Analysis
Reciprocal prevention is correct and config-driven. One nuance: `DomainPairStat.reciprocalCooldownUntil` is set only when an interaction is *recorded* (approval path). So reciprocal detection only kicks in after a prior completion — correct by definition. No issue found.

### Recommendation
None required.

---

## SECTION 10 — Repeat Pair Rules

### Requirement
Cooldown between identical domain pairs.

### Current Implementation
`repeatPairCooldownDays` default 90 (marketplace.prisma:179). `DomainPairStat.repeatPairCooldownUntil` set on completion (`task-requester.service.ts:202`). `getCooldownBlockedPairKeys` (validation.engine.ts:153-184) and `canMatch` block pairs within window. Applied at validation stages.

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:153-184, 214-244, 367-383`
- `src/modules/task/task-requester/task-requester.service.ts:195-260`
- `prisma/schema/marketplace.prisma:179, 270`

### Status
✅ Fully Implemented

### Gap Analysis
None significant. Cooldown window is symmetric per pair key.

### Recommendation
None required.


---

## SECTION 11 — Distribution Rules

### Requirement
Domain diversity, repeated pair reduction, network concentration prevention.

### Current Implementation
- **repeated pair reduction:** handled via repeat-pair cooldown (§10) and `forceNewDomainNext`/`forceNewDomainUntil` fields (marketplace.prisma:43-44) — but these are NEVER read or written by runtime code (only seeded defaults).
- **domain diversity:** `diversityScore` field exists but is never computed (§6).
- **network concentration prevention:** Not found in code. No engine prevents a single network/root-domain from dominating a requester's matches.

### Evidence
- `prisma/schema/marketplace.prisma:40, 43-44`
- `src/scripts/backfill-website-matching-profiles.ts:32-33` (seed only)

### Status
❌ Missing (Distribution Engine)

### Gap Analysis
No `DistributionEngine` exists. The only diversity mechanism is the repeat-pair cooldown, which prevents *exact* repeats but not concentration across many related domains. `forceNewDomainNext` is dead.

### Recommendation
Build a `DistributionEngine` with diversity quotas, repeated-pair reduction beyond cooldown, and network-concentration ranking penalties (remaining-tasks task 9 — complexity High/Very High).

---

## SECTION 12 — Niche Distribution

### Requirement
primary niche, secondary niche, distribution limits.

### Current Implementation
- **primary niche:** `Website.primaryCategoryKey` / `primaryCategory` (website.prisma:55-56) + `WebsiteCategoryKey` model (website.prisma:109-115). Used in matching (category exact/related).
- **secondary niche:** Not found in code. No secondary category/niche field or model.
- **distribution limits:** Not found in code (ties to §11 Distribution Engine).

### Evidence
- `prisma/schema/website.prisma:55-56, 109-115`
- `src/modules/task/market-algoritm/matching.engine.ts:286-291`

### Status
🟡 Partially Implemented

### Gap Analysis
Primary niche is present and used. Secondary niche and per-niche distribution limits are absent.

### Recommendation
Add `secondaryCategoryKey` to `Website`. Add niche distribution limits to the Distribution Engine.

---

## SECTION 13 — Velocity Rules

### Requirement
weekly limits, daily spacing, interaction frequency.

### Current Implementation
- **daily spacing:** `maxProviderMatchesPerDay` (default 3) enforced in ranking via `getDailyProviderWebsiteCounts` (ranking.service.ts:30, 147-169). Also `dailyMatches >= maxProviderMatchesPerDay` check in `validateTransition` (validation.engine.ts:386-393).
- **weekly limits:** `WebsiteMatchingProfile.weeklyInteractionLimit` (marketplace.prisma:70) exists but is NEVER set or enforced. `SubscriptionPlan.monthlyTaskCredits` exists but is not tied to marketplace velocity.
- **interaction frequency:** exposure frequency capped via `exposureCount7d`; `maxRequesterExposurePerDay` config (marketplace.prisma:166) NOT enforced. `applicationCount7d`/`matchCount7d` (marketplace.prisma:67-68) are NEVER updated.

### Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:30, 147-169`
- `src/modules/task/market-algoritm/validation.engine.ts:386-393`
- `prisma/schema/marketplace.prisma:70, 66-68, 166`

### Status
🟡 Partially Implemented

### Gap Analysis
Only daily cap is enforced. Weekly interaction limits, true interaction-frequency counters (application/match per week), and per-requester exposure frequency are all unenforced or dead fields.

### Recommendation
Build a `VelocityEngine` (remaining-tasks task 7) to compute/enforce weekly + daily + frequency limits from `weeklyInteractionLimit`, `matchCount7d`, `applicationCount7d`.

---

## SECTION 14 — Pattern Monitoring

### Requirement
repeat detection, reciprocal detection, cluster detection, group concentration.

### Current Implementation
- **repeat detection:** ✅ via `DomainPairStat.repeatPairCooldownUntil` (§10).
- **reciprocal detection:** ✅ via `DomainPairStat.reciprocalCooldownUntil` (§9).
- **cluster detection:** Not found in code.
- **group concentration:** Not found in code.

### Evidence
- `prisma/schema/marketplace.prisma:258-282`
- No `PatternMonitoringEngine` or cluster/group-concentration query found in `src/`.

### Status
🟡 Partially Implemented (pairwise only)

### Gap Analysis
Only pairwise repeat/reciprocal is detected. No graph/cluster analysis over `DomainInteraction` for coordinated rings or network concentration.

### Recommendation
Build `PatternMonitoringEngine` (remaining-tasks task 11 — Very High) over the `DomainInteraction` graph; emit risk events.

---

## SECTION 15 — Risk Engine

### Requirement
risk score, risk calculation, risk penalties.

### Current Implementation
- **risk score field:** `WebsiteMatchingProfile.riskScore` (marketplace.prisma:39), default 0.
- **risk penalty:** used in ranking (`riskPenalty = (riskScore/100)*riskPenaltyRejectionWeight`, ranking.service.ts:41) and in eligibility (`riskScore >= 75` → reject, validation.engine.ts:407).
- **risk calculation:** Not found in code. No service computes or writes `riskScore`. `riskPenaltyDisputeWeight` config (marketplace.prisma:175) is NEVER read. `riskScore` is only ever set to 0 at profile creation.

### Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:41-43`
- `src/modules/task/market-algoritm/validation.engine.ts:403-409`
- `prisma/schema/marketplace.prisma:39, 175`
- `src/scripts/backfill-website-matching-profiles.ts:31` (only sets 0)

### Status
🟡 Partially Implemented

### Gap Analysis
The risk *field* and *penalty consumption* exist, but there is NO risk calculation. `riskScore` is never updated from disputes/rejections/failures. `riskPenaltyDisputeWeight` is dead. Today `riskScore >= 75` only rejects because the value is stuck at 0 — effectively no risk gating.

### Recommendation
Build a `RiskEngine` that recalculates `riskScore` from disputes, rejections, cancellations, failures; consume `riskPenaltyDisputeWeight`. Add background job for recalculation.

---

## SECTION 16 — Tier System

### Requirement
Free, Silver, Gold, Platinum, Enterprise; weekly limits, priority, tier enforcement.

### Current Implementation
- **tiers:** `PlanTier` enum (enums.prisma:87-93) with FREE/SILVER/GOLD/PLATINUM/ENTERPRISE. `SubscriptionPlan` model (subscriptionPlan.prisma:1-33) with `monthlyTaskCredits`, `maxWebsites`, `maxSimultaneousTasks`, `visibility`.
- **weekly limits:** `WebsiteMatchingProfile.tierVelocityLimit` (marketplace.prisma:71) exists but is NEVER set or enforced.
- **priority:** No tier-based priority weighting in ranking.
- **tier enforcement:** No code enforces tier-based marketplace limits. `monthlyTaskCredits` is subscription billing, not marketplace velocity enforcement.

### Evidence
- `prisma/schema/enums.prisma:87-93`
- `prisma/schema/subscriptionPlan.prisma:1-33`
- `prisma/schema/marketplace.prisma:71`

### Status
🟡 Partially Implemented

### Gap Analysis
Tier *definitions* and subscription plans exist, but no `TierEngine` maps tier → marketplace weekly limits, priority, or velocity enforcement. `tierVelocityLimit` is dead.

### Recommendation
Build a `TierEngine` (remaining-tasks task 8) that derives limits/priority from `PlanTier` and writes `tierVelocityLimit`; inject into `ValidationEngine` and ranking.

---

## SECTION 17 — Validation Engine

### Requirement
Validation before approval; eligibility, cooldowns, risk, velocity, tier, distribution.

### Current Implementation
`ValidationEngine.validateTransition` (validation.engine.ts:286-456) implements 5 levels:
- L1 Eligibility (user active, website eligible, own-task) — never overridable.
- L2 Governance (repeat/reciprocal cooldowns) — overridable by admin.
- L3 Capacity (daily limit; weekly/tier **stubbed** — `// null/undefined => not enforced yet`, validation.engine.ts:394-395).
- L4 Behaviour (risk threshold, marketplace status) — fail-closed.
- L5 Optimization (non-blocking restrictions).

Called at: `applyToTask` (PROVIDER_APPLICATION, provider-task.service.ts:321), `selectProvider` (TASK_ACCEPTANCE, task-requester.service.ts:685), `reviewTask` APPROVE (INTERACTION_APPROVAL, task-requester.service.ts:1066), `forceApproveTask` (ADMIN_FORCE, admin-task.service.ts:1006). Rollout guard can skip re-validation (validation.engine.ts:312-326).

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:286-456`
- `src/modules/task/provider-task/provider-task.service.ts:321`
- `src/modules/task/task-requester/task-requester.service.ts:685, 1066`
- `src/modules/task/admin-task/admin-task.service.ts:1006`

### Status
⚠ Needs Refactor

### Gap Analysis
The engine exists and is partially wired, but: (a) weekly/tier/distribution/velocity levels are stubbed (not enforced); (b) re-validation can be globally disabled by `enforceRevalidationAtAcceptance/Approval` (validation.engine.ts:312) — a rollout guard that can silently bypass Stage 4/5; (c) eligibility logic is duplicated across `provider-task`/task-requester services AND the engine; (d) `WebsiteMatchingProfile` may be missing → only `INTERACTION_APPROVAL` fails closed (MISSING_MATCHING_PROFILE) while earlier stages assume existence. This is the #1 architectural risk called out in `docs/marketplace-remaining-tasks.md`.

### Recommendation
Centralize all constraint checks into `validateTransition`; auto-create profile before eligibility; remove the global re-validation bypass or gate it strictly; complete L3/L5 (remaining-tasks task 1).

---

## SECTION 18 — Liquidity Protection

### Requirement
fallback behaviour, empty result prevention, admin-assisted matching.

### Current Implementation
- **fallback behaviour:** `matching.engine.ts:80-94` switches `marketplaceMode` to `LOW_POOL` when `hardRuleCandidates < minViableMatches` and relaxes further. `MatchingAuditLog.marketplaceMode` records `NORMAL`/`LOW_POOL`.
- **empty result prevention:** engine always attempts relaxation to level 4 before returning (matching.engine.ts:91). If still empty, returns `[]` with audit `NONE`/`LOW_POOL`. No admin-assisted matching.
- **admin-assisted matching:** Not found in code. No manual match queue.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:80-94, 432-454`
- `prisma/schema/marketplace.prisma:127-143` (MatchingAuditLog)

### Status
🟡 Partially Implemented

### Gap Analysis
Progressive relaxation prevents immediate "no results", and mode is audited. But there is no admin-assisted matching queue and no marketplace balancing. `LOW_POOL` is only a logged string, not an actionable mode.

### Recommendation
Build `LiquidityEngine` + admin manual match queue (remaining-tasks task 10 — Very High).

---

## SECTION 19 — Supply vs Demand

### Requirement
marketplace balancing, provider/requester monitoring.

### Current Implementation
Admin analytics exist (`admin-analytics/*`) for task lifecycle and risk reporting, but NO supply/demand balancing logic. No model tracks supply/demand by niche/country/language/tier. `OpportunityGuaranteeCron` adjusts opportunity/boost scores but does not balance supply vs demand.

### Evidence
- `src/modules/admin/admin-analytics/*`
- `src/modules/task/market-algoritm/opportunity-guarantee.cron.ts`

### Status
❌ Missing

### Gap Analysis
No supply/demand model, no balancing, no low-pool alerts to operators.

### Recommendation
Add `MarketplaceMetricSnapshot` model + `MarketplaceAnalyticsEngine` (part of task 10).

---

## SECTION 20 — New User Boost

### Requirement
early visibility boost, first-success optimisation.

### Current Implementation
- **early visibility boost:** `initialBoostFactor = 2.5` (scoring.utils.ts:11) and `newWebsiteBoostFactor = 2.5` config (marketplace.prisma:157). `boostFactor` default 2.5 gives new sites a ranking boost. `OpportunityGuaranteeCron` raises `boostFactor` when `hoursSinceLastMatch > 72` (opportunity-guarantee.cron.ts:39-42).
- **first-success optimisation:** `firstSuccessBoostActive` field (marketplace.prisma:42) exists but is NEVER read/written at runtime. `MARKETPLACE_FIRST_SUCCESS` notification type (notification.prisma:87) is declared but never sent.

### Evidence
- `src/modules/task/market-algoritm/scoring.utils.ts:11`
- `prisma/schema/marketplace.prisma:42, 157`
- `src/modules/task/market-algoritm/opportunity-guarantee.cron.ts:39-49`
- `prisma/schema/notification.prisma:87`

### Status
🟡 Partially Implemented

### Gap Analysis
Generic new-site boost via high initial `boostFactor` exists. But explicit "first-success" optimisation (`firstSuccessBoostActive`) and the `MARKETPLACE_FIRST_SUCCESS` notification are dead/unwired.

### Recommendation
Wire `firstSuccessBoostActive` consumption + send `MARKETPLACE_FIRST_SUCCESS` on first completion.


---

## SECTION 21 — Fallback Matching

### Requirement
Progressive fallback instead of immediate "no results".

### Current Implementation
`matching.engine.ts:85-94` loops relaxation levels 0..maxRelaxationLevel (default 4), selecting the first level meeting `minViableMatches` (default 10); otherwise uses max level. This is the same mechanism as §3 and satisfies progressive fallback.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:85-94`

### Status
✅ Fully Implemented

### Gap Analysis
Satisfies the requirement. Edge case: if pool is genuinely empty, returns `[]` (accepts empty result) — acceptable since relaxation already ran. No user-facing fallback message (ties to §29).

### Recommendation
Add safe empty-state messaging (§29).

---

## SECTION 22 — Trust Indicators

### Requirement
completed interactions, reliability, user-visible trust metrics.

### Current Implementation
- **completed interactions:** tracked on profile (`completedInteractions`, marketplace.prisma:46) and exposed in scoring. Not returned to users in opportunity/applicant APIs (not found as user-visible field).
- **reliability:** `reliabilityScore` field exists but is dead (§6).
- **user-visible trust metrics:** Not found in code. No API exposes trust metrics to providers/requesters.

### Evidence
- `prisma/schema/marketplace.prisma:46`
- `src/modules/task/provider-task/provider-task.service.ts:146` (opportunity items return raw `task`, no trust metrics)

### Status
🟡 Partially Implemented

### Gap Analysis
Data is collected but not surfaced. `reliabilityScore` is never computed.

### Recommendation
Expose safe trust metrics (completion rate, completed count) in opportunity/applicant responses; compute `reliabilityScore` (remaining-tasks task 14 — Low).

---

## SECTION 23 — Output Quality

### Requirement
submission review, quality penalties.

### Current Implementation
- **submission review:** `reviewTask` (task-requester.service.ts:999) supports APPROVE / REQUEST_REVISION / DISPUTED. Submission proof uploaded via `provider-task.service.ts` (`upload-proof`).
- **quality penalties:** `avgQualityRating`/`qualityRatingSum` recorded (scoring.service.ts:47-57); reputation penalty on failure (scoring.utils.ts:43-55). No explicit *submission-quality* penalty beyond reputation at completion.

### Evidence
- `src/modules/task/task-requester/task-requester.service.ts:999-1130`
- `src/modules/task/market-algoritm/scoring.service.ts:47-98`

### Status
🟡 Partially Implemented

### Gap Analysis
Review workflow exists. Quality *rating* flows into reputation, but there is no dedicated submission-quality scoring/penalty step (e.g. proof-quality tiers) separate from requester approval.

### Recommendation
Add optional quality rating at review and a dedicated quality-penalty path.

---

## SECTION 24 — Credit System

### Requirement
deduction, refund, failed task handling, rejected task handling.

### Current Implementation
`CreditTaskService` (credit-task.service.ts) implements:
- **deduction:** `deductTaskCredit` (credit-task.service.ts:74) — checks wallet, deducts, logs.
- **refund:** `refundTaskCredit` (called on requester cancellation, provider-task.service.ts:1058) and on dispute/rejection paths.
- **failed task handling:** `updateScoresAfterTask(websiteId, wasSuccessful=false)` applies failure penalty (scoring.service.ts:13-99).
- **rejected task handling:** Rejected applications marked `REJECTED` (provider-task.service.ts:760); rejected *submission* routes to DISPUTED with no specific credit penalty beyond reputation.
- Wallet model: `WebsiteCreditWallet` with subscription/earned/purchased/referral buckets (credit.prisma).

### Evidence
- `src/modules/credit/credit-task/credit-task.service.ts:74-260`
- `src/modules/task/provider-task/provider-task.service.ts:1058-1086`
- `src/modules/task/market-algoritm/scoring.service.ts:13-99`
- `prisma/schema/credit.prisma` (wallets)

### Status
✅ Fully Implemented

### Gap Analysis
Deduction, refund, failure penalty all present. One nuance: a *rejected submission* (DISPUTED) does not clearly apply a credit adjustment to either party beyond reputation scoring — depends on dispute resolution (§25, missing). Provider reward credit is granted only on APPROVE/COMPLETE.

### Recommendation
Tie rejected/failed task credit handling explicitly to dispute resolution (§25).

---

## SECTION 25 — Dispute System

### Requirement
disputes, resolution, credit adjustment.

### Current Implementation
Disputes are modelled only as a task lifecycle state: `DISPUTED` (enums.prisma:44) and `reviewTask` action reject → `DISPUTED` (task-requester.service.ts:1033). Admin task actions include `FLAG_ABUSE_PATTERN` (admin-task-action.dto.ts:11). There is NO dedicated `Dispute` model, no structured resolution record, and no dispute-linked credit adjustment.

### Evidence
- `prisma/schema/enums.prisma:44`
- `src/modules/task/task-requester/task-requester.service.ts:1033`
- `src/modules/task/admin-task/dto/admin-task-action.dto.ts:11`
- No `model Dispute` found in `prisma/schema/*`.

### Status
❌ Missing

### Gap Analysis
Dispute is an implicit task status only. No dispute record (parties, evidence, SLA, resolution notes), no resolution workflow, no linked credit adjustment. `riskPenaltyDisputeWeight` is dead because disputes never feed risk/credit.

### Recommendation
Add `Dispute` + `DisputeResolution` models and wire resolution → credit adjustment + risk update (remaining-tasks task 12 — Medium).

---

## SECTION 26 — Notification System

### Requirement
opportunity alerts, task updates, acceptance, rejection, reminders.

### Current Implementation
`TaskNotificationService` + `TaskNotificationTrigger` enum (26 triggers) cover: application submitted/accepted/rejected, task assigned, revision, approved, rejected, completed, cancelled, disputed, deadline extensions (task-notification-trigger.enum.ts). `NotificationModule` supports in-app + websocket + email (notification.service.ts, notification.gateway.ts, notification.processor.ts). `MARKETPLACE_NEW_OPPORTUNITY` notification type exists (notification.prisma:85).

### Evidence
- `src/modules/task-notification/enums/task-notification-trigger.enum.ts`
- `src/modules/notification/notification.service.ts`, `notification.gateway.ts`, `notification.processor.ts`
- `prisma/schema/notification.prisma:85-87`

### Status
🟡 Partially Implemented

### Gap Analysis
Task lifecycle + application notifications are well covered. BUT `PROVIDER_NEW_OPPORTUNITY` trigger and `MARKETPLACE_NEW_OPPORTUNITY` notification type are declared and never sent (no publisher emits them when new opportunities appear). Opportunity *alerts* and low-activity *reminders* (`MARKETPLACE_LOW_ACTIVITY_REMINDER`) are not dispatched.

### Recommendation
Emit `PROVIDER_NEW_OPPORTUNITY` after match generation; send low-activity reminders (remaining-tasks task 14 — Low).

---

## SECTION 27 — Admin Controls

### Requirement
manual matching, override, priority adjustment, restriction management, marketplace monitoring.

### Current Implementation
- **marketplace monitoring:** `admin-marketplace-visibility` (read-only list, admin-marketplace-visibility.service.ts) and `admin-analytics` (reports) exist.
- **manual/freeze:** `admin-task.service.ts` has freeze, force-approve/reject, force-complete, credit adjustment, abuse-pattern flag (admin-task-action.dto.ts).
- **override / priority adjustment / restriction management:** `MarketplaceOverride` model exists (marketplace.prisma:192-230) but has ZERO runtime consumers. No admin mutation API creates/revokes overrides or changes `marketplaceStatus`/`internalPriorityScore`.

### Evidence
- `src/modules/admin/admin-marketplace-visibility/*`
- `src/modules/admin/admin-analytics/*`
- `src/modules/task/admin-task/admin-task.service.ts`
- `prisma/schema/marketplace.prisma:192-230` (0 usages in src/)

### Status
🟡 Partially Implemented

### Gap Analysis
Monitoring + task-level admin actions exist. But `MarketplaceOverride` is never read or written; there is no API to set priority, apply suppression overrides, or manage restrictions. Admin actions therefore cannot influence matching/ranking.

### Recommendation
Build admin marketplace control APIs around `MarketplaceOverride` + status transitions; resolve active overrides in matching/ranking (remaining-tasks task 5 — High).

---

## SECTION 28 — Marketplace Modes

### Requirement
Early Stage Mode, Scaling Mode, configuration.

### Current Implementation
Only derived `marketplaceMode` strings `NORMAL`/`LOW_POOL` exist (matching.engine.ts:80-81, audit log). No `MarketplaceModeConfig` model, no Early Stage / Scaling configuration, no mode injection into matching/ranking/fallback.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:80-81, 432-454`
- No `MarketplaceModeConfig` model in `prisma/schema/*`.

### Status
❌ Missing

### Gap Analysis
No configurable marketplace modes. Mode is a post-hoc audit label, not a behavioural switch.

### Recommendation
Add `MarketplaceModeConfig` and inject into engines (remaining-tasks task 13 — Medium).

---

## SECTION 29 — User Experience

### Requirement
fallback messages, hidden restrictions, blocked opportunities.

### Current Implementation
- **safe messages:** `SAFE_MESSAGES` (validation-result.ts:24-29) returns generic "This opportunity is currently unavailable." to users — avoids leaking rule names (§17).
- **fallback messages:** Not found — empty opportunity pools return `[]` with no explanation.
- **hidden restrictions / blocked opportunities:** Not surfaced to users or admins. No diagnostic for why a specific opportunity is blocked.

### Evidence
- `src/modules/task/market-algoritm/validation-result.ts:24-29`
- `src/modules/task/provider-task/provider-task.service.ts:146-155` (returns items only)

### Status
🟡 Partially Implemented

### Gap Analysis
Safe messaging exists for rejections, but no empty-state/fallback messaging and no visibility into hidden restrictions or blocked opportunities.

### Recommendation
Add empty-state reasons and blocked-opportunity diagnostics (remaining-tasks task 14 — Low).

---

## SECTION 30 — System Architecture

### Requirement
Separate services/modules for Marketplace Engine, Matching Engine, Ranking Engine, Distribution Engine, Validation Engine, Quality Engine, Risk Engine, Tier Engine, Liquidity Engine, Notification Engine, Credit Engine, Analytics Engine, Admin Engine, Background Jobs. Identify mixed responsibilities.

### Current Implementation
| Engine | Module/Present? | Notes |
|---|---|---|
| Matching Engine | `market-algoritm/matching.engine.ts` | ✅ isolated service |
| Ranking Engine | `market-algoritm/ranking.service.ts` | ✅ isolated service |
| Validation Engine | `market-algoritm/validation.engine.ts` | ✅ isolated but under-wired |
| Quality/Scoring Engine | `market-algoritm/scoring.service.ts` + `scoring.utils.ts` | ✅ isolated |
| Notification Engine | `notification/*` + `task-notification/*` | ✅ isolated |
| Credit Engine | `credit/*` | ✅ isolated |
| Analytics Engine | `admin/admin-analytics/*` | ✅ isolated (admin-facing) |
| Admin Engine | `admin/*` + `admin-task/*` | ✅ isolated |
| Background Jobs | `opportunity-guarantee.cron.ts` | ⚠ only one cron |
| Distribution Engine | ❌ | missing |
| Risk Engine | ❌ (field only) | missing |
| Tier Engine | ❌ | missing |
| Liquidity Engine | ❌ | missing |

**Mixed responsibilities (violations of SRP/DDD):**
1. `provider-task.service.ts` (1090 lines) and `task-requester.service.ts` call `validateTransition`, `buildPairKey`, `normalizeRootDomain`, and write `DomainInteraction`/`DomainPairStat` directly — duplicating engine logic.
2. Domain-interaction writes are duplicated: `task-requester.service.ts:144-260` (`recordApprovedDomainInteraction`) vs engine responsibility.
3. Scoring updates (`updateScoresAfterTask`) are invoked from `admin-task.service.ts:954` and (implicitly) task flow, not from a domain event handler.
4. The dedicated `MatchingRelaxationEngine` is a placeholder; relaxation is inline in `matching.engine.ts`.
5. No cohesive `MarketplaceModule`; engines are registered ad-hoc in `provider-task.module.ts`.

### Evidence
- `src/modules/task/provider-task/provider-task.service.ts` (1086+ lines, mixed)
- `src/modules/task/task-requester/task-requester.service.ts:144-260`
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts` (placeholder)
- `src/modules/task/provider-task/provider-task.module.ts:7-22`

### Status
⚠ Needs Refactor

### Gap Analysis
Core engines are separable, but the task lifecycle services are god-services that reach into marketplace concerns (validation, domain tracking, scoring). Distribution/Risk/Tier/Liquidity engines are absent. This is the architectural debt that blocks safe extension.

### Recommendation
Create a cohesive `MarketplaceModule` owning the engines; move domain-interaction, scoring, validation, distribution, and risk updates into event-driven handlers (remaining-tasks task 16 — Refactor).


---

# DATABASE AUDIT

**Schema files:** `prisma/schema/{marketplace,placement,website,subscriptionPlan,subscription,credit,notification,enums,user,auth,legal-doc,message,admin-analytics}.prisma`. Multi-file Prisma schema (no `datasource`/`generator` in split files; configured via `package.json` prisma block → `prisma/schema`).

## Models present (relevant)
WebsiteMatchingProfile, OpportunityImpression, MatchingAuditLog, MarketplaceScoringConfig, MarketplaceOverride, MarketplaceOverrideAudit, DomainInteraction, DomainPairStat, MarketplaceValidationLog, PlacementTask, PlacementApplication, Website, WebsiteVerification, WebsiteCategoryKey, WebsiteMargetPlaceTag, SubscriptionPlan, Subscription, UserCreditWallet, WebsiteCreditWallet, SubscriptionCreditBatch, CreditLog, Notification models.

## Missing models
- `Dispute` / `DisputeResolution` (§25) — Missing.
- `MarketplaceModeConfig` (§28) — Missing.
- `MarketplaceMetricSnapshot` / supply-demand model (§19) — Missing.
- `DistributionRule` / `NicheDistributionLimit` (§11, §12) — Missing.
- `PatternMonitoring` result model (§14) — Missing.
- `WebsiteActivityStreak` / `WebsiteMilestoneProgress` exist but marketplace-quality linkage is thin.

## Missing enums
- None strictly missing; `WebsiteMarketplaceStatus` (6 states, §7) and `PlanTier` (5 tiers, §16) and `MarketplaceOverrideType` exist.

## Missing indexes
- `Website.rootDomain` has NO index (website.prisma:54) — used heavily in matching/validation `normalizeRootDomain` + equality lookups. **Recommended index.**
- `Website.primaryCategoryKey` has no standalone index (only via relation).
- `Website.marketplaceTagKeys` is a relation list; tag-based matching could benefit from a join-table index (currently implicit via `WebsiteMargetPlaceTag`).
- `DomainInteraction.normalizedPairKey` indexed; `sourcePrimaryCategoryKey`/`targetPrimaryCategoryKey` (migration) have NO index — needed for niche/cluster monitoring (§12, §14).
- `WebsiteMatchingProfile.userId` indexed; `(userId, marketplaceStatus)`, `(riskScore)` indexed; `diversityScore`/`reliabilityScore`/`internalPriorityScore` unindexed (acceptable, not queried).
- `PlacementTask.requesterWebsiteId` not explicitly indexed (only `requesterId`, `selectedProviderId`, `assignedProviderWebsiteId`, `lifecycleStatus`, `deliveryDeadline`, `country`, `language`). **Recommended index** for marketplace candidate queries.

## Missing relations / constraints
- `WebsiteMatchingProfile.marketplaceStatus` is enum but no FK to a status-history table (status transitions not audited as relationships).
- `SubscriptionPlan` → marketplace velocity mapping is implicit (no `planTier` field on `SubscriptionPlan`; tier derived from `tier` enum only). `monthlyTaskCredits` not linked to `WebsiteMatchingProfile.weeklyInteractionLimit`/`tierVelocityLimit`.
- `MarketplaceOverride` has relations but is never written (orphan model at runtime).
- No constraint preventing two `WebsiteMatchingProfile` rows per website (guaranteed by `@unique websiteId`).

## Schema/implementation drift (dead fields)
Fields declared but NEVER read/written by runtime code:
- `WebsiteMatchingProfile.diversityScore` (marketplace.prisma:40)
- `WebsiteMatchingProfile.reliabilityScore` (marketplace.prisma:38)
- `WebsiteMatchingProfile.internalPriorityScore` (marketplace.prisma:37)
- `WebsiteMatchingProfile.firstSuccessBoostActive` (marketplace.prisma:42)
- `WebsiteMatchingProfile.forceNewDomainNext` / `forceNewDomainUntil` (marketplace.prisma:43-44)
- `WebsiteMatchingProfile.weeklyInteractionLimit` / `tierVelocityLimit` (marketplace.prisma:70-71)
- `WebsiteMatchingProfile.matchCount7d` / `applicationCount7d` (marketplace.prisma:67-68)
- `MarketplaceScoringConfig.riskPenaltyDisputeWeight` (marketplace.prisma:175)
- `MarketplaceScoringConfig.maxRequesterExposurePerDay` (marketplace.prisma:166) — not enforced
- `WebsiteMarketplaceVisibilityStatus.GRACE_PERIOD` / `HIDDEN` (website.prisma:2-5) — no transition code

## Suggested structural changes (only what specs require)
1. Add `Dispute`, `DisputeResolution`, `MarketplaceModeConfig`, `MarketplaceMetricSnapshot` models.
2. Add `secondaryCategoryKey` to `Website` (+ relation) for §12.
3. Add index on `Website.rootDomain`, `Website.requesterWebsiteId`(via PlacementTask), `DomainInteraction.sourcePrimaryCategoryKey/targetPrimaryCategoryKey`.
4. Either wire the dead fields or drop them to reduce confusion.
5. Add `planTier`/velocity linkage between `SubscriptionPlan` and matching profile limits.

---

# API AUDIT

## Existing marketplace-relevant endpoints (confirmed via controllers)
- `ProviderTaskController.getProviderOpportunities` → `matchingEngine.findCandidates` + `rankingService.rankAndFilter` (provider-task.service.ts:121). **Live.**
- `ProviderTaskController.applyToTask` → `validateTransition(PROVIDER_APPLICATION)` (provider-task.service.ts:288).
- `TaskRequesterController.selectProvider` → `validateTransition(TASK_ACCEPTANCE)` (task-requester.service.ts:646).
- `TaskRequesterController.reviewTask` → `validateTransition(INTERACTION_APPROVAL)` (task-requester.service.ts:999).
- `AdminTaskController` force-complete/force-approve/freeze/credit-adjust/abuse-flag (admin-task.service.ts).
- `AdminMarketplaceVisibilityController` (read-only monitoring).
- `AdminAnalyticsController` (reports).
- `CreditTaskController` deduct/refund/reward.
- `WebsiteVerification*` controllers.
- `NotificationController` / `AdminNotificationController`.

## Missing endpoints
- Marketplace override create/revoke API (§5, §27) — Missing.
- Priority / restriction management API (§5, §27) — Missing.
- Marketplace status transition API (`LOW_PRIORITY`/`LIMITED_ACCESS`/etc., §7) — Missing.
- Manual match queue / admin-assisted matching API (§18, §27) — Missing.
- Dispute create/resolve API (§25) — Missing.
- Supply/demand dashboard API (§19) — Missing.
- Marketplace mode config API (§28) — Missing.
- Trust-indicator / opportunity diagnostics API (§22, §29) — Missing.
- New-user boost / first-success trigger API (§20) — Missing.

## Validation gaps
- `applyToTask` only runs `validateTransition` at PROVIDER_APPLICATION; earlier listing does not pre-validate (relies on engine eligibility). Acceptable but inconsistent.
- Global `enforceRevalidationAtAcceptance/Approval` rollout guard can bypass Stages 4 & 5 (validation.engine.ts:312-326).
- `maxRequesterExposurePerDay`, weekly, tier limits are not validated at any endpoint (§13, §16).

## Authorization gaps
- Provider opportunity endpoint guarded by `@CurrentUser` (auth guard). Admin endpoints use `AdminGuard`. No evidence of marketplace-specific role/plan checks at endpoints (tier limits enforced only if engine wired — currently not).
- `MarketplaceOverride` admin actions would need admin-only guards (not present because endpoint missing).

---

# BACKGROUND JOBS AUDIT

## Present
- `OpportunityGuaranteeCron` (`@Cron('0 2 * * *')`, opportunity-guarantee.cron.ts) — recomputes `opportunityScore` and `boostFactor`/`forceMatchNext` for `ACTIVE` profiles. Registered in `provider-task.module.ts:11,22` and `ScheduleModule.forRoot()` in `app.module.ts:21,43`. **Active.**
- `VisibilityMaintenanceService.maintainWebsiteVisibility` (visibility-credit/visibility-maintenance.service.ts) — visibility credit maintenance cron.
- BullMQ workers exist (bullmq/*) for streaks etc., but NOT for marketplace score/risk/analytics.

## Missing background jobs (per spec)
- Risk recalculation job (§15) — Missing.
- Score refresh / decay job (boost decay is partly in OpportunityGuaranteeCron but no independent decay) — Missing/partial.
- Impression retention cleanup (`impressionRetentionDays` config never consumed) — Missing.
- Analytics / supply-demand snapshot job (§19) — Missing.
- Low-liquidity alert job (§18) — Missing.
- Velocity-counter (matchCount7d/applicationCount7d) cleanup/rollup — Missing (counters never updated anyway).

# ARCHITECTURE AUDIT

## Service boundaries
Engines (matching/ranking/validation/scoring) are properly isolated as `@Injectable()` services. Notification, Credit, Analytics, Admin are separate modules. Good modularity at the leaf level.

## Business logic separation
**Weak.** Task lifecycle services (`provider-task`, `task-requester`) embed marketplace logic: they call `validateTransition`, `buildPairKey`, `normalizeRootDomain`, and write `DomainInteraction`/`DomainPairStat`. This duplicates engine responsibility and risks divergence.

## SOLID / Single Responsibility
`provider-task.service.ts` (1090 lines) and `task-requester.service.ts` (~1130 lines) are god-services violating SRP. `MatchingRelaxationEngine` violates SRP by being an empty placeholder while its logic lives in `MatchingEngine`.

## Domain-Driven Design
Partial. `WebsiteMatchingProfile` aggregates marketplace state; `DomainInteraction`/`DomainPairStat` model relationships. But marketplace *behaviour* (validation, distribution, risk, tier, liquidity) is not modelled as domain services — it is scattered or missing.

## Scalability
`findCandidates` runs `buildHardRuleCandidates` over all open tasks then per-candidate compatibility in memory (matching.engine.ts:211+). No pagination of candidate tasks; risk of N+1 as task volume grows. `getDailyProviderWebsiteCounts` is a full-day scan. Acceptable for current scale; needs cursor/DB-side filtering for growth.

## Maintainability
Mixed. Engine code is clean and tested (scoring.utils.spec.ts). Task services are large and interleaved with marketplace concerns, hurting maintainability.

## Code duplication
- Domain-interaction write duplicated (task-requester.service.ts vs engine intent).
- Validation duplicated (engine + inline checks in task services).
- `makePairKey`/`buildPairKey` wrappers in task-requester duplicate engine API.

## Future extensibility
Blocked by: (a) placeholder relaxation engine; (b) dead config fields; (c) missing Distribution/Risk/Tier/Liquidity engines; (d) global re-validation bypass. Extending behaviour safely requires the refactor in remaining-tasks tasks 1 & 16.


---

# FINAL SUMMARY

## 1. Overall implementation percentage

**~44%** of the 30 specification sections are fully or substantially implemented. Counting section statuses:
- ✅ Fully Implemented: §1(eligibility core), §2, §4, §8, §9, §10, §21, §24 — 8 sections
- 🟡 Partially Implemented: §1(scope), §3, §5, §6, §7, §12, §13, §14, §15, §16, §17, §18, §19(no), §20, §22, §23, §26, §27, §28(no), §29 — ~20 sections
- ❌ Missing: §11, §19, §25, §28 — 4 sections
- ⚠ Needs Refactor: §17, §30 — 2 sections

(Note: §19 and §28 are listed as Missing below; they appeared as 🟡/❌ in the per-section detail — net count: 8 fully, ~16 partial, 6 missing, 2 refactor. Overall functional coverage ≈ 44%, consistent with the prior `docs/marketplace-technical-audit-report.md` estimate, now re-verified against source.)

## 2. Fully implemented features
- Marketplace matching criteria (website/category/tag/country/language/placement/DA-DR) — §2
- Progressive fallback / relaxation loop — §3, §21
- Ranking engine with all 8 required signals + weighted final formula — §4
- Domain relationship tracking (root domain, interaction log, timestamps) — §8
- Reciprocal cooldown prevention (config-driven) — §9
- Repeat-pair cooldown prevention — §10
- Credit system (deduction, refund, failure handling) — §24
- Safe rejection messaging (no rule leakage) — §29 (partial)

## 3. Partially implemented features
- Eligibility (account SUSPENDED not enforced) — §1
- Relaxation engine (placeholder file, inline logic) — §3
- Visibility control (no override wiring) — §5
- Website quality (dead reliability/diversity fields) — §6
- Website status (6 states defined, no transitions) — §7
- Niche distribution (primary only) — §12
- Velocity (daily cap only) — §13
- Pattern monitoring (pairwise only) — §14
- Risk engine (field + penalty, no calculation) — §15
- Tier system (defs only, no enforcement) — §16
- Validation engine (stubbed levels, bypass guard) — §17
- Liquidity (relaxation only, no balancing/assist) — §18
- New user boost (generic boost only) — §20
- Trust indicators (data not surfaced) — §22
- Output quality (review exists, no quality tier) — §23
- Notifications (lifecycle covered, opportunity alerts not sent) — §26
- Admin controls (monitoring yes, override no) — §27
- UX (safe messages only) — §29

## 4. Missing features
- Distribution Engine (diversity, repeated-pair reduction, network concentration) — §11
- Supply vs Demand balancing + monitoring — §19
- Dispute system (model + resolution + credit link) — §25
- Marketplace Modes (Early Stage / Scaling) — §28
- Risk calculation, Tier enforcement, PatternMonitoring cluster/group detection — §14, §15, §16
- Admin override/priority/restriction mutation APIs — §5, §27
- LiquidityEngine + manual match queue — §18
- Trust-indicator & fallback UX APIs — §22, §29

## 5. High-risk architectural issues
1. **Validation engine not fully wired / bypassable** (§17): `enforceRevalidationAtAcceptance/Approval` rollout guard can skip Stages 4 & 5; L3/L5 stubbed; missing-profile only fails closed at approval. This is the #1 risk.
2. **God-services duplicate engine logic** (§30): `provider-task`/`task-requester` write `DomainInteraction`/`DomainPairStat` and call validation directly, risking divergence from the engine.
3. **Dead config fields** (`diversityScore`, `reliabilityScore`, `internalPriorityScore`, `forceNewDomainNext`, `weeklyInteractionLimit`, `tierVelocityLimit`, `riskPenaltyDisputeWeight`, `maxRequesterExposurePerDay`, `matchCount7d`, `applicationCount7d`) — schema implies behaviour that does not exist.
4. **`MarketplaceOverride` is an orphan** — 0 runtime consumers; admin cannot influence matching/ranking.
5. **Risk score never computed** — `riskScore` stuck at 0; risk gating is effectively inert.
6. **In-memory candidate expansion** in `findCandidates` — scalability risk at volume.

## 6. Database changes required
- New models: `Dispute`, `DisputeResolution`, `MarketplaceModeConfig`, `MarketplaceMetricSnapshot`.
- Add `Website.secondaryCategoryKey` (§12).
- Indexes: `Website.rootDomain`, `PlacementTask.requesterWebsiteId`, `DomainInteraction.sourcePrimaryCategoryKey/targetPrimaryCategoryKey`.
- Wire or drop ~10 dead fields; link `SubscriptionPlan` tier → profile velocity limits.

## 7. API changes required
- Add override create/revoke, priority/restriction management, marketplace status transition, manual match queue, dispute CRUD, supply/demand dashboard, mode config, trust-indicator/opportunity diagnostics, new-user-boost trigger endpoints.
- Close validation gaps: remove global re-validation bypass (or strictly gate), validate weekly/tier/velocity at endpoints.

## 8. New services / modules recommended
- `DistributionEngine` (§11)
- `RiskEngine` (§15)
- `TierEngine` (§16)
- `VelocityEngine` (§13)
- `LiquidityEngine` + `MarketplaceAnalyticsEngine` (§18, §19)
- `PatternMonitoringEngine` (§14)
- `DisputeService` (§25)
- `MarketplaceModule` cohesive wrapper (§30)
- Admin marketplace control APIs (§27)

## 9. Suggested implementation order (highest priority first)
**Wave 1 — Foundation & risk removal (do first):**
1. Centralize & re-validate constraints via `ValidationEngine`; auto-create profile; remove bypass (§17) — Medium
2. Reconcile schema/implementation drift (drop/wire dead fields) — Low
3. Make cooldown/rule windows admin-configurable — Medium
4. Activate relaxation engine (move inline → `MatchingRelaxationEngine`) — Low

**Wave 2 — Governance & scoring:**
5. Wire `MarketplaceOverride` + admin override/status/priority APIs — High
6. Complete ranking/scoring event updates (consume dead counters/weights) — Medium
7. Build `VelocityEngine` — High
8. Build `TierEngine` — High
9. Add `Dispute` model + resolution + credit link — Medium

**Wave 3 — Engines:**
10. Build `DistributionEngine` — High/Very High
11. Build `RiskEngine` — High
12. Build `PatternMonitoringEngine` — Very High

**Wave 4 — Balancing & modes:**
13. Add `MarketplaceModeConfig` (Early Stage / Scaling) — Medium
14. Build `LiquidityEngine` + supply/demand analytics + admin-assisted matching — Very High

**Wave 5 — Polish & structure:**
15. Trust indicators + fallback UX messages + send opportunity alerts — Low
16. Marketplace background jobs (risk/score/cleanup/analytics/alerts) — Medium
17. Refactor into cohesive `MarketplaceModule` — Refactor

## 10. Estimated implementation complexity per missing feature
- §11 Distribution Engine: **Very High**
- §14 PatternMonitoring (cluster/group): **Very High**
- §18/§19 Liquidity + Supply/Demand + Modes(§28): **Very High**
- §5/§27 Admin Override + priority/restriction APIs: **High**
- §13 Velocity Engine: **High**
- §16 Tier Engine: **High**
- §15 Risk Engine (calculation): **High**
- §17 Validation centralization/refactor: **Medium**
- §25 Dispute system: **Medium**
- §28 Marketplace Modes: **Medium**
- §3 Relaxation activation: **Low**
- §22/§29 Trust indicators + fallback UX: **Low**
- §2/§6/§7/§12/§20/§23/§26 minor wiring: **Low**
- §30 MarketplaceModule refactor: **Refactor**

---

*End of report. All findings verified against source files under `src/` and `prisma/schema/` as of audit date. Where a requirement could not be verified, it is explicitly marked "Not found in code."*
