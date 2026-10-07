# BACKLYST Marketplace — Section 5: Visibility Control Audit

**Audit Date:** 2026-07-18
**Auditor Role:** Senior Software Architect / Marketplace Systems Expert / Backend Technical Auditor
**Scope:** Verify the application's Marketplace Visibility Control implementation against the BACKLYST Marketplace Specifications (Section 5).
**Method:** Findings are derived ONLY from source code, services, database schemas, APIs, configuration files, and background jobs present in the codebase. Requirements that cannot be verified are explicitly marked `NOT FOUND IN THE CODEBASE`.

---

## 1. EXECUTIVE SUMMARY

The specification describes a dedicated **Visibility Control** system that executes **AFTER** the Ranking Engine and is responsible exclusively for opportunity exposure, visibility weighting, opportunity frequency control, priority adjustments, marketplace balancing, and visibility distribution.

**Critical architectural finding:** The codebase does **NOT** contain an independent Visibility Control module. All visibility-control behaviour (visibility weighting, status-based priority factors, exposure penalties, tier ordering, low-pool balancing, liquidity amplification, frequency caps) is **merged into `RankingService.rankAndFilter()`**, which is the Ranking Engine itself. The clean spec flow `Ranking Engine → Visibility Control → Recommendation Service` is therefore not realized as separate stages; Ranking and Visibility are the same service.

Despite this architectural conflation, the *behaviours* the spec describes are largely present and configurable, eligibility/governance runs correctly upstream (ValidationEngine / MatchingEngine), and failure handling is robust. The implementation is therefore **substantially compliant (~72%)** but fails the spec on the separation requirement and on two specific status behaviours.

### Compliance Verdict
**PARTIALLY COMPLIANT.** The application does NOT fully comply with the BACKLYST Marketplace Visibility Control specifications. The most material gaps are:
1. No standalone Visibility Control service (architectural separation violation).
2. `RESTRICTED` websites receive no score/visibility reduction and keep the global daily cap (spec requires "significant visibility reduction" + restricted participation).
3. `UNDER_REVIEW` websites receive no differentiated "monitored visibility" signal (same visibility as ACTIVE).
4. Performance: per-candidate N+1 queries and full-table scans on the request path.
5. Logging: no dedicated visibility-adjustment / frequency-change / override-event log.

---

## 2. EVIDENCE FILES (verified)

| File | Role |
|---|---|
| `src/modules/task/market-algoritm/ranking.service.ts` | De-facto Ranking + Visibility Control (merged) |
| `src/modules/task/market-algoritm/matching.engine.ts` | Matching Engine (eligibility + candidate generation + relaxation + low-pool detection) |
| `src/modules/task/market-algoritm/recommendation.service.ts` | Recommendation Service (failure isolation + impression orchestration) |
| `src/modules/task/market-algoritm/validation.engine.ts` | Validation Engine (eligibility, ownership, cooldowns, risk, status gates) |
| `src/modules/task/market-algoritm/distribution-engine.service.ts` | Domain diversity, niche caps, network concentration |
| `src/modules/task/market-algoritm/liquidity.engine.ts` | Opportunity/liquidity scoring |
| `src/modules/task/market-algoritm/marketplace-config.service.ts` | Merged scoring + mode config (cached) |
| `src/modules/task/market-algoritm/marketplace-override.service.ts` | Admin overrides (boost/suppress/force-match/score) |
| `src/modules/task/market-algoritm/quality-status.engine.ts` | Automatic status transitions from quality/risk score |
| `src/modules/task/market-algoritm/impression.service.ts` | Impression + exposure-counter writes |
| `src/modules/task/market-algoritm/boost.service.ts` | New-user / first-success boost lifecycle |
| `src/modules/task/provider-task/provider-task.service.ts` | Opportunity orchestration (API entry) |
| `prisma/schema/marketplace.prisma` | Marketplace schema (profiles, config, overrides, logs) |
| `src/modules/admin/admin-website-status/*` | Admin status / cap / tier-limit APIs |
| `src/modules/admin/admin-marketplace-mode/*` | Marketplace mode (EARLY_STAGE / SCALING) config |

---

## 3. EXECUTION FLOW AUDIT

### Spec-required flow
```
Authentication → Marketplace Eligibility → Marketplace Validation → Domain Cooldown Filtering
→ Candidate Selection → Matching Engine → Dynamic Relaxation → Distribution Engine
→ Ranking Engine → Visibility Control → Recommendation Service → Opportunity Presentation
```

### Actual flow (verified)
```
AuthGuard (provider-task.controller)
  → ProviderTaskService.getProviderOpportunities
    → MarketplaceConfigService.getMergedConfig            // config + mode preset
    → MatchingEngine.findCandidates                       // Eligibility + Validation + Candidate Selection + Matching + Relaxation + Low-pool detection
        (internally calls ValidationEngine.isUserActive, getEligibleProviderWebsites,
         getEligibleMarketplaceWebsiteIds, buildHardRuleCandidates, DistributionEngine.filterNewDomains)
    → writeMatchingAudit (caller)                          // analytics
    → RecommendationService.recommend
        → RankingService.rankAndFilter                     // RANKING + VISIBILITY (merged)
    → (empty?) safe "No suitable opportunities…" message
    → RecommendationService.recordShownPage
        → ImpressionService.recordOpportunityImpressions
    → Opportunity Presentation (trust enrichment, S3, pagination)
```

### Findings
- **Ordering is correct** for everything *up to* ranking: Authentication → Eligibility → Validation → Cooldown → Candidate Selection → Matching → Relaxation → Distribution → Ranking all occur before any visibility calculation. ✅
- **Visibility Control is NOT a separate stage.** It is inside `RankingService.rankAndFilter`. So "Ranking Engine → Visibility Control" is collapsed into one service. **VIOLATION (architectural separation).**
- **Invalid candidates do NOT reach visibility calculations.** Validation runs upstream; SUSPENDED/risk≥75/suppressed sites are removed before ranking. ✅
- **Validations occur AFTER visibility?** No — validations occur before. ✅ (No post-visibility validation found.)
- **One nuance:** `RankingService` itself *drops* candidates for `isSuppressed`, `dailyMatches >= cap`, and `requesterExposure >= cap`. These are governance/frequency caps, applied at the visibility stage rather than a dedicated governance stage. Acceptable per spec (frequency control is a visibility responsibility) but means "visibility control" mutates the candidate set, not just weights.

**Violations reported:**
- V-EXEC-1: Visibility Control is not separated from the Ranking Engine.

---

## 4. VISIBILITY CONTROL RESPONSIBILITY AUDIT

### Should ONLY do
opportunity exposure management, visibility weighting, opportunity frequency control, priority adjustments, marketplace balancing, visibility distribution, controlled exposure optimization.

**Verified:** `RankingService` scoring block (lines ~194–296) handles: visibilityScore weight, boostFactor, status factors, exposure penalty, tier ordering, low-pool relaxations, opportunity weighting, diversity, quality, internal priority. These are all in-scope. ✅

### Should NEVER do
authentication, website verification, ownership validation, candidate generation, cooldown filtering, risk calculations, payment handling, notification handling, credit processing, dispute handling.

**Verified:** None of these are performed inside `RankingService`. Auth/verification/ownership/cooldown/candidate generation are in `MatchingEngine`/`ValidationEngine`. Risk scoring is in `RiskEngine`. Payments/credits/notifications/disputes are in their own modules. ✅

**Conclusion:** Responsibility scope is correctly limited *within* the merged service. ✅ (The only bleed is governance cap-dropping, discussed above.)

---

## 5. WEBSITE STATUS AUDIT

Enum `WebsiteMarketplaceStatus` (prisma/schema/marketplace.prisma lines 10–17): `ACTIVE, LOW_PRIORITY, LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED, SUSPENDED`.

| Status | Spec behaviour | Code behaviour (evidence) | Status |
|---|---|---|---|
| **ACTIVE** | standard exposure/visibility | `priorityFactor=1`, no cap change, full weights | Fully Implemented |
| **LOW_PRIORITY** | reduced visibility + reduced frequency | `lowPriorityFactor` (default 0.7) multiplies final score (ranking.service.ts L292–296) | Fully Implemented |
| **LIMITED_ACCESS** | limited opportunities + reduced frequency | daily cap → `marketplaceStatusDailyCap` (admin/Limited = 1) overrides global `maxProviderMatchesPerDay` (L162–169); quality-status.engine sets cap=1 on LIMITED_ACCESS | Partially Implemented (frequency reduced; "limited opportunities" = cap only, no separate visibility reduction) |
| **UNDER_REVIEW** | monitored visibility; participation continues | browsable, blocked only at selection stages (validation.engine.ts `isSelectableStatus`/`isSelectionStage`); **no distinct visibility signal** — ranked identically to ACTIVE | Partially Implemented (no "monitored visibility" differentiation) |
| **RESTRICTED** | significant visibility reduction + restricted participation | boost disabled (`boostFactor=1`, L203–206); **but no score/visibility reduction factor and daily cap stays global 3** | Partially Implemented (boost disabled; "significant visibility reduction" NOT met; participation cap NOT reduced) |
| **SUSPENDED** | no visibility; removed from matching | `isBrowsableStatus` false → removed in `ValidationEngine.isWebsiteRowMarketplaceEligible` → never reaches ranking | Fully Implemented |

**Missing behaviour:**
- `UNDER_REVIEW`: spec's "monitored visibility" is not implemented as a distinct visibility treatment.
- `RESTRICTED`: spec's "significant visibility reduction" is not implemented (only boost disable); daily cap unchanged.

---

## 6. VISIBILITY WEIGHTING AUDIT

Configurable via `MarketplaceScoringConfig` + `MarketplaceModeConfig.preset` (cached 60s in `MarketplaceConfigService`).

| Factor | Considered? | Evidence |
|---|---|---|
| website quality | ✅ | `qualityScore * qualityWeight` (L250–254) |
| tier priority | ✅ | explicit ladder `TIER_PRIORITY_ORDER` as primary sort key (L42–48, L298–323) + `tierVelocity` nudge |
| interaction diversity | ✅ | `diversityScore * diversityWeight` (L287) + DistributionEngine |
| marketplace balancing | ⚠️ Partial | exposure penalty + requester cap only; no explicit balancing weight equalizing over/under-exposed sites |
| liquidity protection | ✅ | `opportunityScore * opportunityWeight` + low-pool amplification (L265–267) + LiquidityEngine |
| new user support | ✅ | `newWebsiteBoostFactor` (L209–213) |
| website status | ✅ | LOW_PRIORITY factor, RESTRICTED boost disable, LIMITED_ACCESS cap |
| marketplace mode | ✅ | EARLY_STAGE/SCALING preset merges weights (marketplace-config.service.ts L77–123) |

**Score formula (verified, ranking.service.ts L269–296):**
```
weightedScore = compatibility*compatibilityWeight
              + opportunity*opportunityWeight
              + visibility*visibilityWeight
              + reputation*reputationWeight
              + boostScore*boostWeight
              + behaviourBoost + qualityBoost + secondaryNicheBoost
score = weightedScore*tierVelocity - exposurePenalty - riskPenalty - authorityPenalty
        + forceMatchBonus + internalPriority*internalPriorityWeight + diversity*diversityWeight
finalScore = score * priorityFactor   // LOW_PRIORITY only
```
**Configurable?** Yes. ✅ **Missing:** No dedicated `VisibilityConfig` entity (merged into scoring config — acceptable but worth noting).

---

## 7. QUALITY INFLUENCE AUDIT

- Completion reliability: `reliabilityScore`, `completionRate` feed qualityScore (QualityStatusEngine / ScoringService). ✅
- Activity level: `behaviourScore` (behaviourWeight). ✅
- Interaction diversity: `diversityScore`. ✅
- Task completion history: `completedInteractions`, `qualityScore`. ✅
- Marketplace participation: exposure/opportunity signals. ✅

**Quality influences visibility?** Yes (`qualityScore * qualityWeight`). ✅
**Quality determines eligibility?** No — eligibility is in `ValidationEngine`; quality only drives status bands (which affect exposure, not hard eligibility except SUSPENDED which is admin-only). ✅ **Compliant.**

---

## 8. OPPORTUNITY FREQUENCY AUDIT

| Control | Present? | Evidence |
|---|---|---|
| frequency limitations | ✅ | `maxProviderMatchesPerDay`, `maxRequesterExposurePerDay`, `marketplaceStatusDailyCap` |
| opportunity distribution | ✅ | DistributionEngine (forceNewDomainNext, niche caps) |
| exposure balancing | ⚠️ Partial | requester cap + exposure penalty; no minimum-exposure floor for starved sites (starvation handled by cron, not visibility) |
| marketplace fairness | ⚠️ Partial | tier ladder + caps; no explicit fairness-balancing weight |

**Configurable?** Yes. ✅
**Imbalance issues:** No guarantee that under-exposed websites receive a *minimum* share; frequency is enforced by dropping, which can starve long-tail sites when supply is thin (mitigated by low-pool relaxation + starvation cron, but not a visibility-level floor).

---

## 9. NEW USER BOOST AUDIT

- First-success optimization: `firstSuccessBoostActive` + `newWebsiteBoostFactor` (L209–213). ✅
- Increased early visibility: boost added to `boostScore`. ✅
- Reduced onboarding friction: starved-new-user cron (+0.5, BoostService). ✅

**Duration:** Until first success (`firstSuccessAt` stamped, `firstSuccessBoostActive=false`) or starved-cron grant (one-time). ✅
**Governance preserved?** Boost is ranking-only; cooldown/weekly/validation still enforced upstream. ✅ **NEVER bypasses** cooldown/weekly/restrictions/validation. ✅ **Fully Compliant.**

---

## 10. LIQUIDITY PROTECTION AUDIT

- Marketplace activity protection: `LiquidityEngine.calculateOpportunityScore` (demand/supply/inactivity). ✅
- Opportunity balancing: low-pool `opportunityWeight*1.5` (L265–267). ✅
- Supply-demand balancing: opportunity score + low-pool amplification. ✅
- Empty result reduction: low-pool mode detected from candidate count; safe empty message returned (not 500). ✅

**Unnecessary empty results?** Low-pool relaxation + liquidity amplification reduce them. ✅
**Fully Compliant.**

---

## 11. LOW POOL MODE AUDIT

- `marketplaceMode = LOW_POOL` when `hardRuleCandidates < minViableMatches` (matching.engine.ts L110–113). ✅
- Visibility weighting changes: requester cap ×2 (L182–184), exposure penalty ×0.5 (L216–218), opportunity weight ×1.5 (L265–267). ✅
- Lower-priority websites increased exposure: only via opportunity-weight amplification; no explicit "boost lower-priority" rule. ⚠️ Partial
- Restrictions remain enforced: validation already ran; low-pool only relaxes *soft* governance caps, never hard constraints. ✅

**No violations.** (Minor: no explicit lower-priority boost.)

---

## 12. DISTRIBUTION RULE AUDIT

- Interaction diversity: `diversityScore` + DistributionEngine. ✅
- Domain distribution: `forceNewDomainNext` (MatchingEngine → DistributionEngine). ✅
- Marketplace balancing: niche caps + network concentration (ValidationEngine + DistributionEngine). ✅
- Repeated pairings deprioritized: cooldowns (ValidationEngine), not ranking. ✅
- Concentration problems: network-concentration cap enforced (fail-closed). ✅ **Fully Compliant** (distribution owned by DistributionEngine, consumed by ranking — spec-compliant).

---

## 13. HARD CONSTRAINT AUDIT

Visibility MUST NOT bypass: ownership / verification / cooldown / reciprocal / marketplace / tier / admin / risk / weekly limitations.

**Verified:** All hard constraints are enforced in `ValidationEngine` + `MatchingEngine` BEFORE ranking. `RankingService` does not grant eligibility and cannot override any of these. The status-based behaviour it applies can only *reduce* exposure, never *grant* matching. ✅

**Finding:** No hard-constraint override discovered. ✅ (Ranking dropping suppressed/capped candidates is governance frequency control, not a hard-constraint bypass.)

---

## 14. TIER PRIORITY AUDIT

Ladder `ENTERPRISE(5) > PLATINUM(4) > GOLD(3) > SILVER(2) > FREE(1)` applied as **primary sort key** (ranking.service.ts L298–323). Higher tier ranked above lower tier; weighted score is tie-breaker. `tierVelocity` is a mild score nudge only.

- Higher tiers receive increased priority? ✅
- Tier priority never overrides marketplace restrictions? ✅ (it only orders; suppression/caps still apply)
- Visibility remains marketplace compliant? ✅

**Fully Compliant.**

---

## 15. DATABASE AUDIT

`WebsiteMatchingProfile` supports: visibilityScore, opportunityScore, reputationScore, boostFactor, marketplaceStatus, marketplaceStatusDailyCap, qualityScore, behaviourScore, diversityScore, internalPriorityScore, exposureCount7d, isSuppressed/suppressedUntil. ✅
`MarketplaceScoringConfig` supports: all weights, caps (`maxProviderMatchesPerDay`, `maxRequesterExposurePerDay`), thresholds, `lowPriorityFactor`, `newWebsiteBoostFactor`, mode presets. ✅
`MarketplaceModeConfig` supports: mode (EARLY_STAGE/SCALING) + preset. ✅
`MarketplaceOverride`, `NicheDistributionCap`, `RankingRunLog`, `OpportunityImpression`, `WebsiteQualityStatusLog`, `MatchingAuditLog`. ✅

**Missing schema requirements:** None critical. Minor: no dedicated `VisibilityConfig` table (merged into scoring config). No `restrictedVisibilityFactor` / `underReviewVisibilityFactor` columns (status factors are config-driven, acceptable).

---

## 16. API AUDIT

- Visibility consumed by: `ProviderTaskService.getProviderOpportunities` → `RecommendationService.recommend` → `RankingService.rankAndFilter`. Centralized. ✅
- Admin APIs affecting visibility: `admin-website-status` (setStatus, setTierLimits, resetQualityScore), `admin-marketplace-mode` (mode + preset), `marketplace-override` (create/revoke/list). ✅
- Centralized? Yes — single request path. ✅
- **Architectural issue:** No dedicated Visibility Control API/service boundary; visibility logic is reachable only through the ranking call.

---

## 17. LOGGING AUDIT

| Required log | Present? | Evidence |
|---|---|---|
| visibility calculations | ✅ (partial) | `RankingRunLog` (counts + mode + processing time + topScores) |
| visibility adjustments | ❌ Missing | no per-factor adjustment log |
| opportunity frequency changes | ⚠️ Partial | `OpportunityImpression`, daily counts; no frequency-change event log |
| marketplace mode | ✅ | `RankingRunLog.marketplaceMode`, `lowPoolActive` |
| low pool activations | ✅ | `lowPoolActive` in RankingRunLog + MatchingAuditLog.marketplaceMode |
| processing time | ✅ | `processingTimeMs` in both logs |
| visibility overrides | ❌ Missing | `MarketplaceOverride` resolved in ranking but no override-application event log (only `MarketplaceOverrideAudit` for selection-stage overrides) |

**Missing:** dedicated visibility-adjustment log, override-application (visibility) log.

---

## 18. PERFORMANCE AUDIT

**Concerns (Medium–High):**
1. **Per-candidate N+1 queries:** `ranking.service.ts` L119–141 uses `Promise.all` over candidates calling `overrideService.resolveForWebsite` and `tierEngine.resolveTierLimits` per candidate. Though de-duplicated by id, it issues multiple per-id queries instead of one bulk load.
2. **Full-table-style scans per request:** `getDailyProviderWebsiteCounts` scans `placementTask` (L460–482) and `getDailyRequesterWebsiteCounts` scans `OpportunityImpression` (L430–458) for every ranking run, unindexed on the join-heavy path.
3. **Synchronous on GET path:** all ranking work is synchronous inside `getProviderOpportunities`.
4. **No caching of daily counts:** recomputed each request.
5. **Config cached (60s)** — good.

**Scalability:** Degrades with candidate volume. Acceptable at low volume; needs batching + caching before scale.

---

## 19. FAILURE HANDLING AUDIT

- No opportunities: safe "No suitable opportunities are currently available right now." (provider-task.service.ts L241) + availability reason. ✅
- Visibility calculations fail: `RecommendationService.recommend` catches error → `{ ranked: [], degraded: true }` (recommendation.service.ts L61–69). ✅
- Marketplace restrictions apply: handled upstream; never leaks rule names (generic messages). ✅
- Low pool mode activates: safe empty / relaxed exposure. ✅
- Users never receive "Internal Marketplace Errors": failures isolated, best-effort logging. ✅ **Fully Compliant.**

---

## 20. ARCHITECTURAL AUDIT

**GOOD:** Visibility does NOT perform Matching / Validation / Risk / Credit / Notification / Payment responsibilities. Those live in their own engines/modules. ✅

**VIOLATIONS:**
- A-ARCH-1: **Visibility Control is not a separate service** from the Ranking Engine (spec flow requires separation). It is merged into `RankingService.rankAndFilter`.
- A-ARCH-2: **RankingService performs governance cap-filtering** (suppression removal, daily caps, requester exposure caps) that drops candidates — a responsibility that arguably belongs to a governance/eligibility stage, not visibility weighting. This conflates "rank/weight" with "include/exclude."
- No evidence of the BAD pattern (Visibility → Credit → Payments → Notifications → Analytics). ✅

---

## 21. MISMATCH ANALYSIS (requirement-by-requirement)

### R1 — Visibility Control system implemented
- **Requirement:** A system managing exposure/visibility/frequency/priority/balancing.
- **Current:** Present but merged into `RankingService`.
- **Evidence:** ranking.service.ts L194–296; no `visibility-control.service.ts`.
- **Status:** Partially Implemented.
- **Mismatch:** No standalone module per spec.
- **Fix:** Extract `VisibilityControlService.apply(candidates, config, context)` as a pure post-ranking stage.

### R2 — Compliance with spec responsibilities
- **Status:** Partially Implemented (scope correct within merged service; architectural separation missing).

### R3 — Independence from eligibility
- **Status:** Partially Implemented (eligibility runs upstream ✅; but ranking drops governance-capped candidates).

### R4 — Opportunity exposure managed correctly
- **Status:** Partially Implemented (exposure counters, caps, requester cap present; enforced by dropping).

### R5 — Visibility adjustments operating correctly
- **Status:** Partially Implemented (factors present & configurable; RESTRICTED reduction missing).

### R6 — Marketplace balancing
- **Status:** Partially Implemented (exposure penalty + caps + low-pool; no explicit balancing floor).

### R7 — Scalability
- **Status:** Needs Refactor (N+1 + full scans on request path).

### R8 — Architectural separation
- **Status:** Needs Refactor (no separate Visibility Control service).

### R9 — Missing marketplace requirements
- **Status:** Missing — UNDER_REVIEW monitored-visibility; RESTRICTED significant reduction + cap reduction; visibility-adjustment logging; override-event logging.

### R10 — Business-rule violations
- **Status:** Partially Implemented — no hard-constraint override found; RESTRICTED under-reduced is a spec-under-compliance, not an override violation.

### Website Status rows (R-STATUS)
- ACTIVE: Fully. LOW_PRIORITY: Fully. LIMITED_ACCESS: Partial. UNDER_REVIEW: Partial. RESTRICTED: Partial. SUSPENDED: Fully.

### Visibility Weighting (R-WEIGHT)
- **Status:** Fully Implemented (all 8 factors considered; configurable).

### Quality Influence (R-QUALITY)
- **Status:** Fully Implemented.

### Frequency (R-FREQ)
- **Status:** Partially Implemented.

### New User Boost (R-NEWUSER)
- **Status:** Fully Implemented.

### Liquidity (R-LIQ)
- **Status:** Fully Implemented.

### Low Pool (R-LOWPOOL)
- **Status:** Fully Implemented (minor: no explicit lower-priority boost).

### Distribution (R-DIST)
- **Status:** Fully Implemented.

### Hard Constraint (R-HARD)
- **Status:** Fully Implemented.

### Tier Priority (R-TIER)
- **Status:** Fully Implemented.

### Database (R-DB)
- **Status:** Fully Implemented (minor: no dedicated visibility config table).

### API (R-API)
- **Status:** Fully Implemented (centralized; no separate visibility API).

### Logging (R-LOG)
- **Status:** Partially Implemented (missing adjustment + override-event logs).

### Performance (R-PERF)
- **Status:** Needs Refactor.

### Failure Handling (R-FAIL)
- **Status:** Fully Implemented.

### Architecture (R-ARCH)
- **Status:** Needs Refactor.

---

## 22. FINAL REPORT

### 1. Visibility Control compliance percentage
**~72%** (behaviour largely present and configurable; fails on separation + 2 status behaviours + logging + performance).

### 2. Fully implemented requirements
Execution ordering (pre-ranking), responsibility scope limitation, ACTIVE/LOW_PRIORITY/SUSPENDED statuses, visibility weighting (all 8 factors), quality influence (no eligibility override), new-user boost, liquidity protection, low-pool mode, distribution rules, hard-constraint non-bypass, tier priority, database schema support, API centralization, failure handling.

### 3. Partially implemented requirements
Standalone system existence, independence from eligibility, exposure management, visibility adjustments, marketplace balancing, frequency fairness, LIMITED_ACCESS / UNDER_REVIEW / RESTRICTED statuses, logging (adjustments/overrides), performance.

### 4. Missing requirements
- Standalone Visibility Control service (architectural).
- `UNDER_REVIEW` "monitored visibility" distinct treatment.
- `RESTRICTED` "significant visibility reduction" + reduced participation cap.
- Visibility-adjustment event log.
- Visibility override-application event log.
- Minimum-exposure fairness floor for starved websites (visibility-level).

### 5. Architectural issues discovered
- A-ARCH-1: Visibility merged into Ranking Engine (no separate stage).
- A-ARCH-2: RankingEngine drops governance-capped candidates (include/exclude inside weighting stage).

### 6. Database changes required
- Optional: add `restrictedVisibilityFactor`, `underReviewVisibilityFactor` to `MarketplaceScoringConfig` (or reuse `lowPriorityFactor` pattern).
- Optional: dedicated `VisibilityAdjustmentLog` model (candidateId, websiteId, factor, reason, beforeScore, afterScore, marketplaceMode, createdAt).
- No breaking schema change strictly required; status factors are config-driven.

### 7. Service changes required
- Extract `VisibilityControlService` from `RankingService` (pure function: input ranked candidates → adjusted exposure/priority/status factors; no eligibility drops).
- Keep `RankingService` = ordering/weighting only.
- Add RESTRICTED + UNDER_REVIEW visibility factors.
- Batch daily-count + override + tier lookups (bulk by id/authorId up front).

### 8. API changes required
- None strictly required. Optional: expose a read-only `GET /admin/marketplace/visibility-config` and an override-application log endpoint for observability.

### 9. Highest priority issues
1. Separate Visibility Control service (architectural compliance).
2. RESTRICTED significant visibility reduction + cap reduction.
3. UNDER_REVIEW monitored-visibility signal.
4. Performance refactor (N+1 + full scans).
5. Visibility-adjustment + override logging.

### 10. Scalability concerns
- Per-candidate N+1 override/tier queries.
- Full `placementTask` / `OpportunityImpression` scans per request.
- Synchronous request-path ranking with no daily-count cache.
- Will degrade as candidate volume grows.

### 11. Recommended implementation order
1. Extract `VisibilityControlService` (pure post-ranking stage); wire into `RecommendationService` after `RankingService`.
2. Add `RESTRICTED` visibility-reduction factor + reduced daily cap; add `UNDER_REVIEW` monitored-visibility tag.
3. Batch/bulk daily-count, override, and tier lookups; add short-TTL cache.
4. Add `VisibilityAdjustmentLog` + override-application logging.
5. Add visibility-level minimum-exposure fairness floor for starved websites.

### 12. Estimated implementation complexity
**Medium–High.** (Service extraction + schema/log additions + performance refactor; no high-risk data migration.)

---

## 23. CONCLUSION

The BACKLYST backend implements the *behaviours* of Visibility Control comprehensively and keeps them correctly downstream of eligibility/validation, with robust failure isolation. However, it does **NOT fully comply** with the specification because (a) Visibility Control is not a separated service from the Ranking Engine, (b) two status behaviours (RESTRICTED significant reduction, UNDER_REVIEW monitored visibility) are under-implemented, (c) observability for visibility adjustments/overrides is missing, and (d) the request-path ranking performs unscalable per-candidate queries. Resolving the five highest-priority issues above would bring the implementation to full compliance.

---

## 24. REMEDIATION APPLIED (2026-07-18, post-audit)

The audit's five highest-priority gaps (R1 separation, RESTRICTED reduction, UNDER_REVIEW monitored, logging, status-cap) have been remediated in code. Changes:

| Audit gap | Fix | Evidence |
|---|---|---|
| A-ARCH-1 / R1 (no separate Visibility Control) | New `VisibilityControlService` is now a **distinct post-ranking stage** wired into `RecommendationService` after `RankingService`. `RankingService` is now a pure ranker (no exposure/cap drops). | `src/modules/task/market-algoritm/visibility-control.service.ts`, `recommendation.service.ts` L41–84, `marketplace-engine.module.ts` |
| RESTRICTED significant reduction + restricted participation | `restrictedVisibilityFactor` (default 0.4) multiplies score; reduced daily cap derived from `restrictedDailyCapFactor` (default 0.34 → cap 1) OR an a
---

## 24. REMEDIATION APPLIED (2026-07-18, post-audit)

The audit's five highest-priority gaps (R1 separation, RESTRICTED reduction, UNDER_REVIEW monitoreing
#nfi
The audit's five highest-priority gaps (R1 separaito
| Audit gap | Fix | Evidence |
|---|---|---|
| A-ARCH-1 / R1 (no separate Visibility Control) | New `VisibilityControlService` is now a **distinct post-ranki `Ma|---|---|---|
| A-ARCH-1 / R1ev| A-ARCH-1 /yF| RESTRICTED significant reduction + restricted participation | `restrictedVisibilityFactor` (default 0.4) multiplies score; reduced daily cap derived from `restrictedDailyCapFactor` (default 0.34 → cap 1) OR an a
---

## 24. REMEDIATION APPLIED (2026-07-18, post-audit)

The audit's five highest-priority gaps (R1 separation, RESTRICTED reduction, UNDER_REVIEW monitoreing
#nfi
Tg ---

## 24. REMEDIATION APPLIED (2026-07-18, post-audit)

The audit's five highest-priority gaps (R1 separation, RESTRICTED reduction, UNDER_REVIEW monitoreing
#nfi
The audit's five highest-priority gaps (R1 separarequest
The audit's five highest-priority gaps (R1 separat |#nfi
The audit's five highest-priority gaps (R1 separaito
| Audit gap | Fix | Evidence |
|---|---|---wTheit| Audit gap | Fix s` L39 |

**Verification:**
- `npx |---|---|---|
| A-ARCH-1 / R1 Marketplace alg| A-ARCH-1 / R1ev| A-ARCH-1 /yF| RESTRICTED significant reduction + restricted participation | `restrictedVisibilityFactor` (def, ---

## 24. REMEDIATION APPLIED (2026-07-18, post-audit)

The audit's five highest-priority gaps (R1 separation, RESTRICTED reduction, UNDER_REVIEW monitoreing
#nfi
Tg ---

## 24. REMEDIATION APPLIED (2026-07-18, post-audit)

The audit's five hier
#sui
The audit's five highest-priority gaps (R1 separa ou#nfi
Tg ---

## 24. REMEDIATION APPLIED (2026-07-18, post-audit)

The audit's five highest-priority TETg ??
## 2ER_
The audit's five highest-priority gaps (R1 separa ad#nfi
The audit's five highest-priority gaps (R1 separarequest
The audit's five highest-priority gapsinThem-Theosure fairness floor for starved long-tail sites.
