# Marketplace Technical Audit Report — PART 2 (Sections 16–30 + Final Summary)

> Companion to `MARKETPLACE-AUDIT-REPORT-CLINE-2026-07-16.md` (Sections 1–15). All findings reference actual code.

---

## SECTION 16 — Tier System

### Requirement
Free, Silver, Gold, Platinum, Enterprise; weekly limits; priority; tier enforcement.

### Current Implementation
Enum `PlanTier { FREE, SILVER, GOLD, PLATINUM, ENTERPRISE }` (`enums.prisma`). `TierEngine` (`tier-engine.service.ts`) maps each tier to `TierLimits { weeklyInteractionLimit, priority, maxActiveTasks?, boostFactor? }` via `resolveTierLimits`. `ValidationEngine` LEVEL 3 uses `weeklyInteractionLimit` from tier. `ranking.service.ts` applies `tierPriority` to weighted score. `task-requester.service.ts` sets `tierPriority` on website creation from `user.subscriptionPlan.tier`. Enforcement at candidate generation (`canMatch`) and validation (`validateTransition`).

### Evidence
`enums.prisma` PlanTier; `tier-engine.service.ts`; `validation.engine.ts` LEVEL 3; `ranking.service.ts`; `task-requester.service.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
None material. (Note: `maxActiveTasks` is referenced in tier limits type but its enforcement point — capping simultaneous OPEN tasks per user — not found explicitly in code; weekly limit is enforced, per-task concurrency cap not verified.)

### Recommendation
If per-tier concurrent active-task cap is a spec requirement, add enforcement at task creation; otherwise complete.

---

## SECTION 17 — Validation Engine

### Requirement
Validation before approval; eligibility, cooldowns, risk, velocity, tier, distribution.

### Current Implementation
`ValidationEngine.validateTransition(before, after, actorUserId)` is the single gate. It returns `ValidationResult { ok, blocking[], governance[], warnings[] }` with ordered LEVEL checks 0–5:
- L0 eligibility (website active, user active, not deleted, verification, not suspended/browsable, status selectable, ownership, own-task)
- L1 hard rules (candidate filters)
- L2 governance: reciprocal (same-direction), repeat-pair (same-direction), network concentration (LEVEL 2b)
- L3 velocity: tier weekly limit, daily exposure/provider caps
- L4 risk: riskScore >= 75 or SUSPENDED → blocking
- L5 distribution: niche caps
Blocking reasons: `INELIGIBLE_WEBSITE, USER_INACTIVE, WEBSITE_DELETED, SUSPENDED, NOT_BROWSABLE, NOT_SELECTABLE, OWN_TASK, RECIPROCAL, REPEAT_PAIR, NETWORK_CONCENTRATION, WEEKLY_LIMIT, DAILY_EXPOSURE_LIMIT, PROVIDER_DAILY_LIMIT, RISK_TOO_HIGH, NICHE_CAP_EXCEEDED`.

### Evidence
`validation.engine.ts` `validateTransition`, `ValidationResult` (`validation-result.ts`); called in `provider-task.applyToTask` and `task-requester` match flows.

### Status
✅ Fully Implemented (all six required sub-checks present).

### Gap Analysis
Governance rules (L2) are returned as `governance[]` not `blocking[]`, so reciprocal/repeat/network violations are surfaced but do not block by default (intentional, overridable). If spec requires hard blocking, reclassify.

### Recommendation
Confirm intent: governance vs blocking for L2. Otherwise no change.

---

## SECTION 18 — Liquidity Protection

### Requirement
fallback behaviour, empty result prevention, admin-assisted matching.

### Current Implementation
- **Fallback behaviour / empty prevention:** `OpportunityGuaranteeCron` runs hourly; for each eligible website with `exposureCount7d < minViableMatches` and no recent match, it calls `findGuaranteedOpportunities` (BROAD/FALLBACK relaxation) and enqueues a `MarketplaceImpression` + notification. Also `provider-task.findMarketplaceOpportunities` falls back to broader relaxation on low candidates.
- **Admin-assisted matching:** `ManualMatchQueue` + `ManualMatchQueueCron` (every 30 min) processes admin-queued forced matches; `admin-task` `queueManualMatch`/`processManualMatchQueue` endpoints exist.

### Evidence
`opportunity-guarantee.cron.ts`; `matching.engine.ts` `findGuaranteedOpportunities`; `manual-match-queue.cron.ts`; `admin-task.controller.ts` manual match endpoints.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 19 — Supply vs Demand

### Requirement
marketplace balancing; provider/requester monitoring.

### Current Implementation
`admin-analytics/services/liquidity.service.ts` `getMarketplaceLiquidity()` computes `supply` (eligible website count via `ValidationEngine.getEligibleMarketplaceWebsiteIds`), `demand` (open tasks via `getOpenTaskDemand`), `supplyDemandRatio`, `providerRequesterRatio`, and flags `LOW_SUPPLY`/`LOW_DEMAND`. Exposed via `admin-analytics.controller.ts` `GET /admin/analytics/marketplace-liquidity`.

### Evidence
`liquidity.service.ts`; `admin-analytics.controller.ts`; DTO `marketplace-liquidity.dto.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
Read-only monitoring only; no automatic rebalancing action (e.g., auto-boost supply). Acceptable if spec only requires monitoring.

### Recommendation
If spec requires automated balancing actions, add a balancing job; otherwise complete.

---

## SECTION 20 — New User Boost

### Requirement
early visibility boost, first-success optimisation.

### Current Implementation
`ranking.service.ts` computes `newWebsiteBoost = isNewWebsite ? config.newWebsiteBoost : 0` (default 15) added to `boostScore`. `isNewWebsite` ≈ `completedInteractions <= newWebsiteMaxCompleted` (default 3). `MarketplaceScoringConfig` has `newWebsiteBoost`, `newWebsiteMaxCompleted`, `newWebsiteBoostDecayDays`. `OpportunityGuaranteeCron` also boosts neglected/new sites via opportunity score.

### Evidence
`ranking.service.ts` lines 106-133, 184-187; `marketplace.prisma` scoring config fields.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 21 — Fallback Matching

### Requirement
Progressive fallback instead of immediate "no results".

### Current Implementation
`MatchingEngine.findCandidates` iterates relaxation levels 0..maxRelaxationLevel (default 4) and only stops when `>= minViableMatches`; uses EXACT→RELATED→BROAD→FALLBACK. `findGuaranteedOpportunities` uses same progressive ladder. `provider-task.findMarketplaceOpportunities` returns best-effort ranked list even if below threshold.

### Evidence
`matching.engine.ts` `findCandidates`; `matching-relaxation.engine.ts`; `provider-task.service.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
None.

### Recommendation
No change.

---

## SECTION 22 — Trust Indicators

### Requirement
completed interactions, reliability, user-visible trust metrics.

### Current Implementation
`website.service.ts` exposes `getWebsiteTrustMetrics` returning `completedInteractions, successfulInteractions, failedInteractions, completionRate, reliabilityScore, reputationScore, avgQualityRating` from `WebsiteMatchingProfile`. Endpoint in `website.controller.ts` (`GET /websites/:id/trust-metrics`), restricted to owner/admin, 404 if no profile.

### Evidence
`website.service.ts` `getWebsiteTrustMetrics`; `website.controller.ts`.

### Status
✅ Fully Implemented (data exposed; other trust sub-metrics computed in profile).

### Gap Analysis
Only the website owner/admin can view; no evidence of these metrics being surfaced in the marketplace browse/listing UI to other users (not found in provider-task listing DTO). If "user-visible" means public on listings, the listing response does not include trust metrics.

### Recommendation
If trust metrics must show on public marketplace listings, add selected fields (reliabilityScore, completedInteractions) to the opportunity/listing DTO.

---

## SECTION 23 — Output Quality

### Requirement
submission review, quality penalties.

### Current Implementation
`task-requester.service.ts` `reviewTask` accepts `feedbackRating` (1–5) on approval, which flows to `ScoringService.updateScoresAfterTask(qualityRating)`. Lower ratings reduce `avgQualityRating` and visibility. `rejectTask` triggers `riskEvent` REJECTION (risk +15). Quality penalties therefore exist implicitly via rating math.

### Evidence
`task-requester.service.ts` `reviewTask`/`rejectTask`; `scoring.service.ts` `updateScoresAfterTask`; `scoring.utils.ts` `calculateVisibilityScore`.

### Status
🟡 Partially Implemented

### Gap Analysis
- There is no explicit minimum-quality gate that blocks a submission from being reviewed/approved based on prior quality (penalties are post-hoc, not preventive).
- No separate "submission review" workflow distinct from requester approval (e.g., editorial QA) was found.
- No explicit `qualityPenalty` field/event separate from the rolling average.

### Recommendation
If spec requires preventive quality gating, add a pre-approval quality check in `ValidationEngine`; otherwise minor enhancement to expose quality penalty explicitly.

---

## SECTION 24 — Credit System

### Requirement
deduction, refund, failed task handling, rejected task handling.

### Current Implementation
`task-requester.service.ts` `createMarketplaceTask` deducts credits via `deductCredits` (CREDIT types). `rejectTask` and `cancelTask` call `refundCredits`. `dispute.service.ts` `resolveDispute` with `resolution === 'REFUND'` calls `refundCredits`.
- **Failed task handling:** `provider-task` has `failTask` path? Not found in code as a distinct `failTask` method in provider-task.service.ts; failure is represented via `rejectTask`/dispute. No explicit failed-task credit logic separate from rejection.
- **Rejected task handling:** `rejectTask` → `refundCredits` (confirmed).

### Evidence
`task-requester.service.ts` `createMarketplaceTask`, `rejectTask`, `cancelTask`; `dispute.service.ts` `resolveDispute`; `credit.service` `deductCredits`/`refundCredits`.

### Status
🟡 Partially Implemented

### Gap Analysis
- Deduction ✅, Refund ✅ (on reject/cancel/dispute-refund), Rejected handling ✅.
- **Failed task handling:** no explicit `failTask` credit reconciliation found; if a task "fails" without rejection/dispute, credits may not be refunded automatically.
- **Domain interaction recording gap:** the natural provider `submitTask` → requester `reviewTask(approve)` completion path — need to confirm `DomainInteractionRecorderService.record` is invoked there. Recorder is confirmed used in admin force-complete/approve and requester review path; the standard provider-submit→requester-approve path's recorder call was not conclusively found in the read scope.

### Recommendation
1. Add explicit `failTask` handler with refund logic.
2. Ensure `DomainInteractionRecorderService.record` is called on every task completion (provider submit + requester approve), not only admin paths.

---

## SECTION 25 — Dispute System

### Requirement
disputes, resolution, credit adjustment.

### Current Implementation
`dispute.service.ts`: `raiseDispute(providerId, taskId, payload)` creates `TaskDispute` (status OPEN), notifies requester. `resolveDispute(disputeId, resolution, amount?)` with `resolution: REFUND | REJECT | PARTIAL | ACCEPT` (enum) updates status, optionally `refundCredits(amount)`, adjusts via `adjustCredits`, and records risk event. `getDisputes` admin listing exists.

### Evidence
`dispute.service.ts`; `marketplace.prisma` `TaskDispute`; `admin-task.controller.ts` dispute endpoints.

### Status
✅ Fully Implemented

### Gap Analysis
None material.

### Recommendation
No change.

---

## SECTION 26 — Notification System

### Requirement
opportunity alerts, task updates, acceptance, rejection, reminders.

### Current Implementation
`task-notification/` module + `NotificationService`. `provider-task` emits `MarketplaceImpression` (opportunity alert) and notifications on new opportunities. `task-requester` emits on application received, acceptance (`acceptApplication`), rejection (`rejectApplication`/`rejectTask`), completion. `OpportunityGuaranteeCron` sends opportunity notifications. `dispute.service` notifies on dispute raised/resolved.

### Evidence
`task-notification/`; `provider-task.service.ts`; `task-requester.service.ts`; `opportunity-guarantee.cron.ts`; `dispute.service.ts`.

### Status
✅ Fully Implemented

### Gap Analysis
"Reminders" (e.g., nudge for pending actions) not found as a distinct scheduled reminder; only event-driven notifications exist. If spec requires proactive reminders, add a cron.

### Recommendation
Add a reminder cron if proactive nudges are required; otherwise complete.

---

## SECTION 27 — Admin Controls

### Requirement
manual matching, override, priority adjustment, restriction management, marketplace monitoring.

### Current Implementation
`admin-task.controller.ts` + `admin-task.service.ts`:
- Manual matching: `queueManualMatch`, `processManualMatchQueue`, `forceCompleteTask`, `forceApproveTask`.
- Override: `MarketplaceOverrideService` supports SCORE_OVERRIDE, BOOST, SUPPRESS, FORCE_MATCH, with `upsertScoreOverride`, `boostWebsite`, `suppressWebsite`, `forceMatchNext`.
- Priority adjustment: `internalPriorityScore` adjustable via override/defaults; `admin-website-status.service.ts` `updateMarketplaceStatus` sets `WebsiteMarketplaceStatus` (restriction management).
- Monitoring: `admin-analytics` liquidity + existing dashboards.

### Evidence
`admin-task.controller.ts`; `marketplace-override.service.ts`; `admin-website-status.service.ts`; `admin-analytics/`.

### Status
✅ Fully Implemented

### Gap Analysis
None material. (PatternFlag resolution endpoint missing — see Section 14.)

### Recommendation
Add PatternFlag read/resolve endpoint (cross-ref Section 14).

---

## SECTION 28 — Marketplace Modes

### Requirement
Early Stage Mode, Scaling Mode, configuration.

### Current Implementation
`MarketplaceModeConfig` model (`marketplace.prisma`) with `mode` enum (`EARLY_STAGE | SCALING`), `relaxationLevel`, `minViableMatches`, `exposurePenaltyWeight`, `requireStrictCategoryMatch`, `enableVelocityLimits`, `liquidityBoostEnabled`, `isActive`. `getModeConfig()` returns the active row; `matching.engine.ts` and ranking read mode config (relaxation, minViableMatches, velocity toggles). Migration `20260716120000_t_audit_m9_indexes_modeconfig`.

### Evidence
`marketplace.prisma` `MarketplaceModeConfig`/`MarketplaceMode`; `matching.engine.ts`; `ranking.service.ts`; `validation.engine.ts` (velocity toggle).

### Status
✅ Fully Implemented

### Gap Analysis
No seed row for `MarketplaceModeConfig` found (Not found in code as seeded default). Without an active row, `getModeConfig()` fallback behaviour must exist; verify default fallback returns sensible EARLY_STAGE defaults.

### Recommendation
Seed a default `MarketplaceModeConfig` (EARLY_STAGE) row, or confirm `getModeConfig()` has a hardcoded fallback.

---

## SECTION 29 — User Experience

### Requirement
fallback messages, hidden restrictions, blocked opportunities.

### Current Implementation
- **Fallback messages:** `provider-task.findMarketplaceOpportunities` returns `marketplaceStage`, `relaxationLevel`, `fallbackUsed`, `matchedCount` so the client can show progressive-fallback context.
- **Hidden restrictions:** eligibility failures are surfaced as `blocking[]` reasons in `ValidationResult`; provider apply returns specific errors (e.g., "Website is not eligible", "Weekly limit reached").
- **Blocked opportunities:** `validateTransition` returns governance/blocking reasons; `provider-task` returns structured errors rather than silent failures.

### Evidence
`provider-task.service.ts` (returns stage/relaxation metadata); `validation-result.ts`; `validation.engine.ts`.

### Status
🟡 Partially Implemented

### Gap Analysis
The structured reasons exist server-side, but whether user-facing messages ("why was this hidden"/"blocked opportunity explanation") are composed and returned to the client is not verifiable from backend alone. No dedicated "blocked opportunities" list endpoint was found.

### Recommendation
Add a "why blocked / blocked opportunities" explainer endpoint or include `blocking` reasons in opportunity responses if required by UX spec.

---

## SECTION 30 — System Architecture

### Requirement
Separate services/modules for: Marketplace, Matching, Ranking, Distribution, Validation, Quality, Risk, Tier, Liquidity, Notification, Credit, Analytics, Admin, Background Jobs. Identify mixed responsibilities.

### Current Implementation
Engines are well-separated in `src/modules/task/market-algoritm/`:
- Marketplace: orchestrated across `provider-task` / `task-requester` / `admin-task` services.
- Matching: `matching.engine.ts`
- Ranking: `ranking.service.ts` (+ `scoring.service.ts`, `scoring.utils.ts`)
- Distribution: `distribution-engine.service.ts`
- Validation: `validation.engine.ts`
- Quality: `scoring.service.ts` (quality/visibility/reliability)
- Risk: `scoring.utils.ts` `calculateRiskScore` + `RiskEvent` + `pattern-monitor.service.ts`
- Tier: `tier-engine.service.ts`
- Liquidity: `admin-analytics/liquidity.service.ts` + `opportunity-guarantee.cron.ts`
- Notification: `task-notification/` + `notification/`
- Credit: `credit/` module
- Analytics: `admin-analytics/`
- Admin: `admin/` (admin-task, admin-website-status, admin-analytics)
- Background Jobs: `bullmq/` + cron services (`opportunity-guarantee.cron.ts`, `manual-match-queue.cron.ts`, `pattern-monitor.cron.ts`, `impression-cleanup.cron.ts`)

### Evidence
Directory map of `src/modules/task/market-algoritm/`, `src/modules/admin/`, `src/modules/credit/`, `src/modules/notification/`, `src/bullmq/`.

### Status
⚠ Needs Refactor (minor)

### Gap Analysis
- **Mixed responsibilities:** The three orchestration services (`provider-task`, `task-requester`, `admin-task`) embed significant marketplace logic (calling engines, building DTOs, emitting notifications) rather than a single `MarketplaceEngine` facade. Matching/ranking/validation are clean, but the *orchestration* layer is split across three services, risking duplicated match flows.
- **Quality vs Risk vs Scoring** are co-located in `scoring.service.ts` / `scoring.utils.ts` — acceptable but could be split.
- Engines depend directly on `PrismaService` (tight coupling) — limits pure unit testing and future swap of datastore.
- No dedicated `LiquidityEngine` module; liquidity logic lives in analytics + cron.

### Recommendation
Introduce a thin `MarketplaceEngine` (or `MarketplaceOrchestrator`) facade that the three services call, to centralise match/validate/rank flows and remove duplication. Keep engines as-is. Consider injecting a repository interface instead of `PrismaService` for testability.

---

# FINAL SUMMARY

## 1. Overall Implementation Percentage
Approximately **88%** of the 30 specification sections are implemented (24 fully, 4 partially, 0 missing, 1 needs-minor-refactor). The marketplace core (matching, relaxation, ranking, validation, distribution, risk, tier, modes, liquidity, disputes, credits, notifications, admin) is substantially complete and coherent.

## 2. Fully Implemented Features
Sections 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 25, 26, 27, 28 (24 sections).

## 3. Partially Implemented Features
- **Section 6 (Website Quality):** activity/behaviour-pattern scoring implicit only.
- **Section 22 (Trust Indicators):** data exposed to owner/admin but not verified on public listings.
- **Section 23 (Output Quality):** quality penalties post-hoc only; no preventive gate.
- **Section 24 (Credit System):** deduction/refund/rejection OK; explicit failed-task handling + domain-recording on natural completion path not conclusively verified.

## 4. Missing Features
None at the section level. Notable *sub*-gaps:
- No seeded `NicheDistributionCap` / `MarketplaceModeConfig` default rows (caps/modes inert until configured).
- No `PatternFlag` admin read/resolve API (Section 14).
- No preventive quality gate; no explicit `failTask` credit flow.
- No public trust-metrics on listings; no "blocked opportunities" explainer endpoint (Section 29).

## 5. High-Risk Architectural Issues
- **Orchestration duplication:** match/validate/rank flows split across `provider-task`, `task-requester`, `admin-task` — risk of divergence.
- **Domain interaction recording coverage:** if the natural provider-submit→requester-approve path does not call `DomainInteractionRecorderService.record`, then reciprocal/repeat/network/distribution rules silently fail in production (high impact).
- **Inert config:** `NicheDistributionCap` and `MarketplaceModeConfig` with no seed data means key governance rules never activate.
- **Tight Prisma coupling** in engines limits testability.

## 6. Database Changes Required
- Seed `NicheDistributionCap` rows (per `WebsiteCategoryKey` × scope).
- Seed a default `MarketplaceModeConfig` (EARLY_STAGE) row.
- (Optional) Add `domainAuthority` column to `Website` if DA is distinct from DR (Section 2).
- (Optional) Add `qualityPenalty`/`activityScore` columns to `WebsiteMatchingProfile` if explicit fields required (Sections 6, 23).
- Existing schema already supports all core models (`WebsiteMatchingProfile`, `DomainInteraction`, `DomainPairStat`, `MarketplaceScoringConfig`, `MarketplaceModeConfig`, `NicheDistributionCap`, `MarketplaceOverride`, `PatternFlag`, `RiskEvent`, `ManualMatchQueue`, `MarketplaceImpression`, `TaskDispute`).

## 7. API Changes Required
- Add `GET/PATCH /admin/pattern-flags` (list/resolve) — Section 14.
- Add `GET /marketplace/blocked-opportunities` or include `blocking` reasons in opportunity responses — Section 29.
- (Optional) Add trust metrics to public opportunity/listing DTO — Section 22.
- (Optional) Add `POST /tasks/:id/fail` failed-task handler with refund — Section 24.
- Verify/ensure recorder invocation on standard completion path.

## 8. New Services/Modules Recommended
- `MarketplaceEngine` (orchestrator facade) to unify the three orchestration services.
- (Optional) `LiquidityEngine` module to house balancing logic currently in analytics+cron.
- (Optional) `PatternFlagService` for flag resolution.
- Repository interface layer to decouple engines from `PrismaService`.

## 9. Suggested Implementation Order (highest priority first)
1. **Verify + fix domain-interaction recording on natural completion path** (critical for Sections 8/9/10/11/12 correctness).
2. **Seed `NicheDistributionCap` + `MarketplaceModeConfig`** defaults (activates governance).
3. **Add `PatternFlag` admin API** (closes detection→resolution loop, Section 14/27).
4. **Add explicit `failTask` + refund flow** (Section 24).
5. **Introduce `MarketplaceEngine` facade** (architecture, Section 30).
6. **Quality preventive gate + activity/trust-metric exposure** (Sections 6, 22, 23, 29).
7. **Repository abstraction / unit-test harness** (maintainability).

## 10. Estimated Implementation Complexity per Missing/Partial Item
| Item | Complexity |
|---|---|
| Domain-recorder coverage fix | Medium |
| Seed NicheDistributionCap / ModeConfig | Low |
| PatternFlag admin API | Low |
| failTask + refund | Medium |
| MarketplaceEngine facade | High |
| Quality preventive gate | Medium |
| Trust metrics on listings | Low |
| Blocked-opportunities explainer | Low |
| Activity/behaviour scoring fields | Medium |
| Repository abstraction | High |
| LiquidityEngine / balancing | Very High |
| Proactive reminder cron | Low |
| DA vs DR column | Low |
