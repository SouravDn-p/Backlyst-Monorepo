# BACKLYST Marketplace — Section 9 Reciprocal Rules Specification Audit

**Audit Date:** 2026-07-18
**Auditor Role:** Senior Software Architect / Marketplace Systems Expert / Backend Technical Auditor
**Method:** Source-verified audit. Findings are based ONLY on code, services, schema, migrations, APIs, and configuration actually present in the codebase. Where a requirement could not be verified it is reported as missing. No assumptions.

---

## Files & Modules Inspected (Evidence Base)

| Artifact | Path | Relevance |
|----------|------|-----------|
| Reciprocal / validation engine | `src/modules/task/market-algoritm/validation.engine.ts` | Core reciprocal detection, cooldown, override, governance |
| Root-domain normalizer | `src/modules/task/market-algoritm/root-domain-normalizer.util.ts` | Root-domain extraction / subdomain normalization |
| Domain interaction recorder | `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts` | History tracking (best-effort) |
| Matching engine | `src/modules/task/market-algoritm/matching.engine.ts` | Reciprocal consumption before candidate generation |
| Marketplace config service | `src/modules/task/market-algoritm/marketplace-config.service.ts` | Cooldown config + mode preset merge |
| Admin marketplace config | `src/modules/admin/admin-marketplace-config/*` | Cooldown admin configuration |
| Admin marketplace mode | `src/modules/admin/admin-marketplace-mode/*` | EARLY_STAGE / SCALING mode + preset |
| Domain pair inspection | `src/modules/admin/admin-domain-pair-inspection/*` | Admin reciprocal history review |
| Admin task service | `src/modules/task/admin-task/admin-task.service.ts` | Admin force-approve reciprocal override |
| Marketplace override service | `src/modules/task/market-algoritm/marketplace-override.service.ts` | BOOST/SUPPRESS/FORCE_MATCH overrides |
| Pattern monitor | `src/modules/task/market-algoritm/pattern-monitor.service.ts` | Coordinated-exchange / reciprocal-ring detection |
| Visibility control | `src/modules/task/market-algoritm/visibility-control.service.ts` | Post-ranking visibility (no reciprocal bypass) |
| Provider task service | `src/modules/task/provider-task/provider-task.service.ts` | Orchestrator + safe failure messages |
| Marketplace schema | `prisma/schema/marketplace.prisma` | All reciprocal / override / audit models |
| Domain relationship migration | `prisma/migrations/20260718130000_domain_relationship_tracking/migration.sql` | History table + status enum |

---

# 1. Are Reciprocal Rules Implemented?

**YES — implemented and centralized.**

The Reciprocal Rule Engine responsibility lives in `ValidationEngine` (`src/modules/task/market-algoritm/validation.engine.ts`):

- `getCooldownBlockedPairKeys(providerDomains, requesterDomains)` — `validation.engine.ts:224`
- `canMatch(sourceDomain, targetDomain)` — `validation.engine.ts:311`
- `canMatchWithWindows(...)` — `validation.engine.ts:779`
- `isDirectionAllowed(...)` — `validation.engine.ts:760`
- `getCooldownDays()` — `validation.engine.ts:406`

Reciprocal cooldowns are persisted on `DomainPairStat.reciprocalCooldownUntil` and consumed by `MatchingEngine.buildHardRuleCandidates` (`matching.engine.ts:305`) and enforced at the application (`PROVIDER_APPLICATION`) and admin force-approve (`ADMIN_FORCE`) stages via `validateTransition`.

---

# 2. Do They Fully Comply With the Specifications?

**Partially.** Core pairwise reciprocal restriction, root-domain normalization, execution ordering, hard-constraint isolation, database schema, and failure handling are solid. Gaps exist in:

- automatic mode-dependent cooldown mapping (R4)
- real-time coordinated-exchange enforcement (R10)
- override audit completeness (R9)
- a few scalability items (R2 / R14)

See the Mismatch Analysis section for the per-requirement breakdown.

---

# 3. Are Reciprocal Relationships Correctly Detected?

**YES (pairwise).** `getCooldownBlockedPairKeys` tracks `lastSourceDomain` / `lastTargetDomain` on `DomainPairStat`. If the candidate direction is the reverse of the last recorded interaction, it is gated by `reciprocalCooldownUntil` (`isDirectionAllowed`, `validation.engine.ts:760`).

**Caveat:** only the *single most-recent* interaction direction is stored. A 3rd-party reciprocal cycle (A→B, B→C, C→A) is NOT caught by pairwise logic. It is instead handled by `PatternMonitorService` (batch, not real-time) — see R10.

---

# 4. Are Reciprocal Cooldown Periods Correctly Enforced?

**YES for pairwise.** The day→ms math is centralized and correct (`MS_PER_DAY = 86_400_000`, `validation.engine.ts:114`), fixing the prior `1000`-ms regression. Cooldowns are computed from `MarketplaceScoringConfig` (`reciprocalCooldownDays`, default 120) and applied as absolute timestamps.

**Gap (R4):** mode-dependence is manual/optional. EARLY_STAGE defaults to 120d (spec recommends 60–90d); SCALING only differs if an admin explicitly sets a `preset.reciprocalCooldownDays`.

---

# 5. Are Marketplace Governance Rules Properly Enforced?

**Partially.** Pairwise reciprocal + repeat cooldowns, `NETWORK_CONCENTRATION`, `NicheDistributionCap`, `forceNewDomainNext` diversification, and `PatternMonitorService` (SCC clusters, REPEAT_BURST, RECIPROCAL_RING ≥ 3) exist.

**Violation (R10):** `PatternMonitorService` is a **batch cron scan** that only creates `PatternFlag` rows — it does **not** block matches in real time, and there is **no verified path** tying `PatternFlag` back into `validateTransition` / `getCooldownBlockedPairKeys`. Coordinated-exchange protection is detection-only, not prevention.

---

# 6. Are Administrative Overrides Implemented Correctly?

**Partially.** `validateTransition` accepts `adminOverride: { adminId, rule, reasonCode }` and can skip `REPEAT_PAIR` / `RECIPROCAL_COOLDOWN` (zeroing the window in `canMatchWithWindows`). `admin-task.service.ts:907` uses it on force-approve.

**Gaps (R8):**
- Override permissioning is coarse: `forceApproveTask(adminId: string, ...)` accepts a plain `adminId` and is guarded only by `@AdminGuard()` — any admin role can override any reciprocal cooldown with a free-text `note`. No fine-grained permission/role scope for reciprocal overrides.
- "Restore opportunity" vs "approve exception" are not distinguished; the override does not re-evaluate `DomainPairStat`/history, so the next legitimate interaction still sees the old cooldown.

---

# 7. Is the Implementation Scalable?

**Mostly, with concerns (R14):**
- `getCooldownBlockedPairKeys` uses an indexed `WHERE normalizedPairKey IN (...)` — good.
- `DomainRelationshipEvent` is append-only and **never pruned** — unbounded growth, no retention/aggregation job verified.
- `PatternMonitorService.loadEdges` pages the **entire** `DomainInteraction` table per scan window (`pattern-monitor.service.ts:429`) — O(N) full scan, will not scale.
- `TWO_PART_PUBLIC_SUFFIXES` is a **hardcoded** allowlist (`root-domain-normalizer.util.ts:10`) — new ccTLDs require a code deploy.

---

# 8. Are Architectural Responsibilities Properly Separated?

**YES.** The Reciprocal Rule Engine performs ONLY: reciprocal detection, cooldown validation, restriction enforcement, history tracking, validation support, admin-override support, governance support. It does NOT perform authentication, ownership validation, payment, notifications, candidate generation, ranking, visibility, credit processing, or dispute handling.

- `MatchingEngine` delegates reciprocal exclusion before relaxation/ranking (`matching.engine.ts:108–145`).
- `VisibilityControlService` only multiplies scores (no reciprocal bypass) (`visibility-control.service.ts:66`).
- `MarketplaceOverrideService` (FORCE_MATCH/BOOST/etc.) does not touch reciprocal cooldowns (`marketplace-override.service.ts:33`).

---

# 9. Are There Missing Marketplace Requirements?

See "Missing Requirements" in the Final Report (Section FINAL). Key missing items:
- Automatic EARLY_STAGE (60–90d) vs SCALING (120d) reciprocal cooldown mapping.
- Real-time `PatternFlag` enforcement in matching/validation.
- `affectedDomains` + expiry/revocation on reciprocal override audit.
- Structured, permission-scoped admin reciprocal overrides.
- Data-driven public-suffix list.

---

# 10. Are There Business-Rule Violations?

**No hard business-rule violations** in the pairwise reciprocal path. The only authorized bypass is the explicit, logged admin `RECIPROCAL_COOLDOWN` override at `ADMIN_FORCE`. The material concern is that coordinated-exchange (multi-party) abuse is detected but not prevented in real time (R10), which is a governance/business-rule weakness rather than a direct reciprocal-rule violation.

---

# RECIPROCAL RULE RESPONSIBILITY SEPARATION

| Responsibility | Status | Evidence |
|---------------|--------|----------|
| Reciprocal relationship detection | Implemented | `validation.engine.ts:224, 311` |
| Reciprocal cooldown validation | Implemented | `validation.engine.ts:760, 779` |
| Reciprocal restriction enforcement | Implemented | `matching.engine.ts:305–341` |
| Reciprocal history tracking | Implemented | `DomainInteraction`, `DomainRelationshipEvent` |
| Reciprocal validation support | Implemented | `validateTransition` LEVEL 2 |
| Administrative override support | Partial | `validation.engine.ts:456, 504`; gaps in R8/R9 |
| Marketplace governance support | Partial | `PatternMonitorService` detection-only (R10) |
| **NEVER: auth / ownership / payment / notification / candidate gen / ranking / visibility / credit / dispute** | Compliant | No such logic in reciprocal engine |

---

# CORE REQUIREMENT AUDIT

> IF A.com ↓ B.com, THEN B.com ↓ A.com MUST NOT OCCUR within the reciprocal cooldown period.

**Status: Implemented.** Reverse-direction candidate is blocked while `reciprocalCooldownUntil > now` (`isDirectionAllowed`, `validation.engine.ts:760`).

---

# ROOT DOMAIN VALIDATION AUDIT

**How root domains are extracted:** `normalizeRootDomain` (`root-domain-normalizer.util.ts:27`) lowercases, strips scheme/www/trailing dot, splits labels, returns 2-label root, with a 2-part public-suffix allowlist (`ac.uk`, `co.uk`, `com.au`, `co.jp`, `co.nz`, …). Subdomains (`blog.example.com` and `shop.example.com`) both normalize to `example.com`, so they are treated as the SAME root domain (correct per spec "GOOD" examples).

**Violations found:** None in normalization logic. **Scalability gap:** the public-suffix allowlist is hardcoded (R2) — adding `com.mx`, `co.za`, etc. requires a code change. Recommend moving to a data-driven/config list.

---

# RECIPROCAL DETECTION AUDIT

| Capability | Status | Evidence |
|-----------|--------|----------|
| Reciprocal relationship detection | Implemented | `getCooldownBlockedPairKeys` |
| Historical reciprocal lookups | Implemented | `DomainInteraction` + `DomainRelationshipEvent` |
| Relationship normalization | Implemented | `buildPairKey` (sorted) + `buildOrderedPairKey` (directional) |
| Centralized reciprocal validations | Implemented | Single `ValidationEngine`; no duplication across services |
| Multi-party reciprocal ring | Detection-only | `PatternMonitorService.detectReciprocalRings` (batch, not real-time) |

**Architectural note:** reciprocal calculations are NOT duplicated across services — `ValidationEngine` is the single source of truth, and `root-domain-normalizer.util` is shared by `ValidationEngine`, `MatchingEngine`, and `AdminDomainPairInspectionService` (previous duplication removed).

---

# RECIPROCAL COOLDOWN AUDIT

### EARLY STAGE MODE — recommended 60–90 days (suggested 90)

- Config default `reciprocalCooldownDays = 120` (`marketplace.prisma:288`).
- **No automatic mapping** to 90d for EARLY_STAGE. EARLY_STAGE uses 120d unless an admin sets it lower via `updateConfig`.

### SCALING MODE — 120 days

- Achieved ONLY if `MarketplaceModeConfig.preset.reciprocalCooldownDays = 120` is set (`marketplace-config.service.ts:155`). Otherwise falls back to the same 120 default.

**Configurable:** YES (admin config + mode preset).
**Centralized:** YES (`getCooldownDays` → `MarketplaceScoringConfig`).
**Marketplace mode dependent:** PARTIAL — depends on an admin manually populating `preset`; not automatic.

**Missing requirement:** Automatic mode→cooldown defaults (EARLY_STAGE ⇒ 90d reciprocal, SCALING ⇒ 120d) when no explicit preset is supplied.

---

# EXECUTION FLOW AUDIT

Required order:
```
Authentication
  ↓
Marketplace Eligibility
  ↓
Marketplace Validation
  ↓
Domain Cooldown Filtering
  ↓
Reciprocal Rule Validation
  ↓
Matching Engine
  ↓
Ranking Engine
  ↓
Visibility Control
```

**Verification:**
- Application path: `provider-task.service.ts:488` calls `validateTransition(PROVIDER_APPLICATION)` (which runs reciprocal LEVEL 2) BEFORE acceptance — correct ordering.
- Opportunity path: `MatchingEngine.findCandidates` → `getCooldownBlockedPairKeys` filters `buildHardRuleCandidates` (`matching.engine.ts:305–341`) BEFORE relaxation (`matching.engine.ts:118`) and before ranking/visibility.

**Result:** Ordering is correct. Reciprocal violations cannot reach matching, ranking, or visibility. **No architectural violations found.**

---

# MATCHING ENGINE SUPPORT AUDIT

- The Matching Engine consumes `getCooldownBlockedPairKeys` and excludes blocked ordered pair keys at candidate generation (`matching.engine.ts:329–335`).
- Invalid reciprocal opportunities are excluded BEFORE matching/candidate generation.
- No evidence that reciprocal violations improperly reach candidate generation.

**Status:** Fully Implemented.

---

# HARD CONSTRAINT AUDIT

Reciprocal Rules are a HARD MARKETPLACE CONSTRAINT and MUST NEVER be bypassed by Dynamic Relaxation, Ranking Engine, Visibility Control, New User Boost, Low Pool Mode, Tier Priorities, or Marketplace Liquidity Protection.

**Verification:**
- Reciprocal exclusion occurs in `MatchingEngine` (hard-rule candidates), BEFORE relaxation (`matching.engine.ts:108–145`) and BEFORE ranking/visibility.
- `VisibilityControlService.apply` only multiplies scores; it never re-admits a blocked pair (`visibility-control.service.ts:66–229`).
- `MarketplaceOverrideService` (FORCE_MATCH/BOOST/SUPPRESS/SCORE_OVERRIDE/PENALTY) does not affect reciprocal cooldowns (`marketplace-override.service.ts:33–157`).
- `RankingService` only applies `lowPriorityFactor` (status weighting), never reciprocal logic (`ranking.service.ts`).

**Result:** No unauthorized bypass path exists. The only bypass is the explicit, logged admin `RECIPROCAL_COOLDOWN` override at `ADMIN_FORCE` (`admin-task.service.ts:907`), which is intentional and permissioned.

**Status:** Fully Implemented (with the single intended admin-override carve-out).

---

# ADMIN OVERRIDE AUDIT

| Capability | Status | Evidence / Gap |
|-----------|--------|----------------|
| Override reciprocal restrictions | Implemented | `validation.engine.ts:504–519`, `admin-task.service.ts:915` |
| Approve exceptional marketplace situations | Implemented (force-approve) | `admin-task.service.ts:884` |
| Restore marketplace opportunities | Partial | Override does not re-evaluate `DomainPairStat`/history |
| Review reciprocal histories | Implemented | `admin-domain-pair-inspection.service.ts` |
| Permission controlled | Partial | Only `@AdminGuard()`; no fine-grained reciprocal-override scope |
| Logged | Partial | `MarketplaceOverrideAudit` created, but missing affected domains |
| Override histories preserved | Partial | No expiry/revocation concept for reciprocal overrides |

---

# OVERRIDE LOGGING AUDIT

`MarketplaceOverrideAudit` (`marketplace.prisma:571`) records: `adminId`, `websiteId?`, `taskId?`, `rule`, `action`, `reasonCode`, `createdAt`.

**Missing tracking:**
- **Affected domains** — only provider `websiteId` is captured (`validation.engine.ts:738`); the requester domain / both root domains of the reciprocal pair are NOT persisted.
- **Overridden restriction specifics** — only the `rule` string; no `affectedDomains`, no `expiresAt`/`revokedAt`.
- **Linkage to a revocable override entity** — reciprocal overrides are NOT `MarketplaceOverride` rows (that model is BOOST/SUPPRESS/FORCE_MATCH/etc.), so they cannot be revoked/expired like other overrides.

**Status:** Partially Implemented. Schema change required (add `affectedDomains String[]`, `expiresAt`, `revokedAt` to `MarketplaceOverrideAudit`).

---

# MARKETPLACE GOVERNANCE AUDIT

The spec requires reciprocal restrictions to prevent the cyclic pattern:
```
A ↓ B ↓ B ↓ A ↓ A ↓ B ↓ B ↓ A
```

- The simple A↔B oscillation is blocked by pairwise reciprocal cooldown. ✅
- Multi-cycle / ring exchange (≥3 domains) is detected by `PatternMonitorService.detectReciprocalRings` but is **batch-only and non-blocking** (R10). ❌ (governance weakness)

**Anti-clustering / anti-exchange:** `NETWORK_CONCENTRATION`, `NicheDistributionCap`, `forceNewDomainNext`, `PatternFlag` (CLUSTER_CONCENTRATION / RECIPROCAL_RING / REPEAT_BURST) exist at the schema + detection level. **Enforcement gap:** flags are not wired back into real-time validation.

**Status:** Partially Implemented.

---

# DATABASE AUDIT

| Requirement | Status | Evidence |
|------------|--------|----------|
| Reciprocal histories | Implemented | `DomainInteraction`, `DomainRelationshipEvent` |
| Cooldown tracking | Implemented | `DomainPairStat.repeatPairCooldownUntil/reciprocalCooldownUntil` |
| Marketplace modes | Implemented | `MarketplaceModeConfig` |
| Administrative overrides | Implemented | `MarketplaceOverride`, `MarketplaceOverrideAudit` |
| Reciprocal validations | Implemented | `MarketplaceValidationLog` |
| Historical relationship tracking | Implemented | `DomainRelationshipEvent` (append-only) |

**Schema gaps:** `MarketplaceOverrideAudit` lacks `affectedDomains` + `expiresAt`/`revokedAt`; `MarketplaceValidationLog` lacks `marketplaceMode`.

---

# API AUDIT

| API / Service | Consumes reciprocal validation? | Notes |
|---------------|--------------------------------|-------|
| `provider-task` (apply) | YES | `validateTransition(PROVIDER_APPLICATION)` |
| `admin-task` (forceApprove) | YES | `validateTransition(ADMIN_FORCE)` + override |
| `matching.engine` (opportunities) | YES | `getCooldownBlockedPairKeys` |
| `admin/domain-pair-inspection` | Read-only review | Admin history inspection |

Reciprocal logic is centralized in `ValidationEngine`; no cross-service duplication. **No architectural issues** in API structure.

---

# LOGGING AUDIT

| Requirement | Status | Evidence / Gap |
|------------|--------|----------------|
| Reciprocal validations | Implemented | `MarketplaceValidationLog` |
| Reciprocal failures | Generic only | `failedRule: 'DOMAIN_COOLDOWN'` (by design, user-safe) |
| Administrative overrides | Partial | `MarketplaceOverrideAudit` (missing affected domains) |
| Marketplace modes | Partial | `MatchingAuditLog` has mode; `MarketplaceValidationLog` does NOT |
| Historical reciprocal records | Implemented | `DomainRelationshipEvent` |
| Processing times | Partial | Only overall matching time; reciprocal validation not isolated |

---

# PERFORMANCE AUDIT

| Concern | Status | Note |
|--------|--------|------|
| Reciprocal lookups optimized | Implemented | Indexed `normalizedPairKey` lookup |
| Scalability problems | Partial | Unbounded `DomainRelationshipEvent`; full-table `PatternMonitor` scan |
| Excessive DB queries | Partial | `getCooldownBlockedPairKeys` over-fetches all pair keys (minor) |
| Historical calc optimized | Partial | `PatternMonitor.loadEdges` pages entire table |
| DB indexing | Implemented | `@@index([repeatPairCooldownUntil])`, `@@index([reciprocalCooldownUntil])`, etc. |

**Scalability concerns:** Event-table growth + cron full-scan + hardcoded suffix list.

---

# FAILURE HANDLING AUDIT

| Scenario | Behavior | Status |
|---------|----------|--------|
| Reciprocal validation fails | Generic safe message; never "Internal Reciprocal Rule Error" | Implemented (`provider-task.service.ts:241`) |
| Cooldown calc fails | `.catch(() => {})` on logging; validation still returns decision | Implemented |
| Historical info unavailable | `DomainInteractionRecorderService.record()` swallows errors | Implemented (but silent — governance blind spot) |
| Admin override exists | Override applied + `MarketplaceOverrideAudit` written (best-effort) | Implemented |

**User-facing guarantee met:** end users receive only "No suitable opportunities are available right now." Technical failures are hidden.

**Trade-off / gap:** tracking failures are silent — a reciprocal history write failure does not alert operators (ties to R3).

---

# MISMATCH ANALYSIS (Per Requirement)

## R1 — Core reciprocal restriction (A→B then B→A blocked)
- **Requirement:** Reverse-direction interaction must be blocked within cooldown.
- **Current Implementation:** `getCooldownBlockedPairKeys` + `isDirectionAllowed` block reverse direction via `reciprocalCooldownUntil`.
- **Evidence:** `validation.engine.ts:209–281, 760`; `domain-interaction-recorder.service.ts:143–154`.
- **Status:** Fully Implemented.
- **Mismatch:** None (pairwise). Multi-party cycles handled separately (R10).
- **Fix:** None required for pairwise.

## R2 — Root-domain validation (always root level)
- **Requirement:** All calculations at root domain; subdomains normalized.
- **Current Implementation:** `normalizeRootDomain` centralizes 2-label root with hardcoded 2-part suffix allowlist.
- **Evidence:** `root-domain-normalizer.util.ts:10–82`.
- **Status:** Fully Implemented (logic); Partial (scalability).
- **Mismatch:** Hardcoded `TWO_PART_PUBLIC_SUFFIXES` require code deploys for new ccTLDs.
- **Fix:** Move public-suffix list to DB/config; load at startup with cache.

## R3 — Reciprocal detection (history, normalization, centralized)
- **Requirement:** Detect + historical lookup + centralized validation.
- **Current Implementation:** `DomainInteraction` + append-only `DomainRelationshipEvent`; single `ValidationEngine`.
- **Evidence:** `marketplace.prisma:415–516`; `domain-interaction-recorder.service.ts`.
- **Status:** Fully Implemented (logic).
- **Mismatch:** History writes are best-effort and silently swallowed (`record()` try/catch) — lost history on failure, no retry/queue.
- **Fix:** Add retry or dead-letter for interaction recording; alert on repeated failures.

## R4 — Reciprocal cooldown (Early 60–90d / Scaling 120d, configurable, mode-dependent)
- **Requirement:** Mode-dependent cooldowns; EARLY_STAGE 60–90d (suggest 90), SCALING 120d.
- **Current Implementation:** Defaults 120 for both modes; SCALING only differs via manual `preset`.
- **Evidence:** `marketplace.prisma:287–288`; `marketplace-config.service.ts:154–155`; `admin-marketplace-mode.service.ts`.
- **Status:** Partially Implemented.
- **Mismatch:** No automatic mode→cooldown mapping; EARLY_STAGE uses 120d by default (contradicts 60–90d recommendation). `preset` is unvalidated free-form JSON.
- **Fix:** In `MarketplaceConfigService.getMergedConfig`, when no explicit preset value is present, apply mode default (EARLY_STAGE ⇒ 90d reciprocal, SCALING ⇒ 120d). Validate preset schema.

## R5 — Execution flow ordering
- **Requirement:** Reciprocal validation after auth/eligibility, before matching/ranking/visibility.
- **Current Implementation:** Correct in both application and opportunity paths.
- **Evidence:** `matching.engine.ts:108–145, 305–341`; `provider-task.service.ts:488`.
- **Status:** Fully Implemented.
- **Mismatch:** None.
- **Fix:** None.

## R6 — Matching Engine consumes reciprocal restrictions before candidate generation
- **Requirement:** Invalid reciprocal opportunities excluded before matching.
- **Current Implementation:** `getCooldownBlockedPairKeys` + ordered-pair exclusion.
- **Evidence:** `matching.engine.ts:305–341`.
- **Status:** Fully Implemented.
- **Mismatch:** In-memory O(tasks × providerWebsites) — acceptable at current scale.
- **Fix:** Monitor at scale; consider pushing more filtering into DB WHERE.

## R7 — Hard constraint (never bypassed)
- **Requirement:** No bypass by relaxation/ranking/visibility/boost/low-pool/tiers/liquidity.
- **Current Implementation:** Reciprocal exclusion before all of these; only logged admin override bypasses.
- **Evidence:** `matching.engine.ts:108–145`; `visibility-control.service.ts`; `marketplace-override.service.ts`.
- **Status:** Fully Implemented.
- **Mismatch:** None unauthorized.
- **Fix:** None.

## R8 — Admin override
- **Requirement:** Override reciprocal, approve exceptions, restore opportunities, review history; permission-controlled; logged; history preserved.
- **Current Implementation:** `validateTransition` adminOverride; force-approve uses it; inspection endpoint reviews history.
- **Evidence:** `validation.engine.ts:456, 504–519, 733–748`; `admin-task.service.ts:907–919`; `admin-domain-pair-inspection.service.ts`.
- **Status:** Partially Implemented.
- **Mismatch:** Coarse permissioning (role-only, free-text note, no reciprocal-specific scope); "restore" does not re-evaluate `DomainPairStat`; no revocation.
- **Fix:** Add structured permission scope for reciprocal overrides; require `affectedDomains`; optionally re-evaluate pair stat on restore.

## R9 — Override logging
- **Requirement:** Track admin, timestamp, affected domains, restriction, justification, history.
- **Current Implementation:** `MarketplaceOverrideAudit` with adminId/websiteId/taskId/rule/reasonCode/createdAt.
- **Evidence:** `marketplace.prisma:571–584`; `validation.engine.ts:733–748`.
- **Status:** Partially Implemented.
- **Mismatch:** No `affectedDomains`; only provider websiteId (requester domain not captured); no `expiresAt`/`revokedAt`; no linkage to a revocable override entity.
- **Fix:** Add `affectedDomains String[]`, `expiresAt`, `revokedAt` to `MarketplaceOverrideAudit`; populate both domains from `validateTransition` input.

## R10 — Marketplace governance (anti-clustering / anti-exchange)
- **Requirement:** Support interaction diversity, distribution, anti-clustering, anti-exchange, balancing; prevent multi-cycle exchange.
- **Current Implementation:** Pairwise + `NETWORK_CONCENTRATION` + `NicheDistributionCap` + `forceNewDomainNext` + `PatternMonitorService` (batch detection only).
- **Evidence:** `validation.engine.ts:521–558, 668–700`; `pattern-monitor.service.ts`; `matching.engine.ts:343–405`.
- **Status:** Partially Implemented.
- **Mismatch:** `PatternMonitorService` is batch-only and does NOT block matches in real time; no verified wiring of `PatternFlag` into `validateTransition`. `persistFlag` dedupe query is incorrect/inefficient (`pattern-monitor.service.ts:578`).
- **Fix:** Wire high-severity `PatternFlag` (RECIPROCAL_RING / CLUSTER_CONCENTRATION) as a hard block in `validateTransition`; fix dedupe query; add scheduled reconciliation.

## R11 — Database support
- **Requirement:** Histories, cooldown, modes, overrides, validations, historical tracking.
- **Current Implementation:** Comprehensive schema.
- **Evidence:** `marketplace.prisma`.
- **Status:** Fully Implemented (schema).
- **Mismatch:** `MarketplaceOverrideAudit` missing `affectedDomains` + expiry; `MarketplaceValidationLog` missing `marketplaceMode`.
- **Fix:** Schema migration (see R9 / R13).

## R12 — API audit
- **Requirement:** Which APIs consume reciprocal validations; centralized.
- **Current Implementation:** provider-task, admin-task, matching.engine, domain-pair-inspection.
- **Evidence:** All above.
- **Status:** Fully Implemented.
- **Mismatch:** None architecturally.
- **Fix:** None.

## R13 — Logging
- **Requirement:** Validations, failures, overrides, modes, historical records, processing times.
- **Current Implementation:** `MarketplaceValidationLog`, `MatchingAuditLog`, `VisibilityAdjustmentLog`, `DomainRelationshipEvent`.
- **Evidence:** `marketplace.prisma`; `provider-task.service.ts:155–175`; `validation.engine.ts:813–838`.
- **Status:** Partially Implemented.
- **Mismatch:** Reciprocal validation processing time not isolated; `MarketplaceValidationLog` lacks `marketplaceMode`; failed-pair detail reduced to generic rule (by design).
- **Fix:** Add `marketplaceMode` to `MarketplaceValidationLog`; optionally time reciprocal validation separately.

## R14 — Performance
- **Requirement:** Optimized lookups, indexing, scalable cooldown.
- **Current Implementation:** Indexed pair-key lookups; append-only event table; full-table pattern scan.
- **Evidence:** `marketplace.prisma:518–550`; `pattern-monitor.service.ts:429–458`.
- **Status:** Partially Implemented.
- **Mismatch:** Unbounded `DomainRelationshipEvent`; full-table `PatternMonitor` scan; hardcoded suffix list.
- **Fix:** Add retention/aggregation for events; scope pattern scan; data-driven suffix list.

## R15 — Failure handling
- **Requirement:** Never expose "Internal Reciprocal Rule Errors".
- **Current Implementation:** Generic safe messages; best-effort logging.
- **Evidence:** `domain-interaction-recorder.service.ts:72–87`; `provider-task.service.ts:241–250`; `validation.engine.ts:732–838`.
- **Status:** Fully Implemented (user-safe).
- **Mismatch:** Silent tracking failures (governance blind spot).
- **Fix:** Add operator alerting on repeated recording failures (R3).

---

# FINAL REPORT

## 1. Reciprocal Rules Compliance Percentage
**~82%** — core reciprocal detection, root-domain normalization, execution ordering, hard-constraint isolation, matching consumption, DB schema, and failure handling are solid. Gaps are mode-mapping, real-time governance enforcement, override audit completeness, and a few scalability items.

## 2. Fully Implemented Requirements
R1, R2 (logic), R3 (logic), R5, R6, R7, R11 (schema), R12, R15.

## 3. Partially Implemented Requirements
R4 (mode mapping), R8 (permissioning/restore), R9 (logging fields), R10 (real-time governance), R13 (logging granularity), R14 (scalability).

## 4. Missing Requirements
- Automatic EARLY_STAGE (60–90d) vs SCALING (120d) reciprocal cooldown mapping (R4).
- Real-time `PatternFlag` enforcement in matching/validation (R7/R10).
- `affectedDomains` + expiry/revocation on reciprocal override audit (R9/R11).
- Structured, permission-scoped admin reciprocal overrides (R8).
- Data-driven public-suffix list (R2 scalability).

## 5. Architectural Issues Discovered
1. Responsibility separation is correct (reciprocal engine does only its assigned duties). ✅
2. Real-time vs batch gap: reciprocal pairwise = real-time (good); coordinated-exchange / reciprocal-ring = batch cron detection only, NOT enforced in `validateTransition` (violates "hard marketplace constraint" guarantee).
3. Admin override permissioning is coarse (role-only, free-text note, no structured justification/domain capture).
4. Schema gap: `MarketplaceOverrideAudit` missing `affectedDomains` + `expiresAt`/`revokedAt`.
5. Mode→cooldown not automatic: EARLY_STAGE defaults to 120d reciprocal (spec wants 60–90d); SCALING needs manual preset.

## 6. Database Changes Required
- Add `affectedDomains String[]` and `expiresAt DateTime?` / `revokedAt DateTime?` to `MarketplaceOverrideAudit`.
- Add `marketplaceMode String?` to `MarketplaceValidationLog`.
- Consider `DomainRelationshipEvent` retention/aggregation strategy.

## 7. Service Changes Required
- `ValidationEngine`: auto mode→cooldown mapping; optionally ingest `PatternFlag` for hard blocks; capture both domains in override audit.
- `MarketplaceConfigService` / `AdminMarketplaceModeService`: auto preset cooldowns per mode when no explicit preset.
- `AdminTaskService`: capture both domains in `MarketplaceOverrideAudit`.
- `PatternMonitorService`: fix dedupe query; add real-time hook or scheduled reconciliation.

## 8. API Changes Required
- Override DTO to require structured `affectedDomains` + permission scope.
- Optional admin "restore opportunity" endpoint that re-evaluates `DomainPairStat`.

## 9. Highest Priority Issues
1. Automatic mode-dependent cooldowns (R4 — spec compliance).
2. Real-time coordinated-exchange enforcement (R7/R10 — hard-constraint guarantee).
3. Override audit completeness (R9 — auditability).

## 10. Scalability Concerns
- Unbounded `DomainRelationshipEvent`.
- Full-table `PatternMonitor` scan per window.
- Hardcoded public-suffix list.
- Coarse override dedupe query.

## 11. Recommended Implementation Order
1. R4 — mode cooldowns (auto mapping).
2. R9 / R11 — audit schema (`affectedDomains` + expiry).
3. R8 — permissioned overrides (structured scope + domains).
4. R10 — real-time pattern enforcement.
5. R2 / R14 — suffix list + retention/scan optimization.

## 12. Estimated Implementation Complexity
- R4 / R9: **Low**
- R8: **Medium**
- R10 real-time enforcement: **High**
- R2 / R14 scalability: **Medium**

---

*End of Audit — Section 9 Reciprocal Rules*
