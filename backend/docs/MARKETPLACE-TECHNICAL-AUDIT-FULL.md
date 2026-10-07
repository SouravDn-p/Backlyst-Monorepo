# Marketplace Technical Audit Report

**Audit date:** 2026-07-15
**Auditor role:** Senior Software Architect / Backend Engineer / Marketplace Systems Expert / Technical Auditor
**Method:** Static analysis of the actual codebase only. Every finding references real files, services, controllers, methods, and database tables. No code was modified. Where a requirement could not be verified from the code, it is explicitly marked *"Not found in code."*
**Stack:** NestJS 11, Prisma 5 (PostgreSQL), BullMQ/Redis, Swagger.

---

## Scope & Architecture Overview

The marketplace lives in `src/modules/task/market-algoritm/` (folder misnamed, contains all engines), wired into `src/modules/task/provider-task`, `src/modules/task/task-requester`, and `src/modules/task/admin-task`. Engines present and **live**: `MatchingEngine`, `MatchingRelaxationEngine`, `ValidationEngine`, `TommacayRankingService`, `TommacayScoringService`, `TierEngine`, `DistributionEngine`, `MarketplaceOverrideService`, `DomainInteractionRecorderService`, `OpportunityGuaranteeCron`.

Key live call-sites verified in code:
- `provider-task.service.ts:131` → `matchingEngine.findCandidates` + `rankingService.rankAndFilter` (GET opportunities — **LIVE**)
- `provider-task.service.ts:321` → `validateTransition({ stage: 'PROVIDER_APPLICATION' })` — **LIVE**
- `task-requester.service.ts:593` → `validateTransition({ stage: 'TASK_ACCEPTANCE' })` — **LIVE**
- `task-requester.service.ts:974` → `validateTransition({ stage: 'INTERACTION_APPROVAL' })` — **LIVE**
- `admin-task.service.ts:899` → `validateTransition({ stage: 'ADMIN_FORCE' })` — **LIVE**

---

# SECTION 1 — Marketplace Eligibility

## Requirement
Website verification, ownership validation, active/deleted/suspended status, provider ownership, task eligibility, duplicate applications, own-task prevention.

### Current Implementation
- Verification gated in `ValidationEngine.getEligibleMarketplaceWebsiteIds` (validation.engine.ts:129) → requires `verificationStatus: 'VERIFIED'`, `marketplaceVisibilityStatus: 'VISIBLE'`, `isDeleted: false`, `isFlag: false`, `isWalletLock: false`.
- Ownership checked in `isWebsiteEligible` (validation.engine.ts:116) → `authorId !== userId` returns false.
- Own-task prevention in `validateTransition` LEVEL 1 (validation.engine.ts:448) → `actorUserId === task.requesterId` pushes `OWN_TASK` (skipped only for `ADMIN_FORCE`).
- Duplicate applications: `provider-task.service.ts:350` checks existing `placementApplication` and rejects.
- Active/suspended user: `isUserActive` (validation.engine.ts:99) → `status === 'ACTIVE'`.
- Website status gating: `validateTransition` LEVEL 4 (validation.engine.ts:523) → `marketplaceStatus !== 'ACTIVE'` pushes `WEBSITE_STATUS_NOT_ACTIVE`.

### Evidence
Files: `validation.engine.ts`, `provider-task.service.ts`, `task-requester.service.ts`. Models: `Website`, `WebsiteVerification`, `WebsiteMatchingProfile`.

### Status
✅ Fully Implemented

### Gap Analysis
None material. (Per-status differentiated behaviour — e.g. LOW_PRIORITY reducing visibility — is not done; see §7.)

### Recommendation
No engine change. Consider differentiating non-ACTIVE statuses behaviourally (§7).

---
