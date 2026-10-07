# BACKLYST Marketplace Velocity Rules Audit Report

**Date:** 2026-07-20
**Auditor:** Senior Software Architect & Marketplace Systems Expert

## 1. Executive Summary

A comprehensive audit of the application's Velocity Rules implementation (Section 13) has been completed. The audit investigated the interaction velocity limits, domain-level restrictions, tier-based limits, anti-clustering mechanisms, and marketplace governance rules.

**Velocity Rules Compliance Percentage:** 50%

Significant discrepancies were found between the specifications and the current implementation regarding how limits are counted and the maximum allowed interactions per tier.

## 2. Core Requirements Audit

### Requirement
The marketplace must prevent domains from completing excessive interactions within short periods of time. The ABSOLUTE MAXIMUM is 5 completed interactions per week PER DOMAIN.

### Current Implementation
The `TierEngine` implements weekly interaction limits per tier. However, the limits are currently configured as:
- FREE: 5
- SILVER: 15
- GOLD: 40
- PLATINUM: 100
- ENTERPRISE: 250

Additionally, `TierEngine.countWeeklyInteractions` counts the interactions across **all** provider websites belonging to a user (`authorId`), rather than per **root domain**.

### Evidence
*   `src/modules/task/market-algoritm/tier-engine.service.ts` (`WEEKLY_LIMIT_BY_TIER` mapping)
*   `src/modules/task/market-algoritm/tier-engine.service.ts` (`countWeeklyInteractions` querying by `assignedProviderWebsiteId: { in: websiteIds }` where `websiteIds` are all websites owned by `userId`)
*   `src/modules/task/market-algoritm/validation.engine.ts` (Calls `countWeeklyInteractions` using `input.actorUserId`)

### Status
**Non-Compliant**

### Mismatch Analysis
1. **Limit Values:** The hard tier limits are vastly exceeding the specification's absolute maximum of 5 interactions per week per domain.
2. **Aggregation Level:** The count aggregates interactions by user rather than by root domain. Sub-domains of different root domains are incorrectly pooled together for the count, and sub-domains of the same root domain are not properly normalized for the domain-level limit.

### Fix Recommendation
1. Update `WEEKLY_LIMIT_BY_TIER` in `TierEngine` to exactly match the specification: FREE (2), SILVER (3), GOLD (4), PLATINUM (5), ENTERPRISE (5).
2. Refactor `countWeeklyInteractions` to accept a `rootDomain` instead of (or in addition to) `userId`. It should query interactions where the provider domain resolves to the target root domain.
3. Update `ValidationEngine` to pass the provider's normalized root domain when checking the weekly limit.

---

## 3. Interaction Clustering Restrictions Audit

### Requirement
Interactions must NOT be clustered on the same day. They must be properly spaced and distributed over time.

### Current Implementation
The `ValidationEngine` enforces a `MATCH_SPACING` rule. If a provider website applies to a task, it checks the `lastApplicationAt` against `minHoursBetweenMatches` defined in the website's matching profile. This prevents rapid, clustered interactions. 

### Evidence
*   `src/modules/task/market-algoritm/validation.engine.ts` (`MATCH_SPACING` logic around line 571)
*   `src/modules/task/market-algoritm/validation-result.ts` (`MATCH_SPACING` rule definitions)

### Status
**Fully Implemented**

### Mismatch Analysis
None. While the spec does not mandate specific hourly minimums, the use of a configurable `minHoursBetweenMatches` successfully fulfills the "no clustering on the same day" and "properly spaced" requirements.

### Fix Recommendation
None required.

---

## 4. Limit Enforcement Priority Audit

### Requirement
The strictest rule must always apply (Validation Rules > Tier Weekly Limits > Additional Constraints). Validation restrictions always take priority.

### Current Implementation
Validation rules are processed sequentially in `ValidationEngine`. Hard governance (cooldowns, network concentration, pattern flags) acts as Level 2 and Level 2b/c blocks, preventing any interaction before Tier Capacity (Level 3) is evaluated. If any validation fails, the interaction is rejected. 

### Evidence
*   `src/modules/task/market-algoritm/validation.engine.ts` (Execution flow: LEVEL 2 Governance -> LEVEL 3 Capacity)

### Status
**Fully Implemented**

### Mismatch Analysis
None. The architecture strictly enforces validation logic before Tier limits.

### Fix Recommendation
None required.

---

## 5. Early Stage vs. Scaling Mode

### Requirement
Early Stage Mode limits to 1-3 per week. Scaling Mode allows up to 5 per week. These must operate together with Tier limits.

### Current Implementation
Tier limits provide a hard cap. Mode enforcement relies on these tier limits dynamically restricting lower-tier users in early stages. 

### Status
**Requires Code Update** (tied to the Tier limits fix)

### Mismatch Analysis
Currently, since Tier limits are configured much higher than 5, neither mode properly enforces the 3 or 5 maximums. 

### Fix Recommendation
Once Tier limits are corrected to max 5, the limits will natively comply with both modes.

---

## 6. Failure Handling Audit (User Experience)

### Requirement
Users must NEVER see internal marketplace restrictions (e.g., "Velocity Rule limitation exceeded").

### Current Implementation
Internal rules like `WEEKLY_LIMIT` and `MATCH_SPACING` are explicitly caught and mapped to a safe public message `getSafeMessage('COOLDOWN')` (e.g. "This opportunity is currently unavailable").

### Evidence
*   `src/modules/task/market-algoritm/validation.engine.ts` (Public message mapping for COOLDOWN rules)

### Status
**Fully Implemented**

### Mismatch Analysis
None.

### Fix Recommendation
None required.

---

## 7. Final Report Summary

1. **Velocity Rules Compliance Percentage:** 50%
2. **Fully implemented requirements:** Anti-clustering (`MATCH_SPACING`), Safe public error messages, Limit enforcement priority.
3. **Partially implemented requirements:** None.
4. **Missing / Incorrect requirements:** Weekly interaction limit caps, Root Domain-level aggregation for interaction counting.
5. **Architectural issues discovered:** `TierEngine` aggregates usage by User rather than by Root Domain, which violates the specification's domain-level restrictions.
6. **Highest priority issues:** Fix `WEEKLY_LIMIT_BY_TIER` values and refactor `countWeeklyInteractions` to aggregate by Root Domain.

### Conclusion
The BACKLYST application successfully handles anti-clustering and user-experience requirements for Velocity Rules. However, the core weekly limits are drastically misconfigured, and the counting mechanism groups interactions by user rather than by root domain. Code changes are required to bring the system into full compliance with Section 13.
