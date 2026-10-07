# Marketplace Technical Audit & Gap Analysis

**Scope:** Full codebase audit of `backlyst-backend` (NestJS + Prisma) against the
30-section marketplace specification.

**Method:** Every conclusion below is grounded in actual source code. Where a claim
cannot be verified from code it is marked **"Not found in code."** Findings marked
**"Partially Implemented"** reflect drift between schema fields declared and the
runtime code that reads/writes them.

**Audit date:** 2026-07-15

**Key architectural location of the marketplace:**
`src/modules/task/market-algoritm/*` (MatchingEngine, MatchingRelaxationEngine,
TommacayRankingService, TommacayScoringService, ValidationEngine, DistributionEngine,
TierEngine, MarketplaceOverrideService, OpportunityGuaranteeCron), plus call-sites in
`task-requester.service.ts`, `provider-task.service.ts`, and `admin-task.service.ts`.

---

## Executive Summary (percentage)

Overall implementation is estimated at **~55%** of the specified marketplace surface.
The *engines* exist and are cohesive, but several are schema-only/partial:
scores are declared but not computed, advanced controls are blunt, and several
spec sections are absent.

**Fully implemented (10):** Eligibility (§1), Category matching (§2), Placement-type
matching (§2), Progressive relaxation (§3), Ranking formula pieces (§4), Reciprocal
rules (§9), Repeat-pair rules (§10), Root-domain/relationship tracking (§8), Tier
system (§16), Notification system (§26 - general).

**Partially implemented (14):** Tag/Country/Language/DA-DR matching (§2), Visibility
control (§5), Website quality (§6), Website status (§7), Niche distribution (§12),
Velocity (§13), Risk engine (§15), Validation engine (§17), Liquidity protection (§18),
New-user boost (§20), Trust indicators (§22), Credit system (§24), Admin controls (§27),
Marketplace modes (§28).

**Missing (6):** Pattern monitoring (§14), Dispute system data model (§25), Fallback
matching admin queue (§21 deep), Supply/demand balancing (§19), User-experience
restrictions surfacing (§29), Output-quality automation (§23).

**Needs refactor (1 structural):** System architecture / service boundaries (§30).


---

## Section 1 - Marketplace Eligibility

### Requirement
Website verification, ownership validation, active/deleted/suspended status, provider
ownership, task eligibility, duplicate applications, own-task prevention.

### Current Implementation
`ValidationEngine.isWebsiteEligible` / `isMarketplaceWebsiteEligible` enforce
`verificationStatus === 'VERIFIED'`, `marketplaceVisibilityStatus === 'VISIBLE'`,
`isFlag === false`, `isWalletLock === false`, `isDeleted === false`, plus
`marketplaceStatus === 'ACTIVE'`, `riskScore < 75`, and not-suppressed. `validateTransition`
(LEVEL 1) checks `USER_INACTIVE`, provider/requester website eligibility, task status
in allowed lifecycle set, and `OWN_TASK` (actor == task.requesterId, except ADMIN_FORCE).
`provider-task.service.ts` `applyToTask` blocks `task.requesterId === providerId` and
duplicate applications (`placementApplication` existing check).

### Evidence
`validation.engine.ts:336-366`, `validation.engine.ts:416-453`, `task-requester.service.ts:598,1008`, `provider-task.service.ts:297,316-353`, `website.prisma` (UserStatus, WebsiteVerificationStatus).

### Status
✅ Fully Implemented

### Gap Analysis
None of the listed sub-items. (Note: "suspended status" is enforced only via the
generic `marketplaceStatus !== 'ACTIVE'` block in §7, not a dedicated suspended gate.)

### Recommendation
No change required. Route all future entry points through `validateTransition`.

---

## Section 2 - Matching Engine

### Requirement
website-based, category, tag, country, language, placement type, DA/DR, progressive
relaxation, verification never relaxed.

### Current Implementation
`MatchingEngine.findCandidates` builds hard-rule candidates from eligible websites and
OPEN/WAITING tasks, then runs the relaxation loop. `buildCandidate` computes
categoryExact (primaryCategoryKey match), industryRelated (industry text match), tagOverlap
(marketplaceTagKeys), countryExact, languageExact, and authorityMeets (requiredDomainRating
vs provider domainRating). `getCandidateTasks` filters `placementType`/`linkAttribute`.
Eligibility helpers only return VERIFIED+VISIBLE websites, so verification is never relaxed.

### Evidence
`matching.engine.ts` (getCandidateTasks:193-225, buildCandidate:304-382, calculateCompatibility:394-420), `matching.types.ts`, `validation.engine.ts:127-168`.

### Status
🟡 Partially Implemented

### Gap Analysis
website-based, category, placement-type, DA/DR, relaxation, and verification-never-relaxed
are implemented. Country/language matching only scores when present (treated UNKNOWN when
task has no requirement) and never filters — acceptable but weak. Tag matching is
PARTIAL/EXACT only, no negative-tag or tag-category semantics. No semantic/embedding
similarity; industry match is naive `toLowerCase` equality. `domainRating` is provider DA,
but the spec "DA/DR compatibility" has no separate DR input. Moz DR check happens only at
apply time (`provider-task.service.ts:335-348`), not in the engine.

### Recommendation
Keep. Optionally promote country/language to hard filters where the task explicitly
requires them, and add DA/DR separate fields if DR is distinct from DA.

---

## Section 3 - Dynamic Relaxation

### Requirement
Exact -> Related -> Broad -> Fallback progression.

### Current Implementation
`MatchingRelaxationEngine` maps levels 0..4 to stages EXACT/RELATED/BROAD/BROAD/FALLBACK
with a documented truth table. `MatchingEngine` loops level 0..maxRelaxationLevel (default 4)
and stops when `selected.length >= minViableMatches` (default 10) or the final level.

### Evidence
`matching-relaxation.engine.ts:1-83`, `matching.engine.ts:89-98`, `matching-relaxation.engine.spec.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
None. Satisfies the progression requirement. (Supporting unit test exists.)

### Recommendation
No change.

---

## Section 4 - Ranking Engine

### Requirement
Compatibility, Opportunity, Visibility, Reputation, Boost, Exposure Penalty, Risk Penalty,
Final ranking formula.

### Current Implementation
`TommacayRankingService.rankAndFilter` computes:
`score = compatibility*compatibilityWeight + opportunity*opportunityWeight +
visibility*visibilityWeight + reputation*reputationWeight + boost*boostWeight -
exposurePenalty - riskPenalty - authorityPenalty + forceMatchBonus`. All five required
scores plus exposure & risk penalties exist. Compatibility is computed in the matching
engine; opportunity/visibility/reputation/boost come from the profile (or admin override).

### Evidence
`ranking.service.ts:13-121` (getConfig:163-188 defines the weights), `matching.engine.ts:394-420`.

### Status
🟡 Partially Implemented

### Gap Analysis
Final formula and all named components exist. However: (a) `opportunityScore` is reset to 0
on every task completion (`scoring.service.ts:114`) and is only rebuilt by the daily cron,
so ranking during the day depends on cron state; (b) weights read `compatibilityWeight` 0.35
but the schema DTO (`update-scoring-config.dto.ts`) does not expose all used fields;
(c) `internalPriorityScore`, `diversityScore`, `reliabilityScore` are NOT part of the final
formula (declared in schema but unused).

### Recommendation
Keep the formula. Decide explicitly whether `opportunityScore` should be reset to 0 post-task
(appears to be a bug since the field then relies entirely on the cron). Remove or wire unused
scores.

---

## Section 5 - Visibility Control

### Requirement
visibility weighting, priority reduction, frequency reduction, non-destructive control.

### Current Implementation
Visibility weighting is in the ranking formula (`visibilityScore * visibilityWeight`).
Non-destructive suppression exists (`isSuppressed`/`suppressedUntil`) and is honoured in
ranking (`ranking.service.ts:43-49`) and eligibility. Exposure penalty reduces score by
`exposureCount7d * exposurePenaltyPerTaskView`.

### Evidence
`ranking.service.ts:43-55,73-74,163-188`; `marketplace.prisma:60-68`; `scoring.service.ts:125-128`.

### Status
🟡 Partially Implemented

### Gap Analysis
- visibility weighting: ✅ used in formula.
- frequency reduction: 🟡 only via exposure penalty (impression count), NOT via a true
  per-website frequency cap tied to `matchCount7d`/`applicationCount7d`. Those counters are
declared but **Not found in code** as regularly updated.
- priority reduction: ❌ `internalPriorityScore` is seeded (default 50) and **never read or
decremented** in ranking.
- non-destructive: ✅ suppression uses dates, not deletion.

### Recommendation
Wire `internalPriorityScore` into the formula or remove it. Increment `matchCount7d`/
`applicationCount7d` in selection/apply flows; add a soft frequency cap in ranking.

---

## Section 6 - Website Quality

### Requirement
tracks completion, activity, reliability, interaction diversity, behaviour patterns, quality penalties.

### Current Implementation
Completion is tracked (`completionRate`, `completedInteractions`, `failedInteractions`,
`totalInteractions`, `successfulInteractions`) and updated in `scoring.service.ts`. Activity
timestamps exist (`lastShownAt`, `lastMatchedAt`, `lastSelectedAt`, `lastCompletedAt`).
Quality rating is captured (`qualityRatingSum`, `avgQualityRating`). Diversity is computed
by `DistributionEngine.computeDiversityScore` (distinct counterpart domains / total).

### Evidence
`marketplace.prisma:41-67`; `scoring.service.ts:19-131`; `distribution-engine.service.ts:23-53`.

### Status
🟡 Partially Implemented

### Gap Analysis
- completion/activity/quality: ✅ stored & updated (quality via manual review rating).
- reliability: ❌ `reliabilityScore` exists but **is never computed or read** (always default 50).
- interaction diversity: 🟡 `diversityScore` is *computed* by `DistributionEngine` but
  **never persisted to the profile** by any runtime code (only `scoring.service.ts` reads
  it as a fallback constant). `computeDiversityScore` result is ignored at the call site.
- behaviour patterns: ❌ no cadence/approval-reject-pattern signals feeding risk.
- quality penalties: 🟡 manual review rating feeds reputation; no automated proof-validity
  penalty (see §23).

### Recommendation
Persist `diversityScore` from `DistributionEngine` into `WebsiteMatchingProfile`;
implement `reliabilityScore` from completed/successful ratio; add behaviour-pattern signals.

---

## Section 7 - Website Status

### Requirement
Active, Low Priority, Limited Access, Under Review, Restricted, Suspended.

### Current Implementation
Enum `WebsiteMarketplaceStatus { ACTIVE, LOW_PRIORITY, LIMITED_ACCESS, UNDER_REVIEW,
RESTRICTED, SUSPENDED }` exists on `WebsiteMatchingProfile`. Eligibility collapses all
non-ACTIVE to ineligible (`marketplaceStatus !== 'ACTIVE' -> return false`). Validation
LEVEL 4 emits `WEBSITE_STATUS_NOT_ACTIVE`.

### Evidence
`marketplace.prisma:10-17,36`; `validation.engine.ts:357,521`.

### Status
🟡 Partially Implemented

### Gap Analysis
All six statuses are modelled, but behaviour is binary: anything not ACTIVE is fully
blocked. There is **no differentiated behaviour** for LOW_PRIORITY (reduced priority/
visibility), LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED, or SUSPENDED (grace vs hard block).
The spec implies graduated visibility/priority rather than a single block.

### Recommendation
Implement per-status behaviour in ranking/eligibility (e.g. LOW_PRIORITY -> multiply
visibility by factor; LIMITED_ACCESS -> reduce frequency; UNDER_REVIEW -> exclude from
new matches but keep existing; SUSPENDED -> hard block).

---

## Section 8 - Domain Relationship Tracking

### Requirement
relationship history, root-domain tracking, interaction logging, timestamps.

### Current Implementation
`DomainInteraction` (taskId-unique, source/target websites+domains, normalizedPairKey,
primary category keys, completedAt, createdAt). `DomainPairStat` aggregates per normalized
pair with `lastSourceDomain`, `lastTargetDomain`, `lastInteractionAt`, repeat/reciprocal
cooldown timestamps, `interactionCount`. Both are **written** on completion in
`task-requester.service.ts:211-250` (`reviewTask` approve path) and `admin-task.service.ts:161-250`
(force-complete / resolve-dispute). `ValidationEngine.normalizeRootDomain` handles two-part
public suffixes.

### Evidence
`marketplace.prisma:235-284`; `task-requester.service.ts:190-251`; `admin-task.service.ts:88-250`; `validation.engine.ts:27-95`.

### Status
✅ Fully Implemented

### Gap Analysis
History, root-domain normalization, interaction logs, and timestamps all present and written.
(Minor: `DomainInteraction` has no relation back to `Website`/`PlacementTask` FKs beyond
websiteId/taskId strings — acceptable.)

### Recommendation
No change. Consider backfilling history for legacy completed tasks.

---

## Section 9 - Reciprocal Rules

### Requirement
reciprocal prevention, time window, configuration, enforcement point.

### Current Implementation
Direction-aware cooldowns. `buildOrderedPairKey` distinguishes A->B from B->A.
`isDirectionAllowed` treats same-direction as REPEAT, reversed as RECIPROCAL.
`getCooldownDays` reads `reciprocalCooldownDays` (default 120, configurable in
`MarketplaceScoringConfig`) with fallback 120. Enforced via `validateTransition` at
PROVIDER_APPLICATION, TASK_ACCEPTANCE, INTERACTION_APPROVAL (and ADMIN_FORCE with override).

### Evidence
`validation.engine.ts:86-95,272-303,584-635,370-380`; `marketplace.prisma:180`; `admin-marketplace-config/*`.

### Status
✅ Fully Implemented

### Gap Analysis
None of the sub-items. Time window, configuration, and enforcement points all present.

### Recommendation
No change.

---

## Section 10 - Repeat Pair Rules

### Requirement
cooldown between identical domain pairs.

### Current Implementation
`DomainPairStat.repeatPairCooldownUntil` set on every recorded interaction (repeat default 90,
configurable). Sampled in `canMatch`/`canMatchWithWindows`/`getCooldownBlockedPairKeys`.

### Evidence
`validation.engine.ts:185-242,272-303,603-635`; `marketplace.prisma:181,272`.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## Section 11 - Distribution Rules

### Requirement
domain diversity, repeated pair reduction, network concentration prevention.

### Current Implementation
`DistributionEngine.computeDiversityScore` (distinct counterpart/total) and `filterNewDomains`
(enforce `forceNewDomainNext` to avoid repeating a counterpart). `validateTransition` uses
cooldown-blocked pair keys (repeat/reciprocal) — that is the "repeated pair reduction".

### Evidence
`distribution-engine.service.ts:23-97`; `validation.engine.ts:185-242`; `marketplace.prisma:45-46`.

### Status
🟡 Partially Implemented

### Gap Analysis
- domain diversity: 🟡 computed but not persisted (see §6).
- repeated pair reduction: ✅ via cooldowns.
- network concentration prevention: ❌ no per-domain-cap or counterpart-frequency cap. No
  signal that a single counterpart domain is over-represented beyond pairwise cooldowns.

### Recommendation
Add a network-concentration cap (e.g. max interactions with same counterpart in window);
persist `diversityScore`.

---

## Section 12 - Niche Distribution

### Requirement
primary niche, secondary niche, distribution limits.

### Current Implementation
`Website.primaryCategoryKey` + `secondaryCategoryKey` (relations to `WebsiteCategoryKey`)
exist. `NicheDistributionCap` model (categoryKey, scope PRIMARY/SECONDARY, maxPerWindow,
windowDays) and `DistributionEngine.isNicheWithinCap` query `DomainPairStat` by
`sourcePrimaryCategoryKey`/`targetPrimaryCategoryKey`.

### Evidence
`website.prisma:54-58`; `marketplace.prisma:320-338`; `distribution-engine.service.ts:103-128`.

### Status
🟡 Partially Implemented

### Gap Analysis
Schema + query exist, but: (a) `DomainInteraction`/`DomainPairStat` store `sourcePrimaryCategoryKey`
only — **secondary niche is never captured**, so SECONDARY scope caps cannot function;
(b) `isNicheWithinCap` is **Not found in code** as a called gate in selection/validation —
it is a standalone helper not yet wired into `validateTransition` or matching.

### Recommendation
Capture secondary niche on interaction; wire `isNicheWithinCap` into `validateTransition`
LEVEL 5 (optimization/restriction) and into matching candidate filtering.

---

## Section 13 - Velocity Rules

### Requirement
weekly limits, daily spacing, interaction frequency.

### Current Implementation
`validateTransition` LEVEL 3 enforces DAILY_LIMIT (profile `maxProviderMatchesPerDay` vs
`dailyMatches`) and WEEKLY_LIMIT (TierEngine `countWeeklyInteractions` vs `weeklyInteractionLimit`).
Ranking also caps `dailyMatches >= maxProviderMatchesPerDay`. `TierEngine` resolves weekly
caps per `PlanTier`.

### Evidence
`validation.engine.ts:473-511`; `ranking.service.ts:51-55,179,190-212`; `tier-engine.service.ts:72-87`.

### Status
🟡 Partially Implemented

### Gap Analysis
- weekly limits: ✅ via tier.
- daily spacing: 🟡 only a hard cap on *matches/day* (default 3), not true "spacing" between
  interactions (minimum gap between consecutive assignments).
- interaction frequency: 🟡 exposure penalty exists, but no global per-user frequency throttle
  beyond daily/weekly caps.

### Recommendation
Add minimum inter-action spacing; keep daily/weekly caps.

---

## Section 14 - Pattern Monitoring

### Requirement
repeat detection, reciprocal detection, cluster detection, group concentration.

### Current Implementation
Repeat and reciprocal detection are pairwise (§9/§10). `TaskFlowEventType.ADMIN_ABUSE_PATTERN_FLAGGED`
exists; `admin-task.service.ts` has `flagAbusePattern`. No automated detection engine.

### Evidence
`validation.engine.ts` (pairwise only); `admin-task.service.ts:715` (manual flag); `placement.prisma:272`.

### Status
❌ Missing (automated detection)

### Gap Analysis
No automated cluster / group-concentration / coordinated-ring detection. Reciprocal & repeat
are pairwise only. `admin-compliance` exists but is not a marketplace pattern monitor.

### Recommendation
Introduce `PatternMonitorEngine`: scan `DomainPairStat`/`DomainInteraction` for rings,
group concentration, and abnormal cadence; emit risk events + admin notifications.

---

## Section 15 - Risk Engine

### Requirement
risk score, risk calculation, risk penalties.

### Current Implementation
`scoring.utils.ts:calculateRiskScore` time-decays the score and applies deltas per event type
(DISPUTE/REJECTION/FAILURE/ABUSE/SUCCESS). `scoring.service.ts` calls it on task completion.
Ranking applies `riskPenalty` using `riskPenaltyRejectionWeight` (or `riskPenaltyDisputeWeight`
when `lastRiskReason === 'DISPUTE'`). Eligibility blocks `riskScore >= 75`.

### Evidence
`scoring.utils.ts:29-74,15-27`; `scoring.service.ts:83-92`; `ranking.service.ts:77-81`; `validation.engine.ts:358,523`.

### Status
🟡 Partially Implemented

### Gap Analysis
- risk score + calculation + penalty: ✅ present.
- BUT `riskPenaltyDisputeWeight` (schema) is reached only via a narrow `lastRiskReason === 'DISPUTE'`
  branch; dispute risk is **not** written through the task-dispute flow because no Dispute
  model/flow exists (§25). The richer `RiskEventType` (REJECTION/ABUSE) is only triggered if
  callers pass it — **Not found in code** that REJECTION/ABUSE are fed from the review/reject
  flows. `lastRiskReason` is set from `calculateRiskScore` reason, which defaults to
  SUCCESS/FAILURE.

### Recommendation
Feed REJECTION events from `reviewTask` REJECTED path and ABUSE from `flagAbusePattern` into
`calculateRiskScore` at the source; add a `RiskEvent` log table.

---

## Section 16 - Tier System

### Requirement
Free/Silver/Gold/Platinum/Enterprise, weekly limits, priority, tier enforcement.

### Current Implementation
Enum `PlanTier { FREE, SILVER, GOLD, PLATINUM, ENTERPRISE }`. `TierEngine.resolveTier` reads
the active subscription; `WEEKLY_LIMIT_BY_TIER` (5/15/40/100/250) and `PRIORITY_BY_TIER`
(1/1.2/1.5/1.8/2) maps. Weekly cap enforced in `validateTransition`. `PRIORITY_BY_TIER`
**is not consumed** anywhere in ranking (no priority multiplier applied).

### Evidence
`enums.prisma:87-93`; `tier-engine.service.ts:16-66`; `validation.engine.ts:487-511`.

### Status
🟡 Partially Implemented

### Gap Analysis
- tiers + weekly limits + enforcement: ✅.
- priority: ❌ `PRIORITY_BY_TIER` is computed but **never multiplied into the score**; higher
tiers get no ranking priority. `tierVelocityLimit` is resolved but unused in ranking.

### Recommendation
Apply `tierVelocityLimit` as a priority multiplier in `ranking.service.ts`.

---

## Section 17 - Validation Engine

### Requirement
validation before approval (eligibility, cooldowns, risk, velocity, tier, distribution).

### Current Implementation
`ValidationEngine.validateTransition` is a single source of truth with LEVEL 1 (Eligibility,
never overridable), LEVEL 2 (Governance/cooldowns, overridable), LEVEL 3 (Capacity: daily +
weekly/tier/velocity), LEVEL 4 (Behaviour: risk/status, fail-closed), LEVEL 5 (Optimization,
non-blocking). It is called at PROVIDER_APPLICATION (`provider-task.service.ts:321`),
TASK_ACCEPTANCE (`task-requester.service.ts:685`), INTERACTION_APPROVAL (`task-requester.service.ts:1066`),
and ADMIN_FORCE. Logs to `MarketplaceValidationLog`; admin overrides write `MarketplaceOverrideAudit`.
Safe messages from `SAFE_MESSAGES`.

### Evidence
`validation.engine.ts:382-573`; `provider-task.service.ts:321-333`; `task-requester.service.ts:685-697,1066+`; `validation-result.ts`.

### Status
🟡 Partially Implemented

### Gap Analysis
Eligibility, cooldown, risk, velocity, tier are enforced. **Distribution (niche caps, §12)
is not yet invoked** inside `validateTransition` (validation.engine.ts:528-530 notes it is
deferred). Override correctly never bypasses eligibility/ownership/security.

### Recommendation
Wire `DistributionEngine.isNicheWithinCap` into LEVEL 5 as a restriction; add a config-driven
validation gate registry. Align `update-scoring-config` DTO with actually-used fields.

---

## Section 18 - Liquidity Protection

### Requirement
fallback behaviour, empty result prevention, admin-assisted matching.

### Current Implementation
Matching engine always attempts relaxation to level 4 before returning; if still empty it
returns `[]` with audit `NONE`/`LOW_POOL`. `marketplaceMode` is set to `LOW_POOL` when
`hardRuleCandidates < minViableMatches`. `OpportunityGuaranteeCron` boosts neglected sites.

### Evidence
`matching.engine.ts:84-114`; `opportunity-guarantee.cron.ts`.

### Status
🟡 Partially Implemented

### Gap Analysis
- empty result prevention (relaxation fallthrough): ✅.
- fallback behaviour: 🟡 only relaxation; no cross-pool fallbacks.
- admin-assisted matching: ❌ no manual match queue or admin injection of matches on LOW_POOL.

### Recommendation
Add an admin-assisted matching queue surfaced when `LOW_POOL`; emit ops notification.

---

## Section 19 - Supply vs Demand

### Requirement
marketplace balancing, provider/requester monitoring.

### Current Implementation
`MatchingAuditLog.marketplaceMode` records NORMAL/LOW_POOL (signal only). `admin-analytics`
reports exist (read-only aggregation) but do not feed back into matching.

### Evidence
`matching.engine.ts:100-112`; `marketplace.prisma:127-145`; `admin-analytics/*`.

### Status
🟡 Partially Implemented

### Gap Analysis
Monitoring signal exists; **no balancing logic** — nothing adjusts visibility/boost toward
under-supplied segments. Provider/requester supply monitored only indirectly via analytics.

### Recommendation
Add a LiquidityEngine that reads supply/demand snapshots and nudges visibility/boost.

---

## Section 20 - New User Boost

### Requirement
early visibility boost, first-success optimisation.

### Current Implementation
`WebsiteMatchingProfile.firstSuccessBoostActive` (default true). Ranking adds `newWebsiteBoostFactor`
(2.5) when active. `scoring.service.ts` clears it after the first successful completion. Capped
boost is also raised by `OpportunityGuaranteeCron` for neglected sites (`forceMatchNext` after
168h).

### Evidence
`ranking.service.ts:66-72`; `scoring.service.ts:114-120`; `opportunity-guarantee.cron.ts:39-50`.

### Status
🟡 Partially Implemented

### Gap Analysis
Early visibility boost + first-success consumption are implemented. "First-success optimisation"
is limited to clearing the boost; no extra optimisation (e.g. guaranteed first match) beyond
`forceMatchNext`. `firstSuccessBoostActive` seeding depends on profile creation path.

### Recommendation
Keep; optionally guarantee one match while `firstSuccessBoostActive`.

---

## Section 21 - Fallback Matching

### Requirement
progressive fallback instead of immediate "no results".

### Current Implementation
Matching loop iterates relaxation levels and stops when `>= minViableMatches` or max level;
level 4 is passthrough FALLBACK. If still empty, returns `[]` (no hard "no results" before
relaxation completes).

### Evidence
`matching.engine.ts:89-98`; `matching-relaxation.engine.ts:43-65`.

### Status
✅ Fully Implemented (progressive relaxation). See §18 for admin-assisted gap.

### Gap Analysis
Progressive fallback present. Deep admin-assisted fallback (§18) missing.

### Recommendation
Add admin-assisted match injection on persistent LOW_POOL.

---

## Section 22 - Trust Indicators

### Requirement
completed interactions, reliability, user-visible trust metrics.

### Current Implementation
`WebsiteMatchingProfile` stores `completedInteractions`, `successfulInteractions`,
`failedInteractions`, `completionRate`, `reputationScore`, `reliabilityScore`, `avgQualityRating`.

### Evidence
`marketplace.prisma:41-54`; `scoring.service.ts`.

### Status
🟡 Partially Implemented

### Gap Analysis
Data exists, but: `reliabilityScore` is never computed (default 50). **Not found in code** a
user-facing endpoint exposing these as a trust badge/score on provider/requester profiles or
dashboards.

### Recommendation
Compute `reliabilityScore`; expose a trust summary DTO in provider/requester dashboards.

---

## Section 23 - Output Quality

### Requirement
submission review, quality penalties.

### Current Implementation
`reviewTask` (APPROVE/REQUEST_REVISION/DISPUTED) and `submitTask` manual review exist.
`avgQualityRating` feeds reputation. No automated proof-validity/quality scoring.

### Evidence
`task-requester.service.ts:999-1090`; `provider-task.service.ts` submit flow.

### Status
🟡 Partially Implemented

### Gap Analysis
Manual review + rating-based reputation penalty exist. No automated output-quality signal
(proof validity, revision count) feeding risk/reputation automatically. `qualityRating` is
optional and manual.

### Recommendation
Add automated quality signals (revision count, proof checks) into risk/reputation.

---

## Section 24 - Credit System

### Requirement
deduction, refund, failed task handling, rejected task handling.

### Current Implementation
`credit-task.service.ts` has `deductTaskCredit`/`refundTaskCredit`. Task creation reserves
credits; `reviewTask` finalises `finalCreditCost` and discharges/refunds. Cancellation refunds
`reservedCreditAmount` (`task-requester.service.ts:978-986`). `CreditAdjustmentType { REFUND,
REVERSE, ADD }`. Admin actions CREDIT_REFUND/CREDIT_REVERSE exist (`admin-task.service.ts:701-712`).

### Evidence
`credit-task/*`; `task-requester.service.ts:978-997`; `admin-task.service.ts:700-718`; `enums.prisma:81-85`.

### Status
🟡 Partially Implemented

### Gap Analysis
Deduction/refund present. Failed-task handling: FAILED status exists but **Not found in code**
an explicit credit-settlement branch for FAILED (vs COMPLETED/APPROVED). Rejected-task handling:
REJECTED flows exist but credit disposition on rejection is not clearly tied to a refund/
forfeit rule. Provider reward (`providerRewardCredits`) is **Not found in code** as a credited
transaction on completion.

### Recommendation
Add explicit FAILED/REJECTED credit settlement rules; credit provider reward on completion.

---

## Section 25 - Dispute System

### Requirement
disputes, resolution, credit adjustment.

### Current Implementation
`reviewTask` can set lifecycleStatus to DISPUTED; admin `RESOLVE_DISPUTE` action
(`admin-task.service.ts:713` -> `resolveDispute`) resolves and records a domain interaction.
`TaskFlowEventType.TASK_DISPUTED` exists. No dedicated Dispute entity.

### Evidence
`task-requester.service.ts:1033`; `admin-task.service.ts:713-716`; `placement.prisma:267`.

**No `model Dispute` exists in any Prisma schema file** (grep returns none).

### Status
❌ Missing (data model)

### Gap Analysis
Dispute lifecycle status + admin resolution exist, but there is **no Dispute model** (status,
reason, evidence, opened/resolved by, `creditAdjustmentId`). Resolution writes a domain
interaction but **not** an explicit auditable credit adjustment tied to the dispute. Risk is
not updated with a DISPUTE event from this path.

### Recommendation
Add `Dispute` model; make resolution write an explicit `CreditLog`/`CreditAdjustment` and a
DISPUTE `RiskEvent`.

---

## Section 26 - Notification System

### Requirement
opportunity alerts, task updates, acceptance, rejection, reminders.

### Current Implementation
`NotificationService` + `TaskNotificationService` with triggers (PROVIDER_TASK_AVAILABLE,
REQUESTER_TASK_CANCELLED, REQUESTER_PROOF_SUBMITTED, etc.) and preference flags
(`notificationTaskStatusUpdates`, `notificationCreditBalanceAlerts`). `notification-template.util.ts`
categorises types.

### Evidence
`notification/*`; `task-notification/*`; `notification.prisma`.

### Status
✅ Fully Implemented (general task/credit notifications)

### Gap Analysis
Task status, acceptance/rejection, reminders, credit alerts exist. **Not found in code** an
"opportunity alert" pushed when new matches appear (the marketplace opportunity-impression
does not trigger a notification). Admin ops alerts (LOW_POOL, SUPPLY_DEMAND_IMBALANCE) are
enum-declared (`notification.prisma:101-104`) but not emitted by marketplace code.

### Recommendation
Emit opportunity alerts on new impressions; wire admin ops notifications from marketplace modes.

---

## Section 27 - Admin Controls

### Requirement
manual matching, override, priority adjustment, restriction management, marketplace monitoring.

### Current Implementation
`MarketplaceOverrideService` (BOOST/SUPPRESS/FORCE_MATCH/SCORE_OVERRIDE/PENALTY) create/revoke/
list/resolve. Overrides are consumed by ranking + matching + validation. `admin-marketplace-config`
updates `MarketplaceScoringConfig`. `admin-marketplace-visibility` lists visibility/grace/compliance.
`admin-task` supports force-complete, freeze, credit adjust, resolve-dispute, flag-abuse.

### Evidence
`marketplace-override.service.ts`; `admin-marketplace-config/*`; `admin-marketplace-visibility/*`; `admin-task/*`.

### Status
🟡 Partially Implemented

### Gap Analysis
Override (boost/suppress/force/scores/penalty), config, visibility registry, task actions all
exist. **Manual matching (§18/§21) is missing** — no admin UI/API to inject a specific match.
Priority adjustment is indirect (SCORE_OVERRIDE/BOOST) not a dedicated priority control.

### Recommendation
Add manual match-queue admin endpoint; consider explicit priority override field.

---

## Section 28 - Marketplace Modes

### Requirement
Early Stage Mode, Scaling Mode, configuration.

### Current Implementation
No `MarketplaceModeConfig` model/enum. `marketplaceMode` is only an internal runtime string
(`'NORMAL'`/`'LOW_POOL'`) computed in `MatchingEngine.findCandidates`; not persisted or
configurable. Presence of `enforceRevalidationAtAcceptance/Approval` flags is vestigial (the
revalidation guard was removed per validation.engine.ts:410-414 comments, though fields remain).

### Evidence
`matching.engine.ts:84-85`; `marketplace.prisma:184-186` (unused guard flags); `enums.prisma` (no mode enum).

### Status
🟡 Partially Implemented (signal only)

### Gap Analysis
No configurable EARLY_STAGE/SCALING mode, no preset table consumed by matching/ranking/validation.
Only a transient LOW_POOL/NORMAL signal.

### Recommendation
Add `MarketplaceModeConfig` (EARLY_STAGE/SCALING presets) and inject into matching/relaxation/
validation decision points.

---

## Section 29 - User Experience

### Requirement
fallback messages, hidden restrictions, blocked opportunities.

### Current Implementation
`SAFE_MESSAGES` (GENERIC/COOLDOWN/ELIGIBILITY) returned on rejection. `validateTransition`
emits `APPROVED_WITH_RESTRICTIONS` for optimization-level restrictions (e.g. LOW_VISIBILITY,
LOW_PRIORITY placeholders in `validation-result.ts`).

### Evidence
`validation-result.ts`; `validation.engine.ts:533-544`; `provider-task.service.ts:331-333`.

### Status
🟡 Partially Implemented

### Gap Analysis
Safe rejection messages exist. But restrictions list is mostly placeholder; clients are not
told *which* opportunities are blocked or why (hidden restrictions / blocked opportunities not
surfaced). No UX fallback message for LOW_POOL or "no exact matches, showing related".

### Recommendation
Surface restriction reasons + relaxation level to clients; add LOW_POOL UX copy.

---

## Section 30 - System Architecture

### Requirement
Separate modules for Marketplace/Matching/Ranking/Distribution/Validation/Quality/Risk/Tier/
Liquidity/Notification/Credit/Analytics/Admin engines + Background Jobs; identify mixed
responsibilities.

### Current Implementation
Cohesive engines live in `src/modules/task/market-algoritm/*`: MatchingEngine,
MatchingRelaxationEngine, TommacayRankingService, TommacayScoringService (Quality),
ValidationEngine, DistributionEngine, TierEngine, MarketplaceOverrideService,
OpportunityGuaranteeCron. These are injected into `provider-task`, `task-requester`,
`admin-task` services, which also perform their own eligibility/orchestration logic.

### Evidence
`src/modules/task/market-algoritm/*`; `task-requester.service.ts`; `provider-task.service.ts`; `app.module.ts`.

### Status
⚠ Needs Refactor

### Gap Analysis
Engines are well-separated (good SRP inside the folder). Issues:
1. No top-level `MarketplaceModule` — orchestration is embedded in task services.
2. `recordApprovedDomainInteraction` is duplicated in `task-requester.service.ts` and
   `admin-task.service.ts` (copy-paste, drift risk).
3. Folder name `market-algoritm` is a misnomer; Quality/Risk/Liquidity/Analytics engines are
   partial (Quality/Risk present but incomplete; Liquidity/Analytics not engines).
4. Background jobs: only `OpportunityGuaranteeCron` (fairness) + visibility-maintenance cron;
   no score/risk/pattern/cleanup/analytics crons (see Background Jobs).

### Recommendation
Extract a `MarketplaceModule`; deduplicate interaction recording into one shared method;
rename folder; promote Liquidity/Analytics/PatternMonitor to first-class engines.

---

## DATABASE AUDIT (Prisma)

Models present: `WebsiteMatchingProfile`, `OpportunityImpression`, `MatchingAuditLog`,
`MarketplaceScoringConfig`, `MarketplaceOverride`, `MarketplaceOverrideAudit`,
`MarketplaceValidationLog`, `DomainInteraction`, `DomainPairStat`, `NicheDistributionCap`.
Enums: `WebsiteMarketplaceStatus`, `MarketplaceOverrideType/Status`, `PlanTier`,
`WebsiteVerificationStatus`, `TaskStatus`, etc.

### Missing models
- `Dispute` (§25) — confirmed absent.
- `MarketplaceModeConfig` (§28) — absent.
- `RiskEvent` log (§15) — absent (risk only stored as scalar on profile).
- `ManualMatchQueue` / admin-assisted match (§18/§21) — absent.
- `SupplyDemandSnapshot` (§19) — absent.
- No explicit relation from `DomainInteraction` to `Website`/`PlacementTask` (string FKs only).

### Missing relations
- `WebsiteMatchingProfile` has no reverse relation name used consistently (`user`/`website`
  relations exist). OK.
- `DomainInteraction` stores `sourcePrimaryCategoryKey`/`targetPrimaryCategoryKey` but
  **not** secondary niche — secondary-niche distribution cannot work (§12).

### Missing indexes
- `WebsiteMatchingProfile`: index on `riskScore` exists; no composite for (marketplaceStatus,
  riskScore). `OpportunityImpression` has relaxationLevel index. Generally adequate.

### Missing enums
- No `MarketplaceMode` enum (EARLY_STAGE/SCALING).
- No `DisputeStatus` enum.

### Unused / drift fields (declared, never read or written at runtime)
`diversityScore` (computed but not persisted), `reliabilityScore` (never computed),
`internalPriorityScore` (never read in ranking), `forceNewDomainNext` (read by DistributionEngine
helper but helper not wired into selection), `applicationCount7d`/`matchCount7d`/`lastMatchedAt`/
`lastSelectedAt` (not consistently updated), `riskPenaltyDisputeWeight` (narrowly reached only
via `lastRiskReason === 'DISPUTE'`), `enforceRevalidationAtAcceptance/Approval` (vestigial).

### Suggested structural changes (spec-only)
1. Add `Dispute` model (status, reason, evidence, openedById, resolvedById, creditAdjustmentId,
timestamps) + `DisputeStatus` enum.
2. Add `MarketplaceModeConfig` (mode enum, presets, isActive).
3. Add `RiskEvent` (websiteId, type, delta, createdAt).
4. Add `secondaryCategoryKey` to `DomainInteraction`.
5. Add `ManualMatchQueue` for admin-assisted matching.
6. Add FK relations `DomainInteraction.website`/`task` for referential integrity.

---

## API AUDIT (Marketplace APIs)

### Existing endpoints (verified by controllers)
- `provider-task`: apply, submit, upload-proof, get-details.
- `task-requester`: create-task, list, select-provider, review(dispute/approve/revision),
cancel, deadline-extend.
- `admin-task`: list, get, update-status, action (force-complete, freeze, credit-refund/
  reverse, resolve-dispute, flag-abuse).
- `admin-marketplace-config`: get/update `MarketplaceScoringConfig`.
- `admin-marketplace-visibility`: list visibility/grace/compliance.
- `marketplace-override`: create/revoke/list (via MarketplaceOverrideService; controller
  presence to be confirmed — service exists and is consumed).
- `credit-task`: deduct/refund; `admin-credit`: ledger/wallet/adjustments.
- `notification`: preferences/list.

### Missing endpoints
- Marketplace opportunity listing endpoint that calls `MatchingEngine.findCandidates` +
  `RankingService.rankAndFilter` for a provider (the matching engine exists but no dedicated
  provider-facing "get opportunities" controller route is verified in the audited tree —
  confirm wiring).
- Dispute CRUD endpoints (§25).
- Manual match-queue admin endpoint (§18/§27).
- Niche distribution cap admin CRUD (§12).
- Marketplace mode config endpoint (§28).
- Supply/demand report endpoint (§19).

### Validation gaps
- `CreateMarketplaceOverrideDto` (inline class in `marketplace-override.service.ts`) is not
a decorated DTO with `class-validator` (uses raw class fields) — weaker input validation.
- `update-scoring-config` DTO does not cover `newWebsiteBoostFactor`, `riskPenaltyDisputeWeight`,
  `repeatPairCooldownDays`, `reciprocalCooldownDays` (fields actually used in runtime).

### Authorization gaps
- Override/force actions are admin-guarded at service boundaries; eligibility/ownership/security
  are correctly never overridable. Confirm all marketplace-admin routes use `@AdminGuard()`.

---

## BACKGROUND JOBS AUDIT

### Present
- `OpportunityGuaranteeCron` (`@Cron 0 2 * * *`): refreshes opportunityScore + boostFactor,
sets `forceMatchNext` for neglected sites (marketplace fairness). ✅
- `VisibilityMaintenanceService` (visibility-credit): visibility credit maintenance cron. ✅
- BullMQ workers exist for referral streaks etc., but **not** for marketplace score/risk/analytics.

### Missing jobs (per spec)
- Score-update cron beyond daily fairness (boost decay on schedule, not only on completion). ❌
- Risk-update / risk-decay cron. ❌
- Pattern-monitor cron (§14). ❌
- Cleanup cron: expire `suppressedUntil`, `forceMatchNext`, `MarketplaceOverride.activeUntil`;
  rotate `OpportunityImpression`/`MatchingAuditLog` by `impressionRetentionDays`. ❌
- Analytics aggregation cron for supply/demand (§19). ❌
- Marketplace maintenance cron (mode rotation, LOW_POOL rebalancing). ❌

---

## ARCHITECTURE AUDIT

### Service boundaries
Good: the `market-algoritm` folder is a coherent engine set. Weak: orchestration logic lives
in `task-requester`, `provider-task`, `admin-task` services that also call Prisma directly and
duplicate interaction recording.

### Business logic separation / SRP
Engines follow SRP. Task services mix HTTP orchestration + DB transactions + marketplace rules.

### SOLID / DDD
Engines are injectable and single-purpose (good). No explicit domain module boundary; no
aggregate roots for "Marketplace".

### Scalability
Relaxation loop is O(candidates x levels) with N+1-ish DB lookups (per-website overrides,
cooldown stats). `getDailyProviderWebsiteCounts` queries all assigned tasks per day (scans).
Acceptable at current scale; would need caching/indexing at high volume.

### Maintainability
Duplicated `recordApprovedDomainInteraction` across two services; schema/code drift (unused
fields); misnamed folder. Medium maintainability risk.

### Code duplication
`recordApprovedDomainInteraction` duplicated (task-requester vs admin-task). Pair-key + cooldown
math duplicated across validation engine and services.

### Future extensibility
Engine pattern + `MarketplaceScoringConfig` singleton make tuning easy. Adding modes/liquidity/
analytics requires new engines + wiring (planned, not done).

---

# FINAL SUMMARY

1. **Overall implementation percentage:** ~55%.

2. **Fully implemented:** §1 Eligibility, §2 (website/category/placement/DA-DR matching),
   §3 Relaxation, §8 Domain tracking, §9 Reciprocal, §10 Repeat-pair, §16 Tiers (limits),
   §21 Fallback (progressive), §26 Notifications (general), §4 Ranking formula (structure).

3. **Partially implemented:** §2 (tag/country/language nuance), §4 (score wiring), §5 Visibility,
   §6 Quality, §7 Status, §11 Distribution, §12 Niche, §13 Velocity, §15 Risk, §17 Validation,
   §18 Liquidity, §19 Supply/Demand, §20 New-user boost, §22 Trust, §23 Output quality,
   §24 Credits, §27 Admin, §28 Modes, §29 UX.

4. **Missing:** §14 Pattern monitoring (automated), §25 Dispute data model, §18/§21 admin-assisted
   matching, §19 balancing logic, §29 restriction surfacing, §23 automated quality signals,
   several DB models (Dispute, MarketplaceModeConfig, RiskEvent, ManualMatchQueue).

5. **High-risk architectural issues:**
   - Schema/code drift: many declared fields never read/written (reliability, diversity,
     internalPriority, frequency counters, riskPenaltyDisputeWeight).
   - No top-level MarketplaceModule; orchestration duplicated across task services.
   - `recordApprovedDomainInteraction` copy-paste in two services.
   - `opportunityScore` reset to 0 on every completion (relies on daily cron).
   - Tier priority (`PRIORITY_BY_TIER`) computed but never applied in ranking.
   - No Dispute model; risk not fed from dispute/reject/abuse flows.

6. **Database changes required:** add `Dispute` + `DisputeStatus`; `MarketplaceModeConfig` +
   mode enum; `RiskEvent`; secondary niche on `DomainInteraction`; `ManualMatchQueue`;
   FK relations on `DomainInteraction`; backfill history; prune/repurpose unused fields.

7. **API changes required:** provider opportunity-listing endpoint (wired to engines); dispute
   CRUD; manual match-queue admin; niche-cap admin CRUD; marketplace-mode config; supply/demand
   report; harden `CreateMarketplaceOverrideDto` with class-validator; expand
   `update-scoring-config` DTO to cover used fields.

8. **New services/modules recommended:** LiquidityEngine (§18/§19), PatternMonitorEngine (§14),
   QualityEngine completing reliability/diversity (§6/§22), AnalyticsEngine (§19), top-level
   MarketplaceModule (§30), DisputeService (§25), MarketplaceModeService (§28).

9. **Suggested implementation order (highest priority first):**
   1. Wire niche-distribution + secondary niche into validation (§12) — Low/Medium, closes a
      spec gap with existing schema.
   2. Apply tier priority in ranking (§16) — Low.
   3. Persist diversityScore + compute reliabilityScore (§6/§22) — Medium.
   4. Differentiate website-status behaviour (§7) — Medium.
   5. Feed REJECTION/ABUSE/DISPUTE into risk (§15) + add `Dispute` model (§25) — Medium.
   6. Visibility priority/frequency reduction (§5) — Medium.
   7. Add `MarketplaceModeConfig` (§28) — Medium.
   8. PatternMonitorEngine (§14) — High.
   9. LiquidityEngine + admin-assisted matching (§18/§21) — High.
   10. Architecture refactor: MarketplaceModule + dedupe (§30) — High/Refactor.
   11. Supply/demand balancing + AnalyticsEngine (§19) — High.
   12. Background-job suite (score/risk/pattern/cleanup/analytics crons) — Medium.

10. **Estimated implementation complexity for every missing/partial feature:**
   - §5 Visibility priority/frequency: Medium.
   - §6 Quality (reliability/diversity/behaviour): Medium.
   - §7 Status differentiation: Medium.
   - §11/§12 Distribution/niche: Medium.
   - §13 Velocity spacing: Low.
   - §14 Pattern monitoring: Very High.
   - §15 Risk event feeding: Medium.
   - §17 Distribution gate in validation: Low.
   - §18/§21 Liquidity/admin-assisted: Very High.
   - §19 Supply/demand balancing: High.
   - §20 New-user (guarantee match): Low.
   - §22 Trust surfacing: Low.
   - §23 Output-quality automation: Medium.
   - §24 Failed/rejected credit rules + provider reward: Medium.
   - §25 Dispute model + credit adjustment: Medium.
   - §27 Manual match endpoint: Low.
   - §28 Marketplace modes: Medium.
   - §29 Restriction/UX surfacing: Low.
   - §30 Architecture refactor: Very High.
   - Background-job suite: Medium.
