# BACKLYST MARKETPLACE — SECTION 8: DOMAIN RELATIONSHIP TRACKING AUDIT

**Audit Date:** 2026-07-18
**Auditor:** Senior Software Architect / Marketplace Systems Expert / Backend Technical Auditor
**Mode:** Source-verified (no assumptions). Every finding is traced to a concrete file, service, model, or migration.

---

## Audit Scope & Method

This audit is **strictly evidence-based**. Every finding is traced to a concrete source:

- `prisma/schema/marketplace.prisma`
- `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts`
- `src/modules/task/market-algoritm/validation.engine.ts`
- `src/modules/task/market-algoritm/distribution-engine.service.ts`
- `src/modules/task/market-algoritm/pattern-monitor.service.ts`
- `src/modules/task/market-algoritm/analytics.engine.ts`
- `src/modules/task/market-algoritm/trust-indicator.service.ts`
- `src/modules/admin/admin-domain-pair-inspection/admin-domain-pair-inspection.service.ts`
- `src/modules/task/task-requester/task-requester.service.ts`
- `src/modules/task/admin-task/admin-task.service.ts`
- `prisma/migrations/20260704023128_add_domain_tracking_models/migration.sql`

Where a spec requirement could not be verified in source, it is reported as **NOT FOUND IN THE CODEBASE** rather than assumed.

---

## 1. Is the Domain Relationship Tracking system implemented?

**Partially.** There is no standalone "Domain Relationship Tracking" bounded context or module. The responsibility is fragmented across:

- `DomainInteractionRecorderService` (`market-algoritm/domain-interaction-recorder.service.ts`) — writes `DomainInteraction` + upserts `DomainPairStat`.
- `ValidationEngine` (`market-algoritm/validation.engine.ts`) — owns root-domain normalization, pair-key building, and **cooldown enforcement** (a governance concern, not pure tracking).
- `DistributionEngine` (`market-algoritm/distribution-engine.service.ts`) — diversity / network-concentration / niche queries.
- `PatternMonitorService` — cluster / reciprocal-ring scan.
- `AnalyticsEngine` / `AdminDomainPairInspectionService` — read-side.

The tracking *storage* exists (`DomainInteraction`, `DomainPairStat`); the *tracking system as a separated responsibility* does not.

---

## 2. CORE REQUIREMENTS AUDIT (fields per recorded interaction)

Spec requires every completed interaction to store: `source_domain`, `target_domain`, `timestamp`, `interaction_id`, `niche_primary`, `niche_secondary`.

| Spec field | Schema field | Status |
|---|---|---|
| source_domain | `sourceDomain` | ✅ Present |
| target_domain | `targetDomain` | ✅ Present |
| timestamp | `completedAt` | ✅ Present |
| interaction_id | `taskId` (UNIQUE) | ⚠️ Present but mislabeled — there is **no independent `interaction_id`**; it reuses `taskId`. |
| niche_primary | `sourcePrimaryCategoryKey` / `targetPrimaryCategoryKey` | ⚠️ Present but **named differently** (spec literally says `niche_primary` / `niche_secondary`). |
| niche_secondary | `sourceSecondaryCategoryKey` / `targetSecondaryCategoryKey` | ⚠️ Present but named differently. |

**Mismatch:** Field names diverge from the spec (`niche_primary` / `niche_secondary` vs `sourcePrimaryCategoryKey`), and `interaction_id` is conflated with `taskId`. No `interaction_id` surrogate key exists.

---

## 3. ROOT DOMAIN VALIDATION AUDIT

- **Extraction:** `ValidationEngine.normalizeRootDomain()` (lines 80–125) and a **duplicated** copy in `AdminDomainPairInspectionService.normalizeRootDomain()` (lines 33–78).
- **Subdomain normalization:** Correctly strips `www.`, lowercases, collapses to 2-label root (with a 2-part public-suffix allowlist). `blog.example.com → example.com` works.
- **Root-level operation:** Verified — `DomainInteractionRecorderService` always calls `normalizeRootDomain` before building the pair key.
- **Violation:** The normalize logic is **duplicated in two places** (`validation.engine.ts` + `admin-domain-pair-inspection.service.ts`) with a comment "Kept in sync" — a maintenance hazard; drift risk.

---

## 4. INTERACTION TRACKING AUDIT

- Completed interactions: ✅ `domainInteractionRecorder.record()` called from `task-requester.service.ts` (on task completion) and `admin-task.service.ts` (force-complete / force-approve paths).
- Timestamps: ✅ `completedAt`.
- Relationship history: ✅ `DomainInteraction` rows accumulate; `DomainPairStat.interactionCount` increments.
- **Failed / pending / rejected / cancelled interactions:** ❌ **NOT FOUND IN THE CODEBASE.** The recorder is invoked only on `COMPLETED` (and admin force-complete/approve). Rejections, cancellations, disputes do **not** write any `DomainInteraction` row and there is **no status column** to distinguish them.
- **Immutable history:** `DomainInteraction` is append-only (upsert by `taskId`, never updated). ✅ Immutable. BUT `DomainPairStat` is **mutated in place** (`lastSourceDomain`, `lastInteractionAt`, `interactionCount`, cooldowns overwritten) — so per-pair *transition history* is lost (only latest state retained).

---

## 5. RECIPROCAL RELATIONSHIP AUDIT

- Reciprocal detection: ✅ `ValidationEngine.getCooldownBlockedPairKeys` tracks direction via `lastSourceDomain` / `lastTargetDomain`; `buildOrderedPairKey` distinguishes A→B from B→A.
- Reciprocal cooldown: ✅ `reciprocalCooldownUntil` on `DomainPairStat`, config `reciprocalCooldownDays` (default 120).
- Reciprocal history: ❌ `DomainPairStat` only stores the *latest* direction; directional sequence history is not preserved beyond the last edge.
- Centralized: ⚠️ Enforcement central in `ValidationEngine`, but the `AdminDomainPairInspectionService` re-implements normalization separately.

---

## 6. REPEAT RELATIONSHIP AUDIT

- Repeat pair detection: ✅ `repeatPairCooldownUntil` + `interactionCount`.
- Repeat interaction history: ⚠️ Only count is kept; individual repeat occurrences are derivable from `DomainInteraction` only by querying (no dedicated `repeat_pair_tracking` aggregate).
- Cooldown calculations: ✅ present.
- Centralized: ⚠️ Partially — cooldown *logic* lives in `ValidationEngine`, but the raw history for "A→B→A→B" is only reconstructable from `DomainInteraction` rows.

---

## 7. DISTRIBUTION SUPPORT AUDIT

- Interaction diversity: ✅ `DistributionEngine.computeDiversityScore` (distinct counterparts / total).
- Domain distribution analysis: ✅ `PatternMonitorService` + `AnalyticsEngine.getNicheDistribution`.
- Marketplace balancing / concentration: ✅ `isNetworkConcentrationAllowed`, `NicheDistributionCap`.
- **Reciprocal concentration, relationship frequencies as a dedicated analytic:** ⚠️ Derivable via queries but **no dedicated analytics tables/views** for reciprocal concentration or relationship-frequency aggregation.

---

## 8. INTERACTION STATUS AUDIT

Spec requires differentiation: pending / accepted / completed / rejected / cancelled / disputed.

- **Status field on `DomainInteraction`:** ❌ **NOT FOUND IN THE CODEBASE** (no `interaction_status` column).
- Only "completed" interactions are ever written. Rejected / cancelled / disputed are never tracked as domain relationships.
- Historical preservation across statuses: ❌ Not supported.

---

## 9. EXECUTION FLOW AUDIT

Spec order: `Marketplace Validation → Interaction Completion → Domain Relationship Tracking → Analytics → Distribution → Risk`.

- The recorder sits **after** acceptance/completion in both call sites. ✅ Ordering correct for the happy path.
- **Failure-path recording:** ❌ Rejections / cancellations do **not** trigger tracking, and there is **no "failed interaction recorded separately"** mechanism. This is a spec gap (failed interactions should be recorded separately, not silently dropped).
- No evidence of recording *before* completion. ✅

---

## 10. DATABASE AUDIT (`DomainInteraction` + `DomainPairStat`)

| Spec field | Present? |
|---|---|
| source_domain | ✅ |
| target_domain | ✅ |
| interaction_id | ⚠️ = taskId (no surrogate) |
| timestamp | ✅ (completedAt) |
| niche_primary | ⚠️ renamed |
| niche_secondary | ⚠️ renamed |
| interaction_status | ❌ MISSING |
| relationship_history | ⚠️ Partial (DomainInteraction rows, not a dedicated history table) |
| reciprocal_tracking | ⚠️ Partial (cooldown fields + last direction only) |
| repeat_pair_tracking | ⚠️ Partial (interactionCount + cooldown only) |

**Missing:** `interaction_status`, a true immutable `relationship_history` table, dedicated `reciprocal_tracking` / `repeat_pair_tracking` aggregates.

---

## 11. RELATIONSHIP HISTORY AUDIT

- Historical interaction records: ✅ `DomainInteraction` append-only.
- Unique relationship tracking: ✅ `normalizedPairKey`.
- Reciprocal / repeated histories: ⚠️ Reconstructable but not first-class.
- **Overwrite risk:** `DomainPairStat` is `upsert`ed and overwritten on every interaction → latest-state-only, **historical per-pair transitions can be lost** for analytics/audit.
- Audit histories: ⚠️ `MarketplaceValidationLog` exists but is a validation log, not a relationship-history log.

---

## 12. MARKETPLACE ANALYTICS AUDIT

- Interaction / relationship statistics: ✅ `AnalyticsEngine` queries `DomainInteraction`.
- Diversity / concentration statistics: ✅ present.
- **Sufficiency:** ⚠️ Relationship histories are detailed at raw level but **lack pre-aggregated relationship-level analytics** (e.g. per-pair frequency time series, reciprocal-concentration rollups). Sufficient for ad-hoc queries, weak for performant long-term analytics.

---

## 13. HARD CONSTRAINT SUPPORT AUDIT

- Reciprocal restrictions / repeat-pair cooldowns / weekly limits / risk / distribution / visibility / diversity: ✅ all consumed by `ValidationEngine` + `DistributionEngine` via `MarketplaceScoringConfig`.
- **Visibility calculations:** ⚠️ `DomainPairStat` niche tags feed `NicheDistributionCap`, but **visibility calculation is performed by `VisibilityControlService`, not Relationship Tracking** — correct separation, though the spec lists "visibility calculations" under "HARD CONSTRAINT SUPPORT" the tracking system should *support* (it does via data, not logic).
- **Missing relationship information:** `interaction_status` absence means governance services cannot reason about rejected / cancelled relationships.

---

## 14. ADMIN CONTROL AUDIT

- Review relationship histories: ✅ `AdminDomainPairInspectionService.inspect` (recent `DomainInteraction` rows + `DomainPairStat`).
- Review reciprocal / repeated / concentrations: ✅ via the same endpoint.
- Historical reporting: ⚠️ Only recent N rows (limit default 10) — **no full historical export**; `PatternFlag` provides cluster/ring history.
- Override support: ✅ `MarketplaceOverride` + `MarketplaceOverrideAudit`.
- **Gap:** No dedicated admin UI/service for browsing **all** relationships of a domain (only pairwise inspection exists).

---

## 15. API AUDIT

- Consuming APIs: `AdminDomainPairInspectionController` (pair inspection). Relationship data is also read internally by `ValidationEngine`, `DistributionEngine`, `AnalyticsEngine`, `PatternMonitorService`, `ScoringService`, `BehaviourPatternService`, `TrustIndicatorService`.
- Centralized management: ❌ **No centralized Domain Relationship Tracking API/service.** Write path = `DomainInteractionRecorderService` (good single writer), but read path is scattered across 8+ services querying raw tables directly.
- Architectural issue: Tracking storage is a shared DB that many engines read directly → tight coupling; no facade/ownership boundary.

---

## 16. LOGGING AUDIT

- Interaction recordings: ⚠️ Written to `DomainInteraction` (data, not log). No dedicated *logging* of "relationship change" events.
- Relationship changes: ❌ No change-log (only `MarketplaceValidationLog`, which logs validation decisions, not relationship mutations).
- Marketplace statistics / processing times / admin reviews: ✅ partially via `MatchingAuditLog`, `RankingRunLog`, `MarketplaceValidationLog`, `MarketplaceOverrideAudit`.
- **Gap:** No "relationship change" or "historical tracking" event log; failed-tracking events are not logged (recorder throws `BadRequestException` if root domain missing — see Failure Handling).

---

## 17. PERFORMANCE AUDIT

- Indexing: ✅ `DomainInteraction` has indexes on `sourceDomain`, `targetDomain`, `normalizedPairKey`, `completedAt`, category keys, composite. `DomainPairStat` indexed on `domainA`, `domainB`, cooldown fields, unique `normalizedPairKey`.
- Scalability concerns:
  - ⚠️ **`PatternMonitorService.scan()` loads ALL `DomainInteraction` rows in the window** (`findMany` paged but full-table-range scan) and builds an in-memory graph → **O(N) growth, memory-heavy** at scale.
  - ⚠️ `computeDiversityScore` / `filterNewDomains` do `findMany` over all pair stats for a domain then in-memory reduce → repeated scans per candidate.
  - ⚠️ No pre-aggregated counters for reciprocal concentration or relationship frequency → analytics recompute from raw rows.
- Excessive DB ops: ⚠️ Recorder does 2 `findUnique` + `upsert` + `upsert` per interaction (acceptable), but the broader matching flow runs many `DomainPairStat` reads per candidate.

---

## 18. FAILURE HANDLING AUDIT

- Relationship tracking failure: ❌ `DomainInteractionRecorderService.record()` **throws `BadRequestException`** ("root domain missing/invalid") and is called **inside the completion `$transaction`** in both `task-requester.service.ts` and `admin-task.service.ts`. A tracking failure therefore **aborts the entire task-completion transaction** (credits, status, notifications) — a violation of "tracking failure must not surface to users / must not break the flow."
- Interaction recording failure: same — not isolated / best-effort.
- Historical info unavailable: ⚠️ No graceful degradation; recorder throws.
- **User-facing error risk:** Technical domain-tracking errors can surface as `BadRequestException` messages. Spec requires users NEVER receive "Internal Domain Relationship Errors" — current code can leak "Requester or provider website root domain is missing/invalid."

---

## 19. ARCHITECTURAL AUDIT (responsibility separation)

Spec says Tracking MUST NOT do: auth, ownership validation, payment, notification, candidate generation, credit processing, recommendation ordering, marketplace matching, visibility calculations.

- ✅ Tracking does **not** perform payments, notifications, credit processing, candidate generation, recommendation ordering, or visibility calculation.
- ⚠️ **Cooldown enforcement (a governance/validation concern)** lives in `ValidationEngine`, but the cooldown *state* (`DomainPairStat`) is written by the recorder and read by validation — acceptable. However, `ValidationEngine` also performs **eligibility, ownership, risk, weekly-limit, niche-cap** checks — i.e. the Validation Engine is broader than Relationship Tracking (this is fine; the concern is that Relationship Tracking is *not* overstepping).
- ✅ No evidence of Matching Engine / Ranking / Visibility / Credit / Payment logic inside the recorder.
- **Architectural violation (structural):** There is **no Domain Relationship Tracking module** — tracking is embedded inside `market-algoritm` (the algorithm/ranking folder) and shared directly by 8+ engines. This violates the "centralized, separated" intent: the spec's GOOD flow shows Relationship Tracking as its own stage between Completion and Analytics; in code it is a shared table, not a bounded service.

---

# MISMATCH ANALYSIS (per requirement)

### Requirement: Every completed interaction stores source / target / timestamp / interaction_id / niche_primary / niche_secondary

- **Current Implementation:** `DomainInteraction` has `sourceDomain`, `targetDomain`, `completedAt`, `taskId`, `sourcePrimaryCategoryKey`, `targetPrimaryCategoryKey`, `sourceSecondaryCategoryKey`, `targetSecondaryCategoryKey`.
- **Evidence:** `prisma/schema/marketplace.prisma` L400–433; recorder L95–112.
- **Status:** Partially Implemented.
- **Mismatch:** `interaction_id` is `taskId` (no surrogate); niche fields renamed vs spec.
- **Fix Recommendation:** Add a dedicated `interactionId` (cuid) column; align naming or document a mapping.

### Requirement: Root-domain-level operation with correct subdomain normalization

- **Current Implementation:** `normalizeRootDomain` lowers, strips `www.`, collapses to 2-label root with a 2-part public-suffix allowlist; recorder always normalizes before pair-key build.
- **Evidence:** `validation.engine.ts` L80–125; `admin-domain-pair-inspection.service.ts` L33–78; recorder L66–82.
- **Status:** Fully Implemented (with duplication debt).
- **Mismatch:** Logic duplicated in two places (drift risk).
- **Fix Recommendation:** Extract a single `RootDomainNormalizer` util consumed by both.

### Requirement: Track pending / accepted / completed / rejected / cancelled / disputed statuses

- **Current Implementation:** No `interaction_status`; only completed interactions are written.
- **Evidence:** `domain-interaction-recorder.service.ts` (no status field); `prisma/schema/marketplace.prisma` L400–433.
- **Status:** Missing.
- **Mismatch:** No `interaction_status`; only completed written.
- **Fix Recommendation:** Add `interactionStatus` enum to `DomainInteraction`; record all terminal states.

### Requirement: Failed interactions recorded separately

- **Current Implementation:** Rejections / cancellations never produce a relationship row.
- **Evidence:** `task-requester.service.ts` rejection path (no recorder call); `admin-task.service.ts` force paths call recorder only on completion.
- **Status:** Missing.
- **Mismatch:** Rejections/cancellations never produce a relationship row.
- **Fix Recommendation:** Write a `DomainInteraction` row with `interactionStatus = REJECTED / CANCELLED / DISPUTED` from those paths (best-effort).

### Requirement: Immutable relationship history / audit histories

- **Current Implementation:** `DomainInteraction` immutable ✅; `DomainPairStat` overwritten ❌.
- **Evidence:** recorder L114–147 (upsert overwrites `lastSourceDomain`, etc.).
- **Status:** Partially Implemented.
- **Mismatch:** `DomainInteraction` immutable ✅; `DomainPairStat` overwritten ❌.
- **Fix Recommendation:** Add append-only `DomainRelationshipHistory` / `DomainPairEvent` table.

### Requirement: Reciprocal history & repeated relationship histories as first-class

- **Current Implementation:** Only latest direction + count retained on `DomainPairStat`.
- **Evidence:** `prisma/schema/marketplace.prisma` L435–467.
- **Status:** Partially Implemented.
- **Mismatch:** Only latest direction + count retained on `DomainPairStat`.
- **Fix Recommendation:** Event-sourced pair events table.

### Requirement: Centralized Relationship Tracking service / API

- **Current Implementation:** 8+ services read raw tables directly; no facade.
- **Evidence:** `search_files` — `DomainInteraction` / `DomainPairStat` referenced in validation, distribution, analytics, pattern-monitor, trust-indicator, admin-analytics, etc.
- **Status:** Missing.
- **Mismatch:** 8+ services read raw tables directly; no facade.
- **Fix Recommendation:** Introduce `DomainRelationshipService` (read + write facade) + module.

### Requirement: Logging of relationship changes / historical tracking

- **Current Implementation:** No relationship-change log.
- **Evidence:** No `relationshipChange` / pair-event log model in `marketplace.prisma`.
- **Status:** Missing.
- **Mismatch:** No relationship-change log.
- **Fix Recommendation:** Event log alongside writes.

### Requirement: Failure isolation (tracking must never break completion or surface errors)

- **Current Implementation:** Recorder throws inside the completion `$transaction`.
- **Evidence:** `task-requester.service.ts` L596–; `admin-task.service.ts` force-complete/approve blocks; recorder throws `BadRequestException` L57–77.
- **Status:** Violation.
- **Mismatch:** Recorder throws inside the completion `$transaction`.
- **Fix Recommendation:** Wrap recorder in try/catch, best-effort, never throw in the completion transaction; never return domain-internal messages to users.

### Requirement: Performance / scalable historical tracking

- **Current Implementation:** `PatternMonitorService` full-window scan + in-memory SCC; no pre-aggregation.
- **Evidence:** `pattern-monitor.service.ts` `scan()` / `loadEdges`; `distribution-engine.service.ts` `computeDiversityScore`.
- **Status:** Needs Refactor.
- **Mismatch:** Full-window scan + in-memory SCC; no pre-aggregated counters.
- **Fix Recommendation:** Pre-aggregated counters, windowed incremental scans, materialized rollups.

---

# FINAL REPORT

**1. Compliance percentage:** ~**58%** (core storage present; status tracking, failure isolation, centralized service, history immutability, and naming conformance are gaps).

**2. Fully implemented:**
- Root-domain normalization.
- Completed-interaction storage (source / target / timestamp / niches).
- Normalized pair key.
- Reciprocal + repeat cooldowns.
- Network-concentration & niche caps.
- Admin pairwise inspection.
- Immutable raw `DomainInteraction`.

**3. Partially implemented:**
- Core field set (renamed / mislabeled).
- Reciprocal & repeat history (latest-state only).
- Distribution / analytics support (ad-hoc, not pre-aggregated).
- Admin historical reporting (recent-N only).

**4. Missing:**
- `interaction_status` field & status tracking (pending / accepted / rejected / cancelled / disputed).
- Failed-interaction tracking.
- Dedicated `relationship_history` / `reciprocal_tracking` / `repeat_pair_tracking` tables.
- Centralized Relationship Tracking service / API.
- Relationship-change logging.
- Full historical admin export.
- Independent `interaction_id`.

**5. Architectural issues:**
- No bounded "Domain Relationship Tracking" module — embedded in `market-algoritm`, shared directly by 8+ engines.
- Normalization logic duplicated (drift risk).
- Recorder throws inside the completion transaction → coupling + user-facing error risk.
- `DomainPairStat` mutated in place → transition history lost.
- Read path not centralized (no facade).

**6. Database changes required:**
- Add `interactionId` (cuid, unique) to `DomainInteraction`.
- Add `interactionStatus` enum + column to `DomainInteraction`.
- Add append-only `DomainRelationshipEvent` (or `DomainPairEvent`) table for immutable per-pair transitions (direction, status, cooldown snapshots, timestamps).
- Add indexes on new status / event tables.
- Optionally rename niche columns or add spec-named aliases.

**7. Service changes required:**
- Extract `RootDomainNormalizer` (single source).
- Introduce `DomainRelationshipService` (write + read facade); route all 8+ consumers through it.
- Make `DomainInteractionRecorderService.record()` best-effort / non-throwing inside completion transactions; pre-validate root domains earlier (in validation stage, not tracking stage).
- Extend recorder to also record rejected / cancelled / disputed terminal states.

**8. API changes required:**
- Add admin endpoints: list-all-relationships-for-domain, relationship history export, reciprocal / repeat concentration dashboard (beyond pairwise inspection).
- Ensure all relationship errors return generic marketplace messages (never internal).

**9. Highest priority issues:**
1. Recorder throwing inside completion transaction (breaks flow + leaks errors). **Critical.**
2. Missing `interaction_status` / no failed-interaction tracking (gov. services blind to rejected / cancelled relationships). **High.**
3. No centralized tracking service (coupling, no ownership). **High.**
4. `DomainPairStat` overwrite loses history. **Medium-High.**

**10. Scalability concerns:**
- `PatternMonitorService` full-window `DomainInteraction` scan + in-memory SCC → O(N) memory / CPU.
- Per-domain `findMany` diversity scans repeated per candidate.
- No pre-aggregated relationship-frequency / reciprocal-concentration rollups.

**11. Recommended implementation order:**
1. Decouple recorder from completion transaction (best-effort, pre-validate at validation stage).
2. Add `interactionId` + `interactionStatus`; record all terminal states.
3. Extract `RootDomainNormalizer`; add spec field aliases.
4. Introduce append-only `DomainRelationshipEvent` table; stop overwriting `DomainPairStat` history.
5. Create `DomainRelationshipService` facade; migrate 8+ consumers.
6. Add admin relationship-history / export APIs + relationship-change logging.
7. Pre-aggregate counters; optimize `PatternMonitorService` with windowed incremental scans.

**12. Estimated implementation complexity:** **High** (cross-cutting changes to transaction boundaries, 8+ consumers, new schema + migration, new service/module, and admin APIs). Core storage is already ~60% there; the remaining work is architectural separation, status coverage, history immutability, and performance hardening.

---

This audit is fully grounded in the inspected source. The single most urgent fix is isolating the recorder from the task-completion transaction so relationship-tracking failures can never break marketplace completion or leak internal errors to users.
