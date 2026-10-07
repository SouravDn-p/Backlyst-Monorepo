# T10 — Implementation Prompts (Supply/Demand + Pattern Monitoring)

Each section below is a **self-contained prompt** that can be pasted into a fresh
session and executed independently. Every prompt includes the context needed to
apply it without reading other prompts.

Repo: `backlyst-backend` (NestJS 11 + Prisma 5.22). Schema lives in
`prisma/schema/*.prisma` (split files; `prisma` config points at `prisma/schema`).
Migrations live in `prisma/migrations/`. Run migrations with
`npx prisma migrate dev --name <name>` and regenerate client with
`npx prisma generate`. Build/typecheck with `nest build`.

## Shared conventions (apply to every prompt)

- Services are `@Injectable()` and take `PrismaService` (from `src/prisma/prisma.service`,
  exported by `PrismaModule`).
- Responses go through `sendResponse(message, data)` from `src/utils/sendResponse.ts`
  → `{ success, message, data? }`.
- Admin controllers use `@ApiTags`, `@ApiBearerAuth(ACCESS_TOKEN)`, `@AdminGuard()`,
  and Swagger decorators (see `src/modules/admin/admin-analytics/admin-analytics.controller.ts`).
- Cron jobs use `@Cron('cron-expr')` from `@nestjs/schedule`, are `@Injectable()`, and
  are registered as `providers` in a module (see `src/modules/task/provider-task/provider-task.module.ts`).
- Admin notifications: `notificationService.sendAdminNotification({ type, category, title, body, data })`
  where `category` must be one of `ADMIN_LEDGER | ADMIN_GOVERNANCE | ADMIN_RISK |
  ADMIN_SYSTEM | DISPUTE_REVIEW` and `type` an existing `NotificationType` enum value.

## Key existing artifacts (verified)

- `ValidationEngine.getEligibleMarketplaceWebsiteIds(): Promise<string[]>` at
  `src/modules/task/market-algoritm/validation.engine.ts:173` — returns IDs of all
  `VERIFIED` + `VISIBLE` + not-flagged + not-wallet-lock + profile-eligible websites
  (the **supply side**).
- `DomainInteraction` model (`prisma/schema/marketplace.prisma:257`) fields:
  `id, taskId @unique, sourceWebsiteId, targetWebsiteId, sourceDomain, targetDomain,
  normalizedPairKey, sourcePrimaryCategoryKey, targetPrimaryCategoryKey,
  sourceSecondaryCategoryKey, targetSecondaryCategoryKey, completedAt, createdAt`
  plus indexes on `[sourceDomain]`, `[targetDomain]`, `[normalizedPairKey]`, `[completedAt]`.
  `sourceDomain`/`targetDomain` are already normalized root domains (provider=source,
  requester=target). This is the directed-edge graph source.
- `RiskEvent` model (`prisma/schema/marketplace.prisma:427`):
  `id, websiteId, type RiskEventType, delta Float, riskScoreAfter Float, createdAt`,
  indexes `[websiteId, createdAt]`, `[type]`. `RiskEventType` = `DISPUTE | REJECTION
  | FAILURE | ABUSE | SUCCESS`.
- `MarketplaceScoringConfig` (`marketplace.prisma:153`) singleton (id
  `"MARKETPLACE_SCORING_CONFIG"`) has `minViableMatches Int @default(10)`,
  `repeatPairCooldownDays Int @default(90)`, `reciprocalCooldownDays Int @default(120)`,
  `maxNetworkConcentrationPerWindow Int @default(50)`,
  `networkConcentrationWindowDays Int @default(7)`.
- Open task statuses for demand counting: `TaskStatus.OPEN` and `WAITING_FOR_APPLICANTS`
  (`prisma/schema/enums.prisma:30-31`). Tasks are `placementTask` with
  `lifecycleStatus TaskStatus`.
- Reusable notification types (`prisma/schema/notification.prisma`):
  `ADMIN_MARKETPLACE_RISK_FLAGGED`, `ADMIN_SUPPLY_DEMAND_IMBALANCE`,
  `ADMIN_LOW_LIQUIDITY_ALERT`. `ADMIN_RISK` is a valid admin notification category.
- `ValidationEngine` is `@Injectable()` (exported class), currently provided inside
  `ProviderTaskModule`. To use it elsewhere, add it to that module's `providers`
  (it only needs `PrismaService`).

## Suggested execution order
1. PROMPT 2 (schema) — must precede 3 and 4.
2. PROMPT 1 (Task A liquidity) — independent, can run in parallel with 2.
3. PROMPT 3 (service) — after 2.
4. PROMPT 4 (cron + admin endpoints) — after 2 and 3.

---

## PROMPT 1 — Task A: Supply vs Demand Liquidity endpoint

> **Goal:** Expose `GET /admin/analytics/marketplace-liquidity` returning the live
> marketplace supply/demand ratio and `LOW_SUPPLY` / `LOW_DEMAND` flags. This is the
> "Supply vs Demand monitor" half of T10 (spec §19).
>
> **Context you need (all contained here):**
> - Supply side = eligible provider websites. Use
>   `ValidationEngine.getEligibleMarketplaceWebsiteIds()` from
>   `src/modules/task/market-algoritm/validation.engine.ts` (returns `string[]` of
>   website IDs). This applies VERIFIED + VISIBLE + not-flagged + not-wallet-lock +
>   profile-eligibility rules. Do NOT re-implement eligibility — call this method.
> - Demand side = count of open marketplace tasks. Count `placementTask` rows where
>   `lifecycleStatus` is in `['OPEN', 'WAITING_FOR_APPLICANTS']` (these are `TaskStatus`
>   enum values for "open"). Use `this.prisma.placementTask.count(...)`.
> - Thresholds: read `MarketplaceScoringConfig` singleton via
>   `this.prisma.marketplaceScoringConfig.findFirst()`. Use `minViableMatches` (default 10)
>   as the supply sufficiency reference. Flag rules:
>   - `LOW_SUPPLY = true` when `supply < minViableMatches` AND `demand > 0`.
>   - `LOW_DEMAND = true` when `demand < minViableMatches` AND `supply > 0`.
> - Compute `supplyDemandRatio = demand / Math.max(supply, 1)` (round to 2 dp) and
>   `providerRequesterRatio = supply / Math.max(demand, 1)`.

>
> **Files to create/modify:**
> 1. CREATE `src/modules/admin/admin-analytics/services/liquidity.service.ts`
>    - `@Injectable()` class `LiquidityService`.
>    - Constructor injects `private readonly prisma: PrismaService` and
>      `private readonly validationEngine: ValidationEngine`.
>    - Method `async getLiquiditySnapshot()` returns:
>      ```ts
>      {
>        demand: number;
>        supply: number;
>        supplyDemandRatio: number;       // demand / max(supply,1)
>        providerRequesterRatio: number;  // supply / max(demand,1)
>        flags: { LOW_SUPPLY: boolean; LOW_DEMAND: boolean };
>        minViableMatches: number;
>        generatedAt: string;             // ISO
>      }
>      ```
>    - Wrap the two independent reads (`validationEngine.getEligibleMarketplaceWebsiteIds()`
>      and `prisma.placementTask.count(...)`) in `Promise.all`. Guard config read with
>      `?? { minViableMatches: 10 }`.
> 2. MODIFY `src/modules/admin/admin-analytics/admin-analytics.controller.ts`
>    - Inject `LiquidityService` into the controller constructor.
>    - Add route:
>      ```ts
>      @Get('marketplace-liquidity')
>      @ApiOperation({ summary: 'Marketplace supply vs demand liquidity snapshot' })
>      @ApiOkResponse({ description: 'Returns supply/demand ratios and LOW_SUPPLY/LOW_DEMAND flags.' })
>      getMarketplaceLiquidity() {
>        return this.liquidityService.getLiquiditySnapshot();
>      }
>      ```
>    - Class already has `@AdminGuard()` + `@ApiBearerAuth(ACCESS_TOKEN)`, so the route is
>      protected. Mirror the existing `@ApiTags('Admin Analytics')` style.
> 3. MODIFY `src/modules/admin/admin-analytics/admin-analytics.module.ts`
>    - Add `LiquidityService` and `ValidationEngine` to `providers`. Both are `@Injectable()`
>      and only need `PrismaService` (provided/exported by `PrismaModule`, already imported).
> 4. (Optional) CREATE `src/modules/admin/admin-analytics/dto/marketplace-liquidity.dto.ts`
>    with a response DTO + swagger `@ApiProperty` decorators, used in
>    `@ApiOkResponse({ type: MarketplaceLiquidityDto })`. Skip if keeping it simple.
>
> **Acceptance:** `GET /admin/analytics/marketplace-liquidity` (admin bearer token) returns
> `{ success, message, data: { demand, supply, supplyDemandRatio, providerRequesterRatio,
> flags, minViableMatches, generatedAt } }`. `nest build` passes. No new Prisma model needed
> (read-only). Do NOT add migrations.


---

## PROMPT 2 — Task B1: PatternFlag schema + migration

> **Goal:** Add the `PatternFlag` Prisma model and its enums to support the pattern
> monitoring engine (T10 spec §14). Schema-only change; the service that writes to it
> is delivered in PROMPT 3.
>
> **Context you need (all contained here):**
> - Schema is split across `prisma/schema/*.prisma`. Marketplace models + enums live in
>   `prisma/schema/marketplace.prisma`. Add the new model near the existing `RiskEvent`
>   model (around `marketplace.prisma:427`) for cohesion.
> - Existing `RiskEvent` model (style reference):
>   `model RiskEvent { id String @id @default(cuid()); websiteId String; type RiskEventType;
>    delta Float; riskScoreAfter Float; createdAt DateTime @default(now());
>    @@index([websiteId, createdAt]); @@index([type]) }`.
> - The pattern monitor detects coordinated exchange rings among root domains that bypass
>   pairwise cooldowns. A `PatternFlag` records one detected cluster/ring within a window.
>
> **Files to create/modify:**
> 1. MODIFY `prisma/schema/marketplace.prisma`
>    - Add enums (near the other enums / beside `RiskEventType`):
>      ```prisma
>      enum PatternFlagType {
>        CLUSTER_CONCENTRATION
>        RECIPROCAL_RING
>        REPEAT_BURST
>      }
>
>      enum PatternSeverity {
>        LOW
>        MEDIUM
>        HIGH
>      }
>
>      enum PatternFlagStatus {
>        OPEN
>        REVIEWING
>        RESOLVED
>        DISMISSED
>      }
>      ```

>    - Add the model (after `RiskEvent`'s closing `}`):
>      ```prisma
>      // Spec §14: flagged coordinated-exchange patterns (cluster / reciprocal ring / repeat
>      // burst) detected by PatternMonitorService that bypass simple pairwise cooldowns.
>      model PatternFlag {
>        id             String            @id @default(cuid())
>        type           PatternFlagType
>        severity       PatternSeverity   @default(MEDIUM)
>        status         PatternFlagStatus @default(OPEN)
>        windowStart    DateTime
>        windowEnd      DateTime
>        domainCount    Int
>        memberDomains  String[]          // normalized root domains in the detected pattern
>        evidenceJson   Json?             // edges + timestamps supporting the flag
>        resolvedAt     DateTime?
>        resolvedById   String?
>        createdAt      DateTime          @default(now())
>        updatedAt      DateTime          @updatedAt
>
>        @@index([type])
>        @@index([status])
>        @@index([windowEnd])
>      }
>      ```
>    - No `@relation` is required (PatternFlag stands alone, keyed by root-domain strings, not
>      FKs). The spec's "@relation where appropriate" is satisfied because no FK relation is
>      needed here; `RiskEvent` already carries the per-website relation via `websiteId`.
> 2. Generate + apply migration:
>    ```sh
>    npx prisma migrate dev --name t10_pattern_flag
>    npx prisma generate
>    ```
>    Verify the generated migration SQL creates the `PatternFlag` table + 3 enums and that
>    `nest build` (or `npx tsc --noEmit`) passes with the new `Prisma.PatternFlag` types.
>
> **Acceptance:** `prisma/migrations/<timestamp>_t10_pattern_flag/migration.sql` exists and
> creates `PatternFlag` + enums. `npx prisma generate` succeeds. No service code yet.


---

## PROMPT 3 — Task B2: PatternMonitorService (graph detection)

> **Goal:** Implement `PatternMonitorService` that builds a directed graph from
> `DomainInteraction` and detects coordinated-exchange patterns (cluster / reciprocal ring /
> repeat burst) that bypass pairwise cooldowns. This is the "Very High" pattern-monitoring
> half of T10 (spec §14). **Prerequisite: PROMPT 2 must already be applied** (the
> `PatternFlag` model must exist).
>
> **Context you need (all contained here):**
> - `DomainInteraction` (`prisma/schema/marketplace.prisma:257`) is the graph edge source:
>   `sourceDomain`, `targetDomain` (both already-normalized root domains; provider=source,
>   requester=target), `normalizedPairKey`, `completedAt`. Indexes exist on
>   `[sourceDomain]`, `[targetDomain]`, `[normalizedPairKey]`, `[completedAt]`.
> - `RiskEvent` (`marketplace.prisma:427`) is the immutable risk log:
>   `{ websiteId, type RiskEventType, delta, riskScoreAfter, createdAt }`.
>   `RiskEventType` includes `ABUSE`. You MAY append `ABUSE` rows for member websites when a
>   HIGH-severity cluster is flagged (optional, see step 5).
> - Notification helper: `notificationService.sendAdminNotification({ type, category, title,
>   body, data })` where `category` must be in `ADMIN_LEDGER | ADMIN_GOVERNANCE | ADMIN_RISK
>   | ADMIN_SYSTEM | DISPUTE_REVIEW` and `type` an existing `NotificationType`. Reuse
>   `NotificationType.ADMIN_MARKETPLACE_RISK_FLAGGED` + `NotificationCategory.ADMIN_RISK`.
> - `sendResponse` from `src/utils/sendResponse.ts` → `{ success, message, data? }`.
> - Config: `this.prisma.marketplaceScoringConfig.findFirst()` yields
>   `networkConcentrationWindowDays` (default 7) and `maxNetworkConcentrationPerWindow`
>   (default 50). Use these for the window and a secondary per-domain concentration check.
>
> **Detection algorithm (implement precisely):**
> 1. Load window: `const windowDays = config?.networkConcentrationWindowDays ?? 7;`
>    `const since = new Date(Date.now() - windowDays*24*60*60*1000);`
>    Fetch `DomainInteraction` where `completedAt >= since`, selecting
>    `sourceDomain, targetDomain, normalizedPairKey, completedAt`. Page if large.
> 2. **Repeat** (same ordered pair within window): count per `normalizedPairKey`. Already
>    covered by existing pairwise cooldowns — assert/observe it, do NOT flag here (note in code).
> 3. **Reciprocal** (A→B then B→A): group edges by unordered `{min,max}` domain pair; if both
>    directions exist in the window, that is reciprocal. Already covered by
>    `reciprocalCooldownDays` — confirm, do NOT flag here.
> 4. **Cluster / group concentration** (the real flag): build a directed graph
>    nodes = set of all root domains, edges = (sourceDomain → targetDomain). Compute
>    **Strongly Connected Components (SCC)** using **Tarjan's algorithm** (implement
>    inline — do NOT add a graph library). For every SCC with `domainCount >= N` where
>    `N = 4` (hardcoded default constant), create a `CLUSTER_CONCENTRATION` `PatternFlag`.
>    This catches cyclic exchange rings that pairwise cooldowns miss. Severity: `HIGH` if
>    `domainCount >= 8`, else `MEDIUM`.
> 5. **Idempotency / de-dupe**: before creating a flag, compute a stable key
>    `sortedMemberDomains.join('|')` and check for an existing `PatternFlag` with `status OPEN`
>    whose `memberDomains` set equals the new set and `windowEnd >= since`. Skip if one exists
>    (prevents notification floods). Store the SCC edge list in `evidenceJson`.
> 6. On each NEW flag, emit one admin notification:
>    `notificationService.sendAdminNotification({ type: NotificationType.ADMIN_MARKETPLACE_RISK_FLAGGED,
>     category: NotificationCategory.ADMIN_RISK, title: 'Pattern monitor: cluster concentration',
>     body: `${domainCount} domains exchanged interactions in a cycle within ${windowDays}d.`,
>     data: { type, domainCount, memberDomains, windowStart, windowEnd } as Prisma.InputJsonValue })`.
>    Wrap in try/catch so a notification failure never aborts the scan.
> 7. Return `{ scanned: number, flagsCreated: number, clusters: Array<{domainCount,
>    memberDomains, severity}> }` from `scan()`.

>
> **File to create:**
> - CREATE `src/modules/task/market-algoritm/pattern-monitor.service.ts`
>   - `@Injectable()` class `PatternMonitorService`.
>   - Constructor: `private readonly prisma: PrismaService`,
>     `private readonly notificationService: NotificationService`.
>     Import `NotificationService` from `src/modules/notification/notification.service`,
>     `NotificationType`, `NotificationCategory`, `Prisma` from `@prisma/client`.
>   - Public `async scan(): Promise<{ scanned: number; flagsCreated: number; clusters: any[] }>`.
>   - Private `findSccs(edges): string[][]` implementing Tarjan (iterative or recursive).
>   - Private `async persistFlag(...)` handling de-dupe + `prisma.patternFlag.create(...)` +
>     notification.
>   - `private readonly logger = new Logger(PatternMonitorService.name)`; log start/end/errors.
>
> **Acceptance:** Service compiles; `scan()` builds a graph from `DomainInteraction`, finds
> SCCs, and creates `PatternFlag` rows (with de-dupe) for SCCs ≥ 4 domains. No cron yet
> (that's PROMPT 4). Unit-test the Tarjan `findSccs` with a small in-memory graph if feasible.
> Do NOT modify schema here.


---

## PROMPT 4 — Task B3: PatternMonitor cron + admin read/resolve endpoints

> **Goal:** Wire `PatternMonitorService.scan()` to a scheduled `@Cron` job and expose admin
> endpoints to list + resolve `PatternFlag` rows. **Prerequisites: PROMPT 2** (`PatternFlag`
> model) and **PROMPT 3** (`PatternMonitorService`) must be applied.
>
> **Context you need (all contained here):**
> - Cron pattern: `@Injectable()` class with `@Cron('cron-expr')` method, registered as a
>   `provider` in a Nest module. Examples:
>   `src/modules/task/market-algoritm/opportunity-guarantee.cron.ts` (`@Cron('0 2 * * *')`)
>   and `src/modules/task/market-algoritm/manual-match-queue.cron.ts`. Both are registered in
>   `src/modules/task/provider-task/provider-task.module.ts` (in `providers`). Mirror that:
>   add the cron class to `providers` there.
> - `PatternFlag` model (from PROMPT 2): `id, type PatternFlagType, severity PatternSeverity,
>   status PatternFlagStatus, windowStart, windowEnd, domainCount, memberDomains String[],
>   evidenceJson Json?, resolvedAt?, resolvedById?, createdAt, updatedAt`.
> - `PatternMonitorService` (from PROMPT 3) exposes `async scan()`.
> - Admin controller conventions: `@ApiTags`, `@ApiBearerAuth(ACCESS_TOKEN)`, `@AdminGuard()`,
>   Swagger decorators, responses via `sendResponse(message, data)` from `src/utils/sendResponse.ts`.
>   See `src/modules/admin/admin-analytics/admin-analytics.controller.ts`.
> - `CurrentUser` decorator (`src/common/decorator/current-user.decorator`) gives the
>   `JwtPayload` (has `userId`). Use it as `resolvedById` when resolving a flag.
> - `PrismaService` from `src/prisma/prisma.service`, exported by `PrismaModule`.
>
> **Files to create/modify:**
> 1. CREATE `src/modules/task/market-algoritm/pattern-monitor.cron.ts`
>    - `@Injectable()` class `PatternMonitorCron` with
>      `private readonly logger = new Logger(PatternMonitorCron.name)`.
>    - Constructor injects `private readonly patternMonitor: PatternMonitorService`.
>    - `@Cron('0 */6 * * *')` method `async scan()` calling
>      `await this.patternMonitor.scan()` inside try/catch, logging success/failure
>      (mirror `ManualMatchQueueCron.scanForLiquidityGaps`).
> 2. MODIFY `src/modules/task/provider-task/provider-task.module.ts`
>    - Import `PatternMonitorService` and `PatternMonitorCron`.
>    - Add both to `providers`. (`PatternMonitorService` needs `PrismaService` +
>      `NotificationService`; `NotificationModule` is already imported in this module.)
> 3. Admin endpoints — add to `src/modules/admin/admin-analytics/` (already wired into
>    `AdminModule`). MODIFY `admin-analytics.controller.ts` + `admin-analytics.module.ts`:
>    - CREATE `src/modules/admin/admin-analytics/services/pattern-flag.service.ts` with
>      `list(filter?: {status?, type?})` and `resolve(id, adminId, note?)`.
>    - `GET /admin/analytics/pattern-flags` — list `PatternFlag` ordered by `createdAt desc`,
>      optional `?status=OPEN` filter. Return via `sendResponse`.
>    - `PATCH /admin/analytics/pattern-flags/:id/resolve` — set
>      `status = RESOLVED, resolvedAt = now(), resolvedById = currentUser.userId`
>      (use `@CurrentUser() user: JwtPayload` + `user.userId`). Accept optional `note` body.
>      Return the updated row via `sendResponse`. 404 if flag not found.
>    - Add `PatternFlagService` to `admin-analytics.module.ts` providers (keep `PrismaModule`).
> 4. (Swagger) Add `@ApiOperation` + `@ApiOkResponse` to the new routes, matching existing style.
>
> **Acceptance:** `PatternMonitorCron` is registered and runs every 6h, calling the service.
> `GET /admin/analytics/pattern-flags` lists flags; `PATCH .../:id/resolve` resolves one.
> `nest build` passes; `npx prisma generate` already ran in PROMPT 2. No schema change here.

