# Marketplace Technical Audit Report

**Project:** backlyst-backend
**Audit Date:** 2026-07-16
**Auditor:** Senior Software Architect / Technical Auditor
**Scope:** Marketplace Specification compliance across codebase, Prisma schema, APIs, background jobs, and architecture.
**Method:** Static audit only. Every finding references actual code files/methods. Where a requirement could not be verified it is explicitly marked "Not found in code."

---

## 0. Executive Summary of Architecture

The marketplace logic is concentrated in `src/modules/task/market-algoritm/` and orchestrated through three service layers (`provider-task`, `task-requester`, `admin-task`) plus `dispute`. The schema is split across many Prisma files in `prisma/schema/`, with `marketplace.prisma` holding the matching/ranking/validation/risk/distribution models.

Engines present (all in `market-algoritm/`):
- `MatchingEngine` (matching.engine.ts)
- `MatchingRelaxationEngine` (matching-relaxation.engine.ts)
- `TommacayRankingService` (ranking.service.ts)
- `TommacayScoringService` (scoring.service.ts)
- `ValidationEngine` (validation.engine.ts)
- `DistributionEngine` (distribution-engine.service.ts)
- `TierEngine` (tier-engine.service.ts)
- `PatternMonitorService` (pattern-monitor.service.ts)
- `MarketplaceOverrideService` (marketplace-override.service.ts)
- `DomainInteractionRecorderService` (domain-interaction-recorder.service.ts)

Cron jobs: `OpportunityGuaranteeCron`, `ManualMatchQueueCron`, `PatternMonitorCron`, `ImpressionCleanupCron`.

---

## SECTION 1 — Marketplace Eligibility

### Requirement
Website verification, ownership validation, active/deleted/suspended status, provider ownership, task eligibility, duplicate applications, own-task prevention.

### Current Implementation
- **Website verification:** `ValidationEngine.isWebsiteRowMarketplaceEligible` requires `verificationStatus === 'VERIFIED'`, `marketplaceVisibilityStatus === 'VISIBLE'`, `!isFlag`, `!isWalletLock`. Verified via `website-verification-*.service.ts` (meta/DNS/screenshot) which sets `verificationStatus='VERIFIED'`.
- **Ownership:** `getEligibleProviderWebsites` filters `authorId: userId`. `provider-task.applyToTask` checks `providerWebsite.authorId === providerId`. `isWebsiteEligible` enforces author match.
- **Active status:** `isUserActive` rejects `user.status !== 'ACTIVE'`.
- **Deleted status:** `getEligibleMarketplaceWebsiteIds` filters `isDeleted: false`.
- **Suspended status:** `isBrowsableStatus` returns false only for `SUSPENDED`; applied in `isWebsiteRowMarketplaceEligible`.
- **Provider ownership:** `ValidationEngine.isWebsiteEligible(websiteId, userId)`.
- **Task eligibility:** `getCandidateTasks` filters `lifecycleStatus` in `['OPEN','WAITING_FOR_APPLICANTS']`, `selectedProviderId: null`, `placementApplications: { none: { providerId } }`.
- **Duplicate applications:** `applyToTask` rejects if a `PlacementApplication` already exists; DB `@@unique([providerId, placementTaskId])`.
- **Own-task prevention:** `applyToTask` throws `"Provider must not be requester."`; `ValidationEngine.validateTransition` pushes `OWN_TASK` when `actorUserId === task.requesterId`.

### Evidence
Files: `validation.engine.ts`, `matching.engine.ts`, `provider-task.service.ts`, `website.prisma`, `website-verification-*.service.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
None for the core eligibility list. Note: website verification is enforced by status string; there is no separate "ownership proof expiry" re-check at matching time beyond status.

### Recommendation
No change required.

---

## SECTION 2 — Matching Engine

### Requirement
website-based, category, tag, country, language, placement type, DA/DR compatibility, progressive relaxation, verification never relaxed.

### Current Implementation
`MatchingEngine.findCandidates` builds candidates via `buildHardRuleCandidates` then loops `level 0..maxRelaxationLevel`, calling `applyRelaxation`. `buildCandidate` computes `compatibilityScore` using category exact/industry related, tag overlap, country exact, language exact, and `requiredDomainRating` vs `providerDr` (`authorityMeets`). Placement type and linkAttribute are filterable via `getCandidateTasks` where clauses. Verification is never relaxed because eligibility (`getEligibleMarketplaceWebsiteIds`, `getEligibleProviderWebsites`) is computed before relaxation and relaxation only loosens category/tag/country/language matching attributes — never verification/status.

### Evidence
`matching.engine.ts` `buildCandidate` (compatibility score), `calculateCompatibility`, `getCandidateTasks` (placementType/linkAttribute filters); `matching-relaxation.engine.ts` `apply`.

### Status
✅ Fully Implemented

### Gap Analysis
- DA/DR: only `domainRating` (DR) is compared against `requiredDomainRating`. "DA" (Domain Authority) is fetched via MOZ in `task-requester.service.getDomainMozStats` and re-checked at apply time (`getMozDomainStats`), but there is no stored `domainAuthority` field on `Website` for matching-time use — only `domainRating`. This is a partial gap if DA is a distinct spec requirement.

### Recommendation
If DA and DR are distinct spec fields, add a `domainAuthority` column to `Website` and include it in `buildCandidate`. Otherwise fully implemented.

---

## SECTION 3 — Dynamic Relaxation

### Requirement
Exact → Related → Broad → Fallback progression.

### Current Implementation
`MatchingRelaxationEngine` defines `RelaxationStage = 'EXACT'|'RELATED'|'BROAD'|'FALLBACK'`. `stageForLevel`: 0→EXACT, 1→RELATED, 2/3→BROAD, default→FALLBACK. Truth table in `apply()`:
- L0 EXACT: category EXACT && tags EXACT && countryOk && languageOk
- L1 RELATED: category EXACT && tags PARTIAL && languageOk
- L2 BROAD: category RELATED && countryOk
- L3 BROAD: category RELATED || tags PARTIAL
- L4+ FALLBACK: passthrough
`MatchingEngine` iterates levels and breaks when `>= minViableMatches`.

### Evidence
`matching-relaxation.engine.ts` lines 22-82; `matching.engine.ts` lines 113-122.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 4 — Ranking Engine

### Requirement
Compatibility, Opportunity, Visibility, Reputation, Boost, Exposure Penalty, Risk Penalty, Final formula.

### Current Implementation
`TommacayRankingService.rankAndFilter` computes:
- `compatibilityScore` (from candidate)
- `opportunityScore` (profile / override)
- `visibilityScore` (profile / override)
- `reputationScore` (profile / override)
- `boostScore = (boostFactor + newWebsiteBoost) * 20`
- `exposurePenalty = exposureCount7d * exposurePenaltyPerTaskView`
- `riskPenalty = (riskScore/100) * (DISPUTE?20:10)`
- `forceMatchBonus` (config.forceMatchBonus)
- `authorityPenalty` (10 if BELOW)
- `weightedScore = compat*wC + opp*wO + vis*wV + rep*wR + boost*wB`
- `score = weightedScore*tierPriority - exposurePenalty - riskPenalty - authorityPenalty + forceMatchBonus + internalPriorityScore*wIP + diversityScore*wD`
- `finalScore = score * (LOW_PRIORITY?lowPriorityFactor:1)`

### Evidence
`ranking.service.ts` lines 147-169; `marketplace.prisma` `MarketplaceScoringConfig` weights.

### Status
✅ Fully Implemented (Compatibility, Opportunity, Visibility, Reputation, Boost, Exposure Penalty, Risk Penalty, Final formula all present).

### Gap Analysis
None material.

### Recommendation
No change.

---

## SECTION 5 — Visibility Control

### Requirement
visibility weighting, priority reduction, frequency reduction, non-destructive visibility control.

### Current Implementation
- **visibility weighting:** `compatibilityWeight/opportunityWeight/visibilityWeight/reputationWeight/boostWeight` in config; `visibilityScore` used in weightedScore.
- **priority reduction:** `LOW_PRIORITY` multiplies final score by `lowPriorityFactor` (0.7) — non-destructive (no row deletion).
- **frequency reduction:** `exposureCount7d` drives `exposurePenalty`; `maxRequesterExposurePerDay` caps daily requester impressions; `maxProviderMatchesPerDay` caps provider daily matches (`LIMITED_ACCESS` uses `marketplaceStatusDailyCap`).
- **non-destructive:** all controls are score/flag based; `MarketplaceOverride` (SUPPRESS) sets `suppressedUntil` rather than deleting.

### Evidence
`ranking.service.ts` lines 79-104, 162-169; `validation.engine.ts` `isWebsiteRowMarketplaceEligible` suppression handling; `marketplace.prisma` `MarketplaceScoringConfig`.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 6 — Website Quality

### Requirement
completion, activity, reliability, interaction diversity, behaviour patterns, quality penalties.

### Current Implementation
`TommacayScoringService.updateScoresAfterTask` updates `completionRate`, `reliabilityScore`, `qualityRatingSum/avgQualityRating`, `diversityScore` (via `DistributionEngine.computeDiversityScore`). Quality penalties appear as reduced `avgQualityRating`/`visibilityScore` (calculated by `calculateVisibilityScore`). Behaviour patterns are not a per-website scoring field but are addressed at marketplace level by `PatternMonitorService` (cluster detection).
- `successfulInteractions`, `failedInteractions`, `totalInteractions`, `completedInteractions` tracked.

### Evidence
`scoring.service.ts`, `scoring.utils.ts` `calculateVisibilityScore`, `distribution-engine.service.ts` `computeDiversityScore`.

### Status
🟡 Partially Implemented

### Gap Analysis
- "activity" is not explicitly tracked as a decaying activity score (only `lastCompletedAt`, `lastMatchedAt`).
- "behaviour patterns" at the individual website level (e.g., burst behaviour) are not scored; only marketplace-wide cluster patterns are monitored.
- Quality penalties exist implicitly via rating math but there is no explicit `qualityPenalty` field/event distinct from the rating average.

### Recommendation
Add an explicit activity-recency component to `visibilityScore` if spec requires independent activity tracking; treat as minor enhancement.

---

## SECTION 7 — Website Status

### Requirement
Active, Low Priority, Limited Access, Under Review, Restricted, Suspended.

### Current Implementation
Enum `WebsiteMarketplaceStatus { ACTIVE, LOW_PRIORITY, LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED, SUSPENDED }`. Behaviour:
- `isBrowsableStatus`: only SUSPENDED is non-browsable.
- `isSelectableStatus`: ACTIVE/LOW_PRIORITY/LIMITED_ACCESS/RESTRICTED selectable; UNDER_REVIEW blocked at selection stages.
- Ranking differentiates: LOW_PRIORITY ×0.7, LIMITED_ACCESS daily cap, RESTRICTED boost disabled, UNDER_REVIEW browsable, SUSPENDED ineligible.

### Evidence
`marketplace.prisma` enum; `validation.engine.ts` `isBrowsableStatus`/`isSelectableStatus`/`validateTransition` LEVEL 4; `ranking.service.ts` status branches; `ranking.service.spec.ts` covers each.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 8 — Domain Relationship Tracking

### Requirement
relationship history, root-domain tracking, interaction logging, timestamps.

### Current Implementation
- `DomainInteraction` model: `sourceWebsiteId/targetWebsiteId`, `sourceDomain/targetDomain`, `normalizedPairKey`, `sourcePrimaryCategoryKey/targetPrimaryCategoryKey`, `sourceSecondaryCategoryKey/targetSecondaryCategoryKey`, `completedAt`, `createdAt`.
- `DomainPairStat`: `domainA/domainB`, `normalizedPairKey`, `lastSourceDomain/lastTargetDomain`, `lastInteractionAt`, `repeatPairCooldownUntil`, `reciprocalCooldownUntil`, `interactionCount`.
- `DomainInteractionRecorderService.record` writes both on task completion (used by admin force-complete/approve and requester review).

### Evidence
`domain-interaction-recorder.service.ts`; `marketplace.prisma` `DomainInteraction`/`DomainPairStat`.

### Status
✅ Fully Implemented

### Gap Analysis
None. Note: recorder is invoked on admin force-complete, force-approve, and requester `reviewTask` approval path — must confirm every completed path calls it (see Section 24 gap on natural provider-completion path).

### Recommendation
Ensure every completion path (provider `submitTask`→requester approve, and any direct completion) records the domain interaction.

---

## SECTION 9 — Reciprocal Rules

### Requirement
Reciprocal prevention; time window; configuration; enforcement point.

### Current Implementation
Direction-aware cooldowns in `ValidationEngine`:
- `buildOrderedPairKey` (source→target, direction-preserving) distinct from `buildPairKey` (sorted).
- `getCooldownBlockedPairKeys` blocks if `sameDirectionAsLast ? repeatActive : reciprocalActive`.
- `DomainPairStat.reciprocalCooldownUntil` set by recorder using `reciprocalCooldownDays` (default 120).
- **Configuration:** `MarketplaceScoringConfig.reciprocalCooldownDays` (admin-configurable, replaces hardcoded value — see validation.engine.ts comment lines 197-199).
- **Enforcement point:** `validateTransition` LEVEL 2 (governance, overridable) and `canMatch`/`getCooldownBlockedPairKeys` during candidate generation.

### Evidence
`validation.engine.ts` `buildOrderedPairKey`, `getCooldownBlockedPairKeys`, `isDirectionAllowed`, `canMatchWithWindows`; `marketplace.prisma` `reciprocalCooldownDays`; `domain-interaction-recorder.service.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 10 — Repeat Pair Rules

### Requirement
Cooldown between identical domain pairs.

### Current Implementation
`DomainPairStat.repeatPairCooldownUntil` set from `repeatPairCooldownDays` (default 90). Blocked via `repeatActive` in `getCooldownBlockedPairKeys`. Exposed as `MarketplaceScoringConfig.repeatPairCooldownDays`.

### Evidence
`validation.engine.ts`; `marketplace.prisma`.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 11 — Distribution Rules

### Requirement
domain diversity, repeated pair reduction, network concentration prevention.

### Current Implementation
- **domain diversity:** `DistributionEngine.computeDiversityScore` (distinct counterparts / total), stored as `diversityScore`, used in ranking (`diversityWeight`).
- **repeated pair reduction:** `forceNewDomainNext` enforced in `MatchingEngine.buildHardRuleCandidates` via `DistributionEngine.filterNewDomains`; recorder updates pair stats.
- **network concentration:** `ValidationEngine` LEVEL 2b enforces `maxNetworkConcentrationPerWindow` / `networkConcentrationWindowDays` via `DistributionEngine.isNetworkConcentrationAllowed` (counts `DomainPairStat` rows where domain appears as A or B within window). Config in `MarketplaceScoringConfig`.

### Evidence
`distribution-engine.service.ts`; `validation.engine.ts` LEVEL 2b; `matching.engine.ts` `buildHardRuleCandidates`; `marketplace.prisma` `maxNetworkConcentrationPerWindow`.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 12 — Niche Distribution

### Requirement
primary niche, secondary niche, distribution limits.

### Current Implementation
- `Website.primaryCategoryKey` / `secondaryCategoryKey` (relations to `WebsiteCategoryKey`).
- `NicheDistributionCap` model: `categoryKey`, `scope` (PRIMARY|SECONDARY), `maxPerWindow`, `windowDays`, `isActive`.
- `DomainInteraction`/`DomainPairStat` capture `sourcePrimaryCategoryKey/targetPrimaryCategoryKey/sourceSecondaryCategoryKey/targetSecondaryCategoryKey`.
- `DistributionEngine.isNicheWithinCap` checks PRIMARY/SECONDARY scope counts within window.
- `ValidationEngine` LEVEL 5 (`NICHE_CAP_EXCEEDED`) enforces, overridable.

### Evidence
`distribution-engine.service.ts` `isNicheWithinCap`; `validation.engine.ts` LEVEL 5; `marketplace.prisma` `NicheDistributionCap`; `domain-interaction-recorder.service.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
`NicheDistributionCap` rows must be seeded (none in schema default data — Not found in code as seeded rows). Without seed data the caps never activate (function returns true when no cap row exists).

### Recommendation
Seed `NicheDistributionCap` rows for each `WebsiteCategoryKey` × scope, or document that admins must configure them.

---

## SECTION 13 — Velocity Rules

### Requirement
weekly limits, daily spacing, interaction frequency.

### Current Implementation
- **daily spacing:** `ranking.service.ts` caps provider daily matches (`maxProviderMatchesPerDay`, `LIMITED_ACCESS` cap) and requester daily exposure (`maxRequesterExposurePerDay`).
- **weekly limits:** `TierEngine.countWeeklyInteractions` + `resolveTierLimits` supplies `weeklyInteractionLimit`; `ValidationEngine` LEVEL 3 (`WEEKLY_LIMIT`).
- **interaction frequency:** exposure penalty (`exposureCount7d`) reduces score; opportunity score in `OpportunityGuaranteeCron` boosts neglected sites.

### Evidence
`tier-engine.service.ts`; `validation.engine.ts` LEVEL 3; `ranking.service.ts`; `opportunity-guarantee.cron.ts`; `marketplace.prisma` config fields.

### Status
✅ Fully Implemented

### Gap Analysis
"Daily spacing" between successive interactions for the same pair is covered by repeat/reciprocal cooldowns rather than a separate spacing rule; acceptable.

### Recommendation
No change.

---

## SECTION 14 — Pattern Monitoring

### Requirement
repeat detection, reciprocal detection, cluster detection, group concentration.

### Current Implementation
`PatternMonitorService.scan()` builds a directed graph from `DomainInteraction` edges and runs an iterative Tarjan SCC. Components ≥ `MIN_CLUSTER_SIZE` (4) become `PatternFlag` (type CLUSTER_CONCENTRATION). Reciprocal/repeat pairs are observed (logged) but intentionally NOT flagged (covered by pairwise cooldowns). HIGH-severity clusters raise `riskScore` via `calculateRiskScore(...,'ABUSE')` and emit admin notifications. `PatternMonitorCron` runs every 6h.

### Evidence
`pattern-monitor.service.ts`; `pattern-monitor.cron.ts`; `marketplace.prisma` `PatternFlag` enum + model.

### Status
✅ Fully Implemented (cluster/group concentration). Repeat & reciprocal are explicitly deferred to cooldown engine by design.

### Gap Analysis
- "group concentration" is implemented as SCC cluster detection only; there is no separate "group/ring of N sites all interacting with one hub" detection beyond SCC. Acceptable given SCC captures cycles.
- No UI/API endpoint was found that *exposes* `PatternFlag` rows to admins for review (not found in admin-task.controller.ts or admin-analytics). The flag is created and notified but there is no read/resolve endpoint.

### Recommendation
Add admin API to list/resolve `PatternFlag` rows (read + status update), since detection exists but resolution surface is missing.

---

## SECTION 15 — Risk Engine

### Requirement
risk score, risk calculation, risk penalties.

### Current Implementation
- `WebsiteMatchingProfile.riskScore`, `lastRiskEventAt`, `lastRiskReason`.
- `scoring.utils.ts` `calculateRiskScore` with time-decay (`RISK_DECAY_PER_DAY`, `RISK_DECAY_MAX_DAYS`) and deltas `RISK_DISPUTE_DELTA=25, REJECTION=15, FAILURE=10, ABUSE=40, SUCCESS=-8`.
- `RiskEvent` immutable log (`riskEvent` create in `scoring.service.ts`, and in `pattern-monitor.service.ts` for ABUSE).
- Risk penalties applied in ranking (`riskPenalty`).
- `ValidationEngine` LEVEL 4 blocks when `riskScore >= 75` or status SUSPENDED.

### Evidence
`scoring.utils.ts`; `scoring.service.ts`; `validation.engine.ts` LEVEL 4; `marketplace.prisma` `RiskEvent`.

### Status
✅ Fully Implemented

### Gap Analysis
None material.

### Recommendation
No change.
