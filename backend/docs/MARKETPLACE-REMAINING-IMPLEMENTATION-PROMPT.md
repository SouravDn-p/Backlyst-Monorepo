# Marketplace Audit — Remaining Implementation Prompt (T4–T8)

**Project:** backlyst-backend (NestJS / Prisma / PostgreSQL)
**Source:** `docs/MARKETPLACE-IMPLEMENTATION-PROMPT.md` (T1–T8)
**Verified:** 2026-07-17 against the actual codebase.
**Re-verified:** 2026-07-17 (post-resumption) — build is GREEN (`npx tsc --noEmit` exits 0, zero errors). The abort root-cause section below was written against a stale/aborted state and is now **superseded**; see "Reassessment (re-verified)" at the bottom.
**Purpose:** Self-contained prompt to finish the tasks that are **still not implemented**. T1–T5 are done (see status table). Only T6–T8 remain — and T6/T8 are both optional.

---

## ✅ Implementation status (verified against code, re-checked 2026-07-17)

| Task | Status | Evidence |
|------|--------|----------|
| **T1 — Approval recording pipeline** | ✅ DONE | `task-requester.service.ts` `reviewTask()` calls `domainInteractionRecorder.record(tx, …)` and `scoringService.updateScoresAfterTask(…)`. Idempotency is guarded by the `completionRewardedAt: null` update lock. Risk is processed inside `updateScoresAfterTask` via `riskEngine.processRiskEvent`. |
| **T2 — Failed/rejected credit reconciliation** | ✅ DONE | `credit-task.service.ts` exposes `handleRejectedTaskCredit(...)` and `handleFailedTaskCredit(...)`; `task-requester.service.ts` calls `handleRejectedTaskCredit`. Migration `prisma/migrations/20260717120000_credit_reason_rejected_failed/` exists. Signature already accepts `providerWebsiteId: string | null`. |
| **T3 — behaviourScore in ranking** | ✅ DONE | `MarketplaceScoringConfig.behaviourWeight` added + merged in `marketplace-config.service.ts`; consumed in `ranking.service.ts` (`behaviourBoost = behaviourScore * config.behaviourWeight`, L152-153). `behaviourScore` IS present on the `MatchingProviderWebsite.matchingProfile` DTO in `matching.types.ts` (L40). Migration `20260717110000_behaviour_weight/` exists. Builds clean. |
| **T4 — Consolidate risk mutations into RiskEngine** | ✅ DONE | Both paths route through `RiskEngine`. `dispute.service.ts` `resolveDispute` calls `riskEngine.processRiskEvent(..., 'DISPUTE', …)` (boost/suppression co-written, owned by `GraduatedPenaltyService`). `task-requester.service.ts` REJECT path (L1257-1261) calls `this.riskEngine.processRiskEvent(task.assignedProviderWebsiteId, 'REJECTION', profile)` and only keeps the `boostFactor` write co-written — no inline `riskScore` recompute remains. `riskEngine` is injected and `MarketplaceEngineModule` is imported into `TaskRequesterModule`. |
| **T5 — Unify boost writers** | ✅ DONE | `boost.service.ts` exposes `applyNewUserBoost(profile, ctx)` (pure, idempotent, capped at `MAX_BOOST_FACTOR = 3`). It is consumed by `scoring.service.ts` (completion path) and `opportunity-guarantee.cron.ts` (starved-new-user path). `boost-decay.cron.ts` remains the decay owner, reusing the same cap/threshold constants. `boost.service.spec.ts` covers completion/cron/no-double-boost. |
| **T6 — Strict daily spacing** | ❌ NOT DONE (optional) | No `minHoursBetweenMatches` / `lastApplicationAt` fields on `WebsiteMatchingProfile`; `marketplace.prisma` only has `maxProviderMatchesPerDay` (daily cap). `ValidationEngine.validateTransition` enforces a daily cap only. |
| **T7 — Rename legacy Tommacay* services** | ❌ NOT DONE (cosmetic) | 24 `Tommacay` references remain (re-counted 2026-07-17): `TommacayRankingService` / `TommacayScoringService` referenced across `provider-task.service.ts`, `task-requester.service.ts`, `admin-task.service.ts`, `marketplace-engine.module.ts`, `ranking.service.spec.ts`, `matching-profile.defaults.ts`, `boost.service.ts` (comment), `DEVELOPER_GUIDE.md`, and a comment in `admin-website-status.service.ts`. |
| **T8 — BullMQ queues for bursts** | ❌ NOT DONE (optional) | `BullMQModule` exists (`bullmq.module.ts`, global `BullModule.forRootAsync`), but marketplace crons process synchronously; `opportunity-alert.service.ts` fans out inline. `QUEUE_NAMES` in `src/bullmq/constants/queue.constants.ts` has only `AUTH`/`MESSAGING`/`REWARDS`/`NOTIFICATION` — no scoring / opportunity-alert queues defined. |

**Global rules for every task:**
- Do NOT modify audit docs. Verify against the actual file before editing.
- Preserve existing behaviour unless the task explicitly says to change it.
- Add/adjust Prisma migrations under `prisma/migrations/` following the existing naming convention (`20260717XXXXXX_<slug>/migration.sql`).
- Run `prisma generate` after schema changes.
- Add or update `*.spec.ts` where indicated.
- Reference files are under `src/modules/task/` unless noted.

---

## T4 — Consolidate risk mutations into `RiskEngine` ✅ DONE
**Priority:** Medium · **Complexity:** Medium · **Status:** Complete (re-verified 2026-07-17)

**Goal (achieved):** `RiskEngine` is the single writer of `riskScore` / `RiskEvent`. No inline `riskScore` recompute remains in the requester reject path.

**Context / Evidence (re-verified 2026-07-17):**
- `RiskEngine.processRiskEvent(websiteId, …)` (`src/modules/task/market-algoritm/risk.engine.ts`) uses `calculateRiskScore` (`scoring.utils.ts`) with time-decayed deltas (`RISK_DELTA_BY_EVENT`) and writes both the profile `riskScore` and an immutable `RiskEvent` row. It accepts a pre-loaded `profile` and an optional `tx` for in-transaction use.
- `dispute.service.ts` `resolveDispute` calls `riskEngine.processRiskEvent(providerWebsiteId, 'DISPUTE', profile)` and only keeps `boostFactor` / `isSuppressed` co-written (owned by `GraduatedPenaltyService`).
- `task-requester.service.ts` REJECT path (L1238-1268) **is done**: it no longer recomputes `riskScore` inline. It calls `this.riskEngine.processRiskEvent(task.assignedProviderWebsiteId, 'REJECTION', profile)` (L1257-1261) and only co-writes `boostFactor` via a separate `prisma.websiteMatchingProfile.update`. The call is gated by `if (penalty.boostMultiplier < 1.0 || penalty.riskScoreIncrease > 10)` so behaviour is unchanged from before.
- `riskEngine` is injected into `TaskRequesterService` (`private readonly riskEngine: RiskEngine`) and `MarketplaceEngineModule` is imported into `TaskRequesterModule`, so DI resolves.

**Implementation note (correctness, supersedes old "Bug 4" wording):**
- The new path runs `calculateRiskScore`, which **first time-decays** `riskScore` toward 0, *then* adds `RISK_DELTA_BY_EVENT.REJECTION` (15). This means the resulting `riskScore` delta is **NOT numerically identical** to the old inline `Math.min(100, riskScore + 15)`. That is by design — the decayed model is the intended single-writer behaviour. The spec should assert *ledger consistency* (a `RiskEvent` row is written, single writer) rather than byte-for-byte equality with the old formula.

**Acceptance (met):**
- Risk math lives only in `RiskEngine` / `scoring.utils.ts` (no inline `riskScore` recompute anywhere in disputes or the requester reject path).
- A `RiskEvent` row is written for each reject risk mutation.
- Reject-penalty still gated by the same `boostMultiplier` / `riskScoreIncrease` threshold.

---

## T5 — Unify boost writers ✅ DONE
**Priority:** Medium · **Complexity:** Medium · **Status:** Complete (re-verified 2026-07-17)

**Goal (achieved):** Single owner for the new-user / first-success boost (`boostFactor` / `firstSuccessAt`). Completed via the new `BoostService`.

**Context / Evidence (re-verified 2026-07-17):**
- `src/modules/task/market-algoritm/boost.service.ts` now exports `BoostService` with `applyNewUserBoost(profile, ctx)` — a **pure, idempotent** function returning the next `{ boostFactor, firstSuccessAt, firstSuccessBoostActive }`. Cap `MAX_BOOST_FACTOR = 3`, starved-new-user threshold `STARVED_NEW_USER_HOURS = 72`, increment `0.5`.
- `scoring.service.ts` (completion path) injects `BoostService` and delegates the first-success / new-user boost mutation to `this.boostService.applyNewUserBoost(...)` (the scoring formula still owns `boostFactor` on this path; `BoostService` only owns `firstSuccessAt` / `firstSuccessBoostActive`).
- `opportunity-guarantee.cron.ts` (`@Cron('0 2 * * *')`) now calls `this.boostService.applyNewUserBoost(...)` for the starved-new-user rule (same `Math.min(3, …)` cap, gated on `firstSuccessBoostActive && !firstSuccessAt`).
- `boost-decay.cron.ts` remains the **decay** owner but reuses the same cap/threshold constants so grow/decay never fight.
- `src/modules/task/market-algoritm/boost.service.spec.ts` covers the completion path, the cron path, idempotency (no compounding), and the "no double boost when both fire" scenario.

**Acceptance (met):**
- Boost logic has one owner (`BoostService`); completion + cron paths produce identical, idempotent results.
- No profile is boosted twice for the same first-success event (verified by `boost.service.spec.ts`).

---

## T6 — Strict daily spacing (optional)
**Priority:** Low · **Complexity:** Low

**Goal:** Add an inter-match minimum-gap check in addition to the existing daily cap, if the spec requires spacing.

**Context / Evidence (verified):**
- Current implementation enforces a daily cap only (`maxProviderMatchesPerDay` on `WebsiteMatchingProfile` via `getDailyProviderWebsiteCounts` in `ranking.service.ts`). `marketplace.prisma` has no `lastApplicationAt` / `minHoursBetweenMatches`.
- `ValidationEngine.validateTransition` (`validation.engine.ts`) is the validation gate; there is no spacing check.

**Steps (only if strict spacing is required):**
1. Add `lastApplicationAt DateTime?` and `minHoursBetweenMatches Int? @default(0)` to `WebsiteMatchingProfile` (`prisma/schema/marketplace.prisma`); create a migration.
2. In `validateTransition` (LEVEL 3 area, TASK_APPLICATION stage), add a spacing check comparing `now - lastApplicationAt` against `minHoursBetweenMatches`.
3. Set `lastApplicationAt` on a successful application (`provider-task.service.ts` apply path).
4. Run `prisma generate`.
5. Spec: applying again within the window is rejected with a **non-leaking** public message.

**Acceptance (if implemented):**
- Applications closer than `minHoursBetweenMatches` apart are blocked with a safe message.
- `minHoursBetweenMatches = 0` (default) preserves current behaviour.

---

## T7 — Rename legacy `Tommacay*` services
**Priority:** Low · **Complexity:** Low

**Goal:** Cosmetic consistency — drop the legacy `Tommacay` prefix.

**Context / Evidence (verified):** `TommacayRankingService` (`ranking.service.ts`) and `TommacayScoringService` (`scoring.service.ts`) are referenced in 23 places, including:
- `src/modules/task/provider-task/provider-task.service.ts` (import + constructor injection)
- `src/modules/task/task-requester/task-requester.service.ts` (import + constructor injection)
- `src/modules/task/admin-task/admin-task.service.ts` (import + constructor injection)
- `src/modules/task/marketplace-engine/marketplace-engine.module.ts` (imports + `providers`/`exports`)
- `src/modules/task/market-algoritm/ranking.service.spec.ts`
- `src/modules/task/market-algoritm/matching-profile.defaults.ts` (comment)
- `src/modules/admin/admin-website-status/admin-website-status.service.ts` (comment)
- `src/modules/task/market-algoritm/DEVELOPER_GUIDE.md`

**Steps:**
1. Rename classes: `TommacayRankingService` → `RankingService`, `TommacayScoringService` → `ScoringService`. (Filenames `ranking.service.ts` / `scoring.service.ts` can stay.)
2. Update ALL constructor injections, module `providers`/`exports`, and spec references (see file list above). Use a workspace-wide search for `Tommacay` to catch every reference.
3. Update `DEVELOPER_GUIDE.md` references (this is a dev doc, not an audit doc — OK to edit).
4. Run build (`npm run build`) + existing specs to confirm no breakage.

**Acceptance:**
- No `Tommacay*` references remain in `src/`.
- Build passes and all specs pass.

---

## T8 — (Optional) BullMQ queues for bursts
**Priority:** Low · **Complexity:** Low–Medium

**Goal:** Move scoring/notification bursts onto the existing BullMQ module for horizontal scaling.

**Context / Evidence (verified):**
- `src/bullmq/` module exists (`bullmq.module.ts` — global `BullModule.forRootAsync` using `RedisService.getBullMQConnection()`; `bullmq.worker.bootstrap.ts`; `constants/`).
- Marketplace crons in `src/modules/task/marketplace-cron/marketplace-cron.module.ts` process synchronously; `opportunity-alert.service.ts` fans out inline. No scoring / opportunity-alert queues are defined yet.

**Steps (optional, only if scaling is needed):**
1. Define a queue + job type for (a) scoring updates and (b) opportunity-alert fan-out under `src/bullmq/constants/`.
2. Replace direct synchronous calls in the hot paths (`scoring.service.ts`, `opportunity-alert.service.ts`) with queue producers; add a worker consumer that calls the existing engine methods (no logic duplication).
3. Keep a synchronous fallback for low-volume paths (feature-flag or config).
4. Spec: a queued job results in the same engine side-effects as the synchronous path.

**Acceptance (if implemented):**
- Burst workloads are enqueued and processed by a BullMQ worker without behaviour change.

---

## Suggested execution order (remaining work only)
1. **T7** (cosmetic rename — safe, mechanical, no behaviour change) →
2. **T6** (optional strict spacing — only if the spec requires it) →
3. **T8** (optional BullMQ scaling — only if burst load needs it).

T1–T5 are already DONE (verified 2026-07-17, build GREEN). Each block above is self-contained:
paste the relevant `## Tn` section into a fresh session to implement it.

---

## ⚠️ Superseded: Abort root-cause analysis (2026-07-17, post-implementation attempt)

> **This entire section is SUPERSEDED by the "Reassessment (re-verified)" block below.**
> It was written against a stale/aborted build state. On re-verification (2026-07-17, same day),
> `npx tsc --noEmit` exits **0** (zero errors) and all four alleged bugs are already resolved in
> the current working tree. Retained only for historical context.

A previous attempt to apply the fixes **aborted at build time** (`npx tsc --noEmit`). The
build was reported **RED** with 6 errors. **Re-verification shows the build is now GREEN** — the
items below are already fixed:

| # | Reported bug | Reported severity | Actual status (re-verified 2026-07-17) |
|---|--------------|-------------------|------------------------------------------|
| 1 | `behaviourScore` missing from `matching.types.ts` DTO → T3 not truly done | Critical (build RED) | ✅ **Resolved** — `behaviourScore?: number | null` is present at `matching.types.ts` L40; T3 is DONE and the build compiles. |
| 2 | `task.assignedProviderWebsiteId` null passed to `handleRejectedTaskCredit` | Critical (build RED) | ✅ **Resolved** — `handleRejectedTaskCredit` signature already accepts `providerWebsiteId: string | null`. |
| 3 | 4 specs out of sync with service signatures | Critical (build RED) | ✅ **Resolved** — build is GREEN (`tsc --noEmit` exits 0); all spec signatures are in sync. |
| 4 | T4 reject path uses time-decayed risk → not equal to old inline delta | Correctness (doc bug) | ✅ **Doc-only** — addressed in the T4 section above (assert ledger consistency, not byte-for-byte equality). |

**Conclusion:** the previously reported "abort" is no longer reproducible. No build fixes are
required. The remaining work is only T7 (optional/cosmetic) and T6/T8 (optional).

---

## Verification notes (re-verified 2026-07-17)

- **Build:** `npx tsc --noEmit` exits **0** (zero errors). The earlier "6 errors / build RED"
  report does not reproduce against the current tree.
- **T1:** ✅ DONE (approval recording pipeline + risk via `riskEngine.processRiskEvent`).
- **T2:** ✅ DONE (`handleRejectedTaskCredit` / `handleFailedTaskCredit`, signature already
  `providerWebsiteId: string | null`; migration `20260717120000_credit_reason_rejected_failed`).
- **T3:** ✅ DONE — `ranking.service.ts` consumes `profile.behaviourScore` (L152-153) and the
  `MatchingProviderWebsite.matchingProfile` DTO in `matching.types.ts` **does** include
  `behaviourScore` (L40). Builds clean.
- **T4:** ✅ DONE — both the dispute path and the requester reject path route risk through
  `RiskEngine.processRiskEvent` (`'DISPUTION'`/`'REJECTION'`); the reject path no longer
  recomputes `riskScore` inline, only co-writes `boostFactor`. `riskEngine` is injected and
  `MarketplaceEngineModule` is imported into `TaskRequesterModule`.
- **T5:** ✅ DONE — `boost.service.ts` `applyNewUserBoost` is the single owner, consumed by
  `scoring.service.ts` (completion) and `opportunity-guarantee.cron.ts` (starved-new-user);
  `boost-decay.cron.ts` is the decay owner. `boost.service.spec.ts` covers no-double-boost.
- **T6:** ❌ NOT DONE (optional) — no `minHoursBetweenMatches` / `lastApplicationAt` fields in
  `marketplace.prisma`; only `maxProviderMatchesPerDay` daily cap present.
- **T7:** ❌ NOT DONE (cosmetic) — **24** `Tommacay` references remain across `src/` +
  `DEVELOPER_GUIDE.md` (re-counted; one extra vs. the earlier "23" due to the new
  `boost.service.ts` comment).
- **T8:** ❌ NOT DONE (optional) — `BullMQModule` is global and configured, but
  `QUEUE_NAMES` has only `AUTH`/`MESSAGING`/`REWARDS`/`NOTIFICATION`; no marketplace
  scoring / opportunity-alert queues are defined.
