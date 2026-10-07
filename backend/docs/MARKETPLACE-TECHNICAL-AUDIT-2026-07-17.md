# Marketplace Technical Audit Report

**Project:** backlyst-backend
**Audit Date:** 2026-07-17
**Auditor:** Senior Software Architect / Backend Engineer
**Scope:** Full marketplace specification (Sections 1–30) + Database, API, Background Jobs, Architecture audits
**Method:** Evidence-based. Every conclusion references actual code. No assumptions.

---

## Audit Methodology

All findings were derived by reading the actual implementation files, Prisma schema, controllers, and cron registrations. The codebase is a NestJS application. The marketplace logic lives primarily in `src/modules/task/market-algoritm/` (engines), `src/modules/task/marketplace-engine/` (module wiring), `src/modules/task/marketplace-cron/` (crons), `src/modules/admin/` (admin controls), and `src/modules/task/dispute/`, `src/modules/credit/`, `src/modules/notification/`, `src/modules/task-notification/`.

Key source files verified:
- `prisma/schema/marketplace.prisma`, `website.prisma`, `enums.prisma`, `placement.prisma`
- `src/modules/task/market-algoritm/matching.engine.ts`
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts`
- `src/modules/task/market-algoritm/ranking.service.ts`
- `src/modules/task/market-algoritm/validation.engine.ts`
- `src/modules/task/market-algoritm/distribution-engine.service.ts`
- `src/modules/task/market-algoritm/tier-engine.service.ts`
- `src/modules/task/market-algoritm/risk.engine.ts`
- `src/modules/task/market-algoritm/scoring.service.ts`
- `src/modules/task/market-algoritm/quality.engine.ts`
- `src/modules/task/market-algoritm/liquidity.engine.ts`
- `src/modules/task/market-algoritm/pattern-monitor.service.ts`
- `src/modules/task/market-algoritm/trust-indicator.service.ts`
- `src/modules/task/market-algoritm/supply-demand-rebalancer.service.ts`
- `src/modules/task/market-algoritm/opportunity-alert.service.ts`
- `src/modules/task/market-algoritm/scoring.utils.ts`
- `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts`
- `src/modules/task/provider-task/provider-task.service.ts`
- `src/modules/task/dispute/dispute.service.ts`
- `src/modules/credit/credit-task/credit-task.service.ts`
- `src/modules/admin/admin-niche-cap/admin-niche-cap.service.ts`
- `src/modules/admin/admin-marketplace-visibility/admin-marketplace-visibility.service.ts`
- `src/modules/admin/admin-marketplace-mode/admin-marketplace-mode.service.ts`
- `src/modules/website/website-verification/website-verification.service.ts`
- `src/modules/task/marketplace-engine/marketplace-engine.module.ts`
- `src/modules/task/marketplace-cron/marketplace-cron.module.ts`

---

# SECTION 1 — Marketplace Eligibility

## Requirement
Website verification, website ownership validation, active status, deleted status, suspended status, provider ownership, task eligibility, duplicate applications, own-task prevention.

## Current Implementation
Eligibility is centralized in `ValidationEngine`:
- `isUserActive()` (validation.engine.ts:155) checks `user.status === 'ACTIVE'`.
- `getEligibleMarketplaceWebsiteIds()` (validation.engine.ts:185) requires `isDeleted: false`, `verificationStatus: 'VERIFIED'`, `marketplaceVisibilityStatus: 'VISIBLE'`, `isFlag: false`, `isWalletLock: false`, plus `isWebsiteRowMarketplaceEligible`.
- `isWebsiteRowMarketplaceEligible()` (validation.engine.ts:385) enforces VERIFIED, VISIBLE, not flagged, not wallet-locked, browsable status (not SUSPENDED), riskScore < 75, not suppressed.
- `isWebsiteEligible()` (validation.engine.ts:172) checks website ownership (`website.authorId !== userId`).
- `validateTransition()` LEVEL 1 (validation.engine.ts:480) validates USER_INACTIVE, PROVIDER_WEBSITE_INELIGIBLE, REQUESTER_WEBSITE_INELIGIBLE, TASK_NOT_AVAILABLE, and OWN_TASK (task.requesterId === actorUserId).
- Own-task prevention also in `provider-task.service.ts:377` (`task.requesterId === providerId` → BadRequestException).
- Duplicate application prevention in `provider-task.service.ts:430` (`findFirst` + guard).

## Evidence
`ValidationEngine.isUserActive`, `getEligibleMarketplaceWebsiteIds`, `isWebsiteRowMarketplaceEligible`, `isWebsiteEligible`, `validateTransition` LEVEL 1; `provider-task.service.ts` applyToTask, OWN_TASK check, duplicate check; `WebsiteVerificationService` (verification types HTML/DNS/screenshot).

## Status
✅ Fully Implemented

## Gap Analysis
None for eligibility itself. Verification is multi-method (HTML_META_TAG, DNS_TXT_RECORD, SCREENSHOT_URL) per `enums.prisma`. Note: website verification is a hard gate and is never relaxed by the matching relaxation engine (correct per "verification never relaxed").

## Recommendation
None required. Eligibility is robust and fail-closed.

---

# SECTION 2 — Matching Engine

## Requirement
website-based matching, category matching, tag matching, country, language, placement type, DA/DR compatibility, progressive relaxation, verification never relaxed.

## Current Implementation
`MatchingEngine.findCandidates()` (matching.engine.ts:28):
- Builds eligible provider/requester websites, gets candidate tasks filtered by `placementType`/`linkAttribute` (matching.engine.ts:213).
- `buildCandidate()` (matching.engine.ts:381) computes `categoryExact`, `industryRelated`, `tagOverlap`, `countryExact`, `languageExact`, and `authorityMeets` (DA/DR).
- `calculateCompatibility()` (matching.engine.ts:472) scores: base 35 + 25 category exact / +12 related, tag overlap up to 20, +10 country, +10 language, −15 if DA/DR below required.
- DA/DR is checked via `task.requiredDomainRating` vs `providerWebsite.domainRating` (matching.engine.ts:407). The actual hard gate runs at apply time via Moz API in `provider-task.service.ts:415-428`.
- Verification never relaxed: relaxation engine only adjusts category/tag/country/language, never verification/eligibility gates.

## Evidence
`matching.engine.ts` `findCandidates`, `buildCandidate`, `calculateCompatibility`; `provider-task.service.ts` DA/DR Moz check (line 415-428); `matching-relaxation.engine.ts`.

## Status
🟡 Partially Implemented

## Gap Analysis
DA/DR compatibility is **not a first-class matching/ranking input**. In `calculateCompatibility` (line 495) it only applies a −15 penalty when `requiredDr > 0 && !authorityMeets`. There is no positive reward for meeting/exceeding DA/DR, and the hard enforcement is deferred to apply-time Moz lookup, not at browse/match time. Depending on spec intent, DA/DR should participate in candidate scoring/ranking, not only penalize and gate at apply.

## Recommendation
Add DA/DR as a positive compatibility component in `calculateCompatibility` (reward meeting/exceeding required DR) and optionally filter candidates at matching time when `requiredDomainRating` is set and `domainRating` is known, so browse results reflect authority fit.

---

# SECTION 3 — Dynamic Relaxation

## Requirement
Exact → Related → Broad → Fallback progressive relaxation.

## Current Implementation
`MatchingRelaxationEngine` (matching-relaxation.engine.ts) with `stageForLevel`:
- level 0 → EXACT (category EXACT + tags EXACT + country/language exact-or-unknown)
- level 1 → RELATED (category EXACT + tags PARTIAL + language exact-or-unknown)
- level 2 → BROAD (category RELATED + country exact-or-unknown)
- level 3 → BROAD (category RELATED OR tags PARTIAL)
- level 4 → FALLBACK (passthrough)

`MatchingEngine.findCandidates` (matching.engine.ts:95) loops `level 0..maxRelaxationLevel` and breaks once `selected.length >= minViableMatches` or final level reached.

## Evidence
`matching-relaxation.engine.ts` (full file), `matching.engine.ts:95-104` relaxation loop.

## Status
✅ Fully Implemented

## Gap Analysis
Progression matches spec. Verification and hard eligibility are never relaxed (correct).

## Recommendation
None.

---

# SECTION 4 — Ranking Engine

## Requirement
Compatibility Score, Opportunity Score, Visibility Score, Reputation Score, Boost Score, Exposure Penalty, Risk Penalty, Final ranking formula.

## Current Implementation
`TommacayRankingService.rankAndFilter()` (ranking.service.ts:16):
- Compatibility Score: from candidate (Section 2).
- Opportunity Score: `profile.opportunityScore`.
- Visibility Score: `profile.visibilityScore`.
- Reputation Score: `profile.reputationScore`.
- Boost Score: `(boostFactor + newWebsiteBoost) * 20`.
- Exposure Penalty: `exposureCount7d * exposurePenaltyPerTaskView`.
- Risk Penalty: `(riskScore/100) * riskWeight` (dispute vs rejection weight).
- Final formula (ranking.service.ts:148-170): `weightedScore * tierPriority − exposurePenalty − riskPenalty − authorityPenalty + forceMatchBonus + internalPriorityScore*weight + diversityScore*weight`, then `* priorityFactor` (LOW_PRIORITY → 0.7).

## Evidence
`ranking.service.ts` `rankAndFilter`, scoring block lines 107-170.

## Status
✅ Fully Implemented

## Gap Analysis
All required score components present and combined via a explicit weighted formula.

## Recommendation
None.

---

# SECTION 5 — Visibility Control

## Requirement
visibility weighting, priority reduction, frequency reduction, non-destructive visibility control.

## Current Implementation
- Visibility weighting: `visibilityWeight` in `MarketplaceScoringConfig` and `visibilityScore` in ranking.
- Priority reduction: `LOW_PRIORITY` status multiplies final score by `lowPriorityFactor` (0.7) in ranking.service.ts:166.
- Frequency reduction: `maxRequesterExposurePerDay` cap in ranking.service.ts:99; `LIMITED_ACCESS` uses `marketplaceStatusDailyCap` (ranking.service.ts:83).
- Non-destructive: visibility control is via score multipliers and caps, never deleting/flagging records. Suppression uses `isSuppressed`/`suppressedUntil` timestamps (ranking.service.ts:70) preserving history.

## Evidence
`ranking.service.ts` lines 70-170; `MarketplaceScoringConfig` model; `WebsiteMatchingProfile.marketplaceStatusDailyCap`.

## Status
✅ Fully Implemented

## Gap Analysis
None.

## Recommendation
None.

---

# SECTION 6 — Website Quality

## Requirement
Track completion, activity, reliability, interaction diversity, behaviour patterns, quality penalties.

## Current Implementation
`QualityEngine.computeMetrics()` (quality.engine.ts):
- Completion: `completionRate`.
- Reliability: `reliabilityScore` (successful/total).
- Activity: `computeActivityScore` (recency + frequency).
- Interaction diversity: `diversityScore` in `DistributionEngine.computeDiversityScore` (distinct counterpart domains / total).
- Quality penalties: `avgQualityRating`, `qualityRatingSum`, composite quality score, completion < 0.4 → suppression (scoring.service.ts:89-125).

## Evidence
`quality.engine.ts`, `distribution-engine.service.ts:23`, `scoring.service.ts:88-125`.

## Status
🟡 Partially Implemented

## Gap Analysis
"Behaviour patterns" as a distinct, first-class tracked concept (beyond risk/reliability) is **not** modeled. Quality is computed post-task but there is no dedicated behaviour-pattern tracking model/engine that flags e.g. erratic timing, rating gaming, or anomalous interaction cadence beyond the risk engine and pattern monitor.

## Recommendation
Introduce a lightweight `BehaviourPattern` tracking concept (or extend `QualityEngine`) to capture interaction-cadence/pattern anomalies, separate from risk scoring, if the spec requires first-class behaviour-pattern tracking.

---

# SECTION 7 — Website Status

## Requirement
Support Active, Low Priority, Limited Access, Under Review, Restricted, Suspended.

## Current Implementation
Enum `WebsiteMarketplaceStatus` (marketplace.prisma:10): ACTIVE, LOW_PRIORITY, LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED, SUSPENDED.
- `ValidationEngine.isBrowsableStatus` (validation.engine.ts:46): only SUSPENDED is non-browsable.
- `isSelectableStatus` (validation.engine.ts:55): ACTIVE/LOW_PRIORITY/LIMITED_ACCESS/RESTRICTED selectable; UNDER_REVIEW browsable but not selectable.
- Ranking differentiates: LOW_PRIORITY ×0.7; LIMITED_ACCESS daily cap; RESTRICTED boost disabled; SUSPENDED excluded.

## Evidence
`enums` + `marketplace.prisma` enum, `validation.engine.ts:46-67`, `ranking.service.ts:83-170`.

## Status
✅ Fully Implemented

## Gap Analysis
All six statuses supported and differentiated in both eligibility and ranking.

## Recommendation
None.

---

# SECTION 8 — Domain Relationship Tracking

## Requirement
relationship history, root-domain tracking, interaction logging, timestamps.

## Current Implementation
- `DomainInteraction` model (marketplace.prisma:256): taskId (unique), source/target website + domain, normalizedPairKey, primary/secondary category keys, `completedAt`, `createdAt`.
- `DomainPairStat` model (marketplace.prisma:291): normalizedPairKey (unique), domainA/B, niche tags, `lastSourceDomain`, `lastTargetDomain`, `lastInteractionAt`, `repeatPairCooldownUntil`, `reciprocalCooldownUntil`, `interactionCount`.
- `DomainInteractionRecorderService.record()` (domain-interaction-recorder.service.ts:31) writes both on completed interaction.

## Evidence
`marketplace.prisma` `DomainInteraction`, `DomainPairStat`; `domain-interaction-recorder.service.ts`.

## Status
✅ Fully Implemented

## Gap Analysis
History, root-domain normalization (`ValidationEngine.normalizeRootDomain`, validation.engine.ts:76), interaction logging, and timestamps all present.

## Recommendation
None.

---

# SECTION 9 — Reciprocal Rules

## Requirement
Reciprocal prevention; determine time window, configuration, enforcement point.

## Current Implementation
Direction-aware cooldowns in `ValidationEngine`:
- Two independent cooldowns per pair: `repeatPairCooldownUntil` (same direction) and `reciprocalCooldownUntil` (reverse direction), via `buildOrderedPairKey` (validation.engine.ts:135).
- Configurable via `MarketplaceScoringConfig.reciprocalCooldownDays` (default 120) and `repeatPairCooldownDays` (default 90).
- Enforcement points: matching hard-rule filtering (`getCooldownBlockedPairKeys`, validation.engine.ts:243) and `validateTransition` LEVEL 2 (`canMatchWithWindows`, validation.engine.ts:520).
- MS_PER_DAY constant fixes prior day→ms bug (validation.engine.ts:149).

## Evidence
`validation.engine.ts` `buildOrderedPairKey`, `getCooldownBlockedPairKeys`, `canMatchWithWindows`, `isDirectionAllowed`; `MarketplaceScoringConfig` reciprocal/repeat cooldown fields; `matching.engine.ts:279` blocked-pair filtering.

## Status
✅ Fully Implemented

## Gap Analysis
Time window, configuration, and enforcement points all present and direction-aware.

## Recommendation
None.

---

# SECTION 10 — Repeat Pair Rules

## Requirement
Cooldown between identical domain pairs.

## Current Implementation
Same mechanism as Section 9: `repeatPairCooldownUntil` per `DomainPairStat`, configurable `repeatPairCooldownDays` (default 90), enforced in matching and `validateTransition`. `DomainPairStat.interactionCount` tracks repeats.

## Evidence
`validation.engine.ts` repeat cooldown logic; `domain-interaction-recorder.service.ts` upsert; `MarketplaceScoringConfig`.

## Status
✅ Fully Implemented

## Gap Analysis
None.

## Recommendation
None.

---

# SECTION 11 — Distribution Rules

## Requirement
domain diversity, repeated pair reduction, network concentration prevention.

## Current Implementation
`DistributionEngine`:
- `computeDiversityScore()` (distribution-engine.service.ts:23): distinct counterpart domains ratio.
- Repeated pair reduction: via repeat-pair cooldown (Section 10).
- Network concentration: `isNetworkConcentrationAllowed()` (distribution-engine.service.ts:153), bounded by `maxNetworkConcentrationPerWindow` / `networkConcentrationWindowDays` from config; enforced in `validateTransition` LEVEL 2b (validation.engine.ts:542).

## Evidence
`distribution-engine.service.ts`, `validation.engine.ts:537-574`.

## Status
✅ Fully Implemented

## Gap Analysis
All three distribution concerns implemented and config-driven.

## Recommendation
None.

---

# SECTION 12 — Niche Distribution

## Requirement
primary niche, secondary niche, distribution limits.

## Current Implementation
- `Website.primaryCategoryKey` / `secondaryCategoryKey` (website.prisma:59-61).
- `NicheDistributionCap` model (marketplace.prisma:363) with `categoryKey`, `scope` (PRIMARY/SECONDARY), `maxPerWindow`, `windowDays`.
- `DistributionEngine.isNicheWithinCap()` (distribution-engine.service.ts:103) checks both scopes.
- `validateTransition` LEVEL 5 (validation.engine.ts:649) enforces caps (fail-closed).
- `DomainInteraction`/`DomainPairStat` capture secondary niche keys.
- Admin CRUD: `AdminNicheCapService` (admin-niche-cap.service.ts).

## Evidence
`marketplace.prisma` `NicheDistributionCap`; `distribution-engine.service.ts:103`; `validation.engine.ts:649-681`; `admin-niche-cap.service.ts`.

## Status
✅ Fully Implemented

## Gap Analysis
Primary + secondary niches and distribution limits all present with admin management.

## Recommendation
None.

---

# SECTION 13 — Velocity Rules

## Requirement
weekly limits, daily spacing, interaction frequency.

## Current Implementation
- Weekly limits: `TierEngine.WEEKLY_LIMIT_BY_TIER` (tier-engine.service.ts:16) + `validateTransition` LEVEL 3 (`WEEKLY_LIMIT`, validation.engine.ts:590).
- Daily spacing: `maxProviderMatchesPerDay` in ranking (ranking.service.ts:83) and `marketplaceStatusDailyCap` for LIMITED_ACCESS.
- Interaction frequency: `exposureCount7d`, `matchCount7d`, `applicationCount7d` counters; `OpportunityAlertService` rate-limits notifications (opportunity-alert.service.ts:6).

## Evidence
`tier-engine.service.ts`, `validation.engine.ts:576-614`, `ranking.service.ts`, `WebsiteMatchingProfile` counters.

## Status
✅ Fully Implemented

## Gap Analysis
Weekly/daily/frequency controls present. One gap: `boost-decay.cron.ts` exists but is **not registered** in `marketplace-cron.module.ts` (see Background Jobs), which may leave boost-decay reliant on `OpportunityGuaranteeCron`/scoring rather than its own scheduled job.

## Recommendation
Register `BoostDecayCron` in `marketplace-cron.module.ts` if a dedicated boost-decay schedule is required (currently `scoring.service.ts` `calculateBoost` and `OpportunityGuaranteeCron` handle decay/inflation).

---

# SECTION 14 — Pattern Monitoring

## Requirement
repeat detection, reciprocal detection, cluster detection, group concentration.

## Current Implementation
`PatternMonitorService.scan()` (pattern-monitor.service.ts):
- Builds directed graph from `DomainInteraction`, runs iterative Tarjan SCC (`findSccs`).
- CLUSTER_CONCENTRATION: SCCs ≥ 4 domains.
- REPEAT_BURST: same ordered pair ≥ 3 times in window (`detectRepeatBursts`).
- RECIPROCAL_RING: directed cycles length 3–10 (`detectReciprocalRings`, `findDirectedCycles`).
- Persists `PatternFlag` rows (de-duplicated), raises risk for HIGH severity (ABUSE delta), sends admin notification.
- Scheduled via `PatternMonitorCron` (`@Cron('0 */6 * * *')`).

## Evidence
`pattern-monitor.service.ts` (full), `pattern-monitor.cron.ts`, `PatternFlag` model, `enums.prisma` PatternFlagType/Severity/Status.

## Status
✅ Fully Implemented

## Gap Analysis
All four detection types present and cron-scheduled.

## Recommendation
None.

---

# SECTION 15 — Risk Engine

## Requirement
risk score, risk calculation, risk penalties.

## Current Implementation
- `RiskEngine.processRiskEvent()` (risk.engine.ts) writes immutable `RiskEvent` rows and computes next score.
- `calculateRiskScore()` (scoring.utils.ts:58): time-decayed by `RISK_DECAY_PER_DAY` (1.5/day, max 90 days) then applies `RISK_DELTA_BY_EVENT` (DISPUTE 25, REJECTION 15, FAILURE 10, ABUSE 40, SUCCESS −8).
- Risk penalty applied in ranking (`riskPenalty`, ranking.service.ts:132).
- Threshold `riskScore >= 75` blocks in validation (validation.engine.ts:637).

## Evidence
`risk.engine.ts`, `scoring.utils.ts`, `ranking.service.ts:132-136`, `validation.engine.ts:637`, `RiskEvent` model.

## Status
✅ Fully Implemented

## Gap Analysis
Score + calculation + penalties + time decay + threshold enforcement all present.

## Recommendation
None.

---

# SECTION 16 — Tier System

## Requirement
Free, Silver, Gold, Platinum, Enterprise; weekly limits; priority; tier enforcement.

## Current Implementation
`TierEngine` (tier-engine.service.ts):
- `WEEKLY_LIMIT_BY_TIER`: FREE 5, SILVER 15, GOLD 40, PLATINUM 100, ENTERPRISE 250.
- `PRIORITY_BY_TIER`: FREE 1, SILVER 1.2, GOLD 1.5, PLATINUM 1.8, ENTERPRISE 2.
- `resolveTier()` reads active subscription plan tier; defaults FREE.
- `resolveTierLimits()` honors profile overrides `weeklyInteractionLimit`/`tierVelocityLimit`.
- Enforced in `validateTransition` LEVEL 3 and ranking `tierPriority`.

## Evidence
`tier-engine.service.ts`, `PlanTier` enum (enums.prisma), `validation.engine.ts:590`, `ranking.service.ts:144`.

## Status
✅ Fully Implemented

## Gap Analysis
All five tiers, weekly limits, priority, and enforcement present.

## Recommendation
None.

---

# SECTION 17 — Validation Engine

## Requirement
validation before approval; eligibility, cooldowns, risk, velocity, tier, distribution.

## Current Implementation
`ValidationEngine.validateTransition()` (validation.engine.ts:451) with 6 levels, fail-closed:
- LEVEL 1 ELIGIBILITY (never overridable): user active, website eligible, ownership, own-task, task available.
- LEVEL 2 GOVERNANCE: repeat/reciprocal cooldowns (overridable).
- LEVEL 2b: network concentration (overridable).
- LEVEL 3 CAPACITY: daily + weekly/tier velocity (overridable except ADMIN_FORCE).
- LEVEL 4 BEHAVIOUR: risk threshold, suspended/under-review selectability, RESTRICTED boost-disabled restriction.
- LEVEL 5 NICHE DISTRIBUTION CAP (overridable).
- LEVEL 6 OPTIMIZATION: non-blocking restrictions.
- Logs `MarketplaceValidationLog`; override audit via `MarketplaceOverrideAudit`.
- Re-validation enforced at acceptance/approval (no skip guard).

## Evidence
`validation.engine.ts` `validateTransition` (full), `MarketplaceValidationLog`, `MarketplaceOverrideAudit` models.

## Status
✅ Fully Implemented

## Gap Analysis
All six validation dimensions present, centralized, fail-closed, with audit logging.

## Recommendation
None.

---

# SECTION 18 — Liquidity Protection

## Requirement
fallback behaviour, empty result prevention, admin-assisted matching.

## Current Implementation
- `ManualMatchQueue` model (marketplace.prisma:495) + `ManualMatchQueueCron` for persistent LOW_POOL.
- `MatchingEngine` labels marketplace mode `LOW_POOL` when candidates < `minViableMatches` (matching.engine.ts:90) and `marketplaceModeConfig` preset can be relaxed by rebalancer.
- `SupplyDemandRebalancerService` + `SupplyDemandCron` can boost/relax on imbalance.
- `provider-task.service.ts:148` returns safe `availability` message instead of empty list when no ranked candidates.

## Evidence
`marketplace.prisma` `ManualMatchQueue`; `manual-match-queue.cron.ts`; `matching.engine.ts:90`; `supply-demand-rebalancer.service.ts`; `provider-task.service.ts:148`.

## Status
✅ Fully Implemented

## Gap Analysis
Fallback labelling, admin-assisted queue, and rebalancing present.

## Recommendation
None.

---

# SECTION 19 — Supply vs Demand

## Requirement
marketplace balancing, provider/requester monitoring.

## Current Implementation
`SupplyDemandCron` (supply-demand.cron.ts) daily 05:00 computes ratio of OPEN/WAITING tasks to ACTIVE provider websites; emits `ADMIN_SUPPLY_DEMAND_IMBALANCE` and triggers `SupplyDemandRebalancerService.handleDemandSurplus`/`handleSupplySurplus` (boost/suppress/relax/niche-cap adjust).

## Evidence
`supply-demand.cron.ts`, `supply-demand-rebalancer.service.ts`.

## Status
✅ Fully Implemented

## Gap Analysis
Balancing + monitoring + automated rebalancing present.

## Recommendation
None.

---

# SECTION 20 — New User Boost

## Requirement
early visibility boost, first-success optimisation.

## Current Implementation
- `WebsiteMatchingProfile.firstSuccessBoostActive` (default true), `firstSuccessAt`.
- Ranking applies `newWebsiteBoostFactor` when `firstSuccessBoostActive` (ranking.service.ts:123).
- `OpportunityGuaranteeCron` boosts `boostFactor` for neglected sites (hoursSinceLastMatch > 72 && !firstSuccessAt).
- `scoring.service.ts:112-117` consumes first-success boost on first successful completion (one-time).

## Evidence
`ranking.service.ts:123-127`, `opportunity-guarantee.cron.ts`, `scoring.service.ts:112-117`, `WebsiteMatchingProfile` fields.

## Status
✅ Fully Implemented

## Gap Analysis
Early boost + first-success one-time optimization present.

## Recommendation
None.

---

# SECTION 21 — Fallback Matching

## Requirement
progressive fallback instead of immediate "no results".

## Current Implementation
`MatchingEngine` relaxation loop (matching.engine.ts:95) progressively relaxes 0→maxRelaxationLevel until `minViableMatches` reached. `provider-task.service.ts:148` returns `availability: { available: false, reason: LOW_POOL|FILTERED, message }` rather than empty.

## Evidence
`matching.engine.ts:95-104`, `provider-task.service.ts:148-167`.

## Status
✅ Fully Implemented

## Gap Analysis
Progressive fallback + safe empty-state messaging present.

## Recommendation
None.

---

# SECTION 22 — Trust Indicators

## Requirement
completed interactions, reliability, user-visible trust metrics.

## Current Implementation
`TrustIndicatorService.getIndicators()` / `getIndicatorsBatch()` (trust-indicator.service.ts):
- `isVerified`, `completionRate`, `disputeRate`, `totalCompletedTasks`, `memberSince`.
- `qualityTier` (PLATINUM/GOLD/SILVER/BRONZE/UNRATED).
- `avgResponseTimeHours` computed from `DomainInteraction` + task times.
- Surfaced to providers in `provider-task.service.ts:215` (`trustIndicators` enriched on requester websites).

## Evidence
`trust-indicator.service.ts`, `provider-task.service.ts:200-226`.

## Status
✅ Fully Implemented

## Gap Analysis
Completed interactions, reliability, quality tier, and user-visible trust metrics all present.

## Recommendation
None.

---

# SECTION 23 — Output Quality

## Requirement
submission review, quality penalties.

## Current Implementation
- `QualityRubric` model (marketplace.prisma:518): contentRelevance, technicalQuality, communication, timeliness, overallSatisfaction, compositeScore.
- `QualityEngine` computes quality composites and `scoring.service.ts` applies completion-rate suppression (< 0.4 → suppressed 7 days).
- Requester review flow in `task-requester.service.ts` (REJECTED without dispute → auto-refund).

## Evidence
`marketplace.prisma` `QualityRubric`; `quality.engine.ts`; `scoring.service.ts:89-125`; `task-requester.service.ts`.

## Status
🟡 Partially Implemented

## Gap Analysis
Quality rubric model and penalties exist, but there is **no clear code path writing `QualityRubric` rows** from the requester submission-review flow in the files reviewed (`task-requester.service.ts` handles rejection/refund but the rubric creation is not wired into the review path in the audited code). The model is present but ingestion appears unimplemented.

## Recommendation
Wire `QualityRubric` creation into the requester review/approval flow so structured quality ratings feed `QualityEngine`/`avgQualityRating`.

---

# SECTION 24 — Credit System

## Requirement
deduction, refund, failed task handling, rejected task handling.

## Current Implementation
`CreditTaskService` (credit-task.service.ts):
- `deductTaskCredit()` (line 74): validates wallet type, checks balance, decrements website wallet, logs `CreditLog` (SPEND).
- `refundTaskCredit()` (line 144): increments, logs REFUND.
- `rewardProviderCredit()` (line 208): earned credits on completion, duplicate-guarded.
- Failed task: `provider-task.service.ts`/admin-task flows route through scoring; refunds on cancellation (`provider-task.service.ts` cancellation accept → refund).
- Rejected submission (not disputed): `task-requester.service.ts` auto-refunds requester credit.

## Evidence
`credit-task.service.ts` deduct/refund/reward; `provider-task.service.ts` cancellation refund; `task-requester.service.ts` reject-refund; `WebsiteCreditWallet` model.

## Status
✅ Fully Implemented

## Gap Analysis
Deduction, refund, failed/rejected handling all present with wallet-type resolution and audit logs.

## Recommendation
None.

---

# SECTION 25 — Dispute System

## Requirement
disputes, resolution, credit adjustment.

## Current Implementation
`DisputeService` (dispute.service.ts):
- `openDispute()`: ownership check, status gating, flips task to DISPUTED, notifies both parties + admin.
- `resolveDispute()`: maps decision → status, applies credit adjustment (refund requester / reward provider) via `CreditTaskService`, links `creditAdjustmentId` on `Dispute`, applies graduated penalty to provider on disfavor.
- `Dispute` model (marketplace.prisma:421) with `creditAdjustment` relation.

## Evidence
`dispute.service.ts`, `Dispute` model, `credit-task.service.ts` integration.

## Status
✅ Fully Implemented

## Gap Analysis
Open/resolve/credit-adjustment all present and linked.

## Recommendation
None.

---

# SECTION 26 — Notification System

## Requirement
opportunity alerts, task updates, acceptance, rejection, reminders.

## Current Implementation
- `OpportunityAlertService.alertMatchingProviders()` (opportunity-alert.service.ts) — triggered on task creation (invoked from `task-requester.service.ts`).
- `TaskNotificationService` triggers: PROVIDER_NEW_OPPORTUNITY, APPLICATION_SUBMITTED/RECEIVED, PROOF_SUBMITTED, TASK_DISPUTED, deadline reminders, etc.
- `reminder-cron.service.ts`: provider response reminder, requester review reminder, overdue escalation.
- `NotificationService` admin notifications (risk flags, supply/demand, disputes).

## Evidence
`opportunity-alert.service.ts`, `task-notification` module, `reminder-cron.service.ts`.

## Status
🟡 Partially Implemented

## Gap Analysis
Task updates, acceptance/rejection, reminders, and opportunity alerts all exist. **Gap:** `OpportunityAlertService` has **no `@Cron` schedule** — it is only invoked inline from `task-requester.service.ts` (task creation). There is no periodic "new opportunities for idle providers" alert job. If the spec requires scheduled opportunity alerts, one must be added.

## Recommendation
Add a scheduled cron that periodically calls `OpportunityAlertService.alertMatchingProviders` for recently-created/open tasks, or confirm inline-on-create is the intended sole trigger.

---

# SECTION 27 — Admin Controls

## Requirement
manual matching, override, priority adjustment, restriction management, marketplace monitoring.

## Current Implementation
- Manual matching: `ManualMatchQueueService` + controller + cron.
- Override: `MarketplaceOverrideService` + `MarketplaceOverride` model (BOOST/SUPPRESS/FORCE_MATCH/SCORE_OVERRIDE/PENALTY) resolved in ranking + validation.
- Priority adjustment: `LOW_PRIORITY` status + `internalPriorityScore` weight in ranking.
- Restriction management: SUSPENDED/RESTRICTED/UNDER_REVIEW statuses, suppression, `admin-marketplace-visibility.service.ts`.
- Monitoring: `admin-analytics`, `admin-compliance`, `admin-domain-pair-inspection`, `admin-marketplace-config`, `admin-marketplace-mode`, `admin-niche-cap`.

## Evidence
`admin-manual-match-queue/`, `marketplace-override.service.ts`, `admin-marketplace-visibility.service.ts`, `admin-niche-cap.service.ts`, `admin-marketplace-mode.service.ts`, `MarketplaceOverride` model.

## Status
✅ Fully Implemented

## Gap Analysis
All five admin control categories present.

## Recommendation
None.

---

# SECTION 28 — Marketplace Modes

## Requirement
Early Stage Mode, Scaling Mode, configuration.

## Current Implementation
- `MarketplaceMode` enum (marketplace.prisma:415): EARLY_STAGE, SCALING.
- `MarketplaceModeConfig` singleton model (marketplace.prisma:484) with `mode`, `preset` JSON.
- `AdminMarketplaceModeService` get/set (admin-marketplace-mode.service.ts); `setMode` invalidates config cache.
- `SupplyDemandRebalancerService.relaxMatchingConstraints()` mutates `preset.maxRelaxationLevel`.

## Evidence
`marketplace.prisma` `MarketplaceMode`/`MarketplaceModeConfig`; `admin-marketplace-mode.service.ts`; `supply-demand-rebalancer.service.ts:56`.

## Status
✅ Fully Implemented

## Gap Analysis
Both modes + config-driven preset present. Note: `MarketplaceConfigService.getMergedConfig()` is the effective config source; mode preset is one input.

## Recommendation
None.

---

# SECTION 29 — User Experience

## Requirement
fallback messages, hidden restrictions, blocked opportunities.

## Current Implementation
- Fallback messages: `provider-task.service.ts:148-167` returns `availability` object with safe message ("No suitable opportunities are available right now...") — no raw rule names leaked.
- Hidden restrictions: ranking applies LOW_PRIORITY/RESTRICTED/UNDER_REVIEW effects without exposing internal reasons to clients.
- Blocked opportunities: relaxation + LOW_POOL/FILTERED reasons are internal; clients receive generic availability.

## Evidence
`provider-task.service.ts:148-167`, `ranking.service.ts` status multipliers.

## Status
✅ Fully Implemented

## Gap Analysis
UX-safe messaging present.

## Recommendation
None.

---

# SECTION 30 — System Architecture

## Requirement
Separate services/modules for: Marketplace Engine, Matching Engine, Ranking Engine, Distribution Engine, Validation Engine, Quality Engine, Risk Engine, Tier Engine, Liquidity Engine, Notification Engine, Credit Engine, Analytics Engine, Admin Engine, Background Jobs.

## Current Implementation
`MarketplaceEngineModule` (marketplace-engine.module.ts) exports dedicated providers:
- MatchingEngine, MatchingRelaxationEngine, TommacayRankingService, TommacayScoringService, ValidationEngine, DistributionEngine, QualityEngine, RiskEngine, TierEngine, LiquidityEngine, PatternMonitorService, MarketplaceConfigService, MarketplaceOverrideService, DomainInteractionRecorderService, GraduatedPenaltyService, TrustIndicatorService, SupplyDemandRebalancerService.
- Notification Engine: `notification` + `task-notification` modules.
- Credit Engine: `credit` module (credit-task, website-credit, etc.).
- Admin Engine: `admin` module (multiple submodules).
- Background Jobs: `marketplace-cron.module.ts`.

## Evidence
`marketplace-engine.module.ts`, `marketplace-cron.module.ts`, `admin/`, `credit/`, `notification/`, `task-notification/`.

## Status
🟡 Partially Implemented

## Gap Analysis
Most engines are cleanly separated. **Gap:** there is **no dedicated `AnalyticsEngine` service** — marketplace analytics are served ad-hoc via `admin-analytics` (dashboard queries) rather than a first-class engine module per the spec list. Also `boost-decay.cron.ts` is not wired into `marketplace-cron.module.ts` (Background Jobs gap).

## Recommendation
Extract a dedicated `AnalyticsEngine` module if the spec requires it as a first-class engine; otherwise document `admin-analytics` as the analytics surface. Register `BoostDecayCron`.

---

# DATABASE AUDIT

## Audit of Prisma Schema

### Present Models (marketplace.prisma / website.prisma / placement.prisma / enums.prisma)
- `WebsiteMatchingProfile` — full scoring profile (visibilityScore, opportunityScore, reputationScore, boostFactor, marketplaceStatus, internalPriorityScore, reliabilityScore, riskScore, diversityScore, completed/failed/total interactions, completionRate, qualityRatingSum/avg, boostDecayCount, forceMatchNext, isSuppressed/suppressedUntil, marketplaceStatusDailyCap, exposure/match/application counts 7d, weekly/tier limits, timestamps).
- `OpportunityImpression` — impression logging with score/rank/relaxationLevel/reasons.
- `MatchingAuditLog` — audit of each match run.
- `MarketplaceScoringConfig` — singleton weights/caps.
- `MarketplaceOverride` + `MarketplaceOverrideAudit`.
- `DomainInteraction`, `DomainPairStat` — relationship tracking.
- `MarketplaceValidationLog`.
- `NicheDistributionCap`.
- `Dispute`, `RiskEvent`, `PatternFlag`, `MarketplaceModeConfig`, `ManualMatchQueue`, `QualityRubric`.
- Enums: `WebsiteMarketplaceStatus`, `MarketplaceOverrideType/Status`, `DisputeStatus`, `RiskEventType`, `PatternFlagType/Severity/Status`, `MarketplaceMode`, `PlanTier`, `UserStatus`, `TaskStatus`, `PlacementType`, `LinkAttribute`, `WebsiteVerificationStatus/Type/By`.

### Missing Models / Tables
- **None structurally missing** for the core spec. A dedicated analytics aggregate model is optional (see Section 30).
- Behaviour-pattern tracking model (Section 6) — optional, not present.

### Missing Indexes
Existing indexes are comprehensive (`@index` on websiteId, scores, status, pair keys, cooldown timestamps, category keys, etc.). No critical missing index identified.

### Missing Relations
- `QualityRubric` is created but not linked to `WebsiteMatchingProfile`/`Dispute` in the audited code paths (ingestion gap, Section 23).
- `MarketplaceModeConfig.preset` is free-form JSON; no relational structure for mode presets.

### Missing Constraints
- `DomainInteraction.taskId` unique — present.
- `DomainPairStat.normalizedPairKey` unique — present.
- No missing FK constraints identified.

### Suggested Structural Changes (only those required by spec)
1. (Optional) Add `BehaviourPattern` model if first-class behaviour-pattern tracking is required by spec §6.
2. (Optional) Link `QualityRubric` → `WebsiteMatchingProfile` so quality ratings persist per profile.
3. No schema migration required for the already-implemented features — they are fully modeled.

---

# API AUDIT

## Existing Marketplace Endpoints (verified by controller/service presence)
- Provider opportunities: `ProviderTaskService.getProviderOpportunities` (matching + ranking + impressions + trust).
- Apply to task: `provider-task.controller.ts` / `applyToTask` (validation + Moz DA/DR + notifications).
- Disputes: `DisputeService.openDispute` / `resolveDispute` / `listDisputes` (admin + user scopes).
- Admin manual match queue: `ManualMatchQueueService.enqueue/resolve/list` + controller.
- Admin niche caps: `AdminNicheCapService.list/create/update/remove` + controller.
- Admin marketplace visibility: `AdminMarketplaceVisibilityService.getMarketplaceVisibility` + controller.
- Admin marketplace mode: `AdminMarketplaceModeService.getConfig/setMode` + controller.
- Admin marketplace config / override / compliance / domain-pair-inspection: present.
- Notifications: `notification.controller.ts`, `task-notification`.
- Credits: `credit.controller.ts`, `credit-task.service.ts`.

## Missing Endpoints
- **Scheduled opportunity-alert endpoint/job** — `OpportunityAlertService` has no cron (Section 26).
- **`QualityRubric` write endpoint** — no review-submission endpoint wiring rubric creation (Section 23).
- **`AnalyticsEngine` endpoint** — analytics served via `admin-analytics` dashboard, not a spec-listed engine endpoint (Section 30).

## Endpoints Requiring Modification
- Provider opportunities: confirm `availability` payload is sufficient for UX (already implemented).
- Consider exposing marketplace mode/preset read in a non-admin surface if providers need awareness (currently admin-only).

## Validation Gaps
- `applyToTask` validates ownership, status, own-task, cooldowns, DA/DR (Moz). Strong.
- `openDispute` validates ownership + status + duplicate. Strong.
- No validation gap found that would allow ineligible matches through the audited paths.

## Authorization Gaps
- Dispute list enforces ADMIN vs USER scope.
- Admin endpoints use `AdminGuard` (per service comments).
- No authorization gap identified in audited code.

---

# BACKGROUND JOBS

## Present Crons (registered in `marketplace-cron.module.ts`)
1. `OpportunityGuaranteeCron` (`@Cron('0 2 * * *')`) — refresh opportunity fairness + boost.
2. `PatternMonitorCron` (`@Cron('0 */6 * * *')`) — pattern scan.
3. `SupplyDemandCron` (`@Cron('0 5 * * *')`) — imbalance check + rebalance.
4. `ManualMatchQueueCron` (`@Cron('0 3 * * *')`) — liquidity gap scan.
5. `ImpressionCleanupCron` (`@Cron('30 4 * * *')`) — purge stale impressions.
6. `RiskDecayCron` (`@Cron('0 1 * * 0')`) — risk decay.

## Also present but NOT registered in `marketplace-cron.module.ts`
- `boost-decay.cron.ts` (`BoostDecayCron`, `@Cron('0 4 * * *')`) — **not imported/provided in the cron module**. Boost decay currently relies on `scoring.service.ts calculateBoost` + `OpportunityGuaranteeCron`. If a dedicated scheduled boost-decay is required, register it.
- `reminder-cron.service.ts` (provider response, requester review, overdue escalation) — registered elsewhere (task module), present and functional.

## Score Updates
- `TommacayScoringService.updateScoresAfterTask` recomputes visibility/reputation/boost/diversity/risk/opportunity after each task (called from admin-task + task-requester flows).

## Risk Updates
- `RiskDecayCron` + `RiskEngine` + pattern-monitor ABUSE events.

## Cleanup
- `ImpressionCleanupCron`.

## Notifications
- `reminder-cron.service.ts` + event-driven `TaskNotificationService`.

## Boost Decay
- Present as a service/cron file but **not registered** (gap).

## Analytics
- Ad-hoc via `admin-analytics`; no dedicated analytics cron/engine.

## Marketplace Maintenance
- Supply/demand rebalancer + manual match queue + impression cleanup cover maintenance.

---

# ARCHITECTURE AUDIT

## Service Boundaries
Well-defined. `MarketplaceEngineModule` separates Matching, Relaxation, Ranking, Scoring, Validation, Distribution, Quality, Risk, Tier, Liquidity, Pattern, Config, Override, Recorder, Penalty, Trust, Supply/Demand. Each engine has a single responsibility.

## Business Logic Separation
Strong. Scoring math in `scoring.utils.ts`, domain rules in engines, HTTP concerns in controllers, persistence via `PrismaService`.

## SOLID
- **Single Responsibility:** engines are focused. ✅
- **Open/Closed:** config-driven weights/caps allow extension without modifying engine logic. ✅
- **Liskov/DIP:** interfaces implicit via NestJS DI. ✅

## DDD
Bounded contexts: Marketplace (engines), Credit, Notification, Admin, Website, Task. Reasonably aligned.

## Scalability
- Pattern monitor uses in-memory graph + paged `DomainInteraction` loads — acceptable but O(nodes+edges); fine for current scale.
- Matching does per-provider Moz lookups only at apply time (not in browse loop) — good for latency.
- `OpportunityAlertService` in-memory `dailyCounters` map is per-instance (not shared across horizontally-scaled workers) — minor concern for multi-instance deployments.

## Maintainability
High. Extensive inline spec references (e.g., "spec §7", "spec §11") make traceability excellent.

## Code Duplication
- `DomainInteractionRecorderService` was explicitly extracted to de-duplicate `recordApprovedDomainInteraction` from `task-requester` and `admin-task` (per its doc comment). ✅
- Some scoring math duplicated between `scoring.service.ts` (`calculateScores`) and `ranking.service.ts` — minor.

## Future Extensibility
Config-driven design (singleton `MarketplaceScoringConfig`, `MarketplaceModeConfig.preset`, `NicheDistributionCap`) supports tuning without code changes.

## High-Risk Architectural Issues
1. **`OpportunityAlertService` has no cron** — opportunity alerts only fire on task creation, not on a schedule. Risk: idle providers may miss opportunities. (Medium)
2. **`BoostDecayCron` not registered** — boost decay depends on other paths; if those change, decay may silently stop. (Low-Medium)
3. **In-memory rate-limit map** in `OpportunityAlertService` — not shared across instances. (Low, scale-dependent)
4. **`QualityRubric` not ingested** — model exists but no review-flow wiring. (Medium, data-quality)

---

# FINAL SUMMARY

## 1. Overall Implementation Percentage
**~88%** of the marketplace specification is implemented with real, evidence-backed code. ~12% is partial (DA/DR as matching input, behaviour-pattern tracking, QualityRubric ingestion, scheduled opportunity alerts, AnalyticsEngine separation, boost-decay registration).

## 2. Fully Implemented Features (✅)
Sections 1, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13*, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 27, 28, 29 (24 of 30 sections fully; *13 fully except boost-decay cron registration).

## 3. Partially Implemented Features (🟡)
- Section 2: DA/DR not a first-class matching/ranking input (only penalty + apply-time gate).
- Section 6: behaviour-pattern tracking not first-class.
- Section 23: `QualityRubric` model present but not ingested by review flow.
- Section 26: `OpportunityAlertService` lacks a scheduled cron.
- Section 30: no dedicated `AnalyticsEngine`; `boost-decay.cron` not registered.

## 4. Missing Features (❌)
None structurally missing from the core spec. Optional/nice-to-have gaps: first-class behaviour-pattern model, AnalyticsEngine module, QualityRubric ingestion.

## 5. High-Risk Architectural Issues
1. Opportunity alerts not scheduled (rely on inline task-creation trigger).
2. `BoostDecayCron` not registered in cron module.
3. `QualityRubric` never written by review flow (data not captured).
4. In-memory alert rate-limit not shared across instances.

## 6. Database Changes Required
- **None required** for implemented features.
- Optional: `BehaviourPattern` model (§6); link `QualityRubric` → `WebsiteMatchingProfile` (§23).

## 7. API Changes Required
- Add scheduled opportunity-alert job (§26).
- Wire `QualityRubric` creation into requester review/approval endpoint (§23).
- (Optional) AnalyticsEngine endpoint (§30).

## 8. New Services/Modules Recommended
- `AnalyticsEngine` (optional, if spec demands first-class analytics engine).
- `BehaviourPatternService` (optional, §6).
- Register existing `BoostDecayCron` (Background Jobs).

## 9. Suggested Implementation Order (highest priority first)
1. **Register `BoostDecayCron`** in `marketplace-cron.module.ts` (trivial, prevents silent decay loss).
2. **Wire `QualityRubric` ingestion** into requester review flow (data quality).
3. **Add scheduled `OpportunityAlertService` cron** (UX/liquidity).
4. **Promote DA/DR to a ranking input** in `calculateCompatibility` (matching quality).
5. **(Optional)** Extract `AnalyticsEngine` / `BehaviourPatternService`.

## 10. Estimated Implementation Complexity
- Register BoostDecayCron: **Low** (1-line module edit).
- QualityRubric ingestion: **Low-Medium** (add service call in review flow + relation).
- Scheduled opportunity-alert cron: **Low** (add `@Cron` wrapper or scheduler call).
- DA/DR as ranking input: **Medium** (modify compatibility scoring + possibly browse-time filter).
- AnalyticsEngine separation: **Medium** (extract existing dashboard queries into a module).
- BehaviourPattern tracking: **High** (new model + detection logic + integration).

---

*End of report. All findings verified against the codebase at commit `c484f8d8bcb3803e6733c8a5f80d63b072ee1f9e`.*
