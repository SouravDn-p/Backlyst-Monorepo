# Marketplace — Remaining Tasks (from Technical Audit)

**Source report:** `docs/MARKETPLACE-AUDIT-REPORT.md` (audit date 2026-07-15)
**Purpose:** Actionable, trackable task list of everything NOT yet fully implemented. Code was not modified.
**Legend:** Complexity → Low / Medium / High / Very High. Priority P0 (do first) … P3 (later).

---

## 0. Quick Stats

- ✅ Fully done: 7 sections (§2, §3, §4, §8, §10, §21 + §1 core)
- 🟡 Partial: 13 sections
- ❌ Missing: 6 sections (+ 5 missing engines)
- ⚠ Needs refactor: 4 sections
- **Total remaining tasks below: 34**

---

## P0 — Critical Correctness / False-Assurance Fixes

| # | Task | Spec | Complexity | Evidence / Notes |
|---|------|------|-----------|------------------|
| T1 ✅ DONE | **Fix reciprocal prevention to be directional** — compare `lastSourceDomain`/`lastTargetDomain`; evaluate reciprocal cooldown only when direction reverses (use ordered pair keys), keep repeat cooldown on the sorted key. | §9 | Low | `task-requester.service.ts:230-244`; `validation.engine.ts:214-244` |
| T2 ✅ DONE | **Implement Risk calculation + decay** — compute `riskScore` from disputes/rejections/abuse flags/failed completions; decay over time. Currently always 0 → 75-threshold & penalty are dead. | §15 | Medium | `marketplace.prisma:39,175-176`; `scoring.service.ts` (no risk update); `validation.engine.ts:299,436-438`; `ranking.service.ts:41-43` |
| T3 ✅ DONE | **Wire `riskPenaltyDisputeWeight`** into the risk-penalty formula (currently only `riskPenaltyRejectionWeight` is used). | §15 | Low | `marketplace.prisma:175-176`; `ranking.service.ts:41-43` |
| T4 ✅ DONE | **Activate `MarketplaceOverride`** — create/read/revoke overrides (BOOST/SUPPRESS/FORCE_MATCH/SCORE_OVERRIDE/PENALTY) and have Matching/Ranking/Validation consume them at runtime. Model currently dead. | §27 | Medium | `marketplace.prisma:1-7,192-230`; `validation.engine.ts:343,468-483` |
| T5 ✅ DONE | **Enforce Tier/Velocity limits** — build `TierEngine`; resolve `weeklyInteractionLimit`/`tierVelocityLimit` from `PlanTier`; enforce in LEVEL 3 of `validateTransition`. Currently null-skipped. | §13, §16 | Medium | `marketplace.prisma:70-71`; `validation.engine.ts:414-424`; `enums.prisma:87-93` |

---

## P1 — High-Value Functional Gaps

| # | Task | Spec | Complexity | Evidence / Notes |
|---|------|------|-----------|------------------|
| T6 | **Distribution Engine** — compute `diversityScore`, enforce `forceNewDomainNext`/`forceNewDomainUntil`, cap network concentration. | §11 | High | `marketplace.prisma:40,43-44`; `validation.engine.ts:423,443` (deferred) |
| T7 | **Niche distribution** — add `Website.secondaryCategoryKey`; add niche-cap model + enforcement. | §12 | Medium | `website.prisma:55-56` (primary only) |
| T8 ✅ DONE | **New-user / first-success boost activation** — consume `firstSuccessBoostActive` (extra visibility/boost until first success, then clear) and `newWebsiteBoostFactor` in ranking. | §20 | Low | `marketplace.prisma:42,157`; never read in `ranking.service.ts`/`scoring.utils.ts` |
| T9 | **Dispute data model + credit ledger** — add `Dispute` model (status, reason, evidence, opened/resolved by, `creditAdjustmentId`) and make resolution write an explicit auditable credit adjustment. | §25 | Medium | No `model Dispute` in `prisma/schema`; `admin-task.service.ts:1398-1470` |
| T10 | **Marketplace modes** — add `MarketplaceModeConfig` (EARLY_STAGE/SCALING) with presets consumed by Matching/Validation. | §28 | Medium | `matching.engine.ts:82-83,98-110` (only internal `LOW_POOL`/`NORMAL`) |
| T11 | **Liquidity / admin-assisted matching** — on `LOW_POOL`, surface relaxed matches or let admins inject matches; emit `LOW_POOL` to ops. | §18 | High | `matching.engine.ts:40-110`; `opportunity-guarantee.cron.ts` |
| T12 | **Supply/demand balancing** — service that reads supply/demand from audit/analytics and adjusts visibility/boost to under-supplied segments. | §19 | High | `marketplace.prisma:127-143` (signal only, no balancing) |

---

## P2 — Visibility, Status, Quality & Trust

| # | Task | Spec | Complexity | Evidence / Notes |
|---|------|------|-----------|------------------|
| T13 | **Priority reduction** — decrement `internalPriorityScore` on exposure and feed into ranking (currently seeded, never read). | §5 | Medium | `marketplace.prisma:37`; `ranking.service.ts` (not used) |
| T14 | **Differentiate website statuses** — per-status behaviour for LOW_PRIORITY (reduce priority/visibility), LIMITED_ACCESS, UNDER_REVIEW, RESTRICTED, SUSPENDED; not just blanket `!== ACTIVE` block. | §7 | Medium | `marketplace.prisma:10-17,36`; `validation.engine.ts:298,434` |
| T15 | **Compute reliability & diversity scores** — implement in `scoring.service.ts`; wire into ranking. | §6 | Medium | `marketplace.prisma:38,40` (never computed) |
| T16 | **Behaviour-pattern tracking** — add signals (approval/reject cadence) feeding risk. | §6 | Medium | Not found in code |
| T17 | **Surface trust indicators** — expose completed/successful-interaction ratio + reliability as a user-visible trust score. | §22 | Low | `marketplace.prisma:41,46,48`; not surfaced in dashboards |
| T18 | **Automated output-quality signals** — e.g. proof validity, revision count feeding reputation/risk. | §23 | Medium | `task-requester.service.ts:1018-1280` (manual only) |

---

## P3 — API, UX, Notifications, Background Jobs, Refactor

| # | Task | Spec | Complexity | Evidence / Notes |
|---|------|------|-----------|------------------|
| T19 | **Add admin override CRUD endpoints** | §27 | Low | `admin-task.controller.ts` (none) |
| T20 | **Add manual-matching admin endpoint** | §18, §27 | Medium | Not found |
| T21 | **Add website-status management endpoint** (set `marketplaceStatus`) | §7, §27 | Low | `admin-marketplace-visibility.controller.ts` (read-only) |
| T22 | **Add priority-adjustment endpoint** | §5, §27 | Low | No write path for `internalPriorityScore` |
| T23 | **Add marketplace-mode config endpoint** | §28 | Low | Not found |
| T24 | **Add dispute CRUD/list endpoints** | §25 | Low | Buried in `admin-task/:id/action` |
| T25 | **Add niche/tier/distribution config endpoints** | §11, §12, §16 | Medium | Not found |
| T26 | **Fire `PROVIDER_NEW_OPPORTUNITY` alerts** + add reminder cron | §26 | Low | enum defined `task-notification-trigger.enum.ts:119` but never fired |
| T27 | **Return UX fallback/availability message** on empty/low-pool `GET opportunities` | §29 | Low | `matching.engine.ts:60-71` returns `[]` only |
| T28 | **Make rejection explicitly release reserved requester credits** (or document retention) | §24 | Low | `task-requester.service.ts:1090-1093` |
| T29 | **Pattern monitor cron** — cluster/group/reciprocal detection writing flags for risk engine | §14 | Very High | No `PatternMonitor` in `src` |
| T30 | **Cleanup cron** — expire `suppressedUntil`, `forceMatchNext`, `MarketplaceOverride.activeUntil`; rotate `OpportunityImpression`/`MatchingAuditLog` by `impressionRetentionDays` | BG | Medium | `marketplace.prisma:54-68,207-213` |
| T31 | **Boost-decay cron** — decrement `boostDecayCount` on schedule (currently only on task completion) | BG | Low | `scoring.service.ts`; `marketplace.prisma:54` |
| T32 | **Analytics aggregation cron** — scheduled rollups for supply/demand balancing | BG | Medium | `admin-analytics` is query-based |
| T33 | **Architecture refactor** — extract top-level `MarketplaceModule`; add Distribution/Risk/Tier/Quality/Liquidity engines; de-duplicate `recordApprovedDomainInteraction` (`task-requester.service.ts` vs `admin-task.service.ts`); rename `market-algoritm` → `marketplace`. | §30 | Very High | `validation.engine.ts:423,443` |
| T34 | **Align scoring-config DTO + schema** — make `update-scoring-config` cover actually-used fields (`newWebsiteBoostFactor`, `riskPenaltyDisputeWeight`, etc.) or remove unused fields (`exposurePenaltyPerRequesterView`, `maxRequesterExposurePerDay`, `neglectedAfterHours`, `forceMatchAfterHours`, `impressionLookbackDays`, `impressionRetentionDays` are unused). | §17, API | Low | `admin-marketplace-config/dto/update-scoring-config.dto.ts`; `marketplace.prisma:157-176` |

---

## Database Changes Required (supporting the tasks above)

| Change | For tasks |
|--------|-----------|
| Add `Dispute` model | T9 |
| Add `MarketplaceModeConfig` + `MarketplaceMode` enum | T10 |
| Add `Website.secondaryCategoryKey` relation | T7 |
| Add `NicheDistributionCap` model | T7 |
| Add `PlanTierLimit` model | T5 |
| Add `ClusterFlag` model | T29 |
| Add `@@index([requesterWebsiteId])` on `PlacementTask` | perf |
| Decide: wire or deprecate `MarketplaceOverride` | T4 |

## Suggested Execution Order (highest priority first)

1. T1 → T2 → T3 (reciprocal fix, risk calc + weight) — low/med effort, unblocks false-assurance
2. T4 (activate overrides) — unlocks real admin control
3. T5 (tier/velocity) — fairness/contractual
4. T6 + T7 (distribution + niche)
5. T8 (new-user boost — low effort win)
6. T9 (dispute model)
7. T10 + T11 + T12 (modes, liquidity, supply/demand)
8. T29 (pattern monitor) + T30/T31/T32 (crons)
9. T13–T18 (visibility/status/quality/trust)
10. T19–T28 (API/UX/notification endpoints)
11. T33 + T34 (architecture refactor + config alignment)

---

*Derived strictly from `docs/MARKETPLACE-AUDIT-REPORT.md`. No code was modified.*
