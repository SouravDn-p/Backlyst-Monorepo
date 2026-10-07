# BACKLYST Marketplace — Ranking Engine Specification Audit

**Audit Date:** 2026-07-18
**Module Audited:** `src/modules/task/market-algoritm/ranking.service.ts` (`RankingService`) and its orchestration
**Auditor:** Senior Software Architect / Marketplace Systems Expert
**Method:** Source-code verified only. Any requirement not provable from code/schema is marked `NOT FOUND IN THE CODEBASE`.

---

## 1. EXECUTIVE SUMMARY

The Ranking Engine (`RankingService.rankAndFilter`) **is implemented** and is reasonably well-separated from Matching, Validation, Risk, Credit, Notification, and Payment concerns. Execution order is correct (Ranking runs after Matching/Relaxation/Distribution and before the Recommendation/Response layer). Hard constraints are largely preserved as ordering inputs, not eligibility bypasses.

However, the implementation contains **several material violations and gaps** versus the specification:

1. **Architectural violation:** `RankingService` performs a **state-mutating side-effect** (`recordOpportunityImpressions`) that writes DB rows and increments `exposureCount7d`. This is "notification/analytics-ish" write behaviour inside a ranking component and partially blurs the "ranking must only return ranked candidates" boundary.
2. **Ranking performs re-filtering (responsibility bleed):** `rankAndFilter` drops candidates for daily caps, requester exposure caps, suppression — i.e. it re-applies *governance/cooldown/eligibility filtering*, which the spec says belongs to Validation/Cooldown/Distribution, not Ranking. This risks candidates being filtered too late / inconsistently.
3. **Tier priority is applied as a multiplicative score factor, not an explicit ordered priority.** The spec shows an explicit ordered ladder (Enterprise→Platinum→Gold→Silver→Free). The code multiplies score by `tierVelocityLimit` (default 1) — so tier influence is weak/implicit and can be drowned out by other weights. There is no guarantee higher tiers rank above lower tiers.
4. **No dedicated "Recommendation Service" exists.** The spec flow shows `Ranking Engine → Recommendation Service → Opportunity Presentation`. The codebase merges ranking + presentation into `ProviderTaskService.getProviderOpportunities` (also performs trust-indicator enrichment, S3 file resolution, pagination, notifications). No separate Recommendation Service component is present.
5. **Low Pool Mode is not handled by the Ranking Engine at all.** Low-pool detection lives in `MatchingEngine` (returns `NORMAL|LOW_POOL`); ranking ignores `marketplaceMode`, low-pool fallback prioritization, and opportunity expansion. Threshold config (`minViableMatches`) exists but ranking does not consume it.
6. **Logging gaps:** Ranking does not log ranking requests, candidate counts, ranking scores, marketplace mode, low-pool activation, or processing time. Only `MatchingEngine`/`ProviderTaskService` write `MatchingAuditLog` (without scores). No per-rank-score observability.
7. **Input-validation completeness gaps:** Ranking receives the candidate object but several required marketplace inputs (Marketplace Mode, Low Pool Status, Administrative Overrides resolved as input) are not passed *as parameters* — overrides are re-fetched inside ranking, and marketplace mode is absent from the ranking signature.

**Estimated overall compliance: ~62%**

---

## 2. PRIMARY OBJECTIVE FINDINGS

| # | Objective | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Is the Ranking Engine implemented? | **Yes** | `ranking.service.ts` `RankingService.rankAndFilter` |
| 2 | Fully compliant with spec? | **No** | Tier, Low Pool, Recommendation Service, logging, side-effect writes all deviate |
| 3 | Execution order correct? | **Mostly Yes** | `ProviderTaskService.getProviderOpportunities` calls Matching → (Relaxation/Distribution inside Matching) → `rankAndFilter` → response |
| 4 | Responsibilities separated? | **Partial** | Ranking re-filters (daily cap, exposure cap, suppression) and writes impressions |
| 5 | Marketplace constraints enforced BEFORE ranking? | **Partial** | Validation/eligibility run in Matching; but ranking re-applies some caps itself |
| 6 | Visibility weighting correct? | **Yes** | `visibilityScore * config.visibilityWeight` |
| 7 | Tier priorities correct? | **No (needs refactor)** | Multiplicative weak factor, not ordered ladder |
| 8 | Supports scalability? | **Partial** | N+1 override/tier resolves per candidate; `Promise.all` over candidates; no caching of override map |
| 9 | Architectural violations? | **Yes** | Side-effect writes; no Recommendation Service; blended service |
| 10 | Missing business requirements? | **Yes** | Low Pool handling, Recommendation Service, explicit tier ladder, logging |

---

## 3. EXECUTION FLOW AUDIT

Spec-mandated order:
```
Authentication → Marketplace Eligibility → Marketplace Validation → Domain Cooldown Filtering
→ Candidate Selection → Matching Engine → Dynamic Relaxation → Distribution Engine
→ Ranking Engine → Recommendation Service → Opportunity Presentation
```

**Verified actual order** (`provider-task.service.ts:175-305`):
1. `marketplaceConfigService.getMergedConfig()` — config (mode/relaxation thresholds)
2. `matchingEngine.findCandidates()` — internally runs: user-active check (`ValidationEngine.isUserActive`), eligible provider websites, eligible requester websites (`ValidationEngine.getEligibleMarketplaceWebsiteIds`), candidate tasks, hard-rule candidate build (cooldown blocked pair keys), **low-pool detection**, **relaxation loop**, **distribution** (`DistributionEngine.filterNewDomains`)
3. `writeMatchingAudit()` — caller-level audit
4. `rankingService.rankAndFilter(candidates)` — **Ranking**
5. Empty-pool handling (`LOW_POOL`/`FILTERED` availability message)
6. Notification (fire-and-forget)
7. `rankingService.recordOpportunityImpressions(pageCandidates)` — **Ranking writes impressions**
8. Trust-indicator enrichment, S3 file resolution, pagination → response

**Findings:**
- ✅ Ranking executes AFTER Matching/Relaxation/Distribution.
- ❌ **No `Recommendation Service`** between Ranking and Opportunity Presentation. Ranking output is consumed directly by `ProviderTaskService`.
- ⚠️ Ranking still re-filters (daily cap, requester exposure, suppression) — i.e. it performs *late* governance filtering rather than purely ordering. This means some "invalid candidates" (by daily/exposure rules) are dropped at ranking instead of earlier, and inconsistent with the spec's "candidate generation/filtering must precede ranking."
- ⚠️ Can invalid candidates reach Ranking? Yes — `UNDER_REVIEW`/`SUSPENDED`/`RESTRICTED`/`LIMITED_ACCESS` candidates are *not* removed by Matching (only `SUSPENDED` is blocked at eligibility; `UNDER_REVIEW` is allowed to browse). Ranking then handles `SUSPENDED` as a no-op (still ranked, line 220-224 spec test) and `UNDER_REVIEW` is ranked. This is arguably acceptable per spec §7 (browsable ≠ selectable), but Ranking is doing eligibility-aware branching, not pure ranking.

---

## 4. INPUT VALIDATION AUDIT (what Ranking receives)

`rankAndFilter(candidates: MatchCandidate[])` receives only `MatchCandidate` objects.

**Candidate Information** (present on `MatchCandidate`): Task ID ✅, Website ID (providerWebsite.id) ✅, Category (providerWebsite.primaryCategoryKey) ✅, Tags (marketplaceTagKeys) ✅, Primary niche ✅, Secondary niche ❌ (not on `MatchingProviderWebsite`/`Website` schema — only `primaryCategoryKey`/`secondaryCategoryKey` exist on Website; secondary NOT propagated into MatchCandidate), Country ✅, Language ✅, Placement type (`task.placementType`) ✅.

**Marketplace Information:** Marketplace Mode ❌ (NOT passed to ranking; only used by MatchingEngine for low-pool label), Low Pool Status ❌ (not a ranking input), Marketplace Configuration ✅ (fetched inside via `MarketplaceConfigService`), Administrative Overrides ✅ but **re-fetched inside ranking** rather than passed as validated input.

**Website Information:** Website Status (`marketplaceStatus`) ✅, Tier Information ✅ (resolved inside via `TierEngine`), Quality Information (`qualityScore`, `reliabilityScore`) ✅, Visibility Information (`visibilityScore`) ✅.

**Missing Requirement:** Secondary niche is not carried into the candidate type, and Marketplace Mode / Low Pool Status are absent from the ranking input contract.

---

## 5. RANKING FACTOR AUDIT

### Tier Priority
- **Implemented?** Partially. `TierEngine.resolveTierLimits(authorId)` returns `tierVelocityLimit` (FREE=1, SILVER=1.2, GOLD=1.5, PLATINUM=1.8, ENTERPRISE=2). Applied as `score = weightedScore * tierPriority`.
- **Problem:** This is a *multiplicative* factor with default 1.0, not an *ordered ladder* (Enterprise > Platinum > Gold > Silver > Free). Because weights are small (compatibility 0.35 etc.) and the score is summed then multiplied, a Free site with higher component scores can easily outrank an Enterprise site. There is **no guarantee** tiers order candidates correctly.
- **Can tiers bypass constraints?** No — tier is only a score multiplier; it does not override cooldown/validation/weekly limits. ✅ Hard constraint respected.
- **Status:** Needs Refactor.

### Website Quality
- **Implemented?** Yes. `qualityScore` (internal, hidden) → `qualityBoost = qualityScore * config.qualityWeight`; `behaviourScore` → `behaviourBoost`; `reliabilityScore` exists on profile. Completion reliability (`completionRate`), activity level (`totalInteractions`), interaction diversity (`diversityScore`), website status, quality indicators all feed scoring.
- Quality only influences ranking (never bypasses validation). ✅
- **Status:** Fully Implemented (signals present).

### Distribution Rules
- **Implemented?** Partially. `diversityScore` is a ranking signal. Repeated-pair deprioritization is handled by Matching/Validation (cooldown), not by ranking. Domain distribution / marketplace balancing / visibility distribution are **not** actively weighted in ranking ordering (only the score signal `diversityScore` exists).
- **Status:** Partially Implemented.

### New User Boost
- **Implemented?** Partially. `firstSuccessBoostActive` → `newWebsiteBoostFactor` added to boost. Governance rules (cooldowns, eligibility) remain enforced. Hard constraints never bypassed. ✅
- But the boost is consumed at scoring time (`BoostService.applyNewUserBoost` on completion), and ranking only adds a small multiplicative factor. "First-success optimization / increased early visibility" exists but is weak.
- **Status:** Partially Implemented.

### Liquidity Protection
- **Implemented?** Partially. `LiquidityEngine.calculateOpportunityScore` computes a demand/supply/inactivity score, persisted to `opportunityScore` and consumed in ranking (`opportunityScore * config.opportunityWeight`). This supports supply-demand balancing and fair opportunity distribution.
- However, ranking itself does **not** perform liquidity protection logic; it only consumes the precomputed `opportunityScore`. Empty-result protection is handled at the service layer (availability message), not ranking.
- **Status:** Partially Implemented.

---

## 6. VISIBILITY CONTROL AUDIT

- **Visibility weighting:** ✅ `visibilityScore * config.visibilityWeight`.
- **Priority weighting:** ✅ via `internalPriorityScore * config.internalPriorityWeight` + `forceMatchBonus`.
- **Opportunity ordering:** ✅ sorted by `score` desc; rank assigned.
- **Frequency control:** ✅ `exposurePenalty = exposureCount7d * exposurePenaltyPerTaskView`; `exposureCount7d` incremented on impression.
- **Low-quality deprioritization:** ✅ `qualityScore`/`behaviourScore`/`riskPenalty` all lower low-quality sites.
- **Reliable websites visibility:** ✅ higher scores → higher rank.
- **Restricted websites:** ✅ `RESTRICTED` → boost disabled (boostFactor=1); `LOW_PRIORITY` → `* lowPriorityFactor (0.7)`; `LIMITED_ACCESS` → reduced daily cap; `SUSPENDED` → not browsable upstream; `UNDER_REVIEW` → browsable but not selectable (enforced at Validation selection stage, not ranking).
- **Visibility ≠ eligibility:** ✅ Visibility adjustments are score multipliers/penalties, never eligibility decisions.
- **Status:** Fully Implemented (visibility control is the strongest area).

---

## 7. LOW POOL MODE AUDIT

- **Low pool detection:** ✅ in `MatchingEngine.findCandidates` (`hardRuleCandidates.length < minViableMatches ? 'LOW_POOL' : 'NORMAL'`).
- **Fallback prioritization / opportunity expansion in Ranking:** ❌ **NOT FOUND IN THE CODEBASE.** `RankingService` does not read `marketplaceMode`, does not adjust behaviour for low pool, does not expand opportunities.
- **Hard constraints during low pool:** Preserved (ranking only orders; Matching/Validation gate eligibility). ✅
- **Invalid candidates ranked during low pool?** Ranking does not relax anything, so no invalid candidates are *added*; but ranking also does **not** help surface more candidates when pool is thin.
- **Status:** Missing (Ranking-side low-pool behaviour).

---

## 8. HARD CONSTRAINT AUDIT

Ranking MUST NEVER bypass: ownership validation, website verification, cooldown filtering, reciprocal restrictions, marketplace restrictions, tier limitations, administrative restrictions, risk restrictions, weekly limitations.

| Constraint | Bypassed by Ranking? | Evidence |
|-----------|---------------------|----------|
| Ownership validation | No | Not performed by ranking (handled upstream) |
| Website verification | No | Upstream `getEligibleProviderWebsites` |
| Cooldown filtering | No (but re-applied) | `getDailyProviderWebsiteCounts` re-filters daily cap; not a bypass |
| Reciprocal restrictions | No | Handled in Matching/Validation |
| Marketplace restrictions | No | `marketplaceStatus` only affects scoring |
| Tier limitations | No | Multiplier only |
| Administrative restrictions | No | Overrides only adjust scores/suppression |
| Risk restrictions | No | `riskPenalty` only lowers score; `riskScore>=75` blocked upstream |
| Weekly limitations | **Partial concern** | Ranking re-checks daily cap + requester exposure cap (governance), but **weekly limit** is NOT re-checked in ranking (correctly left to Validation) |

**Finding:** Ranking does **not** relax hard constraints. ✅ The only concern is that it *re-implements* some governance filtering (daily cap, exposure cap, suppression) that should have happened earlier — a separation issue, not a bypass.

---

## 9. OUTPUT VALIDATION AUDIT

Ranking MUST ONLY return: ranked candidates, visibility weighting, recommendation ordering.

- Returns `RankedMatchCandidate[]` (score + rank) ✅
- BUT `recordOpportunityImpressions` writes `OpportunityImpression` rows AND increments `exposureCount7d` on `WebsiteMatchingProfile` — a **stateful side-effect** inside the Ranking component. ❌ Architectural violation (ranking performs write/analytics responsibility).
- No candidate generation ✅, no validation logic ✅ (aside from the re-filtering noted), no notifications (notifications are in `ProviderTaskService`) ✅, no credit/payment/dispute ✅.

**Status:** Partially Implemented (side-effect write is the violation).

---

## 10. DATABASE AUDIT

| Requirement | Present? | Evidence |
|-------------|----------|----------|
| Ranking configurations | ✅ | `MarketplaceScoringConfig` (weights, caps, factors) |
| Visibility weighting | ✅ | `visibilityScore`, `visibilityWeight` |
| Marketplace modes | ✅ | `MarketplaceModeConfig` (EARLY_STAGE/SCALING) |
| Tier priorities | ✅ (implicit) | `subscription.plan.tier` + `TierEngine` maps; `tierVelocityLimit`/`weeklyInteractionLimit` on profile |
| Website quality metrics | ✅ | `qualityScore`, `behaviourScore`, `reliabilityScore`, `completionRate`, `diversityScore` |
| Opportunity prioritization | ✅ | `opportunityScore`, `internalPriorityScore`, `forceMatchNext` |

**Missing:** No explicit `tierPriorityOrder` column/table for the ordered ladder; no ranking-results persistence table (scores per candidate stored only via `OpportunityImpression`, which doubles as both ranking output and analytics). Secondary niche not stored on candidate join.

**Status:** Mostly Implemented.

---

## 11. API AUDIT

- **APIs consuming ranking results:** `GET /provider-task/opportunities` → `ProviderTaskService.getProviderOpportunities` → `rankAndFilter`.
- **Services communicating with Ranking Engine:** `ProviderTaskService` (only caller in production path). `MarketplaceEngineModule` exports `RankingService`.
- **Centralized?** Partially. Ranking is a single injectable service, but the *orchestration* (matching + ranking + enrichment + notification + pagination) is blended into `ProviderTaskService` rather than a dedicated `RecommendationService`/orchestrator.
- **Architectural issue:** No separation between "Ranking" and "Recommendation/Presentation". The spec's `Recommendation Service` is absent.

---

## 12. LOGGING AUDIT

Required: ranking requests, candidate counts, ranking scores, marketplace mode, low pool activation, processing time, visibility adjustments.

| Log type | Present? |
|----------|----------|
| Ranking requests | ❌ (only MatchingAuditLog at caller, no ranking-specific entry) |
| Candidate counts | ⚠️ `MatchingAuditLog.candidatesEval/eligibleMatches` (pre-ranking) |
| Ranking scores | ❌ (only inside `OpportunityImpression.score/rank`, written by ranking's side-effect) |
| Marketplace mode | ⚠️ `MatchingAuditLog.marketplaceMode` (NORMAL/LOW_POOL) |
| Low pool activation | ⚠️ via marketplaceMode label only |
| Processing time | ⚠️ `MatchingAuditLog.processingTimeMs` (matching only) |
| Visibility adjustments | ❌ |

**Status:** Partially Implemented / Missing (no dedicated ranking observability).

---

## 13. PERFORMANCE AUDIT

- **N+1 / redundant queries:** `rankAndFilter` runs `Promise.all` over candidates calling `overrideService.resolveForWebsite(id)` and `tierEngine.resolveTierLimits(authorId)` per candidate (deduped by id/authorId via maps, but each still triggers a DB query per distinct website/author). For large candidate sets this is many queries.
- **Synchronous scoring:** The scoring loop is synchronous in-memory (good), but it triggers 2 extra DB round-trips per candidate set (`getDailyProviderWebsiteCounts`, `getDailyRequesterWebsiteCounts`) — acceptable but could be batched.
- **State writes in ranking path:** `recordOpportunityImpressions` does `createMany` + N `updateMany` (one per distinct website) — extra write load on the read-path (opportunity listing). This should be async/queued, not inline on a GET.
- **Scalability concern (High):** Ranking mutates `exposureCount7d` synchronously on every opportunity fetch; high-traffic listing endpoints will contend on profile rows.

**Status:** Needs Refactor (performance + side-effect-on-read-path).

---

## 14. FAILURE HANDLING AUDIT

- **No opportunities:** ✅ `ProviderTaskService` returns `"No suitable opportunities are available right now."` with `availability.available=false` and a non-leaking `reason` (`LOW_POOL`/`FILTERED`).
- **Ranking fails:** ❌ No try/catch around `rankAndFilter` in `getProviderOpportunities`. A ranking exception would propagate as a raw 500 (Internal Marketplace Error) — violates the "technical failures must remain hidden" requirement.
- **Low pool mode fails:** Handled by Matching returning empty (mode LOW_POOL); ranking not involved.
- **Marketplace restrictions apply:** Handled upstream; ranking never surfaces raw rule names.
- **Status:** Partially Implemented (missing ranking-level failure isolation).

---

## 15. ARCHITECTURAL AUDIT

**BAD patterns found:**
1. `RankingService.recordOpportunityImpressions` performs DB writes (impressions + `exposureCount7d` increment) — Ranking doing Notification/Analytics write responsibility.
2. `ProviderTaskService.getProviderOpportunities` blends Matching → Ranking → Trust enrichment → S3 file resolution → Pagination → Notification → Response. The spec's dedicated `Recommendation Service` is missing.
3. Ranking re-applies governance filtering (daily cap, requester exposure cap, suppression) that belongs to Validation/Cooldown/Distribution stages.

**GOOD patterns found:**
- Clear engine separation: `ValidationEngine`, `MatchingEngine`, `MatchingRelaxationEngine`, `DistributionEngine`, `RankingService`, `ScoringService`, `RiskEngine`, `TierEngine`, `LiquidityEngine` are distinct injectables.
- Ranking does not do auth, ownership, credit, payment, or dispute handling.
- Hard constraints are not relaxed in ranking.

---

## 16. MISMATCH ANALYSIS (per requirement)

### 16.1 Opportunity Ranking / Recommendation Ordering / Visibility Weighting / Marketplace Prioritization / Ranking Score Calculation / Candidate Ordering
- **Requirement:** Ranking Engine owns these and only these.
- **Current:** `rankAndFilter` does all of these correctly.
- **Evidence:** `ranking.service.ts:65-210`.
- **Status:** Fully Implemented.
- **Mismatch:** Ranking also writes impressions (scope creep).
- **Fix:** Extract `recordOpportunityImpressions` to a separate Impression/Analytics service invoked asynchronously by the orchestrator, not the Ranking Engine.

### 16.2 Ranking must NOT do auth / ownership / candidate generation / cooldown / risk / notification / credit / dispute / analytics / payment
- **Requirement:** Strict separation.
- **Current:** Auth/ownership/candidate-generation/cooldown/risk/credit/dispute/payment are NOT in ranking. ✅ BUT ranking re-filters daily/exposure caps (governance) and writes impressions (analytics-ish).
- **Evidence:** `ranking.service.ts:79-106` (daily cap/exposure cap filtering), `212-250` (impression writes).
- **Status:** Partially Implemented.
- **Mismatch:** Governance re-filtering + stateful writes inside ranking.
- **Fix:** Move daily/exposure-cap filtering to Validation/Cooldown stage before ranking; move impression writes out of Ranking Engine.

### 16.3 Execution order (Ranking after Matching/Relaxation/Distribution)
- **Requirement:** Specified pipeline.
- **Current:** Correct order verified.
- **Evidence:** `provider-task.service.ts:198-210`.
- **Status:** Fully Implemented.
- **Mismatch:** None on order; missing Recommendation Service step.

### 16.4 Tier Priority (ordered ladder)
- **Requirement:** Explicit Enterprise→Free priority ordering; must never override hard constraints.
- **Current:** Multiplicative `tierVelocityLimit` factor; no ordered guarantee; constraints not bypassed.
- **Evidence:** `tier-engine.service.ts:25-31`; `ranking.service.ts:146-147,170-171`.
- **Status:** Needs Refactor.
- **Mismatch:** Weak/implicit tier influence; not an ordered ladder.
- **Fix:** Introduce explicit tier priority ordering (e.g. stable sort key = tierRank then score), or significantly increase tier weight and document guarantee; keep hard constraints untouched.

### 16.5 Website Quality signals
- **Requirement:** Consider completion reliability, activity, interaction diversity, status, quality indicators; quality only influences ranking.
- **Current:** All present; quality only influences.
- **Evidence:** `ranking.service.ts:129-159,176-177`.
- **Status:** Fully Implemented.

### 16.6 Distribution Rules (diversity, domain distribution, marketplace balancing, deprioritize repeats)
- **Requirement:** Ranking considers these.
- **Current:** `diversityScore` signal only; repeated-pair deprioritization is in Matching/Validation, not ranking.
- **Evidence:** `ranking.service.ts:176-177`; `distribution-engine.service.ts`.
- **Status:** Partially Implemented.
- **Fix:** Optionally add an explicit repeat-pairing deprioritization signal in ranking (using recent `DomainInteraction` history) for finer ordering.

### 16.7 New User Boost
- **Requirement:** First-success optimization, early visibility, early prioritization; governance/hard constraints enforced.
- **Current:** `firstSuccessBoostActive` → boost factor; constraints enforced.
- **Evidence:** `ranking.service.ts:122-128`; `boost.service.ts`.
- **Status:** Partially Implemented.

### 16.8 Liquidity Protection
- **Requirement:** Marketplace activity protection, supply-demand balancing, fair distribution; avoid empty results.
- **Current:** `opportunityScore` (LiquidityEngine) consumed; empty-result handling at service layer.
- **Evidence:** `liquidity.engine.ts`; `provider-task.service.ts:217-236`.
- **Status:** Partially Implemented.

### 16.9 Visibility Control
- **Requirement:** Visibility/priority weighting, ordering, frequency control; low-quality deprioritized; restricted handled; never becomes eligibility.
- **Current:** Fully satisfied.
- **Evidence:** `ranking.service.ts:108-186`.
- **Status:** Fully Implemented.

### 16.10 Low Pool Mode (detection, fallback prioritization, expansion)
- **Requirement:** Ranking supports low-pool behaviour; hard constraints enforced.
- **Current:** Detection in Matching only; ranking ignores low pool.
- **Evidence:** `matching.engine.ts:108-113`; `ranking.service.ts` (no mode param).
- **Status:** Missing.
- **Fix:** Pass `marketplaceMode`/`lowPool` into ranking; add fallback prioritization (e.g. boost liquidity/opportunity score, relax diversity penalty) when LOW_POOL, without relaxing hard constraints.

### 16.11 Hard Constraint non-bypass
- **Requirement:** Ranking never bypasses any hard constraint.
- **Current:** Not bypassed.
- **Evidence:** No eligibility/override logic that admits ineligible candidates.
- **Status:** Fully Implemented.

### 16.12 Output Validation (only ranked candidates + visibility + ordering)
- **Requirement:** No candidate generation/validation/notification/credit/dispute/payment.
- **Current:** Violated by `recordOpportunityImpressions` write.
- **Evidence:** `ranking.service.ts:212-250`.
- **Status:** Partially Implemented.
- **Fix:** Remove write responsibility from Ranking Engine.

### 16.13 Database support
- **Requirement:** Configs, visibility, modes, tiers, quality, prioritization.
- **Current:** Present.
- **Status:** Fully Implemented (minor: no explicit tier-order table).

### 16.14 API / centralization
- **Requirement:** Centralized ranking; clear consumers.
- **Current:** Single service, single caller, but no Recommendation Service.
- **Status:** Partially Implemented.

### 16.15 Logging
- **Requirement:** 7 logging dimensions.
- **Current:** 2-3 partially covered.
- **Status:** Missing / Partially Implemented.

### 16.16 Performance
- **Requirement:** Optimized, no expensive sync, scalable.
- **Current:** Side-effect writes on read path; per-candidate DB calls.
- **Status:** Needs Refactor.

### 16.17 Failure Handling
- **Requirement:** Hide technical errors; safe empty message.
- **Current:** Empty handled; ranking failure not isolated.
- **Status:** Partially Implemented.

---

## 17. FINAL REPORT

### 1. Ranking Engine Compliance Percentage
**≈ 62%** (weighted across all audit dimensions; strong on visibility/quality/hard-constraints, weak on tier ladder, low-pool, recommendation-service separation, logging, failure isolation, and side-effect-free ranking).

### 2. Fully Implemented Requirements
- Execution order (ranking after matching/relaxation/distribution)
- Visibility weighting / priority weighting / ordering / frequency control
- Website quality signals (reliability, activity, diversity, status, quality)
- Hard-constraint non-bypass
- Database support (configs, visibility, modes, tiers, quality, prioritization)
- New-user boost (present, weak)
- Liquidity score consumption (present)
- Empty-result safe messaging

### 3. Partially Implemented Requirements
- Distribution rules (diversity signal only)
- New user boost (weak factor)
- Liquidity protection (consumes precomputed score only)
- Output validation (impression write violates)
- API/centralization (no Recommendation Service)
- Logging (partial)
- Failure handling (no ranking isolation)
- Performance (side-effects on read path)
- Governance re-filtering inside ranking

### 4. Missing Requirements
- **Dedicated Recommendation Service** (Ranking → Recommendation → Presentation gap)
- **Low Pool Mode handling inside Ranking** (fallback prioritization / opportunity expansion)
- **Explicit Tier Priority ordered ladder** (currently weak multiplier)
- **Ranking-specific logging** (scores, requests, visibility adjustments, processing time)
- **Ranking failure isolation** (try/catch + safe fallback)
- **Secondary niche** in candidate input contract
- **Marketplace Mode / Low Pool Status** as ranking inputs

### 5. Architectural Issues Discovered
1. `RankingService.recordOpportunityImpressions` performs DB writes (impressions + `exposureCount7d`) — Ranking doing analytics/write responsibility. **High.**
2. No `Recommendation Service`; orchestration blended into `ProviderTaskService`. **Medium.**
3. Ranking re-applies governance filtering (daily cap, requester exposure cap, suppression) that belongs earlier. **Medium.**
4. Tier priority is a weak multiplicative factor, not an ordered ladder. **Medium-High.**
5. Stateful write on the opportunity-listing read path (contention/scalability). **High.**

### 6. Database Changes Required
- (Optional) Add explicit `tierPriorityOrder` reference or document tier ordering in `MarketplaceScoringConfig`.
- (Optional) Add a dedicated `RankingRunLog` table (requestId, candidateCount, marketplaceMode, lowPool, processingMs, scores sample) to satisfy logging requirements without overloading `OpportunityImpression`.
- `OpportunityImpression` can remain for scoring storage but should be written by the Impression/Analytics service, not Ranking.
- Propagate `secondaryCategoryKey` into `MatchCandidate` if secondary-niche ranking is required.

### 7. Service Changes Required
- Extract `recordOpportunityImpressions` out of `RankingService` into an `ImpressionService` (or keep in orchestrator, invoked async).
- Introduce `RecommendationService` that wraps `RankingService` + enrichment + pagination + notification, called by `ProviderTaskService`.
- Add `marketplaceMode` / `lowPool` parameter to `rankAndFilter` and implement low-pool fallback prioritization.
- Refactor tier handling to an explicit ordered priority (stable secondary sort key) rather than a small multiplier.
- Move daily-cap / requester-exposure-cap / suppression filtering to the Validation/Cooldown stage (pre-ranking); ranking should only order.
- Wrap `rankAndFilter` in try/catch in the orchestrator with safe empty fallback.

### 8. API Changes Required
- No new public API required; internal refactor only. Optionally expose a `/provider-task/opportunities` that routes through `RecommendationService`.
- Ensure ranking failures never surface as 500 to clients (return safe availability message).

### 9. Highest Priority Issues
1. **Side-effect writes inside Ranking Engine** (`recordOpportunityImpressions`) — architectural + scalability + read-path contention. **Fix first.**
2. **Missing Recommendation Service separation** — blocks clean architecture and failure isolation.
3. **Tier priority not an ordered ladder** — business requirement unmet (higher tiers not guaranteed priority).
4. **Low Pool Mode not handled in Ranking** — liquidity protection incomplete.
5. **Ranking failure not isolated** — can leak Internal Marketplace Errors.

### 10. Scalability Concerns
- Synchronous `exposureCount7d` increment on every opportunity GET (row contention). **High.**
- Per-candidate `overrideService.resolveForWebsite` + `tierEngine.resolveTierLimits` DB calls (N+1). **Medium** (mitigated by dedup maps, but still N distinct queries).
- No ranking-result cache; ranking recomputed on every listing call. **Medium.**

### 11. Recommended Implementation Order
1. Extract impression/analytics writes out of `RankingService` (stop mutation in ranking).
2. Add try/catch failure isolation around ranking in orchestrator.
3. Introduce `RecommendationService` to separate ranking from presentation.
4. Refactor tier priority to explicit ordered ladder.
5. Pass `marketplaceMode`/`lowPool` into ranking + implement low-pool fallback prioritization.
6. Move governance re-filtering (daily/exposure/suppression) to Validation/Cooldown pre-ranking.
7. Add ranking-specific logging (`RankingRunLog`).
8. Optimize per-candidate DB calls (batch override/tier resolution or cache).
9. Propagate secondary niche + marketplace mode into candidate/ranking input contract.

### 12. Estimated Implementation Complexity
- **Side-effect extraction:** Low
- **Failure isolation:** Low
- **Recommendation Service introduction:** Medium
- **Tier ladder refactor:** Medium
- **Low-pool ranking behaviour:** Medium
- **Governance re-filtering relocation:** Medium
- **Ranking logging:** Low-Medium
- **Performance optimization (N+1/caching):** Medium
- **Overall program:** **High** (multiple coordinated service + orchestration changes; needs regression tests for ranking ordering guarantees).

---

## 18. CONCLUSION

The BACKLYST Ranking Engine is **implemented and fundamentally sound** in its core responsibility (visibility-weighted, quality/diversity/tier/liquidity-influenced ordering) and correctly executes after Matching/Relaxation/Distribution without bypassing hard constraints. However, it **does not fully comply** with the specification due to: (a) stateful write side-effects inside the ranking component, (b) absence of a dedicated Recommendation Service, (c) tier priority implemented as a weak multiplier rather than an ordered ladder, (d) no Low Pool Mode handling within ranking, (e) missing ranking-specific logging and failure isolation, and (f) governance re-filtering that belongs earlier in the pipeline. Addressing the Highest Priority Issues (items 1–5 above) will bring the engine into substantial compliance; full compliance requires the service/architecture refactors listed in §7 and §11.
