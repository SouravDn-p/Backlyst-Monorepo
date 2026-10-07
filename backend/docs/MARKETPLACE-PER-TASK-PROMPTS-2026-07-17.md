# Marketplace — Per-Task Implementation Prompts (T4–T8)

**Project:** backlyst-backend (NestJS / Prisma / PostgreSQL)
**Source:** `docs/MARKETPLACE-REMAINING-IMPLEMENTATION-PROMPT.md`
**Generated:** 2026-07-17 (verified against the actual codebase)
**Purpose:** Each `## Pn` block below is a **self-contained, copy-paste-able prompt** that can be run in its own fresh session. Context is embedded in every block (no cross-references required).

---

## ⚠️ Preface: what is ALREADY done (verified 2026-07-17)

Before running any prompt, know that the following were already implemented in the current code, so the older prompt's "open bugs" for these are already resolved:

- **T3 (`behaviourScore` in ranking):** `behaviourScore?: number | null;` already exists in `MatchingProviderWebsite.matchingProfile` at `src/modules/task/market-algoritm/matching.types.ts:40`, and is consumed in `ranking.service.ts:152-153`. DONE.
- **T4 (risk consolidation) + the old "Bug 2":** The requester REJECT path (`src/modules/task/task-requester/task-requester.service.ts:1257-1261`) already calls `this.riskEngine.processRiskEvent(task.assignedProviderWebsiteId, 'REJECTION', profile)`, and only keeps `boostFactor` co-written. The dispute path (`dispute.service.ts`) is also consolidated. `RiskEngine` is injected into `TaskRequesterService` (`private readonly riskEngine: RiskEngine`) and `MarketplaceEngineModule` is imported into `TaskRequesterModule`. The `handleRejectedTaskCredit` signature already accepts `providerWebsiteId: string | null` (credit-task.service.ts:220). T4 is effectively DONE.
- **The only real build blocker is 4 stale specs** (see **P1** below) — `npx tsc --noEmit` currently fails with exactly these 4 errors.

**Recommended run order:** P1 → P2 (T5) → P3 (T7) → P4 (T6, optional) → P5 (T8, optional).

---

## P1 — Fix the 4 stale spec compile errors (unblock `tsc --noEmit`)

**Priority:** Critical (build RED) · **Complexity:** Low

**Goal:** Make `npx tsc --noEmit` pass. Four `*.spec.ts` files are out of sync with current service constructors. Do **NOT** lower any service signature to satisfy the tests — add the missing mock/argument in the spec instead.

**Current build errors (verified):**
```
src/modules/notification/notification.service.spec.ts(79,19): error TS2554: Expected 4 arguments, but got 3.
src/modules/task/market-algoritm/ranking.service.spec.ts(120,10): error TS2554: Expected 4 arguments, but got 3.
src/modules/task/market-algoritm/validation.engine.spec.ts(87,10): error TS2554: Expected 4 arguments, but got 3.
src/modules/task/task-requester/task-requester.service.spec.ts(78,19): error TS2554: Expected 14 arguments, but got 13.
```

**Verified current constructor signatures (read these files to confirm before editing):**

1. **`NotificationService`** — `src/modules/notification/notification.service.ts:53-59`
   ```ts
   constructor(
     private readonly prisma: PrismaService,
     private readonly notificationPubSubService: NotificationPubSubService,
     private readonly notificationMetricsService: NotificationMetricsService,
     @InjectQueue(QUEUE_NAMES.NOTIFICATION)
     private readonly notificationQueue: Queue,
   ) {}
   ```
   → The spec at `src/modules/notification/notification.service.spec.ts:79` calls `new NotificationService(prisma as any, pubSub as any, queue as any)` (3 args). It is **missing** `notificationMetricsService` (arg #3) and currently passes `queue` as arg #3. Fix: add a `metrics` mock and pass it in the correct position. Looking at the spec's `createMocks`, there is a `gateway` and `queue` and `pubSub`, but **no** metrics mock. Add:
   ```ts
   const metrics = {
     recordNotificationSent: jest.fn(),
     recordNotificationCreated: jest.fn(),
     recordDeliveryFailure: jest.fn(),
   };
   ```
   (verify the actual `NotificationMetricsService` method names by reading `src/modules/notification/notification-metrics.service.ts` first, and mock only what is used). Then change the constructor call to:
   ```ts
   const service = new NotificationService(prisma as any, pubSub as any, metrics as any, queue as any);
   ```
   Remove or ignore the now-unused `gateway` if it is not a constructor dep (confirm by reading the constructor — `gateway`/emitToUser is likely via `notificationPubSubService`, so `pubSub` already covers it).

2. **`TommacayRankingService`** — `src/modules/task/market-algoritm/ranking.service.ts:10-15`
   ```ts
   constructor(
     private readonly prisma: PrismaService,
     private readonly overrideService: MarketplaceOverrideService,
     private readonly tierEngine: TierEngine,
     private readonly configService: MarketplaceConfigService,
   ) {}
   ```
   → The spec at `src/modules/task/market-algoritm/ranking.service.spec.ts:120-124` calls `new TommacayRankingService(prisma, overrideService, tierEngine)` (3 args). It is **missing** `configService` (the 4th arg). Add a `configService` mock:
   ```ts
   const configService = {
     getMergedConfig: jest.fn().mockResolvedValue({
       // provide ALL fields read by rankAndFilter, e.g.:
       maxProviderMatchesPerDay: 3,
       maxRequesterExposurePerDay: 50,
       newWebsiteBoostFactor: 0,
       exposurePenaltyPerTaskView: 0,
       riskPenaltyDisputeWeight: 0,
       riskPenaltyRejectionWeight: 0,
       forceMatchBonus: 0,
       compatibilityWeight: 1,
       opportunityWeight: 1,
       visibilityWeight: 1,
       reputationWeight: 1,
       boostWeight: 1,
       behaviourWeight: 0,
       internalPriorityWeight: 1,
       diversityWeight: 1,
       lowPriorityFactor: 1,
     }),
   };
   ```
   (Read `MarketplaceConfigService.getMergedConfig()` return type / `MarketplaceScoringConfig` to ensure all consumed fields are present. The safest approach: call the real `configService` shape by reading `marketplace-config.service.ts`.) Then:
   ```ts
   return new TommacayRankingService(prisma as any, overrideService as any, tierEngine as any, configService as any);
   ```

3. **`ValidationEngine`** — `src/modules/task/market-algoritm/validation.engine.ts:69-74`
   ```ts
   constructor(
     private readonly prisma: PrismaService,
     private readonly tierEngine: TierEngine,
     private readonly distributionEngine: DistributionEngine,
     private readonly configService: MarketplaceConfigService,
   ) {}
   ```
   → The spec at `src/modules/task/market-algoritm/validation.engine.spec.ts:87` calls `new ValidationEngine(prisma, tierEngine, distributionEngine as any)` (3 args). It is **missing** `configService` (4th arg). Add:
   ```ts
   const configService = {
     getMergedConfig: jest.fn().mockResolvedValue({
       repeatPairCooldownDays: 90,
       reciprocalCooldownDays: 120,
       maxNetworkConcentrationPerWindow: 50,
       networkConcentrationWindowDays: 7,
       // plus any other fields your test paths read
     }),
   };
   ```
   (Confirm the exact field set by reading `MarketplaceConfigService` and the `getCooldownDays`/`getNetworkConcentrationConfig` consumers.) Then:
   ```ts
   return new ValidationEngine(prisma, tierEngine, distributionEngine as any, configService as any);
   ```

4. **`TaskRequesterService`** — `src/modules/task/task-requester/task-requester.service.ts` constructor takes **14** deps (verified order):
   ```
   prisma, creditTaskService, taskFlowService, weeklyContributionService,
   taskNotificationService, disputeService, s3, validationEngine,
   scoringService, riskEngine, domainInteractionRecorder,
   opportunityAlertService, graduatedPenaltyService, trustIndicatorService
   ```
   → The spec at `src/modules/task/task-requester/task-requester.service.spec.ts:78-92` passes **13** args (missing `riskEngine`). Add a `riskEngine` mock (it only needs to satisfy the REJECT path call `processRiskEvent(websiteId, 'REJECTION', profile)`):
   ```ts
   const riskEngine = {
     processRiskEvent: jest.fn().mockResolvedValue({ riskScore: 50, reason: 'REJECTION' }),
   };
   ```
   Insert it in the **correct position** — between `scoringService` and `domainInteractionRecorder` (i.e. arg #10). The current spec call args 1–9 are `prisma, creditTaskService, taskFlowService, weeklyContributionService, taskNotificationService, disputeService, s3, validationEngine, scoringService`; add `riskEngine as any` as the 10th, then shift `domainInteractionRecorder, opportunityAlertService, graduatedPenaltyService, trustIndicatorService` to 11–14.

**Steps:**
1. Read each of the 4 service constructors + the 4 spec files.
2. Add the missing mock(s) and the missing constructor argument in each spec (positions shown above).
3. Confirm by running `npx tsc --noEmit` — it must report **0 errors**.
4. Run `npx jest notification.service.spec ranking.service.spec validation.engine.spec task-requester.service.spec` to ensure the specs still pass (fix only mock shape, never the assertion logic).

**Acceptance:**
- `npx tsc --noEmit` exits 0.
- All 4 specs pass.
- No service constructor signature was changed.

---

## P2 — T5: Unify boost writers

**Priority:** Medium · **Complexity:** Medium

**Goal:** Make a single owner responsible for the new-user / first-success boost (`boostFactor` / `firstSuccessAt` / `firstSuccessBoostActive`), currently split across the scoring service and two crons.

**Files (verified current state):**
- `src/modules/task/market-algoritm/scoring.service.ts`
  - L19 class `TommacayScoringService` (rename later in P3 — keep the name here for now).
  - `updateScoresAfterTask(websiteId, wasSuccessful, qualityRating?, riskEventType?)` at L29.
  - L126-129: on success clears `firstSuccessBoostActive` and sets `firstSuccessAt = (wasSuccessful && !profile.firstSuccessAt) ? now : profile.firstSuccessAt`.
- `src/modules/task/market-algoritm/opportunity-guarantee.cron.ts`
  - `OpportunityGuaranteeCron.refreshOpportunityFairness()` `@Cron('0 2 * * *')`.
  - L40-43: `boostFactor = (hoursSinceLastMatch > 72 && !profile.firstSuccessAt) ? Math.min(3, profile.boostFactor + 0.5) : profile.boostFactor;`
- `src/modules/task/market-algoritm/boost-decay.cron.ts`
  - `BoostDecayCron.handleBoostDecay()` `@Cron('0 4 * * *')`; decays `boostFactor` over time, keys first-success decay on `firstSuccessAt` (L52-60). Keep as the decay owner.

**Steps:**
1. Add a single shared method — e.g. `applyNewUserBoost(profile, ctx)` — on the scoring service (or a new small `BoostService` injected where needed). It must encapsulate the first-success / new-user boost mutation and return the next `{ boostFactor, firstSuccessAt, firstSuccessBoostActive }`. Reuse the cap `Math.min(3, …)` exactly as today. For the cron's "starved new user" rule, accept a `hoursSinceLastMatch` input and reproduce the `hoursSinceLastMatch > 72 && !firstSuccessAt` gate.
2. Refactor `scoring.service.ts` (L126-129) to call this method for the first-success path, and refactor `opportunity-guarantee.cron.ts` (L40-43) to call the same method for the starved-new-user path. Keep `boost-decay.cron.ts` as the decay owner, but have it read the **same constants** (the `Math.min(3, …)` cap and the `firstSuccessAt` threshold) so grow/decay don't fight.
3. Guard idempotency on `firstSuccessAt` / `firstSuccessBoostActive` so concurrent cron + completion runs never over-boost (cap at `Math.min(3, …)` as today). The method must be a pure function of the input profile + ctx so it is trivially idempotent.
4. Add a spec (`boost.service.spec.ts` or extend an existing spec) covering **both** the completion path and the cron path, asserting:
   - identical, idempotent results (running it twice yields the same output),
   - no double boost when both fire for the same profile in the same window,
   - cap never exceeds 3.

**Acceptance:**
- Boost logic has exactly one owner; completion + cron paths produce identical, idempotent results.
- No profile is boosted twice for the same first-success event.
- Existing behaviour preserved (cap `Math.min(3, …)`, first-success is one-time).

---

## P3 — T7: Rename legacy `Tommacay*` services

**Priority:** Low · **Complexity:** Low (mechanical, but 23 references)

**Goal:** Cosmetic consistency — drop the legacy `Tommacay` prefix.

**Renames:**
- `TommacayRankingService` → `RankingService` (file `src/modules/task/market-algoritm/ranking.service.ts` stays).
- `TommacayScoringService` → `ScoringService` (file `src/modules/task/market-algoritm/scoring.service.ts` stays).

**All 23 references (verified via workspace search):**
- `src/modules/task/marketplace-engine/marketplace-engine.module.ts` — imports + `providers` + `exports` (lines ~16, ~18, ~31, ~32, ~53, ~54).
- `src/modules/task/provider-task/provider-task.service.ts` — import + `private readonly rankingService: TommacayRankingService` injection.
- `src/modules/task/task-requester/task-requester.service.ts` — import + `private readonly scoringService: TommacayScoringService` injection.
- `src/modules/task/admin-task/admin-task.service.ts` — import + `private readonly scoringService: TommacayScoringService` injection.
- `src/modules/task/market-algoritm/ranking.service.spec.ts` — import + `new TommacayRankingService(...)` + `describe('TommacayRankingService — …')`.
- `src/modules/task/market-algoritm/matching-profile.defaults.ts` — comment line 8 (`between ValidationEngine.ensureProfile and TommacayScoringService upsert`).
- `src/modules/admin/admin-website-status/admin-website-status.service.ts` — comment (`TommacayRankingService (priority / exposure / boost)`).
- `src/modules/task/market-algoritm/DEVELOPER_GUIDE.md` — multiple references (title, `ranking.service.ts (TommacayRankingService)`, `scoring.service.ts (TommacayScoringService)`, `passed to TommacayRankingService.rankAndFilter(...)`).

**Steps:**
1. Rename the two class declarations in `ranking.service.ts` and `scoring.service.ts`.
2. Update ALL constructor injections, module `providers`/`exports`, and spec references. Use a workspace-wide search for `Tommacay` after editing to confirm zero remaining references in `src/`.
3. Update the comment in `matching-profile.defaults.ts` and `admin-website-status.service.ts`.
4. Update `DEVELOPER_GUIDE.md` (a dev doc, OK to edit — not an audit doc).
5. Run `npm run build` and the affected specs (ranking, validation, task-requester, plus any admin-task spec) to confirm no breakage.

**Acceptance:**
- Zero `Tommacay*` references remain in `src/`.
- Build passes; all specs pass.

---

## P4 — T6: Strict daily spacing (OPTIONAL)

**Priority:** Low · **Complexity:** Low

**Goal:** Add an inter-match minimum-gap check in addition to the existing daily cap, only if strict spacing is required.

**Verified current state:**
- `prisma/schema/marketplace.prisma` → `WebsiteMatchingProfile` has `maxProviderMatchesPerDay Int @default(3)` and `maxRequesterExposurePerDay Int @default(50)`, but **no** `lastApplicationAt` / `minHoursBetweenMatches`.
- Daily cap is enforced in `ranking.service.ts:79-94` (`getDailyProviderWebsiteCounts`) and `validation.engine.ts:577-584` (LEVEL 3 `DAILY_LIMIT`).
- `ValidationEngine.validateTransition` (`src/modules/task/market-algoritm/validation.engine.ts:451`) is the validation gate; there is no spacing check today.
- The provider apply path lives in `src/modules/task/provider-task/provider-task.service.ts` (search for where `validateTransition` is called / an application is accepted — set `lastApplicationAt` there).

**Steps (only if strict spacing is required):**
1. Add to `WebsiteMatchingProfile` in `prisma/schema/marketplace.prisma`:
   ```prisma
   lastApplicationAt DateTime?
   minHoursBetweenMatches Int? @default(0)
   ```
   Create migration `prisma/migrations/20260717XXXXXX_spacing/migration.sql` following the existing naming convention (timestamp slug). Run `npx prisma generate`.
2. In `validateTransition` LEVEL 3 area (around `validation.engine.ts:576-584`), add a spacing check: compare `now - profile.lastApplicationAt` (hours) against `profile.minHoursBetweenMatches` (fallback to a config/0). Push a failed rule (e.g. `'APPLICATION_SPACING'`) when violated.
3. Set `lastApplicationAt = new Date()` on a successful application in the provider-task apply path.
4. Spec: applying again within `minHoursBetweenMatches` is rejected with a **non-leaking** public message (use `getSafeMessage(...)`, never echo internals).

**Acceptance (if implemented):**
- Applications closer than `minHoursBetweenMatches` apart are blocked with a safe message.
- `minHoursBetweenMatches = 0` (default) preserves current behaviour exactly.

---

## P5 — T8: BullMQ queues for bursts (OPTIONAL)

**Priority:** Low · **Complexity:** Low–Medium

**Goal:** Move scoring / opportunity-alert bursts onto the existing BullMQ module for horizontal scaling.

**Verified current state:**
- `src/bullmq/bullmq.module.ts` — global `BullModule.forRootAsync` using `RedisService.getBullMQConnection()`. Already configured.
- `src/bullmq/constants/queue.constants.ts` — `QUEUE_NAMES` = `{ AUTH, MESSAGING, REWARDS, NOTIFICATION }`; job-name consts per queue. No marketplace scoring/alert queues yet.
- `src/modules/task/market-algoritm/scoring.service.ts` — `updateScoresAfterTask` is called synchronously (e.g. from `task-requester.service.ts` and `provider-task.service.ts`).
- `src/modules/task/market-algoritm/opportunity-alert.service.ts` — `alertMatchingProviders(taskId)` fans out inline (L27-101) and is also called from the `@Cron('*/15 * * * *') scanOpenTasks`).
- Marketplace crons in `src/modules/task/marketplace-cron/marketplace-cron.module.ts` process synchronously.

**Steps (optional, only if scaling is needed):**
1. Add queue + job constants to `src/bullmq/constants/queue.constants.ts`:
   ```ts
   export const QUEUE_NAMES = { /* existing */ MARKETPLACE_SCORING: 'marketplace-scoring', OPPORTUNITY_ALERT: 'opportunity-alert' } as const;
   export const MARKETPLACE_SCORING_QUEUE_JOB_NAMES = { UPDATE_AFTER_TASK: 'marketplace-scoring.update-after-task' } as const;
   export const OPPORTUNITY_ALERT_QUEUE_JOB_NAMES = { ALERT_PROVIDERS: 'opportunity-alert.alert-providers' } as const;
   ```
2. Register the two queues in the relevant module (e.g. `marketplace-engine.module.ts` / `marketplace-cron.module.ts` via `BullModule.registerQueue({ name: QUEUE_NAMES.X })`), importing `BullModule` from `@nestjs/bullmq`.
3. Replace direct synchronous calls in the hot paths (`scoring.service.ts` `updateScoresAfterTask`, `opportunity-alert.service.ts` `alertMatchingProviders`) with **queue producers** (`queue.add(JOB, payload)`). Add a **worker consumer** (a `@Processor(QUEUE_NAMES.X)` processor) that calls the existing engine methods — **no logic duplication**.
4. Keep a synchronous fallback for low-volume paths behind a feature flag / config (e.g. `if (useQueue) queue.add(...) else engine.method(...)`).
5. Spec: a queued job results in the same engine side-effects as the synchronous path (assert the worker processor invokes the engine method with the same args).

**Acceptance (if implemented):**
- Burst workloads are enqueued and processed by a BullMQ worker without behaviour change.
- Low-volume path still works synchronously via the fallback flag.

---

## Verification after all prompts
1. `npx tsc --noEmit` → 0 errors.
2. `npm run build` → success.
3. `npx jest --testPathPattern="(ranking|validation\.engine|task-requester|notification|boost)"` → all green.
4. Workspace search for `Tommacay` in `src/` → 0 results.
