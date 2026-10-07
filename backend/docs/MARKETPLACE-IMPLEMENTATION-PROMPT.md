# Marketplace Audit — Implementation Prompt (T1–T8)

**Project:** backlyst-backend (NestJS / Prisma / PostgreSQL)
**Source:** `MARKETPLACE-FINAL-AUDIT-REPORT.md` (audit 2026-07-17, ~94% implementation)
**Purpose:** A single, self-contained prompt you can paste into a fresh implementation session to complete the remaining partial/refactor items. Each task (T1–T8) is independent and carries all the context it needs (what to change, where, evidence, acceptance criteria).

**Global rules for every task:**
- Do NOT modify audit docs. Do NOT guess — verify against the actual file before editing.
- Preserve existing behaviour unless the task explicitly says to change it.
- Add/adjust Prisma migrations under `prisma/migrations/` following the existing naming convention (e.g. `20260717XXXXXX_<slug>/migration.sql`).
- Run `prisma generate` after schema changes.
- Add or update `*.spec.ts` where indicated.
- Reference files are under `src/modules/task/` unless noted.

---

## T1 — Verify & wire approval recording pipeline
**Priority:** High (correctness) · **Complexity:** Low

**Goal:** Ensure that when a task is accepted/approved, the system (a) records the domain interaction, (b) updates scores, and (c) processes the risk event — exactly once, deterministically.

**Context / Evidence:**
- `DomainInteractionRecorderService.record` (`src/modules/task/market-algoritm/domain-interaction-recorder.service.ts` L31-148) is the single source of truth that writes `DomainInteraction` + `DomainPairStat` (cooldowns, niche keys).
- `TommacayScoringService.updateScoresAfterTask` (`src/modules/task/market-algoritm/scoring.service.ts` L121-126) consumes the first-success boost and recomputes quality metrics.
- `RiskEngine.processRiskEvent` (`src/modules/task/market-algoritm/risk.engine.ts` L9-30) writes `RiskEvent` and updates `WebsiteMatchingProfile.riskScore`.
- Approval/completion path lives in `src/modules/task/task-requester/task-requester.service.ts` (the method that marks a task completed/approved). It was not confirmed that `record` is called there.

**Steps:**
1. Open `task-requester.service.ts` and locate the task-approval/completion method.
2. Verify (and add if missing) a call to `DomainInteractionRecorderService.record({ sourceWebsiteId, targetWebsiteId, sourceDomain, targetDomain, categoryKey, secondaryCategoryKey, completedAt })`.
3. Verify (and add if missing) `TommacayScoringService.updateScoresAfterTask(...)` and `RiskEngine.processRiskEvent({ type: RiskEventType.SUCCESS, ... })` on the same path.
4. Guard against double-recording (idempotency key or status check) so re-entrant calls don't duplicate `DomainInteraction` rows.
5. Add an integration test asserting `DomainPairStat` and `DomainInteraction` are written exactly once on completion.

**Acceptance:**
- Completing a task writes one `DomainInteraction` + updates `DomainPairStat` cooldowns.
- Scoring + risk are updated on the same path.
- No duplicate rows on retry.

---

## T2 — Add failed/rejected task credit reconciliation
**Priority:** High (correctness) · **Complexity:** Low–Medium

**Goal:** Make credit handling deterministic for failed AND rejected tasks via explicit named methods.

**Context / Evidence:**
- `CreditTaskService` (`src/modules/task/credit-task/credit-task.service.ts`) currently exposes `deductTaskCredit`, `refundTaskCredit`, `rewardProviderCredit`, `addEarnedTaskCredit`. No `handleRejectedTaskCredit` / `handleFailedTaskCredit` found.
- Cancel-by-provider refund path exists in `provider-task.service.ts` (respond-cancel-request).
- Dispute credit adjustment is the only other named adjuster: `DisputeService.applyCreditAdjustment` (`src/modules/task/dispute/dispute.service.ts` L371-447) linked to `Dispute.creditAdjustmentId`.
- `CreditLog` model exists; `WebsiteCreditWallet` exists.

**Steps:**
1. Add `handleRejectedTaskCredit(providerWebsiteId, taskId, amount?)` and `handleFailedTaskCredit(providerWebsiteId, taskId, amount?)` to `CreditTaskService`. Each should refund/adjust the requester where appropriate and write a `CreditLog` with a reason discriminator (e.g. `REJECTED_TASK`, `FAILED_TASK`).
2. Identify the rejected-task and failed-task terminal states in `task-requester.service.ts` / `provider-task.service.ts` and call the new methods from those transitions.
3. Keep the existing cancel-refund path; do not break it.
4. Add a spec asserting a `CreditLog` row is created for each rejected/failed terminal transition.

**Acceptance:**
- Rejected and failed tasks each produce a deterministic credit adjustment + `CreditLog`.
- No double refunds; existing cancel path unchanged.

---

## T3 — Consume `behaviourScore` in ranking
**Priority:** Medium · **Complexity:** Low

**Goal:** Use the already-computed `behaviourScore` as a ranking signal.

**Context / Evidence:**
- `WebsiteMatchingProfile.behaviourScore` is written by `BehaviourPatternService` (`behaviour-pattern.service.ts`) but is NOT used in `TommacayRankingService.rankAndFilter` (`ranking.service.ts` L16-194).
- `MarketplaceScoringConfig` holds the other weights (visibilityWeight, compatibilityWeight, etc.) — see `marketplace-config.service.ts` / `prisma/schema/marketplace.prisma`.

**Steps:**
1. Add `behaviourWeight Float @default(0.05)` (indexed) to `MarketplaceScoringConfig` in `marketplace.prisma`; create a migration.
2. In `ranking.service.ts`, read `behaviourScore` from the candidate's `WebsiteMatchingProfile` and add `behaviourScore * behaviourWeight` to the weighted score (before exposure/risk penalties).
3. Merge the new weight in `MarketplaceConfigService.getMergedConfig` if weights are assembled there.
4. Add/adjust a spec to confirm behaviourScore influences the final rank.

**Acceptance:**
- Higher `behaviourScore` yields a higher final rank, scaled by `behaviourWeight`.
- Default weight is small (0.05) so existing ordering is only mildly affected.

---

## T4 — Consolidate risk mutations into `RiskEngine`
**Priority:** Medium · **Complexity:** Medium

**Goal:** Make `RiskEngine` the single writer of `riskScore` / `RiskEvent` (remove duplicated math in disputes).

**Context / Evidence:**
- `RiskEngine.processRiskEvent` (`risk.engine.ts`) uses `calculateRiskScore` (`src/modules/task/market-algoritm/scoring.utils.ts` L58-80) — time-decayed risk with deltas `RISK_DISPUTE_DELTA 25`, `REJECTION 15`, `FAILURE 10`, `ABUSE 40`, `SUCCESS -8`; `RISK_DECAY_PER_DAY 1.5`; max 90 days.
- `DisputeService.resolveDispute` (`dispute.service.ts` L285-309) recomputes risk inline instead of calling `RiskEngine`.

**Steps:**
1. In `dispute.service.ts`, replace the inline risk recomputation with `RiskEngine.processRiskEvent({ type: RiskEventType.DISPUTE /* or as mapped */, websiteId, delta, ... })`.
2. Ensure `RiskEngine` exposes the needed event types (add an enum value if missing).
3. Keep `GraduatedPenaltyService` escalation but route its risk effect through `RiskEngine` too.
4. Add a spec asserting dispute resolution produces the same `riskScore` delta as the prior logic.

**Acceptance:**
- Risk math lives only in `RiskEngine` / `scoring.utils.ts`.
- Dispute resolution still produces identical risk outcomes (verified by spec).

---

## T5 — Unify boost writers
**Priority:** Medium · **Complexity:** Medium

**Goal:** Single owner for `boostFactor` / `firstSuccessAt` (currently split between scoring service and cron).

**Context / Evidence:**
- `TommacayScoringService.updateScoresAfterTask` (`scoring.service.ts` L121-126) consumes `firstSuccessBoostActive` on task completion.
- `OpportunityGuaranteeCron` (`opportunity-guarantee.cron.ts`, `@Cron('0 2 * * *')`) raises boost for neglected new users (`hoursSinceLastMatch > 72 && !firstSuccessAt`).
- Both write `WebsiteMatchingProfile.boostFactor` / `firstSuccessAt`.

**Steps:**
1. Create one private/shared method (e.g. in `LiquidityEngine` or `ScoringService`) `applyNewUserBoost(profile, ctx)` that encapsulates all boost mutations.
2. Refactor `scoring.service.ts` completion path and `opportunity-guarantee.cron.ts` to call that single method.
3. Ensure idempotency (e.g. guard on `firstSuccessAt` / `firstSuccessBoostActive`) so concurrent runs don't over-boost.
4. Add a spec covering both the completion path and the cron path.

**Acceptance:**
- Boost logic has one owner; completion + cron paths produce identical, idempotent results.

---

## T6 — Strict daily spacing (optional)
**Priority:** Low · **Complexity:** Low

**Goal:** Add an inter-match minimum-gap check if the spec requires spacing (not just a daily cap).

**Context / Evidence:**
- Current implementation uses a daily cap: `maxProviderMatchesPerDay` enforced via `getDailyProviderWebsiteCounts` (`ranking.service.ts` L78-93, L270-292).
- `ValidationEngine.validateTransition` (`validation.engine.ts` L451-729) is the validation gate.

**Steps (only if strict spacing is required):**
1. Add `lastApplicationAt DateTime?` and `minHoursBetweenMatches Int? @default(0)` to `WebsiteMatchingProfile` (`marketplace.prisma`); migration.
2. In `validateTransition`, add a spacing check (LEVEL 3 area) comparing `now - lastApplicationAt` against `minHoursBetweenMatches`.
3. Set `lastApplicationAt` on a successful application.
4. Spec: applying again within the window is rejected with a safe message.

**Acceptance (if implemented):**
- Applications closer than `minHoursBetweenMatches` apart are blocked with a non-leaking message.

---

## T7 — Rename legacy `Tommacay*` services
**Priority:** Low · **Complexity:** Low

**Goal:** Cosmetic consistency — drop the legacy `Tommacay` prefix.

**Context / Evidence:**
- `TommacayRankingService` (`ranking.service.ts`), `TommacayScoringService` (`scoring.service.ts`).
- Injected across `provider-task.service.ts`, `task-requester.service.ts`, `marketplace-engine.module.ts`.

**Steps:**
1. Rename classes + files: `TommacayRankingService` → `RankingService`, `TommacayScoringService` → `ScoringService`.
2. Update all constructor injections, module providers, and spec references.
3. Run build + existing specs to confirm no breakage.

**Acceptance:**
- No `Tommacay*` references remain; all specs pass.

---

## T8 — (Optional) BullMQ queues for bursts
**Priority:** Low · **Complexity:** Low–Medium

**Goal:** Move scoring/notification bursts onto the existing BullMQ module for horizontal scaling.

**Context / Evidence:**
- `src/bullmq/` module exists (`bullmq.module.ts`, `bullmq.worker.bootstrap.ts`, `constants/`).
- Currently crons (`marketplace-cron.module.ts`) process synchronously.

**Steps (optional, only if scaling is needed):**
1. Define a queue + job type for scoring updates and for opportunity-alert fan-out.
2. Replace direct synchronous calls in `scoring.service.ts` / `opportunity-alert.service.ts` hot paths with queue producers; add a worker consumer that calls the existing engine methods.
3. Keep a synchronous fallback for low-volume paths.
4. Spec: a queued job results in the same engine side-effects.

**Acceptance (if implemented):**
- Burst workloads are enqueued and processed by a BullMQ worker without behaviour change.

---

## Suggested execution order
1. T1 (correctness) → 2. T2 (correctness) → 3. T3 (signal) → 4. T4 (refactor) → 5. T5 (refactor) → 6. T6 (optional) → 7. T7 (cosmetic) → 8. T8 (optional scaling).

Each task above is self-contained: copy the relevant `## Tn` block into a new session and implement it.
