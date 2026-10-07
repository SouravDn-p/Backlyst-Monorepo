# Marketplace Gap-Closure — Implementation Prompts

> **Purpose:** Each prompt below is fully self-contained and can be pasted into a fresh
> coding-agent session. Every prompt includes the exact current code context it depends on
> (verified from the codebase on 2026-07-16) plus precise acceptance criteria.
>
> **Repo:** `backlyst-backend` (NestJS 11 + Prisma 5.22). Root module dir: `src/modules`.
> Marketplace engines live in `src/modules/task/market-algoritm/`.
>
> **Conventions to follow in every task:**
> - Inject `PrismaService` (`src/prisma/prisma.service`) for DB access.
> - Use `@Injectable()` services; never talk to Prisma from controllers.
> - Use `sendResponse(message, data)` from `src/utils/sendResponse` for controller returns.
> - Admin endpoints use `@AdminGuard()` from `src/common/guards/auth/admin.guard`.
> - After schema changes run `npx prisma generate` and create a migration.
> - Do NOT bypass eligibility/ownership/security rules (per `ValidationEngine`).
>
> **Run order (priority):** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10.

---

## T1 — Persist RiskEvent audit log (spec §15)
**Complexity:** Low

### Context (current code)
File `src/modules/task/market-algoritm/scoring.service.ts` computes risk but never writes the
`RiskEvent` model. The model already exists in `prisma/schema/marketplace.prisma:407`:

```prisma
model RiskEvent {
  id             String       @id @default(cuid())
  websiteId      String
  type           RiskEventType
  delta          Float
  riskScoreAfter Float
  createdAt      DateTime     @default(now())
  @@index([websiteId, createdAt])
  @@index([type])
}
```

The scoring call site (`scoring.service.ts:84-93`):
```ts
const riskEvent: RiskEventType =
  riskEventType ?? (wasSuccessful ? 'SUCCESS' : 'FAILURE');
const risk = calculateRiskScore(
  profile.riskScore,
  profile.lastRiskEventAt,
  riskEvent,
);
```
`RiskEventType` is exported from `scoring.utils.ts`:
`export type RiskEventType = 'DISPUTE' | 'REJECTION' | 'FAILURE' | 'ABUSE' | 'SUCCESS';`
Delta constants live in `SCORING_CONSTANTS` (`scoring.utils.ts:19-23`):
`RISK_DISPUTE_DELTA:25, RISK_REJECTION_DELTA:15, RISK_FAILURE_DELTA:10, RISK_ABUSE_DELTA:40, RISK_SUCCESS_DELTA:8`.

### Task
Inside `updateScoresAfterTask`, immediately after computing `risk`, create a `RiskEvent` row
(use `this.prisma.riskEvent.create`) with `websiteId`, `type: riskEvent`, `delta` = the signed
delta for that event (negative for SUCCESS, positive otherwise — reuse `RISK_DELTA_BY_EVENT`
from `scoring.utils.ts`), and `riskScoreAfter: risk.riskScore`. Wrap in `.catch(() => {})` so it
never blocks scoring. Keep `calculateRiskScore` unchanged.

### Acceptance
- `prisma.riskEvent.create` is called for every `updateScoresAfterTask` invocation.
- No change to existing score math or return value. `npm run build` passes.

---

## T2 — Emit PROVIDER_NEW_OPPORTUNITY notification from matching (spec §26)
**Complexity:** Low

### Context (current code)
Matching entry point: `src/modules/task/provider-task/provider-task.service.ts:121`
`getProviderOpportunities` calls `matchingEngine.findCandidates` → `rankingService.rankAndFilter`
→ `rankingService.recordOpportunityImpressions`. The notification trigger enum
`src/modules/task-notification/enums/*.ts` already has `PROVIDER_NEW_OPPORTUNITY`. The service
`TaskNotificationService` (`src/modules/task-notification/task-notification.service.ts`) is
injected in `TaskRequesterService` together with `TaskNotificationTrigger`.

### Task
Inject `TaskNotificationService` into `ProviderTaskService` (mirror `TaskRequesterService`
imports). After ranking, if `ranked.length > 0`, emit `PROVIDER_NEW_OPPORTUNITY` for
`providerId` using the existing public method on `TaskNotificationService` (read its methods
first; do not invent a new API). Fire-and-forget (`.catch`).

### Acceptance
- A provider receiving ≥1 ranked opportunity triggers a `PROVIDER_NEW_OPPORTUNITY` notification.
- Existing endpoints unchanged; no new DB models.

---

## T3 — Expose trust indicators endpoint (spec §22)
**Complexity:** Low

### Context (current code)
`WebsiteMatchingProfile` (`prisma/schema/marketplace.prisma:25-93`) holds
`completedInteractions, successfulInteractions, failedInteractions, reliabilityScore,
completionRate, avgQualityRating, reputationScore`. No public endpoint returns these.
`WebsiteController` = `src/modules/website/website.controller.ts`;
`WebsiteService` = `src/modules/website/website.service.ts`.
Auth: `JwtAuthGuard` from `src/common/guards/auth/jwt-auth.guard`, `@CurrentUser('id')`.

### Task
Add `GET /websites/:id/trust` returning the trust metrics for the website's matching profile
(completed/successful/failed interactions, completionRate, reliabilityScore, avgQualityRating,
reputationScore). Guard with `JwtAuthGuard`. Return `404` if no profile. Add a `WebsiteService`
method querying `websiteMatchingProfile.findUnique`. Restrict to owner or admin.

### Acceptance
- Endpoint returns trust metrics as JSON via `sendResponse`.
- Ownership/admin check applied.
---

## T4 — Wire NicheDistributionCap into validation (spec §11/§12)
**Complexity:** Medium

### Context (current code)
`DistributionEngine.isNicheWithinCap(categoryKey, scope)` is implemented
(`src/modules/task/market-algoritm/distribution-engine.service.ts:103-139`) but **never called**.
`ValidationEngine` (`src/modules/task/market-algoritm/validation.engine.ts`) is the single
validation gate; its constructor already injects `DistributionEngine` (line 26) but does not use
it. `DomainInteraction`/`DomainPairStat` already capture `source/targetPrimaryCategoryKey` and
`secondaryCategoryKey`. Model:
```prisma
model NicheDistributionCap {
  id String @id @default(cuid())
  categoryKey String
  scope String @default("PRIMARY") // PRIMARY | SECONDARY
  maxPerWindow Int
  windowDays Int @default(7)
  isActive Boolean @default(true)
  note String?
}
```

### Task
In `ValidationEngine.validateTransition`, add a LEVEL (after eligibility, with governance) that,
when `providerWebsiteId`/`requesterWebsiteId` are present, looks up each website's
`primaryCategoryKey` and `secondaryCategoryKey` and calls `distributionEngine.isNicheWithinCap`
for both PRIMARY and SECONDARY scope. If a cap is exceeded, push `NICHE_CAP_EXCEEDED` to
`failedRules` (respect `adminOverride` skip like other rules). Fail closed. Mirror the existing
`getCooldownDays()` config lookup style.

### Acceptance
- `isNicheWithinCap` is invoked from `validateTransition`.
- A niche at cap rejects the candidate (per existing decision logic).
- No change to `DistributionEngine` internals.

---

## T5 — Network-concentration prevention (spec §11)
**Complexity:** Medium

### Context (current code)
`DistributionEngine` (`distribution-engine.service.ts`) has `computeDiversityScore` and
`filterNewDomains` but NO global network-concentration cap. `DomainPairStat`
(`marketplace.prisma:273-305`) tracks per-pair `interactionCount`. No marketplace-wide cap on how
many matches a single root domain may absorb.

### Task
Add `isNetworkConcentrationAllowed(rootDomain, maxPerWindow, windowDays)` to `DistributionEngine`:
count `DomainPairStat` rows where `domainA === rootDomain OR domainB === rootDomain` with
`lastInteractionAt >= now - windowDays`, return `count < maxPerWindow`. Add
`maxNetworkConcentrationPerWindow` / `networkConcentrationWindowDays` to `MarketplaceScoringConfig`
(with defaults, e.g. 50 / 7) and migrate. Wire the check into `ValidationEngine.validateTransition`
(new `NETWORK_CONCENTRATION` failed rule, overridable) for both provider and requester domains.

### Acceptance
- A domain exceeding the concentration cap is blocked from new matches.
- Config-driven; default does not break existing behaviour.

---

## T6 — Non-active WebsiteMarketplaceStatus semantics (spec §7)
**Complexity:** Medium

### Context (current code)
Enum `WebsiteMarketplaceStatus { ACTIVE, LOW_PRIORITY, LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED,
SUSPENDED }` on `WebsiteMatchingProfile.marketplaceStatus` (`marketplace.prisma:10-17,36`).
Currently `isWebsiteRowMarketplaceEligible` (`validation.engine.ts:338-368`) only checks
`marketplaceStatus !== 'ACTIVE' → ineligible`. The other 5 statuses are no-ops.

### Task
Implement differentiated behaviour:
- `LOW_PRIORITY`: eligible, but ranking applies a priority-reduction factor (e.g. multiply final
  score by 0.7) — add `lowPriorityFactor` to `MarketplaceScoringConfig`.
- `LIMITED_ACCESS`: eligible but capped exposure (reduce `maxProviderMatchesPerDay` for that
  profile, e.g. to 1).
- `UNDER_REVIEW`: eligible for browsing but NOT selectable (block at `TASK_ACCEPTANCE` stage in
  `validateTransition`).
- `RESTRICTED`: eligible but boost disabled (boostFactor treated as 1 in ranking).
- `SUSPENDED`: ineligible (already true via non-ACTIVE; keep).
Implement transitions via `MarketplaceOverrideService` / a small `WebsiteStatusService` so admins
can set these (reuse admin guard). Do NOT change the ACTIVE path.

### Acceptance
- Each status produces an observable, testable behaviour difference in matching/ranking/validation.
- ACTIVE behaviour unchanged.

---

## T7 — Dispute system (spec §25)
**Complexity:** High

### Context (current code)
Schema model exists (`marketplace.prisma:384-404`) but is **never written**. No service/controller.
```prisma
model Dispute {
  id String @id @default(cuid())
  taskId String
  requesterWebsiteId String
  providerWebsiteId String
  openedById String
  resolvedById String?
  status DisputeStatus @default(OPEN)
  reason String
  evidence Json?
  creditAdjustmentId String?
  openedAt DateTime @default(now())
  resolvedAt DateTime?
}
enum DisputeStatus { OPEN, UNDER_REVIEW, RESOLVED, REJECTED }
```
`CreditTaskService` (`src/modules/credit/credit-task/credit-task.service.ts`) has
`deductTaskCredit`/`refundTaskCredit` and writes `CreditLog`. `TaskNotificationTrigger` already has
`REQUESTER_TASK_DISPUTED` / `PROVIDER_TASK_DISPUTED`. `TaskStatus` enum includes `DISPUTED`.

### Task
Create `src/modules/task/dispute/` module:
1. `DisputeService` with `openDispute(actorId, {taskId, reason, evidence})` and
   `resolveDispute(adminId, disputeId, {decision, creditAdjustment?})`. On open: set task
   `lifecycleStatus` to `DISPUTED`, emit notification. On resolve: set `status`, `resolvedById`,
   `resolvedAt`; if `creditAdjustment` requested, call `CreditTaskService` and store
   `creditAdjustmentId`.
2. `DisputeController` (`@AdminGuard()` for resolve; owner of either website for open):
   `POST /tasks/:taskId/disputes`, `GET /disputes`, `POST /admin/disputes/:id/resolve`.
3. Inject `DisputeService` where task completion/review happens so an automatic dispute path exists.
4. Add FK relation `Dispute.creditAdjustmentId → CreditLog.id` in schema (migration).

### Acceptance
- Opening a dispute flips the task to DISPUTED and notifies both parties.
- Resolving can apply a credit adjustment persisted via `creditAdjustmentId`.
- `prisma.dispute` is now actually written.

---

## T8 — MarketplaceModeConfig service (spec §28)
**Complexity:** Medium

### Context (current code)
Model exists (`marketplace.prisma:419-427`) but never read/written:
```prisma
model MarketplaceModeConfig {
  id String @id @default("MARKETPLACE_MODE_CONFIG")
  mode MarketplaceMode @default(EARLY_STAGE)
  isActive Boolean @default(true)
  preset Json?
}
enum MarketplaceMode { EARLY_STAGE, SCALING }
```
`MatchingEngine` (`matching.engine.ts`) computes a local `marketplaceMode` string
(`'LOW_POOL' | 'NORMAL'`) only for audit — it does NOT read this config.

### Task
Create `src/modules/admin/admin-marketplace-mode/` module:
1. `AdminMarketplaceModeService` with `getConfig()` (read singleton row, seed EARLY_STAGE if
   missing) and `setMode(adminId, mode, preset)` (upsert; `preset` JSON of overrides such as
   relaxed `minViableMatches`, `maxRelaxationLevel`, velocity caps).
2. `AdminMarketplaceModeController` (`@AdminGuard()`): `GET /admin/marketplace-mode`,
   `PUT /admin/marketplace-mode`.
3. Have `MatchingEngine` read `MarketplaceModeConfig` (via a new injected service or directly via
   Prisma) and, when `SCALING`, apply the preset's `minViableMatches`/`maxRelaxationLevel` instead
   of defaults — keep `LOW_POOL` audit label.

### Acceptance
- Switching mode to SCALING changes relaxation/velocity parameters at runtime.
- `prisma.marketplaceModeConfig` is now read and writable via API.

---

## T9 — ManualMatchQueue + Liquidity admin matching (spec §18)
**Complexity:** Medium

### Context (current code)
Model exists (`marketplace.prisma:429-446`) but never used:
```prisma
model ManualMatchQueue {
  id String @id @default(cuid())
  taskId String
  providerWebsiteId String
  requesterWebsiteId String
  status String @default("PENDING")
  createdById String
  note String?
  resolvedAt DateTime?
}
```
`MatchingEngine` already sets `marketplaceMode = 'LOW_POOL'` when candidates < `minViableMatches`
(`matching.engine.ts:86-87`). `@nestjs/schedule` Cron is already used
(`opportunity-guarantee.cron.ts`).

### Task
Create `src/modules/task/admin-task/manual-match-queue.service.ts` (or new module):
1. `enqueue(taskId, providerWebsiteId, requesterWebsiteId, adminId, note)` → creates PENDING row.
2. `resolve(queueId, adminId, decision)` → APPLIED/RESOLVED/CANCELLED, sets `resolvedAt`.
3. A `@Cron` job (daily) that scans for persistent `LOW_POOL` signals (websites with
   `lastMatchedAt` older than `neglectedAfterHours` and low candidate counts) and enqueues
   candidate pairs for admin review via `enqueue`.
4. `AdminMarketplaceQueueController` (`@AdminGuard()`): `GET /admin/manual-match-queue`,
   `POST /admin/manual-match-queue`, `POST /admin/manual-match-queue/:id/resolve`.

### Acceptance
- LOW_POOL situations produce ManualMatchQueue rows.
- Admin can resolve them via API; `prisma.manualMatchQueue` is written.

---

## T10 — Supply vs Demand monitor + Pattern monitoring (spec §19 / §14)
**Complexity:** High (Supply/Demand) / Very High (Pattern clustering)

### Context (current code)
No supply/demand logic exists (grep `supplyDemand|marketBalance|providerRequesterRatio` → empty).
No cluster/group-concentration detection exists (grep `cluster|groupConcentration|networkConcentration`
→ empty). `DomainInteraction` (`marketplace.prisma:239-271`) records every completed pair with
`sourceDomain`/`targetDomain`/`normalizedPairKey`/`completedAt` — sufficient graph source.
`ValidationEngine.getEligibleMarketplaceWebsiteIds()` returns the current supply side.

### Task A — Supply vs Demand (High)
Create `src/modules/task/liquidity/` module (or `admin-analytics/services/liquidity.service.ts`):
compute open-task count vs eligible-provider-website count, expose
`GET /admin/marketplace-liquidity` returning ratios and a `LOW_SUPPLY`/`LOW_DEMAND` flag. Use
`getEligibleMarketplaceWebsiteIds()` from `ValidationEngine` for the supply side.

### Task B — Pattern monitoring (Very High)
Create `PatternMonitorService` + a `@Cron` BullMQ job that builds a directed graph from
`DomainInteraction` (nodes = root domains, edges = interactions with timestamps) and detects:
- **Repeat** (same ordered pair within window) — already covered by cooldowns; confirm.
- **Reciprocal** (A→B then B→A) — already covered; confirm.
- **Cluster/group concentration**: a strongly-connected component or cycle of ≥ N domains
  (e.g. 4) exchanging interactions within a window → flag via a `RiskEvent` (type ABUSE) or a new
  `PatternFlag` model. Emit admin notification on detection.

### Acceptance
- Liquidity ratios are queryable via admin API.
- Pattern monitor flags cyclical/cluster exchange that bypasses simple pairwise cooldowns.
- New models (`PatternFlag`) get a migration + `@relation` where appropriate.

---

## Cross-cutting follow-ups (apply after the above)
- **Schema relations to add (migration):** `RiskEvent.websiteId → Website`;
  `Dispute.creditAdjustmentId → CreditLog`; `ManualMatchQueue.{taskId,providerWebsiteId,
  requesterWebsiteId}` → `PlacementTask`/`Website` relations; `PatternFlag` model if added in T10.
- **Dedup default-profile creation:** `ValidationEngine.ensureProfile` (validation.engine.ts:314)
  and `ScoringService` upsert (scoring.service.ts:33) duplicate default values — centralise in one
  place after T1–T6 land.
- **Background cleanup job:** add a Cron to purge `OpportunityImpression` older than
  `impressionRetentionDays` (field exists in `MarketplaceScoringConfig` but no purge job runs).

