# BACKLYST MARKETPLACE — SECTION 6: WEBSITE QUALITY AUDIT REPORT

**Audit Date:** 2026-07-18
**Auditor:** Senior Software Architect / Marketplace Systems Expert
**Scope:** BACKLYST Marketplace Specification — Website Quality Engine (§6 and related sections)

**Evidence basis (all findings verified from source):**
- `src/modules/task/market-algoritm/quality-status.engine.ts`
- `src/modules/task/market-algoritm/quality.engine.ts`
- `src/modules/task/market-algoritm/scoring.service.ts`
- `src/modules/task/market-algoritm/ranking.service.ts`
- `src/modules/task/market-algoritm/visibility-control.service.ts`
- `src/modules/task/market-algoritm/recommendation.service.ts`
- `src/modules/task/market-algoritm/validation.engine.ts`
- `src/modules/task/market-algoritm/distribution-engine.service.ts`
- `src/modules/task/market-algoritm/behaviour-pattern.service.ts`
- `src/modules/task/market-algoritm/marketplace-config.service.ts`
- `src/modules/admin/admin-website-status/*`
- `src/modules/admin/admin-marketplace-config/*`
- `src/modules/task/task-requester/task-requester.service.ts`
- `src/modules/task/admin-task/admin-task.service.ts`
- `src/modules/task/provider-task/provider-task.service.ts`
- `src/modules/task/market-algoritm/marketplace-queue.worker.ts`
- `prisma/schema/marketplace.prisma`, `prisma/schema/website.prisma`
- `prisma/migrations/20260718090000_website_quality_engine/migration.sql`
- `src/modules/task/marketplace-engine/marketplace-engine.module.ts`

---

## COMPLIANCE VERDICT

**Overall compliance: ~68%**

The Website Quality Engine is genuinely implemented and is correctly architecturally separated (it does NOT perform authentication, ownership validation, website verification, candidate generation, cooldown filtering, tier calculations, payment handling, notification handling, credit processing, dispute resolution, or recommendation ordering). Execution order and hard-constraint non-bypass are correctly respected.

However, several specification requirements are **MISSING** or only **PARTIAL**:
- Scheduled recalculation is defined (`SCHEDULED_RECALC` trigger) but **never wired** to any cron/queue.
- Quality-engine config thresholds are **not admin-tunable** via API (only seeded as migration defaults).
- **Premium-opportunity access by quality** is absent.
- Interaction diversity and behaviour are **not folded into the quality composite** score (spec lists both as Quality Engine responsibilities).
- No dedicated quality-history time-series table.
- Per-interaction scoring is the only recalculation path; no bulk/periodic sweep.

---

## PRIMARY OBJECTIVES — ANSWERS

1. **Is the Website Quality Engine implemented?** YES — `QualityEngine` (calculations) + `QualityStatusEngine` (status transitions) exist as first-class injectables, registered in `marketplace-engine.module.ts`.

2. **Does it fully comply with the specifications?** PARTIALLY (~68%). Core engine, status ladder, and influence mechanics comply; scheduled recompute, admin configurability of thresholds, premium access, and composite inclusion of diversity/behaviour do not.

3. **Is Website Quality operating independently from marketplace eligibility?** YES. `marketplaceStatus` affects ranking/visibility/caps only. Eligibility (`isWebsiteRowMarketplaceEligible`, `validation.engine.ts` lines 385–418) blocks ONLY `SUSPENDED`. The quality score never gates eligibility, ownership, or verification.

4. **Is quality influencing marketplace behaviour correctly?** YES. Influences ranking weight (`qualityWeight`), `LOW_PRIORITY` factor (×0.7), `LIMITED_ACCESS` daily cap, `RESTRICTED` visibility reduction (×0.4) + boost disable + reduced daily cap, `UNDER_REVIEW` monitored visibility (×0.7).

5. **Are quality calculations implemented properly?** PARTIALLY. `QualityEngine.computeMetrics` aggregates completion (25%), reliability (25%), avg quality rating (20%), activity (15%), consistency (15%) into `compositeQualityScore`. Activity uses `lastMatchedAt` recency + total-interactions frequency proxy. Consistency returns neutral 50 when <5 ratings. Diversity and behaviour are NOT included.

6. **Is quality management scalable?** PARTIALLY. Centralized, async via BullMQ, but no batch/scheduled recompute; per-interaction query fan-out; unbounded history growth.

7. **Are architectural responsibilities properly separated?** YES. No forbidden cross-responsibilities. No BAD pattern (Quality → Payments → Notifications → Credits).

8. **Are there missing marketplace requirements?** YES — see MISSING list below.

9. **Are there business-rule violations?** NONE that invert validation. Quality never overrides mandatory constraints.

10. **Does the implementation support long-term marketplace growth?** PARTIALLY. Status bands + caps scale, but missing recompute automation, analytics, and configurability will create operational toil at scale.

---

## EXECUTION FLOW AUDIT

**Required order (spec):**
```
Authentication
   ↓
Marketplace Eligibility
   ↓
Marketplace Validation
   ↓
Website Verification
   ↓
Completed Marketplace Interaction
   ↓
Website Quality Engine
   ↓
Distribution Engine
   ↓
Ranking Engine
   ↓
Visibility Control
   ↓
Recommendation Service
```

**Verified behaviour:**
- Scoring (which invokes `QualityStatusEngine.reconcileStatus`) is called ONLY after task completion/approval/rejection:
  - `task-requester.service.ts` lines 1209–1230 (approve → success + rubric score; reject → failure)
  - `admin-task.service.ts` lines 854–859 (force complete)
- These occur AFTER `validationEngine.validateTransition` (e.g. `task-requester.service.ts` 1006–1028, `admin-task.service.ts` 907–919) and AFTER verification/selection.
- Ranking → Visibility → Recommendation run at read time (`provider-task.service.ts` 200–225).
- Quality is **never** computed before eligibility/validation.

**Violations:** NONE.

---

## WEBSITE QUALITY RESPONSIBILITIES

### SHOULD ONLY DO (verified compliant)
- website quality evaluation ✅ (`QualityEngine`)
- completion reliability analysis ✅ (partial — see metric audit)
- activity level analysis ✅ (partial)
- interaction diversity analysis ⚠️ (computed, but as separate signal, not in quality composite)
- marketplace behavioural analysis ⚠️ (computed, but as separate signal, not in quality composite)
- website status management ✅ (`QualityStatusEngine`)
- quality score management ✅ (`qualityScore` on profile)
- visibility influence ✅ (via `marketplaceStatus` + factors)
- opportunity frequency influence ✅ (via `LIMITED_ACCESS` daily cap)
- quality history management ✅ (partial — `WebsiteQualityStatusLog` only, no time-series)

### SHOULD NEVER DO (verified compliant — no violations)
- authentication ✅ not done
- ownership validation ✅ not done (ValidationEngine owns)
- website verification ✅ not done
- candidate generation ✅ not done (MatchingEngine owns)
- cooldown filtering ✅ not done (ValidationEngine owns)
- tier calculations ✅ not done (TierEngine owns)
- payment handling ✅ not done
- notification handling ✅ not done
- credit processing ✅ not done
- dispute resolution ✅ not done (DisputeService owns)
- recommendation ordering ✅ not done (RecommendationService owns)

---

## QUALITY METRIC AUDIT

### Completion Reliability
- **Tracked:** `completedInteractions`, `failedInteractions`, `totalInteractions`, `successfulInteractions`, `completionRate` on `WebsiteMatchingProfile`.
- **Calculated:** `quality.engine.ts` lines 30–36 (`completionRate = completed/total`; `reliabilityScore = successful/total × 100`).
- **Updated:** Per interaction via `scoring.service.ts`.
- **Configurable:** Sub-weights hardcoded in `QualityEngine` (not DB config).
- **Status:** PARTIALLY IMPLEMENTED. No dedicated "abandoned interactions" or "rejection rate" columns; weights not configurable; no explicit failure classification beyond success/fail.

### Activity Level
- **Tracked:** `lastMatchedAt`, `totalInteractions`, `lastCompletedAt`.
- **Calculated:** `computeActivityScore` (`quality.engine.ts` 83–107) = recency (lastMatchedAt tiers) ×0.4 + frequency proxy (totalInteractions buckets) ×0.6.
- **Inactive handling:** Recency tiers (≤7d=100, ≤30d=80, ≤90d=50, else 20).
- **Status:** PARTIALLY IMPLEMENTED. "Frequency" is a crude `totalInteractions` proxy, not true per-month interaction frequency; no `inactivityPeriodDays` field; no time decay.

### Interaction Diversity
- **Tracked:** `diversityScore` on profile; `DomainPairStat` / `DomainInteraction` tables.
- **Calculated:** `DistributionEngine.computeDiversityScore` (distinct counterpart domains / total).
- **Encouraged:** `forceNewDomainNext` logic in `DistributionEngine.filterNewDomains`.
- **Status:** PARTIALLY IMPLEMENTED. Diversity influences **ranking** (`diversityWeight`) but is **NOT folded into `compositeQualityScore`**. Spec lists "interaction diversity analysis" as a Quality responsibility; here it is parallel, not part of quality.

### Behaviour Pattern Analysis
- **Tracked:** `behaviourScore` on profile; `BehaviourPattern` rows (ERRATIC_TIMING, RATING_CLUSTERING, BURST_IDLE_SWITCH) in `behaviour-pattern.service.ts`.
- **Calculated:** `computeBehaviourScore` (start 100, subtract strongest anomaly penalty).
- **Status:** PARTIALLY IMPLEMENTED. Behaviour influences **ranking** (`behaviourWeight`) but is **NOT part of `compositeQualityScore`**. Reciprocal behaviour / interaction clustering / excessive velocity / concentrated networks are handled by RiskEngine + PatternMonitorService, not the Quality Engine.

---

## WEBSITE STATUS AUDIT

**Enum (`marketplace.prisma`):** ACTIVE, LOW_PRIORITY, LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED, SUSPENDED.

**Auto-ladder (`quality-status.engine.ts`):** ACTIVE → LOW_PRIORITY → LIMITED_ACCESS → RESTRICTED. Gradual (max one band per recompute, `qualityGradualTransitions`). UNDER_REVIEW forced by `riskScore >= qualityUnderReviewRiskThreshold`. SUSPENDED is admin-only (never auto-set).

**Per-status behaviour (verified):**
| Status | Spec expectation | Implementation |
|--------|------------------|----------------|
| ACTIVE | standard participation, normal visibility | ✅ identity factors, cap = global |
| LOW_PRIORITY | reduced visibility, reduced opportunity frequency | ✅ ranking ×0.7 (lower rank); reduced visibility via rank |
| LIMITED_ACCESS | limited exposure, reduced opportunity access | ✅ `marketplaceStatusDailyCap=1`; exposure reduced |
| UNDER_REVIEW | marketplace monitoring, temporary observation | ✅ monitored visibility ×0.7; browsable but not selectable (ValidationEngine) |
| RESTRICTED | significant limitations, reduced visibility | ✅ visibility ×0.4, boost disabled, reduced daily cap |
| SUSPENDED | removal from participation | ✅ blocked at eligibility (ValidationEngine) |

**Status:** FULLY IMPLEMENTED. Transitions and per-status behaviour match spec.

---

## QUALITY SCORE AUDIT

- **Internal score:** `qualityScore` (0–100) on `WebsiteMatchingProfile`. Never exposed to end users.
- **Admin-only access:** `GET /admin/website-status/:id/quality-metrics` behind `AdminGuard`.
- **Configurable calculations:** Weights hardcoded in `QualityEngine`; thresholds in DB (`MarketplaceScoringConfig`) but NOT admin-editable via API.
- **Automatic updates:** After every interaction event.
- **Historical tracking:** `WebsiteQualityStatusLog` (status + score snapshots, trigger, adminId, reasonCode).
- **Gap:** No periodic time-series of the *composite* or sub-signal scores; only event-driven snapshots.
- **Status:** FULLY IMPLEMENTED (with minor history gap).

---

## QUALITY IMPROVEMENT AUDIT

- **Improves via:** successful completion (counters increment), reliable participation, marketplace activity, sustained positive behaviour (recovery band moves up gradually).
- **Recovery:** Gradual one-band-up recovery (`applyGradualTransition`).
- **Automatic:** YES — `reconcileStatus` after each interaction.
- **Status:** FULLY IMPLEMENTED.

---

## QUALITY DEGRADATION AUDIT

- **Decreases via:** poor task completion (failed increments), excessive rejections (reject path), repeated disputes (RiskEvent), marketplace abuse (RiskEvent ABUSE), interaction concentration (RiskEngine/PatternMonitor), repeated negative behaviour.
- **Penalties:** Gradual band degradation; auto-suppression when `completionRate < 0.4` after 10 interactions (`scoring.service.ts` 145–197).
- **Configurable:** Thresholds in DB (not API-editable).
- **Proportionate:** YES (gradual, one band per recompute).
- **Status:** FULLY IMPLEMENTED.

---

## MARKETPLACE INFLUENCE AUDIT

| Influence | Present? | Evidence |
|-----------|----------|----------|
| visibility weighting | ✅ | `visibility-control.service.ts` (RESTRICTED 0.4, UNDER_REVIEW 0.7) |
| opportunity frequency | ✅ (partial) | `LIMITED_ACCESS` daily cap = 1; ranking position |
| marketplace prioritization | ✅ | `qualityWeight` in final score |
| premium opportunity access | ❌ NOT FOUND | no code path keys premium access to quality |
| recommendation weighting | ✅ | ranking feeds `recommendation.service.ts` |

**Never determines:** eligibility, verification, ownership, mandatory restrictions — **verified compliant** (ValidationEngine re-applies all hard constraints downstream).

---

## HARD CONSTRAINT AUDIT

Quality calculations MUST NEVER bypass: ownership validation, verification, cooldown filtering, reciprocal restrictions, weekly limitations, marketplace restrictions, tier limitations, administrative restrictions, risk restrictions.

**Finding:** `reconcileStatus` only sets a `marketplaceStatus` band; ValidationEngine/RankingService re-apply every hard constraint using that band. No override of mandatory constraints.

**Violations:** NONE.

---

## BACKGROUND PROCESSING AUDIT

- **Async:** BullMQ `MARKETPLACE_SCORING` queue (`scoring.service.ts`, `marketplace-queue.worker.ts`, `marketplace-scoring.producer.ts`).
- **Events:** Task completion/approval/rejection enqueue `UPDATE_SCORES`.
- **Scheduled:** **MISSING** — `SCHEDULED_RECALC` trigger is defined in `QualityStatusTrigger` enum and accepted by `reconcileStatus`, but **no cron or queue emits it**. No periodic full-recompute.
- **Historical updates:** Only event-driven.
- **Status:** PARTIALLY IMPLEMENTED.

---

## ADMIN CONTROL AUDIT

| Capability | Present? | Evidence |
|------------|----------|----------|
| review website quality | ✅ | `GET quality-metrics` |
| change website status | ✅ | `POST /admin/website-status` |
| apply restrictions | ✅ | status set to RESTRICTED/LIMITED_ACCESS |
| remove restrictions | ✅ | status set back to ACTIVE |
| review quality history | ✅ | `GET quality-history` |
| override quality information | ✅ | `POST reset-quality-score` |
| permission management | ✅ | `AdminGuard` |
| audit logging | ✅ | `WebsiteQualityStatusLog` (adminId/reasonCode/note) |
| schedule recalcs | ❌ | no admin recompute endpoint |
| tune quality thresholds | ❌ | `UpdateScoringConfigDto` omits quality fields |

**Status:** PARTIALLY IMPLEMENTED.

---

## DATABASE AUDIT

**Present:**
- `qualityScore`, `marketplaceStatus`, `marketplaceStatusDailyCap` (profile)
- completion stats (`completedInteractions`, `failedInteractions`, `totalInteractions`, `successfulInteractions`, `completionRate`)
- activity (`lastMatchedAt`, `lastCompletedAt`)
- diversity (`diversityScore`)
- behaviour (`behaviourScore`)
- quality history (`WebsiteQualityStatusLog`)
- admin overrides (via status audit log)

**Missing:**
- Dedicated quality-history time-series (only event snapshots)
- `premiumQualityAccessEligible` flag
- `lastQualityRecomputeAt` / scheduled-recalculate job table
- quality threshold columns ARE present in `MarketplaceScoringConfig` but lack an admin update path

**Status:** PARTIALLY IMPLEMENTED.

---

## API AUDIT

**Consumers of quality info:**
- `ScoringService` (writes score + status)
- `RankingService` / `VisibilityControlService` (read `marketplaceStatus`, caps, factors)
- `AdminWebsiteStatusController` (admin review/override/history)

**Centralization:** Calculations centralized in `QualityEngine` + `QualityStatusEngine`.

**Gap:** No admin endpoint to tune quality thresholds (`UpdateScoringConfigDto` excludes `qualityActiveThreshold`, `qualityLowPriorityThreshold`, `qualityLimitedAccessThreshold`, `qualityGradualTransitions`, `qualityMinInteractionsForStatus`, `qualityUnderReviewRiskThreshold`, `qualityWeight`, `restrictedVisibilityFactor`, `underReviewVisibilityFactor`, `restrictedDailyCapFactor`).

**Status:** PARTIALLY IMPLEMENTED.

---

## LOGGING AUDIT

**Present:**
- status/score changes → `WebsiteQualityStatusLog`
- quality recalc → engine `logger`
- ranking runs → `RankingRunLog`
- visibility adjustments → `VisibilityAdjustmentLog`
- marketplace activity → `OpportunityImpression`

**Missing:**
- no log of quality recompute *processing time*
- no periodic quality history snapshots
- no dedicated "quality job failed" log row (only warn in engine)

**Status:** PARTIALLY IMPLEMENTED.

---

## PERFORMANCE AUDIT

- **Async scoring**, config cached (60s TTL), best-effort writes.
- **Hot read path:** quality already precomputed on profile — no expensive sync calc at read time. ✅
- **Concern:** Per-interaction `updateScoresAfterTask` runs multiple sequential queries (diversity, scoring, risk, behaviour scan, opportunity, profile update, status reconcile). Acceptable behind queue but no batching.
- **Concern:** `WebsiteQualityStatusLog` grows unbounded without retention policy.

**Status:** FULLY IMPLEMENTED (with minor scalability notes).

---

## FAILURE HANDLING AUDIT

- `reconcileStatus` swallows errors (warns, returns unchanged) — scoring never blocked (`quality-status.engine.ts` 203–210).
- `recommend()` isolates ranking/visibility failures → safe "No suitable opportunities are available right now" message (`provider-task.service.ts` 232–251).
- Users never see internal quality errors.
- Graceful empty-result + generic availability message verified.

**Status:** FULLY IMPLEMENTED.

---

## ARCHITECTURAL AUDIT

- **GOOD pattern confirmed:**
  ```
  Completed Interaction → Website Quality Engine → Distribution Engine →
  Ranking Engine → Visibility Control → Recommendation Service
  ```
- **No BAD pattern:** Quality does not invoke Payments / Notifications / Credits / Analytics.
- **Conceptual gap (not a separation violation):** quality, diversity, and behaviour are three parallel signals rather than diversity/behaviour feeding the quality composite as the spec's responsibility list implies.

**Status:** FULLY IMPLEMENTED.

---

# MISMATCH ANALYSIS (summary table)

| # | Requirement | Status | Mismatch |
|---|-------------|--------|----------|
| 1 | Quality Engine implemented | Fully Implemented | — |
| 2 | §6 responsibilities | Fully Implemented | — |
| 3 | Independent of eligibility | Fully Implemented | — |
| 4 | Influences behaviour | Fully Implemented | — |
| 5 | Calculations correct | Partially Implemented | activity frequency proxy crude; diversity/behaviour excluded from composite |
| 6 | Scalable | Partially Implemented | no batch/scheduled recompute; query fan-out |
| 7 | Responsibility separation | Fully Implemented | — |
| 8 | Missing requirements | Partially Implemented | scheduled recalc, admin threshold API, premium access |
| 9 | Business-rule violations | Fully Implemented | none found |
| 10 | Long-term growth | Partially Implemented | no analytics/automation |

---

# FINAL REPORT

### 1. Website Quality compliance percentage
**~68%**

### 2. Fully implemented requirements
Engine existence; responsibility separation; execution-order compliance; hard-constraint non-bypass; status ladder + per-status behaviour; internal quality score + admin-only access; automatic gradual improvement/degradation; influence on ranking/visibility/opportunity-frequency (via caps); async background processing; admin review/override/history; failure isolation.

### 3. Partially implemented requirements
Completion-reliability tracking (no configurable weights / no explicit abandoned-column); activity level (crude frequency proxy, no inactivity field); interaction diversity (not in quality composite); behaviour patterns (separate signal, not in quality); scheduled recalculation (trigger defined, never fired); admin config of thresholds; quality history time-series; premium opportunity access.

### 4. Missing requirements
1. `SCHEDULED_RECALC` cron/queue emission (trigger exists, never fired).
2. Admin API to update quality thresholds (`qualityActiveThreshold`, etc.) — `UpdateScoringConfigDto` omits them.
3. Premium-opportunity-access-by-quality.
4. Dedicated quality-history time-series table.
5. Quality composite does NOT include diversity/behaviour (spec lists both as Quality responsibilities).
6. Recurring admin "recompute all" job.

### 5. Architectural issues discovered
Minimal. One conceptual issue: quality, diversity, and behaviour are three *parallel* signals rather than diversity/behaviour feeding the quality composite as the spec's responsibility list implies. Not a separation violation, but a coverage gap vs. the stated responsibility set.

### 6. Database changes required
- Add `QualityScoreHistory` table (periodic score + sub-signal snapshots; FK `websiteId`; indexed by `createdAt`).
- Add nullable `premiumQualityAccessEligible` / `lastQualityRecomputeAt` to `WebsiteMatchingProfile`.
- Quality threshold columns already exist in `MarketplaceScoringConfig`; only an API path is needed.

### 7. Service changes required
- `QualityEngine.computeMetrics` should incorporate `diversityScore` and `behaviourScore` into `compositeQualityScore` (weighted, configurable).
- Add `QualityRecalcCron` emitting `SCHEDULED_RECALC`.
- Extend `AdminMarketplaceConfigService.updateConfig` + `UpdateScoringConfigDto` to include quality thresholds, `qualityWeight`, `restrictedVisibilityFactor`, `underReviewVisibilityFactor`, `restrictedDailyCapFactor`.
- Add premium-access logic in ranking/opportunity gating keyed on quality band.

### 8. API changes required
- New `PATCH /admin/marketplace-config` fields for quality thresholds.
- New `POST /admin/website-status/:id/recompute` (admin-triggered recalc).
- Optionally `GET /admin/website-status/:id/quality-trend`.

### 9. Highest priority issues
1. `SCHEDULED_RECALC` never fired → quality can drift and never self-corrects for dormant sites.
2. Quality thresholds not admin-tunable → require deploy to adjust.
3. Diversity & behaviour excluded from quality composite → spec responsibility gap.

### 10. Scalability concerns
- Per-interaction synchronous query fan-out in `updateScoresAfterTask`.
- No batch recompute.
- `WebsiteQualityStatusLog` grows unbounded without retention.

### 11. Recommended implementation order
1. Wire `SCHEDULED_RECALC` cron + `QualityScoreHistory`.
2. Expose quality thresholds in admin config API.
3. Fold diversity/behaviour into quality composite (configurable weights).
4. Add premium-opportunity-access-by-quality.
5. Add retention/analytics on quality history.

### 12. Estimated implementation complexity
**Medium** overall — each item is Low/Medium individually:
- Scheduled recalc cron + history table: **Medium**
- Admin threshold API extension: **Low**
- Composite refactor (include diversity/behaviour): **Medium**
- Premium-access gating: **Medium**
- Retention/analytics: **Low**
