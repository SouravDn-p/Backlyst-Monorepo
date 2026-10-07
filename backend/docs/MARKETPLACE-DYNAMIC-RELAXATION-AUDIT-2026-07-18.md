# BACKLYST Marketplace — Dynamic Relaxation Audit (Section 3)

**Date:** 2026-07-18
**Scope:** Dynamic Relaxation implementation vs. BACKLYST Marketplace Specifications
**Method:** Evidence-based codebase audit. Findings not supported by code are reported as `NOT FOUND IN THE CODEBASE`.

**Key files reviewed:**
- `src/modules/task/market-algoritm/matching-relaxation.engine.ts`
- `src/modules/task/market-algoritm/matching.engine.ts`
- `src/modules/task/market-algoritm/matching.types.ts`
- `src/modules/task/market-algoritm/marketplace-config.service.ts`
- `src/modules/task/provider-task/provider-task.service.ts`
- `src/modules/task/market-algoritm/validation.engine.ts`
- `src/modules/task/market-algoritm/supply-demand-rebalancer.service.ts`
- `src/modules/task/market-algoritm/liquidity.engine.ts`
- `src/modules/task/market-algoritm/manual-match-queue.cron.ts`
- `prisma/schema/marketplace.prisma`

---

## PRIMARY OBJECTIVES — Summary Answers

1. **Is Dynamic Relaxation implemented?** Yes — `MatchingRelaxationEngine` + progressive loop in `MatchingEngine.findCandidates`.
2. **Does it follow the marketplace specifications?** Partially. Levels 0–4 exist, but the *semantics* diverge from the spec.
3. **Is the relaxation order correct?** Progression 0→maxRelaxationLevel is correct, but **country is relaxed at Level 2, before tags at Level 3** — spec places language/country relaxation at Level 3. Order violation.
4. **Are hard and soft rules properly separated?** Yes. Hard rules are enforced before/around relaxation; the relaxation engine only touches category/tag/country/language attributes.
5. **Is Low-Pool Mode implemented correctly?** Partially — detection exists but is a **label only**; it triggers no candidate expansion.
6. **Can governance rules be bypassed?** No via relaxation. One indirect concern: `supply-demand-rebalancer` increments `maxRelaxationLevel` unbounded.
7. **Is the implementation scalable?** Concern — full in-memory candidate cross-join per request; unbounded queries.
8. **Are architectural responsibilities properly separated?** Yes — ranking/analytics/distribution all delegated.

**Overall compliance: ~62%.**

---

## EXECUTION FLOW AUDIT — ✅ Correct

`ProviderTaskService.getProviderOpportunities`:
1. Resolve context (`marketplaceConfigService.getMergedConfig`) — `provider-task.service.ts` L187-192
2. Eligibility (`ValidationEngine.isUserActive`, `getEligibleProviderWebsites`, `getEligibleMarketplaceWebsiteIds`) — `matching.engine.ts` L63-97
3. Domain cooldown filtering (`getCooldownBlockedPairKeys`) — `matching.engine.ts` L295-299
4. Candidate generation (`buildHardRuleCandidates`) — `matching.engine.ts` L101-105
5. **Progressive relaxation loop** — `matching.engine.ts` L114-129
6. Ranking (`rankingService.rankAndFilter`) — `provider-task.service.ts` L204-206
7. Recommendation / impressions — `provider-task.service.ts` L234-263

**Relaxation runs after validation and before ranking. No pipeline ordering violation.**

---

## RELAXATION LEVEL AUDIT

Evidence: `matching-relaxation.engine.ts` L43-82; attribute derivation `matching.engine.ts` L400-483.

| Level | Spec intent | Code behavior | Status |
|---|---|---|---|
| **0 EXACT** | exact category/niche/tag/language/country | `categoryExact && tagsExact && countryOk && languageOk` (no explicit *niche* dimension distinct from category) | Partial |
| **1 RELATED** | related categories + related tags | requires `categoryExact` + `tagsPartial`. Category must still be EXACT; no "related categories" | Partial / Needs Refactor |
| **2 BROAD** | broader niche + adjacent niches | `categoryRelated && countryOk`; "RELATED" = raw `industry` string equality (`matching.engine.ts` L418-420). No adjacency/mapping | Partial |
| **3** | relax language + country | `categoryRelated || tagsPartial` — country/language are NOT the relaxation axis; already relaxed at L2 | Needs Refactor (order mismatch) |
| **4 FALLBACK** | any eligible opportunity IF hard/governance passed | `true` passthrough over hard-filtered set | Implemented & safe |

- **Configurable related categories / related tags:** `NOT FOUND IN THE CODEBASE`. Search for `relatedCategory|categoryMapping|nicheMapping|adjacent|RelatedTag|CategoryRelation` returned 0 results. "RELATED" derives from raw `industry` / `primaryCategoryKey` equality, not a configurable mapping.
- **Adjacent / broader niche matching (Level 2):** `NOT FOUND` as a real concept — only industry-string equality.
- **Can invalid opportunities enter Level 4?** No — Level 4 passes only candidates already inside `hardRuleCandidates`.

---

## HARD CONSTRAINT AUDIT — ✅ No bypass

All hard rules run before/around relaxation and are never touched by it:
- Ownership / website verification → `getEligibleProviderWebsites` / `getEligibleMarketplaceWebsiteIds` (VERIFIED + VISIBLE + `!isFlag` + `!isWalletLock`), `validation.engine.ts` L185-226, L385-418.
- Domain cooldown / repeat / reciprocal → `getCooldownBlockedPairKeys`, `canMatchWithWindows`, `validation.engine.ts` L243-300, L795-827.
- Weekly / tier / daily → `ValidationEngine` LEVEL 3, `validation.engine.ts` L576-648.
- Risk / status / admin → `ValidationEngine` LEVEL 4, `validation.engine.ts` L650-681.

**Level 4 FALLBACK only passes candidates already inside `hardRuleCandidates`; hard constraints cannot be relaxed. Verified.**

---

## LOW POOL MODE AUDIT — ⚠️ Partial (label only)

- Detected: `marketplaceMode = hardRuleCandidates.length < context.minViableMatches ? 'LOW_POOL' : 'NORMAL'` — `matching.engine.ts` L109-112.
- Used for: audit logging (`writeMatchingAudit`) + empty-result reason (`provider-task.service.ts` L216).
- **Missing:** LOW_POOL performs **no candidate expansion** — it does not broaden the eligible set, load more tasks, or change behavior beyond the label. Broader matching is only reached passively when the relaxation loop hits Level 4.
- Relaxes hard rules? No — safe.
- Async safety net exists separately: `manual-match-queue.cron.ts` flags neglected provider profiles for admin review (`ManualMatchQueue`).

---

## FALLBACK / LIQUIDITY / NEW-USER AUDIT

- **Fallback matching:** Level 4 passthrough is the only fallback. No progressive *candidate-set* expansion — only *criteria* loosening. `DEVELOPER_GUIDE.md` documents a level-3/4 query-relaxation + "absolute fallback to top verified websites" design that is **NOT present** in the current `MatchingEngine` — documentation drift.
- **Empty-result prevention:** `provider-task.service.ts` L213-232 returns a safe availability message (spec §29). Internal rule names never leaked. ✅
- **Liquidity protection:** `LiquidityEngine.calculateOpportunityScore`, `SupplyDemandRebalancerService`, `supply-demand.cron.ts` exist. Rebalancer **mutates global `maxRelaxationLevel` with no ceiling** (`supply-demand-rebalancer.service.ts` L56-75: `currentLevel + 1` unbounded) — architectural / scalability risk.
- **New-user support:** `firstSuccessBoostActive` (schema `marketplace.prisma` L85) is a *ranking/boost* signal, not a relaxation feature. First-success optimization as a relaxation behavior: `NOT FOUND IN THE CODEBASE`. Governance stays enforced for new users. ✅

---

## DATABASE AUDIT

Present:
- `MarketplaceScoringConfig.minViableMatches`, `.maxRelaxationLevel` (`marketplace.prisma` L228-230)
- `MarketplaceModeConfig` (mode enum + `preset` Json) (`marketplace.prisma` L571-579)
- `MatchingAuditLog.relaxationLevel/marketplaceMode/processingTimeMs` (L187-203)
- `OpportunityImpression.relaxationLevel` (L166)

Missing:
- Category-mapping / related-tag / adjacent-niche tables (for real Levels 1–2).
- Explicit LOW_POOL config (thresholds live only inline in the engine).
- Per-level configurability of *what* each level relaxes.

---

## API AUDIT

- Only consumer: `ProviderTaskService.getProviderOpportunities`.
- Relaxation is centralized in `MatchingEngine`/`MatchingRelaxationEngine`. ✅
- No architectural duplication of relaxation logic found.

---

## LOGGING AUDIT

Logged (`writeMatchingAudit`, `matching.engine.ts` metadata):
- relaxationLevel ✅, candidate counts (candidatesEval/eligibleMatches) ✅, marketplaceMode ✅, processingTimeMs ✅, hardRuleCandidateCount ✅.

Missing as first-class fields:
- LOW_POOL "activation" event, fallback-usage flag, matching-failure reason (currently inferred, not logged explicitly).

---

## PERFORMANCE AUDIT — ⚠️

- `buildHardRuleCandidates` builds a full provider × task in-memory cross join and re-filters the entire array per forceNewDomain provider (`matching.engine.ts` L276-398).
- Unbounded `findMany` on tasks/websites (pagination applied only post-ranking).
- Scales poorly as marketplace supply/demand grows.

---

## FAILURE HANDLING AUDIT — ✅

- Safe generic public messages; internal validation failures hidden (`provider-task.service.ts` L222-231, `getSafeMessage` in `validation.engine.ts`).
- Distribution errors fail open safely (`matching.engine.ts` L377-380).

---

## ARCHITECTURAL AUDIT — ✅

`MatchingEngine` does NOT perform ranking, risk, visibility, notification, tier, credit, or dispute work — all delegated (`RankingService`, `RiskEngine`, `DistributionEngine`, `MarketplaceOverrideService`, `TaskNotificationService`). Confirmed by explicit exclusion comments and by the trimmed `matchingProfile` select in `getEligibleProviderWebsiteRows` (L182-196).

---

## 🔴 HIGHEST-PRIORITY FINDING (Bug)

**Marketplace mode is mislabeled into the engine.**
`provider-task.service.ts` L189 sets `context.mode = (config.mode as MatchingContext['mode'])`, but `config.mode` returns `'EARLY_STAGE' | 'SCALING'` (`marketplace-config.service.ts` L122; `MarketplaceMode` enum `marketplace.prisma` L502-505), while `MatchingContext.mode` is typed `'NORMAL' | 'LOW_POOL'` (`matching.engine.ts` L563, L570-575).

Consequence: the `emptyResult` path stamps `marketplaceMode: 'EARLY_STAGE'` into `MatchingAuditLog.marketplaceMode`, **corrupting analytics** and conflating the config-mode axis (EARLY_STAGE/SCALING) with the low-pool-mode axis (NORMAL/LOW_POOL). Note the non-empty path correctly derives `marketplaceMode` from candidate counts, so the two paths are inconsistent.

**Status: Needs Refactor.**

---

## MISMATCH ANALYSIS (representative)

### Requirement: Level 1 = related categories + related tags (configurable)
- **Current Implementation:** Requires exact category + partial tags; "related" derived from raw industry-string equality.
- **Evidence:** `matching-relaxation.engine.ts` L59-60; `matching.engine.ts` L418-420, L465.
- **Status:** Partially Implemented / Needs Refactor.
- **Mismatch:** No configurable related-category or related-tag mapping; Level 1 still demands exact category.
- **Fix:** Add mapping tables (`CategoryRelation`, `RelatedTag`) and rewire attribute derivation to consult them; make relatedness admin-configurable.

### Requirement: Level 3 relaxes language + country
- **Current Implementation:** Level 2 already relaxes country; Level 3 relaxes category/tags via OR.
- **Evidence:** `matching-relaxation.engine.ts` L61-64.
- **Status:** Needs Refactor.
- **Mismatch:** Country/language relaxation ordering does not match spec; language is never a distinct relaxation step.
- **Fix:** Reassign axes so country/language relaxation occurs at Level 3; keep niche broadening at Level 2.

### Requirement: Low-Pool Mode expands candidates
- **Current Implementation:** Label only; no expansion.
- **Evidence:** `matching.engine.ts` L107-112.
- **Status:** Partially Implemented.
- **Fix:** On LOW_POOL, widen eligible task/website pool (without relaxing hard rules) before the relaxation loop.

### Requirement: Governance never bypassed by liquidity tooling
- **Current Implementation:** Rebalancer increments `maxRelaxationLevel` unbounded.
- **Evidence:** `supply-demand-rebalancer.service.ts` L56-75.
- **Status:** Needs Refactor.
- **Fix:** Bound increments to a configured ceiling and auto-revert after the window.

---

## FINAL REPORT

1. **Dynamic Relaxation compliance: ~62%.**
2. **Fully implemented:** execution order; hard/soft separation; Level 4 passthrough safety; safe empty-result messaging; centralization; architectural separation; core logging.
3. **Partially implemented:** Levels 0–3 semantics; Low-Pool (label only); fallback (criteria-only); liquidity protection.
4. **Missing:** configurable related-category/related-tag mappings; adjacent/broader-niche mapping; LOW_POOL candidate expansion; per-level relaxation config; first-success relaxation; explicit fallback/low-pool-activation log fields.
5. **Architectural problems:** unbounded `maxRelaxationLevel` mutation in rebalancer; DEVELOPER_GUIDE documents a design not matching the code.
6. **Database changes required:** add `CategoryRelation`/`NicheAdjacency` + `RelatedTag` mapping tables; add explicit low-pool thresholds/mode column separate from `MarketplaceModeConfig.mode`; add per-level relaxation config.
7. **Service changes required:** fix `context.mode` mapping bug; make Levels 1/2 consume mapping tables; implement real LOW_POOL candidate expansion; bound rebalancer relaxation increments; reconcile DEVELOPER_GUIDE.
8. **API changes required:** none functionally; optionally expose admin config for relaxation levels/mappings.
9. **Highest-priority issues:** (a) mode-mapping bug; (b) Level-2/3 country/language ordering & "related" being raw-string equality; (c) missing configurable mappings.
10. **Scalability concerns:** in-memory cross join; unbounded queries; unbounded relaxation-level growth.
11. **Recommended implementation order:** 1) fix mode-mapping bug → 2) add mapping tables + rewire Levels 1–2 → 3) correct Level 2/3 country/language ordering → 4) real LOW_POOL expansion → 5) bound rebalancer + query pagination → 6) logging fields + doc reconciliation.
12. **Estimated implementation complexity: Medium–High** (mapping tables + engine rewire = High; bug/order/logging fixes = Low–Medium).

**Conclusion:** The application implements Dynamic Relaxation with a correct pipeline position and safe hard-constraint isolation, but it does **not fully comply** with the specifications. The main gaps are semantic (relaxation-level definitions and ordering), configurational (no related-category/tag/niche mappings), functional (LOW_POOL is a label without expansion), plus a high-priority mode-mapping bug that corrupts analytics.
