# Marketplace Audit — Recommended Tasks (Missing / Partial)

Distilled from `MARKETPLACE-FINAL-AUDIT-REPORT.md` (audit date 2026-07-17). Ordered by priority.

## High Priority (correctness)

- [ ] **T1 — Verify & wire approval recording pipeline** (Section 17/24, complexity: Low)
  - Confirm `DomainInteractionRecorder.record` is invoked when a task is accepted/approved in `task-requester.service.ts`.
  - Confirm `TommacayScoringService.updateScoresAfterTask` + `RiskEngine.processRiskEvent` run on the same approval path.
  - Add an integration test asserting `DomainPairStat` / `DomainInteraction` is written on completion.
  - Evidence: `task-requester.service.ts` approval path; `domain-interaction-recorder.service.ts`; `scoring.service.ts`.

- [ ] **T2 — Add failed/rejected task credit reconciliation** (Section 24, complexity: Low–Medium)
  - Add `handleRejectedTaskCredit(providerWebsiteId, taskId)` and `handleFailedTaskCredit(...)` to `CreditTaskService` (credit-task/credit-task.service.ts).
  - Hook them into the rejected/failed task lifecycle in `provider-task.service.ts` / `task-requester.service.ts`.
  - Persist a `CreditLog` row for each adjustment (auditability).
  - Evidence: `credit-task/credit-task.service.ts` (only `deduct`/`refund`/`reward` found); `DisputeService.applyCreditAdjustment` (dispute.service.ts L371-447) is the only current named credit-adjuster.

## Medium Priority (signal utilization & consistency)

- [ ] **T3 — Consume `behaviourScore` in ranking** (Section 6/30, complexity: Low)
  - Add `behaviourWeight` column + index to `MarketplaceScoringConfig` (prisma migration).
  - Add `behaviourScore * behaviourWeight` term to `TommacayRankingService.rankAndFilter` (ranking.service.ts). Default weight ~0.05.
  - Evidence: `WebsiteMatchingProfile.behaviourScore` (written by `behaviour-pattern.service.ts`) is currently unused in `ranking.service.ts`.

- [ ] **T4 — Consolidate risk mutations into `RiskEngine`** (Section 15/30, complexity: Medium)
  - Refactor `DisputeService.resolveDispute` (dispute.service.ts L285-309) to call `RiskEngine.processRiskEvent` instead of recomputing risk math.
  - Make `RiskEngine` the single writer of `WebsiteMatchingProfile.riskScore` / `RiskEvent`.
  - Evidence: `risk.engine.ts` + `scoring.utils.ts` (calculateRiskScore) vs duplicated math in `dispute.service.ts`.

- [ ] **T5 — Unify boost writers** (Section 20/30, complexity: Medium)
  - Move new-user/neglect boost logic into `LiquidityEngine` or `ScoringService` so `boostFactor` / `firstSuccessAt` is owned by one writer.
  - Update `OpportunityGuaranteeCron` (opportunity-guarantee.cron.ts) and `TommacayScoringService.updateScoresAfterTask` (scoring.service.ts L121-126) to call the shared method.
  - Evidence: boost logic split between scoring.service.ts and opportunity-guarantee.cron.ts.

## Low Priority (optional hardening & cleanup)

- [ ] **T6 — Strict daily spacing (optional)** (Section 13, complexity: Low)
  - If an inter-match minimum gap is required (not just a daily cap), add `lastApplicationAt` / `minHoursBetweenMatches` to `WebsiteMatchingProfile` and a validation check in `validateTransition`.
  - Evidence: current implementation uses `maxProviderMatchesPerDay` cap (ranking.service.ts L78-93) rather than a spacing interval.

- [ ] **T7 — Rename legacy `Tommacay*` services** (Section 30, complexity: Low)
  - Rename `TommacayRankingService` -> `RankingService`, `TommacayScoringService` -> `ScoringService` (mechanical, update references + spec files).
  - Evidence: `ranking.service.ts`, `scoring.service.ts`.

- [ ] **T8 — (Optional) BullMQ queues for bursts** (Section 30, complexity: Low–Medium)
  - Wrap scoring/notification bursts in the already-present BullMQ module for horizontal scaling.
  - Evidence: `src/bullmq/` module exists; currently crons drive processing synchronously.

## Notes
- Items T1, T2, T3 are the minimum to close the only "partial" gaps in a verifiable way.
- T4/T5 are refactors that reduce long-term maintenance risk (no behaviour change intended).
- No new models/tables/enums are required by the specification; all optional DB changes are additive.
