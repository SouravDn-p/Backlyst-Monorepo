# BACKLYST Marketplace — Section 10 Repeat Pair Rules Specification Audit

**Audit Date:** 2026-07-18
**Auditor Role:** Senior Software Architect / Marketplace Systems Expert / Backend Technical Auditor
**Method:** Source-verified audit. Every conclusion is tied to actual source code, services, schema, migrations, APIs, and configuration. Where a requirement could not be verified it is reported as missing. No assumptions.

---

## Files & Modules Inspected (Evidence Base)

| Artifact | Path | Relevance |
|----------|------|-----------|
| Validation Engine | `src/modules/task/market-algoritm/validation.engine.ts` | Repeat-pair detection, cooldown, override, hard-constraint gate |
| Root-domain normalizer | `root-domain-normalizer.util.ts` / `.service.ts` | Root-level normalization (data-driven suffix) |
| Domain interaction recorder | `domain-interaction-recorder.service.ts` | History + cooldown write |
| Matching engine | `matching.engine.ts` | Pre-candidate cooldown exclusion |
| Marketplace config service | `marketplace-config.service.ts` | Mode-dependent cooldown merge |
| Pattern monitor | `pattern-monitor.service.ts` | Real-time coordinated-exchange block |
| Admin override (force approve) | `admin-task.service.ts` | Admin override invocation |
| Admin domain-pair inspection | `admin-domain-pair-inspection.service.ts` | History review |
| Marketplace schema | `prisma/schema/marketplace.prisma` | All repeat-pair models |
| Follow-up migration | `prisma/migrations/20260718140000_reciprocal_rules_audit_followups/migration.sql` | Suffix table + override-audit fields |
| Provider task orchestrator | `provider-task.service.ts` | Execution order + safe failure |
| Ranking / Visibility | `ranking.service.ts` / `visibility-control.service.ts` | No-bypass verification |
| Marketplace mode admin | `admin-marketplace-mode/*` | EARLY_STAGE / SCALING + preset |

---

# 1. Are Repeat Pair Rules Implemented?

**YES — implemented and centralized.**

The Repeat Pair Rule responsibility lives in `ValidationEngine` (`src/modules/task/market-algoritm/validation.engine.ts`):

- `getCooldownBlockedPairKeys(providerDomains, requesterDomains)` — `validation.engine.ts:229`
- `canMatch(sourceDomain, targetDomain)` — `validation.engine.ts:316`
- `canMatchWithWindows(...)` — `validation.engine.ts:889`
- `isDirectionAllowed(...)` — `validation.engine.ts:870`
- `getCooldownDays()` — `validation.engine.ts:411`

Repeat-pair cooldowns are persisted on `DomainPairStat.repeatPairCooldownUntil` and consumed by `MatchingEngine.buildHardRuleCandidates` (`matching.engine.ts:305`) and enforced at the application (`PROVIDER_APPLICATION`) and admin force-approve (`ADMIN_FORCE`) stages via `validateTransition` LEVEL 2.

The spec's Section 10 scenario (A.com→B.com completed, then A.com→B.com again blocked until cooldown) is satisfied: when the candidate direction repeats the last recorded interaction (`lastSourceDomain`/`lastTargetDomain`), it is gated by `repeatPairCooldownUntil` in `isDirectionAllowed` (`validation.engine.ts:870-886`).

---

# 2. Do They Fully Comply With the Specifications?

**Substantially — ~90%.** Core repeat-pair restriction, root-domain normalization, execution ordering, hard-constraint isolation, mode-dependent cooldowns, real-time governance enforcement, database schema, admin override + audit, and failure handling are all present and verified.

Narrow gaps remain in observability and one governance nuance:
- `MarketplaceValidationLog` lacks `marketplaceMode` (cannot correlate repeat-pair validation to the active mode).
- Repeat-pair vs reciprocal blocks are reported as one generic `DOMAIN_COOLDOWN` rule (fine for users; limits governance dashboards).
- `DomainRelationshipEvent` has no retention/aggregation strategy.
- Single-pair `REPEAT_BURST` is flagged (detection) but not auto-blocked in real time (only CLUSTER_CONCENTRATION / RECIPROCAL_RING are hard-blocked).
- No repeat-pair-specific admin API surface distinct from reciprocal.

See Mismatch Analysis for per-requirement detail.

---

# 3. Are Repeated Domain Relationships Correctly Detected?

**YES.** `getCooldownBlockedPairKeys` tracks `lastSourceDomain` / `lastTargetDomain` on `DomainPairStat`. If the candidate repeats the last interaction direction, it is gated by `repeatPairCooldownUntil` (`isDirectionAllowed`, `validation.engine.ts:870`).

**Caveat:** only the *single most-recent* interaction direction is stored. A repeat burst (A→B, A→B, A→B beyond cooldown) is not blocked per-event by pairwise logic; it is instead surfaced by `PatternMonitorService.detectRepeatBursts` (batch, flagged not blocked). This is acceptable because the cooldown already prevents the *first* repeat during the window; the burst case concerns post-cooldown monopolization.

---

# 4. Are Repeat Pair Cooldown Periods Correctly Enforced?

**YES.** The day→ms math is centralized and correct (`MS_PER_DAY = 86_400_000`, `validation.engine.ts:119`), fixing the prior `1000`-ms regression. Cooldowns are computed from `MarketplaceScoringConfig` (`repeatPairCooldownDays`, default 90) and applied as absolute timestamps.

**Mode-dependence is now automatic** (`marketplace-config.service.ts:76-82, 177-184`): EARLY_STAGE ⇒ repeat 60d / reciprocal 90d; SCALING ⇒ repeat 90d / reciprocal 120d. SCALING only differs further if an admin sets a `preset.repeatPairCooldownDays`.

---

# 5. Are Marketplace Governance Rules Properly Enforced?

**Mostly.** Pairwise repeat + reciprocal cooldowns, `NETWORK_CONCENTRATION`, `NicheDistributionCap`, `forceNewDomainNext` diversification, and `PatternMonitorService` (SCC clusters, REPEAT_BURST, RECIPROCAL_RING) exist.

**Gap (R-Repeat-5):** `PatternMonitorService` flags `REPEAT_BURST` (same ordered pair ≥3× in window) but does NOT block in real time — only `CLUSTER_CONCENTRATION` / `RECIPROCAL_RING` HIGH-severity flags are hard-blocked in `validateTransition` LEVEL 2c (`validation.engine.ts:589-622`). Single-pair post-cooldown monopolization is detected, not prevented.

---

# 6. Are Administrative Overrides Implemented Correctly?

**YES (with the same model as reciprocal).** `validateTransition` accepts `adminOverride: { adminId, rule, reasonCode, ... }` and can skip `REPEAT_PAIR` (zeroing the window in `canMatchWithWindows`). `admin-task.service.ts` uses it on force-approve.

Verified present (closing former reciprocal-audit R9):
- `MarketplaceOverrideAudit` now has `affectedDomains`, `expiresAt`, `revokedAt` (`marketplace.prisma:571-596`; migration `20260718140000…`).
- `restore` clears the pair's `repeatPairCooldownUntil` / `reciprocalCooldownUntil` (`validation.engine.ts:824-840`).
- Both affected root domains are captured from input (`validation.engine.ts:808-818`).

**Residual gap (R-Repeat-6):** no repeat-pair-specific permission scope or admin endpoint — reciprocal and repeat overrides share one `REPEAT_PAIR` / `RECIPROCAL_COOLDOWN` rule namespace and the same `@AdminGuard()`.

---

# 7. Is the Implementation Scalable?

**Mostly, with concerns (R-Repeat-4):**
- `getCooldownBlockedPairKeys` uses an indexed `WHERE normalizedPairKey IN (...)` — good.
- `DomainRelationshipEvent` is append-only and **never pruned** — unbounded growth.
- `PatternMonitor.loadEdges` now pages the **windowed** `DomainInteraction` table (`pattern-monitor.service.ts:429-458`) — O(window), much better than the former full-table scan, but still scales with window volume.
- Public-suffix list is now **data-driven** (`PublicSuffixList` table + 5-min cache, `root-domain-normalizer.service.ts`) — the former hardcoded-set scalability gap is closed.

---

# 8. Are Architectural Responsibilities Properly Separated?

**YES.** The Repeat Pair Rule Engine performs ONLY: repeat detection, cooldown validation, restriction enforcement, history tracking, validation support, admin-override support, governance support. It does NOT perform authentication, ownership validation, payment, notifications, candidate generation, ranking, visibility, credit processing, or dispute handling.

- `MatchingEngine` delegates repeat-pair exclusion before relaxation/ranking (`matching.engine.ts:305-341`).
- `VisibilityControlService` only multiplies scores (no repeat-pair bypass) (`visibility-control.service.ts:55-80`).
- `MarketplaceOverrideService` (FORCE_MATCH/BOOST/etc.) does not touch repeat-pair cooldowns.

---

# 9. Are There Missing Marketplace Requirements?

Key items (see Final Report):
- `marketplaceMode` on `MarketplaceValidationLog` (R-Repeat-2).
- Repeat-vs-reciprocal distinction in governance output (R-Repeat-1).
- Repeat-burst real-time prevention decision (R-Repeat-5).
- `DomainRelationshipEvent` retention (R-Repeat-4).
- Repeat-pair-specific admin surface (R-Repeat-6).

---

# 10. Are There Business-Rule Violations?

**No hard business-rule violations** in the pairwise repeat path. The only authorized bypass is the explicit, logged admin `REPEAT_PAIR` override at `ADMIN_FORCE`. The material concern is that single-pair post-cooldown repeat-burst monopolization is detected but not prevented in real time (R-Repeat-5), a governance weakness rather than a direct rule violation.

---

# REPEAT PAIR RESPONSIBILITY SEPARATION

| Responsibility | Status | Evidence |
|---------------|--------|----------|
| Repeat pair relationship detection | Implemented | `validation.engine.ts:229, 316` |
| Repeat pair cooldown validation | Implemented | `validation.engine.ts:870, 889` |
| Repeat interaction restriction enforcement | Implemented | `matching.engine.ts:305-341` |
| Relationship history tracking | Implemented | `DomainInteraction`, `DomainRelationshipEvent` |
| Cooldown calculations | Implemented | `validation.engine.ts:119-123, 411-417` |
| Marketplace governance support | Partial | `PatternMonitorService` REPEAT_BURST detection-only (R-Repeat-5) |
| Administrative override support | Implemented | `validation.engine.ts:455-472, 803-857` |
| **NEVER: auth / ownership / payment / notification / candidate gen / ranking / visibility / credit / dispute** | Compliant | No such logic in engine |

---

# CORE REQUIREMENT AUDIT

> IF A.com ↓ B.com HAS COMPLETED AN INTERACTION, THEN A.com ↓ B.com MUST NOT OCCUR AGAIN until the repeat pair cooldown period expires.

**Status: Implemented.** Same-direction candidate is blocked while `repeatPairCooldownUntil > now` (`isDirectionAllowed`, `validation.engine.ts:870`). GOOD example (90d gap) allowed; BAD example (15d gap) blocked.

---

# ROOT DOMAIN VALIDATION AUDIT

**How root domains are extracted:** `normalizeRootDomain` (`root-domain-normalizer.util.ts:105-178`) lowercases, strips scheme/www/trailing dot, splits labels, returns 2-label root, with a data-driven 2-part public-suffix allowlist loaded from `PublicSuffixList` (cached 5 min, static fallback). Subdomains (`blog.example.com` and `shop.example.com`) both normalize to `example.com`, so they are treated as the SAME root domain (correct per spec "GOOD" examples).

**Violations found:** None in normalization logic. The former hardcoded-suffix scalability gap is now resolved (R2 closed).

---

# REPEAT PAIR DETECTION AUDIT

| Capability | Status | Evidence |
|-----------|--------|----------|
| Repeat pair relationship detection | Implemented | `getCooldownBlockedPairKeys` |
| Historical relationship lookups | Implemented | `DomainInteraction` + `DomainRelationshipEvent` |
| Centralized repeat pair validations | Implemented | Single `ValidationEngine`; no duplication |
| Relationship normalization | Implemented | `buildPairKey` (sorted) + `buildOrderedPairKey` (directional) |
| Multi-burst detection | Detection-only | `PatternMonitorService.detectRepeatBursts` (batch) |

**Architectural note:** repeat-pair calculations are NOT duplicated across services — `ValidationEngine` is the single source of truth, and `root-domain-normalizer.util` is shared by `ValidationEngine`, `MatchingEngine`, and `AdminDomainPairInspectionService`.

---

# REPEAT PAIR COOLDOWN AUDIT

### EARLY STAGE MODE — recommended 60–90 days (suggested 90)
- Auto-mapped: EARLY_STAGE ⇒ repeat 60d (`marketplace-config.service.ts:80`).
- Configurable override via `repeatPairCooldownDays` (default 90) or `preset.repeatPairCooldownDays`.

### SCALING MODE — 90 days
- Auto-mapped: SCALING ⇒ repeat 90d (`marketplace-config.service.ts:81`).

**Configurable:** YES (admin config + mode preset).
**Centralized:** YES (`getCooldownDays` → `MarketplaceScoringConfig`).
**Marketplace mode dependent:** YES (automatic via `MODE_DEFAULT_COOLDOWN_DAYS`).

**Missing requirement:** None for mode mapping (former R4 gap closed).

---

# EXECUTION FLOW AUDIT

Required order:
```
Authentication → Marketplace Eligibility → Marketplace Validation →
Repeat Pair Validation → Reciprocal Validation → Matching Engine →
Ranking Engine → Visibility Control
```

**Verification:**
- Application path: `provider-task.applyToTask` calls `validateTransition(PROVIDER_APPLICATION)` (runs cooldown LEVEL 2) BEFORE acceptance (`provider-task.service.ts:488-500`).
- Opportunity path: `MatchingEngine.findCandidates` → `getCooldownBlockedPairKeys` filters `buildHardRuleCandidates` (`matching.engine.ts:305-341`) BEFORE relaxation (`matching.engine.ts:118`) and before ranking/visibility.

**Result:** Ordering is correct. Repeat-pair violations cannot reach matching, ranking, or visibility. **No architectural violations found.**

---

# MATCHING ENGINE SUPPORT AUDIT

- The Matching Engine consumes `getCooldownBlockedPairKeys` and excludes blocked ordered pair keys at candidate generation (`matching.engine.ts:329-335`).
- Invalid repeat-pair opportunities are excluded BEFORE matching/candidate generation.
- No evidence that repeat-pair violations improperly reach candidate generation.

**Status:** Fully Implemented.

---

# HARD CONSTRAINT AUDIT

Repeat Pair Rules are a HARD MARKETPLACE CONSTRAINT and MUST NEVER be bypassed by Dynamic Relaxation, Ranking Engine, Visibility Control, New User Boost, Low Pool Mode, Tier Priorities, or Marketplace Liquidity Protection.

**Verification:**
- Repeat-pair exclusion occurs in `MatchingEngine` (hard-rule candidates), BEFORE relaxation (`matching.engine.ts:305-341`) and BEFORE ranking/visibility.
- `VisibilityControlService.apply` only multiplies scores; never re-admits a blocked pair (`visibility-control.service.ts:55-80`).
- `MarketplaceOverrideService` does not affect repeat-pair cooldowns.
- `RankingService` only orders (TIER_PRIORITY_ORDER affects ordering, never bypasses cooldown — `ranking.service.ts:54-56`).

**Result:** No unauthorized bypass path exists. The only bypass is the explicit, logged admin `REPEAT_PAIR` override at `ADMIN_FORCE`, which is intentional and audited.

**Status:** Fully Implemented (with the single intended admin-override carve-out).

---

# ADMIN OVERRIDE AUDIT

| Capability | Status | Evidence / Gap |
|-----------|--------|----------------|
| Override repeat-pair restrictions | Implemented | `validation.engine.ts:530, 803` |
| Approve exceptional marketplace situations | Implemented (force-approve) | `admin-task.service.ts` |
| Restore marketplace opportunities | Implemented | `validation.engine.ts:824-840` (clears cooldown) |
| Review repeat-pair histories | Implemented | `admin-domain-pair-inspection.service.ts` |
| Permission controlled | Partial | Only `@AdminGuard()`; no repeat-pair-specific scope (R-Repeat-6) |
| Logged | Implemented | `MarketplaceOverrideAudit` (now with `affectedDomains`, `expiresAt`) |
| Override histories preserved | Implemented | `expiresAt` / `revokedAt` columns present |

---

# OVERRIDE LOGGING AUDIT

`MarketplaceOverrideAudit` (`marketplace.prisma:571-596`) records: `adminId`, `overrideId?`, `websiteId?`, `taskId?`, `rule`, `action`, `reasonCode`, `affectedDomains`, `expiresAt`, `revokedAt`, `createdAt`.

**Verified:** admin info, override timestamps, affected domains, restriction (`rule`), justification (`reasonCode`), historical override info all present.

**Residual gap:** the `rule` string does not distinguish REPEAT vs RECIPROCAL nuance for operators beyond the rule name (acceptable but noted in R-Repeat-1).

**Status:** Implemented (schema complete after `20260718140000…` migration).

---

# MARKETPLACE GOVERNANCE AUDIT

The spec requires repeat-pair restrictions to prevent the cyclic pattern:
```
A ↓ B ↓ A ↓ B ↓ A ↓ B ↓ A ↓ B
```

- The simple A→B repetition is blocked by pairwise repeat cooldown. ✅
- Multi-cycle / ring exchange (≥3 domains) is detected by `PatternMonitorService.detectReciprocalRings` and **now hard-blocked in real time** (LEVEL 2c). ✅
- Single-pair `REPEAT_BURST` (A→B repeated ≥3×) is detected but **NOT auto-blocked** (R-Repeat-5). ❌ (governance weakness)

**Anti-clustering / anti-concentration:** `NETWORK_CONCENTRATION`, `NicheDistributionCap`, `forceNewDomainNext`, `PatternFlag` (CLUSTER_CONCENTRATION / RECIPROCAL_RING / REPEAT_BURST) exist. Enforcement gap only on REPEAT_BURST.

**Status:** Mostly Implemented.

---

# DOMAIN RELATIONSHIP TRACKING AUDIT

Repeat Pair Rules integrate with:
- **Domain Relationship Tracking:** `DomainInteraction` + `DomainRelationshipEvent` (`domain-interaction-recorder.service.ts`).
- **Reciprocal Rules:** shared `DomainPairStat` cooldown model, direction-aware (`isDirectionAllowed`).
- **Distribution Rules:** `forceNewDomainNext`, `NicheDistributionCap` in `validateTransition` LEVEL 5.
- **Risk Engine:** `riskScore` gate in LEVEL 4.
- **Validation Engine:** same engine consumes both.
- **Matching Engine:** consumes blocked pair keys pre-candidate.

**Architectural issues:** None structural. Histories are properly consumed and centralized.

---

# DATABASE AUDIT

| Requirement | Status | Evidence |
|------------|--------|----------|
| Repeat pair histories | Implemented | `DomainInteraction`, `DomainRelationshipEvent` |
| Cooldown tracking | Implemented | `DomainPairStat.repeatPairCooldownUntil` |
| Marketplace modes | Implemented | `MarketplaceModeConfig` |
| Administrative overrides | Implemented | `MarketplaceOverride`, `MarketplaceOverrideAudit` |
| Historical interaction tracking | Implemented | `DomainRelationshipEvent` (append-only) |
| Relationship management | Implemented | `DomainPairStat` |

**Schema gaps:** `MarketplaceValidationLog` lacks `marketplaceMode` (R-Repeat-2). `DomainRelationshipEvent` lacks retention (R-Repeat-4).

---

# API AUDIT

| API / Service | Consumes repeat-pair validation? | Notes |
|---------------|--------------------------------|-------|
| `provider-task` (apply) | YES | `validateTransition(PROVIDER_APPLICATION)` |
| `admin-task` (forceApprove) | YES | `validateTransition(ADMIN_FORCE)` + override |
| `matching.engine` (opportunities) | YES | `getCooldownBlockedPairKeys` |
| `admin/domain-pair-inspection` | Read-only review | Admin history inspection |

Repeat-pair logic is centralized in `ValidationEngine`; no cross-service duplication. **No architectural issues** in API structure.

---

# LOGGING AUDIT

| Requirement | Status | Evidence / Gap |
|------------|--------|----------------|
| Repeat-pair validations | Implemented | `MarketplaceValidationLog` |
| Cooldown failures | Generic only | `failedRule: 'DOMAIN_COOLDOWN'` (by design, user-safe) |
| Administrative overrides | Implemented | `MarketplaceOverrideAudit` |
| Marketplace modes | Partial | `MatchingAuditLog` has mode; `MarketplaceValidationLog` does NOT (R-Repeat-2) |
| Historical relationship records | Implemented | `DomainRelationshipEvent` |
| Processing times | Partial | Only overall matching time; repeat-pair validation not isolated (R-Repeat-3) |

---

# PERFORMANCE AUDIT

| Concern | Status | Note |
|--------|--------|------|
| Repeat-pair lookups optimized | Implemented | Indexed `normalizedPairKey` lookup |
| Scalability problems | Partial | Unbounded `DomainRelationshipEvent`; windowed pattern scan |
| Excessive DB queries | Partial | `getCooldownBlockedPairKeys` over-fetches all pair keys (minor) |
| Historical calc optimized | Implemented | Windowed `PatternMonitor.loadEdges` (improved) |
| DB indexing | Implemented | `@@index([repeatPairCooldownUntil])`, `@@index([reciprocalCooldownUntil])`, etc. |

**Scalability concerns:** Event-table growth + windowed pattern scan. Both acceptable at current scale; monitor.

---

# FAILURE HANDLING AUDIT

| Scenario | Behavior | Status |
|---------|----------|--------|
| Repeat-pair validation fails | Generic safe message; never "Internal Repeat Pair Rule Error" | Implemented (`provider-task.service.ts`) |
| Cooldown calc fails | `.catch(() => {})` on logging; validation still returns decision | Implemented |
| Historical info unavailable | `DomainInteractionRecorderService.record()` swallows errors | Implemented (silent — governance blind spot) |
| Admin override exists | Override applied + `MarketplaceOverrideAudit` written (best-effort) | Implemented |

**User-facing guarantee met:** end users receive only "No suitable opportunities are available right now." Technical failures are hidden.

**Trade-off / gap:** tracking failures are silent — a repeat-pair history write failure does not alert operators.

---

# MISMATCH ANALYSIS (Per Requirement)

## R-Repeat-1 — Repeat vs reciprocal distinction in governance output
- **Requirement:** Operators should be able to distinguish a *repeat* (same-direction) block from a *reciprocal* (reverse-direction) block for analytics/governance.
- **Current Implementation:** Both report a single `DOMAIN_COOLDOWN` failed rule; `overrideAudit.rule` is `REPEAT_PAIR` or `RECIPROCAL_COOLDOWN` but the validation result collapses them.
- **Evidence:** `validation.engine.ts:785-790`; `validation.engine.ts:530-539`.
- **Status:** Partially Implemented.
- **Mismatch:** User-facing collapse is correct; governance output lacks repeat/reciprocal differentiation.
- **Fix Recommendation:** Add a non-user-facing `blockedReason: 'REPEAT' | 'RECIPROCAL'` flag to `ValidationResult` for dashboards; keep `publicMessage` generic.

## R-Repeat-2 — `marketplaceMode` on validation log
- **Requirement:** Repeat-pair validations should be correlated to the active marketplace mode in logs.
- **Current Implementation:** `MarketplaceValidationLog` has no `marketplaceMode` field; the prior reciprocal-audit fix added it only as a schema comment (`marketplace.prisma:562`).
- **Evidence:** `marketplace.prisma:554-569`; `validation.engine.ts:933-944`.
- **Status:** Partially Implemented.
- **Mismatch:** Cannot query "how many repeat-pair blocks occurred under SCALING vs EARLY_STAGE".
- **Fix Recommendation:** Add `marketplaceMode String?` to `MarketplaceValidationLog`; populate from `config.mode` in `logValidation`.

## R-Repeat-3 — Isolated repeat-pair validation timing
- **Requirement:** Logging should capture repeat-pair validation processing time.
- **Current Implementation:** Only overall matching processing time is logged (`MatchingAuditLog.processingTimeMs`).
- **Evidence:** `provider-task.service.ts:155-175`; `matching.engine.ts` metadata.
- **Status:** Partially Implemented.
- **Mismatch:** No dedicated repeat-pair validation duration metric.
- **Fix Recommendation:** Optionally time `getCooldownBlockedPairKeys` / `validateTransition` LEVEL 2 and emit to a metrics sink.

## R-Repeat-4 — `DomainRelationshipEvent` retention
- **Requirement:** Historical relationship tracking must remain scalable.
- **Current Implementation:** Append-only, never pruned.
- **Evidence:** `domain-interaction-recorder.service.ts:184-204`; `marketplace.prisma:467-516`.
- **Status:** Partially Implemented.
- **Mismatch:** Unbounded growth; no retention/aggregation job.
- **Fix Recommendation:** Add a retention policy (e.g., aggregate >N days into `DomainPairStat` summaries; archive/delete old events) via a scheduled cron.

## R-Repeat-5 — Repeat-burst real-time prevention
- **Requirement:** Prevent single-pair monopolization (A→B repeated beyond cooldown).
- **Current Implementation:** `PatternMonitorService.detectRepeatBursts` flags `REPEAT_BURST` but does not block; only CLUSTER_CONCENTRATION / RECIPROCAL_RING HIGH flags are hard-blocked in `validateTransition` LEVEL 2c.
- **Evidence:** `pattern-monitor.service.ts:116-257, 578-622`; `validation.engine.ts:589-622`.
- **Status:** Partially Implemented.
- **Mismatch:** Repeat burst is detection-only; a determined pair can repeat post-cooldown without automated prevention.
- **Fix Recommendation:** Decide policy — either (a) hard-block HIGH-severity `REPEAT_BURST` in `validateTransition` like other flags, or (b) document it as intentional detection-only and rely on `NETWORK_CONCENTRATION` caps. Recommend (a) for spec compliance on anti-monopolization.

## R-Repeat-6 — Repeat-pair-specific admin surface
- **Requirement:** Admins should be able to review/override repeat-pair rules with a dedicated, scoped interface.
- **Current Implementation:** Shared `REPEAT_PAIR` rule + `@AdminGuard()`; no repeat-specific permission scope or endpoint.
- **Evidence:** `validation.engine.ts:455-472`; `admin-domain-pair-inspection.service.ts` (combined repeat+reciprocal view).
- **Status:** Partially Implemented.
- **Mismatch:** No fine-grained repeat-pair override permission scope; inspection is combined with reciprocal.
- **Fix Recommendation:** Add a `scope` to `adminOverride` for `REPEAT_PAIR` specifically; optionally a repeat-pair-specific inspection filter.

---

# FINAL REPORT

## 1. Repeat Pair Rules Compliance Percentage
**~90%** — core repeat-pair detection, root-domain normalization, execution ordering, hard-constraint isolation, mode-dependent cooldowns, real-time governance enforcement (cluster/ring), database schema, admin override + audit, and failure handling are solid. Gaps are observability (mode in log, timing), event retention, repeat-burst prevention decision, and repeat-specific admin scope.

## 2. Fully Implemented Requirements
Core repeat restriction, root-domain validation, repeat detection, cooldown calc, execution order, matching consumption, hard-constraint isolation, mode-dependent cooldowns, real-time cluster/ring enforcement, override + audit (affectedDomains/expiry/restore), DB schema, API centralization, failure handling.

## 3. Partially Implemented Requirements
R-Repeat-1 (repeat vs reciprocal distinction), R-Repeat-2 (`marketplaceMode` in validation log), R-Repeat-3 (isolated timing), R-Repeat-4 (event retention), R-Repeat-5 (repeat-burst auto-block), R-Repeat-6 (repeat-specific admin surface).

## 4. Missing Requirements
None hard. Only the narrow schema/logging/governance gaps above.

## 5. Architectural Issues Discovered
1. Responsibility separation is correct (repeat-pair engine does only its assigned duties). ✅
2. Observability gap: `MarketplaceValidationLog` lacks `marketplaceMode`; repeat-pair validation timing not isolated.
3. Governance nuance: `REPEAT_BURST` is flagged but not hard-blocked (unlike CLUSTER_CONCENTRATION / RECIPROCAL_RING).
4. Retention gap: `DomainRelationshipEvent` grows unbounded.
5. Admin scope: no repeat-pair-specific override permission surface.

## 6. Database Changes Required
- Add `marketplaceMode String?` to `MarketplaceValidationLog` (+ index).
- Consider a retention/aggregation strategy for `DomainRelationshipEvent` (cron + optional archive table).

## 7. Service Changes Required
- `ValidationEngine`: populate `marketplaceMode` in `logValidation`; optionally emit `blockedReason` (REPEAT/RECIPROCAL); optionally hard-block HIGH `REPEAT_BURST`.
- `PatternMonitorService`: confirm REPEAT_BURST enforcement policy.
- `AdminTaskService` / override DTO: support repeat-pair-specific `scope`.

## 8. API Changes Required
- Optional: repeat-pair-specific inspection filter in `admin/domain-pair-inspection`.
- Optional: structured `scope` on override DTO.

## 9. Highest Priority Issues
1. R-Repeat-2 — `marketplaceMode` in validation log (auditability, Low complexity).
2. R-Repeat-5 — repeat-burst prevention decision (governance compliance, Medium).
3. R-Repeat-4 — event retention (scalability, Medium).

## 10. Scalability Concerns
- Unbounded `DomainRelationshipEvent`.
- Windowed `PatternMonitor` scan scales with window volume (acceptable; monitor).
- `getCooldownBlockedPairKeys` over-fetches pair keys (minor).

## 11. Recommended Implementation Order
1. R-Repeat-2 — mode in validation log (Low).
2. R-Repeat-3 — isolated timing (Low).
3. R-Repeat-5 — repeat-burst policy (Medium).
4. R-Repeat-1 — repeat/reciprocal distinction (Medium).
5. R-Repeat-4 — event retention (Medium).
6. R-Repeat-6 — repeat-specific admin scope (Low).

## 12. Estimated Implementation Complexity
- R-Repeat-2 / R-Repeat-3 / R-Repeat-6: **Low**
- R-Repeat-1 / R-Repeat-4 / R-Repeat-5: **Medium**

---

*End of Audit — Section 10 Repeat Pair Rules*
