# Marketplace Audit — Implementation Fix Prompts

**Generated:** 2026-07-17
**Source audit:** `docs/MARKETPLACE-TECHNICAL-AUDIT-2026-07-17.md`
**Audited commit:** `c484f8d8bcb3803e6733c8a5f80d63b072ee1f9e`
**Purpose:** Self-contained implementation prompts so a NEW session (with no prior conversation) can fix the gaps the audit found. Prompts are ordered by priority. Each is independent but they should be applied in sequence (P1 → P5).

---

## CONTEXT BLOCK (paste into every new session before running a prompt)

> You are working in a NestJS backend at `/Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend` (alias `backlyst-backend`). It is a backlink/guest-post marketplace.
>
> Key facts already verified in the codebase:
> - Marketplace engines live in `src/modules/task/market-algoritm/` (MatchingEngine, MatchingRelaxationEngine, TommacayRankingService, ValidationEngine, DistributionEngine, TierEngine, RiskEngine, QualityEngine, LiquidityEngine, PatternMonitorService, TrustIndicatorService, SupplyDemandRebalancerService, OpportunityAlertService, MarketplaceConfigService, MarketplaceOverrideService, DomainInteractionRecorderService, GraduatedPenaltyService, TommacayScoringService).
> - Crons live in `src/modules/task/market-algoritm/*.cron.ts` and are registered in `src/modules/task/marketplace-cron/marketplace-cron.module.ts` (the `providers` array).
> - Module wiring for engines is `src/modules/task/marketplace-engine/marketplace-engine.module.ts` (exports all engines).
> - Prisma schema is split: `prisma/schema/marketplace.prisma` (WebsiteMatchingProfile, MarketplaceScoringConfig, DomainInteraction, DomainPairStat, Dispute, RiskEvent, PatternFlag, NicheDistributionCap, ManualMatchQueue, QualityRubric, MarketplaceModeConfig, MarketplaceOverride, etc.), `prisma/schema/website.prisma`, `prisma/schema/enums.prisma`, `prisma/schema/placement.prisma`.
> - Provider task flow: `src/modules/task/provider-task/provider-task.service.ts`. Requester task flow: `src/modules/task/task-requester/task-requester.service.ts`. Admin task flow: `src/modules/task/admin-task/admin-task.service.ts`.
> - Scoring math lives in `src/modules/task/market-algoritm/scoring.utils.ts` and `scoring.service.ts`.
> - Task-notification engine: `src/modules/task-notification/task-notification.service.ts` with `TaskNotificationTrigger` enum in `src/modules/task-notification/enums/task-notification-trigger.enum.ts`.
> - Do NOT modify code that is already working. Only implement the specific change described. Do NOT guess — read the actual file before editing. Keep the existing style (camelCase aliases like `prisma`, inline "spec §N" comments are the house style).
> - After any schema change, create a new migration file under `prisma/migrations/` and run `npx prisma generate`. Do not edit existing migration files.

---

## P1 — Register BoostDecayCron (Low complexity)

**Goal:** The file `src/modules/task/market-algoritm/boost-decay.cron.ts` defines `BoostDecayCron` with `@Cron('0 4 * * *')` but it is NOT imported/provided in `src/modules/task/marketplace-cron/marketplace-cron.module.ts`. Boost decay currently only happens via `OpportunityGuaranteeCron` and `scoring.service.ts calculateBoost`. Register the dedicated cron so decay is guaranteed on schedule.

**Steps:**
1. Open `src/modules/task/marketplace-cron/marketplace-cron.module.ts`.
2. Add import: `import { BoostDecayCron } from '../market-algoritm/boost-decay.cron';`
3. Add `BoostDecayCron` to the `providers` array (alongside `RiskDecayCron`, etc.).
4. Verify `BoostDecayCron` is decorated `@Injectable()` and its `@Cron(...)` method is public.
5. Run `npx tsc --noEmit` (or `npm run build`) to confirm no compile error.

**Acceptance:** `BoostDecayCron` appears in the module providers; `boost-decay.cron.ts` runs on its schedule.

---

## P2 — Wire QualityRubric ingestion into requester review (Low/Medium)

**Goal:** `QualityRubric` model exists in `prisma/schema/marketplace.prisma` (fields: taskId unique, providerWebsiteId, requesterWebsiteId, contentRelevance, technicalQuality, communication, timeliness, overallSatisfaction, compositeScore, comments). But no code path creates a `QualityRubric` row when a requester reviews/approves a submission. `QualityEngine` (`quality.engine.ts`) and `scoring.service.ts` already consume `avgQualityRating`/`qualityRatingSum`. We must persist the rubric on review so quality ratings actually feed profiles.

**Context to read first:** `src/modules/task/task-requester/task-requester.service.ts` (the review/approve method — likely `reviewTask` or `approveTask`), `src/modules/task/market-algoritm/quality.engine.ts`, `src/modules/task/market-algoritm/scoring.service.ts`, `prisma/schema/marketplace.prisma` (`QualityRubric`).

**Steps:**
1. Identify the requester review/approval method in `task-requester.service.ts` where a submission transitions to APPROVED (and where `scoringService.updateScoresAfterTask` is called with a `qualityRating`).
2. Inside that transaction/method, after the task is approved, create a `QualityRubric` row:
   - `taskId` (unique — use upsert to be idempotent),
   - `providerWebsiteId` (from the task's `assignedProviderWebsiteId`),
   - `requesterWebsiteId` (from the task),
   - the 5 rating dimensions (accept them from the DTO if present; otherwise derive `overallSatisfaction` from the existing `qualityRating` arg),
   - `compositeScore` = weighted average of the dimensions (reuse `QualityEngine` math if possible),
   - `comments` optional.
3. If the review DTO does not yet carry rubric fields, extend the DTO with optional numeric fields (contentRelevance, technicalQuality, communication, timeliness) and compute `compositeScore` from them; fall back to the existing `qualityRating` when rubric fields are absent.
4. Ensure the `QualityRubric` relation to `WebsiteMatchingProfile` is populated (the rubric's providerWebsiteId should map to the profile). If `WebsiteMatchingProfile` lacks a direct relation to `QualityRubric`, that is fine — `scoring.service.ts` already updates `avgQualityRating`/`qualityRatingSum` on the profile; just make sure the rubric row is written so historical quality is auditable.
5. Add an idempotency guard (findFirst by `taskId`) to avoid duplicate rubric rows on re-review.

**Acceptance:** After a requester approves a submission, a `QualityRubric` row exists for that task; re-approval does not duplicate it.

---

## P3 — Add scheduled OpportunityAlertService cron (Low)

**Goal:** `OpportunityAlertService` (`src/modules/task/market-algoritm/opportunity-alert.service.ts`) has a public `alertMatchingProviders(taskId)` method but is only invoked inline from `task-requester.service.ts` at task-creation time. There is no periodic job that alerts idle providers about open tasks. Add a cron (inside the service file) that scans recently-created/open tasks and calls `alertMatchingProviders` for each.

**Context to read first:** `opportunity-alert.service.ts` (full), `marketplace-cron.module.ts` (registration pattern), `task-requester.service.ts` (how it's currently called), Prisma `PlacementTask` model shape (lifecycleStatus, requesterWebsiteId, createdAt).

**Steps:**
1. In `opportunity-alert.service.ts`, add a `@Injectable()` cron method, e.g. `async scanOpenTasks()` decorated with `@Cron('*/15 * * * *')` (every 15 min) — import `Cron` from `@nestjs/schedule`.
2. The method should:
   - Query `placementTask` where `lifecycleStatus` IN ('OPEN','WAITING_FOR_APPLICANTS') AND `createdAt` >= now − 24h (or some recent window), ordered by createdAt desc, take a bounded batch (e.g. 50).
   - For each task, call `this.alertMatchingProviders(task.id).catch(() => {})`.
   - Respect the existing in-memory `dailyCounters` rate-limit (already in the service) so providers are not over-notified.
3. Register the cron: open `marketplace-cron.module.ts`, import `OpportunityAlertService` from `../market-algoritm/opportunity-alert.service` and add it to `providers`, OR (preferred, to keep cron module clean) add the `@Cron` method directly in the service and ensure the service is provided by a module that is loaded (it is already provided by `task-requester.module.ts`; if you keep it there, no registration change is needed — but verify the `@Cron` decorator fires by confirming the service is a singleton provider in an imported module).
4. Confirm the service does not double-alert: the existing `isWithinRateLimit` + `dailyCounters` guard plus the 24h task window should prevent repeats. If needed, de-dupe by tracking already-alerted taskIds per day in the same in-memory map.

**Acceptance:** A open task created >15 min ago still triggers a provider opportunity alert via the scheduled scan, without spamming (rate-limited).

---

## P4 — Promote DA/DR to a ranking input (Medium)

**Goal:** In `src/modules/task/market-algoritm/matching.engine.ts`, `calculateCompatibility()` (line ~472) only applies a −15 penalty when `requiredDr > 0 && !authorityMeets` (line ~495). DA/DR is not a positive scoring factor and is not used to filter candidates at browse time. The hard DA/DR gate currently runs only at apply time via Moz API in `provider-task.service.ts` (lines ~415–428). Promote DA/DR into the compatibility score so meeting/exceeding the required Domain Rating is rewarded, and optionally filter clearly-ineligible candidates at browse time.

**Context to read first:** `matching.engine.ts` (`buildCandidate`, `calculateCompatibility`), `ranking.service.ts` (how `compatibilityScore` is consumed), `provider-task.service.ts` (Moz DA/DR check), `scoring.utils.ts` (`clampScore`).

**Steps:**
1. In `calculateCompatibility`, change the authority handling:
   - Keep: `if (requiredDr <= 0) score += 10` (unknown requirement → neutral-positive).
   - Add a positive branch: `else if (authorityMeets) score += 15` (meets/exceeds required DR is rewarded).
   - Keep: `else score -= 15` (below required).
   - Make sure `clampScore(...,0,100)` still bounds the result.
2. (Optional, only if spec demands browse-time filtering) In `buildHardRuleCandidates` or `getCandidateTasks`, when `task.requiredDomainRating > 0` AND the provider website has a known `domainRating`, drop the candidate if `domainRating < requiredDomainRating` (mirroring the apply-time Moz gate, but using the stored `domainRating` column so it works without live Moz calls). Be careful: do NOT filter when `domainRating` is null/unknown, to avoid hiding eligible sites.
3. Do NOT remove the existing apply-time Moz check in `provider-task.service.ts` — keep it as a final hard gate.
4. Verify the relaxation engine (`matching-relaxation.engine.ts`) still passes candidates through (authority is not part of the relaxation truth table; leave relaxation unchanged unless the spec explicitly says authority should relax).

**Acceptance:** A provider whose `domainRating` meets/exceeds a task's `requiredDomainRating` scores higher in `compatibilityScore`; below-requirement still penalized; no regression to relaxation or apply-time validation.

---

## P5 — (Optional) Extract AnalyticsEngine / BehaviourPatternService (Medium/High)

**Goal (optional, only if the spec requires these as first-class engines):** Currently marketplace analytics are served ad-hoc via `src/modules/admin/admin-analytics/` dashboard queries, and behaviour-pattern tracking is not a distinct concept (risk + reliability cover parts of it). The audit (§6, §30) flagged these as optional gaps.

**P5a — AnalyticsEngine (Medium):**
1. Create `src/modules/task/market-algoritm/analytics.engine.ts` exporting `AnalyticsEngine` with methods that compute the marketplace KPIs the dashboard currently queries inline (provider/requester counts, match volume, status distribution, niche distribution, risk distribution).
2. Move the relevant query logic out of `admin-analytics/` services into `AnalyticsEngine`.
3. Export/provide `AnalyticsEngine` from `marketplace-engine.module.ts`.
4. Have `admin-analytics` services call `AnalyticsEngine` instead of duplicating Prisma queries.

**P5b — BehaviourPatternService (High):**
1. Add a `BehaviourPattern` model to `prisma/schema/marketplace.prisma` (websiteId, patternType, severity, score, windowStart, windowEnd, evidenceJson, resolvedAt) + migration.
2. Create `src/modules/task/market-algoritm/behaviour-pattern.service.ts` that detects anomalous interaction cadence (e.g. erratic timing, rating clustering, burst-vs-idle switches) from `DomainInteraction` — separate from `RiskEngine` (risk = penalties) and `PatternMonitorService` (graph clusters/reciprocal rings).
3. Wire it into `scoring.service.ts updateScoresAfterTask` or a new cron so behaviour signals feed the profile (e.g. a `behaviourScore` column on `WebsiteMatchingProfile` if the spec needs it).
4. Provide + export from `marketplace-engine.module.ts`; optionally add a cron in `marketplace-cron.module.ts`.

**Acceptance (P5):** Analytics queries live in a dedicated engine; behaviour patterns are tracked as a first-class concept with its own model and service, separate from risk/pattern-monitor.

---

## SEQUENCE & COMPLEXITY SUMMARY

| Order | Prompt | Complexity | Why this order |
|-------|--------|------------|----------------|
| P1 | Register BoostDecayCron | Low | Trivial 1-line registration; prevents silent decay loss. Do first. |
| P2 | QualityRubric ingestion | Low/Medium | Data-quality fix; rubric model already exists. |
| P3 | OpportunityAlert cron | Low | UX/liquidity; reuses existing service. |
| P4 | DA/DR as ranking input | Medium | Matching-quality improvement; touches scoring. |
| P5 | AnalyticsEngine / BehaviourPattern (optional) | Medium / High | Only if spec demands first-class engines; largest surface area. |

Apply P1 → P2 → P3 → P4 → P5 in order. Each prompt is self-contained but later prompts assume earlier ones are merged. After each, run `npx prisma generate` (if schema changed) and `npm run build` to confirm compilation.
