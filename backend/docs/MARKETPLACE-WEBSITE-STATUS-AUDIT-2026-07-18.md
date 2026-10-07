# BACKLYST MARKETPLACE SPECIFICATION AUDIT — SECTION 7: WEBSITE STATUS

**Audit Date:** 2026-07-18
**Auditor:** Senior Software Architect / Marketplace Systems Expert / Backend Technical Auditor
**Mode:** Read-only specification compliance audit
**Working Directory:** `backlyst-backend`

---

## AUDIT SCOPE & METHOD

All findings below were verified directly against source code, Prisma schema, migrations, services, and the marketplace module graph. Where a requirement could not be verified from the codebase, it is reported as **NOT FOUND IN THE CODEBASE** / **Missing**.

**Verified evidence files:**
- `prisma/schema/marketplace.prisma` — `WebsiteMarketplaceStatus` enum, `WebsiteMatchingProfile.marketplaceStatus`, `marketplaceStatusDailyCap`, `MarketplaceScoringConfig` status factors, `WebsiteQualityStatusLog`, `QualityScoreHistory`
- `prisma/schema/website.prisma` — `Website` relations to `qualityStatusLogs`, overrides, risk events
- `prisma/migrations/20260716090000_t6_marketplace_status/`, `.../website_quality_engine/`, `.../visibility_control_audit/`, `.../website_quality_composite/`
- `src/modules/admin/admin-website-status/*` — controller, service (`WebsiteStatusService`), DTO, module
- `src/modules/task/market-algoritm/validation.engine.ts`
- `src/modules/task/market-algoritm/matching.engine.ts`
- `src/modules/task/market-algoritm/ranking.service.ts`
- `src/modules/task/market-algoritm/visibility-control.service.ts`
- `src/modules/task/market-algoritm/recommendation.service.ts`
- `src/modules/task/market-algoritm/quality.engine.ts`, `quality-status.engine.ts`, `quality-recalc.cron.ts`
- `src/modules/task/market-algoritm/marketplace-config.service.ts`
- `src/modules/task/provider-task/provider-task.service.ts`
- `src/modules/task/marketplace-engine/marketplace-engine.module.ts`

---

## 1. IS THE WEBSITE STATUS SYSTEM IMPLEMENTED?

**YES — Partially.** The enum (`ACTIVE`, `LOW_PRIORITY`, `LIMITED_ACCESS`, `UNDER_REVIEW`, `RESTRICTED`, `SUSPENDED`) exists and is persisted on `WebsiteMatchingProfile.marketplaceStatus`. Admin control, auto-transitions (quality-driven), ranking/visibility influence, history logging, and a scheduled recompute cron all exist. However, several spec behaviours for specific statuses are either incorrect or absent (detailed below).

---

## 2. STATUS-BEHAVIOUR MISMATCH ANALYSIS (per status)

### ACTIVE

- **Requirement:** standard marketplace participation, standard visibility, standard opportunity access, standard matching behaviour. No unnecessary restrictions.
- **Current Implementation:** Default status. `lowPriorityFactor` / `restrictedVisibilityFactor` / `underReviewVisibilityFactor` all return identity (1.0) for ACTIVE. No daily cap. Ranking untouched.
- **Evidence:** `ranking.service.ts` L306–313 (priority factor 1.0 for non-LOW_PRIORITY); `visibility-control.service.ts` L226–238 (identity for ACTIVE).
- **Status:** Fully Implemented.

### LOW_PRIORITY

- **Requirement:** reduced visibility, reduced opportunity frequency, continued marketplace participation. Must NEVER be a hard restriction.
- **Current Implementation:** Final ranking score × `lowPriorityFactor` (default 0.7). Pure score multiplier — never blocks. Continued participation confirmed (no daily cap, still browsable/selectable).
- **Evidence:** `ranking.service.ts` L306–313; `validation.engine.ts` L46–62 (`isSelectableStatus` includes LOW_PRIORITY).
- **Status:** Fully Implemented.

### LIMITED_ACCESS

- **Requirement:** limited opportunity exposure, reduced marketplace participation, frequency limitations; restrictions should be configurable.
- **Current Implementation:** Per-profile `marketplaceStatusDailyCap` throttles daily matches in `ranking.service.ts` L176–189. Admin can set `dailyCap`. **BUT** the quality auto-engine hard-codes this cap to **1** for auto-transitions (`quality-status.engine.ts` L176: `next === 'LIMITED_ACCESS' ? 1 : null`). This is a near-total participation cut, not a configurable "reduced" exposure. The "which opportunities remain accessible" question is answered only as "fewer daily matches" — there is no opportunity-type/premium filtering for LIMITED_ACCESS.
- **Evidence:** `ranking.service.ts` L176–189; `quality-status.engine.ts` L176; `admin-website-status.dto.ts` L26–35.
- **Status:** Partially Implemented. (Frequency limit present & configurable by admin; but auto-engine forces cap=1, and no selective opportunity-exposure logic exists.)

### UNDER_REVIEW

- **Requirement:** remain accessible unless otherwise restricted; continue marketplace participation; receive behavioural monitoring; must NOT be incorrectly suspended.
- **Current Implementation:** `isBrowsableStatus` / `isSelectableStatus` treat UNDER_REVIEW as **browsable but NOT selectable** — it is blocked at selection stages (`TASK_ACCEPTANCE`, `INTERACTION_APPROVAL`) via `WEBSITE_STATUS_NOT_SELECTABLE`. This directly contradicts the spec ("remain accessible", "continue marketplace participation") — a site under review is effectively barred from being selected/matched. The "monitored visibility" treatment (`underReviewVisibilityFactor` 0.7) is applied in Visibility Control. There is no standalone "behavioural monitoring" mechanism — the risk path that *forces* UNDER_REVIEW (`qualityUnderReviewRiskThreshold`) is the only coupling, and there is no dedicated monitoring service/log.
- **Evidence:** `validation.engine.ts` L46–67, L665–670; `visibility-control.service.ts` L131–137, L226–238.
- **Status:** **Partially Implemented / Violation.** Selectable-blocking is a spec violation for "continue marketplace participation". Behavioural monitoring mechanism is **NOT FOUND IN THE CODEBASE**.

### RESTRICTED

- **Requirement:** significant marketplace limitations, reduced visibility, reduced opportunity access; restrictions correctly enforced; cannot bypass limitations.
- **Current Implementation:** Boost disabled (`ranking.service.ts` L217–223), reduced daily cap (`restrictedDailyCapFactor` 0.34 of global → floor 1, or admin per-profile cap), and visibility × `restrictedVisibilityFactor` (0.4) in Visibility Control. It remains browsable/selectable (so restrictions are "soft", via score/cap reduction rather than hard block).
- **Evidence:** `ranking.service.ts` L217–223, L103–129; `visibility-control.service.ts` L103–129, L226–238.
- **Status:** Partially Implemented. (Significant limitations + reduced visibility present, but "reduced opportunity access" is implemented only as a daily-cap reduction, not as opportunity-type gating; still selectable so "access" is not truly restricted — acceptable per spec's soft-limitation intent but verify with product.)

### SUSPENDED

- **Requirement:** removed from marketplace participation; excluded from matching; cannot receive opportunities; must NOT remain visible or participate.
- **Current Implementation:** `isBrowsableStatus` returns false for SUSPENDED → blocked at eligibility (`getEligibleProviderWebsites`, `getEligibleMarketplaceWebsiteIds`, `isWebsiteRowMarketplaceEligible`); `validateTransition` pushes `WEBSITE_STATUS_SUSPENDED` at LEVEL 4. So suspended sites are correctly excluded from matching/selection.
- **Evidence:** `validation.engine.ts` L46–48, L385–418, L662–664; `matching.engine.ts` L71–85.
- **Status:** Fully Implemented (exclusion path correct).

---

## 3. EXECUTION-FLOW AUDIT

**Spec-required order:**
```
Authentication
        ↓
Marketplace Eligibility
        ↓
Website Status Validation
        ↓
Marketplace Validation
        ↓
Matching Engine
        ↓
Ranking Engine
        ↓
Visibility Control
        ↓
Recommendation Service
```

**Finding:** The spec lists "Website Status Validation" as a distinct step *before* Matching Engine and Ranking Engine. In the codebase, website status is validated **as part of general marketplace eligibility inside `ValidationEngine.isWebsiteRowMarketplaceEligible`** (only SUSPENDED is checked) and **again inside `validateTransition`** at selection time. Status-driven *treatment* (factors/caps) is applied in Ranking + Visibility Control. There is **no dedicated, single "Website Status Validation" stage** that runs early and centrally for all six statuses.

- The eligibility check (which catches SUSPENDED) **does** run before matching (in `matching.engine.ts` L66–85), so SUSPENDED cannot reach matching. ✅
- However, non-SUSPENDED status effects (LOW_PRIORITY, LIMITED_ACCESS, RESTRICTED, UNDER_REVIEW) are applied **late** (ranking/visibility/selection), not as an early validation gate. This matches the spec's intent that only SUSPENDED is a hard exclusion, but there is no centralized status-validation module.
- **Status:** Partially Implemented. Architectural ordering is acceptable (SUSPENDED excluded pre-matching) but the "centralized Website Status Validation" abstraction the spec describes is **NOT FOUND** as a dedicated component — it is folded into `ValidationEngine`.

---

## 4. STATUS-TRANSITION AUDIT

| Transition | Supported? | Evidence |
|---|---|---|
| Active → Low Priority | Automatic (quality) + Admin | `quality-status.engine.ts` L25–30, L110–113; admin `setStatus` |
| Low Priority → Active | Automatic + Admin | same |
| Active → Limited Access | Automatic + Admin | same |
| Limited Access → Active | Automatic + Admin | same |
| Under Review → Restricted | Admin only (auto-engine treats UNDER_REVIEW as sticky, never auto-moves) | `quality-status.engine.ts` L90–98 (returns UNDER_REVIEW, never transitions out automatically) |
| Restricted → Active | Automatic + Admin | quality ladder + admin |
| Restricted → Suspended | **Admin only** | `ADMIN_LOCKED_STATUSES` only blocks auto-clearing SUSPENDED, not setting it; admin `setStatus` allows |
| Suspended → Active (admin restore) | **Admin only** | `setStatus` to ACTIVE; auto-engine never touches SUSPENDED (`quality-status.engine.ts` L37, L82–85) |

**Gap:** Every transition is reachable **via admin `setStatus`** (manual override). Automatic (score-driven) transitions cover only the ACTIVE↔LOW_PRIORITY↔LIMITED_ACCESS↔RESTRICTED band ladder; **UNDER_REVIEW → RESTRICTED and RESTRICTED → SUSPENDED are NOT automatic** — they are admin-only. The spec lists them as supported transitions; admin support exists, automatic does not.

- **Audit logging:** `WebsiteQualityStatusLog` records every status change (admin + automatic) with `previousStatus`, `newStatus`, `trigger`, `adminId`, `reasonCode`, `note`, `createdAt`. ✅
- **Administrative permissions:** behind `AdminGuard()` on `AdminWebsiteStatusController`. ✅
- **Status:** Partially Implemented (all transitions reachable by admin; automatic support incomplete for UNDER_REVIEW/RESTRICTED branches).

---

## 5. MARKETPLACE-INFLUENCE AUDIT

Website Status influences:
- **Visibility weighting:** ✅ (ranking `lowPriorityFactor`; visibility `restrictedVisibilityFactor` / `underReviewVisibilityFactor`).
- **Opportunity frequency:** ✅ (LIMITED_ACCESS & RESTRICTED daily caps).
- **Marketplace participation:** ✅ (SUSPENDED excluded; others soft-limited).
- **Recommendation priority:** ✅ (score multipliers flow into ranking → recommendation).
- **Premium opportunity access:** ⚠️ `QualityEngine.isPremiumAccessEligible` returns `false` for non-ACTIVE — so ONLY ACTIVE gets premium, regardless of LOW_PRIORITY/LIMITED_ACCESS. This is a quality-band gate, not a status-influence per se, and is acceptable, but note premium access is decided by status=ACTIVE only, not by status weighting.

Website Status does **NOT** determine: ownership, authentication, governance rules, payment. ✅ Confirmed (status only affects score/cap/visibility; mandatory constraints live in `ValidationEngine` LEVEL 1–5).

**Status:** Fully Implemented (with the caveat that premium gating keys on ACTIVE only).

---

## 6. HARD-CONSTRAINT AUDIT

Spec: Website Status MUST NEVER bypass ownership validation, verification, cooldown filtering, reciprocal restrictions, marketplace restrictions, tier limitations, administrative restrictions, risk restrictions, weekly limitations.

- Status treatment is applied **after/independent of** `ValidationEngine` hard rules. `validateTransition` still enforces ownership (`OWN_TASK`), verification, cooldowns, network concentration, daily/weekly limits, risk threshold, niche caps — and status never short-circuits these.
- `reconcileStatus` (auto-engine) and `setStatus` (admin) only write `marketplaceStatus` / `marketplaceStatusDailyCap`; they never mutate ownership/verification/cooldown/tier/credit fields.
- **Status:** Fully Implemented. No hard-constraint bypass detected.

---

## 7. ADMIN-CONTROL AUDIT

| Capability | Present? | Evidence |
|---|---|---|
| Change website statuses | ✅ | `setStatus` |
| Apply marketplace restrictions | ✅ | `setStatus` (RESTRICTED/LIMITED_ACCESS + caps) |
| Remove restrictions | ✅ | `setStatus` back to ACTIVE clears caps |
| Suspend websites | ✅ | `setStatus` SUSPENDED |
| Restore websites | ✅ | `setStatus` to ACTIVE |
| Review status histories | ✅ | `getQualityHistory` |
| Manually override status restrictions | ✅ | admin `setStatus` is the override; `MarketplaceOverride` is separate |
| Permission / RBAC | ✅ | `AdminGuard()` |
| Audit logging | ✅ | `WebsiteQualityStatusLog` |
| Tier velocity limits | ✅ | `setTierLimits` |
| Quality score reset / recompute | ✅ | `resetQualityScore`, `recomputeQuality` |

**Status:** Fully Implemented (admin controls are complete and well-audited).

---

## 8. STATUS-HISTORY AUDIT

- Previous statuses: ✅ (`WebsiteQualityStatusLog.previousStatus/newStatus`)
- Transition timestamps: ✅ (`createdAt`)
- Administrative actions: ✅ (`adminId`, `reasonCode`, `note`, `trigger=ADMIN_OVERRIDE/RESET`)
- Marketplace restrictions applied: ⚠️ Partial — `reasonCode` / `note` capture admin intent, and `restrictedVisibilityFactor` etc. are config-level; but there is **no dedicated "restriction applied" history row** tying a status to specific restriction enactments. The quality log captures status + score, not "which restrictions were in force."
- Restoration histories: ✅ (SUSPENDED→ACTIVE logged as a status change with `trigger=ADMIN_OVERRIDE`)
- Quality time-series: ✅ (`QualityScoreHistory`, `getQualityTrend`)
- **Status:** Partially Implemented.

---

## 9. DATABASE AUDIT

| Requirement | Present? |
|---|---|
| Website statuses | ✅ `WebsiteMatchingProfile.marketplaceStatus` (enum) |
| Status histories | ✅ `WebsiteQualityStatusLog` |
| Marketplace restrictions | ⚠️ Partial — `marketplaceStatusDailyCap` (per-profile) + config factors; no explicit "restriction" entity |
| Administrative overrides | ✅ `MarketplaceOverride` (separate) + status log |
| Visibility limitations | ✅ config factors (`restrictedVisibilityFactor`, etc.) |
| Frequency limitations | ✅ `marketplaceStatusDailyCap` + `restrictedDailyCapFactor` |

**Status:** Partially Implemented. No missing core schema; the only gap is that "marketplace restrictions" are expressed implicitly via status + caps rather than a first-class restriction record.

---

## 10. API AUDIT

- **Consumers of Website Status:**
  - `AdminWebsiteStatusController` (`/admin/website-status`) — admin CRUD + history/trend.
  - `ValidationEngine` — eligibility (SUSPENDED) + selection (UNDER_REVIEW).
  - `RankingService` — LOW_PRIORITY factor, LIMITED_ACCESS cap, RESTRICTED boost-disable.
  - `VisibilityControlService` — RESTRICTED/UNDER_REVIEW visibility factors + RESTRICTED cap.
  - `QualityStatusEngine` / `ScoringService` — auto transitions.
- **Centralized validation?** NO. Status is read/consumed in at least 4 different services with no single "Website Status Service" facade. The admin `WebsiteStatusService` is separate from the consumption logic. Status *reading* is decentralized.
- **Status:** Partially Implemented. (Functional but not centralized — a scalability/maintainability concern.)

---

## 11. LOGGING AUDIT

| Log type | Present? |
|---|---|
| Status changes | ✅ `WebsiteQualityStatusLog` |
| Marketplace restrictions | ⚠️ Implicit (status + reasonCode); no dedicated restriction log |
| Administrative actions | ✅ |
| Transition histories | ✅ |
| Override operations | ✅ `MarketplaceOverrideAudit` (for governance overrides) |
| Processing time | ✅ `MatchingAuditLog.processingTimeMs`, `RankingRunLog.processingTimeMs` |
| Historical records | ✅ `WebsiteQualityStatusLog`, `QualityScoreHistory` |

**Status:** Partially Implemented.

---

## 12. PERFORMANCE AUDIT

- **Unnecessary DB queries:** `getEligibleProviderWebsites` and `getEligibleMarketplaceWebsiteIds` both `findMany` with `include: { matchingProfile: true }` then filter in-memory via `isWebsiteRowMarketplaceEligible`. This loads every verified/visible website's profile and evaluates status **in application memory** rather than in a DB `WHERE marketplaceStatus != 'SUSPENDED'` clause. At scale this is an N+1-style full-table-profile scan per opportunity request. ⚠️ **Scalability concern.**
- Status config (`lowPriorityFactor`, etc.) is cached via `MarketplaceConfigService` (60s TTL). ✅
- Auto recompute is a daily cron (not per-request). ✅
- **Status:** Partially Implemented. Recommend pushing the SUSPENDED (and ideally status) filter into the Prisma `WHERE` clause.

---

## 13. FAILURE-HANDLING AUDIT

- Invalid statuses: `setStatus` only accepts the 6 enum values (class-validator). Auto-engine short-circuits unknown via `rankOf < 0`.
- Status validation failures: swallowed in `reconcileStatus` try/catch; ranking/visibility failures isolated in `RecommendationService` (returns safe empty / falls back). ✅
- Suspended attempt to participate: blocked at eligibility → returns `"No suitable opportunities are available right now."` (`provider-task.service.ts` L241). ✅ No raw "Internal Website Status Error" leaks.
- **Status:** Fully Implemented.

---

## 14. ARCHITECTURAL AUDIT

- Website Status does **NOT** perform Matching Engine, Visibility Control, Risk Engine, Credit, Payment, or Notification responsibilities. ✅
- The BAD pattern (Website Status → Payments → Credits → Notifications → Analytics) is **not present**.
- Proper flow observed: `ValidationEngine` → `MatchingEngine` → `RankingService` → `VisibilityControlService` → `RecommendationService`. ✅
- Minor concern: `WebsiteStatusService` (admin) injects `ScoringService` and delegates `recomputeQuality` — acceptable (delegation, not ownership overlap).
- **Status:** Fully Implemented.

---

## 15. BUSINESS-RULE VIOLATIONS (summary)

1. **UNDER_REVIEW is blocked at selection** (`WEBSITE_STATUS_NOT_SELECTABLE`) — contradicts spec "continue marketplace participation / remain accessible." **Violation.**
2. **LIMITED_ACCESS auto-cap hard-coded to 1** in `quality-status.engine.ts` L176 — not a configurable "reduced" exposure; near-total cut. **Violation / misleading behaviour.**
3. **No behavioural-monitoring mechanism** for UNDER_REVIEW. **Missing.**
4. **Decentralized status consumption** across 4+ services. **Architectural/maintainability concern.**
5. **Status eligibility filtered in-memory**, not in DB WHERE. **Performance/scalability concern.**

No hard-constraint bypass violations found.

---

## 16. MISMATCH ANALYSIS (per specification requirement)

### Requirement 1 — All six statuses exist & implemented
Website Status enum present with all six values; persisted on `WebsiteMatchingProfile.marketplaceStatus`. SUSPENDED, ACTIVE, LOW_PRIORITY fully behave; LIMITED_ACCESS & UNDER_REVIEW have violations; RESTRICTED is soft-only.
- **Status:** Partially Implemented.

### Requirement 2 — ACTIVE behaviour
Standard participation/visibility/access/matching. No unnecessary restrictions.
- **Status:** Fully Implemented.

### Requirement 3 — LOW_PRIORITY behaviour
Reduced visibility + frequency, continued participation, never hard block.
- **Status:** Fully Implemented.

### Requirement 4 — LIMITED_ACCESS behaviour
Limited exposure, reduced participation, configurable frequency limit.
- **Status:** Partially Implemented. (cap hard-coded to 1 in auto-engine; no selective exposure logic.)

### Requirement 5 — UNDER_REVIEW behaviour
Remain accessible, continue participation, receive monitoring; never incorrectly suspended.
- **Status:** Partially Implemented / Violation. (Blocked at selection; no monitoring mechanism.)

### Requirement 6 — RESTRICTED behaviour
Significant limitations, reduced visibility, reduced access, no bypass.
- **Status:** Partially Implemented. (Soft-only; no true opportunity gating.)

### Requirement 7 — SUSPENDED behaviour
Removed from participation, excluded from matching, cannot receive opportunities.
- **Status:** Fully Implemented.

### Requirement 8 — Execution ordering (status validation before matching)
SUSPENDED excluded pre-matching via eligibility; no dedicated centralized status-validation stage.
- **Status:** Partially Implemented.

### Requirement 9 — Status transitions (8 listed)
All reachable via admin `setStatus`; automatic support incomplete for UNDER_REVIEW→RESTRICTED and RESTRICTED→SUSPENDED.
- **Status:** Partially Implemented.

### Requirement 10 — Marketplace influence (5 vectors)
Visibility, frequency, participation, recommendation priority influenced; premium gated on ACTIVE only.
- **Status:** Fully Implemented.

### Requirement 11 — Hard-constraint non-bypass
Status never overrides ownership/verification/cooldown/tier/risk/weekly/admin constraints.
- **Status:** Fully Implemented.

### Requirement 12 — Admin controls (7 capabilities)
All present behind AdminGuard; audit-logged.
- **Status:** Fully Implemented.

### Requirement 13 — Status history (5 record types)
Previous status, timestamps, admin actions, restoration histories, quality time-series present; "restrictions applied" only implicit.
- **Status:** Partially Implemented.

### Requirement 14 — Database support (6 schema areas)
Statuses, histories, overrides, visibility/frequency limitations present; "marketplace restrictions" only implicit.
- **Status:** Partially Implemented.

### Requirement 15 — API / centralization
Multiple consumers; no centralized status-validation service.
- **Status:** Partially Implemented.

### Requirement 16 — Logging (7 types)
Status changes, admin actions, transitions, processing time, histories present; restriction enactment only implicit.
- **Status:** Partially Implemented.

### Requirement 17 — Performance / scalability
Config cached; recompute is cron; eligibility filtered in-memory (scalability concern).
- **Status:** Partially Implemented.

### Requirement 18 — Failure handling
Safe empty result, no raw status errors leak to users.
- **Status:** Fully Implemented.

### Requirement 19 — Architectural separation
No forbidden cross-responsibilities; proper flow observed.
- **Status:** Fully Implemented.

---

## 17. FINAL REPORT

### 1. Website Status compliance percentage
**~72%**

### 2. Fully implemented requirements
WebsiteStatus enum + persistence; ACTIVE, LOW_PRIORITY, SUSPENDED behaviours; admin controls (change/suspend/restore/restrict/tier/reset/recompute); audit logging (`WebsiteQualityStatusLog`, `QualityScoreHistory`); hard-constraint non-bypass; failure isolation / safe user messaging; architectural separation; recommendation/visibility influence; scheduled recompute cron.

### 3. Partially implemented requirements
LIMITED_ACCESS (cap hard-coded to 1; no selective exposure), UNDER_REVIEW (blocked at selection; no monitoring), RESTRICTED (soft-only, no true opportunity gating), status-history "restrictions applied" detail, database "marketplace restrictions" entity, API centralization, logging of restriction enactment, performance (in-memory filtering), execution-flow centralization.

### 4. Missing requirements
- Dedicated "Website Status Validation" stage component (folded into ValidationEngine).
- Behavioural-monitoring mechanism for UNDER_REVIEW.
- First-class "marketplace restriction" record tying a status to enacted restrictions.
- Automatic UNDER_REVIEW→RESTRICTED and RESTRICTED→SUSPENDED transitions (admin-only today).

### 5. Architectural issues discovered
- Status consumption decentralized across ValidationEngine, RankingService, VisibilityControlService, QualityStatusEngine (no facade).
- Eligibility status filter done in application memory instead of Prisma `WHERE`.

### 6. Database changes required
- (Optional) Add `marketplaceStatus` to the `WHERE` clauses of `getEligibleProviderWebsites` / `getEligibleMarketplaceWebsiteIds` (no new table needed; index `@@index([marketplaceStatus])` already exists at `marketplace.prisma` L157).
- (Optional) Add a `MarketplaceRestrictionLog` / explicit restriction entity if first-class restriction history is required by spec.

### 7. Service changes required
- `validation.engine.ts`: remove UNDER_REVIEW from the non-selectable set (or make spec-compliant) so UNDER_REVIEW "continues participation."
- `quality-status.engine.ts`: make LIMITED_ACCESS auto-cap configurable (derive from config, not hard `1`).
- Introduce a `WebsiteStatusService` facade (or methods on an existing status module) that centralizes status reads/validation consumed by ranking/visibility/validation.
- Add a behavioural-monitoring hook for UNDER_REVIEW (or document why risk-threshold forcing is sufficient).

### 8. API changes required
- None strictly required for behaviour; optionally expose auto-transition thresholds (already in `MarketplaceScoringConfig`) via the admin config API if status auto-behaviour must be admin-tunable.
- Optionally add a `GET /admin/website-status/:id/current` read endpoint (currently only history/trend/metrics exist).

### 9. Highest-priority issues
1. UNDER_REVIEW incorrectly blocked at selection (spec violation).
2. LIMITED_ACCESS auto-cap hard-coded to 1 (misleading "reduced" exposure).
3. In-memory status eligibility filtering (scalability).

### 10. Scalability concerns
- Full-profile `findMany` + in-memory status filter on every opportunity request grows linearly with verified/visible website count; should be pushed to DB `WHERE`.
- Decentralized status logic risks drift as new statuses/behaviours are added.

### 11. Recommended implementation order
1. Fix UNDER_REVIEW selection-block (`validation.engine.ts`) — quick, high-impact spec fix.
2. Make LIMITED_ACCESS cap configurable in `quality-status.engine.ts`.
3. Push status filter into Prisma WHERE (performance).
4. Introduce centralized Website Status facade/service.
5. Add UNDER_REVIEW behavioural-monitoring (or spec clarification).
6. Add first-class restriction history if required.

### 12. Estimated implementation complexity
- **UNDER_REVIEW fix:** Low
- **LIMITED_ACCESS config cap:** Low–Medium
- **DB WHERE push:** Medium
- **Centralized status facade:** Medium–High
- **Monitoring mechanism:** Medium (depends on product definition)
- **Overall:** Medium

---

## VERDICT

The Website Status system is **substantially implemented and architecturally sound (~72% compliance)**, but it does **NOT fully comply** with the BACKLYST Marketplace Specification. Three concrete violations must be resolved before compliance can be claimed:

- (a) UNDER_REVIEW sites are wrongly barred from selection.
- (b) LIMITED_ACCESS auto-cap is hard-coded to 1 (not a configurable reduction).
- (c) Status eligibility is filtered in application memory rather than at the database.

None of these are hard-constraint bypasses, and administrative controls, history/audit, and failure handling are complete.
