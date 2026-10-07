# Marketplace Tier System Audit (2026-07-20)

This document outlines the current implementation status of the Tier System rules (Section 16) by comparing the codebase against the provided specifications.

## 1. Available Subscription Tiers & Weekly Limits
**Specification:**
- Free: Max 2/week
- Silver: Max 3/week
- Gold: Max 4/week
- Platinum: Max 5/week
- Enterprise: Max 5/week PER DOMAIN

**Implementation Status: ⚠️ PARTIALLY IMPLEMENTED (INCORRECT)**
- **Implemented:** The `tier-engine.service.ts` correctly maps tiers to base weekly limits (FREE: 2, SILVER: 3, GOLD: 4, PLATINUM: 5).
- **Missing/Incorrect:** 
  1. The `ENTERPRISE` tier is currently hardcoded to `250` in `WEEKLY_LIMIT_BY_TIER` instead of `5`.
  2. The `WEEKLY_LIMIT` check in `validation.engine.ts` evaluates the limit using `countWeeklyInteractions(userId)`. This counts interactions across *all* domains for that user. The specification strictly requires: *"Weekly limitations must always be calculated at: ROOT DOMAIN LEVEL. Multiple domains must never share weekly limitations."* 
  3. While there is a `DOMAIN_VELOCITY_LIMIT` check that correctly caps *any* domain at a hard maximum of 5 interactions per week, the tier-specific limits (e.g., 2 for Free) are being incorrectly applied globally to the user rather than per domain.

## 2. Priority Order
**Specification:**
- Enterprise > Platinum > Gold > Silver > Free
- Higher subscription tiers receive increased matching priority.

**Implementation Status: ✅ IMPLEMENTED**
- The priority order is correctly mapped in `tier-engine.service.ts` via the `PRIORITY_BY_TIER` mapping:
  - ENTERPRISE: 2
  - PLATINUM: 1.8
  - GOLD: 1.5
  - SILVER: 1.2
  - FREE: 1
- These multipliers are resolved by `TierEngine` and passed downstream to the ranking algorithms to influence priority scoring.

## 3. Domain Pool Access
**Specification:**
- Free -> Limited Domain Pool
- Gold -> Improved Domain Pool
- Platinum -> Premium Domain Pool

**Implementation Status: ❌ MISSING**
- There is currently no logic in `matching.engine.ts`, `validation.engine.ts`, or `tier-engine.service.ts` that filters or partitions the opportunity pool based on domain quality or tier pool definitions (Limited/Improved/Premium).
- The matching engine retrieves candidate tasks based purely on categorical attributes (e.g., tags, category, DR) and hard validation rules, but it does not restrict access to specific "pools" of domains based on the user's subscription tier.

## 4. Multi-Domain Support
**Specification:**
- Only Enterprise explicitly supports multiple domains.
- Limitations are calculated per domain.

**Implementation Status: ⚠️ PARTIALLY IMPLEMENTED**
- As noted in section 1, the weekly limitation tracking is incorrectly sharing limits across multiple domains for a single user by using the global `countWeeklyInteractions` method instead of isolating them via `countDomainWeeklyInteractions`.

## 5. Tier Enforcement & Governance Priority
**Specification:**
- No tier may bypass Validation Engine rules (reciprocal, repeat pair, risk, etc.).
- Validation Rules > Tier Weekly Limits > Additional Constraints (strictest rule always applies).
- Tier calculations must NEVER override previous marketplace validations.

**Implementation Status: ✅ IMPLEMENTED**
- The `ValidationEngine` evaluates rules strictly in sequence:
  - Level 1/2: Eligibility and Governance (Cooldowns, Network Concentration)
  - Level 3: Capacity (Weekly limits, Domain Velocity Limits)
  - Level 4: Behaviour (Risk, Status)
- Tier limits (`WEEKLY_LIMIT`) are evaluated *after* hard validation rules like `DOMAIN_COOLDOWN` and `NETWORK_CONCENTRATION`. If a hard governance rule fails, it correctly takes precedence, ensuring tier benefits never bypass marketplace restrictions.

---

## Summary of Required Fixes
To fully align with the specification:
1. **Tier Engine:** Update `WEEKLY_LIMIT_BY_TIER.ENTERPRISE` to `5` in `tier-engine.service.ts`.
2. **Validation Engine:** Refactor the `WEEKLY_LIMIT` check in `validation.engine.ts` to evaluate the user's tier limit against `countDomainWeeklyInteractions(providerRootDomain)` instead of the aggregate user count.
3. **Domain Pools:** Implement logic to tag and restrict "Limited", "Improved", and "Premium" domain pools in the matching/visibility engines based on the resolved tier.
