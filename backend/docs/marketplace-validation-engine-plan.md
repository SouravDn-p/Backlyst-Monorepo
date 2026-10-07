# Implementation Plan — Centralize & Re-Validate Marketplace Constraints

**Source task:** #1 in `docs/marketplace-remaining-tasks.md` (Complexity: Medium)
**Spec module:** Marketplace Validation Engine — Mandatory Marketplace Governance Layer
**Audit reference:** `docs/marketplace-technical-audit-report.md` §17 (Validation Engine — Needs Refactor)

> Every claim below is grounded in the current source. File:line references point to the code as audited on 2026-07-15.

---

## A. Current State (verified from code)

| Spec stage | Status | Evidence |
|---|---|---|
| 1. Candidate generation | Present | `src/modules/task/market-algoritm/matching.engine.ts:20` calls `validationEngine.isUserActive`, `getEligibleProviderWebsiteRows`, `getEligibleMarketplaceWebsiteIds` |
| 2. Opportunity presentation | Present (inherits Stage 1) | `src/modules/task/market-algoritm/ranking.service.ts:20` filters suppressed + daily cap |
| 3. Provider application | Partial | `src/modules/task/provider-task/provider-task.service.ts:316-347` calls `isWebsiteEligible` + `isMarketplaceWebsiteEligible` + `canMatch`. **Missing:** weekly limits, tier, velocity, risk aggregation |
| 4. Task acceptance (`selectProvider`) | **Missing** | `src/modules/task/task-requester/task-requester.service.ts:645` checks only `requesterId`, `lifecycleStatus`, application `APPLIED` — no eligibility/cooldown/risk re-validation before assignment |
| 5. Interaction approval (`reviewTask` APPROVE) | **Missing** | `src/modules/task/task-requester/task-requester.service.ts:975` checks only `requesterId`, `submissionStatus`, `selectedProviderId` — no full re-validation before credit/reward/domain-interaction writes |

**Reusable building blocks (keep):** `src/modules/task/market-algoritm/validation.engine.ts`
- `isUserActive` (`:73`), `isMarketplaceWebsiteEligible` (`:81`), `isWebsiteEligible` (`:90`)
- `getEligibleMarketplaceWebsiteIds` (`:103`), `getEligibleProviderWebsites` (`:120`)
- `getCooldownBlockedPairKeys` (`:146`), `canMatch` (`:207`), `isWebsiteRowMarketplaceEligible` (`:239`)
- Hardcoded cooldowns: `repeatPairCooldownDays = 90`, `reciprocalCooldownDays = 120` (`:11-12`)

**Current weaknesses to fix:**
1. Missing-profile bypass — `isWebsiteRowMarketplaceEligible` only runs status/risk/suppression checks *inside* `if (website.matchingProfile)`; a site with no profile skips them.
2. Cooldowns are hardcoded constants.
3. No `validateTransition` API — callers reimplement pieces ad hoc.
4. No standardized response object (`APPROVED` / `APPROVED_WITH_RESTRICTIONS` / `REJECTED`).
5. No validation audit log (spec §11).
6. No admin-override hook (spec §9); `MarketplaceOverride` model exists but has 0 runtime consumers.

---

## B. Target Design

### B1. Unified validation result type (new file)
`src/modules/task/market-algoritm/validation-result.ts`
```ts
export type ValidationStage =
  | 'CANDIDATE_GENERATION' | 'OPPORTUNITY_PRESENTATION'
  | 'PROVIDER_APPLICATION' | 'TASK_ACCEPTANCE'
  | 'INTERACTION_APPROVAL' | 'ADMIN_FORCE';

export type ValidationDecision = 'APPROVED' | 'APPROVED_WITH_RESTRICTIONS' | 'REJECTED';

export interface ValidationResult {
  decision: ValidationDecision;
  stage: ValidationStage;
  failedRules: string[];      // internal only — never sent to client
  restrictions: string[];     // e.g. LOW_VISIBILITY, LOW_PRIORITY
  overrideApplied: boolean;
  publicMessage: string;      // safe message per spec §13
}
```
**Safe messages (spec §13):** cooldown/limit failures → "This opportunity is currently unavailable." / "No suitable opportunities are currently available." Never expose raw rule names to users.

### B2. Constraint levels (spec §7) — evaluated in order inside `validateTransition`
1. **Eligibility** — user active, website owned + verified + eligible, ownership valid.
2. **Governance** — cooldown filter (`getCooldownBlockedPairKeys` / `canMatch`), reciprocal, repeat-pair. *(Use configurable windows — see B4.)*
3. **Capacity** — weekly limits, velocity, tier limits. *(New counters; for this task read `matchCount7d` / `applicationCount7d` and subscription `monthlyTaskCredits`.)*
4. **Behaviour** — risk (`riskScore >= 75` reject), pattern/network concentration. *(Risk score currently never written — gate on existing threshold; full RiskEngine is a later task.)*
5. **Optimization** — visibility/quality/new-user boosts are *non-blocking* → emit `APPROVED_WITH_RESTRICTIONS`.

Only interactions passing every required level may proceed.

### B3. Core API (extend `validation.engine.ts`)
```ts
validateTransition(input: {
  stage: ValidationStage;
  actorUserId: string;
  providerWebsiteId?: string;
  requesterWebsiteId?: string;
  taskId?: string;
  providerDomain?: string;
  requesterDomain?: string;
  adminOverride?: { adminId: string; type: OverrideType; reasonCode: string };
}): Promise<ValidationResult>
```
- If `adminOverride` present and permitted: skip **only** the overridden rule. Never bypass eligibility/ownership/security (spec §9). Set `overrideApplied = true` and write `MarketplaceOverrideAudit`.
- After decision: call new `logValidation(...)` → `MarketplaceValidationLog` (new model, spec §11): userId, websiteId, taskId, stage, decision, failedRule, marketplaceMode, override status, timestamp.
- Auto-create `WebsiteMatchingProfile` when missing so status/risk/suppression checks always run (closes the missing-profile bypass).

### B4. Configurable cooldowns (prereq for spec §9 admin override & Task #3)
- Add `repeatPairCooldownDays` / `reciprocalCooldownDays` to `MarketplaceScoringConfig` (extend existing rather than add a second config loader).
- `ValidationEngine` reads from config, falling back to current 90/120 constants.

---

## C. Integration Points (the re-validation fixes)

| Location | Change |
|---|---|
| `matching.engine.ts:20` (`findCandidates`) | Already calls engine; route candidate eligibility through `validateTransition({stage:'CANDIDATE_GENERATION'})` for uniform logging. |
| `provider-task.service.ts:316` (`applyToTask`) | Replace inline `isWebsiteEligible` / `isMarketplaceWebsiteEligible` / `canMatch` with a single `validateTransition({stage:'PROVIDER_APPLICATION', ...})`; reject on `REJECTED` with safe message. Keep Moz DR check (separate, non-marketplace rule). |
| `task-requester.service.ts:645` (`selectProvider`) | **BEFORE** the `tx` assignment block, call `validateTransition({stage:'TASK_ACCEPTANCE', providerWebsiteId, requesterWebsiteId, taskId})`. Abort selection if `REJECTED`. This is the critical missing Stage 4. |
| `task-requester.service.ts:975` (`reviewTask` APPROVE path) | **BEFORE** credit/reward + `recordApprovedDomainInteraction`, call `validateTransition({stage:'INTERACTION_APPROVAL', ...})`. Abort if `REJECTED`. Critical missing Stage 5. |
| `admin-task.service.ts` (forceApprove, resolveDispute approve, admin complete) | Route through `validateTransition({stage:'ADMIN_FORCE', adminOverride})` so admin assignments are logged and still enforce eligibility/ownership/security. |
| Future entry points (cron fallback, new features) | All must call `validateTransition`; no service reimplements constraint checks. |

---

## D. Schema Changes (minimal)

1. **`MarketplaceValidationLog`** (new model, `prisma/schema/marketplace.prisma`): id, userId, websiteId?, taskId?, stage, decision, failedRule?, marketplaceMode?, overrideApplied Boolean, createdAt. Indexes: `[userId, createdAt]`, `[taskId, createdAt]`, `[stage]`.
2. **`MarketplaceScoringConfig`** extension: add `repeatPairCooldownDays Int @default(90)`, `reciprocalCooldownDays Int @default(120)`. Seed defaults.
3. **`MarketplaceOverrideAudit`** (new model): id, overrideId?, adminId, websiteId?, taskId?, rule, action (APPLIED/SKIPPED), reasonCode, createdAt. *(Depends on `MarketplaceOverride`, which already exists in schema; this task begins wiring it — currently 0 runtime consumers.)*
4. New migration generated from the above.

---

## E. Files to Create / Modify

**Create:**
- `src/modules/task/market-algoritm/validation-result.ts` (types + safe-message map)
- Prisma models + migration (above)

**Modify:**
- `src/modules/task/market-algoritm/validation.engine.ts` — add `validateTransition`, `logValidation`, config-driven cooldowns, auto-create profile.
- `src/modules/task/provider-task/provider-task.service.ts` — wrap apply path in `validateTransition`.
- `src/modules/task/task-requester/task-requester.service.ts` — add Stage 4 (`selectProvider`) + Stage 5 (`reviewTask` approve) re-validation.
- `src/modules/task/admin-task/admin-task.service.ts` — route force/complete paths through `validateTransition` with override.
- `src/modules/task/market-algoritm/matching.engine.ts` — uniform logging via engine.

---

## F. Implementation Order (steps)

1. Add `validation-result.ts` (types + public-message map).
2. Extend `MarketplaceScoringConfig` with cooldown fields + migration + seed default.
3. Implement `validateTransition` with the 5 levels + admin-override hook + auto-create profile + `logValidation`.
4. Add `MarketplaceValidationLog` + `MarketplaceOverrideAudit` models + migration.
5. Wire `provider-task.service.ts` apply path.
6. Wire `selectProvider` (Stage 4) + `reviewTask` approve (Stage 5) — the two missing re-validations.
7. Wire admin force/complete paths with override.
8. Add unit tests: each level, override cannot bypass eligibility/ownership/security, safe-message mapping, missing-profile auto-create.

---

## G. Acceptance Criteria (maps to spec §15)

- Every marketplace interaction (auto/match, manual, opportunity, apply, accept, admin-assign, fallback) passes the same `validateTransition`.
- Stages 4 & 5 now re-validate; a task valid at apply but cooled-down/expired at approval is rejected.
- No controller/service independently reimplements cooldown/eligibility/risk checks.
- Admin overrides are permission-controlled, timestamped, audited, and cannot bypass auth/ownership/security.
- Validation failures return standardized `APPROVED` / `APPROVED_WITH_RESTRICTIONS` / `REJECTED` with safe public messages.
- Every validation request is logged with stage/result/failed-rule/mode/override status.

---

## H. Notes / Dependencies

- This task does **not** build VelocityEngine/TierEngine/RiskEngine (later tasks) — it consumes their *data* where available and gates on existing thresholds (`riskScore >= 75`, subscription `monthlyTaskCredits`) so it stands alone. When those engines land, extend Level 3/4 inside `validateTransition` without touching call sites.
- Configurable cooldowns started here also satisfy Task #3 (Make cooldown/rule windows admin-configurable) — implement them together.
- No production code is modified by this document; it is a planning artifact.
