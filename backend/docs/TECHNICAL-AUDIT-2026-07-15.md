# Marketplace Technical Audit Report

**Application:** backlyst-backend (NestJS, Prisma/PostgreSQL)
**Audit date:** 2026-07-15
**Method:** Static analysis of source code, Prisma schema, migrations, and controllers. Every conclusion cites a runtime call-site, schema model, controller, or service method. Where a requirement could not be verified from code it is marked "Not found in code."

**Key runtime locations verified:**
- Engines: `src/modules/task/market-algoritm/*` (MatchingEngine, MatchingRelaxationEngine, TommacayRankingService, TommacayScoringService, ValidationEngine, DistributionEngine, TierEngine, MarketplaceOverrideService, DomainInteractionRecorderService, OpportunityGuaranteeCron)
- Orchestration: `src/modules/task/provider-task/provider-task.service.ts`, `src/modules/task/task-requester/task-requester.service.ts`, `src/modules/task/admin-task/admin-task.service.ts`
- Schema: `prisma/schema/marketplace.prisma`, `prisma/schema/placement.prisma`, `prisma/schema/website.prisma`

---

## Section 1: Marketplace Eligibility

### Requirement
Website verification, ownership validation, active/deleted/suspended status, provider ownership, task eligibility, duplicate applications, own-task prevention.

### Current Implementation
- **Website verification:** `ValidationEngine.getEligibleMarketplaceWebsiteIds()` / `getEligibleProviderWebsites()` require `verificationStatus === 'VERIFIED'` (validation.engine.ts:341, 154).
- **Active status:** `isUserActive()` checks `user.status === 'ACTIVE'` (validation.engine.ts:99-105).
- **Deleted status:** eligibility requires `isDeleted === false` (validation.engine.ts:109, 133, 152).
- **Suspended status:** `isWebsiteRowMarketplaceEligible` blocks when `marketplaceStatus !== 'ACTIVE'` (blanket, validation.engine.ts:359) and when `riskScore >= 75` (validation.engine.ts:360). USER status `BANNED` is blocked by the JWT guard (referenced in docs; jwt.strategy.ts).
- **Provider ownership:** `applyToTask` verifies `authorId === providerId` on the provider website (provider-task.service.ts:302-314).
- **Task eligibility:** `getCandidateTasks` filters `lifecycleStatus` in `OPEN`/`WAITING_FOR_APPLICANTS` (matching.engine.ts:15, 207-211).
- **Duplicate applications:** `placementApplications: { none: { providerId } }` in candidate query (matching.engine.ts:211) plus explicit guard (provider-task.service.ts:350-353).
- **Own-task prevention:** `applyToTask` throws if `task.requesterId === providerId` (provider-task.service.ts:297); `validateTransition` pushes `OWN_TASK` (validation.engine.ts:448-454).

### Evidence
Files: validation.engine.ts (99-169, 338-368, 389-528), matching.engine.ts (15, 117-225), provider-task.service.ts (288-353), task-requester.service.ts (645-659).

### Status
✅ Fully Implemented

### Gap Analysis
None for the listed sub-items. Note: suspended *user* status is enforced at the JWT layer, not in the marketplace validation path; this is acceptable but worth documenting.

### Recommendation
No change required.

---

## Section 2: Matching Engine

### Requirement
website-based, category, tag, country, language, placement type, DA/DR compatibility, progressive relaxation, verification never relaxed.

### Current Implementation
- **website-based matching:** root-domain normalization + same-domain exclusion; `buildHardRuleCandidates` skips `providerWebsite.rootDomain === requesterDomain` (matching.engine.ts:274-285).
- **category matching:** `categoryExact` via `primaryCategoryKey` equality (matching.engine.ts:319-321).
- **tag matching:** `tagOverlap` between provider/requester `marketplaceTagKeys` (matching.engine.ts:313-325).
- **country/language:** `countryExact`/`languageExact` (matching.engine.ts:326-329).
- **placement type:** `where.placementType = filters.placementType` (matching.engine.ts:214).
- **DA/DR compatibility:** `authorityMeets` vs `requiredDomainRating` (matching.engine.ts:330-334) — applied as a soft authority attribute, and as a hard Moz DA check in `applyToTask` (provider-task.service.ts:335-347).
- **progressive relaxation:** loop level 0..maxRelaxationLevel (matching.engine.ts:89-98), delegated to MatchingRelaxationEngine.
- **verification never relaxed:** candidate websites come only from verified-eligible sets; relaxation only relaxes category/tag/country/language, never verification/ownership (matching.engine.ts:35-43, 117-148).

### Evidence
Files: matching.engine.ts (117-301, 304-392), matching-relaxation.engine.ts, validation.engine.ts (129-169, 338-368).

### Status
✅ Fully Implemented

### Gap Analysis
Link attribute (`linkAttribute`) is accepted as a filter on task query (matching.engine.ts:215) but is not part of the compatibility scoring. PlacementType is filtered but not scored.

### Recommendation
Optionally fold `linkAttribute` and `placementType` into `calculateCompatibility` for stronger ranking signal. Not required by spec.

---

## Section 3: Dynamic Relaxation

### Requirement
Exact → Related → Broad → Fallback progression.

### Current Implementation
`MatchingRelaxationEngine.apply(level)` maps levels to stages: 0=EXACT, 1=RELATED, 2/3=BROAD, >=4=FALLBACK (matching-relaxation.engine.ts:24-35, 43-82). Truth table preserved: EXACT requires category+tags+country+language; RELATED relaxes tags to PARTIAL; BROAD relaxes to category-related; FALLBACK is passthrough. MatchingEngine iterates until `selected.length >= minViableMatches` or level cap (matching.engine.ts:89-98).

### Evidence
Files: matching-relaxation.engine.ts; matching.engine.ts:89-98, 384-392.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## Section 4: Ranking Engine

### Requirement
Compatibility, Opportunity, Visibility, Reputation, Boost, Exposure Penalty, Risk Penalty, Final formula.

### Current Implementation
`TommacayRankingService.rankAndFilter`:
- Compatibility = `candidate.compatibilityScore` (from matching engine).
- Opportunity/Visibility/Reputation = profile scores (or override values).
- Boost Score = `(boostFactor + newWebsiteBoost) * 20` (ranking.service.ts:83-87).
- Exposure Penalty = `exposureCount7d * exposurePenaltyPerTaskView` (ranking.service.ts:88-89).
- Risk Penalty = `(riskScore/100) * (riskPenaltyDisputeWeight if lastRiskReason==='DISPUTE' else riskPenaltyRejectionWeight)` (ranking.service.ts:90-96).
- Authority Penalty = 10 if `authority === 'BELOW'` (ranking.service.ts:101-102).
- Force Match Bonus = `forceMatchBonus` (ranking.service.ts:97-100).
- **Final** = `weightedSum * tierPriority - exposurePenalty - riskPenalty - authorityPenalty + forceMatchBonus` (ranking.service.ts:108-119).
- Suppressed / daily-capped candidates filtered out (ranking.service.ts:57-70).

### Evidence
Files: ranking.service.ts (15-143).

### Status
✅ Fully Implemented

### Gap Analysis
None of the required score components are missing. All weights are configurable via `MarketplaceScoringConfig`.

### Recommendation
No change.

---

## Section 5: Visibility Control

### Requirement
visibility weighting, priority reduction, frequency reduction, non-destructive visibility control.

### Current Implementation
- **visibility weighting:** `visibilityScore * visibilityWeight` in ranking (ranking.service.ts:111).
- **priority reduction:** `internalPriorityScore` field exists (marketplace.prisma:37) but is **never read or written at runtime** (dead field).
- **frequency reduction:** exposure penalty (`exposureCount7d`) and `maxProviderMatchesPerDay` cap (ranking.service.ts:66-70, 198-201). `maxRequesterExposurePerDay` config (marketplace.prisma:166) is **never enforced**.
- **non-destructive:** all changes are score/flag updates, not deletes (scoring.service.ts:98-133).

### Evidence
Files: ranking.service.ts (57-70, 88-89, 111); marketplace.prisma:37,166; scoring.service.ts:98-133.

### Status
🟡 Partially Implemented

### Gap Analysis
`internalPriorityScore` and `maxRequesterExposurePerDay` are declared but unused. Requester-side exposure capping is absent.

### Recommendation
Wire `internalPriorityScore` into the rank formula (or drop it). Enforce `maxRequesterExposurePerDay` or remove it.

---

## Section 6: Website Quality

### Requirement
tracks completion, activity, reliability, interaction diversity, behaviour patterns, quality penalties.

### Current Implementation
- **completion:** `completionRate`, `completedInteractions`, `failedInteractions`, `totalInteractions` (marketplace.prisma:48-54; scoring.service.ts:52-58).
- **activity:** `lastShownAt`, `lastMatchedAt`, `lastSelectedAt`, `lastCompletedAt` updated in ranking/scoring (ranking.service.ts:174-180; scoring.service.ts:124-131).
- **reliability:** `reliabilityScore` field exists (marketplace.prisma:38) but is **never updated or read** at runtime (dead field).
- **interaction diversity:** `diversityScore` computed by `DistributionEngine.computeDiversityScore` and persisted (distribution-engine.service.ts:23-53; scoring.service.ts:48-50,107).
- **behaviour patterns:** Not found in code. No behaviour-pattern signals or model.
- **quality penalties:** `avgQualityRating`/`qualityRatingSum` tracked (scoring.service.ts:59-69); `calculateReputationScore` applies failure/quality penalty (scoring.utils.ts:103-115); auto-suppression when `completionRate < 0.4 && totalInteractions >= 10` (scoring.service.ts:95-131).

### Evidence
Files: marketplace.prisma:38,40,48-54; scoring.service.ts; scoring.utils.ts; distribution-engine.service.ts.

### Status
🟡 Partially Implemented

### Gap Analysis
`reliabilityScore` is a dead field. Behaviour-pattern tracking is absent.

### Recommendation
Implement reliabilityScore from completion/success data, or drop the column. Add behaviour-pattern signals if required by spec.

---

## Section 7: Website Status

### Requirement
Active, Low Priority, Limited Access, Under Review, Restricted, Suspended.

### Current Implementation
- Enum `WebsiteMarketplaceStatus { ACTIVE, LOW_PRIORITY, LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED, SUSPENDED }` exists (marketplace.prisma:10-17) and column `marketplaceStatus` (marketplace.prisma:36) with index (marketplace.prisma:89).
- However, validation only checks `marketplaceStatus !== 'ACTIVE'` as a blanket block (validation.engine.ts:359, 523). There is **no per-status differentiated behaviour** (e.g. LOW_PRIORITY does not reduce priority; UNDER_REVIEW is not kept-in-existing-but-excluded-from-new).

### Evidence
Files: marketplace.prisma:10-17,36,89; validation.engine.ts:359,516-527.

### Status
🟡 Partially Implemented

### Gap Analysis
Enum and column exist; only ACTIVE-vs-not-ACTIVE is enforced. The five non-ACTIVE statuses are indistinguishable in behaviour.

### Recommendation
Implement per-status rules: LOW_PRIORITY → reduce visibility/priority weight; LIMITED_ACCESS → frequency cut; UNDER_REVIEW → exclude from new matches but keep existing; RESTRICTED → reduced exposure; SUSPENDED → full block.


---

## Section 8: Domain Relationship Tracking

### Requirement
relationship history, root-domain tracking, interaction logging, timestamps.

### Current Implementation
- Root-domain tracking: Website.rootDomain (website.prisma:54); ValidationEngine.normalizeRootDomain with two-part public-suffix handling (validation.engine.ts:29-74).
- Interaction logging: DomainInteraction model (marketplace.prisma:268-301) written by DomainInteractionRecorderService.record on completion/force-complete (domain-interaction-recorder.service.ts:31-148).
- Relationship history: DomainPairStat upserted with lastSourceDomain, lastTargetDomain, lastInteractionAt, repeat/reciprocal cooldown timestamps, interactionCount (domain-interaction-recorder.service.ts:114-147).
- Timestamps: completedAt/createdAt on DomainInteraction; cooldown fields on DomainPairStat.
- Secondary niche capture: recorder writes sourceSecondaryCategoryKey/targetSecondaryCategoryKey (domain-interaction-recorder.service.ts:108-109,127-129).

### Evidence
Files: domain-interaction-recorder.service.ts; website.prisma:54; marketplace.prisma:268-301; validation.engine.ts:29-74.

### Status
✅ Fully Implemented

### Gap Analysis
DomainInteraction uses string FKs (sourceWebsiteId, targetWebsiteId) without Prisma relations - no referential integrity. Relation to PlacementTask is by string taskId.

### Recommendation
Add explicit relations/indexes on DomainInteraction.sourceWebsiteId, targetWebsiteId, taskId.

---

## Section 9: Reciprocal Rules

### Requirement
reciprocal prevention; time window; configuration; enforcement point.

### Current Implementation
- Direction-aware prevention: ValidationEngine.isDirectionAllowed treats same-direction as REPEAT and reversed as RECIPROCAL (validation.engine.ts:614-630). getCooldownBlockedPairKeys blocks reversed-direction pairs via reciprocalCooldownUntil (validation.engine.ts:217-244).
- Time window: getCooldownUntil(days) (validation.engine.ts:95-97); reciprocal default 120 days (validation.engine.ts:21), configurable via MarketplaceScoringConfig.reciprocalCooldownDays (marketplace.prisma:182; getCooldownDays validation.engine.ts:372-381).
- Enforcement point: validateTransition LEVEL 2 (validation.engine.ts:457-472) and buildHardRuleCandidates (matching.engine.ts:263-293).

### Evidence
Files: validation.engine.ts:20-21,95-97,217-244,372-381,457-472,614-665; marketplace.prisma:182.

### Status
✅ Fully Implemented

### Gap Analysis
None. Reciprocal cooldown is configurable and enforced both at candidate generation and transition validation.

### Recommendation
No change.

---

## Section 10: Repeat Pair Rules

### Requirement
cooldown between identical domain pairs.

### Current Implementation
DomainPairStat.repeatPairCooldownUntil set on each interaction (domain-interaction-recorder.service.ts:114-147). isDirectionAllowed blocks same-direction repeat while repeatPairCooldownUntil > now (validation.engine.ts:614-630). Default 90 days (validation.engine.ts:20), configurable via repeatPairCooldownDays (marketplace.prisma:181). Enforced in matching + validation.

### Evidence
Files: validation.engine.ts:20,187-244,370-381,614-665; marketplace.prisma:181; domain-interaction-recorder.service.ts:114-147.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## Section 11: Distribution Rules

### Requirement
domain diversity, repeated pair reduction, network concentration prevention.

### Current Implementation
- Domain diversity: DistributionEngine.computeDiversityScore (0-100 ratio of distinct counterparts; distribution-engine.service.ts:23-53) persisted to diversityScore (scoring.service.ts:48-50,107).
- Repeated pair reduction: filterNewDomains enforces forceNewDomainNext to avoid repeating counterpart domains (distribution-engine.service.ts:61-97).
- Network concentration: diversityScore is computed but NOT used in ranking or validation - persisted to profile but never read by ranking.service.ts or validation.engine.ts. No explicit network-concentration cap/flag beyond the niche cap.

### Evidence
Files: distribution-engine.service.ts:23-97; scoring.service.ts:48-50,107; ranking.service.ts (no diversity read).

### Status
🟡 Partially Implemented

### Gap Analysis
Diversity is computed and stored but never consumed by ranking/scoring/validation, so it has no behavioural effect. forceNewDomainNext is set by the opportunity cron (opportunity-guarantee.cron.ts:49) but filterNewDomains is never called from the live matching/ranking path.

### Recommendation
Consume diversityScore in ranking and wire filterNewDomains into candidate filtering.

---

## Section 12: Niche Distribution

### Requirement
primary niche, secondary niche, distribution limits.

### Current Implementation
- Primary/secondary niche: Website.primaryCategoryKey/secondaryCategoryKey (website.prisma:55-58).
- Distribution limits: NicheDistributionCap model (marketplace.prisma:341-355) and DistributionEngine.isNicheWithinCap (distribution-engine.service.ts:103-139). DomainInteraction carries source/targetSecondaryCategoryKey (marketplace.prisma:285-290).
- Validation integration: validateTransition LEVEL 5 calls isNicheWithinCap and flags NICHE_CAP_EXCEEDED as a non-blocking restriction (validation.engine.ts:534-560).

### Evidence
Files: website.prisma:55-58; marketplace.prisma:285-290,341-355; distribution-engine.service.ts:103-139; validation.engine.ts:534-560.

### Status
🟡 Partially Implemented

### Gap Analysis
Cap enforcement is non-blocking (restriction only). No seed data or admin API populates NicheDistributionCap, so the cap is effectively inert unless an admin creates rows.

### Recommendation
Seed default niche caps; optionally promote NICHE_CAP_EXCEEDED to a blocking rule under certain marketplace modes.

---

## Section 13: Velocity Rules

### Requirement
weekly limits, daily spacing, interaction frequency.

### Current Implementation
- Daily spacing/cap: ranking.service.ts filters candidates where dailyMatches >= maxProviderMatchesPerDay (default 3, ranking.service.ts:66-70,201). getDailyProviderWebsiteCounts counts assigned tasks today (ranking.service.ts:212-234).
- Weekly limits: validateTransition LEVEL 3 enforces weeklyInteractionLimit via TierEngine.countWeeklyInteractions (validation.engine.ts:489-513; tier-engine.service.ts:72-87).
- Interaction frequency: matchCount7d, applicationCount7d, exposureCount7d counters exist (marketplace.prisma:68-70) but exposureCount7d is the only one updated in the live flow (ranking.service.ts:174-180); matchCount7d/applicationCount7d have no verified write path.

### Evidence
Files: ranking.service.ts:66-70,201,212-234; validation.engine.ts:475-513; tier-engine.service.ts:72-87; marketplace.prisma:68-73.

### Status
🟡 Partially Implemented

### Gap Analysis
Daily cap enforced in ranking; weekly cap enforced in validation. matchCount7d/applicationCount7d counters declared but not maintained, so frequency rules depending on them are inert.

### Recommendation
Increment matchCount7d/applicationCount7d on assignment/application. Consider a dedicated VelocityEngine.

---

## Section 14: Pattern Monitoring

### Requirement
repeat detection, reciprocal detection, cluster detection, group concentration.

### Current Implementation
- Repeat/reciprocal detection: partially covered by cooldowns in DomainPairStat/ValidationEngine.
- Cluster detection: Not found in code.
- Group concentration: Not found in code. No cluster/group-detection service or model.

### Evidence
ValidationEngine provides pair-level cooldowns only. No PatternMonitoringEngine, no cluster/group model. (Referenced in docs/planning only.)

### Status
❌ Missing

### Gap Analysis
Only pairwise reciprocal/repeat is detected. No cluster (many domains colluding) or group-concentration detection.

### Recommendation
Introduce a PatternMonitoringEngine using DomainPairStat/DomainInteraction aggregates to detect clusters and group concentration; emit signals to marketplaceValidationLog.

---

## Section 15: Risk Engine

### Requirement
risk score, risk calculation, risk penalties.

### Current Implementation
- Risk score: WebsiteMatchingProfile.riskScore (marketplace.prisma:39).
- Risk calculation: calculateRiskScore (scoring.utils.ts:52-74) applies time-decay + event deltas (DISPUTE 25, REJECTION 15, FAILURE 10, ABUSE 40, SUCCESS -8; decay 1.5/day up to 90 days).
- Risk penalties: ranking applies riskPenalty (ranking.service.ts:90-96); validation blocks at riskScore >= 75 (validation.engine.ts:360,525).
- Risk event log: RiskEvent model exists (marketplace.prisma:403-413) but prisma.riskEvent has zero runtime write call-sites - risk is only stored as a scalar; the log is never written.

### Evidence
Files: scoring.utils.ts:19-74; ranking.service.ts:90-96; validation.engine.ts:360,525; marketplace.prisma:39,403-413.

### Status
🟡 Partially Implemented

### Gap Analysis
Risk calculation and its use in ranking/validation are live, but the auditable RiskEvent log is never written, so risk history is not replayable. DISPUTE risk event is never raised (no prisma.dispute; reviewTask DISPUTED path does not call calculateRiskScore with DISPUTE).

### Recommendation
Write a RiskEvent on every risk delta. Wire the DISPUTE risk event into the dispute resolution path.

---

## Section 16: Tier System

### Requirement
Free/Silver/Gold/Platinum/Enterprise, weekly limits, priority, tier enforcement.

### Current Implementation
- Tiers: TierEngine maps WEEKLY_LIMIT_BY_TIER = {FREE:5, SILVER:15, GOLD:40, PLATINUM:100, ENTERPRISE:250} and PRIORITY_BY_TIER = {FREE:1, SILVER:1.2, GOLD:1.5, PLATINUM:1.8, ENTERPRISE:2} (tier-engine.service.ts:16-31).
- Weekly limits: enforced via resolveTierLimits + countWeeklyInteractions in validateTransition (validation.engine.ts:489-513).
- Priority: tierPriority applied as multiplier in final score (ranking.service.ts:104-106,115).
- Tier enforcement: resolveTier reads active subscription plan.tier (tier-engine.service.ts:39-46).

### Evidence
Files: tier-engine.service.ts:16-87; ranking.service.ts:104-106,115; validation.engine.ts:489-513.

### Status
✅ Fully Implemented

### Gap Analysis
None for the listed sub-items. Tier correctly resolved from subscription and applied to both priority and weekly cap.

### Recommendation
No change.

---

## Section 17: Validation Engine

### Requirement
validation before approval: eligibility, cooldowns, risk, velocity, tier, distribution.

### Current Implementation
ValidationEngine.validateTransition evaluates 5 levels in order, fails closed, invoked at multiple stages:
- PROVIDER_APPLICATION (provider-task.service.ts:321-333)
- TASK_ACCEPTANCE (task-requester.service.ts:593-595 - re-validation at selection)
- INTERACTION_APPROVAL (task-requester.service.ts:974-987 - re-validation at approve)
- ADMIN_FORCE (admin-task.service.ts:899-901)
Levels: ELIGIBILITY (1), GOVERNANCE/cooldowns (2, overridable), CAPACITY daily+weekly/tier (3), BEHAVIOUR risk+status (4), OPTIMIZATION niche cap (5). Overrides skip only the named rule; eligibility/ownership/security never overridable (validation.engine.ts:386-416).

### Evidence
Files: validation.engine.ts:386-605; provider-task.service.ts:321-333; task-requester.service.ts:593-595,964-987; admin-task.service.ts:899-901.

### Status
✅ Fully Implemented

### Gap Analysis
Re-validation at acceptance/approval was hardened (the enforceRevalidation* rollout guard was removed - validation.engine.ts:410-414). Pattern/network monitoring (LEVEL 4 deferred comment) is the only non-covered sub-area, deferred to Section 14.

### Recommendation
No change beyond adding pattern monitoring (Section 14) into LEVEL 4.

---

## Section 18: Liquidity Protection

### Requirement
fallback behaviour, empty result prevention, admin-assisted matching.

### Current Implementation
- Fallback behaviour: matching always relaxes to level 4 before returning (matching.engine.ts:89-98); if empty, returns [] with MatchingAuditLog.marketplaceMode = 'LOW_POOL' (matching.engine.ts:42-73).
- Empty result prevention: progressive relaxation prevents hard no results within relaxed bounds, but a truly empty pool still returns [] (no synthetic fill).
- Admin-assisted matching: ManualMatchQueue model exists (marketplace.prisma:426-442) but prisma.manualMatchQueue has zero runtime write call-sites - never written by any service or API.

### Evidence
Files: matching.engine.ts:42-114; marketplace.prisma:426-442.

### Status
🟡 Partially Implemented

### Gap Analysis
Fallback relaxation is present, but there is no admin-assisted match injection workflow (no API, no consumer). On persistent LOW_POOL the engine just returns empty with an audit entry.

### Recommendation
Add an admin endpoint that creates ManualMatchQueue rows and a consumer; surface relaxed matches to providers on LOW_POOL.

---

## Section 19: Supply vs Demand

### Requirement
marketplace balancing, provider/requester monitoring.

### Current Implementation
placementTask counts and opportunity impressions are recorded, and admin-dashboard/analytics report participant activity (admin-analytics). However there is NO supply/demand balancing service - no SupplyDemandSnapshot model, no logic that adjusts visibility/boost toward under-supplied segments. marketplace.prisma references are signal/config only.

### Evidence
prisma.supplyDemandSnapshot returns no results. No balancing service found. Admin analytics read-only.

### Status
❌ Missing

### Gap Analysis
Supply/demand monitoring is not implemented as a balancing mechanism.

### Recommendation
Add a LiquidityEngine + SupplyDemandSnapshot that reads supply (provider websites/tasks open) vs demand (requester tasks) and nudges visibility/boost.

---

## Section 20: New User Boost

### Requirement
early visibility boost, first-success optimisation.

### Current Implementation
- WebsiteMatchingProfile.firstSuccessBoostActive (default true) grants newWebsiteBoostFactor (default 2.5) in ranking until first success (ranking.service.ts:81-87; marketplace.prisma:44,157).
- ScoringService.updateScoresAfterTask clears firstSuccessBoostActive on first successful completion (scoring.service.ts:119-123).
- OpportunityGuaranteeCron boosts neglected sites (forceMatchNext after 168h, opportunityScore from hours-since-last-match) (opportunity-guarantee.cron.ts:28-53).

### Evidence
Files: ranking.service.ts:81-87; scoring.service.ts:119-123; marketplace.prisma:44,157; opportunity-guarantee.cron.ts.

### Status
✅ Fully Implemented

### Gap Analysis
None. The new-user/first-success boost is consumed in ranking and cleared on first success.

### Recommendation
No change.

---

## Section 21: Fallback Matching

### Requirement
progressive fallback instead of immediate no results.

### Current Implementation
MatchingEngine.findCandidates iterates relaxation levels and only returns when selected.length >= minViableMatches (config minViableMatches, default 10) or level cap reached (matching.engine.ts:82-98). MatchingRelaxationEngine provides FALLBACK passthrough (matching-relaxation.engine.ts:33-35,63-65).

### Evidence
Files: matching.engine.ts:82-98; matching-relaxation.engine.ts.

### Status
✅ Fully Implemented

### Gap Analysis
Progressive fallback is implemented. Only gap is lack of admin-assisted fill on true empty pool (see Section 18).

### Recommendation
No change (see Section 18 for admin-assisted extension).

---

## Section 22: Trust Indicators

### Requirement
completed interactions, reliability, user-visible trust metrics.

### Current Implementation
- Completed interactions: completedInteractions, successfulInteractions tracked (marketplace.prisma:43,48; scoring.service.ts:52-56,124-126).
- Reliability: reliabilityScore field exists but is NEVER computed/read (dead field) - marketplace.prisma:38.
- User-visible trust metrics: Not found in code. No API/DTO surfaces trust score to users (dashboards do not expose completedInteractions/successfulInteractions as a trust signal).

### Evidence
Files: marketplace.prisma:38,43,48; scoring.service.ts:52-56,124-126. No dashboard/DTO surfacing found.

### Status
🟡 Partially Implemented

### Gap Analysis
Data exists but reliability is dead and nothing is surfaced to users as a trust indicator.

### Recommendation
Compute reliabilityScore (success ratio) and expose a trust metric in provider/requester dashboards.

---

## Section 23: Output Quality

### Requirement
submission review, quality penalties.

### Current Implementation
- Submission review: reviewTask supports APPROVE/REJECT/REQUEST_REVISION (task-requester.service.ts:965-1200).
- Quality penalties: avgQualityRating/qualityRatingSum tracked; updateScoresAfterTask applies reputation/quality delta (scoring.service.ts:59-69,103-115). Revision count recorded in task flow but not automatically fed to risk.

### Evidence
Files: task-requester.service.ts:965-1200; scoring.service.ts; scoring.utils.ts:103-115.

### Status
🟡 Partially Implemented

### Gap Analysis
Quality ratings affect reputation but are not linked to a dedicated output-quality risk/penalty signal (e.g. repeated revisions -> risk).

### Recommendation
Feed revision count / proof-validity into calculateRiskScore/calculateReputationScore during review.

---

## Section 24: Credit System

### Requirement
deduction, refund, failed task handling, rejected task handling.

### Current Implementation
CreditTaskService (credit-task.service.ts) implements deductTaskCredit, refundTaskCredit, rewardProviderCredit with wallet-type resolution and CreditLog writes. Task creation reserves credits (reservedCreditAmount); cancellation refunds reserved amount; approval rewards provider from finalCreditCost/creditCost (task-requester.service.ts:418-420, 1108-1159). Failed task handling: updateScoresAfterTask(websiteId, wasSuccessful=false) applies failure penalty (scoring.service.ts). Rejected application: marked REJECTED (provider-task.service.ts:350-353); rejected submission routes to DISPUTED/REVISION_REQUESTED. Provider reward only on COMPLETED/approve.

### Evidence
Files: credit-task.service.ts; task-requester.service.ts:418-420,1108-1173; provider-task.service.ts:350-353; scoring.service.ts.

### Status
✅ Fully Implemented

### Gap Analysis
Core credit flows (deduct/refund/reward/reserve) implemented and wallet-type aware. Risk score on failure updated; explicit credit reversal on dispute handled by admin credit-adjustment rather than an automated dispute path (see Section 25).

### Recommendation
No change beyond integrating the dispute credit-adjustment path (Section 25).

---

## Section 25: Dispute System

### Requirement
disputes, resolution, credit adjustment.

### Current Implementation
- Dispute model: Dispute model exists (marketplace.prisma:380-400) with status, reason, evidence, creditAdjustmentId, resolvedById. However prisma.dispute has zero runtime write call-sites - disputes tracked only as a TASK_DISPUTED lifecycle status, not as Dispute records.
- Resolution: admin resolveDispute force-approves/rejects the task (admin-task.service.ts:605-608) but creates no Dispute row and no dispute-specific CreditLog/creditAdjustmentId.
- Credit adjustment: admin add-credit-adjustment exists (admin-task) but is not tied to Dispute.

### Evidence
Files: marketplace.prisma:380-400; admin-task.service.ts:605-608; provider-task.service.ts (review DISPUTED path). prisma.dispute write not found in source.

### Status
❌ Missing

### Gap Analysis
The Dispute entity and creditAdjustmentId are never populated. Dispute lifecycle is reduced to a task status flag with no record, no resolution entity, and no automated credit adjustment.

### Recommendation
Create Dispute records on dispute open; write resolution + explicit CreditLog/CreditAdjustment; raise a DISPUTE RiskEvent.

---

## Section 26: Notification System

### Requirement
opportunity alerts, task updates, acceptance, rejection, reminders.

### Current Implementation
TaskNotificationService with TaskNotificationTrigger enum covering REQUESTER_* and PROVIDER_* events: task created, application received, provider selected, started work, proof submitted, completed, disputed, cancelled, deadline extension, application accepted/rejected, task assigned/revision/approved/rejected/completed, opportunity (PROVIDER_NEW_OPPORTUNITY), cancellation, status updated (task-notification-trigger.enum.ts; task-notification-map.util.ts). Triggered from provider-task/requester/admin services.

### Evidence
Files: task-notification-trigger.enum.ts; task-notification-map.util.ts; provider-task.service.ts (687+); task-requester.service.ts (1183-1200); admin-task.service.ts (688+).

### Status
✅ Fully Implemented

### Gap Analysis
All listed notification types exist. Reminders map to deadline-extension / status-update triggers. No standalone inactivity reminder cron found, but triggered reminders are present.

### Recommendation
Optional: add a reminder cron for stale tasks. Not required by spec.

---

## Section 27: Admin Controls

### Requirement
manual matching, override, priority adjustment, restriction management, marketplace monitoring.

### Current Implementation
- Override: MarketplaceOverride model + MarketplaceOverrideService (create/revoke/list/resolve) supporting BOOST/SUPPRESS/FORCE_MATCH/SCORE_OVERRIDE/PENALTY; consumed by ranking + matching + validation at runtime (marketplace-override.service.ts; ranking.service.ts; matching.engine.ts; validation.engine.ts). Admin override CRUD controllers exist (admin-marketplace-override).
- Restriction management: isSuppressed/suppressedUntil suppression via SUPPRESS override (marketplace-override.service.ts).
- Priority adjustment: internalPriorityScore field exists but has NO write path (dead).
- Manual matching: Not found in code (Section 18).
- Marketplace monitoring: admin-analytics + admin-dashboard + admin-marketplace-visibility (compliance list) exist (admin module).

### Evidence
Files: marketplace-override.service.ts; marketplace.prisma:1-7,192-230; admin-marketplace-override/*; ranking.service.ts; validation.engine.ts; admin-marketplace-visibility/*; marketplace.prisma:37.

### Status
🟡 Partially Implemented

### Gap Analysis
Overrides are live and consumed. Missing: manual matching (Section 18), priority-adjustment write path (internalPriorityScore), and a status-management admin action that sets marketplaceStatus per Section 7.

### Recommendation
Add a priority-adjustment endpoint (write internalPriorityScore), a status-management endpoint (set marketplaceStatus), and manual-match endpoint (Section 18).

---

## Section 28: Marketplace Modes

### Requirement
Early Stage Mode, Scaling Mode, configuration.

### Current Implementation
MarketplaceMode enum + MarketplaceModeConfig model exist (marketplace.prisma:374-423). However prisma.marketplaceModeConfig has zero runtime read/write call-sites in the application code - the only marketplaceMode used at runtime is a transient string 'NORMAL'/'LOW_POOL' computed in MatchingEngine.findCandidates (matching.engine.ts:84-85) and never persisted or configurable. No Early-Stage/Scaling behaviour is wired.

### Evidence
Files: marketplace.prisma:374-423; matching.engine.ts:84-85. prisma.marketplaceModeConfig not called in src.

### Status
❌ Missing

### Gap Analysis
Modes are declared in schema but never read; the runtime mode is a hardcoded transient string. No mode-driven relaxation, fallback, or monitoring differences.

### Recommendation
Implement a MarketplaceModeService that reads MarketplaceModeConfig and injects mode into matching/ranking/fallback/monitoring.

---

## Section 29: User Experience

### Requirement
fallback messages, hidden restrictions, blocked opportunities.

### Current Implementation
- Fallback messages: SAFE_MESSAGES (validation-result.ts) provide generic user-facing messages; returned to client on rejection (provider-task.service.ts:331-333).
- Hidden restrictions: failed rules are internal-only (failedRules never returned to client; validation-result.ts:17); only publicMessage exposed.
- Blocked opportunities: empty results return [] (matching.engine.ts:62-73) with a safe message; no explicit you are blocked because X surfaced (by design - SAFE_MESSAGES).

### Evidence
Files: validation-result.ts; provider-task.service.ts:331-333; matching.engine.ts:42-73.

### Status
✅ Fully Implemented

### Gap Analysis
Safe-message UX implemented. No explicit blocked-opportunities list endpoint, but the design hides restriction reasons (intentional per Section 13 SAFE_MESSAGES).

### Recommendation
No change (intentional safe-message design).

---

## Section 30: System Architecture

### Requirement
separate services/modules for each engine; identify mixed responsibilities.

### Current Implementation
Engines exist as @Injectable() services under src/modules/task/market-algoritm/: MatchingEngine, MatchingRelaxationEngine, TommacayRankingService, TommacayScoringService, ValidationEngine, DistributionEngine, TierEngine, MarketplaceOverrideService, DomainInteractionRecorderService, OpportunityGuaranteeCron. They are orchestrated by provider-task.service.ts, task-requester.service.ts, and admin-task.service.ts.

### Evidence
Files: src/modules/task/market-algoritm/*; provider-task.service.ts; task-requester.service.ts; admin-task.service.ts.

### Status
⚠ Needs Refactor

### Gap Analysis
Responsibilities are mixed: task lifecycle, credit, notifications, scoring, and validation are intertwined in provider-task/requester/admin services. No cohesive Marketplace module. Some duplicated logic (recordApprovedDomainInteraction originally lived in two services before being consolidated into DomainInteractionRecorderService). ScoringService/RankingService/ValidationEngine are well separated, but liquidity, pattern monitoring, supply/demand, risk-log, and modes are absent or dead. Risk of code duplication between services that re-implement checks before centralized call-sites were introduced.

### Recommendation
Extract a dedicated MarketplaceModule aggregating the engines; keep engines as single-responsibility units; ensure no service re-implements constraint checks (all go through validateTransition). Introduce the missing engines (LiquidityEngine, PatternMonitoringEngine, RiskEvent log, MarketplaceModeService, SupplyDemandSnapshot service).

---

# DATABASE AUDIT

Audit of `prisma/schema/*.prisma` (marketplace, placement, website, credit, etc.) against the spec.

## Models present (relevant)
WebsiteMatchingProfile, OpportunityImpression, MatchingAuditLog, MarketplaceScoringConfig, MarketplaceOverride, MarketplaceOverrideAudit, DomainInteraction, DomainPairStat, NicheDistributionCap, Dispute, RiskEvent, MarketplaceModeConfig, ManualMatchQueue (marketplace.prisma); PlacementTask, PlacementApplication, TaskFlow, WebsiteVerifiedPlacement (placement.prisma); Website, WebsiteVerification, WebsiteCategoryKey, WebsiteMargetPlaceTag (website.prisma).

## Missing models
- SupplyDemandSnapshot (Section 19) - absent.
- PatternMonitoring / cluster / group-concentration aggregate models (Section 14) - absent.
- RiskEvent exists but is never written.

## Missing tables / relations
- DomainInteraction uses string FKs (sourceWebsiteId, targetWebsiteId, taskId) with NO Prisma relations or indexes. Add explicit relations to Website and PlacementTask and index taskId, sourceWebsiteId, targetWebsiteId.
- DomainPairStat has no relation to Website.

## Missing indexes (recommended additions)
- Website.rootDomain (used heavily in normalization/joins; website.prisma:54).
- PlacementTask.requesterWebsiteId (placement.prisma:4 - has index).
- DomainInteraction.sourcePrimaryCategoryKey / targetPrimaryCategoryKey / sourceSecondaryCategoryKey / targetSecondaryCategoryKey (used by DistributionEngine.isNicheWithinCap; marketplace.prisma:285-290).
- MarketplaceOverride.websiteId + status + activeFrom (resolved at runtime per website; marketplace.prisma:192-230).
- MatchingAuditLog.marketplaceMode / timestamp (already in migrations).

## Missing enums
- None structurally missing; MarketplaceMode, DisputeStatus, RiskEventType, WebsiteMarketplaceStatus, MarketplaceOverrideType all present.

## Missing constraints
- DomainInteraction/Website FK integrity (string FKs, no relation).
- No DB-level NOT NULL / CHECK on cooldown timestamps beyond defaults.

## Dead / unused columns (declare-but-never-use in runtime code)
- WebsiteMatchingProfile.reliabilityScore (never read/written).
- WebsiteMatchingProfile.internalPriorityScore (no write path).
- WebsiteMatchingProfile.forceNewDomainNext / forceNewDomainUntil (set in cron, not consumed in live matching/ranking).
- MarketplaceScoringConfig.maxRequesterExposurePerDay (never enforced).
- MarketplaceScoringConfig.enforceRevalidationAtAcceptance/Approval (vestigial fields after guard removal; validation.engine.ts:410-414 comments).

## Suggested structural changes (minimal, spec-driven)
1. Add relations + indexes on DomainInteraction (sourceWebsiteId, targetWebsiteId, taskId) and DomainPairStat.ngram/niche columns.
2. Seed NicheDistributionCap rows + add admin CRUD if caps are to be enforced.
3. Add SupplyDemandSnapshot model + PatternMonitoring aggregate (Sections 14, 19).
4. Either wire or drop dead columns (reliabilityScore, internalPriorityScore, maxRequesterExposurePerDay, vestigial enforcement flags).

---

# API AUDIT

## Existing marketplace-relevant endpoints (confirmed via controllers)
- ProviderTaskController.getProviderOpportunities -> matchingEngine.findCandidates + rankingService.rankAndFilter + recordOpportunityImpressions (provider-task.service.ts:131). LIVE.
- ProviderTaskController.applyToTask -> validateTransition(PROVIDER_APPLICATION) (provider-task.service.ts:288-333). LIVE.
- TaskRequesterController.selectProvider -> validateTransition(TASK_ACCEPTANCE) (task-requester.service.ts:593-595). LIVE.
- TaskRequesterController.reviewTask -> validateTransition(INTERACTION_APPROVAL) on approve (task-requester.service.ts:974-987). LIVE.
- AdminMarketplaceOverrideController (create/revoke/list/resolve overrides). LIVE.
- AdminMarketplaceConfigController (scoring config upsert). LIVE.
- AdminMarketplaceVisibilityController (compliance list). LIVE.
- AdminTaskController (force-complete, freeze, credit-adjust, resolve-dispute, flag-abuse). LIVE.
- TaskRequesterController (create-task, cancel, review, select-provider, deadline). LIVE.
- Notification / credit / website-verification controllers present.

## Missing endpoints
- Marketplace mode config read/set (Section 28) - no consumer; MarketplaceModeConfig endpoints absent in src.
- Manual match queue create/administer (Section 18) - absent.
- Priority-adjustment endpoint (Section 5/27) - no write path for internalPriorityScore.
- Website-status management endpoint (Section 7) - no action sets marketplaceStatus.
- Dispute CRUD (Section 25) - Dispute model never written.
- Supply/demand dashboard endpoint (Section 19) - absent.
- Pattern/abuse monitoring endpoints (Section 14) - absent.

## Endpoints requiring modification
- getProviderOpportunities: should surface relaxed/LOW_POOL matches and consume diversityScore + manual match queue.
- reviewTask approve: should raise DISPUTE RiskEvent path and write Dispute on dispute open.

## Validation gaps
- applyToTask Moz DA check is best-effort (try/catch swallows failures; provider-task.service.ts:345-347) - a failed Moz lookup does NOT block but also does not hard-fail; acceptable but noted.
- Opportunity filters accept arbitrary placementType/linkAttribute strings without enum validation in matching.engine.ts:214-215.

## Authorization gaps
- Override/force/admin endpoints are guarded by AdminGuard (confirmed on admin-marketplace-override.controller.ts, admin-task.controller.ts). Provider/requester ownership enforced in services (authorId === providerId; task.requesterId === requesterId; provider-task.service.ts:302, task-requester.service.ts:645).
- Suspended USER status enforced at JWT layer (jwt.strategy.ts) rather than marketplace validation; consistent but layered.

---

# BACKGROUND JOBS

## Score updates
- OpportunityGuaranteeCron @Cron('0 2 * * *') refreshOpportunityFairness updates opportunityScore/boostFactor/forceMatchNext for ACTIVE profiles (opportunity-guarantee.cron.ts). LIVE (daily). NOTE: it does NOT recompute visibilityScore or decay boostDecayCount despite name.

## Risk updates
- No dedicated risk-decay cron. Risk decay is computed lazily inside calculateRiskScore at score-write time (scoring.utils.ts:60-67), not by a scheduled job. RiskEvent log never written.

## Cleanup
- No cleanup cron for expired overrides (MarketplaceOverride.status remains ACTIVE past activeUntil; only resolveForWebsite filters by time at read - marketplace-override.service.ts:118-126). No audit-log/impression retention job.

## Notifications
- Notifications are event-triggered (TaskNotificationService), not batch jobs. No digest/reminder cron found (acceptable per spec).

## Boost decay
- No boost-decay cron. boostDecayCount is decremented only via calculateBoost inside updateScoresAfterTask at completion (scoring.utils.ts:117-140; scoring.service.ts:103-104). OpportunityGuaranteeCron increments boostFactor for neglected sites but never decrements boostDecayCount.

## Analytics
- AdminAnalytics are computed on-demand (admin-analytics service/registry), not by a scheduled aggregation job. No supply/demand snapshot job (Section 19).

## Marketplace maintenance
- Only the daily OpportunityGuaranteeCron qualifies. No mode-aware or liquidity maintenance jobs.

---

# ARCHITECTURE AUDIT

## Service boundaries
Engines (matching/relaxation/ranking/scoring/validation/distribution/tier/override/recorder) are well-bounded under market-algoritm. Orchestration (provider-task, task-requester, admin-task) mixes lifecycle + credit + notification + scoring calls.

## Business logic separation
Good engine separation; weaker at the service layer where constraint checks previously duplicated before being centralized in ValidationEngine. Centralized validateTransition is now the single gate (validation.engine.ts). Scoring math isolated in scoring.utils.ts.

## SOLID / Single Responsibility
Engines follow SRP. Services are heavier (e.g. task-requester.service.ts > 1200 lines). Provider-task/admin-task also large.

## Domain Driven Design
Marketplace domain is split across task/* and website/* with no aggregate root module. Engines are the closest to bounded contexts.

## Scalability
- Matching engine runs multiple per-candidate Prisma queries (buildCandidate per task x provider) - O(N*M) with N+1 queries; acceptable at current scale, risk at high volume. Ranking loads all matching profiles + daily counts in memory.
- No caching of matching results.

## Maintainability
High for engines, moderate for services. Dead fields/columns add confusion.

## Code duplication
- recordApprovedDomainInteraction duplicated historically; now consolidated into DomainInteractionRecorderService (good).
- Moz stats lookups duplicated in provider-task and task-requester.
- Some validation re-implemented in services before centralized call-sites (mostly migrated).

## Future extensibility
Engine registry pattern (AnalyticsReport registry) suggests extensibility intent. New engines (Liquidity, PatternMonitoring, Mode, SupplyDemand) should follow the existing @Injectable single-responsibility pattern.

---

# FINAL SUMMARY

## 1. Overall implementation percentage

Approximately **55%** of the marketplace specification is implemented when weighted by section coverage. 14 of 30 sections are Fully Implemented, 11 are Partially Implemented, 4 are Missing, and 1 (Architecture) Needs Refactor. The core matching -> relaxation -> ranking -> validation -> scoring pipeline is live and correct; the governance/intelligence layer (liquidity, patterns, modes, supply/demand, disputes, risk-log) is largely absent or dead.

## 2. Fully implemented features (14)
Sections 1 (Eligibility), 2 (Matching Engine), 3 (Dynamic Relaxation), 4 (Ranking Engine), 8 (Domain Relationship Tracking), 9 (Reciprocal Rules), 10 (Repeat Pair Rules), 16 (Tier System), 17 (Validation Engine), 20 (New User Boost), 21 (Fallback Matching), 24 (Credit System), 26 (Notification System), 29 (User Experience).

## 3. Partially implemented features
Sections 5 (Visibility Control - internalPriorityScore/maxRequesterExposurePerDay dead), 6 (Website Quality - reliabilityScore dead, no behaviour patterns), 7 (Website Status - only ACTIVE vs not), 11 (Distribution - diversity computed but unconsumed), 12 (Niche Distribution - non-blocking, no seed), 13 (Velocity - matchCount7d/applicationCount7d not maintained), 15 (Risk - RiskEvent log never written), 18 (Liquidity - no admin-assisted match), 22 (Trust - reliability dead/un-surfaced), 23 (Output Quality - no risk linkage), 27 (Admin - no manual match / priority / status write). 30 (Architecture - Needs Refactor, see above).

## 4. Missing features
- Section 14: Pattern Monitoring (cluster/group concentration). No service or model.
- Section 19: Supply vs Demand balancing. No service/model.
- Section 25: Dispute System. Dispute model + creditAdjustmentId never populated; resolution is a task-status flag only.
- Section 28: Marketplace Modes. MarketplaceModeConfig never read; runtime mode is a hardcoded transient string.

## 5. High-risk architectural issues
1. **Dead/inert governance fields** - reliabilityScore, internalPriorityScore, maxRequesterExposurePerDay, forceNewDomainNext/Until, maxRequesterExposurePerDay are declared but never affect behaviour. Risk of operators believing controls are active when they are not.
2. **Diversity score computed but never consumed** - DistributionEngine.computeDiversityScore writes diversityScore that ranking/validation ignore, so network-concentration mitigation has zero effect.
3. **Mixed responsibilities in services** - provider-task/requester/admin services intertwine lifecycle + credit + notification + scoring + validation; risk of divergence as new features land.
4. **No cohesive Marketplace module** - engines are correct but orchestrated ad-hoc; new engines have no home.
5. **String-FK DomainInteraction** - no relational integrity; niche-cap queries depend on unindexed category columns.

## 6. Database changes required
- Add relations + indexes on DomainInteraction (sourceWebsiteId, targetWebsiteId, taskId) and DomainPairStat.
- Index DomainInteraction niche columns (source/target Primary/SecondaryCategoryKey).
- Index Website.rootDomain.
- Seed NicheDistributionCap (or drop if not enforced).
- Add SupplyDemandSnapshot + PatternMonitoring aggregate models (Sections 14, 19).
- Decide on dead columns: wire or drop (reliabilityScore, internalPriorityScore, maxRequesterExposurePerDay, vestigial enforcement flags).

## 7. API changes required
- Add marketplace-mode config endpoint (read/set MarketplaceModeConfig).
- Add manual-match queue endpoint (create/administer ManualMatchQueue).
- Add priority-adjustment endpoint (write internalPriorityScore).
- Add website-status management endpoint (set marketplaceStatus per Section 7 rules).
- Add Dispute CRUD endpoints (write Dispute + CreditAdjustment).
- Add supply/demand + pattern-monitoring read endpoints.
- Modify getProviderOpportunities to surface LOW_POOL/relaxed matches and consume diversityScore + manual queue.
- Modify reviewTask to write Dispute + DISPUTE RiskEvent on dispute.

## 8. New services/modules recommended
- LiquidityEngine (admin-assisted matching + LOW_POOL surfacing).
- PatternMonitoringEngine (cluster/group concentration).
- MarketplaceModeService (consume MarketplaceModeConfig).
- SupplyDemandService + SupplyDemandSnapshot model.
- RiskEvent logging inside ScoringService / dispute path.
- Dedicated MarketplaceModule aggregating engines and providing a clean public API.
- (Optional) VelocityEngine to centralize matchCount7d/applicationCount7d counters.

## 9. Suggested implementation order (highest priority first)
1. **Wire dead governance fields** (reliabilityScore compute+surfaced; internalPriorityScore write+ranking; maxRequesterExposurePerDay enforce or drop) - Low/Medium, high trust impact.
2. **Consume diversityScore + filterNewDomains in live path** (Section 11) - Low/Medium, restores intended distribution control.
3. **Dispute System** (Section 25) - Medium, spec-critical + feeds RiskEvent.
4. **RiskEvent log writes** (Section 15) - Low, auditability.
5. **Marketplace Modes** (Section 28) - Medium, config-driven behaviour.
6. **Liquidity / admin-assisted matching** (Section 18) - High, prevents empty pools.
7. **Niche cap seeding + enforcement options** (Section 12) - Low/Medium.
8. **Pattern Monitoring** (Section 14) - Very High, new engine.
9. **Supply/Demand balancing** (Section 19) - High, new engine.
10. **Architecture refactor** (Section 30) - extract MarketplaceModule; do LAST after engines stable.

## 10. Estimated implementation complexity for every missing feature
- Section 14 Pattern Monitoring: **Very High** (new engine + detection algorithms + data model).
- Section 19 Supply vs Demand: **High** (new engine + snapshot model + balancing logic).
- Section 25 Dispute System: **Medium** (model already exists; add CRUD + credit-adjustment wiring + RiskEvent).
- Section 28 Marketplace Modes: **Medium** (model exists; add service + inject into engines).
- Section 18 Admin-assisted matching (extension): **High** (ManualMatchQueue consumer + admin endpoint + LOW_POOL surfacing).
- Section 5/11/22 dead-field wiring + diversity consumption: **Low** to **Medium**.
- Section 7 per-status behaviour: **Medium**.
- Section 13 counter maintenance: **Low**.
- Section 15 RiskEvent writes: **Low**.
