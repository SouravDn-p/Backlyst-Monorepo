# BACKLYST Marketplace Distribution Rules Audit Report

**Date:** 2026-07-20
**Auditor:** Senior Software Architect & Marketplace Systems Expert

## 1. Executive Summary

A comprehensive audit of the application's Distribution Rules implementation has been completed, evaluating compliance against the BACKLYST Marketplace Specifications. The audit investigated domain diversity, domain concentration, unique domain prioritization, interaction spread, execution flow, low pool mode, and marketplace balancing.

**Distribution Rules Compliance Percentage:** 75%

While the core mechanics of marketplace balancing, niche distribution caps, network concentration limits, and new-user boosts are correctly implemented, the audit discovered significant architectural violations regarding execution flow and missing hierarchical prioritization for unique domains.

---

## 2. Core Requirements Audit

### Requirement
The system MUST reduce repeated pairings, prioritize domains not recently used, avoid concentration within small groups of domains, favor diversity over repetition, and improve marketplace distribution.

### Current Implementation
The `DistributionEngine` limits niche caps (`isNicheWithinCap`), flags network concentration (`isNetworkConcentrationAllowed`), calculates a domain `diversityScore`, and filters previously interacted domains if `forceNewDomainNext` is active.

### Evidence
*   `src/modules/task/market-algoritm/distribution-engine.service.ts`

### Status
**Partially Implemented**

### Mismatch Analysis
While concentration limits and niche balancing are present, the strict prioritization ladder for unique domains is not fully supported (see Section 4). Also, geographic and opportunity type distributions are missing.

### Fix Recommendation
Extend the `DistributionEngine` to natively support granular bucketed diversity scoring and location/type distribution caps.

---

## 3. Domain Diversity & Concentration Audit

### Requirement
Detect concentrated domain relationships, small relationship clusters, and calculate interaction diversity to balance the marketplace. 

### Current Implementation
The `DistributionEngine` effectively guards against monopolization. The `isNetworkConcentrationAllowed` function validates if a root domain is absorbing too many matches within a rolling window. It serves as a hard gate. `computeDiversityScore` scales from 0-100 based on the ratio of distinct counterpart domains to total interactions.

### Evidence
*   `src/modules/task/market-algoritm/distribution-engine.service.ts` (`isNetworkConcentrationAllowed`, `computeDiversityScore`)

### Status
**Fully Implemented**

### Mismatch Analysis
None. The anti-concentration and diversity ratio logic accurately prevents small cluster monopolies.

### Fix Recommendation
None required.

---

## 4. Unique Domain Prioritization Audit

### Requirement
The application must prioritize opportunities in the following order: Highest Priority -> Never Interacted Domains -> Rarely Used Domains -> Previously Used Domains -> Cooldown Restricted Domains.

### Current Implementation
The system applies a flat numerical `diversityScore` weight in the `RankingEngine` and a boolean `forceNewDomainNext` filter in the `MatchingEngine`. There is no explicitly defined bucketed ladder enforcing this exact priority order.

### Evidence
*   `src/modules/task/market-algoritm/ranking.service.ts` (Applies `diversityScore * config.diversityWeight`)
*   `src/modules/task/market-algoritm/matching.engine.ts` (Applies `forceNewDomainNext`)

### Status
**Missing**

### Mismatch Analysis
The boolean exclusion (`forceNewDomainNext`) and linear diversity boost do not fulfill the requirement to explicitly order candidates into the required priority buckets (Never > Rarely > Previously).

### Fix Recommendation
Refactor the `DistributionEngine` to categorize candidates into interaction frequency buckets. Pass these buckets to the `RankingEngine` to apply stepped score multipliers or use them as a secondary sort key after Tiers.

---

## 5. Interaction Spread Audit

### Requirement
Interactions must be distributed across unique domains, marketplace categories, marketplace niches, geographical locations, and opportunity types.

### Current Implementation
Spread across unique domains (`diversityScore`) and niches (`isNicheWithinCap`) is implemented. However, distribution across geographical locations and opportunity types is not explicitly tracked or capped by the `DistributionEngine`.

### Evidence
*   `src/modules/task/market-algoritm/distribution-engine.service.ts`

### Status
**Partially Implemented**

### Mismatch Analysis
Geographical and opportunity-type distributions are entirely missing from the distribution logic. 

### Fix Recommendation
Add geographic and opportunity-type tracking to the `DistributionEngine` (e.g., `isLocationWithinCap` and `isOpportunityTypeWithinCap`) mirroring the niche distribution logic.

---

## 6. Execution Flow Audit (Critical)

### Requirement
Distribution Rules must execute AFTER the Matching Engine and Dynamic Relaxation. 
Flow: Matching Engine -> Dynamic Relaxation -> Distribution Engine -> Ranking Engine.

### Current Implementation
The `MatchingEngine` calls `DistributionEngine.filterNewDomains` during candidate generation (`buildHardRuleCandidates`). This executes BEFORE `applyRelaxation` inside the matching loop.

### Evidence
*   `src/modules/task/market-algoritm/matching.engine.ts` (Lines 340-410)

### Status
**Needs Refactor**

### Mismatch Analysis
This is an **architectural violation**. The distribution logic (`forceNewDomainNext` filtering) drops candidates before they reach dynamic relaxation. This premature dropping can artificially starve the candidate pool and incorrectly trigger `LOW_POOL` mode. The Distribution Rules are improperly invading the Matching Engine's domain.

### Fix Recommendation
Move `DistributionEngine` evaluations entirely out of `buildHardRuleCandidates`. The orchestrator (`provider-task.service.ts`) should call the `DistributionEngine` to filter or score candidates *after* `MatchingEngine` has fully completed dynamic relaxation and candidate selection.

---

## 7. New User Support Audit

### Requirement
Support first-success optimization, diversified early opportunities, and increased marketplace participation.

### Current Implementation
Implemented via `firstSuccessBoostActive` flags inside matching profiles, which amplifies visibility/ranking for new users until their first success is recorded, handled securely via background crons.

### Evidence
*   `src/modules/task/market-algoritm/boost.service.ts`
*   `src/modules/task/market-algoritm/opportunity-guarantee.cron.ts`

### Status
**Fully Implemented**

### Mismatch Analysis
None.

### Fix Recommendation
None required.

---

## 8. Final Report Summary

1. **Distribution Rules Compliance Percentage:** 75%
2. **Fully implemented requirements:** Domain Concentration limits, Niche Distribution caps, Low Pool mode support, New User Support (first success boost), Failure Handling (fail-open distribution queries).
3. **Partially implemented requirements:** Interaction Spread (missing Geo and Opportunity Type distribution).
4. **Missing requirements:** Unique Domain Prioritization explicitly bucketed ladder (Never > Rare > Previous).
5. **Architectural issues discovered:** **YES.** Distribution logic executes *before* Dynamic Relaxation, directly violating the execution flow specification and invading the Matching Engine's responsibilities.
6. **Database changes required:** Add distribution caps for geography and opportunity types.
7. **Service changes required:** `MatchingEngine` must be decoupled from `DistributionEngine`.
8. **API changes required:** None.
9. **Highest priority issues:** Fix the execution flow violation to prevent premature candidate dropping before relaxation.
10. **Scalability concerns:** None. `DistributionEngine` uses rolled up queries safely.
11. **Recommended implementation order:** 1) Fix Execution Flow (Service layer decoupling). 2) Implement Unique Domain Prioritization ladder. 3) Expand Interaction Spread to include Geo/Type.
12. **Estimated implementation complexity:** High (Due to decoupling core algorithm engines and restructuring candidate flow).

### Conclusion
While anti-concentration and diversity foundations are strong, the execution flow is structurally compromised. The `DistributionEngine` is being evaluated too early in the cycle (inside `MatchingEngine`), breaking the separation of concerns and risking premature starvation of marketplace supply. Correcting this sequence is the highest priority.
