# Marketplace Specification Audit Report

**Audit date:** 2026-07-16  
**Auditor role:** Senior Software Architect / Backend Engineer / Marketplace Systems Expert / Technical Auditor  
**Codebase:** `backlyst-backend` (NestJS + Prisma)  
**Scope:** All 30 marketplace specification sections, database schema, API surface, background jobs, and architecture.

> Every finding below is grounded in actual source code. Where a fact could not be verified from code, it is marked **"Not found in code."** No code was modified and no implementation code was generated.

---

## Methodology & Evidence Base

The audit inspected the live marketplace engine located in `src/modules/task/market-algoritm/` (MatchingEngine, MatchingRelaxationEngine, RankingService, ScoringService, ValidationEngine, TierEngine, DistributionEngine, PatternMonitorService, DomainInteractionRecorderService, MarketplaceOverrideService), the task services (`provider-task`, `task-requester`, `admin-task`, `dispute`), the credit module, the notification module, the admin marketplace modules, and the Prisma schema in `prisma/schema/*.prisma`.

Key files reviewed:
- `prisma/schema/marketplace.prisma`, `website.prisma`, `placement.prisma`, `credit.prisma`, `enums.prisma`
- `src/modules/task/market-algoritm/validation.engine.ts` (831 lines)
- `src/modules/task/market-algoritm/matching.engine.ts`
- `src/modules/task/market-algoritm/ranking.service.ts`
- `src/modules/task/market-algoritm/scoring.service.ts` + `scoring.utils.ts`
- `src/modules/task/market-algoritm/distribution-engine.service.ts`, `tier-engine.service.ts`, `pattern-monitor.service.ts`, `matching-relaxation.engine.ts`, `domain-interaction-recorder.service.ts`, `marketplace-override.service.ts`
- 4 scheduled crons: `opportunity-guarantee.cron.ts`, `pattern-monitor.cron.ts`, `impression-cleanup.cron.ts`, `manual-match-queue.cron.ts`
- `src/modules/task/provider-task/provider-task.service.ts`, `src/modules/task/task-requester/task-requester.service.ts`, `src/modules/task/dispute/dispute.service.ts`
- `src/modules/credit/credit-task/credit-task.service.ts`
- `src/modules/admin/admin-marketplace-config|mode|override|visibility/*`, `admin-manual-match-queue/*`, `admin-website-status/*`, `admin-analytics/services/liquidity.service.ts`

---


# SECTION 1 — Marketplace Eligibility

## Requirement
Website verification, ownership validation, active/deleted/suspended status, provider ownership, task eligibility, duplicate application prevention, and own-task prevention.

## Current Implementation
Eligibility is centralised in `ValidationEngine` (`validation.engine.ts`). `isMarketplaceWebsiteEligible`/`isWebsiteRowMarketplaceEligible` require `verificationStatus === 'VERIFIED'`, `marketplaceVisibilityStatus === 'VISIBLE'`, `isFlag === false`, `isWalletLock === false`, `isDeleted === false`, and a non-SUSPENDED `marketplaceStatus` (`getEligibleMarketplaceWebsiteIds` lines 183-198; `isBrowsableStatus` lines 45-47). User active check is `isUserActive` (lines 153-159). Provider ownership is enforced in `provider-task.service.ts` `applyToTask` (`authorId === providerId`), and requester ownership in `task-requester.service.ts` `selectProvider` (`task.requesterId === requesterId`). Task eligibility is gated by open lifecycle statuses (`OPEN`, `WAITING_FOR_APPLICANTS`) in `matching.engine.ts` line 16 and `applyToTask`. Duplicate applications are blocked in `matching.engine.ts:238` (`placementApplications: { none: { providerId } }`) and an explicit guard in `applyToTask`. Own-task prevention is `OWN_TASK` rule in `validateTransition` LEVEL 1 (lines 523-529). Website verification ownership is checked in `website-verification.service.ts:55` (`authorId !== userId`).

## Evidence
- `src/modules/task/market-algoritm/validation.engine.ts` (183-198, 45-61, 153-159, 493-530)
- `src/modules/task/market-algoritm/matching.engine.ts:16,238`
- `src/modules/task/provider-task/provider-task.service.ts` (applyToTask ownership + duplicate guard)
- `src/modules/task/task-requester/task-requester.service.ts` (selectProvider ownership)
- `prisma/schema/website.prisma` (verificationStatus, isDeleted, isFlag, isWalletLock)

## Status
✅ Fully Implemented

## Gap Analysis
None material. Own-task prevention (`OWN_TASK`) is only enforced at `PROVIDER_APPLICATION` stage and inside the matching engine's candidate query; it is treated as a non-overridable eligibility rule. The matching-engine query excludes tasks where `requesterId === providerId` (line 232), which covers the common path. Validation `OWN_TASK` rule also fires for `INTERACTION_APPROVAL` but is skipped for `ADMIN_FORCE`. This is acceptable per spec (admin override of ownership is intentionally disallowed; `ADMIN_FORCE` is a deliberate exception).

## Recommendation
No change required. Optionally extend `OWN_TASK` to all selection stages uniformly.

---

# SECTION 2 — Matching Engine

## Requirement
Website-based matching, category, tag, country, language, placement type, DA/DR compatibility, progressive relaxation, and "verification never relaxed."

## Current Implementation
`MatchingEngine.findCandidates` builds candidates from eligible provider websites x eligible requester tasks. `buildCandidate` computes `categoryExact` (primaryCategoryKey equality), `industryRelated`, `tagOverlap`, `countryExact`, `languageExact`, and `authorityMeets` (DA/DR: `providerDr >= requiredDomainRating`). Placement type is filtered in `getCandidateTasks` (line 241 `where.placementType`). DR check is also re-validated at apply time via Moz (`getMozDomainStats`). Progressive relaxation is delegated to `MatchingRelaxationEngine` (levels 0→4). Verification is never relaxed because candidate websites are drawn from `getEligibleMarketplaceWebsiteIds` which hard-requires `VERIFIED` + `VISIBLE`; relaxation only loosens category/tag/country/language, never verification status.

## Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:392-470` (buildCandidate), `:220-252` (getCandidateTasks), `:113-122` (relaxation loop)
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts`
- `src/modules/task/market-algoritm/validation.engine.ts:183-198`

## Status
✅ Fully Implemented

## Gap Analysis
- The fallback at `maxRelaxationLevel` (level 4, FALLBACK passthrough, any) can match websites with `category='ANY'`, `tags='ANY'` — i.e. completely unrelated categories. This is intentional per spec §3 (last-resort fallback) but may over-broaden; configurable via `maxRelaxationLevel`.
- DA/DR compatibility affects scoring (penalty) but is not a hard eligibility gate except at apply-time Moz check; a provider below required DR can still appear as a candidate (ranked lower). This is a soft gate, not hard. Acceptable but worth noting.

## Recommendation
No change required. Consider making DA/DR a hard pre-filter if spec requires rejection rather than ranking penalty.

---

# SECTION 3 — Dynamic Relaxation

## Requirement
Exact → Related → Broad → Fallback progression.

## Current Implementation
`MatchingRelaxationEngine` maps levels to semantic stages: level 0 = EXACT, 1 = RELATED, 2/3 = BROAD, ≥4 = FALLBACK. Truth table: L0 category+tags+country/language exact; L1 category exact + tags partial + language; L2 category related + country; L3 category related OR tags partial; L4 passthrough. `MatchingEngine.findCandidates` loops levels 0→`maxRelaxationLevel` (default 4), breaking when `>= minViableMatches` or final level reached (`matching.engine.ts:113-122`).

## Evidence
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts` (full file)
- `src/modules/task/market-algoritm/matching.engine.ts:113-122`

## Status
✅ Fully Implemented

## Gap Analysis
The progression matches the spec ordering exactly. `stageForLevel` is used in reasons. No gap.

## Recommendation
None.

---

# SECTION 4 — Ranking Engine

## Requirement
Compatibility, Opportunity, Visibility, Reputation, Boost, Exposure Penalty, Risk Penalty, Final ranking formula.

## Current Implementation
`TommacayRankingService.rankAndFilter` computes all required components:
- Compatibility Score: `candidate.compatibilityScore` (from matching engine) weighted.
- Opportunity Score: `profile.opportunityScore` (or override).
- Visibility Score: `profile.visibilityScore`.
- Reputation Score: `profile.reputationScore`.
- Boost Score: `(boostFactor + newWebsiteBoost) * 20`.
- Exposure Penalty: `exposureCount7d * exposurePenaltyPerTaskView`.
- Risk Penalty: `(riskScore/100) * riskWeight` where riskWeight is dispute vs rejection weight.
- Authority Penalty: +10 if `authority === 'BELOW'`.
- Force Match Bonus: `config.forceMatchBonus`.
- Internal Priority: `profile.internalPriorityScore * internalPriorityWeight`.
- Diversity: `profile.diversityScore * diversityWeight`.
- Tier Priority: `tierPriorityMap` multiplier.
- LOW_PRIORITY factor multiplier.
Final score = `weightedScore * tierPriority - exposurePenalty - riskPenalty - authorityPenalty + forceMatchBonus + internalPriority + diversity`, then `* priorityFactor`. Sorted desc, deduped best-per-task, ranked.

## Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:147-192` (formula), `:107-145` (component resolution), `:235-263` (getConfig weights)
- `prisma/schema/marketplace.prisma:153-213` (MarketplaceScoringConfig weights)

## Status
✅ Fully Implemented

## Gap Analysis
All eight required scores + penalties + final formula present. Formula is configurable via `MarketplaceScoringConfig`. No gap.

## Recommendation
None.

---

# SECTION 5 — Visibility Control

## Requirement
Visibility weighting, priority reduction, frequency reduction, non-destructive visibility control.

## Current Implementation
- Visibility weighting: `visibilityScore * visibilityWeight` in ranking formula.
- Priority reduction: `LOW_PRIORITY` status multiplies final score by `lowPriorityFactor` (default 0.7) in ranking (`ranking.service.ts:165-169`) and `MarketplaceScoringConfig.lowPriorityFactor`.
- Frequency reduction: `LIMITED_ACCESS` profiles get a reduced per-profile daily match cap (`marketplaceStatusDailyCap`) overriding the global `maxProviderMatchesPerDay` (`ranking.service.ts:82-92`; `admin-website-status.service.ts:38-41`). Requester daily exposure cap enforced (`maxRequesterExposurePerDay`).
- Non-destructive: status changes only adjust scores/caps; they never delete or hard-disable records (`admin-website-status.service.ts` upsert pattern).

## Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:82-92,165-169`
- `prisma/schema/marketplace.prisma:63-67,187`
- `src/modules/admin/admin-website-status/admin-website-status.service.ts`

## Status
✅ Fully Implemented

## Gap Analysis
All four behaviours present. Non-destructive control is honoured (no destructive deletion on status change).

## Recommendation
None.

---

# SECTION 6 — Website Quality

## Requirement
Track completion, activity, reliability, interaction diversity, behaviour patterns, quality penalties.

## Current Implementation
- Completion & activity: `completedInteractions`, `failedInteractions`, `totalInteractions`, `completionRate`, `lastShownAt`, `lastMatchedAt`, `lastSelectedAt`, `lastCompletedAt` on `WebsiteMatchingProfile` (`scoring.service.ts` updates these; ranking reads them).
- Reliability: `reliabilityScore` computed in `scoring.service.ts:56` from success ratio.
- Diversity: `diversityScore` computed by `DistributionEngine.computeDiversityScore` (`scoring.service.ts:45-47`).
- Behaviour patterns: `PatternMonitorService` SCC cluster detection (
- Quality penalties: `qualityRatingSum`/`avgQualityRating` feed `calculateVisibilityScore` (`scoring.utils.ts:87-107`); qualityRating reduces visibility. Rejection raises risk. Auto-suppression at `completionRate < 0.4 && total >= 10` (`scoring.service.ts:106-107,140-143`).

## Evidence
- `prisma/schema/marketplace.prisma:43-77`
- `src/modules/task/market-algoritm/scoring.service.ts:49-145`
- `src/modules/task/market-algoritm/scoring.utils.ts`
- `src/modules/task/market-algoritm/pattern-monitor.service.ts`

## Status
✅ Fully Implemented

## Gap Analysis
All six quality dimensions are tracked and/or penalised. Quality penalties (rejection, low completion, low rating) affect visibility/risk.

## Recommendation
None.

---

# SECTION 7 — Website Status

## Requirement
Support Active, Low Priority, Limited Access, Under Review, Restricted, Suspended.

## Current Implementation
Enum `WebsiteMarketplaceStatus` (marketplace.prisma:10-17) has all six. `ValidationEngine.isBrowsableStatus`/`isSelectableStatus` differentiate: SUSPENDED → fully ineligible; UNDER_REVIEW → browsable but not selectable (blocked at TASK_ACCEPTANCE/INTERACTION_APPROVAL); RESTRICTED → boost disabled (ranking treats boostFactor as 1); LOW_PRIORITY → score * 0.7; LIMITED_ACCESS → reduced daily cap. Admin set via `admin-website-status.service.ts`.

## Evidence
- `prisma/schema/marketplace.prisma:10-17,36`
- `src/modules/task/market-algoritm/validation.engine.ts:45-61,629-660`
- `src/modules/task/market-algoritm/ranking.service.ts:82-92,113-119,165-169`
- `src/modules/admin/admin-website-status/admin-website-status.service.ts`

## Status
✅ Fully Implemented

## Gap Analysis
All six statuses modelled and differentiated at runtime. No gap. Note: `enforceRevalidationAtAcceptance`/`enforceRevalidationAtApproval` config fields (marketplace.prisma:207-208) are now dead — re-validation was made unconditional; the rollout guard was removed (validation.engine.ts:487-491 comment). This is a harmless unused config, not a functional gap.

## Recommendation
Remove or document the now-unused `enforceRevalidationAt*` config fields to avoid confusion.

---

# SECTION 8 — Domain Relationship Tracking

## Requirement
Relationship history, root-domain tracking, interaction logging, timestamps.

## Current Implementation
- Root-domain tracking: `Website.rootDomain` (website.prisma:57) + `ValidationEngine.normalizeRootDomain` (two-part public suffix handling, validation.engine.ts:74-119).
- Interaction logging: `DomainInteraction` model logs source/target website + domain, normalizedPairKey, primary/secondary category keys, completedAt/createdAt.
- Relationship history: `DomainPairStat` upserted by `DomainInteractionRecorderService` with `lastSourceDomain`, `lastTargetDomain`, `lastInteractionAt`, `repeatPairCooldownUntil`, `reciprocalCooldownUntil`, `interactionCount`.

## Evidence
- `prisma/schema/marketplace.prisma:256-323` (DomainInteraction, DomainPairStat)
- `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts`
- `src/modules/task/market-algoritm/validation.engine.ts:74-138`

## Status
✅ Fully Implemented

## Gap Analysis
All four requirements present. Recorder writes both direction-aware cooldowns and niche keys.

## Recommendation
None.

---

# SECTION 9 — Reciprocal Rules

## Requirement
Reciprocal prevention: time window, configuration, enforcement point.

## Current Implementation
Direction-aware cooldown. `ValidationEngine.buildOrderedPairKey` distinguishes A→B from B→A. `isDirectionAllowed` gates same-direction repeats by `repeatPairCooldownUntil` and reverses by `reciprocalCooldownUntil` (validation.engine.ts:752-768). Window config: `MarketplaceScoringConfig.reciprocalCooldownDays` (default 120) / `repeatPairCooldownDays` (default 90). Enforced at LEVEL 2 of `validateTransition` (lines 532-548) at PROVIDER_APPLICATION, TASK_ACCEPTANCE, INTERACTION_APPROVAL. Overridable by admin (`RECIPROCAL_COOLDOWN`).

## Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:133-138,532-548,752-803`
- `prisma/schema/marketplace.prisma:195-197`

## Status
✅ Fully Implemented

## Gap Analysis
`MS_PER_DAY` constant (validation.engine.ts:147) fixes a prior bug where cooldowns resolved in seconds. Configurable windows, admin override supported. Enforced before apply/accept.

## Recommendation
None.

---

# SECTION 10 — Repeat Pair Rules

## Requirement
Cooldown between identical domain pairs.

## Current Implementation
Same as reciprocal: `repeatPairCooldownUntil` on `DomainPairStat`, `repeatPairCooldownDays` config (default 90), enforced at LEVEL 2 of `validateTransition`. The matching engine also pre-filters blocked pairs via `getCooldownBlockedPairKeys` (matching.engine.ts:290-294, 318). Covered by `isDirectionAllowed` same-direction branch.

## Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:532-548,752-768`
- `src/modules/task/market-algoritm/matching.engine.ts:290-294,318`

## Status
✅ Fully Implemented

## Gap Analysis
Covered. Repeat (same direction) and reciprocal (reverse direction) are tracked separately via ordered pair key.

## Recommendation
None.

---

# SECTION 11 — Distribution Rules

## Requirement
Domain diversity, repeated pair reduction, network concentration prevention.

## Current Implementation
- Domain diversity: `DistributionEngine.computeDiversityScore` (distinct counterpart domains / total).
- Repeated-pair reduction: `forceNewDomainNext`/`forceNewDomainUntil` enforced in matching engine via `filterNewDomains` (matching.engine.ts:328-387).
- Network concentration prevention: `isNetworkConcentrationAllowed` evaluates `maxNetworkConcentrationPerWindow`/`networkConcentrationWindowDays` (config); enforced at LEVEL 2b of `validateTransition` (lines 550-587) for both provider and requester domains; fail-closed.

## Evidence
- `src/modules/task/market-algoritm/distribution-engine.service.ts`
- `src/modules/task/market-algoritm/matching.engine.ts:328-387`
- `src/modules/task/market-algoritm/validation.engine.ts:550-587`
- `prisma/schema/marketplace.prisma:199-204`

## Status
✅ Fully Implemented

## Gap Analysis
All three behaviours present and configurable. Network concentration fail-closed.

## Recommendation
None.

---

# SECTION 12 — Niche Distribution

## Requirement
Primary niche, secondary niche, distribution limits.

## Current Implementation
`NicheDistributionCap` model (categoryKey, scope PRIMARY|SECONDARY, maxPerWindow, windowDays, isActive). `DistributionEngine.isNicheWithinCap` counts `DomainPairStat` rows in the rolling window by `sourcePrimaryCategoryKey`/`targetPrimaryCategoryKey` (PRIMARY) or `sourceSecondaryCategoryKey`/`targetSecondaryCategoryKey` (SECONDARY). Enforced at LEVEL 5 of `validateTransition` (NICHE_CAP_EXCEEDED, fail-closed, overridable). `DomainInteractionRecorderService` captures both niche keys.

## Evidence
- `prisma/schema/marketplace.prisma:359-377` (NicheDistributionCap), `:270-289` (DomainInteraction niche keys), `:291-323` (DomainPairStat niche keys)
- `src/modules/task/market-algoritm/distribution-engine.service.ts:103-139`
- `src/modules/task/market-algoritm/validation.engine.ts:662-694`

## Status
✅ Fully Implemented

## Gap Analysis
Primary + secondary niche caps present, configurable, enforced. No CRUD endpoints exist to *create* NicheDistributionCap rows yet (only consumed if seeded). This is a config-data gap, not a code gap.

## Recommendation
Add admin endpoints to create/manage `NicheDistributionCap` rows (currently only readable/consumed). Low effort.

---

# SECTION 13 — Velocity Rules

## Requirement
Weekly limits, daily spacing, interaction frequency.

## Current Implementation
- Daily limit: `maxProviderMatchesPerDay` enforced in ranking (`ranking.service.ts:77-92`) and LEVEL 3 of `validateTransition` (DAILY_LIMIT).
- Weekly limit: `TierEngine.resolveTierLimits` provides `weeklyInteractionLimit` per tier; `countWeeklyInteractions` counts trailing-7d assigned tasks; enforced at LEVEL 3 (WEEKLY_LIMIT, fail-closed, overridable, skipped for ADMIN_FORCE).
- Interaction frequency: `exposureCount7d`, `matchCount7d`, `applicationCount7d`, requester daily exposure cap (`maxRequesterExposurePerDay`).

## Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:589-627`
- `src/modules/task/market-algoritm/tier-engine.service.ts:72-87`
- `src/modules/task/market-algoritm/ranking.service.ts:77-104`

## Status
✅ Fully Implemented

## Gap Analysis
Weekly + daily + requester-frequency all enforced. "Daily spacing" (minimum gap between consecutive matches for a provider) is not explicitly modelled as a time-gap rule; it is approximated by the daily cap. Acceptable but not a strict spacing rule.

## Recommendation
Optional: add an explicit minimum-inter-match spacing rule if spec requires time-gap spacing rather than count-per-day.

---

# SECTION 14 — Pattern Monitoring

## Requirement
Repeat detection, reciprocal detection, cluster detection, group concentration.

## Current Implementation
`PatternMonitorService.scan()` builds a directed domain graph from `DomainInteraction` edges and runs iterative Tarjan SCC. Components ≥ `MIN_CLUSTER_SIZE` (4) are flagged as `CLUSTER_CONCENTRATION` (`PatternFlag` model). Repeat (same ordered pair) and reciprocal (A→B + B→A) are observed for logging only (covered by pairwise cooldowns). HIGH-severity clusters append ABUSE RiskEvents; admin notified. Scheduled by `pattern-monitor.cron.ts` every 6h. Enums `PatternFlagType` (CLUSTER_CONCENTRATION, RECIPROCAL_RING, REPEAT_BURST), `PatternSeverity`, `PatternFlagStatus` exist.

## Evidence
- `src/modules/task/market-algoritm/pattern-monitor.service.ts` (full)
- `src/modules/task/market-algoritm/pattern-monitor.cron.ts`
- `prisma/schema/marketplace.prisma:396-480` (PatternFlag, enums)

## Status
✅ Fully Implemented (cluster detection; reciprocal/repeat detection is observability-only by design)

## Gap Analysis
Cluster/group concentration (coordinated rings) is fully implemented. Repeat/reciprocal are detected-but-not-flagged (intentional, delegated to pairwise cooldowns). The `RECIPROCAL_RING` and `REPEAT_BURST` PatternFlagType enum values are unused (no code path creates them) — only CLUSTER_CONCENTRATION is produced. This is a minor coverage gap, not a functional defect.

## Recommendation
Optionally emit `REPEAT_BURST`/`RECIPROCAL_RING` flags for visibility, but not required since pairwise cooldowns handle enforcement.

---

# SECTION 15 — Risk Engine

## Requirement
Risk score, risk calculation, risk penalties.

## Current Implementation
`calculateRiskScore` (scoring.utils.ts:58-80) time-decays prior score and applies event delta (DISPUTE 25, REJECTION 15, FAILURE 10, ABUSE 40, SUCCESS -8). Deltas in `RISK_DELTA_BY_EVENT`. `ScoringService.updateScoresAfterTask` persists `riskScore`, `lastRiskReason`, `lastRiskEventAt`, and writes an immutable `RiskEvent` log. Ranking applies risk penalty: `(riskScore/100) * (disputeWeight|rejectionWeight)`. Validation blocks at RISK_THRESHOLD (>=75, LEVEL 4). Threshold config: `riskPenaltyDisputeWeight`/`riskPenaltyRejectionWeight` (marketplace.prisma:192-193).

## Evidence
- `src/modules/task/market-algoritm/scoring.utils.ts:21-80`
- `src/modules/task/market-algoritm/scoring.service.ts:84-103,126-128`
- `src/modules/task/market-algoritm/ranking.service.ts:129-135`
- `src/modules/task/market-algoritm/validation.engine.ts:650-651`
- `prisma/schema/marketplace.prisma:39-41,192-193,445-458` (RiskEvent)

## Status
✅ Fully Implemented

## Gap Analysis
Risk score is computed, decayed, persisted, logged immutably, and applied as a penalty + hard threshold. Note: the ABUSE RiskEvent created by PatternMonitor (pattern-monitor.service.ts:333-344) writes `delta: 0` and `riskScoreAfter: 0` — these are not real deltas and do not update the profile's `riskScore` (the profile risk update happens only in `updateScoresAfterTask`). So cluster-ABUSE does not currently raise a site's riskScore. This is a minor inconsistency.

## Recommendation
Have PatternMonitor compute and apply a real ABUSE risk delta to the affected profiles (via a shared RiskEvent writer) so HIGH-severity clusters actually raise risk.

---

# SECTION 16 — Tier System

## Requirement
Free, Silver, Gold, Platinum, Enterprise; weekly limits; priority; tier enforcement.

## Current Implementation
`PlanTier` enum (FREE/SILVER/GOLD/PLATINUM/ENTERPRISE). `TierEngine` resolves active subscription tier (defaults FREE), maps to `WEEKLY_LIMIT_BY_TIER` (5/15/40/100/250) and `PRIORITY_BY_TIER` (1/1.2/1.5/1.8/2). Weekly limit enforced at LEVEL 3; tier priority multiplier applied in ranking (`tierPriority`). Profile can carry overrides `weeklyInteractionLimit`/`tierVelocityLimit`.

## Evidence
- `prisma/schema/enums.prisma:87-93`
- `src/modules/task/market-algoritm/tier-engine.service.ts`
- `src/modules/task/market-algoritm/ranking.service.ts:143-145`
- `src/modules/task/market-algoritm/validation.engine.ts:599-627`
- `prisma/schema/marketplace.prisma:78-79`

## Status
✅ Fully Implemented

## Gap Analysis
All five tiers, weekly limits, priority, and enforcement present. Tier resolved from active subscription; no subscription → FREE.

## Recommendation
None.

---

# SECTION 17 — Validation Engine

## Requirement
Validation before approval: eligibility, cooldowns, risk, velocity, tier, distribution.

## Current Implementation
`ValidationEngine.validateTransition` is a single source of truth with ordered levels: LEVEL 1 Eligibility (user active, website eligible, task status/ownership, OWN_TASK — never overridable), LEVEL 2 Governance (repeat/reciprocal cooldowns, network concentration — overridable), LEVEL 3 Capacity (daily + weekly/tier velocity — overridable except ADMIN_FORCE), LEVEL 4 Behaviour (SUSPENDED, UNDER_REVIEW not selectable, RISK_THRESHOLD, RESTRICTED boost-disabled restriction), LEVEL 5 Niche distribution (overridable). Returns APPROVED / APPROVED_WITH_RESTRICTIONS / REJECTED with safe public message. Re-validation enforced at acceptance (`TASK_ACCEPTANCE`) and approval (`INTERACTION_APPROVAL`). Audit written to `MarketplaceValidationLog`.

## Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:459-731`
- `prisma/schema/marketplace.prisma:327-357` (MarketplaceValidationLog, MarketplaceOverrideAudit)
- Call sites: `provider-task.service.ts:342` (PROVIDER_APPLICATION), `task-requester.service.ts:596` (TASK_ACCEPTANCE)

## Status
✅ Fully Implemented

## Gap Analysis
All six validation categories present and orchestrated. Re-validation at acceptance/approval is unconditional. Standardised response object (APPROVED/WITH_RESTRICTIONS/REJECTED) + audit log exist. No gap.

## Recommendation
None.

---

# SECTION 18 — Liquidity Protection

## Requirement
Fallback behaviour, empty-result prevention, admin-assisted matching.

## Current Implementation
- Fallback / empty-result prevention: `MatchingEngine.findCandidates` loops relaxation levels and at level 4 (FALLBACK passthrough) never returns empty when any candidate exists; if genuinely empty it returns `[]` but the LOW_POOL audit path and ManualMatchQueue cron handle persistence.
- Admin-assisted matching: `ManualMatchQueue` model + `ManualMatchQueueService` (enqueue/resolve/list) + `manual-match-queue.cron.ts` daily scan (`neglectedAfterHours`, default 72) enqueues neglected ACTIVE profiles for admin review and emits `ADMIN_LOW_LIQUIDITY_ALERT`.

## Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:113-122`
- `src/modules/task/market-algoritm/manual-match-queue.cron.ts`
- `src/modules/admin/admin-manual-match-queue/manual-match-queue.service.ts`
- `prisma/schema/marketplace.prisma:492-513`

## Status
✅ Fully Implemented

## Gap Analysis
Fallback + admin-assisted matching present. The matching engine itself still returns `[]` for the provider when the pool is empty (no auto-injection at query time) — liquidity is restored asynchronously via the cron + admin queue, which is a valid design but means a provider request can still return empty until an admin resolves a queue entry.

## Recommendation
Optional: surface the queued/manual-match status to the provider as a UX hint (see Section 29).

---

# SECTION 19 — Supply vs Demand

## Requirement
Marketplace balancing, provider/requester monitoring.

## Current Implementation
`LiquidityService.getLiquiditySnapshot` computes supply (eligible provider websites via `ValidationEngine.getEligibleMarketplaceWebsiteIds`), demand (open tasks count), `supplyDemandRatio`, `providerRequesterRatio`, and flags `LOW_SUPPLY`/`LOW_DEMAND` relative to `minViableMatches`. Read-only analytics service.

## Evidence
- `src/modules/admin/admin-analytics/services/liquidity.service.ts`
- `src/modules/task/market-algoritm/validation.engine.ts:183-198`

## Status
🟡 Partially Implemented

## Gap Analysis
Supply/demand monitoring exists as a read-only snapshot. It does NOT auto-balance (e.g. it does not trigger mode switches or supply-generation actions); it only surfaces flags. This is monitoring, not active balancing. The spec lists "marketplace balancing" — currently the balancing actions are manual (admin manual-match queue) rather than automatic.

## Recommendation
Wire the liquidity snapshot flags into the marketplace-mode auto-switch or supply-generation automation if active balancing is required. Otherwise mark as monitoring-complete.

---

# SECTION 20 — New User Boost

## Requirement
Early visibility boost, first-success optimisation.

## Current Implementation
`WebsiteMatchingProfile.firstSuccessBoostActive` (default true). Ranking applies `newWebsiteBoost = newWebsiteBoostFactor` (default 2.5) when `firstSuccessBoostActive` is true (`ranking.service.ts:122-126`). `ScoringService.updateScoresAfterTask` clears `firstSuccessBoostActive` on first successful completion (one-time benefit, scoring.service.ts:132-135). `opportunity-guarantee.cron.ts` boosts neglected sites (opportunityScore from hours-since-last-match, forceMatchNext after 168h).

## Evidence
- `prisma/schema/marketplace.prisma:44`
- `src/modules/task/market-algoritm/ranking.service.ts:122-126`
- `src/modules/task/market-algoritm/scoring.service.ts:132-135`
- `src/modules/task/market-algoritm/opportunity-guarantee.cron.ts`

## Status
✅ Fully Implemented

## Gap Analysis
Early visibility boost + first-success optimisation present and consumed one-time. Opportunity-guarantee cron provides additional neglect-based fairness.

## Recommendation
None.

---

# SECTION 21 — Fallback Matching

## Requirement
Progressive fallback instead of immediate "no results."

## Current Implementation
`MatchingEngine` loops relaxation levels 0→4 and only stops at `maxRelaxationLevel` if still insufficient (matching.engine.ts:113-122). The FALLBACK passthrough (level ≥4) ensures a candidate set is returned when any match exists. Admin manual-match queue is the human fallback for genuinely empty pools (Section 18). `MatchingRelaxationEngine` FALLBACK stage is the last resort before empty.

## Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:113-122`
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts:43-82`

## Status
✅ Fully Implemented

## Gap Analysis
Progressive fallback is implemented. The only remaining empty-result case is a genuinely empty/low marketplace, handled by the manual-match queue (async), not inline.

## Recommendation
None.

---

# SECTION 22 — Trust Indicators

## Requirement
Completed interactions, reliability, user-visible trust metrics.

## Current Implementation
Data exists: `completedInteractions`, `reliabilityScore`, `reputationScore`, `completionRate`, `avgQualityRating` on `WebsiteMatchingProfile`. `recordOpportunityImpressions` writes candidate scores.

## Evidence
- `prisma/schema/marketplace.prisma:43-55`
- `src/modules/task/market-algoritm/scoring.service.ts`

## Status
🟡 Partially Implemented

## Gap Analysis
The trust metrics are computed and stored, but **no code path surfaces them to end users** (e.g. provider/requester public profiles, opportunity cards, dashboard). `provider-dashboard` and `requester-dashboard` services were inspected for exposure of these fields — explicit user-visible trust indicators (reliability %, completed count, reputation badge) are not found in code. The matching engine uses them internally for ranking only.

## Recommendation
Expose `reliabilityScore`, `completedInteractions`, `reputationScore`, `avgQualityRating` via public provider/website profile and opportunity detail responses.

---

# SECTION 23 — Output Quality

## Requirement
Submission review, quality penalties.

## Current Implementation
`task-requester.service.ts reviewTask` handles APPROVE/REJECT. On REJECT, `updateScoresAfterTask(..., false)` lowers reputation/visibility and raises risk; low completion auto-suppresses (scoring.service.ts:106-107). On APPROVE, `rewardProviderCredit` + `updateScoresAfterTask(..., true)`. Quality rating feeds `avgQualityRating` → `calculateVisibilityScore`. REJECT→DISPUTED routes through DisputeService.

## Evidence
- `src/modules/task/task-requester/task-requester.service.ts:1093-1187`
- `src/modules/task/market-algoritm/scoring.service.ts:49-145`
- `src/modules/task/market-algoritm/scoring.utils.ts:87-107`

## Status
✅ Fully Implemented

## Gap Analysis
Submission review + quality penalties (reputation/visibility/risk) present and automated. No automated *content* quality review (e.g. link placement verification) beyond requester judgement.

## Recommendation
None (manual review + rating is standard).

---

# SECTION 24 — Credit System

## Requirement
Deduction, refund, failed-task handling, rejected-task handling.

## Current Implementation
`CreditTaskService`: `deductTaskCredit` (checks wallet, deducts by walletType, logs CreditLog), `refundTaskCredit` (refund to requester wallet), `rewardProviderCredit` (earn on completion). Buckets: subscriptionTaskCredits, allocatedPurchasedCredits, allocatedReferralCredits, earnedTaskCredits. Deduction at task post (provider-task/requester flow), refund on requester cancellation, reward on APPROVE+COMPLETED. Failed task (provider work fails / rejected submission) → no reward, reputation/visibility penalty via scoring; requester credit previously deducted is handled by refund paths. Dispute resolution re-routes credits via `refundTaskCredit`/`rewardProviderCredit`.

## Evidence
- `src/modules/credit/credit-task/credit-task.service.ts` (deductTaskCredit line 74+, refundTaskCredit, rewardProviderCredit)
- `src/modules/task/task-requester/task-requester.service.ts:1093-1148`
- `prisma/schema/credit.prisma` (CreditType, CreditAction, CreditWalletType, WebsiteCreditWallet)

## Status
🟡 Partially Implemented

## Gap Analysis
Deduction + reward + refund are present. **Failed-task handling**: when a task submission is REJECTED (not disputed), the requester's originally-deducted credit is NOT explicitly refunded in the rejection path observed (`task-requester.service.ts` REJECT branch does not call `refundTaskCredit`; only the dispute-resolution path and explicit cancellation do). The spec requires explicit failed/rejected credit handling. This is a gap: rejected submissions may leave requester credit spent without automatic refund.

## Recommendation
Add an explicit requester credit refund (or documented retention policy) on submission REJECT that is not escalated to dispute.

---

# SECTION 25 — Dispute System

## Requirement
Disputes, resolution, credit adjustment.

## Current Implementation
`DisputeService` (dispute.module): `openDispute` (only task owner either side, flips task to DISPUTED, notifies parties), `resolveDispute` (decisions: in-favor-requester → REVISION_REQUESTED; in-favor-provider → COMPLETED; reject; mark-under-review). Resolution applies credit adjustment via `refundTaskCredit` (REFUND_REQUESTER) or `rewardProviderCredit` (reward provider) and links `creditAdjustmentId` to the `Dispute` row. `Dispute` model has `creditAdjustmentId` FK to `CreditLog`. REJECT→DISPUTED auto-route from `reviewTask`.

## Evidence
- `src/modules/task/dispute/dispute.service.ts`
- `src/modules/task/task-requester/task-requester.service.ts:1168-1187`
- `prisma/schema/marketplace.prisma:420-443` (Dispute, CreditLog relation)

## Status
✅ Fully Implemented

## Gap Analysis
Open/resolve/credit-adjustment all present and linked. Dispute openable from REJECT auto-route. No gap in core flow.

## Recommendation
None.

---

# SECTION 26 — Notification System

## Requirement
Opportunity alerts, task updates, acceptance, rejection, reminders.

## Current Implementation
`TaskNotificationService` with `TaskNotificationTrigger` enum covering: PROVIDER_NEW_OPPORTUNITY, PROVIDER_APPLICATION_SUBMITTED/ACCEPTED/REJECTED, PROVIDER_TASK_ASSIGNED/APPROVED/REJECTED/COMPLETED/DISPUTED/CANCELLED, REQUESTER_TASK_CREATED/PROVIDER_SELECTED/PROOF_SUBMITTED/COMPLETED/DISPUTED/CANCELLED, etc. Fired from provider-task, task-requester, dispute services. `NotificationService` handles admin notifications (ADMIN_MARKETPLACE_RISK_FLAGGED, ADMIN_LOW_LIQUIDITY_ALERT, ADMIN_TASK_FROZEN). WebSocket gateway + pubsub present.

## Evidence
- `src/modules/task-notification/enums/task-notification-trigger.enum.ts`
- `src/modules/task/provider-task/provider-task.service.ts:139-154` (PROVIDER_NEW_OPPORTUNITY)
- `src/modules/notification/notification.service.ts`

## Status
✅ Fully Implemented

## Gap Analysis
Opportunity alerts, acceptance, rejection, task updates all present. **Reminders** (e.g. deadline reminders, inactivity nudges) are not found as explicit scheduled reminder notifications — deadline logic exists in task flow but a dedicated "reminder" trigger is not in the enum. Minor gap.

## Recommendation
Add REMINDER triggers (deadline approaching, match pending) if spec requires proactive reminders.

---

# SECTION 27 — Admin Controls

## Requirement
Manual matching, override, priority adjustment, restriction management, marketplace monitoring.

## Current Implementation
- Manual matching: `admin-manual-match-queue` (enqueue/resolve/list) + cron.
- Override: `admin-marketplace-override` (MarketplaceOverrideService: BOOST/SUPPRESS/FORCE_MATCH/SCORE_OVERRIDE/PENALTY) + `MarketplaceOverrideAudit`.
- Priority adjustment: status-based (`admin-website-status`) + tier priority + override score changes.
- Restriction management: `admin-website-status` (6 statuses), `admin-marketplace-visibility` (grace/compliance/usage), `admin-compliance` (abuse flags, freeze).
- Marketplace monitoring: `admin-analytics` (liquidity, pattern flags, dashboards), `admin-dashboard`.
- Scoring config: `admin-marketplace-config` (weights, cooldowns, caps).
- Mode: `admin-marketplace-mode` (EARLY_STAGE/SCALING preset).

## Evidence
- `src/modules/admin/admin-manual-match-queue/*`
- `src/modules/admin/admin-marketplace-override/*` + `marketplace-override.service.ts`
- `src/modules/admin/admin-website-status/*`
- `src/modules/admin/admin-marketplace-visibility/*`
- `src/modules/admin/admin-marketplace-config/*`, `admin-marketplace-mode/*`
- `src/modules/admin/admin-analytics/*`

## Status
✅ Fully Implemented

## Gap Analysis
All five admin-control categories present as dedicated modules behind AdminGuard. Note: `createOverride`/`resolveForWebsite` apply SUPPRESS/PENALTY as suppression; PENALTY type does not add a numeric score penalty beyond suppression (ranking only reads suppressed + score overrides). Acceptable.

## Recommendation
None.

---

# SECTION 28 — Marketplace Modes

## Requirement
Early Stage Mode, Scaling Mode, configuration.

## Current Implementation
`MarketplaceModeConfig` singleton (id `MARKETPLACE_MODE_CONFIG`) with `mode` (EARLY_STAGE|SCALING) and `preset` JSON. `MatchingEngine` reads it: in SCALING mode with a preset, uses `preset.minViableMatches`/`preset.maxRelaxationLevel`/velocity caps instead of scoring-config defaults; EARLY_STAGE keeps defaults. `AdminMarketplaceModeService.setMode` upserts mode + preset. Seeded to EARLY_STAGE by default.

## Evidence
- `prisma/schema/marketplace.prisma:482-490`
- `src/modules/task/market-algoritm/matching.engine.ts:85-106`
- `src/modules/admin/admin-marketplace-mode/admin-marketplace-mode.service.ts`

## Status
✅ Fully Implemented

## Gap Analysis
Both modes + config present and consumed by the matching engine. The preset is only partially typed (minViableMatches/maxRelaxationLevel/velocity caps documented in code comments); other fields are arbitrary JSON. Functional, configurable.

## Recommendation
None.

---

# SECTION 29 — User Experience

## Requirement
Fallback messages, hidden restrictions, blocked opportunities.

## Current Implementation
- Fallback messages: `SAFE_MESSAGES` (validation-result.ts) returns generic "This opportunity is currently unavailable." for COOLDOWN/ELIGIBILITY/LIMIT. `validateTransition` returns `publicMessage` (never the raw rule name).
- Hidden restrictions: `APPROVED_WITH_RESTRICTIONS` + `restrictions[]` array (e.g. LOW_PRIORITY, BOOST_DISABLED) kept internal; not surfaced to user. `ValidationResult.failedRules` explicitly "internal only — never return to client."
- Blocked opportunities: candidates are filtered server-side; provider just sees empty/fewer results.

## Evidence
- `src/modules/task/market-algoritm/validation-result.ts`
- `src/modules/task/market-algoritm/validation.engine.ts:700-722`

## Status
🟡 Partially Implemented

## Gap Analysis
Safe messages + internal restriction tracking present. However, the provider **opportunities endpoint** (`getProviderOpportunities`) returns `[]` when the pool is empty/low with no explicit UX fallback message or "availability" signal — the `SAFE_MESSAGES` constant is produced by `validateTransition` but is only used to throw `ForbiddenException` at apply/accept, not presented as a soft availability hint on the listing. So "fallback messages" on the browse page are effectively absent (empty list, no explanation). "Blocked opportunities" are silently omitted rather than shown as hidden/unavailable.

## Recommendation
Add a soft availability/explanation message to the opportunities response when the result set is empty or restricted (e.g. LOW_POOL note, manual-match-queued hint).

---

# SECTION 30 — System Architecture

## Requirement
Separate services/modules for: Marketplace, Matching, Ranking, Distribution, Validation, Quality, Risk, Tier, Liquidity, Notification, Credit, Analytics, Admin, Background Jobs. Identify mixed responsibilities.

## Current Implementation
Modular structure exists:
- **Matching Engine**: `MatchingEngine` + `MatchingRelaxationEngine`.
- **Ranking Engine**: `TommacayRankingService`.
- **Distribution Engine**: `DistributionEngine`.
- **Validation Engine**: `ValidationEngine`.
- **Quality/Risk/Scoring**: `ScoringService` + `scoring.utils.ts` (computeVisibility/Reputation/Risk/Boost).
- **Tier Engine**: `TierEngine`.
- **Liquidity**: `LiquidityService` (admin-analytics).
- **Notification**: `NotificationService` + `TaskNotificationService`.
- **Credit**: `CreditModule` (credit-task, website-credit, subscription-credit, purchased-credit, referral, visibility-credit).
- **Analytics**: `admin-analytics` services.
- **Admin**: dedicated admin-* marketplace modules.
- **Background Jobs**: 4 crons + BullMQ worker bootstrap.

**Mixed responsibilities identified**:
1. `ValidationEngine` is large (831 lines) and also owns `normalizeRootDomain`, cooldown-day math, eligibility helpers, tier/velocity enforcement, niche enforcement, and audit logging — many concerns in one class. It injects `TierEngine` + `DistributionEngine`, so the engine layer is correctly decomposed but the ValidationEngine itself is a god-class.
2. `ScoringService` is named "Quality" but also writes RiskEvents and applies suppression — risk + quality + suppression co-located. Acceptable but could split.
3. `provider-task.service.ts` and `task-requester.service.ts` are fat services that orchestrate matching, validation, scoring, credit, notification, and task-flow — business orchestration is mixed into the controller-layer services rather than a dedicated orchestration/use-case layer. `recordApprovedDomainInteraction` is duplicated in both `task-requester` and `admin-task` (the codebase added `DomainInteractionRecorderService` to consolidate, but `task-requester.service.ts:1138` still calls a local `recordApprovedDomainInteraction` — potential duplication/divergence).
4. `MatchingEngine.rankAndFilter`/scoring wiring is partly in the service layer; ranking lives in `RankingService` but relaxation lives in `MatchingRelaxationEngine` — reasonably separated.

## Evidence
- `src/modules/task/market-algoritm/*` (all engines)
- `src/modules/task/provider-task/provider-task.service.ts`, `task-requester/task-requester.service.ts`
- `src/modules/credit/*`, `src/modules/notification/*`, `src/modules/admin/*`
- `src/bullmq/*`, `src/modules/task/market-algoritm/*cron.ts`

## Status
🟡 Partially Implemented (architecture is well-modularised at the engine level; room to improve SRP in the ValidationEngine god-class and the fat task services)

## Gap Analysis
The spec's 14 logical modules are each present. The main architectural risk is the `ValidationEngine` god-class (831 lines, many responsibilities) and the fat `provider-task`/`task-requester` services that mix orchestration. There is also possible duplication of `recordApprovedDomainInteraction` between `task-requester.service.ts` and `DomainInteractionRecorderService`.

## Recommendation
- Extract `normalizeRootDomain`/cooldown math into a `DomainUtils`/value-object.  
- Split `ValidationEngine` levels into per-level validators (EligibilityValidator, GovernanceValidator, CapacityValidator, BehaviourValidator, NicheValidator) orchestrated by a thin `ValidationEngine`.  
- Introduce a use-case/orchestration layer between controllers and engines to thin out `provider-task`/`task-requester` services.  
- Replace the remaining local `recordApprovedDomainInteraction` in `task-requester.service.ts` with `DomainInteractionRecorderService.record`.

---

# DATABASE AUDIT (Prisma Schema)

## Current State
The Prisma schema is split across `prisma/schema/*.prisma` (marketplace, website, placement, credit, user, subscription, subscriptionPlan, notification, message, auth, legal-doc, admin-analytics, enums).

### Models present (marketplace-relevant)
- `WebsiteMatchingProfile` (scores, status, caps, counters) — marketplace.prisma:25-99
- `OpportunityImpression` (impression logging) — :101-133
- `MatchingAuditLog` — :135-151
- `MarketplaceScoringConfig` (singleton weights/cooldowns/caps) — :153-214
- `MarketplaceOverride` + `MarketplaceOverrideAudit` — :216-357
- `DomainInteraction` + `DomainPairStat` (relationship tracking) — :256-323
- `MarketplaceValidationLog` — :327-342
- `NicheDistributionCap` — :359-377
- `Dispute` + `RiskEvent` + `PatternFlag` + `MarketplaceModeConfig` + `ManualMatchQueue` — :381-513

### Enums present
`WebsiteMarketplaceStatus` (6 values), `MarketplaceOverrideType`, `MarketplaceOverrideStatus`, `DisputeStatus`, `RiskEventType`, `PatternFlagType`, `PatternSeverity`, `PatternFlagStatus`, `MarketplaceMode`, `PlanTier` (5 values), `UserStatus`, `TaskStatus` (16), `PlacementType`, `LinkAttribute`, `CreditType`, `CreditAction`, `CreditWalletType`, etc.

## Missing Models / Tables
**None required by the specification are missing.** All spec-implied entities (matching profile, override, domain pair, validation log, dispute, risk event, pattern flag, mode config, manual match queue, niche cap, impression) exist.

## Missing Indexes
Existing indexes are adequate for the access patterns (status, scores, domains, pair keys, timestamps, category keys). Minor gaps:
- `WebsiteMatchingProfile` has no composite index on `(marketplaceStatus, isSuppressed, suppressedUntil)` used by the crons' `where` clauses — the crons filter on these but rely on individual single-column indexes (marketplaceStatus, isSuppressed+suppressedUntil). Acceptable (Postgres can combine), but a composite would help the daily crons.
- `DomainInteraction` has indexes on category keys but no index on `(sourceDomain, targetDomain)` composite (queries use `OR [domainA/domainB]` on `DomainPairStat`, not `DomainInteraction`). Fine.

## Missing Relations / Constraints
- `MarketplaceModeConfig` has no `updatedById` (noted in code comment, admin-marketplace-mode.service.ts:43-45) — audit gap, not a functional defect.
- `Dispute.creditAdjustmentId` → `CreditLog` FK present (preset, onDelete SetNull). Good.
- No FK from `RiskEvent` to `WebsiteMatchingProfile` (it references `Website` only) — acceptable since risk is per-website.
- `enforceRevalidationAtAcceptance`/`enforceRevalidationAtApproval` on `MarketplaceScoringConfig` are now dead (unused) — safe to drop.

## Suggested Structural Changes (only those required by spec)
1. **Add a composite index** `(marketplaceStatus, isSuppressed, suppressedUntil)` on `WebsiteMatchingProfile` to support the daily crons (low priority).
2. **Add `updatedById`** to `MarketplaceModeConfig` for audit completeness (low priority).
3. **Optionally drop** dead `enforceRevalidationAt*` fields (cosmetic).
4. **No new models required** — the schema already covers all 30 sections.

---

# API AUDIT (Marketplace Endpoints)

## Existing Endpoints (confirmed via controllers)
- `ProviderTaskController.getProviderOpportunities` → GET opportunities (calls findCandidates + rankAndFilter + recordOpportunityImpressions). ✅
- `ProviderTaskController.applyToTask` → POST apply (validateTransition PROVIDER_APPLICATION). ✅
- `TaskRequesterController.selectProvider` → provider selection (validateTransition TASK_ACCEPTANCE). ✅
- `TaskRequesterController.reviewTask` → APPROVE/REJECT (scoring + credit + dispute route). ✅
- `DisputeController` → open/resolve/list dispute. ✅
- `AdminMarketplaceConfigController` → get/update scoring config. ✅
- `AdminMarketplaceModeController` → get/set mode + preset. ✅
- `AdminMarketplaceOverrideController` → create/revoke/list overrides. ✅
- `AdminMarketplaceVisibilityController` → list website visibility/grace/compliance. ✅
- `AdminWebsiteStatusController` → set website marketplace status. ✅
- `AdminManualMatchQueueController` → enqueue/resolve/list. ✅
- `AdminAnalyticsController` → liquidity snapshot, pattern flags, dashboards. ✅
- `CreditController` / `CreditTaskController` → deduct/refund/reward. ✅
- `NotificationController` / `TaskNotificationService` → triggers. ✅

## Missing Endpoints
1. **NicheDistributionCap CRUD** — no endpoint to create/manage niche caps (Section 12 config data).  
2. **Provider/website public trust-profile** — no endpoint exposing reliability/reputation/completed-count to users (Section 22).  
3. **Opportunities availability/fallback message** — the listing returns raw items without availability context (Section 29).  
4. **Tier/velocity admin view** — tiers resolved from subscription; no dedicated admin endpoint to set `weeklyInteractionLimit`/`tierVelocityLimit` profile overrides.  

## Validation Gaps
- `getProviderOpportunities` filters are passed through; `status` is validated against open lifecycle statuses in `getCandidateTasks`, but other filters (placementType, linkAttribute) are loosely validated. Acceptable.
- `createOverride` DTO lacks strict validation on `reasonCode` (required string) and `type` enum — present but minimal.

## Authorization Gaps
- All admin marketplace endpoints are behind `AdminGuard` (confirmed in module imports).  
- Provider/requester ownership enforced in services (applyToTask, selectProvider, openDispute).  
- No gap found in authorization at the service layer; JWT strategy blocks BANNED users.

---

# BACKGROUND JOBS AUDIT

## Existing Jobs (confirmed)
1. **Score/opportunity updates**: `OpportunityGuaranteeCron` (daily 02:00) — recomputes opportunityScore + boostFactor + forceMatchNext for neglected ACTIVE sites. ✅
2. **Risk updates**: risk is computed inline at `updateScoresAfterTask` (event-driven, not a cron). No dedicated risk *recalc* cron, but decay is applied per-event. RiskEvent logging is event-driven. ✅ (event-driven, acceptable)
3. **Cleanup**: `ImpressionCleanupCron` (daily 04:30) — purges stale `OpportunityImpression` rows > retentionDays. ✅
4. **Notifications**: notification delivery via BullMQ processor (`notification.processor.ts`) + cron-driven admin alerts (LOW_LIQUIDITY, RISK_FLAGGED). ✅
5. **Boost decay**: handled in `calculateBoost` (per-event) + `OpportunityGuaranteeCron` (neglect-based boost). ✅
6. **Analytics**: `admin-analytics` computes snapshots on-demand (liquidity) + `PatternMonitorCron`. ✅
7. **Marketplace maintenance / liquidity**: `ManualMatchQueueCron` (daily 03:00) — enqueues neglected profiles for admin-assisted matching. ✅
8. **Pattern monitoring**: `PatternMonitorCron` (every 6h) — SCC cluster detection. ✅

## Gaps
- **Decay/risk recalc cron**: there is no scheduled job that *recomputes* risk decay or scores across all profiles on a timer; decay happens only when an event occurs. Dormant profiles keep their last riskScore until next interaction. If spec requires periodic decay for inactive sites, add a cron. Low priority.
- **BullMQ workers**: `bullmq.worker.bootstrap.ts` exists; referral streak maintenance worker present. Good.

---

# ARCHITECTURE AUDIT

## Service Boundaries
Well-defined at the engine level. Each engine (Matching, Ranking, Validation, Distribution, Tier, Scoring, Pattern) is a separate `@Injectable`. Admin concerns are split into focused modules.

## Business Logic Separation
Most marketplace logic lives in engines (good). However orchestration (matching + validation + scoring + credit + notification + task-flow) is embedded in `provider-task.service.ts` and `task-requester.service.ts` fat services.

## SOLID / Single Responsibility
- `ValidationEngine` violates SRP (god-class, 831 lines, owns normalisation, cooldown math, eligibility, tier/velocity, niche, audit). ⚠
- `ScoringService` mixes quality + risk + suppression. ⚠ (minor)
- `task-requester.service.ts` mixes orchestration across many domains. ⚠

## Domain-Driven Design
Aggregates are reasonable (Website, PlacementTask, WebsiteMatchingProfile, Dispute). Bounded contexts (Marketplace, Credit, Notification, Admin) are separated into modules.

## Scalability
- Relaxation loop issues up to 5 Prisma `findMany` queries per level (matching.engine.ts) — O(levels × tasks). For large marketplaces this is N+1-ish; the candidate set is built in memory. Acceptable at current scale; would need query-level relaxation for very large pools.
- `PatternMonitorService.loadEdges` pages 1000 at a time — bounded.
- Impression cleanup is batched.

## Maintainability
High — engines are unit-tested (many `*.spec.ts` files: validation.engine.spec, ranking.service.spec, distribution-engine.spec, matching-relaxation.spec, pattern-monitor.spec, manual-match-queue.spec). Code is commented with spec references.

## Code Duplication
- `recordApprovedDomainInteraction` appears both in `task-requester.service.ts:1138` (local call) and in `DomainInteractionRecorderService` (the consolidation target). Possible divergence. ⚠
- `buildDefaultMatchingProfileCreate` is a good single-source default. ✅

## Future Extensibility
High — new relaxation levels, weights, caps, modes, and override types are all config/data-driven. Adding a niche cap or tier only requires data + a small engine hook.

---

# FINAL SUMMARY

## 1. Overall Implementation Percentage

**~88% implemented** across the 30 specification sections (measured by requirement coverage, not code volume).

| Bucket | Count | Sections |
|---|---|---|
| ✅ Fully Implemented | 22 | 1,2,3,4,5,6,7,8,9,10,11,13,15,16,17,20,21,23,25,26,27,28 |
| 🟡 Partially Implemented | 6 | 12*,14*,19,22,24,29,30* (12/14/30 are near-complete) |
| ❌ Missing | 0 | — |
| ⚠ Needs Refactor | 1 | 30 (architecture) |

\* See notes: Section 12 lacks only a CRUD endpoint for niche caps; Section 14 covers cluster detection fully (reciprocal/repeat are observability-only by design); Section 30 is functionally complete but has SRP smells.

**Database**: 100% of required models/tables/enums present. **API**: ~90% (4 endpoint groups missing). **Background Jobs**: 100% of required categories present.

## 2. Fully Implemented Features
Marketplace eligibility & ownership; matching engine (website/category/tag/country/language/placement/DA-DR); progressive relaxation (Exact→Related→Broad→Fallback); full ranking formula (compatibility/opportunity/visibility/reputation/boost + exposure/risk/authority/force-match penalties + tier + low-priority factor); visibility control (weight/priority/frequency, non-destructive); website quality tracking (completion/activity/reliability/diversity/behaviour/penalties); 6 website statuses; domain relationship tracking (root-domain, history, timestamps); reciprocal + repeat-pair cooldowns (configurable, direction-aware); distribution rules (diversity/repeat-reduction/network-concentration); niche distribution caps (primary+secondary); velocity rules (daily/weekly/frequency); pattern monitoring (cluster/SCC); risk engine (score/calc/penalty/threshold + immutable log); tier system (5 tiers, limits, priority, enforcement); validation engine (6 ordered levels, standardised decision, re-validation, audit log); liquidity protection (fallback + manual-match queue); new-user/first-success boost; fallback matching; submission review + quality penalties; dispute system (open/resolve/credit-adjustment); notification triggers (opportunity/accept/reject/task-updates); all 5 admin-control categories; marketplace modes (EARLY_STAGE/SCALING + preset); background jobs (score/opportunity/cleanup/pattern/liquidity/boost-decay).

## 3. Partially Implemented Features
- **§12 Niche Distribution** — engine + enforcement present; only missing an admin CRUD endpoint to seed/manage `NicheDistributionCap` rows.
- **§14 Pattern Monitoring** — cluster detection fully implemented; `REPEAT_BURST`/`RECIPROCAL_RING` flag types exist but are never emitted (pairwise cooldowns handle those; observability-only by design).
- **§19 Supply vs Demand** — read-only monitoring/flagging present; no *automatic* balancing action.
- **§22 Trust Indicators** — metrics computed & stored, but NOT surfaced to end users.
- **§24 Credit System** — deduction/reward/refund present; rejected (non-disputed) submission does not auto-refund requester credit.
- **§29 User Experience** — safe messages + internal restriction tracking present, but the opportunities listing returns empty with no soft availability/fallback message; blocked opportunities are silently omitted.
- **§30 Architecture** — all 14 modules present; `ValidationEngine` god-class + fat task services + duplicate `recordApprovedDomainInteraction` are SRP/maintainability smells.

## 4. Missing Features
**None required by the specification are entirely missing.** Every section has a corresponding implementation or data model. The only "missing" items are endpoint-level exposures and one auto-refund path (see Partially Implemented).

## 5. High-Risk Architectural Issues
1. **`ValidationEngine` god-class (831 lines)** mixing normalisation, cooldown math, eligibility, tier/velocity, niche, and audit logging — hard to test/maintain despite good spec-level coverage.
2. **Duplicate `recordApprovedDomainInteraction`** in `task-requester.service.ts` vs the consolidated `DomainInteractionRecorderService` — risk of divergent cooldown/niche logic.
3. **Fat orchestration services** (`provider-task`, `task-requester`) — business flow logic mixed with HTTP/controller concerns; no dedicated use-case layer.
4. **ABUSE RiskEvent inconsistency** — `PatternMonitorService` writes `delta:0/riskScoreAfter:0` ABUSE events that do not actually raise a site's `riskScore` (profile risk only updates via `updateScoresAfterTask`).
5. **Rejected-submission credit retention** — requester credit may remain spent on REJECT without dispute (Section 24 gap).

## 6. Database Changes Required
- Composite index `(marketplaceStatus, isSuppressed, suppressedUntil)` on `WebsiteMatchingProfile` (supports daily crons). *Low*.
- Optional `updatedById` on `MarketplaceModeConfig` (audit). *Low*.
- Optional removal of dead `enforceRevalidationAt*` fields. *Cosmetic*.
- **No new models/tables required.**

## 7. API Changes Required
- Add `NicheDistributionCap` admin CRUD endpoints (Section 12). *Low*.
- Add public trust-profile endpoint exposing reliability/reputation/completed-count (Section 22). *Low*.
- Add availability/fallback context to `GET opportunities` response (Section 29). *Low*.
- Add admin endpoint for `weeklyInteractionLimit`/`tierVelocityLimit` profile overrides (Section 16). *Low*.

## 8. New Services / Modules Recommended
- **NicheDistributionCapAdminService** (admin CRUD) — *Low*.
- **TrustProfileService / public DTO** for user-visible trust (Section 22) — *Low*.
- **RiskRecalcCron** (periodic decay across dormant profiles) — *Low/Medium* (only if spec requires timed decay for inactive sites).
- **Per-level validators** (EligibilityValidator, GovernanceValidator, CapacityValidator, BehaviourValidator, NicheValidator) to decompose `ValidationEngine` — *Medium* (refactor, no behaviour change).
- **Use-case/orchestration layer** between controllers and engines — *Medium* (refactor).
- **DomainUtils** value object for `normalizeRootDomain`/cooldown math — *Low* (refactor).

## 9. Suggested Implementation Order (highest priority first)
1. **Fix rejected-submission credit handling (§24)** — Medium. Direct user/credit correctness impact; cheapest high-value fix.
2. **Surface trust indicators to users (§22)** — Low. High product value, simple read endpoints.
3. **Add opportunities availability/fallback message (§29)** — Low. UX/transparency.
4. **Fix ABUSE RiskEvent → real risk delta (§15)** — Low/Medium. Correctness of risk enforcement.
5. **Add NicheDistributionCap admin CRUD (§12)** — Low. Completes configurability.
6. **De-duplicate `recordApprovedDomainInteraction` (§8/§30)** — Low. Removes divergence risk.
7. **Auto-balance wiring for supply/demand (§19)** — Medium. Only if automatic balancing is required.
8. **Refactor ValidationEngine into per-level validators + use-case layer (§30)** — Medium. Maintainability, no behaviour change.
9. **Add composite index + mode-config audit field (DB)** — Low.
10. **Add RiskRecalcCron (§15/jobs)** — Low/Medium. Only if timed decay mandated.

## 10. Estimated Implementation Complexity (for every gap/partial feature)

| # | Item | Complexity |
|---|---|---|
| 1 | Rejected-submission credit refund (§24) | **Low** |
| 2 | Trust indicators public exposure (§22) | **Low** |
| 3 | Opportunities availability/fallback message (§29) | **Low** |
| 4 | ABUSE RiskEvent real delta (§15) | **Low** |
| 5 | NicheDistributionCap admin CRUD (§12) | **Low** |
| 6 | De-duplicate recordApprovedDomainInteraction (§8/30) | **Low** |
| 7 | Supply/demand auto-balance (§19) | **Medium** |
| 8 | ValidationEngine per-level split + use-case layer (§30) | **Medium** |
| 9 | DB composite index + mode-config audit field | **Low** |
| 10 | RiskRecalcCron (timed decay) | **Low/Medium** |
| — | New marketplace models/tables | **None required** |

---

*End of report. All findings verified against source code in `src/modules/task/market-algoritm/`, `src/modules/task/{provider-task,task-requester,dispute,admin-task}/`, `src/modules/credit/`, `src/modules/notification/`, `src/modules/admin/`, and `prisma/schema/*.prisma` as of 2026-07-16.*
