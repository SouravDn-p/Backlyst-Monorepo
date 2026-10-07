# BACKLYST Marketplace Matching Engine — Compliance Audit Report

> Prepared by: Senior Software Architect / Marketplace Systems Auditor
> Date: 2026-07-18
> Scope: `src/modules/task/market-algoritm/*`, `src/modules/task/provider-task/*`, `src/modules/task/marketplace-engine/*`, `prisma/schema/*`
> Method: Only findings directly supported by the codebase are reported. Where a requirement cannot be verified, it is marked **NOT FOUND IN THE CODEBASE**.

This audit is based on the actual implementation. Below each required section follows the mandated format: **Requirement → Current Implementation → Evidence → Status → Gap Analysis → Recommendation**.

---

## 1. Matching Engine Existence & Responsibilities

### Requirement
A dedicated `MatchingEngine` must exist with the sole responsibilities of: eligible candidate generation, compatibility matching, candidate selection, progressive matching relaxation, and low-pool support. It must NOT perform ranking, visibility, risk scoring, quality scoring, tier, notification, credit, dispute, or analytics work.

### Current Implementation
A `MatchingEngine` class exists (`matching.engine.ts`). It generates hard-rule candidates, applies relaxation via `MatchingRelaxationEngine`, and returns `MatchCandidate[]`. Ranking is performed by a **separate** `RankingService`. Risk/tier/quality are separate engines.
However, `MatchingEngine.findCandidates` computes a `compatibilityScore` inside `buildCandidate` and returns it on every candidate. The `compatibilityScore` is a weighted score (category 25 + tags up to 20 + country 10 + language 10 + DA/DR 15, etc.). It is later consumed by `RankingService` as `config.compatibilityWeight`. The spec's "Output Validation" section forbids the Matching Engine from performing "opportunity weighting" / ranking-like scoring. A compatibility score is arguably within "compatibility matching", but it is a continuous weighted number that is directly reused as a ranking signal — a grey area, but not full ranking.

### Evidence
- `src/modules/task/market-algoritm/matching.engine.ts:17` (`@Injectable() export class MatchingEngine`)
- `matching.engine.ts:431-509` `calculateCompatibility` (weighted numeric score)
- `matching.engine.ts:78` `compatibilityScore: number` on `MatchCandidate`
- `ranking.service.ts:162` consumes `candidate.compatibilityScore * config.compatibilityWeight`
- Separate engines: `ranking.service.ts`, `risk.engine.ts`, `tier-engine.service.ts`, `quality-status.engine.ts`, `quality.engine.ts`, `liquidity.engine.ts`

### Status
**Fully Implemented** (with a minor scope concern on `compatibilityScore` — see Gap Analysis).

### Gap Analysis
The engine does NOT compute visibility, risk, quality, tier, notifications, credits, disputes, or analytics — these are correctly externalised. The one overlap is `compatibilityScore` being a weighted numeric value reused directly by ranking. This is arguably "compatibility metadata" but is borderline "opportunity weighting".

### Recommendation
Keep `compatibilityScore` but document it explicitly as a compatibility signal only (not a final rank), or rename to `compatibilityPoints` and ensure it is never interpreted as final ordering. No architectural change required, only naming/clarification.

---

## 2. Execution Flow Audit

### Requirement
The flow must be: Authentication → Marketplace Eligibility → Marketplace Validation → Domain Cooldown Filtering → Marketplace Constraints → Candidate Selection → Matching Engine → Distribution Engine → Ranking Engine → Recommendation Output.

### Current Implementation
The live request path is `providerTaskService.getProviderOpportunities`:
1. `matchingEngine.findCandidates(providerId, filters)` — internally does:
   - `validationEngine.isUserActive` (Authentication + Eligibility)
   - `validationEngine.getEligibleProviderWebsites` (provider eligibility)
   - `validationEngine.getEligibleMarketplaceWebsiteIds` (requester eligibility)
   - `getCandidateTasks` (task selection)
   - `buildHardRuleCandidates` (Domain Cooldown Filtering via `getCooldownBlockedPairKeys`, ownership/self-exclusion, `forceNewDomainNext` via `distributionEngine.filterNewDomains`)
   - Relaxation loop (progressive matching)
2. `rankingService.rankAndFilter(candidates)` — Ranking Engine
3. Response mapping → Recommendation Output

**Deviations found:**
- There is **no standalone "Marketplace Validation" stage before candidate selection** in the opportunity-browse path. `validateTransition` (the per-stage validation engine) is only invoked at **application time** (`applyToTask`), not during `getProviderOpportunities`. So in the browse path, "Marketplace Validation" is folded into eligibility checks inside the Matching Engine, not a separate stage.
- "Distribution Engine" per the spec flow runs AFTER Matching Engine, but in the code the `DistributionEngine` is used **inside** the Matching Engine (cooldown/niche/forceNewDomain). The spec's sequential flow (Matching → Distribution → Ranking) is not literally followed; Distribution is a dependency of Matching.
- The low-pool mode flag is derived inside `matching.engine.ts` (`marketplaceMode = hardRuleCandidates.length < minViableMatches ? 'LOW_POOL' : 'NORMAL'`) — there is no Marketplace Constraints stage that decides mode before matching.

### Evidence
- `provider-task.service.ts:137-141` (findCandidates → rankAndFilter)
- `matching.engine.ts:34-92` (eligibility + cooldown + mode derivation inside Matching Engine)
- `matching.engine.ts:264-383` (`buildHardRuleCandidates` calls `distributionEngine.filterNewDomains`)
- `provider-task.service.ts:401-413` (validateTransition only at applyToTask)
- `validation.engine.ts:451` `validateTransition` (stage-based, not used in browse path)

### Status
**Partially Implemented**

### Gap Analysis
The linear spec flow is not materialised as discrete orchestrated stages. Validation, cooldown filtering, and distribution are invoked inline within the Matching Engine rather than as ordered upstream/downstream stages. The DOMAIN COOLDOWN filtering and constraints ARE enforced (good), but the *separation of stages* (especially a pre-matching "Marketplace Validation" gate and a post-matching "Distribution" stage) does not match the prescribed ordering. Also `validateTransition` (with WEEKLY_LIMIT, NICHE_CAP, NETWORK_CONCENTRATION, MATCH_SPACING) is **not** run before candidates are surfaced — only at application. This means a candidate shown in browse could still be rejected at apply due to weekly/niche/network caps — acceptable but means "Marketplace Constraints" are not applied during candidate generation.

### Recommendation
Introduce an explicit orchestrator (e.g. a `MarketplaceOrchestratorService`) that runs the stages in the documented order and calls the engines as discrete steps, even if some are no-ops in the browse path. At minimum, run a lightweight "Marketplace Constraints" pre-check (weekly limit, network concentration) during candidate generation so surfaced candidates are actionable.

---

## 3. Input Validation Audit (Matching Engine receives validated inputs)

### Requirement
The Matching Engine must receive validated Provider, Task, and Marketplace inputs (full lists in the prompt).

### Current Implementation
`findCandidates(providerId, filters)` receives only `providerId` + `OpportunityFilters { placementType?, linkAttribute?, status?, page?, limit? }`.
- **Provider Info**: Most provider fields (websiteId, rootDomain, category, tags, niches, country, language, subscriptionTier) are re-fetched *inside* the engine via `getEligibleProviderWebsiteRows`, not passed in. `subscriptionTier` is NOT passed; it is resolved later by `TierEngine` during ranking, not matching.
- **Task Info**: Re-fetched via `getCandidateTasks` (Task ID, status, placementType, tags, country, language, requesterWebsite). `requiredDomainRating`, `category`, `tags` for the task are NOT explicitly stored on `PlacementTask` (only `requiredDomainRating`, `country`, `language`, `placementType`, `linkAttribute` exist — see schema). There is **no `category` or `tags` field on `PlacementTask`**.
- **Marketplace Info**: `MarketplaceConfigService.getMergedConfig()` reads `mode`, `minViableMatches`, `maxRelaxationLevel`, cooldowns. `Low Pool Status` and `Administrative Overrides` are resolved inside the engine (`overrideService.resolveForWebsite`).

### Evidence
- `matching.types.ts:1-7` `OpportunityFilters` (minimal)
- `matching.engine.ts:124-204` re-fetches provider website fields
- `placement.prisma:1-81` `PlacementTask` — has `requiredDomainRating`, `country`, `language`, `placementType`, `linkAttribute`; **NO `category`, NO `tags`**
- `matching.engine.ts:86-92` config/mode/low-pool read
- `website.prisma:60-67` provider website has `primaryCategoryKey`, `secondaryCategoryKey`, `marketplaceTagKeys`, `country`, `language`, `domainRating` (these back provider-side matching)

### Status
**Partially Implemented**

### Gap Analysis
The Matching Engine does not receive a pre-validated input DTO; it re-derives inputs from the DB. This is functional but violates the "receives validated inputs" intent and couples the engine to DB shape. Critically, **Task Category and Task Tags are NOT FOUND IN THE CODEBASE on `PlacementTask`**, so "exact/related category matching" on the *task* side and "exact/partial tag matching" must currently rely on the *requester website's* category/tags (cross-referenced against provider website), not a task-level category/tag. The task's own category/tags are absent. `subscriptionTier` is not an input to matching (resolved at ranking). `Administrative Overrides` and `Low Pool Status` are read but not passed as structured inputs.

### Recommendation
Define a `MatchingInput` DTO validated upstream (controller/pipe) carrying provider, task, and marketplace context. Add `category`/`categoryKey` and `tags` arrays to `PlacementTask` if task-level category matching is required by spec, or formally document that category matching uses requester-website category only. Pass `subscriptionTier`/`marketplaceMode`/`lowPoolStatus` as explicit inputs.

---

## 4. Candidate Generation Audit

### Requirement
Candidates generated by dedicated services; invalid tasks excluded before matching; candidate generation must validate website eligibility, ownership, verification, restrictions, marketplace limitations.

### Current Implementation
Candidate generation is performed **inside** `MatchingEngine` (`getCandidateTasks`, `getRequesterWebsiteMap`, `buildHardRuleCandidates`). It excludes:
- Inactive users (`isUserActive`)
- Ineligible provider websites (`getEligibleProviderWebsites` — verification, visibility, flag, wallet lock, marketplaceStatus, risk≥75, suppression)
- Ineligible requester websites (`getEligibleMarketplaceWebsiteIds`)
- Tasks not OPEN/WAITING_FOR_APPLICANTS, already assigned, or already applied to by provider
- Same-root-domain pairs
- Cooldown-blocked pairs (repeat + reciprocal)
- `forceNewDomainNext` diversification via `DistributionEngine`

Ownership is enforced at application (`OWN_TASK`), not during generation. Verification is enforced (VERIFIED + VISIBLE). Restrictions (risk≥75, suppression, SUSPENDED) are enforced via eligibility.

### Evidence
- `matching.engine.ts:124-204`, `206-238`, `264-383`
- `validation.engine.ts:163-226` (eligibility: VERIFIED, VISIBLE, !isFlag, !isWalletLock, marketplaceStatus browsable, risk<75, not suppressed)
- `validation.engine.ts:243-300` (cooldown blocked pair keys)
- `provider-task.service.ts:377` (`OWN_TASK` check only at apply)

### Status
**Fully Implemented** (for the dimensions present)

### Gap Analysis
- Candidate generation is embedded in the Matching Engine rather than a separate "Candidate Generation" service. The spec's "Which services generate candidates" implies separation; here the Matching Engine itself generates.
- **Ownership** (provider≠requester for the specific task) is enforced via `requesterId: { not: providerId }` in the task query (`matching.engine.ts:218`) — actually present at generation; good. But the explicit `validateTransition` OWN_TASK rule is only at apply.
- No separate "Candidate Selection" service; selection = relaxation loop inside Matching Engine.

### Recommendation
Extract candidate generation into a `CandidateGenerationService` (or keep in Matching Engine but clearly delineate). This is a structural improvement; functionally candidate generation is sound.

---

## 5. Core Matching Rules

### Requirement
Category (exact/related/broader), Tag (exact/partial), Niche (primary/secondary), Country, Language, Placement Compatibility, Authority (DA/DR) compatibility.

### Current Implementation
- **Category**: `buildCandidate` computes `categoryExact` (provider.primaryCategoryKey === requester.primaryCategoryKey) and `industryRelated` (normalized industry equality). `matchingAttributes.category` ∈ EXACT | RELATED | ANY. **There is NO "related category" hierarchy table and NO "broader category" matching** — "RELATED" is derived from `industry` string equality, not a category taxonomy.
- **Tag**: exact overlap (`tagOverlap === requesterTags.length`) and partial (`tagOverlap > 0`). Supported.
- **Niche**: only `primaryCategoryKey` drives category matching; `secondaryCategoryKey` is captured on `Website`/`DomainInteraction`/`DomainPairStat` and used for **NicheDistributionCap** (governance), but is **NOT used as a matching criterion** in `buildCandidate`/`relaxation`. So secondary-niche *matching* is NOT FOUND in the matching logic.
- **Country / Language**: exact-or-unknown; relaxed at level 3. Supported.
- **Placement Compatibility**: `placementType`/`linkAttribute` are used as *task filters* (`getCandidateTasks`), not as a compatibility matrix (e.g. Guest Post vs Link Insertion vs Banner vs Sponsored). There is **no placement-compatibility matrix**; it is an exact equality filter only.
- **Authority (DA/DR)**: `requiredDomainRating` vs `providerWebsite.domainRating` → `authorityMeets` / `matchingAttributes.authority` ∈ MEETS | BELOW | UNKNOWN. Supported (but DR only; "Domain Authority" via Moz is checked at apply time with an external call, `getMozDomainStats`).

### Evidence
- `matching.engine.ts:400-461` (category/tag/country/language/authority attributes)
- `matching-relaxation.engine.ts:43-65` (relaxation uses category EXACT/RELATED, tags EXACT/PARTIAL)
- `website.prisma:60-64` (primary/secondary category keys exist)
- `validation.engine.ts:689-715` (secondary niche used only for NICHE_CAP governance)
- `matching.engine.ts:227-228` (placementType/linkAttribute as filters)
- `provider-task.service.ts:415-428` (Moz DA gate at apply)

### Status
**Partially Implemented**

### Gap Analysis
- **Related category** = industry string match, not a category hierarchy. **Broader category** = NOT FOUND.
- **Secondary niche** matching = NOT FOUND (only used for caps).
- **Placement compatibility matrix** (Guest Post/Link Insertion/Banner/Sponsored) = NOT FOUND; only exact type filter.
- DA/DR = DR only in matching; true DA is an external apply-time check.

### Recommendation
Introduce a `CategoryHierarchy` model (parent/child) to support related + broader category matching. Add secondary-niche as a relaxation/matching signal. Implement a `PlacementCompatibility` ruleset (or enum constraint) rather than exact filter. Consider caching Moz DA at candidate time if DR alone is insufficient.

---

## 6. Hard Rule Validation

### Requirement
The Matching Engine must never produce opportunities violating ownership, website eligibility, verification, domain cooldown, reciprocal restrictions, weekly interaction limits, marketplace restrictions, risk restrictions, administrative restrictions.

### Current Implementation
The Matching Engine enforces (at generation): user active, provider/requester website eligibility (verification VISIBLE, not flag/wallet-lock, browsable status, risk<75, not suppressed), same-domain exclusion, domain cooldown (repeat+reciprocal), `forceNewDomainNext`. These are **hard filters** applied before relaxation — relaxation only relaxes soft matching attributes (category/tags/country/language), never the hard rules.
However: **weekly interaction limits, network concentration, niche caps, match spacing, and administrative restrictions (other than FORCE_MATCH) are NOT enforced during candidate generation** — they live in `validateTransition` and are only run at application time. Also `WEEKLY_LIMIT`/`NETWORK_CONCENTRATION`/`NICHE_CAP`/`MATCH_SPACING` are governance checks that, if they fail, would reject a candidate already shown in browse.

### Evidence
- `matching.engine.ts:264-383` (hard-rule candidate building)
- `matching-relaxation.engine.ts:43-82` (relaxation never touches ownership/cooldown/eligibility)
- `validation.engine.ts:519-715` (cooldown/network/niche/weekly/spacing — only called from `applyToTask`)

### Status
**Partially Implemented**

### Gap Analysis
Hard rules that ARE enforced pre-matching: ownership (same-domain + requesterId≠provider), eligibility, verification, cooldown, reciprocal (via direction-aware cooldown). Hard rules NOT enforced during generation: **weekly interaction limits, network concentration, niche caps, match spacing, administrative restrictions (SUPPRESS/PENALTY/RECIPIENT overrides other than FORCE_MATCH)**. A candidate surfaced in browse may thus be rejected at apply — the spec wants hard rules never bypassed, which is technically true (apply still blocks), but the browse pool can contain non-actionable candidates.

### Recommendation
Pre-validate the governance hard rules (at least weekly limit + network concentration + niche cap) during candidate generation so the surfaced pool is guaranteed actionable. Keep `validateTransition` at apply as the fail-closed backstop.

---

## 7. Progressive Relaxation Audit

### Requirement
Level 0 (exact category/tags/language/country) → Level 1 (related categories/tags) → Level 2 (broader niche) → Level 3 (relaxed country/language) → Level 4 (any eligible). Hard rules never relaxed.

### Current Implementation
`matching-relaxation.engine.ts` implements 5 levels (0–4) mirroring spec ordering:
- L0 EXACT: category EXACT + tags EXACT + country/language exact-or-unknown
- L1 RELATED: category EXACT + tags PARTIAL + language exact-or-unknown
- L2 BROAD: category RELATED (or EXACT) + country exact-or-unknown
- L3 BROAD: category RELATED (or EXACT) OR tags PARTIAL
- L4 FALLBACK: any (passthrough)

`matching.engine.ts` loops levels 0→maxRelaxationLevel, breaking when `>= minViableMatches` or final level. **Hard rules are never part of relaxation** (they are pre-filtered). Ordering matches spec.

### Evidence
- `matching-relaxation.engine.ts:43-82`
- `matching.engine.ts:96-105` (level loop, breaks at minViableMatches)

### Status
**Fully Implemented** (with the caveat that L2 "broader niche" uses industry-equality as the RELATED proxy, not a true broader-niche taxonomy — see §5).

### Gap Analysis
The semantic mapping is correct and ordering is correct. The only mismatch is that "related/broader category" is backed by industry string equality rather than a real category hierarchy, so the *meaning* of RELATED/BROAD diverges from spec intent.

### Recommendation
Back RELATED/BROADER on a real `CategoryHierarchy` so the relaxation semantics match the spec vocabulary.

---

## 8. Low Pool Mode Audit

### Requirement
Support low-pool detection, fallback matching, broader niche matching, candidate expansion; low-pool mode must NEVER relax ownership, verification, reciprocal, cooldown, or marketplace restrictions.

### Current Implementation
Low-pool detection: `matching.engine.ts:88-92` derives `marketplaceMode = hardRuleCandidates.length < minViableMatches ? 'LOW_POOL' : 'NORMAL'`. Fallback matching = relaxation reaching L4 (any eligible). Broader niche matching = L2/L3 RELATED. Candidate expansion = the relaxation loop itself widens the pool.
Hard rules are **not** relaxed in low-pool (relaxation only touches soft attributes). Ownership/verification/cooldown/reciprocal remain enforced in `buildHardRuleCandidates` regardless of mode.
`ManualMatchQueue` (`marketplace.prisma:582`) and `manual-match-queue.cron.ts` exist for persistent low-pool admin-assisted matching. `MarketplaceModeConfig` (EARLY_STAGE/SCALING) preset exists.

### Evidence
- `matching.engine.ts:88-92, 96-119` (mode derivation + writeAudit marketplaceMode)
- `matching-relaxation.engine.ts` (no hard-rule relaxation)
- `marketplace.prisma:502-579` (`MarketplaceMode`, `MarketplaceModeConfig`)
- `marketplace.prisma:582-602` `ManualMatchQueue`
- `src/modules/task/market-algoritm/manual-match-queue.cron.ts`

### Status
**Fully Implemented**

### Gap Analysis
Detection + fallback + broader-niche + expansion all present; hard rules preserved. The only nuance: "low pool status" is derived post-hoc from candidate count, not a marketplace-level input/config flag — acceptable but the spec lists "Low Pool Status" as a marketplace input.

### Recommendation
Optionally persist/expose a computed `lowPoolStatus` on the marketplace config so it can be an explicit input rather than derived from candidate counts.

---

## 9. New User Matching Audit

### Requirement
Support first-success optimization, increased compatibility matching, reduced early friction; remain compliant with governance.

### Current Implementation
`firstSuccessBoostActive` (`WebsiteMatchingProfile`) is consumed by `RankingService` as `newWebsiteBoostFactor` (multiplicative boost) — this is a **ranking** benefit, not a matching relaxation. `ScoringService.updateScoresAfterTask` consumes the first-success boost via `BoostService.applyNewUserBoost`. In the Matching Engine, `firstSuccessBoostActive` is loaded but only passed through in `matchingProfile` (not used to alter matching/relaxation). So "increased compatibility matching" / "reduced early friction" at the *matching* layer is **NOT FOUND** — it is a ranking boost only.
Governance is not bypassed (boost is ranking-only; hard rules still enforced).

### Evidence
- `ranking.service.ts:122-128, 170-177` (newWebsiteBoostFactor applied to score)
- `scoring.service.ts:179-189` (`boostService.applyNewUserBoost`)
- `matching.engine.ts:151` (`firstSuccessBoostActive` loaded, not used in matching logic)
- `matching-profile.defaults.ts` (default `firstSuccessBoostActive: true`)

### Status
**Partially Implemented**

### Gap Analysis
New-user optimization exists only at ranking (boost), not at matching (compatibility/relaxation/friction). The spec frames new-user matching as a matching-engine behaviour. No governance violation, but the matching-layer behaviour is absent.

### Recommendation
If spec requires matching-layer new-user treatment, add a relaxation bias (e.g. allow earlier relaxation for first-success providers) gated by `firstSuccessBoostActive`, while keeping all hard rules intact. Otherwise document that new-user optimization is intentionally ranking-only.

---

## 10. Output Validation Audit

### Requirement
Matching Engine returns ONLY eligible candidates, compatibility metadata, matching information. Must NOT perform ranking, visibility, risk, opportunity weighting, recommendation ordering.

### Current Implementation
`findCandidates` returns `MatchCandidate[]` (task, providerWebsite, requesterWebsite, compatibilityScore, relaxationLevel, matchingAttributes, reasons). Ranking/recommendation ordering happens in `RankingService.rankAndFilter` + `providerTaskService` response mapping. **However**, `compatibilityScore` is a weighted numeric score (see §1) that is a form of "opportunity weighting" input and is consumed by ranking with a weight. Visibility/risk/quality/tier are NOT computed in the Matching Engine.

### Evidence
- `matching.types.ts:60-88` `MatchCandidate`
- `matching.engine.ts:431-509` `calculateCompatibility` (weighted)
- `ranking.service.ts:17-210` (ranking separate)

### Status
**Partially Implemented**

### Gap Analysis
Ranking/visibility/risk/quality/tier/notification/credit are correctly external. The single concern is `compatibilityScore` being a weighted composite reused as a ranking weight — borderline "opportunity weighting". It is not final ordering (RankingService sorts), so the strict prohibition on "recommendation ordering" is respected.

### Recommendation
Clarify `compatibilityScore` as a non-authoritative compatibility signal; ensure it is never sorted on directly by the Matching Engine (it is not).

---

## 11. Architectural Audit

### Requirement
Independent services: Matching Engine, Validation Engine, Distribution Engine, Ranking Engine, Risk Engine, Tier Engine, Liquidity Engine. No mixing of business responsibilities.

### Current Implementation
All seven engines exist as independent `@Injectable()` classes and are declared/exported in `MarketplaceEngineModule`:
- `MatchingEngine`, `MatchingRelaxationEngine` (matching)
- `ValidationEngine` (validation)
- `DistributionEngine` (distribution/niche/cooldown-diversity)
- `RankingService` (ranking)
- `RiskEngine` (risk)
- `TierEngine` (tier)
- `LiquidityEngine` (liquidity/opportunity score)

Responsibilities are reasonably separated. **Concerns:**
1. `ValidationEngine` depends on `TierEngine` and `DistributionEngine` (`validation.engine.ts:9-12, 556, 638-647`) — governance validation pulls in tier + distribution. Acceptable but couples validation to distribution.
2. `MatchingEngine` depends on `DistributionEngine` (forceNewDomain) and `MarketplaceOverrideService` (FORCE_MATCH) — matching invokes distribution/override inline.
3. `RankingService` depends on `TierEngine` + `OverrideService` — ranking consumes tier/override. Acceptable.
4. `ScoringService` is a broad orchestrator that calls QualityEngine, QualityStatusEngine, RiskEngine, LiquidityEngine, BehaviourPatternService, BoostService, DistributionEngine — this is a "scoring pipeline" service, not a violation but centralised.

The BAD example (Matching → Risk → Tier → Visibility → Notifications → Credits in one service) is **not** present. Engines are separate.

### Evidence
- `marketplace-engine.module.ts:46-100`
- `validation.engine.ts:69-74` (deps)
- `matching.engine.ts:20-27` (deps)
- `ranking.service.ts:10-15` (deps)

### Status
**Fully Implemented** (with minor coupling notes)

### Gap Analysis
Architecture is clean and matches the GOOD example. Minor coupling: Validation→Tier→Distribution; Matching→Distribution→Override. Not violations, but could be further decoupled via an orchestrator.

### Recommendation
Introduce a thin `MarketplaceOrchestratorService` to coordinate stages (addresses §2). Keep engines independent. No refactoring of engine internals required.

---

## 12. Database Audit

### Requirement
Support category matching, niche matching, task metadata, placement compatibility, marketplace configuration, marketplace mode configuration, low pool configuration.

### Current Implementation
- **Category matching**: `Website.primaryCategoryKey`/`secondaryCategoryKey` + `WebsiteCategoryKey` table. Present. No hierarchy/parent links.
- **Niche matching**: primary/secondary keys present; niche *distribution caps* (`NicheDistributionCap`) present. Niche *matching* (secondary) not in matching logic (§5).
- **Task metadata**: `PlacementTask` has `requiredDomainRating`, `country`, `language`, `placementType`, `linkAttribute`, `requesterWebsiteId`. **No task-level `category` or `tags`** (§3).
- **Placement compatibility**: `PlacementType` enum + `LinkAttribute` enum exist; used as exact filters. No compatibility matrix table.
- **Marketplace configuration**: `MarketplaceScoringConfig` (weights, caps, cooldowns, quality thresholds). Present.
- **Marketplace mode configuration**: `MarketplaceModeConfig` (EARLY_STAGE/SCALING + preset JSON). Present.
- **Low pool configuration**: derived from `minViableMatches` (in `MarketplaceScoringConfig`) + `MarketplaceModeConfig`. `ManualMatchQueue` present. No dedicated "low pool config" entity, but covered by config.

### Evidence
- `website.prisma:117-132` (`WebsiteCategoryKey`, tags)
- `website.prisma:60-67` (category keys)
- `placement.prisma:1-81` (task fields; no category/tags)
- `marketplace.prisma:205-299` (`MarketplaceScoringConfig`)
- `marketplace.prisma:502-579` (`MarketplaceMode`, `MarketplaceModeConfig`)
- `marketplace.prisma:450-464` (`NicheDistributionCap`)

### Status
**Partially Implemented**

### Gap Analysis
Missing/weak: (a) no `CategoryHierarchy` (related/broader), (b) no task-level `category`/`tags`, (c) no placement-compatibility matrix. All other requirements present.

### Recommendation
Add `CategoryHierarchy` (parentId), add `categoryKey`/`tags` to `PlacementTask` (if task-level matching required), add a `PlacementCompatibilityRule` model if a matrix is mandated.

---

## 13. Logging & Audit

### Requirement
Log matching requests, candidate counts, relaxation levels, processing time, marketplace mode, fallback matching usage.

### Current Implementation
`writeAudit` in `MatchingEngine` writes `MatchingAuditLog` with: userId, websiteId, candidatesEval, eligibleMatches, relaxationLevel, marketplaceMode, processingTimeMs, metadata (providerWebsiteCount, hardRuleCandidateCount). Present for: requests, candidate counts, relaxation level, processing time, marketplace mode.
**Fallback matching usage**: the audit records `marketplaceMode` ('NORMAL'/'LOW_POOL') and `relaxationLevel` (the level that produced the final set), which implies fallback usage, but there is **no explicit boolean/flag "fallbackUsed"** or distinct "fallback matching usage" log field. The relaxation level reaching 4 is the proxy.

### Evidence
- `matching.engine.ts:529-551` `writeAudit` + `MatchingAuditLog` create
- `marketplace.prisma:187-203` `MatchingAuditLog` model

### Status
**Partially Implemented**

### Gap Analysis
All required log dimensions are present EXCEPT an explicit "fallback matching usage" indicator. The mode + relaxationLevel together infer it, but a dedicated field is absent.

### Recommendation
Add a `fallbackUsed: Boolean` (or `relaxationReachedMax: Boolean`) field to `MatchingAuditLog` and populate it when the loop hits `maxRelaxationLevel`.

---

## 14. Failure Handling Audit

### Requirement
Handle: no candidates, marketplace restrictions, candidate validation fails, fallback fails. Never expose internal constraints to users.

### Current Implementation
- **No candidates / filtered**: `providerTaskService.getProviderOpportunities` returns `sendResponse('No suitable opportunities are available right now.', {... availability: { available: false, reason: 'LOW_POOL'|'FILTERED' }})` — safe message, reason is internal but not a raw rule name. Good.
- **Marketplace restrictions**: surfaced only as generic `publicMessage` from `validateTransition` (`getSafeMessage('GENERIC'|'COOLDOWN'|'ELIGIBILITY')`). Good.
- **Candidate validation fails**: the engine fails closed (returns `[]`) on ineligible; no internal detail leaked.
- **Fallback fails** (relaxation exhausts, still empty): returns `[]` → safe "No suitable opportunities" message. Good.
Internal validation failures are never exposed (e.g. `logValidation`/audit writes are wrapped in `.catch(() => {})`).

### Evidence
- `provider-task.service.ts:148-167` (safe empty response)
- `validation.engine.ts:721-737` (`getSafeMessage` generic/cooldown/eligibility)
- `validation.engine.ts:748-764` (audit wrapped in catch)
- `matching.engine.ts:34-78` (returns [] safely on each gate)

### Status
**Fully Implemented**

### Gap Analysis
None of significance. Messages are safe and non-leaking. (Minor: the `availability.reason` value `'LOW_POOL'`/`'FILTERED'` is arguably an internal classification, but it is a benign category, not a rule name.)

### Recommendation
Optionally map `availability.reason` to a fully user-neutral string if strict non-leakage is required; otherwise acceptable.

---

## 15. Performance Audit

### Requirement
Avoid unnecessary queries, expensive synchronous calculations, excessive candidate records, support efficient filtering.

### Current Implementation
`findCandidates` performs multiple sequential DB round-trips:
1. `isUserActive` (1 query)
2. `getEligibleProviderWebsites` (1 query + in-memory filter)
3. `getEligibleMarketplaceWebsiteIds` (1 query — **fetches ALL marketplace websites**)
4. `getCandidateTasks` (1 query — fetches all matching OPEN tasks for ALL eligible requester sites)
5. `getRequesterWebsiteMap` (1 query — fetches all requester websites for those tasks)
6. `getCooldownBlockedPairKeys` (1 query over all provider×requester domain pairs)
7. Per-website `overrideService.resolveForWebsite` via `Promise.all` (N queries)
8. Per-provider `distributionEngine.filterNewDomains` (N queries)

Then a **cartesian candidate expansion** `tasks × providerWebsites` in `buildHardRuleCandidates` — this can produce O(T×P) candidate objects in memory before relaxation filtering. For large T and P this loads excessive records into memory.
`getRequesterWebsiteMap` and `getCandidateTasks` fetch broad sets without pagination. The candidate set is then filtered in memory — no DB-level limit on candidate volume.
`RankingService.rankAndFilter` then does additional per-candidate queries (daily counts, requester counts, override map) — another round of N+ queries.

### Evidence
- `matching.engine.ts:34-92` (sequential gates, full eligible-website fetch)
- `matching.engine.ts:206-262` (broad task + requester website fetches)
- `matching.engine.ts:264-383` (cartesian expansion + per-website override/distribution calls)
- `ranking.service.ts:23-63` (per-candidate override/tier map resolution)

### Status
**Needs Refactor**

### Gap Analysis
- **N+1 queries**: `overrideService.resolveForWebsite` and `distributionEngine.filterNewDomains` are called per-website inside loops.
- **Excessive in-memory records**: cartesian T×P expansion; no cap/pagination before relaxation.
- **Broad unfiltered fetches**: `getEligibleMarketplaceWebsiteIds` returns ALL eligible requester sites globally; `getCandidateTasks` returns all open tasks for them.
- **Synchronous heavy work**: compatibility scoring is cheap, but the volume of candidates makes the loop expensive at scale.
Scalability concern: **High** as marketplace grows.

### Recommendation
- Bulk-resolve overrides (single query with `where: { websiteId: { in: [...] } }`) instead of per-website loops.
- Push candidate filtering to the DB (prisma `where` with category/tag/country/language/DR predicates) instead of fetching then filtering in memory.
- Cap candidate generation with a `LIMIT`/batch and apply relaxation per-batch.
- Consider a precomputed eligible-candidate materialised view or cached index for hot browse paths.
- Run matching in the existing BullMQ async pipeline (already used for scoring/alerts) rather than synchronously in the HTTP request.

---

# FINAL SUMMARY

### 1. Overall Matching Engine Compliance
**Estimated compliance: ~72%** (by weighted audit sections).

| Section | Status |
|---|---|
| 1. Existence & Responsibilities | Fully Implemented |
| 2. Execution Flow | Partially Implemented |
| 3. Input Validation | Partially Implemented |
| 4. Candidate Generation | Fully Implemented |
| 5. Core Matching Rules | Partially Implemented |
| 6. Hard Rule Validation | Partially Implemented |
| 7. Progressive Relaxation | Fully Implemented |
| 8. Low Pool Mode | Fully Implemented |
| 9. New User Matching | Partially Implemented |
| 10. Output Validation | Partially Implemented |
| 11. Architectural | Fully Implemented |
| 12. Database | Partially Implemented |
| 13. Logging & Audit | Partially Implemented |
| 14. Failure Handling | Fully Implemented |
| 15. Performance | Needs Refactor |

### 2. Fully implemented
Matching Engine existence/separation, Candidate Generation (eligibility/ownership/verification/cooldown), Progressive Relaxation (ordering + hard-rule preservation), Low Pool Mode (detection/fallback/broader-niche/expansion without relaxing hard rules), Architecture (7 independent engines), Failure Handling (safe non-leaking messages).

### 3. Partially implemented
Execution Flow (stages not orchestrated in documented order), Input Validation (re-derives inputs; no task-level category/tags; subscriptionTier not a matching input), Core Matching Rules (no related/broader category hierarchy; no secondary-niche matching; no placement-compatibility matrix), Hard Rule Validation (governance caps only at apply, not generation), New User Matching (ranking boost only, not matching-layer), Output Validation (compatibilityScore weighted reuse), Database (no CategoryHierarchy, no task category/tags, no placement matrix), Logging (no explicit fallback-used flag).

### 4. Missing (NOT FOUND IN THE CODEBASE)
- **Task-level `category` and `tags`** on `PlacementTask` (only requester-website category/tags used).
- **Category hierarchy / parent-child taxonomy** (related & broader category matching is backed by `industry` string equality only).
- **Secondary-niche as a matching criterion** (used only for `NicheDistributionCap` governance).
- **Placement compatibility matrix** (Guest Post / Link Insertion / Banner / Sponsored) — only exact `placementType`/`linkAttribute` filters exist.
- **Standalone "Marketplace Validation" & "Distribution" & "Marketplace Constraints" stages** as discrete orchestrated steps in the browse path.
- **Explicit `fallbackUsed` audit field**.
- **Marketplace-layer new-user matching relaxation** (only a ranking boost exists).

### 5. Architectural issues
- Candidate generation, cooldown filtering, and distribution are invoked *inside* the Matching Engine rather than as discrete upstream/downstream stages (violates the prescribed linear flow ordering in §2).
- `ValidationEngine` → `TierEngine` + `DistributionEngine` coupling; `MatchingEngine` → `DistributionEngine` + `OverrideService` coupling (not violations but tight).
- No orchestrator service coordinating the documented stage sequence.
- `compatibilityScore` (weighted) sits in the Matching Engine output and is reused by ranking — a soft overlap with "opportunity weighting" (§10).

### 6. Database changes required
- Add `CategoryHierarchy` model (id, parentId, key) for related/broader matching.
- Add `categoryKey` + `tags String[]` (or relation) to `PlacementTask` IF task-level category/tag matching is mandated.
- Add `PlacementCompatibilityRule` (or enum constraint matrix) model if a compatibility matrix is required.
- Add `fallbackUsed Boolean` to `MatchingAuditLog`.
- Optionally add explicit `lowPoolStatus`/`lowPoolConfig` fields to `MarketplaceModeConfig` or a new `MarketplaceLowPoolConfig`.

### 7. API changes required
- Define and validate a `MatchingInput` DTO (provider/task/marketplace context) at the controller/pipe layer instead of re-deriving inside the engine.
- Pass `subscriptionTier`, `marketplaceMode`, `lowPoolStatus`, `administrativeOverrides` as explicit inputs to `findCandidates`.
- (Optional) expose `availability.reason` as a neutral string only.

### 8. Services that should be introduced
- `MarketplaceOrchestratorService` — runs the documented stage sequence (Auth → Eligibility → Validation → Cooldown → Constraints → Candidate Selection → Matching → Distribution → Ranking → Recommendation).
- (Optional) `CandidateGenerationService` — extracts candidate generation out of `MatchingEngine` for clearer separation.
- (Optional) `CategoryHierarchyService` — resolves related/broader category relationships.
- (Optional) `PlacementCompatibilityService` — encapsulates the placement-type compatibility matrix.

### 9. Highest priority issues
1. **Performance / N+1 + cartesian expansion** (§15, Needs Refactor) — will not scale.
2. **Missing task-level category/tags + no category hierarchy** (§3, §5, §12) — core matching dimensions incomplete vs spec vocabulary.
3. **Governance hard rules (weekly/network/niche/spacing) not enforced during generation** (§6) — browse pool may contain non-actionable candidates.
4. **Execution flow not orchestrated in prescribed order** (§2).

### 10. Recommended implementation order
1. Performance refactor: bulk override resolution + DB-push filtering + candidate cap (highest risk, unblocks scale).
2. Add governance pre-checks in candidate generation (weekly/network/niche).
3. Introduce `MarketplaceOrchestratorService` to enforce stage ordering.
4. Add `CategoryHierarchy` + related/broader matching + secondary-niche matching.
5. Add `PlacementCompatibility` matrix.
6. Add `fallbackUsed` audit field + `MatchingInput` DTO + explicit marketplace inputs.
7. Clarify `compatibilityScore` scope / new-user matching-layer behaviour.

### 11. Estimated implementation complexity
- **Performance refactor**: **High** (query restructuring, potential async pipeline move).
- **Category hierarchy + niche + placement matrix**: **Medium**.
- **Orchestrator + governance pre-checks**: **Medium**.
- **Audit/DTO/input clarifications**: **Low**.
- **Overall remaining program**: **High** (multiple Medium/High workstreams; touches schema, engines, and the request path).

---

*This report reflects only what is verifiable in the current codebase. Items marked NOT FOUND IN THE CODEBASE were searched for by filename, method, model, and regex and not located.*
