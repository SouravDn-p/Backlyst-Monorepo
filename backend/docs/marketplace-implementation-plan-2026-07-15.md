# Marketplace Implementation Plan

**Baseline audit:** `docs/TECHNICAL-AUDIT-2026-07-15.md`
**Application:** backlyst-backend (NestJS, Prisma/PostgreSQL)
**Date:** 2026-07-15

This document converts every gap in the audit into an actionable, portion-based implementation plan. Each portion has a **Requirement**, **Scope**, **Do/Don't**, and a **fully self-contained Agentic-AI Prompt** that embeds all needed context (exact file paths, schema snippets, existing patterns) so it can run in an isolated session. Prompts reference only files/code that exist in this repo.

## Conventions (apply to every portion)
- Engines live in `src/modules/task/market-algoritm/`. Orchestration is in `src/modules/task/provider-task/*`, `src/modules/task/task-requester/*`, `src/modules/task/admin-task/*`.
- Do NOT modify the spec-compliant behaviour of `ValidationEngine.validateTransition`, `MatchingEngine`, `MatchingRelaxationEngine`, `TommacayRankingService` beyond what the portion asks. Keep changes additive or clearly scoped.
- New Prisma models/fields go in `prisma/schema/marketplace.prisma` (or the relevant split schema), followed by `npx prisma migrate dev` / `prisma generate`. The repo uses split schemas under `prisma/schema/*` and a central generator.
- Every new service must be `@Injectable()` and registered in the relevant `*.module.ts` `providers` array (pattern: `provider-task.module.ts`, `task-requester.module.ts`, `admin-task.module.ts`).
- Reuse `sendResponse` from `src/utils/sendResponse` for controller returns; reuse `PrismaService` from `src/prisma/prisma.service`.
- Do NOT generate implementation code outside the prompt's scope. Keep each portion independently mergeable.

## Portion index (priority order, highest first)
| ID | Title | Complexity | Depends on |
|----|-------|-----------|-----------|
| P1 | Activate dead visibility/quality fields | Low | -
| P2 | Consume diversity score + forceNewDomain in live path | Low | -
| P3 | Dispute System (write Dispute + RiskEvent + credit) | Medium | P4 (risk log) |
| P4 | RiskEvent log writes on every risk delta | Low | -
| P5 | Marketplace Modes (consume MarketplaceModeConfig) | Medium | -
| P6 | Liquidity / admin-assisted matching (ManualMatchQueue) | High | P5 |
| P7 | Niche cap seeding + enforcement options | Low | -
| P8 | Pattern Monitoring engine | Very High | -
| P9 | Supply/Demand balancing engine | High | P5 |
| P10 | Architecture refactor (MarketplaceModule) | High | P1-P9 stable |


---

## Portion P1 — Activate Dead Visibility / Quality Fields

### Requirement (spec: §5, §6, §7, §22)
The following columns exist in `prisma/schema/marketplace.prisma` `WebsiteMatchingProfile` but are currently never read or written at runtime (verified: grep shows `reliabilityScore`, `internalPriorityScore`, `maxRequesterExposurePerDay`, `forceNewDomainNext`/`forceNewDomainUntil` have no effective runtime effect):
- `reliabilityScore Float @default(50)` (marketplace.prisma:38)
- `internalPriorityScore Float @default(50)` (marketplace.prisma:37)
- `maxRequesterExposurePerDay Int @default(50)` (marketplace.prisma:168)
- `forceNewDomainNext Boolean @default(false)` + `forceNewDomainUntil DateTime?` (marketplace.prisma:45-46)

### Scope
1. Compute `reliabilityScore` in `TommacayScoringService.updateScoresAfterTask` (scoring.service.ts:19-134) from success ratio: `reliabilityScore = clampScore(successfulInteractions / max(1, totalInteractions) * 100)`. Persist it (field already exists).
2. Consume `internalPriorityScore` in `TommacayRankingService` final score as an additive bonus: `score += profile.internalPriorityScore * config.internalPriorityWeight` (add `internalPriorityWeight Float @default(0.1)` to `MarketplaceScoringConfig`). Read in `getConfig()` (ranking.service.ts:185-210).
3. Enforce `maxRequesterExposurePerDay` in `TommacayRankingService.rankAndFilter`: a requester website may not appear for the same provider more than `maxRequesterExposurePerDay` times per rolling day (track via `OpportunityImpression` count for requesterWebsiteId today, or reuse `exposureCount7d` semantics). Provide a safe fallback (skip enforcement if count query fails).
4. Do NOT change `forceNewDomainNext` here (handled in P2).

### Do / Don't
- DO keep `calculateScores`/pure functions in `scoring.utils.ts` for new math; call from `scoring.service.ts`.
- DON'T change the final ranking formula structure beyond adding the priority bonus term.
- DON'T break existing `getDailyProviderWebsiteCounts` (ranking.service.ts:212-234).

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P1 in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend.

GOAL: Activate four currently-dead columns on WebsiteMatchingProfile so they actually affect behaviour. Audit of current code confirms these are declared but unused.

EXACT CHANGES:
1) Schema: open prisma/schema/marketplace.prisma. In model MarketplaceScoringConfig (around line 147-192) add field: `internalPriorityWeight Float @default(0.1)`. Save. Run `npx prisma generate` then `npx prisma migrate dev --name p1_internal_priority_weight` (or the repo's migration command). Do NOT add/remove other fields.
2) Reliability score: edit src/modules/task/market-algoritm/scoring.service.ts, function updateScoresAfterTask (currently computes completedInteractions, failedInteractions, totalInteractions, completionRate). Add: `const reliabilityScore = Math.round(clampScore((profile.successfulInteractions + (wasSuccessful?1:0)) / Math.max(1, profile.totalInteractions + 1) * 100));` and include `reliabilityScore` in the `data` object of the final `this.prisma.websiteMatchingProfile.update(...)`. `clampScore` is already imported. `successfulInteractions` and `totalInteractions` are existing fields; use profile.* current values and add the in-flight delta like the other counters do.
3) Ranking priority bonus: edit src/modules/task/market-algoritm/ranking.service.ts:
   - In getConfig() (around line 185-210) add: `internalPriorityWeight: Number(config?.internalPriorityWeight ?? 0.1),` to the returned object.
   - In rankAndFilter, where the score is computed (the `weightedScore` block around line 108-119), add an additive term: read `profile?.internalPriorityScore ?? 50` and add `internalPriorityScore * config.internalPriorityWeight` to `score` (subtract nothing). Keep forceMatchBonus/penalties as-is.
4) Requester daily exposure cap: in ranking.service.ts rankAndFilter, before scoring each candidate add a guard: if `config.maxRequesterExposurePerDay` is a positive number, count today's OpportunityImpression rows for this requesterWebsiteId (provider already filtered by dailyMatches). Implement a private async `getDailyRequesterWebsiteCounts(requesterWebsiteIds: string[])` mirroring `getDailyProviderWebsiteCounts` (lines 212-234) but querying `opportunityImpression` where `requesterWebsiteId in [...] and shownAt >= startOfDay`. If the count >= maxRequesterExposurePerDay, return null (drop candidate). Wrap in try/catch returning an empty map on failure so enforcement never blocks the marketplace.

VALIDATION: `npm run build` (or the repo's build script) must pass. Ensure no existing test for ranking breaks. Do NOT modify ValidationEngine, MatchingEngine, or MatchingRelaxationEngine. Do NOT change the Dispute/RiskEvent/mode logic. Keep changes minimal and additive.
```

---

## Portion P2 — Consume Diversity Score + forceNewDomain in Live Path

### Requirement (spec: §11, §11)
`DistributionEngine.computeDiversityScore(rootDomain)` (distribution-engine.service.ts:23-53) is already computed and persisted to `WebsiteMatchingProfile.diversityScore` by `TommacayScoringService` (scoring.service.ts:48-50,107). However `ranking.service.ts` and `validation.engine.ts` never read `diversityScore`, so it has zero behavioural effect. Likewise `filterNewDomains` (distribution-engine.service.ts:61-97) is never invoked from the live matching/ranking path; `forceNewDomainNext` is set by `OpportunityGuaranteeCron` (opportunity-guarantee.cron.ts:49) but never consumed.

### Scope
1. In `TommacayRankingService.rankAndFilter`, add a diversity bonus: `score += (profile?.diversityScore ?? 50) * config.diversityWeight` (add `diversityWeight Float @default(0.05)` to `MarketplaceScoringConfig` + read in `getConfig()`).
2. In `MatchingEngine.buildHardRuleCandidates` (matching.engine.ts:244-302), after building hard-rule candidates, call `DistributionEngine.filterNewDomains` per provider when `forceNewDomainNext` is active to drop counterpart domains the provider already interacted with. Keep current same-domain and cooldown exclusions. Ensure `DistributionEngine` is injected into `MatchingEngine` (it is NOT currently — add to constructor + provider-task.module.ts providers/imports if needed).
3. Add indexes on `DomainPairStat.domainA/domainB` already exist (marketplace.prisma:297-298).

### Do / Don't
- DO inject `DistributionEngine` into `MatchingEngine` constructor and register both in `provider-task.module.ts` (both already listed as providers there; just wire the constructor param).
- DON'T call external Moz/network APIs in this portion.
- DON'T alter relaxation levels or compatibility math.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P2 in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend.

GOAL: Make the already-computed diversityScore and the forceNewDomainNext flag actually influence matching/ranking. Today they are computed/stored but never consumed (verified by code review).

EXISTING CODE YOU MUST REUSE (do not duplicate):
- src/modules/task/market-algoritm/distribution-engine.service.ts -> class DistributionEngine with methods computeDiversityScore(rootDomain) and filterNewDomains(providerRootDomain, candidateDomains[], forceNewDomainNext, forceNewDomainUntil).
- src/modules/task/market-algoritm/ranking.service.ts -> TommacayRankingService.rankAndFilter (around lines 15-143) and getConfig() (185-210).
- src/modules/task/market-algoritm/matching.engine.ts -> MatchingEngine.findCandidates (24-115) and buildHardRuleCandidates (244-302). MatchingEngine currently injects ValidationEngine, MatchingRelaxationEngine, MarketplaceOverrideService, PrismaService.
- src/modules/task/provider-task/provider-task.module.ts already lists both MatchingEngine and DistributionEngine as providers.

CHANGES:
1) Schema: in prisma/schema/marketplace.prisma model MarketplaceScoringConfig add `diversityWeight Float @default(0.05)`. Run prisma generate + migrate dev --name p2_diversity_weight.
2) Ranking bonus: in ranking.service.ts getConfig() add `diversityWeight: Number(config?.diversityWeight ?? 0.05),`. In the score computation (weightedScore block ~108-119) add `+ (profile?.diversityScore ?? 50) * config.diversityWeight` to score. Keep all existing terms.
3) Inject DistributionEngine into MatchingEngine: add `private readonly distributionEngine: DistributionEngine` to the constructor (import DistributionEngine from './distribution-engine.service'). In buildHardRuleCandidates, after candidate array is built and BEFORE returning, for each providerWebsite with matchingProfile.forceNewDomainNext true (and forceNewDomainUntil null or > now), collect the requesterDomains of candidates belonging to that provider and call this.distributionEngine.filterNewDomains(providerRootDomain, requesterDomains, true, profile.forceNewDomainUntil). Then remove candidates whose requesterDomain is no longer in the returned allowed set. Preserve existing same-rootDomain and cooldown exclusion logic. If filterNewDomains throws, catch and keep original candidates (never block the marketplace).

VALIDATION: build passes; no behavioural change when forceNewDomainNext is false for all profiles (default is false). Ensure provider-task.module.ts already provides DistributionEngine (it does) and MatchingEngine (it does).
```

---

## Portion P3 — Dispute System (write Dispute + RiskEvent + Credit Adjustment)

### Requirement (spec: §25)
`Dispute` model (marketplace.prisma:380-400) and `RiskEvent` model (marketplace.prisma:403-413) exist but `prisma.dispute` / `prisma.riskEvent` have zero write call-sites. `reviewTask` can set lifecycleStatus DISPUTED (task-requester.service.ts:965-1200) but never creates a `Dispute` record, never writes a `RiskEvent`, and admin `resolveDispute` (admin-task.service.ts:605-608) force-approves/rejects without a `CreditLog`/credit adjustment tied to the dispute.

### Scope
1. Add `DisputeService` (or methods in `AdminTaskService`) to: open a `Dispute` on `reviewTask` DISPUTED action; resolve it with an explicit `CreditLog`/credit adjustment (reuse `CreditTaskService` patterns) and set `creditAdjustmentId`; raise a `RiskEvent` of type `DISPUTE` via `calculateRiskScore`.
2. Seed/update `RiskEventType` enum already has DISPUTE (marketplace.prisma:366-372; also mirrored as string union in scoring.utils.ts:29-34).
3. Add Dispute admin endpoints (open/resolve/list) under `admin-task` (or a new `admin-dispute` module) guarded by `AdminGuard`.
4. Depends on P4 (RiskEvent writes) — implement P4 first or together.

### Do / Don't
- DO reuse `DomainInteractionRecorderService`/scoring utils for risk math; DO reuse `CreditTaskService` for credit adjustments.
- DON'T change the task lifecycle state machine beyond adding the Dispute record linkage.
- DON'T modify ValidationEngine core gates.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P3 (Dispute System) in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend. Implement P4 (RiskEvent writes) as part of this or first.

GOAL: Make disputes real, auditable entities with credit adjustment and risk impact. Currently the Dispute and RiskEvent models exist but nothing writes them.

EXISTING SCHEMA (prisma/schema/marketplace.prisma):
- model Dispute { id, taskId, requesterWebsiteId, providerWebsiteId, openedById, resolvedById?, status DisputeStatus @default(OPEN), reason, evidence Json?, creditAdjustmentId String?, openedAt, resolvedAt?, createdAt, updatedAt, indexes on taskId/status/requesterWebsiteId/providerWebsiteId }
- enum DisputeStatus { OPEN, UNDER_REVIEW, RESOLVED, REJECTED }
- model RiskEvent { id, websiteId, type RiskEventType, delta Float, riskScoreAfter Float, createdAt, indexes on websiteId/createdAt and type }
- enum RiskEventType { DISPUTE, REJECTION, FAILURE, ABUSE, SUCCESS }
- SCORING_CONSTANTS in src/modules/task/market-algoritm/scoring.utils.ts has RISK_DISPUTE_DELTA: 25 and calculateRiskScore(currentRiskScore, lastRiskEventAt, eventType, now?) returning {riskScore, reason}.

EXISTING SERVICES TO REUSE:
- src/modules/credit/credit-task/credit-task.service.ts (CreditTaskService) with rewardProviderCredit/deductTaskCredit/refundTaskCredit and CreditLog writes; DTOs in src/modules/credit/credit-task/dto/task-credit.dto.ts.
- src/modules/task/task-requester/task-requester.service.ts reviewTask (around lines 965-1200) where APPROVE/REJECT/REQUEST_REVISION/DISPUTED are handled. There is a DISPUTED branch setting lifecycleStatus DISPUTED and a TaskFlow event TASK_DISPUTED.
- src/modules/task/admin-task/admin-task.service.ts resolveDispute (around line 605-608) which force-approves/rejects.
- AdminGuard from src/common/guards/auth/admin.guard; sendResponse from src/utils/sendResponse.

CHANGES:
1) Create src/modules/task/admin-task/dispute.service.ts (DisputeService, @Injectable) with methods: openDispute({taskId, requesterWebsiteId, providerWebsiteId, openedById, reason, evidence}) that creates the Dispute (status OPEN), and resolveDispute({disputeId, resolvedById, decision: 'RESOLVED'|'REJECTED', creditAdjustment?: {websiteId, amount, direction}}) that: updates Dispute (status, resolvedById, resolvedAt, creditAdjustmentId), performs the credit adjustment via CreditTaskService inside a $transaction, and writes a RiskEvent of type DISPUTE for the provider website by calling calculateRiskScore on the current profile riskScore+lastRiskEventAt and persisting both the RiskEvent row and the updated riskScore on WebsiteMatchingProfile. Use prisma.$transaction.
2) Hook openDispute into reviewTask DISPUTED branch (task-requester.service.ts) so a dispute is recorded. Hook resolveDispute into admin-task.service.ts resolveDispute action (replace/augment the existing force path).
3) Add admin endpoints in admin-task.controller.ts (guarded by AdminGuard): POST /admin/tasks/:taskId/dispute (open), PATCH /admin/disputes/:id/resolve (resolve), GET /admin/disputes (list). Register DisputeService in admin-task.module.ts providers.
4) RiskEvent write helper: a private method writeRiskEvent(tx, websiteId, type, delta, riskScoreAfter) that creates prisma.riskEvent and updates websiteMatchingProfile.riskScore/lastRiskEventAt.

VALIDATION: build passes; opening a dispute via reviewTask creates a Dispute row; resolving writes a RiskEvent (type DISPUTE) and a CreditLog. Do NOT change relaxation/matching/validation engines.
```

---

## Portion P4 — RiskEvent Log Writes on Every Risk Delta

### Requirement (spec: §15)
`calculateRiskScore` (scoring.utils.ts:52-74) and its use in `TommacayScoringService.updateScoresAfterTask` (scoring.service.ts:83-92,114-116) update `WebsiteMatchingProfile.riskScore` but never write the `RiskEvent` model (marketplace.prisma:403-413). Risk history is therefore non-replayable.

### Scope
1. Add a private `writeRiskEvent(tx, websiteId, eventType, delta, riskScoreAfter)` helper used inside `updateScoresAfterTask` (and reused by P3) that creates `prisma.riskEvent` and updates `websiteMatchingProfile.lastRiskEventAt/riskScore`.
2. Ensure every risk delta path (success/failure/rejection/abuse/dispute) writes a `RiskEvent`. `updateScoresAfterTask` currently derives event from `wasSuccessful` (SUCCESS/FAILURE); keep that but add an optional `riskEventType` param (already exists) that, when provided, also writes the event.

### Do / Don't
- DO keep `calculateRiskScore` pure (no DB). Only the service writes `RiskEvent`.
- DON'T change the decay math.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P4 in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend.

GOAL: Persist an immutable RiskEvent row for every risk delta so risk history is auditable/replayable. The RiskEvent model exists (prisma/schema/marketplace.prisma:403-413) but is never written.

EXISTING CODE:
- src/modules/task/market-algoritm/scoring.service.ts class TommacayScoringService method updateScoresAfterTask(websiteId, wasSuccessful, qualityRating?, riskEventType?) (lines 19-134). It calls calculateRiskScore (from scoring.utils) and updates websiteMatchingProfile with riskScore/lastRiskEventAt/lastRiskReason.
- src/modules/task/market-algoritm/scoring.utils.ts exports SCORING_CONSTANTS (with RISK_DISPUTE_DELTA 25, RISK_REJECTION_DELTA 15, RISK_FAILURE_DELTA 10, RISK_ABUSE_DELTA 40, RISK_SUCCESS_DELTA 8), RiskEventType union, and calculateRiskScore(currentRiskScore, lastRiskEventAt, eventType, now?). The delta map RISK_DELTA_BY_EVENT is private.

CHANGES:
1) In scoring.service.ts add a private async helper writeRiskEvent(tx: Prisma.TransactionClient, websiteId: string, type: string, delta: number, riskScoreAfter: number) that does: await tx.riskEvent.create({ data: { websiteId, type, delta, riskScoreAfter } }) and await tx.websiteMatchingProfile.update({ where: { websiteId }, data: { lastRiskEventAt: new Date(), riskScore: riskScoreAfter } }). Import Prisma from '@prisma/client' for the tx type (or reuse the TxClient style from domain-interaction-recorder.service.ts).
2) Inside updateScoresAfterTask, after computing `risk = calculateRiskScore(...)`, call this.writeRiskEvent(txOrPrisma, websiteId, risk.reason, deltaForReason, risk.riskScore) where deltaForReason is looked up from SCORING_CONSTANTS via the eventType (DISPUTE 25, REJECTION 15, FAILURE 10, ABUSE 40, SUCCESS -8). Because updateScoresAfterTask currently does NOT run in a transaction for the risk part, pass `this.prisma` (not a tx) to writeRiskEvent. Keep the existing profile update block but ensure riskScore/lastRiskEventAt are set there too (avoid double update — prefer updating them within the existing update call and only create the riskEvent row via writeRiskEvent).
3) Ensure updateScoresAfterTask already accepts riskEventType and uses it (it does: riskEvent = riskEventType ?? (wasSuccessful ? 'SUCCESS' : 'FAILURE')). No signature change needed.

VALIDATION: build passes; after a task completion, a RiskEvent row exists whose type matches SUCCESS/FAILURE and riskScoreAfter equals the profile riskScore. Do not modify calculateRiskScore or the decay logic.
```

---

## Portion P5 — Marketplace Modes (consume MarketplaceModeConfig)

### Requirement (spec: §28)
`MarketplaceMode` enum + `MarketplaceModeConfig` model (marketplace.prisma:374-423) exist but `prisma.marketplaceModeConfig` has zero runtime call-sites. The only mode used at runtime is a transient `'NORMAL'`/`'LOW_POOL'` string in `MatchingEngine.findCandidates` (matching.engine.ts:84-85), never persisted/configurable. No EARLY_STAGE/SCALING behaviour is wired.

### Scope
1. Create `MarketplaceModeService` (src/modules/task/market-algoritm/marketplace-mode.service.ts) that reads the singleton `MarketplaceModeConfig` (id 'MARKETPLACE_MODE_CONFIG'); exposes `getMode()` returning EARLY_STAGE|SCALING and `getPreset()` (Json). Provide sane defaults if none exists.
2. Inject `MarketplaceModeService` into `MatchingEngine` and `TommacayRankingService`; use mode to adjust `minViableMatches`/`maxRelaxationLevel` (matching) and possibly weights (ranking). Persist `MatchingAuditLog.marketplaceMode` from the real config (already a column, marketplace.prisma:137) instead of the transient string.
3. Add admin endpoints to read/set the mode (new `admin-marketplace-mode` module or extend `admin-marketplace-config`).

### Do / Don't
- DO keep the fallback transient logic as default when no config row exists.
- DON'T change the relaxation truth table.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P5 (Marketplace Modes) in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend.

GOAL: Make marketplace modes (EARLY_STAGE / SCALING) real and configurable, consumed by matching and ranking.

EXISTING SCHEMA (prisma/schema/marketplace.prisma):
model MarketplaceModeConfig { id String @id @default("MARKETPLACE_MODE_CONFIG") mode MarketplaceMode @default(EARLY_STAGE) isActive Boolean @default(true) preset Json? createdAt updatedAt }
enum MarketplaceMode { EARLY_STAGE SCALING }
MatchingAuditLog has marketplaceMode String (line 137).

EXISTING CODE:
- src/modules/task/market-algoritm/matching.engine.ts findCandidates sets `const marketplaceMode = hardRuleCandidates.length < minViableMatches ? 'LOW_POOL' : 'NORMAL';` (lines 84-85) and writes it to MatchingAuditLog (writeAudit). Both MatchingEngine and TommacayRankingService read config via `private async getScoringConfig()` calling prisma.marketplaceScoringConfig.findFirst({where:{isActive:true}}).
- admin-marketplace-config module exists (src/modules/admin/admin-marketplace-config/*) with an upsert-by-id config service; reuse its pattern for the mode config controller.

CHANGES:
1) Create src/modules/task/market-algoritm/marketplace-mode.service.ts class MarketplaceModeService (@Injectable) with:
   - async getMode(): Promise<'EARLY_STAGE'|'SCALING'> { read prisma.marketplaceModeConfig.findUnique({where:{id:'MARKETPLACE_MODE_CONFIG'}}); return row?.mode ?? 'EARLY_STAGE'; }
   - async getPreset(): Promise<any> { return row?.preset ?? null; }
   - Provide mode-derived knobs: e.g. in EARLY_STAGE use relaxed minViableMatches (e.g. 5) and allow maxRelaxationLevel 4; in SCALING use 10 and 4. Expose getMatchingKnobs() returning {minViableMatches, maxRelaxationLevel}.
2) Inject MarketplaceModeService into MatchingEngine (add to constructor + provider-task.module.ts providers — already has MatchingEngine). In findCandidates, replace the hardcoded minViableMatches/maxRelaxationLevel (lines 82-83) with values from modeService.getMatchingKnobs() (await). Keep the LOW_POOL/NORMAL determination but also store the actual mode string (EARLY_STAGE/SCALING) in the audit metadata.
3) Inject into TommacayRankingService similarly if you want mode-specific weights; optional — at minimum pass mode into recordOpportunityImpressions reasons. Keep changes minimal: ranking can remain weight-driven.
4) Add admin endpoints (new module src/modules/admin/admin-marketplace-mode/* or extend admin-marketplace-config) GET /admin/marketplace-mode and PATCH /admin/marketplace-mode {mode, preset} guarded by AdminGuard, using sendResponse. Register the service in the module.

VALIDATION: build passes; with no DB row, behaviour defaults to EARLY_STAGE; setting SCALING via endpoint changes minViableMatches used by matching. Do NOT alter relaxation levels' truth table.
```

---

## Portion P6 — Liquidity / Admin-Assisted Matching (ManualMatchQueue)

### Requirement (spec: §18, §21, §27)
`ManualMatchQueue` model (marketplace.prisma:426-442) has zero write call-sites. On persistent `LOW_POOL`, `MatchingEngine` returns `[]` with an audit entry (matching.engine.ts:42-73). There is no admin-assisted match injection workflow.

### Scope
1. Create `LiquidityService` to surface relaxed matches and manage `ManualMatchQueue`: on `LOW_POOL`, emit the relaxed (level>=3) candidate set to an ops signal and allow admins to inject a match via a `ManualMatchQueue` row.
2. Add admin endpoints: GET /admin/liquidity/low-pool (recent LOW_POOL audits), POST /admin/liquidity/manual-match (create ManualMatchQueue + force link), PATCH /admin/liquidity/manual-match/:id/resolve.
3. A consumer that, when a provider requests opportunities and a `ManualMatchQueue` row targets their website, surfaces that task (subject to a FORCE_MATCH-style override) even if relaxation would exclude it. Reuse `MarketplaceOverrideService` FORCE_MATCH semantics rather than bypassing validation entirely — still run `validateTransition(ADMIN_FORCE)` so eligibility/ownership/security are never skipped.
4. Depends on P5 (use mode to decide whether to auto-surface relaxed matches).

### Do / Don't
- DO keep validation gates; only relax marketplace visibility/relaxation, never eligibility.
- DON'T create a second matching path that duplicates MatchingEngine.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P6 (Liquidity / admin-assisted matching) in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend. P5 (modes) should be done first or together.

GOAL: Prevent empty opportunity results on persistent LOW_POOL by (a) surfacing relaxed matches and (b) letting admins inject matches via ManualMatchQueue, all without bypassing mandatory validation gates.

EXISTING SCHEMA (prisma/schema/marketplace.prisma):
model ManualMatchQueue { id, taskId, providerWebsiteId, requesterWebsiteId, status String @default("PENDING"), createdById, note String?, resolvedAt?, createdAt, updatedAt, indexes on taskId/providerWebsiteId/requesterWebsiteId/status }
MatchingAuditLog has marketplaceMode String (already written by MatchingEngine as 'LOW_POOL' when few candidates).

EXISTING CODE:
- src/modules/task/market-algoritm/matching.engine.ts findCandidates returns [] on LOW_POOL after writing audit (lines 42-73, 84-114). TommacayRankingService.rankAndFilter (ranking.service.ts). ValidationEngine.validateTransition supports stage 'ADMIN_FORCE' (validation.engine.ts) which skips only non-eligibility rules via adminOverride.
- src/modules/task/market-algoritm/marketplace-override.service.ts MarketplaceOverrideService with FORCE_MATCH type and resolveForWebsite; ranking/matching/validation already consume overrides.
- AdminGuard at src/common/guards/auth/admin.guard; sendResponse at src/utils/sendResponse.

CHANGES:
1) Create src/modules/task/market-algoritm/liquidity.service.ts class LiquidityService (@Injectable, inject PrismaService, MarketplaceModeService from P5, ValidationEngine). Methods:
   - async getRecentLowPool(limit=50): prisma.matchingAuditLog.findMany({where:{marketplaceMode:'LOW_POOL'}, orderBy:{timestamp:'desc'}, take:limit}).
   - async createManualMatch(input:{taskId, providerWebsiteId, requesterWebsiteId, createdById, note?}): prisma.manualMatchQueue.create({data:{...input, status:'PENDING'}}). Return via sendResponse.
   - async resolveManualMatch(id, adminId): update status RESOLVED + resolvedAt.
   - async getPendingForProvider(providerWebsiteId): prisma.manualMatchQueue.findMany({where:{providerWebsiteId, status:'PENDING'}}).
2) In provider-task.service.ts getProviderOpportunities (around line 121-180) after rankAndFilter returns empty OR as an extra section, call liquidityService.getPendingForProvider(eligibleWebsiteIds) and, for each pending row, run validateTransition({stage:'ADMIN_FORCE', actorUserId:providerId, providerWebsiteId, requesterWebsiteId, taskId, adminOverride:{adminId: row.createdById, rule:'ANY_ELIGIBILITY_BYPASS?', reasonCode:'MANUAL_MATCH'}}) — NOTE: only non-eligibility rules may be skipped; eligibility/ownership/security must still pass. If validateTransition returns APPROVED/APPROVED_WITH_RESTRICTIONS, include the task in the response (flagged isManualMatch:true) and set the queue row status to APPLIED.
3) Add admin endpoints in a new module src/modules/admin/admin-liquidity/* (or extend admin-task): GET /admin/liquidity/low-pool, POST /admin/liquidity/manual-match, PATCH /admin/liquidity/manual-match/:id/resolve, all AdminGuard-protected. Register LiquidityService and (if new) the module in admin.module.ts.
4) Register LiquidityService in provider-task.module.ts providers and inject into ProviderTaskService.

VALIDATION: build passes; on LOW_POOL an admin can create a ManualMatchQueue row; on next provider opportunity fetch the task is surfaced only if it passes ADMIN_FORCE validation. Do NOT bypass eligibility/ownership/security.
```

---

## Portion P7 — Niche Cap Seeding + Enforcement Options

### Requirement (spec: §12)
`NicheDistributionCap` (marketplace.prisma:341-355) and `DistributionEngine.isNicheWithinCap` (distribution-engine.service.ts:103-139) exist; `validateTransition` LEVEL 5 flags `NICHE_CAP_EXCEEDED` as a non-blocking restriction (validation.engine.ts:534-560). But no seed data populates `NicheDistributionCap` and there is no admin API to manage it, so the cap is inert.

### Scope
1. Add a seed (or migration seed) that inserts default `NicheDistributionCap` rows for known `WebsiteCategoryKey` ids (read existing keys from DB; if none, skip). Keep `isActive` configurable.
2. Add admin endpoints to create/list/update caps (or extend admin-marketplace-config).
3. Make `NICHE_CAP_EXCEEDED` optionally blocking under SCALING mode (P5): when mode == SCALING, push it to `failedRules` instead of `restrictions`. This requires `validateTransition` to know the mode — inject `MarketplaceModeService` (P5) into `ValidationEngine`.

### Do / Don't
- DO keep EARLY_STAGE non-blocking (default) to avoid over-restriction.
- DON'T change `isNicheWithinCap` counting logic.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P7 (Niche Distribution cap activation) in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend. P5 (MarketplaceModeService) should exist.

GOAL: Make NicheDistributionCap effective and manageable. Today DistributionEngine.isNicheWithinCap works but no cap rows exist and there is no admin API; validation only flags it non-blocking.

EXISTING SCHEMA (prisma/schema/marketplace.prisma):
model NicheDistributionCap { id, categoryKey String, scope String @default("PRIMARY"), maxPerWindow Int, windowDays Int @default(7), isActive Boolean @default(true), note String?, createdAt, updatedAt, indexes on categoryKey/scope and isActive }
WebsiteCategoryKey model exists (website.prisma:111-118) with id, key.

EXISTING CODE:
- src/modules/task/market-algoritm/distribution-engine.service.ts isNicheWithinCap(categoryKey, scope) used by ValidationEngine LEVEL 5 (validation.engine.ts:534-560) which pushes 'NICHE_CAP_EXCEEDED' to restrictions (non-blocking) and returns APPROVED_WITH_RESTRICTIONS.
- MarketplaceModeService (P5) exposes getMode() -> 'EARLY_STAGE'|'SCALING'.

CHANGES:
1) Create a seed script src/scripts/seed-niche-caps.ts (runnable via ts-node) that reads all WebsiteCategoryKey ids and, for each, upserts a NicheDistributionCap { categoryKey, scope:'PRIMARY', maxPerWindow: 50, windowDays:7, isActive:true } and a SECONDARY one (maxPerWindow: 30) only if none exists for that key+scope. Print counts. Do not overwrite existing rows.
2) Add admin endpoints in a new module src/modules/admin/admin-niche-cap/* (or extend admin-marketplace-config): POST /admin/niche-caps (create), GET /admin/niche-caps (list), PATCH /admin/niche-caps/:id (update maxPerWindow/windowDays/isActive). AdminGuard + sendResponse.
3) Inject MarketplaceModeService into ValidationEngine (add to constructor + register in the three modules that provide ValidationEngine: provider-task.module.ts, task-requester.module.ts, admin-task.module.ts). In LEVEL 5 (validation.engine.ts ~534-560), if modeService.getMode() === 'SCALING' and withinCap.includes(false), push 'NICHE_CAP_EXCEEDED' to failedRules (blocking) instead of restrictions. Keep EARLY_STAGE non-blocking.

VALIDATION: build passes; after seeding, caps exist; under SCALING mode a provider+requester pair exceeding a cap is REJECTED, under EARLY_STAGE it is APPROVED_WITH_RESTRICTIONS. Do not change isNicheWithinCap counting.
```

---

## Portion P8 — Pattern Monitoring Engine

### Requirement (spec: §14)
Repeat/reciprocal detection exists via `DomainPairStat`/`ValidationEngine` cooldowns, but **cluster detection** and **group concentration** are entirely absent (no service, no model). 

### Scope
1. Create `PatternMonitoringEngine` (src/modules/task/market-algoritm/pattern-monitoring.engine.ts) that, given a provider/requester website, queries `DomainInteraction`/`DomainPairStat` aggregations to detect: (a) clusters — many distinct counterpart domains interacting with one another through a hub; (b) group concentration — a small set of domains accounting for a disproportionate share of a website's interactions.
2. Emit signals into `MarketplaceValidationLog` (existing model, marketplace.prisma:305-320) as non-blocking flags (e.g. `failedRule: 'CLUSTER_DETECTED'`/`'GROUP_CONCENTRATION'`) and optionally raise a `RiskEvent` (P4) for the offending website.
3. Integrate into `ValidationEngine` LEVEL 4 (validation.engine.ts:515-528) as an additional non-blocking check (add to restrictions, like niche cap), and/or a scheduled cron that scans for clusters daily.
4. Add indexes on `DomainInteraction.sourcePrimaryCategoryKey` etc. already exist; add any needed aggregate indexes (e.g. `@@index([sourceWebsiteId, completedAt])`) to `DomainInteraction` in schema.

### Do / Don't
- DO keep detection non-blocking initially (flag + risk, not hard reject) to avoid false positives.
- DON'T reimplement cooldown/reciprocal logic — reuse `DomainPairStat`.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P8 (Pattern Monitoring) in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend. P4 (RiskEvent writes) should exist.

GOAL: Detect marketplace abuse patterns beyond pairwise cooldowns: cluster detection (colluding groups) and group concentration (few domains dominate a website's interactions). Today only pairwise repeat/reciprocal cooldowns exist (ValidationEngine + DomainPairStat).

EXISTING SCHEMA (prisma/schema/marketplace.prisma):
model DomainInteraction { id, taskId @unique, sourceWebsiteId, targetWebsiteId, sourceDomain, targetDomain, normalizedPairKey, sourcePrimaryCategoryKey?, targetPrimaryCategoryKey?, sourceSecondaryCategoryKey?, targetSecondaryCategoryKey?, completedAt, createdAt, indexes on domains/pairKey/categoryKeys }
model DomainPairStat { id, normalizedPairKey @unique, domainA, domainB, niche keys, lastSourceDomain, lastTargetDomain, lastInteractionAt, repeatPairCooldownUntil, reciprocalCooldownUntil, interactionCount, indexes on domainA/domainB/cooldowns }
model MarketplaceValidationLog { id, userId, websiteId?, taskId?, stage, decision, failedRule?, marketplaceMode?, overrideApplied, createdAt, indexes }
model RiskEvent { id, websiteId, type RiskEventType, delta, riskScoreAfter, createdAt } (type includes ABUSE)

EXISTING CODE:
- ValidationEngine LEVEL 4 (validation.engine.ts ~515-528) currently checks riskScore>=75 and marketplaceStatus. Add a new non-blocking pattern check here.
- PatternMonitoringEngine should be @Injectable, inject PrismaService and (optionally) MarketplaceModeService (P5) and a risk-write helper (reuse the one from P4 in scoring.service.ts or duplicate a private one).

CHANGES:
1) Create src/modules/task/market-algoritm/pattern-monitoring.engine.ts class PatternMonitoringEngine with:
   - async detectConcentration(websiteId): query DomainInteraction where sourceWebsiteId=websiteId (or targetWebsiteId) within last 90 days; group by counterpart domain; compute Herfindahl-like concentration = sum((count_i/total)^2); if > 0.5 (few domains dominate) return {detected:true, score}. Use raw SQL or groupBy if supported.
   - async detectCluster(seedDomain): find domains that share >=3 counterpart domains with seedDomain (via DomainPairStat domainA/domainB) indicating a hub/clique; return list of suspect domains.
   - async evaluate(websiteId): combine both; if detected, (a) write a MarketplaceValidationLog {websiteId, stage:'PATTERN_MONITORING', decision:'APPROVED_WITH_RESTRICTIONS', failedRule:'CLUSTER_DETECTED'|'GROUP_CONCENTRATION'} and (b) write a RiskEvent type ABUSE (delta from SCORING_CONSTANTS.RISK_ABUSE_DELTA) via the P4 helper.
2) Inject PatternMonitoringEngine into ValidationEngine (constructor + the three modules). In LEVEL 4, after the existing risk/status checks, await patternMonitoringEngine.evaluate(providerWebsiteId) inside try/catch (never block on failure) — its log/risk writes are side effects; do not change the pass/fail decision here (keep non-blocking to avoid false positives).
3) Add a cron (new file src/modules/task/market-algoritm/pattern-monitoring.cron.ts, @Injectable, @Cron('0 3 * * *')) that scans websites with >20 interactions in last 30 days and runs evaluate; guard with try/catch.
4) Register PatternMonitoringEngine + cron in provider-task.module.ts (and any module that runs crons). Add schema index @@index([sourceWebsiteId, completedAt]) to DomainInteraction if helpful.

VALIDATION: build passes; running evaluate on a concentrated mock writes a MarketplaceValidationLog + RiskEvent ABUSE but does NOT reject the match (non-blocking). No change to relaxation/matching core.
```

---

## Portion P9 — Supply / Demand Balancing Engine

### Requirement (spec: §19)
No supply/demand balancing exists. `prisma.supplyDemandSnapshot` has zero results; admin analytics are read-only. There is no mechanism that nudges visibility/boost toward under-supplied segments.

### Scope
1. Add `SupplyDemandSnapshot` model (new) capturing periodic counts: open tasks (demand) per primary category, eligible provider websites (supply) per primary category, ratio, and recommended boost/visibility delta.
2. Create `SupplyDemandService` (src/modules/task/market-algoritm/supply-demand.service.ts) that computes the snapshot (cron, daily) and applies gentle visibility/boost adjustments to under-supplied niches (e.g. raise `visibilityScore` or set a transient boost for provider websites in categories with high demand/low supply). Respect `marketplaceStatus === ACTIVE` and never touch eligibility.
3. Consume snapshot in ranking optionally (e.g. category-demand bonus). Depends on P5 for mode-aware intensity (EARLY_STAGE more aggressive balancing).

### Do / Don't
- DO keep adjustments bounded and non-destructive (score tweaks only).
- DON'T let balancing flip eligibility or override suppression.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P9 (Supply/Demand balancing) in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend. P5 (MarketplaceModeService) should exist.

GOAL: Balance marketplace supply (provider eligible websites per niche) vs demand (open requester tasks per niche) by periodically nudging visibility/boost toward under-supplied niches. Today nothing does this.

EXISTING SCHEMA (prisma/schema):
- Website has primaryCategoryKey String? (website.prisma:55-56) and marketplaceVisibilityStatus, verificationStatus, isDeleted, isFlag, isWalletLock, rootDomain.
- WebsiteMatchingProfile has visibilityScore, boostFactor, marketplaceStatus, diversityScore (marketplace.prisma:25-93).
- PlacementTask has lifecycleStatus, requesterWebsiteId, requiredDomainRating (placement.prisma:1-77). Open statuses: 'OPEN','WAITING_FOR_APPLICANTS'.
- MarketplaceModeService.getMode() (P5) returns 'EARLY_STAGE'|'SCALING'.

CHANGES:
1) Add to prisma/schema/marketplace.prisma a new model:
model SupplyDemandSnapshot { id String @id @default(cuid()) categoryKey String windowStart DateTime windowEnd DateTime openTasks Int providerWebsites Int ratio Float recommendedVisibilityDelta Float recommendedBoostDelta Float createdAt DateTime @default(now()) @@index([categoryKey, windowStart]) @@index([windowStart]) }
Run prisma generate + migrate dev --name p9_supply_demand_snapshot.
2) Create src/modules/task/market-algoritm/supply-demand.service.ts class SupplyDemandService (@Injectable; inject PrismaService, MarketplaceModeService). Methods:
   - async computeAndApply(): for each distinct WebsiteCategoryKey id, count open tasks whose requester website primaryCategoryKey = key (via PlacementTask join Website) and count eligible provider websites with that primaryCategoryKey (reuse eligibility filter: verificationStatus VERIFIED, marketplaceVisibilityStatus VISIBLE, !isDeleted, !isFlag, !isWalletLock, matchingProfile.marketplaceStatus ACTIVE). Compute ratio = demand/supply; if supply < demand*0.5 (under-supplied), compute recommendedVisibilityDelta (e.g. min(10, ratio*5)) and recommendedBoostDelta. Persist a SupplyDemandSnapshot row. Then, for provider websites in under-supplied categories, apply a bounded adjustment: prisma.websiteMatchingProfile.updateMany({where:{websiteId in underSuppliedWebsiteIds, marketplaceStatus:'ACTIVE'}, data:{ visibilityScore: { increment: recommendedVisibilityDelta }, boostFactor: { increment: recommendedBoostDelta } }}) — clamp boostFactor to [minBoostFactor,maxBoostFactor] from MarketplaceScoringConfig. Under SCALING mode, halve the deltas; under EARLY_STAGE, use full.
   - Guard everything in try/catch; never throw out of the job.
3) Add a cron src/modules/task/market-algoritm/supply-demand.cron.ts @Cron('0 4 * * *') calling computeAndApply. Register SupplyDemandService + cron in provider-task.module.ts providers.
4) Optional (low priority): in TommacayRankingService, after computing scores, add a small demand bonus for the task's requester category using the latest SupplyDemandSnapshot ratio. Keep it additive and small.

VALIDATION: build passes; after cron runs, under-supplied categories have higher visibilityScore/boostFactor on their provider websites, clamped, without changing eligibility. No change to matching/validation core gates.
```

---

## Portion P10 — Architecture Refactor (MarketplaceModule)

### Requirement (spec: §30)
Marketplace engines are correct but orchestrated ad-hoc across `provider-task`, `task-requester`, `admin-task` services, risking divergence. No cohesive Marketplace module. (Audit §30 = Needs Refactor.)

### Scope
1. Introduce `src/modules/task/marketplace/marketplace.module.ts` that aggregates all engines (MatchingEngine, MatchingRelaxationEngine, TommacayRankingService, TommacayScoringService, ValidationEngine, DistributionEngine, TierEngine, MarketplaceOverrideService, DomainInteractionRecorderService, OpportunityGuaranteeCron, and new P3-P9 services) and exports `ValidationEngine`, `MatchingEngine`, `TommacayRankingService`, `TommacayScoringService`, `DomainInteractionRecorderService` so existing modules can import them from one place.
2. Ensure ALL constraint checks go through `ValidationEngine.validateTransition` (already centralized). Remove any residual ad-hoc eligibility/cooldown checks duplicated in services (verify none remain beyond the centralized call).
3. This is a **structural** refactor; do it LAST, after P1-P9 are stable. Keep behaviour identical (no logic changes).

### Do / Don't
- DO keep engine class names/method signatures stable so call-sites don't change.
- DON'T introduce behaviour changes; this is purely module wiring/consolidation.
- DON'T merge the three task services; only centralize the engine module and re-point imports.

### Agentic-AI Prompt (runnable in isolated session)
```
You are implementing Portion P10 (Architecture refactor) in the NestJS/Prisma marketplace backend at /Users/betopia/Desktop/projects/tommackay001 || FO528F3AACFC7/backlyst-backend. Do this LAST, after P1-P9 are merged and stable. This is a STRUCTURAL refactor with NO behaviour changes.

GOAL: Consolidate the marketplace engines into a single MarketplaceModule and ensure all constraint checks flow through ValidationEngine.validateTransition.

CONTEXT — current structure:
- Engines live in src/modules/task/market-algoritm/*. Each engine is @Injectable. They are currently listed as providers directly in src/modules/task/provider-task/provider-task.module.ts, src/modules/task/task-requester/task-requester.module.ts, and src/modules/task/admin-task/admin-task.module.ts (each repeats the same provider list).
- ValidationEngine.validateTransition is the single gate (validation.engine.ts). It is already called from provider-task.service.ts (applyToTask), task-requester.service.ts (selectProvider, reviewTask approve), and admin-task.service.ts (admin force). No service should re-implement eligibility/cooldown/risk checks.

CHANGES:
1) Create src/modules/task/marketplace/marketplace.module.ts that declares ALL engines (existing + new from P3-P9: LiquidityService, PatternMonitoringEngine, SupplyDemandService, MarketplaceModeService, DisputeService) as providers and EXPORTS the ones other modules need: ValidationEngine, MatchingEngine, TommacayRankingService, TommacayScoringService, DomainInteractionRecorderService, MarketplaceModeService, LiquidityService, PatternMonitoringEngine, SupplyDemandService, DisputeService.
2) Update provider-task.module.ts, task-requester.module.ts, admin-task.module.ts to import MarketplaceModule (add to imports) and REMOVE the duplicated engine providers (keep only their respective *Service). Verify each service's required engines are covered by the exported set.
3) Grep the whole src/ for any place that re-implements eligibility/verification/cooldown/risk checks inline (e.g. manual isDeleted/verificationStatus checks, manual cooldown math) outside validateTransition. If found and redundant, replace with a validateTransition call or a ValidationEngine helper. Do NOT alter the validateTransition logic.
4) Ensure cron providers (OpportunityGuaranteeCron, pattern-monitoring.cron, supply-demand.cron) are provided once (in MarketplaceModule) and not duplicated.

VALIDATION: `npm run build` passes and the app boots; full marketplace behaviour (getProviderOpportunities, applyToTask, selectProvider, reviewTask, admin actions) is unchanged. Run the existing test suite if present. No logic, scoring, relaxation, or validation changes.
```

---

## Execution Sequence

Run portions in this order to respect dependencies and de-risk:

```
Wave 1 (Low/Medium, high trust impact, no new engines):
  P1  Activate dead visibility/quality fields
  P2  Consume diversity + forceNewDomain in live path
  P4  RiskEvent log writes
  P7  Niche cap seeding + enforcement options

Wave 2 (Medium, config-driven behaviour):
  P3  Dispute System            (needs P4)
  P5  Marketplace Modes

Wave 3 (High/Very High, new engines):
  P6  Liquidity / admin-assisted matching   (needs P5)
  P9  Supply/Demand balancing               (needs P5)
  P8  Pattern Monitoring                    (needs P4; standalone engine)

Wave 4 (Structural):
  P10 Architecture refactor   (after P1-P9 stable)
```

## Dependency Graph
- P3 -> P4 (RiskEvent writes)
- P5 -> P6, P7, P9 (mode-aware behaviour)
- P4 -> P3, P8 (risk events)
- P10 -> all (do last)
- P1, P2, P7 are independent of each other.

## Cross-cutting Risks & Mitigations
1. **Dead-field confusion** — operators may believe controls active. P1/P2 make them real; verify in Wave-1 QA that ranking/validation actually change.
2. **Over-restriction from P7/P8** — keep EARLY_STAGE non-blocking and pattern detection non-blocking initially; tune caps after observing data.
3. **Migration coordination** — each schema change gets its own `prisma migrate dev` with a descriptive name; never hand-edit migrations. Verify `prisma generate` after every schema edit.
4. **Cron overlap** — OpportunityGuaranteeCron (02:00), PatternMonitoring (03:00), SupplyDemand (04:00) are staggered; ensure a single module provides each cron (P10) to avoid duplicate schedulers.
5. **Validation gate integrity** — P6 manual match and P8 pattern flags MUST NOT bypass eligibility/ownership/security. ADMIN_FORCE only skips non-eligibility rules (existing contract in validation.engine.ts).
6. **Performance** — matching is O(N*M) with per-candidate queries (matching.engine.ts buildCandidate). P2/P9 add queries; monitor with realistic data volumes before enabling aggressive balancing.

## Acceptance Criteria (per portion)
- P1: reliabilityScore computed; internalPriorityScore affects rank; maxRequesterExposurePerDay enforced; build green.
- P2: diversityScore appears in ranking score; forceNewDomainNext actually filters counterpart domains; no change when flag false.
- P3: reviewTask DISPUTED creates Dispute; resolve writes RiskEvent(DISPUTE) + CreditLog; admin endpoints guarded.
- P4: every risk delta writes a RiskEvent row; riskScoreAfter matches profile.
- P5: no DB row -> EARLY_STAGE default; endpoint can switch to SCALING and change matching knobs; audit records real mode.
- P6: admin can create ManualMatchQueue; provider surfaces task only if ADMIN_FORCE validation passes; LOW_POOL audits queryable.
- P7: seed creates caps; admin can manage; SCALING mode makes cap blocking, EARLY_STAGE non-blocking.
- P8: concentrated/cluster mock writes MarketplaceValidationLog + RiskEvent(ABUSE); match not hard-rejected.
- P9: cron produces SupplyDemandSnapshot; under-supplied niches get bounded visibility/boost uplift; eligibility unchanged.
- P10: build + boot green; behaviour identical; engines consolidated; no duplicated constraint logic.

## Notes for Agent Sessions
- Each prompt above is self-contained: it names exact files, line ranges, schema snippets, and reuse targets so it runs in a fresh session without this doc.
- Agents must run `prisma generate` (and `migrate dev`) after any schema edit, and `npm run build` before reporting done.
- Agents must NOT modify ValidationEngine core gates, MatchingEngine relaxation truth table, or scoring math beyond the stated additive terms.
- If an assumed file/line differs, the agent should re-read the current file (paths are stable) rather than guess.
