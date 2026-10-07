# Marketplace Technical Audit Report

**Project:** backlyst-backend (NestJS + Prisma + BullMQ)
**Audit date:** 2026-07-15
**Auditor role:** Senior Software Architect / Backend Engineer / Marketplace Systems Expert / Technical Auditor
**Method:** Every conclusion is tied to actual source code. Where a requirement could not be verified from code, the report states "Not found in code." A prior document (`docs/marketplace-specification-audit-2026-07-15.md`) is now **STALE** — it reported "Missing Distribution Engine", "Missing Risk Engine", "Missing Dispute model", and a "placeholder MatchingRelaxationEngine." The current codebase has since implemented all of these. This report reflects the **current** state.

---

## Scope & Method

The audit inspected the following artifact groups:

- `src/modules/task/market-algoritm/*` — matching engine, matching-relaxation engine, ranking service, scoring service/utils, validation engine, distribution engine, tier engine, marketplace-override service, domain-interaction-recorder service, opportunity-guarantee cron.
- `src/modules/task/{provider-task,task-requester,admin-task}/*` — task lifecycle services/controllers.
- `src/modules/credit/*` — credit deduction/refund/reward/wallet.
- `src/modules/website/*` — website verification, marketplace visibility status, tags, categories.
- `src/modules/notification/*`, `src/modules/task-notification/*` — notification engines.
- `src/modules/admin/*` — admin controls, overrides, analytics, compliance.
- `prisma/schema/*` — Prisma models, enums, indexes (multi-file schema).

**Runtime-vs-dead determination:** A feature is counted as "Implemented" only when a runtime call site exists (e.g. a service method invoked by a controller or another service). Declared DTOs, enums, schema models, and notification templates with **zero runtime write/read call sites** are reported as **dead code / not wired** (a distinct finding from "missing").

---

## Status Legend

- ✅ Fully Implemented
- 🟡 Partially Implemented
- ❌ Missing
- ⚠ Needs Refactor

---

<!-- SECTION-1 -->

## SECTION 1 — Marketplace Eligibility

### Requirement
Website verification, website ownership validation, active/deleted/suspended status, provider ownership, task eligibility, duplicate applications, own-task prevention.

### Current Implementation
- **Website verification:** `ValidationEngine.isWebsiteRowMarketplaceEligible` (validation.engine.ts:338) requires `verificationStatus === 'VERIFIED'`, `marketplaceVisibilityStatus === 'VISIBLE'`, `isFlag === false`, `isWalletLock === false`. Website verification flows live in `src/modules/website/website-verification/*` (meta-tag, DNS, screenshot). Verification is re-checked at application via `getEligibleProviderWebsites` (validation.engine.ts:146-170).
- **Ownership:** provider-task.service.ts `applyToTask` verifies `authorId === providerId`; task-requester.service.ts `selectProvider` enforces `task.requesterId === requesterId`. JWT strategy blocks non-active users.
- **Active/Deleted:** `isUserActive` (validation.engine.ts:99) checks `user.status === 'ACTIVE'`. `isWebsiteRowMarketplaceEligible` checks `isDeleted === false`.
- **Suspended (account):** The `User` enum has `SUSPENDED` (enums.prisma), but eligibility only accepts `ACTIVE` — `SUSPENDED`/`DELETED` are *implicitly* rejected (not explicitly handled). The marketplace-profile `WebsiteMarketplaceStatus.SUSPENDED` enum value IS checked (validation.engine.ts:359: `marketplaceStatus !== 'ACTIVE'` rejects). So a profile-level SUSPENDED blocks participation; an account-level one does not have an explicit branch.
- **Task eligibility:** `matching.engine.ts` filters open lifecycle statuses (`OPEN`, `WAITING_FOR_APPLICANTS`). `applyToTask` requires `OPEN`/`WAITING_FOR_APPLICANTS`.
- **Duplicate applications:** `provider-task.service.ts` blocks an existing application per provider+task (`placementApplications: { none: { providerId } }` in matching.engine.ts:211, plus explicit guard).
- **Own-task prevention:** `provider-task.service.ts` throws if `task.requesterId === providerId`; `validateTransition` enforces `OWN_TASK` rule at `PROVIDER_APPLICATION` (validation.engine.ts:449-454).

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:99, 338, 359, 449-454`
- `src/modules/task/market-algoritm/matching.engine.ts:204-212`
- `src/modules/task/provider-task/provider-task.service.ts` (applyToTask)
- `src/modules/task/task-requester/task-requester.service.ts` (selectProvider)
- `prisma/schema/enums.prisma` (User status); `prisma/schema/marketplace.prisma:10-17` (WebsiteMarketplaceStatus)

### Status
✅ Fully Implemented

### Gap Analysis
Core eligibility (verification, ownership, active, deleted, task status, duplicate apps, own-task) is fully implemented and re-validated at multiple stages. Account-level `SUSPENDED`/`DELETED` are implicitly handled by the `ACTIVE`-only check; this is acceptable but not explicit. Eligibility is correctly centralized in `ValidationEngine` (no longer duplicated — the old audit's duplication concern was addressed).

### Recommendation
Keep current centralization. Optionally add an explicit `else if (status === 'SUSPENDED')` branch for clearer messaging; no schema change required.

<!-- SECTION-2 -->

## SECTION 2 — Matching Engine

### Requirement
Website-based matching, category matching, tag matching, country, language, placement type, DA/DR compatibility, progressive relaxation, verification never relaxed.

### Current Implementation
- **Website-based matching:** `matching.engine.ts` matches provider websites against requester websites by root domain via `ValidationEngine.normalizeRootDomain`. Same-domain pairing is blocked (`buildHardRuleCandidates` skips `providerWebsite.rootDomain === requesterDomain`).
- **Category matching:** `buildCandidate` (matching.engine.ts:319) computes `categoryExact` from `primaryCategoryKey` equality; `industryRelated` from normalized `industry`.
- **Tag matching:** `countTagOverlap`/`normalizeTags` (matching.engine.ts:453-462) computes tag overlap on `marketplaceTagKeys`.
- **Country/language:** normalized and treated as `UNKNOWN` when task has no requirement (exact-or-unknown rules).
- **Placement type:** `getCandidateTasks` filters `placementType`/`linkAttribute` (matching.engine.ts:214-215).
- **DA/DR compatibility:** `calculateCompatibility` (matching.engine.ts:330-334) checks `requiredDomainRating` vs `providerWebsite.domainRating`; `authorityMeets` flag; `-15` penalty when below. `domainRating` is populated by Moz stats (`moz-domain-stats.util.ts`, `getMozStats` in task-requester).
- **Progressive relaxation:** delegated to `MatchingRelaxationEngine.apply` (matching.engine.ts:384-392), levels 0-4.
- **Verification never relaxed:** candidate provider/requester websites are sourced only from eligibility helpers that require `VERIFIED` + `VISIBLE`. Relaxation never downgrades verification.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:117-382`
- `src/modules/task/market-algoritm/validation.engine.ts:146-170`
- `src/common/utils/moz-domain-stats.util.ts`

### Status
✅ Fully Implemented

### Gap Analysis
All matching criteria are present and correct. DA/DR relies on `domainRating` being populated by an external Moz job; if not run, matching still proceeds (optional field). Placement-type filtering is exact-match only.

### Recommendation
None required for matching. Ensure Moz stats run periodically so DA/DR is meaningful; consider placement-type as a soft preference rather than hard filter.

<!-- SECTION-3 -->

## SECTION 3 — Dynamic Relaxation

### Requirement
Exact match → Related match → Broad match → Fallback progression.

### Current Implementation
`MatchingRelaxationEngine` (matching-relaxation.engine.ts) is now **fully implemented** (not a placeholder). `apply(candidate, level)` maps levels to semantic stages via `stageForLevel`: 0→EXACT, 1→RELATED, 2/3→BROAD, ≥4→FALLBACK. Truth table:
- level 0: category EXACT AND tags EXACT AND countryOk AND languageOk
- level 1: category EXACT AND tags PARTIAL AND languageOk
- level 2: category RELATED AND countryOk
- level 3: category RELATED OR tags PARTIAL
- level ≥4: FALLBACK passthrough (always passes)

`matching.engine.ts:89-98` iterates `level = 0..maxRelaxationLevel` (default 4) and selects the lowest level yielding `>= minViableMatches` (default 10). `Reason` strings (`RELAXATION_EXACT` etc.) are recorded.

### Evidence
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts` (full 83 lines)
- `src/modules/task/market-algoritm/matching.engine.ts:89-98`
- `src/modules/task/market-algoritm/matching-relaxation.engine.spec.ts` (unit tests exist)

### Status
✅ Fully Implemented

### Gap Analysis
The progression is implemented with named semantic stages and unit tests. Thresholds are hardcoded in the engine (not yet config-driven per marketplace mode — see §28).

### Recommendation
Optionally make thresholds configurable via `MarketplaceScoringConfig`/`MarketplaceModeConfig`. Low effort, already partially scaffolded by the engine's stage structure.

<!-- SECTION-4 -->

## SECTION 4 — Ranking Engine

### Requirement
Compatibility Score, Opportunity Score, Visibility Score, Reputation Score, Boost Score, Exposure Penalty, Risk Penalty, Final ranking formula.

### Current Implementation
`TommacayRankingService.rankAndFilter` (ranking.service.ts:15) computes all signals:
- `compatibilityScore` (from matching engine)
- `opportunityScore`, `visibilityScore`, `reputationScore`, `boostScore = boostFactor*20`
- `exposurePenalty = exposureCount7d * exposurePenaltyPerTaskView`
- `riskPenalty = (riskScore/100) * (riskPenaltyDisputeWeight if lastRiskReason==='DISPUTE' else riskPenaltyRejectionWeight)`
- `forceMatchBonus`, `authorityPenalty`
- `tierPriority` from `TierEngine.resolveTierLimits` (multiplies weighted score)
- **Final** = `weightedSum * tierPriority - exposurePenalty - riskPenalty - authorityPenalty + forceMatchBonus`
- Suppressed (`isSuppressed` && within window, OR override-suppressed) and daily-capped (`dailyMatches >= maxProviderMatchesPerDay`) candidates are filtered out.

Weights from `MarketplaceScoringConfig` (default compatibility .35, opportunity .25, visibility .15, reputation .15, boost .10).

### Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:15-143`
- `prisma/schema/marketplace.prisma:147-176` (scoring config)

### Status
✅ Fully Implemented

### Gap Analysis
All eight required signals + final formula present. `internalPriorityScore`, `diversityScore`, `reliabilityScore` exist in schema but are NOT used in the ranking formula (see §5/§6/§11). Ranking is applied only to the provider opportunity listing, not to requester-side provider selection.

### Recommendation
Optionally fold `diversityScore`/`internalPriorityScore` into the formula; wire ranking into requester selection. Low effort.

<!-- SECTION-5 -->

## SECTION 5 — Visibility Control

### Requirement
Visibility weighting, priority reduction, frequency reduction, non-destructive visibility control.

### Current Implementation
- **Visibility weighting:** `visibilityScore` weighted in ranking (ranking.service.ts) and computed by `calculateVisibilityScore` (scoring.utils.ts).
- **Priority reduction:** `MarketplaceOverride` (SUPPRESS/PENALTY) is now **wired** — `MarketplaceOverrideService.resolveForWebsite` is called in `matching.engine.ts:152-162` and `ranking.service.ts:35-49`, and suppression overrides are applied in ranking. `internalPriorityScore` field exists but is **never written/read** in ranking (dead field).
- **Frequency reduction:** `exposureCount7d` capped via exposure penalty; `maxProviderMatchesPerDay` enforced in ranking via `getDailyProviderWebsiteCounts`. `maxRequesterExposurePerDay` config (marketplace.prisma:166) is **never enforced**.
- **Non-destructive:** visibility changes are score/flag updates, not destructive deletes.

### Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:35-70, 88-119`
- `src/modules/task/market-algoritm/marketplace-override.service.ts:116-157`
- `src/modules/task/market-algoritm/matching.engine.ts:152-162`
- `prisma/schema/marketplace.prisma:1-7, 37, 66, 166`

### Status
🟡 Partially Implemented

### Gap Analysis
Visibility weighting + override-based suppression + daily cap are implemented. `maxRequesterExposurePerDay` is unenforced. `internalPriorityScore` is a dead field. No per-requester frequency capping.

### Recommendation
Enforce `maxRequesterExposurePerDay` in matching/ranking; either wire `internalPriorityScore` into ranking or drop it. Medium effort.

<!-- SECTION-6 -->

## SECTION 6 — Website Quality

### Requirement
Track completion, activity, reliability, interaction diversity, behaviour patterns, quality penalties.

### Current Implementation
- **Completion:** `completionRate`, `completedInteractions`, `failedInteractions`, `totalInteractions`, `successfulInteractions` (marketplace.prisma:48-54) updated in `TommacayScoringService.updateScoresAfterTask` (scoring.service.ts:52-56, 124-127).
- **Activity:** `lastShownAt`, `lastMatchedAt`, `lastSelectedAt`, `lastCompletedAt` updated by ranking/scoring.
- **Reliability:** `reliabilityScore` field exists (marketplace.prisma:38) but is **never updated or read** at runtime. Dead field.
- **Interaction diversity:** `diversityScore` IS now computed by `DistributionEngine.computeDiversityScore` (distribution-engine.service.ts:23-53) and persisted in `updateScoresAfterTask` (scoring.service.ts:48-51, 107). Not yet used in ranking formula (see §4/§11).
- **Behaviour patterns:** Not found in code. No behaviour-pattern signals or model.
- **Quality penalties:** `avgQualityRating`/`qualityRatingSum` tracked (scoring.service.ts:59-69); `calculateReputationScore` applies failure/quality penalty (scoring.utils.ts:103-115); auto-suppression when `completionRate < 0.4 && totalInteractions >= 10` (scoring.service.ts:95-131).

### Evidence
- `src/modules/task/market-algoritm/scoring.service.ts:19-134`
- `src/modules/task/market-algoritm/scoring.utils.ts:81-115`
- `src/modules/task/market-algoritm/distribution-engine.service.ts:23-53`
- `prisma/schema/marketplace.prisma:38, 48-54, 61-65`

### Status
🟡 Partially Implemented

### Gap Analysis
Completion, activity, quality penalties, and diversity scoring (now live) are implemented. `reliabilityScore` is dead. Behaviour-pattern tracking is absent.

### Recommendation
Compute/wire `reliabilityScore` (e.g. from completion/rejection history) or drop it. Add behaviour-pattern signals for Pattern Monitoring (§14). Low-Medium effort.

<!-- SECTION-7 -->

## SECTION 7 — Website Status

### Requirement
Active, Low Priority, Limited Access, Under Review, Restricted, Suspended.

### Current Implementation
`WebsiteMarketplaceStatus` enum defines all six states (marketplace.prisma:10-17). `isWebsiteRowMarketplaceEligible` (validation.engine.ts:359) rejects any profile where `marketplaceStatus !== 'ACTIVE'`. Thus all five non-ACTIVE states currently act identically as "blocked."

### Evidence
- `prisma/schema/marketplace.prisma:10-17`
- `src/modules/task/market-algoritm/validation.engine.ts:357-367`

### Status
🟡 Partially Implemented

### Gap Analysis
Enum + status-gated eligibility exist (any non-ACTIVE blocks). However, **no code path ever transitions a website into** `LOW_PRIORITY`, `LIMITED_ACCESS`, `UNDER_REVIEW`, `RESTRICTED`, or `SUSPENDED` (zero writes of a non-ACTIVE `marketplaceStatus` found). The states are indistinguishable in behaviour — there is no partial-visibility or priority-reduction mapping. No admin API sets these.

### Recommendation
Implement a status-transition service + admin API; map each state to concrete effects (partial visibility, priority reduction, etc.). Medium effort.

<!-- SECTION-8 -->

## SECTION 8 — Domain Relationship Tracking

### Requirement
Relationship history, root-domain tracking, interaction logging, timestamps.

### Current Implementation
- **Root-domain tracking:** `Website.rootDomain` (website.prisma:54) + `ValidationEngine.normalizeRootDomain` (validation.engine.ts:29-74) with two-part public-suffix handling.
- **Interaction logging:** `DomainInteraction` model (marketplace.prisma:235-267) records `sourceWebsiteId`, `targetWebsiteId`, `sourceDomain`, `targetDomain`, `normalizedPairKey`, `completedAt`. Written by `DomainInteractionRecorderService.record` (domain-interaction-recorder.service.ts:31-148), called from both task-requester.service.ts and admin-task.service.ts.
- **Timestamps:** `completedAt`/`createdAt` on `DomainInteraction`; `lastInteractionAt`, `repeatPairCooldownUntil`, `reciprocalCooldownUntil`, `interactionCount` on `DomainPairStat` (marketplace.prisma:269-301).
- **Secondary niche capture:** recorder writes `sourceSecondaryCategoryKey`/`targetSecondaryCategoryKey` (T-06).

### Evidence
- `prisma/schema/marketplace.prisma:235-301`
- `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts` (full)
- `src/modules/task/market-algoritm/validation.engine.ts:29-74`

### Status
✅ Fully Implemented

### Gap Analysis
Core relationship tracking is present and now centralized (de-duplicated into one recorder). History is limited to *completed* interactions (`DomainInteraction` keyed `taskId @unique`); impression/application/selection events are not recorded as domain relationships (only `OpportunityImpression`).

### Recommendation
Optionally record pre-completion relationship events. Otherwise satisfies the requirement at the completed-interaction level.

<!-- SECTION-9 -->

## SECTION 9 — Reciprocal Rules

### Requirement
Reciprocal prevention; determine time window, configuration, enforcement point.

### Current Implementation
- **Time window:** `reciprocalCooldownDays` default 120 (marketplace.prisma:182), read via `getCooldownDays` (validation.engine.ts:372-382). Fallback constant 120 (validation.engine.ts:20).
- **Configuration:** admin-configurable via `MarketplaceScoringConfig.reciprocalCooldownDays`.
- **Enforcement:** `canMatch`/`canMatchWithWindows`/`getCooldownBlockedPairKeys` (validation.engine.ts:187-244, 614-665) check `DomainPairStat.reciprocalCooldownUntil`. Direction-aware: reciprocal = reversed source/target within window. Enforced at PROVIDER_APPLICATION, TASK_ACCEPTANCE, INTERACTION_APPROVAL via `validateTransition`.

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:20, 187-244, 372-382, 614-665`
- `prisma/schema/marketplace.prisma:182, 271`

### Status
✅ Fully Implemented

### Gap Analysis
Correct and config-driven. Reciprocal detection only activates after a prior completion sets the cooldown — by definition correct. No issues found.

### Recommendation
None required.

<!-- SECTION-10 -->

## SECTION 10 — Repeat Pair Rules

### Requirement
Cooldown between identical domain pairs.

### Current Implementation
`repeatPairCooldownDays` default 90 (marketplace.prisma:179). `DomainPairStat.repeatPairCooldownUntil` set on completion by `DomainInteractionRecorderService` (domain-interaction-recorder.service.ts:86-93, 120-139). `getCooldownBlockedPairKeys` (validation.engine.ts:187-244) and `canMatch` block pairs within the window. Override support: `REPEAT_PAIR` rule can be skipped by admin override.

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:187-244, 372-382`
- `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts:84-147`
- `prisma/schema/marketplace.prisma:179, 269`

### Status
✅ Fully Implemented

### Gap Analysis
Cooldown window per pair key is correct and config-driven. Direction-aware (repeat vs reciprocal) implementation is a strength.

### Recommendation
None required.

<!-- SECTION-11 -->

## SECTION 11 — Distribution Rules

### Requirement
Domain diversity, repeated pair reduction, network concentration prevention.

### Current Implementation
- **Domain diversity:** `DistributionEngine.computeDiversityScore` (distribution-engine.service.ts:23-53) computes a 0-100 ratio of distinct counterpart domains to total interactions; persisted in `updateScoresAfterTask`. **Now wired** (the previous audit's "Missing Distribution Engine" is resolved).
- **Repeated pair reduction:** repeat-pair cooldown (§10) + `forceNewDomainNext`/`forceNewDomainUntil` fields. **However**, `DistributionEngine.filterNewDomains` (distribution-engine.service.ts:61-97) — which would enforce `forceNewDomainNext` — is **never called anywhere** (zero runtime call sites). `forceNewDomainNext` is **never set to `true`** by any code. So the diversification-by-`forceNewDomainNext` path is dead.
- **Network concentration prevention:** `NicheDistributionCap` + `isNicheWithinCap` provide niche-level caps, but **network/root-domain concentration across many related domains is not prevented** beyond pairwise repeat cooldowns.

### Evidence
- `src/modules/task/market-algoritm/distribution-engine.service.ts:23-53, 61-97`
- `src/modules/task/market-algoritm/scoring.service.ts:48-51`
- `prisma/schema/marketplace.prisma:40, 43-44, 341-355` (NicheDistributionCap)

### Status
🟡 Partially Implemented

### Gap Analysis
Diversity scoring + niche caps exist and are partly wired. The `filterNewDomains`/`forceNewDomainNext` diversification path is dead (defined but never invoked). Network-concentration prevention across sibling domains is absent.

### Recommendation
Invoke `filterNewDomains` in matching to honor `forceNewDomainNext`; add a network-concentration ranking penalty. Medium effort.

<!-- SECTION-12 -->

## SECTION 12 — Niche Distribution

### Requirement
Primary niche, secondary niche, distribution limits.

### Current Implementation
- **Primary niche:** `Website.primaryCategoryKey`/`primaryCategory` (website.prisma:55-56) + `WebsiteCategoryKey` model. Used in matching (category exact/related) and in `DomainInteraction`/`DomainPairStat` primary keys.
- **Secondary niche:** `Website.secondaryCategoryKey`/`secondaryCategory` (website.prisma:57-58) **exists** and is captured by the recorder into `sourceSecondaryCategoryKey`/`targetSecondaryCategoryKey` (domain-interaction-recorder.service.ts:108-109, 128-129).
- **Distribution limits:** `NicheDistributionCap` model (marketplace.prisma:341-355) + `DistributionEngine.isNicheWithinCap` (distribution-engine.service.ts:103-139) is **read** during validation (validation.engine.ts:538-560, flagged as restriction `NICHE_CAP_EXCEEDED`). Wired.

### Evidence
- `prisma/schema/website.prisma:55-58, 111-118`
- `src/modules/task/market-algoritm/distribution-engine.service.ts:103-139`
- `src/modules/task/market-algoritm/validation.engine.ts:534-560`
- `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts:108-129`

### Status
✅ Fully Implemented (model + read path)

### Gap Analysis
Primary + secondary niches and niche distribution caps are implemented and wired into validation. Caveat: the niche cap is enforced as a *non-blocking restriction* only (de-prioritised in ranking/analytics, not rejected at validation), and `NicheDistributionCap` rows must be seeded by an admin — none are created by code, so by default caps never trigger (query returns "within cap").

### Recommendation
Seed default `NicheDistributionCap` rows; consider making the cap's blocking behaviour configurable. Low-Medium effort.

<!-- SECTION-13 -->

## SECTION 13 — Velocity Rules

### Requirement
Weekly limits, daily spacing, interaction frequency.

### Current Implementation
- **Daily spacing:** `maxProviderMatchesPerDay` (default 3) enforced in ranking (`getDailyProviderWebsiteCounts`, ranking.service.ts:212-234) and in validation (`DAILY_LIMIT`, validation.engine.ts:476-483).
- **Weekly limits:** `TierEngine.resolveTierLimits` + `countWeeklyInteractions` (tier-engine.service.ts:39-87) enforce `weeklyInteractionLimit` in validation (validation.engine.ts:489-513, `WEEKLY_LIMIT`). **Now wired** (was missing in prior audit).
- **Interaction frequency:** exposure frequency capped via `exposureCount7d` exposure penalty. `maxRequesterExposurePerDay` config (marketplace.prisma:168) is **not enforced**. `applicationCount7d`/`matchCount7d` (marketplace.prisma:67-68) are **never updated**.

### Evidence
- `src/modules/task/market-algoritm/ranking.service.ts:66-70, 212-234`
- `src/modules/task/market-algoritm/validation.engine.ts:476-513`
- `src/modules/task/market-algoritm/tier-engine.service.ts:39-87`
- `prisma/schema/marketplace.prisma:67-68, 168`

### Status
🟡 Partially Implemented

### Gap Analysis
Daily and weekly limits are implemented and enforced. Per-requester daily exposure (`maxRequesterExposurePerDay`) and the `applicationCount7d`/`matchCount7d` frequency counters are unenforced/dead.

### Recommendation
Enforce `maxRequesterExposurePerDay`; populate/update `matchCount7d`/`applicationCount7d` via a background job. Medium effort.

<!-- SECTION-14 -->

## SECTION 14 — Pattern Monitoring

### Requirement
Repeat detection, reciprocal detection, cluster detection, group concentration.

### Current Implementation
- **Repeat detection:** ✅ `DomainPairStat.repeatPairCooldownUntil` (§10).
- **Reciprocal detection:** ✅ `DomainPairStat.reciprocalCooldownUntil` (§9).
- **Cluster detection:** **Not found in code.** No graph/cluster analysis over `DomainInteraction`.
- **Group concentration:** **Not found in code.** No network/ring-concentration detection.

### Evidence
- `prisma/schema/marketplace.prisma:258-301` (DomainPairStat)
- No `PatternMonitoring` service or cluster query found in `src/`.

### Status
🟡 Partially Implemented (pairwise only)

### Gap Analysis
Only pairwise repeat/reciprocal detection exists. Cluster/group-concentration monitoring over the interaction graph is absent. There is no engine that emits risk events for coordinated rings.

### Recommendation
Build a `PatternMonitoringEngine` over `DomainInteraction`/`DomainPairStat`; emit `RiskEvent`s for detected clusters. Very High complexity.

<!-- SECTION-15 -->

## SECTION 15 — Risk Engine

### Requirement
Risk score, risk calculation, risk penalties.

### Current Implementation
- **Risk score field:** `WebsiteMatchingProfile.riskScore` (marketplace.prisma:39), default 0.
- **Risk calculation:** `calculateRiskScore` (scoring.utils.ts:52-74) with time-decay + per-event deltas (`RISK_DISPUTE_DELTA`, `RISK_REJECTION_DELTA`, `RISK_FAILURE_DELTA`, `RISK_ABUSE_DELTA`, `RISK_SUCCESS_DELTA`). Consumed in `updateScoresAfterTask` (scoring.service.ts:86-116), which writes `riskScore`, `lastRiskEventAt`, `lastRiskReason`. The `riskEventType` parameter is plumbed from `admin-task.service.ts` (e.g. `'ABUSE'`, `'DISPUTE'`). **Now wired** (prior audit's "Missing Risk Engine" is resolved at the calculation level).
- **Risk penalties:** used in ranking (`riskPenalty`, ranking.service.ts) and eligibility (`riskScore >= 75` rejects, validation.engine.ts:525). `riskPenaltyDisputeWeight`/`riskPenaltyRejectionWeight` config **are read** (ranking.service.ts:92-96, 202-207).
- **RiskEvent audit model:** `RiskEvent` model exists (marketplace.prisma:403-413), but **is never written** (`prisma.riskEvent.create` not found anywhere). So risk deltas are **not** persisted to an immutable log.

### Evidence
- `src/modules/task/market-algoritm/scoring.utils.ts:36-74`
- `src/modules/task/market-algoritm/scoring.service.ts:86-116`
- `src/modules/task/market-algoritm/ranking.service.ts:92-96`
- `src/modules/task/market-algoritm/validation.engine.ts:525`
- `prisma/schema/marketplace.prisma:39, 175, 403-413`

### Status
🟡 Partially Implemented

### Gap Analysis
Risk *calculation* and *penalty consumption* are implemented and wired. The `RiskEvent` immutable audit log (spec §15, "auditable and replayable") is **not written** — risk history is not replayable, and disputes/rejections from the task lifecycle only feed risk when explicitly passed `riskEventType`; there is no automatic linkage from `reviewTask` rejection/dispute to a risk event.

### Recommendation
Write `RiskEvent` rows inside `updateScoresAfterTask`/`calculateRiskScore`; auto-feed risk from reviewTask rejection/dispute outcomes. Medium effort.

<!-- SECTION-16 -->

## SECTION 16 — Tier System

### Requirement
Free, Silver, Gold, Platinum, Enterprise; weekly limits, priority, tier enforcement.

### Current Implementation
- **Tiers:** `PlanTier` enum (enums.prisma) FREE/SILVER/GOLD/PLATINUM/ENTERPRISE. `SubscriptionPlan` model (subscriptionPlan.prisma).
- **TierEngine:** `TierEngine` (tier-engine.service.ts) maps `PlanTier` → weekly limit (`WEEKLY_LIMIT_BY_TIER`) and priority (`PRIORITY_BY_TIER`), resolves effective tier from active subscription (default FREE), and enforces via `resolveTierLimits` (validation, validation.engine.ts:489-513) + `countWeeklyInteractions`, and applies `tierPriority` in ranking (ranking.service.ts:104-106). **Now wired** (prior audit's "Missing Tier Engine" is resolved).
- **Enforcement:** `WEEKLY_LIMIT` rule enforced in `validateTransition`; tier priority multiplies the weighted score in ranking.

### Evidence
- `src/modules/task/market-algoritm/tier-engine.service.ts:15-87`
- `src/modules/task/market-algoritm/validation.engine.ts:489-513`
- `src/modules/task/market-algoritm/ranking.service.ts:104-106`
- `prisma/schema/enums.prisma` (PlanTier); `prisma/schema/marketplace.prisma:72-73` (profile limits)

### Status
✅ Fully Implemented (engine + enforcement)

### Gap Analysis
Tier mapping, weekly limit, and priority are implemented and enforced. Caveat: `WebsiteMatchingProfile.weeklyInteractionLimit`/`tierVelocityLimit` profile-override fields (marketplace.prisma:72-73) are **never set** by any code — only the `PlanTier`-derived defaults are used. Admin cannot override per-profile tier limits.

### Recommendation
Allow admins to set per-profile tier limits via override, or drop the dead fields. Low effort.

<!-- SECTION-17 -->

## SECTION 17 — Validation Engine

### Requirement
Validation before approval; eligibility, cooldowns, risk, velocity, tier, distribution.

### Current Implementation
`ValidationEngine.validateTransition` (validation.engine.ts:389-604) implements 5 ordered levels:
- L1 Eligibility (user active, website eligible, own-task) — never overridable.
- L2 Governance (repeat/reciprocal cooldowns) — overridable by admin via `adminOverride`.
- L3 Capacity (daily limit; weekly/tier via TierEngine) — enforced.
- L4 Behaviour (risk threshold `riskScore >= 75`, marketplace status) — fail-closed.
- L5 Optimization (non-blocking restrictions, e.g. `NICHE_CAP_EXCEEDED`).
Returns `APPROVED` / `APPROVED_WITH_RESTRICTIONS` / `REJECTED` with safe public message. Logs to `MarketplaceValidationLog` (validation.engine.ts:667-692) and `MarketplaceOverrideAudit` when override applied.

Called at: `applyToTask` (PROVIDER_APPLICATION), `selectProvider` (TASK_ACCEPTANCE), `reviewTask` APPROVE (INTERACTION_APPROVAL), `forceApproveTask` (ADMIN_FORCE). Re-validation is ALWAYS enforced (the old rollout bypass `enforceRevalidationAtAcceptance/Approval` was removed — see validation.engine.ts:412-417 comment).

### Evidence
- `src/modules/task/market-algoritm/validation.engine.ts:389-692`
- `src/modules/task/provider-task/provider-task.service.ts` (applyToTask)
- `src/modules/task/task-requester/task-requester.service.ts` (selectProvider, reviewTask)
- `src/modules/task/admin-task/admin-task.service.ts` (forceApproveTask)

### Status
✅ Fully Implemented

### Gap Analysis
The engine is fully implemented, fail-closed, re-validation-always-on, and wired at all key stages. Strengths: admin override skips only the specific rule (never eligibility/ownership), and validation logging never blocks operation. Minor: eligibility is still re-checked inline in some task services in addition to the engine (defense-in-depth, acceptable).

### Recommendation
Keep as-is. Optional: consolidate inline eligibility checks to rely solely on the engine (no functional gap).

<!-- SECTION-18 -->

## SECTION 18 — Liquidity Protection

### Requirement
Fallback behaviour, empty result prevention, admin-assisted matching.

### Current Implementation
- **Fallback behaviour:** `matching.engine.ts:84-98` switches `marketplaceMode` to `LOW_POOL` when `hardRuleCandidates < minViableMatches` and relaxes further. `MatchingAuditLog.marketplaceMode` records `NORMAL`/`LOW_POOL`.
- **Empty result prevention:** engine always attempts relaxation to level 4 before returning; if still empty, returns `[]` with audit `NONE`/`LOW_POOL`.
- **Admin-assisted matching:** `ManualMatchQueue` model exists (marketplace.prisma:426-442) but is **never written** (no `prisma.manualMatchQueue.create` found). No admin-assisted matching API or consumer.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:84-98, 429-451`
- `prisma/schema/marketplace.prisma:426-442` (ManualMatchQueue)

### Status
🟡 Partially Implemented

### Gap Analysis
Progressive relaxation prevents immediate "no results" and mode is audited. But there is **no admin-assisted matching queue** (dead `ManualMatchQueue` model) and no operator alerting when `LOW_POOL` persists. `LOW_POOL` is only a logged string, not an actionable mode.

### Recommendation
Build admin-assisted matching API over `ManualMatchQueue`; surface `LOW_POOL` to operators. Medium-High effort.

<!-- SECTION-19 -->

## SECTION 19 — Supply vs Demand

### Requirement
Marketplace balancing, provider/requester monitoring.

### Current Implementation
Admin analytics (`admin-analytics/*`) report task lifecycle and risk cards, including a "Marketplace supply and task workload summary" (analytics-report.registry.ts). However, there is **no supply/demand balancing logic** — no model tracks supply/demand by niche/country/language/tier, and nothing rebalances matching based on imbalance.

### Evidence
- `src/modules/admin/admin-analytics/registry/analytics-report.registry.ts` (supply/workload summary)
- `prisma/schema/*` — no supply/demand snapshot model

### Status
❌ Missing (balancing logic)

### Gap Analysis
Reporting exists; active balancing (e.g. boosting under-supplied niches, throttling over-supplied ones) does not. No `MarketplaceMetricSnapshot` model. The `OpportunityGuaranteeCron` adjusts opportunity/boost for starved *websites* but does not balance supply vs demand at the marketplace level.

### Recommendation
Add a `MarketplaceMetricSnapshot` model + balancing rules in `OpportunityGuaranteeCron` / a new `LiquidityEngine`. High effort.

<!-- SECTION-20 -->

## SECTION 20 — New User Boost

### Requirement
Early visibility boost, first-success optimisation.

### Current Implementation
- **Early visibility boost:** initial `boostFactor = 2.5` (scoring.utils.ts:11) and `newWebsiteBoostFactor = 2.5` config (marketplace.prisma:159). `OpportunityGuaranteeCron` raises `boostFactor` when `hoursSinceLastMatch > 72` (opportunity-guarantee.cron.ts:39-42). Generic new-site boost via high initial boostFactor.
- **First-success optimisation:** `firstSuccessBoostActive` field (marketplace.prisma:42) **is now consumed** — `updateScoresAfterTask` clears it after the provider's first successful completion (scoring.service.ts:121-123), and `ranking.service.ts:84-87` adds `newWebsiteBoostFactor` when active. So first-success boost is **partially wired** (boost side) but the **`MARKETPLACE_FIRST_SUCCESS` notification is never sent** (notification type declared in notification.prisma but no publisher emits it).

### Evidence
- `src/modules/task/market-algoritm/scoring.service.ts:121-123`
- `src/modules/task/market-algoritm/ranking.service.ts:84-87`
- `src/modules/task/market-algoritm/opportunity-guarantee.cron.ts:39-49`
- `prisma/schema/notification.prisma` (MARKETPLACE_FIRST_SUCCESS declared)

### Status
🟡 Partially Implemented

### Gap Analysis
Early boost + first-success *score* boost are implemented. The `MARKETPLACE_FIRST_SUCCESS` user-visible notification is dead (never emitted). `firstSuccessBoostActive` is seeded `true` and consumed; correct.

### Recommendation
Emit `MARKETPLACE_FIRST_SUCCESS` notification on first successful completion. Low effort.

<!-- SECTION-21 -->

## SECTION 21 — Fallback Matching

### Requirement
Progressive fallback instead of immediate "no results".

### Current Implementation
`matching.engine.ts:89-98` loops relaxation levels 0..maxRelaxationLevel (default 4), selecting the first level meeting `minViableMatches` (default 10); otherwise uses max level (FALLBACK passthrough). Same mechanism as §3. `OpportunityImpression.relaxationLevel` records which level produced the match.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:89-98`
- `prisma/schema/marketplace.prisma:106` (relaxationLevel on OpportunityImpression)

### Status
✅ Fully Implemented

### Gap Analysis
Satisfies progressive fallback. Edge: if pool is genuinely empty, returns `[]` (acceptable, relaxation already ran). No user-facing fallback *message* (see §29).

### Recommendation
Add safe empty-state messaging (§29). Low effort.

<!-- SECTION-22 -->

## SECTION 22 — Trust Indicators

### Requirement
Completed interactions, reliability, user-visible trust metrics.

### Current Implementation
- **Completed interactions:** tracked on profile (`completedInteractions`, `successfulInteractions`, marketplace.prisma:48, 54) and exposed in scoring. Not returned to users in opportunity/applicant API responses (provider-task.service returns raw task list).
- **Reliability:** `reliabilityScore` field is dead (§6). Not computed.
- **User-visible trust metrics:** Not found. No API surfaces trust metrics (completion rate, completed count, reliability) to providers/requesters.

### Evidence
- `prisma/schema/marketplace.prisma:48, 54`
- `src/modules/task/provider-task/provider-task.service.ts` (getProviderOpportunities returns task items)
- No trust-metric endpoint found in `src/`.

### Status
🟡 Partially Implemented

### Gap Analysis
Data is collected but not surfaced. `reliabilityScore` is never computed. There is no trust-indicator projection in opportunity/applicant DTOs.

### Recommendation
Expose safe trust metrics (completion rate, completed count) in opportunity/applicant responses; compute `reliabilityScore`. Low effort.

<!-- SECTION-23 -->

## SECTION 23 — Output Quality

### Requirement
Submission review, quality penalties.

### Current Implementation
- **Submission review:** `reviewTask` (task-requester.service.ts) supports APPROVE / REQUEST_REVISION / DISPUTED. Submission proof uploaded via `provider-task.service.ts` (`upload-proof`). `TaskFlowEventType` records review transitions.
- **Quality penalties:** `avgQualityRating`/`qualityRatingSum` recorded (scoring.service.ts:59-69); reputation penalty on failure (scoring.utils.ts). `qualityRating` is an input to `updateScoresAfterTask`. No dedicated *submission-quality* scoring tier separate from requester approval rating.

### Evidence
- `src/modules/task/task-requester/task-requester.service.ts` (reviewTask, REQUEST_REVISION/DISPUTED)
- `src/modules/task/market-algoritm/scoring.service.ts:59-69, 70-82`

### Status
🟡 Partially Implemented

### Gap Analysis
Review workflow exists. Quality *rating* flows into reputation, but there is no separate submission-quality scoring/penalty step (e.g. proof-quality tiers) beyond the requester's approval rating.

### Recommendation
Add optional submission-quality rating at review with a dedicated quality-penalty path. Low-Medium effort.

<!-- SECTION-24 -->

## SECTION 24 — Credit System

### Requirement
Deduction, refund, failed task handling, rejected task handling.

### Current Implementation
`CreditTaskService` (credit-task/credit-task.service.ts) implements:
- **Deduction:** `deductTaskCredit` checks wallet, deducts, logs (credit-task.service.ts).
- **Refund:** `refundTaskCredit` (called on requester cancellation / dispute paths) returns credits to source wallet; `rewardProviderCredit` grants provider reward on completion/approval.
- **Failed task handling:** `updateScoresAfterTask(websiteId, wasSuccessful=false)` applies failure penalty (scoring.service.ts).
- **Rejected task handling:** rejected applications marked `REJECTED`; a rejected *submission* routes to `DISPUTED`/`REVISION_REQUESTED`. Provider reward only on `COMPLETED`/approve.
- Wallet model: `WebsiteCreditWallet` with subscription/earned/purchased/referral buckets (credit.prisma).

### Evidence
- `src/modules/credit/credit-task/credit-task.service.ts` (deduct/refund/reward)
- `src/modules/task/provider-task/provider-task.service.ts` (refund on cancel)
- `src/modules/task/market-algoritm/scoring.service.ts` (failure handling)

### Status
✅ Fully Implemented

### Gap Analysis
Deduction, refund, failure penalty all present. Nuance: a *rejected submission* (DISPUTED) does not apply an explicit credit adjustment to either party beyond reputation — depends on dispute resolution (§25, which is incomplete). Provider reward is granted only on APPROVE/COMPLETE.

### Recommendation
Tie rejected/failed credit handling explicitly to dispute resolution (§25). Low effort.

<!-- SECTION-25 -->

## SECTION 25 — Dispute System

### Requirement
Disputes, resolution, credit adjustment.

### Current Implementation
- **Task-status disputes:** `reviewTask` can set `DISPUTED` (task-requester.service.ts). `admin-task.service.ts` `resolveDispute` handles `AdminTaskActionDtoEnum.RESOLVE_DISPUTE` → force-approve (APPROVE) / force-reject (REJECT) / revision request.
- **`Dispute` model:** exists in schema (marketplace.prisma:380-400) with `status`, `reason`, `evidence`, `creditAdjustmentId`, `resolvedById`. **However, `prisma.dispute.create` is never called anywhere** — disputes are tracked only as a task lifecycle status, not as `Dispute` records.
- **Resolution / credit adjustment:** `resolveDispute` force-approves/rejects the task; no `Dispute` row or `CreditLog`/credit adjustment is created through a dispute-specific path. `creditAdjustmentId` on `Dispute` is never populated.

### Evidence
- `prisma/schema/marketplace.prisma:359-400` (Dispute, DisputeStatus)
- `src/modules/task/task-requester/task-requester.service.ts` (reviewTask → DISPUTED)
- `src/modules/task/admin-task/admin-task.service.ts` (resolveDispute; no `prisma.dispute.create`)
- No `prisma.dispute.` write found in `src/`.

### Status
🟡 Partially Implemented (lifecycle only)

### Gap Analysis
Dispute is modelled as a task status + admin force-resolution, but the structured `Dispute` record (parties, evidence, SLA, resolution notes) is never created, there is no resolution workflow linked to the `Dispute` model, and no dispute-linked credit adjustment. `riskPenaltyDisputeWeight` only fires when `updateScoresAfterTask` is explicitly called with `riskEventType: 'DISPUTE'` (from admin-task abuse flag / resolve paths), not automatically from a dispute record.

### Recommendation
Persist a `Dispute` record on dispute open; link resolution → credit adjustment (`creditAdjustmentId`) + risk update (`RiskEvent`). Medium effort.

<!-- SECTION-26 -->

## SECTION 26 — Notification System

### Requirement
Opportunity alerts, task updates, acceptance, rejection, reminders.

### Current Implementation
`TaskNotificationService` + `TaskNotificationTrigger` enum (~26 triggers) cover: application submitted/accepted/rejected, task assigned, revision, approved, rejected, completed, cancelled, disputed, deadline extensions. `NotificationModule` supports in-app + websocket + email. `MARKETPLACE_NEW_OPPORTUNITY` notification type exists (notification.prisma).
- **Task lifecycle alerts (acceptance/rejection/updates):** ✅ fully emitted (provider-task.service.ts, task-requester.service.ts, admin-task.service.ts call `sendTaskNotification` with appropriate triggers).
- **Opportunity alerts:** `PROVIDER_NEW_OPPORTUNITY` trigger is declared in the map (`task-notification-map.util.ts`) and `MARKETPLACE_NEW_OPPORTUNITY` template exists, but **no service ever emits `PROVIDER_NEW_OPPORTUNITY`** (zero call sites pass that trigger). So NEW_OPPORTUNITY alerts are dead.
- **Reminders:** `MARKETPLACE_LOW_ACTIVITY_REMINDER` declared but no publisher emits it.

### Evidence
- `src/modules/task-notification/enums/task-notification-trigger.enum.ts`
- `src/modules/task-notification/utils/task-notification-map.util.ts` (PROVIDER_NEW_OPPORTUNITY declared)
- `src/modules/task-notification/task-notification.service.ts` (sendTaskNotification)
- No `PROVIDER_NEW_OPPORTUNITY` emit found in `*.service.ts`.

### Status
🟡 Partially Implemented

### Gap Analysis
Task lifecycle + application notifications are well covered. But opportunity *alerts* and low-activity *reminders* are declared yet never dispatched.

### Recommendation
Emit `PROVIDER_NEW_OPPORTUNITY` after match generation; send low-activity reminders. Low effort.

<!-- SECTION-27 -->

## SECTION 27 — Admin Controls

### Requirement
Manual matching, override, priority adjustment, restriction management, marketplace monitoring.

### Current Implementation
- **Override / priority adjustment / restriction management:** `AdminMarketplaceOverrideController` (admin-marketplace-override.controller.ts) exposes `POST /admin/marketplace-overrides`, `GET`, `DELETE :id` → `MarketplaceOverrideService.createOverride/revokeOverride/listOverrides`. Overrides are **resolved at runtime** in matching + ranking (§5). ✅ Wired.
- **Manual matching / restriction management (status):** No API transitions `marketplaceStatus` to LOW_PRIORITY/etc. (§7). `ManualMatchQueue` is dead (§18). So manual matching + status-based restriction management are absent.
- **Marketplace monitoring:** `admin-marketplace-visibility` (read-only list) + `admin-analytics` reports exist.

### Evidence
- `src/modules/admin/admin-marketplace-override/admin-marketplace-override.controller.ts`
- `src/modules/admin/admin-marketplace-visibility/*`
- `src/modules/admin/admin-analytics/*`
- `prisma/schema/marketplace.prisma:192-230` (MarketplaceOverride, now consumed)

### Status
🟡 Partially Implemented

### Gap Analysis
Override create/revoke/list API + runtime resolution is implemented (the prior audit's "0 runtime consumers" is now resolved). But there is **no admin API to change `marketplaceStatus`** (restriction management), **no manual-match queue API**, and **no priority-adjustment API beyond overrides**. Admin actions cannot influence marketplace status or do manual matching.

### Recommendation
Add admin status-transition API + manual-match queue API. Medium effort.

<!-- SECTION-28 -->

## SECTION 28 — Marketplace Modes

### Requirement
Early Stage Mode, Scaling Mode, configuration.

### Current Implementation
Only derived `marketplaceMode` **strings** `NORMAL`/`LOW_POOL` exist (matching.engine.ts:84-85, audit log). `MarketplaceModeConfig` model exists (marketplace.prisma:416-423) with `mode` (EARLY_STAGE/SCALING), `isActive`, `preset` (Json) — but is **never read or written** by any service (`prisma.marketplaceModeConfig` not found). No mode injection into matching/ranking/fallback.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:84-85`
- `prisma/schema/marketplace.prisma:374-423` (MarketplaceMode, MarketplaceModeConfig)
- No `marketplaceModeConfig` read/write found in `src/`.

### Status
❌ Missing (configuration + behavioural switch)

### Gap Analysis
No configurable marketplace modes. Mode is a post-hoc audit label, not a behavioural switch. The `MarketplaceModeConfig` model is dead.

### Recommendation
Wire `MarketplaceModeConfig` into engines (e.g. relax thresholds / change `minViableMatches` per mode). Medium effort.

<!-- SECTION-29 -->

## SECTION 29 — User Experience

### Requirement
Fallback messages, hidden restrictions, blocked opportunities.

### Current Implementation
- **Safe messages:** `SAFE_MESSAGES` (validation-result.ts:24-29) returns generic "This opportunity is currently unavailable." — avoids leaking rule names. ✅
- **Fallback messages:** Not found — empty opportunity pools return `[]` with no explanation.
- **Hidden restrictions / blocked opportunities:** Not surfaced to users or admins. No diagnostic for why a specific opportunity is blocked.

### Evidence
- `src/modules/task/market-algoritm/validation-result.ts:24-29`
- `src/modules/task/provider-task/provider-task.service.ts` (returns items only)

### Status
🟡 Partially Implemented

### Gap Analysis
Safe messaging exists for rejections. No empty-state/fallback messaging and no visibility into hidden restrictions or blocked opportunities.

### Recommendation
Add empty-state reasons and blocked-opportunity diagnostics (respecting SAFE_MESSAGES). Low effort.

<!-- SECTION-30 -->

## SECTION 30 — System Architecture

### Requirement
Separate services/modules for: Marketplace Engine, Matching Engine, Ranking Engine, Distribution Engine, Validation Engine, Quality Engine, Risk Engine, Tier Engine, Liquidity Engine, Notification Engine, Credit Engine, Analytics Engine, Admin Engine, Background Jobs. Identify mixed responsibilities.

### Current Implementation

| Engine | Module/Present? | Notes |
|---|---|---|
| Matching Engine | `market-algoritm/matching.engine.ts` | ✅ isolated, injected into modules |
| Matching Relaxation Engine | `market-algoritm/matching-relaxation.engine.ts` | ✅ implemented (was placeholder) |
| Ranking Engine | `market-algoritm/ranking.service.ts` | ✅ isolated |
| Validation Engine | `market-algoritm/validation.engine.ts` | ✅ isolated, wired at 4 stages |
| Distribution Engine | `market-algoritm/distribution-engine.service.ts` | ✅ isolated |
| Tier Engine | `market-algoritm/tier-engine.service.ts` | ✅ isolated |
| Quality/Scoring Engine | `market-algoritm/scoring.service.ts` + `scoring.utils.ts` | ✅ isolated |
| Risk Engine (calc) | `scoring.utils.calculateRiskScore` | ✅ calc isolated; `RiskEvent` log missing |
| Override Service | `market-algoritm/marketplace-override.service.ts` | ✅ isolated + admin API |
| Notification Engine | `notification/*` + `task-notification/*` | ✅ isolated |
| Credit Engine | `credit/*` | ✅ isolated |
| Analytics Engine | `admin/admin-analytics/*` | ✅ isolated (admin-facing) |
| Admin Engine | `admin/*` + `admin-task/*` | ✅ isolated |
| Background Jobs | `opportunity-guarantee.cron.ts` + BullMQ | ⚠ limited (see Background Jobs audit) |
| Liquidity Engine | ❌ | missing (no balancing/queue service) |
| Pattern Monitoring | ❌ | missing |

**Mixed responsibilities (residual SRP/DDD concerns):**
1. `provider-task.service.ts` and `task-requester.service.ts` still call `validateTransition`, `buildPairKey`/`normalizeRootDomain` (via ValidationEngine), and orchestrate `DomainInteractionRecorderService` + `updateScoresAfterTask`. These are acceptable orchestration calls, but the services remain large (god-services).
2. Domain-interaction writes are now **de-duplicated** into `DomainInteractionRecorderService` (good — the prior duplication concern was addressed).
3. The dedicated engines are registered ad-hoc in `provider-task.module.ts` (and task-requester/admin-task modules) rather than a single cohesive `MarketplaceModule`.

### Evidence
- `src/modules/task/provider-task/provider-task.module.ts` (engine providers)
- `src/modules/task/market-algoritm/*` (engines)
- `src/modules/task/provider-task/provider-task.service.ts`, `src/modules/task/task-requester/task-requester.service.ts`

### Status
🟡 Partially Implemented (architecture is sound at engine level; missing Liquidity/PatternMonitoring engines; modules not yet consolidated)

### Gap Analysis
Core engines are separable, isolated, and now mostly wired. The gaps are missing engines (Liquidity, PatternMonitoring) and the absence of a cohesive `MarketplaceModule`. Task lifecycle services retain orchestration responsibilities (acceptable SRP-wise but large).

### Recommendation
Introduce a `MarketplaceModule` owning the engines; move scoring/domain-interaction/validation updates into event-driven handlers; add Liquidity + PatternMonitoring engines. Refactor (Medium-High).

<!-- SECTION-ARCH -->

---

# DATABASE AUDIT

**Schema files:** multi-file Prisma under `prisma/schema/` (`marketplace`, `placement`, `website`, `subscriptionPlan`, `subscription`, `credit`, `notification`, `enums`, `user`, `auth`, `legal-doc`, `message`, `admin-analytics`). No `datasource`/`generator` in split files; configured via `package.json` prisma block → `prisma/schema`.

## Models present (relevant)
`WebsiteMatchingProfile`, `OpportunityImpression`, `MatchingAuditLog`, `MarketplaceScoringConfig`, `MarketplaceOverride`, `MarketplaceOverrideAudit`, `DomainInteraction`, `DomainPairStat`, `MarketplaceValidationLog`, `NicheDistributionCap`, `Dispute`, `RiskEvent`, `MarketplaceModeConfig`, `ManualMatchQueue`, `PlacementTask`, `PlacementApplication`, `Website`, `WebsiteVerification`, `WebsiteCategoryKey`, `WebsiteMargetPlaceTag`, `SubscriptionPlan`, `Subscription`, `UserCreditWallet`, `WebsiteCreditWallet`, `CreditLog`, `Notification` models.

## Missing models
- None strictly missing for the schema as declared. All spec-referenced models (`Dispute`, `RiskEvent`, `MarketplaceModeConfig`, `ManualMatchQueue`, `NicheDistributionCap`) now exist. (Prior audit's "missing models" is resolved.)

## Missing indexes (recommendations only)
- `Website.rootDomain` — **no index**; heavily used in `normalizeRootDomain` + equality lookups in matching/validation. **Recommended.**
- `Website.primaryCategoryKey` / `secondaryCategoryKey` — no standalone index (used in matching & niche queries).
- `DomainInteraction.sourcePrimaryCategoryKey` / `targetPrimaryCategoryKey` / secondary keys — no index; needed for niche/cluster monitoring (§12, §14). `normalizedPairKey` IS indexed.
- `PlacementTask.requesterWebsiteId` — not explicitly indexed (only `requesterId`, `selectedProviderId`, `assignedProviderWebsiteId`, `lifecycleStatus`, `deliveryDeadline`, `country`, `language`). **Recommended** for marketplace candidate queries.
- `WebsiteMatchingProfile` indexes exist for scoring/status fields; `diversityScore`/`reliabilityScore`/`internalPriorityScore` unindexed (acceptable — not queried).

## Missing relations / constraints
- `WebsiteMatchingProfile.marketplaceStatus` is enum but no FK to a status-history table (status transitions not audited as relationships).
- `SubscriptionPlan` → marketplace velocity is implicit (tier derived from `plan.tier` enum); `monthlyTaskCredits` not linked to `WebsiteMatchingProfile.weeklyInteractionLimit`/`tierVelocityLimit`.
- `MarketplaceOverride` is now written (override service) — no longer an orphan.
- No constraint preventing two `WebsiteMatchingProfile` rows per website (guaranteed by `@unique websiteId`).

## Schema/implementation drift (dead fields)
Fields declared but NEVER read/written by runtime code:
- `WebsiteMatchingProfile.reliabilityScore` (marketplace.prisma:38)
- `WebsiteMatchingProfile.internalPriorityScore` (marketplace.prisma:37)
- `WebsiteMatchingProfile.weeklyInteractionLimit` / `tierVelocityLimit` (marketplace.prisma:72-73) — never set; only `PlanTier` defaults used.
- `WebsiteMatchingProfile.forceNewDomainNext` / `forceNewDomainUntil` (marketplace.prisma:43-44) — never set true; `filterNewDomains` never called.
- `WebsiteMatchingProfile.applicationCount7d` / `matchCount7d` (marketplace.prisma:67-68) — never updated.
- `MarketplaceScoringConfig.maxRequesterExposurePerDay` (marketplace.prisma:168) — not enforced.
- `WebsiteMarketplaceVisibilityStatus.GRACE_PERIOD` / `HIDDEN` (website.prisma:2-5) — no transition code.

## Suggested structural changes (only what specs require)
1. Add index on `Website.rootDomain`, `Website.requesterWebsiteId` (via PlacementTask), `DomainInteraction` secondary-niche keys.
2. Either wire the dead fields (forceNewDomainNext, reliabilityScore, internalPriorityScore, weekly/tier limits, 7d counters) or drop them to reduce confusion.
3. Add a `MarketplaceMetricSnapshot` model (§19) when supply/demand balancing is built.
4. Add a status-history table if status transitions (§7) become auditable.

---

# API AUDIT

## Existing marketplace-relevant endpoints (confirmed via controllers)
- `ProviderTaskController.getProviderOpportunities` → `matchingEngine.findCandidates` + `rankingService.rankAndFilter` + `recordOpportunityImpressions` (provider-task.service.ts:121). **Live.**
- `ProviderTaskController.applyToTask` → `validateTransition(PROVIDER_APPLICATION)` (provider-task.service.ts).
- `TaskRequesterController.selectProvider` → `validateTransition(TASK_ACCEPTANCE)`.
- `TaskRequesterController.reviewTask` → `validateTransition(INTERACTION_APPROVAL)` (APPROVE path); sets DISPUTED on rejection.
- `AdminTaskController` force-complete/force-approve/force-reject/freeze/credit-adjust/abuse-flag/resolve-dispute.
- `AdminMarketplaceOverrideController` (`/admin/marketplace-overrides`): create/revoke/list override — **Live, newly wired.**
- `AdminMarketplaceVisibilityController` (read-only monitoring).
- `AdminAnalyticsController` (reports).
- `CreditTaskController` deduct/refund/reward.
- `WebsiteVerification*`, `NotificationController`, `AdminNotificationController`.

## Missing endpoints
- Marketplace status transition API (`LOW_PRIORITY`/`LIMITED_ACCESS`/etc., §7) — Missing.
- Manual match queue / admin-assisted matching API (§18, §27) — Missing.
- Dispute create/resolve API bound to `Dispute` model (§25) — Missing (only task-status dispute path).
- Supply/demand dashboard API (§19) — Missing.
- Marketplace mode config API (§28) — Missing.
- Trust-indicator / opportunity diagnostics API (§22, §29) — Missing.
- New-user boost / first-success trigger API (§20) — Missing (boost is automatic; notification missing).
- Per-requester exposure-frequency enforcement API/param (§13) — Missing.

## Validation gaps
- `applyToTask` runs `validateTransition` at PROVIDER_APPLICATION; listing relies on engine eligibility (acceptable).
- Re-validation is always enforced (rollout bypass removed). Strength.
- `maxRequesterExposurePerDay`, weekly (via tier), and `forceNewDomainNext` are not validated/enforced at any endpoint.

## Authorization gaps
- Provider opportunity endpoint guarded by `@CurrentUser` (JWT). Admin endpoints use `AdminGuard`. No marketplace-specific role/plan checks at endpoints (tier limits enforced only if engine wired — now wired).
- Override admin actions require `AdminGuard` (present on `AdminMarketplaceOverrideController`). Good.

---

# BACKGROUND JOBS AUDIT

## Present
- `OpportunityGuaranteeCron` (`@Cron('0 2 * * *')`, opportunity-guarantee.cron.ts) — recomputes `opportunityScore` and adjusts `boostFactor`/`forceMatchNext` for `ACTIVE` profiles. Registered in `provider-task.module.ts` + `ScheduleModule.forRoot()`. **Active.**
- `VisibilityMaintenanceService.maintainWebsiteVisibility` (visibility-credit) — visibility credit maintenance cron.
- BullMQ workers exist (bullmq/*) for streaks etc., but NOT for marketplace score/risk/analytics.

## Missing background jobs (per spec)
- **Risk recalculation job (§15):** `RiskEvent` never written; risk recompute not scheduled. Missing.
- **Score refresh / decay job:** boost decay partially in `OpportunityGuaranteeCron`; no independent exposure/visibility decay job. Partial.
- **Impression retention cleanup:** `impressionRetentionDays` config (marketplace.prisma) never consumed. Missing.
- **Analytics / supply-demand snapshot job (§19):** Missing.
- **Low-liquidity alert job (§18):** Missing (LOW_POOL only audited).
- **Velocity-counter rollup:** `matchCount7d`/`applicationCount7d` never updated (no job). Missing.
- **New-user boost / first-success notification dispatch:** notification never emitted (§20). Missing.

---

# ARCHITECTURE AUDIT

## Service boundaries
Engines (matching / relaxation / ranking / validation / distribution / tier / scoring / override) are properly isolated as `@Injectable()` services and now wired into modules. Notification, Credit, Analytics, Admin are separate modules. Good modularity at the leaf level.

## Business logic separation
**Improved vs prior audit.** `DomainInteractionRecorderService` consolidates duplicate domain-interaction writes. `ValidationEngine` is the single source of truth for constraints. Task lifecycle services (`provider-task`, `task-requester`) still orchestrate engine calls (acceptable) but remain large god-services.

## SOLID / Single Responsibility
Engines satisfy SRP. `MatchingRelaxationEngine` now implements its own responsibility (previously a placeholder). Task services violate SRP by size, not by mixed marketplace logic (orchestration only).

## Domain-Driven Design
Partial. `WebsiteMatchingProfile` aggregates marketplace state; `DomainInteraction`/`DomainPairStat` model relationships. Marketplace *behaviour* (validation, distribution, risk calc, tier, liquidity) is now modelled as domain services — stronger than prior audit. Missing: `LiquidityEngine`, `PatternMonitoringEngine`.

## Scalability
`findCandidates` builds hard-rule candidates over all open tasks in memory then computes compatibility per candidate (matching.engine.ts). No pagination of candidate tasks; risk of N+1 as task volume grows. `getDailyProviderWebsiteCounts` is a full-day scan. Acceptable for current scale; needs cursor/DB-side filtering for growth.

## Maintainability
Mixed. Engine code is clean and unit-tested (`scoring.utils.spec.ts`, `matching-relaxation.engine.spec.ts`). Task services are large and interleave orchestration with marketplace concerns — maintainability risk.

## Code duplication
- Domain-interaction write **de-duplicated** (task-requester vs engine intent) — resolved.
- Validation is centralized (engine), with minor inline re-checks (defense-in-depth).
- `buildPairKey`/`normalizeRootDomain` live in `ValidationEngine` (single source) — no duplicate wrappers found.

## Future extensibility
Improved. Placeholder relaxation engine, missing Distribution/Risk/Tier engines are now implemented. Remaining blockers to safe extension: (a) `RiskEvent`/`Dispute`/`ManualMatchQueue`/`MarketplaceModeConfig` are declared but unwired; (b) missing Liquidity/PatternMonitoring engines; (c) no cohesive `MarketplaceModule`.

---

# FINAL SUMMARY

## 1. Overall implementation percentage
**~62%** of the 30 specification sections are substantially implemented (fully or partially). Per-section status tally:

- ✅ Fully Implemented: §1, §2, §3, §4, §8, §9, §10, §12, §16, §17, §21, §24 — **12 sections**
- 🟡 Partially Implemented: §5, §6, §7, §11, §13, §14, §15, §18, §20, §22, §23, §25, §26, §27, §29, §30 — **16 sections**
- ❌ Missing: §19, §28 — **2 sections**
- ⚠ Needs Refactor: none rated (architecture is sound at engine level; refactor recommended for §30 consolidation)

## 2. Fully implemented features
Eligibility (incl. own-task/duplicate prevention), matching engine (all criteria), dynamic relaxation (EXACT→FALLBACK), ranking (8 signals + formula), domain relationship tracking, reciprocal + repeat cooldowns (direction-aware), niche distribution (+ secondary niche + caps), tier system (limits + priority + enforcement), validation engine (5-stage fail-closed, always re-validates), fallback/progressive matching, credit system (deduct/refund/reward/failure).

## 3. Partially implemented features
Visibility control (override wired, per-requester frequency not), website quality (diversity live, reliability/behaviour dead), website status (enum only, no transitions), distribution (diversity + caps live, `filterNewDomains` dead, no network-concentration), velocity (daily+weekly live, per-requester/7d counters dead), pattern monitoring (pairwise only), risk (calc + penalty live, `RiskEvent` log missing), liquidity (relaxation only, queue dead), new-user boost (score boost live, notification dead), trust indicators (data not surfaced), output quality (review live, no separate quality tier), dispute (lifecycle only, `Dispute` model dead), notification (lifecycle live, opportunity/reminder dead), admin controls (override API live, status/manual-match missing), UX (safe messages live, fallback/diagnostics missing), system architecture (engines isolated, Liquidity/PatternMonitoring missing).

## 4. Missing features
- §19 Supply vs Demand balancing (no balancing logic/model).
- §28 Marketplace Modes (no behavioural switch; `MarketplaceModeConfig` dead).
- Liquidity Engine + admin-assisted matching (`ManualMatchQueue` dead).
- Pattern Monitoring Engine (cluster/group concentration).
- `RiskEvent` immutable log; `Dispute` record persistence; trust-metric + first-success + opportunity/reminder notifications.

## 5. High-risk architectural issues
1. **Dead-but-declared models** (`Dispute`, `RiskEvent`, `ManualMatchQueue`, `MarketplaceModeConfig`) create false confidence — code reads as "implemented" but behaviour is absent.
2. **`RiskEvent` never written** → risk history not replayable; disputes/rejections don't auto-feed risk.
3. **Per-requester frequency & network-concentration controls absent** → potential abuse/over-exposure at scale.
4. **Task lifecycle god-services** still embed orchestration; no cohesive `MarketplaceModule` or event-driven updates.
5. **Scalability** of in-memory candidate building in `findCandidates`.

## 6. Database changes required
- Add indexes: `Website.rootDomain`, `PlacementTask.requesterWebsiteId`, `DomainInteraction` secondary-niche keys.
- Add `MarketplaceMetricSnapshot` (when §19 built).
- Either wire or drop dead fields: `reliabilityScore`, `internalPriorityScore`, `weeklyInteractionLimit`/`tierVelocityLimit`, `forceNewDomainNext`/`forceNewDomainUntil`, `applicationCount7d`/`matchCount7d`, `maxRequesterExposurePerDay`.
- Optional: status-history table for §7 transitions.

## 7. API changes required
- New: marketplace status-transition, manual-match queue, `Dispute` CRUD, supply/demand dashboard, marketplace-mode config, trust/diagnostics, first-success trigger.
- Modify: enforce `maxRequesterExposurePerDay` + `forceNewDomainNext` in opportunity listing; surface safe trust metrics + fallback reasons in opportunity responses.

## 8. New services/modules recommended
- `LiquidityEngine` (balancing + manual match queue consumer + LOW_POOL alerting).
- `PatternMonitoringEngine` (graph/cluster analysis over `DomainInteraction`/`DomainPairStat` → `RiskEvent`).
- `MarketplaceModule` consolidating engines + event-driven scoring/domain-interaction/validation handlers.
- `RiskEventWriter` (persist immutable risk log inside scoring).
- `DisputeService` (persist `Dispute` + credit/risk linkage).

## 9. Suggested implementation order (highest priority first)
1. Write `RiskEvent` rows + auto-feed risk from reviewTask (§15) — Medium, high value, low risk.
2. Persist `Dispute` records + credit/risk linkage (§25) — Medium.
3. Enforce `maxRequesterExposurePerDay` + wire `filterNewDomains`/`forceNewDomainNext` (§5, §11, §13) — Medium.
4. Website status transitions + admin API (§7, §27) — Medium.
5. Emit opportunity/first-success/reminder notifications (§20, §26, §29) — Low.
6. Surface trust metrics + fallback diagnostics (§22, §29) — Low.
7. Admin-assisted matching over `ManualMatchQueue` (§18, §27) — Medium-High.
8. Wire `MarketplaceModeConfig` (§28) — Medium.
9. Supply/demand balancing + `MarketplaceMetricSnapshot` (§19) — High.
10. Pattern Monitoring Engine (§14) — Very High.
11. Consolidate `MarketplaceModule` + event-driven handlers (§30) — Medium-High.

## 10. Estimated implementation complexity per missing/partial feature
- §5 per-requester frequency: **Medium**
- §6 reliability/behaviour: **Low–Medium**
- §7 status transitions: **Medium**
- §11 network-concentration + `filterNewDomains` wiring: **Medium**
- §13 per-requester/7d counters: **Medium**
- §14 Pattern Monitoring: **Very High**
- §15 `RiskEvent` log + auto risk: **Medium**
- §18 Liquidity / manual match: **Medium–High**
- §19 Supply vs Demand: **High**
- §20 first-success notification: **Low**
- §22 Trust indicators: **Low**
- §25 Dispute model + credit/risk: **Medium**
- §26 opportunity/reminder notifications: **Low**
- §27 status + manual-match API: **Medium**
- §28 Marketplace Modes: **Medium**
- §29 fallback/diagnostics UX: **Low**
- §30 Module consolidation: **Medium–High**

---

*End of report. All conclusions are grounded in the source files cited above as of audit date 2026-07-15.*








