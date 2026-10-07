# BACKLYST MARKETPLACE REMEDIATION BACKLOG

This backlog outlines the required work to bring the Backlyst marketplace implementation into full compliance with all specifications. It is ordered by dependency and severity.

## Phase 1: Foundational Taxonomy and Integrity (P0)

### 1. Implement Taxonomy Schema (IP-003)
- **Dependency:** None
- **Severity:** P0
- **Action:** Create `MarketplaceCategory` and `MarketplaceTag` in `prisma/schema/marketplace.prisma`. Add relation tables `WebsiteMarketplaceTag` and `TaskMarketplaceTag`.
- **Reason:** Matching engine currently relies on legacy hardcoded strings, failing the strict exact/related/broad category requirements.

### 2. Transactional Safety on Velocity Limits (MC-006)
- **Dependency:** None
- **Severity:** P0
- **Action:** Refactor `validation.engine.ts` weekly limit evaluation to use strict PostgreSQL transactions (e.g. `Serializable` isolation or atomic row locks). 
- **Reason:** Current read-then-write logic will allow users to exceed tier limits if concurrent assignments are processed simultaneously.

## Phase 2: Core Algorithm Enforcement (P0 / P1)

### 3. Hard Niche Distribution Cap (MC-005, CR-002)
- **Dependency:** Phase 1 (Taxonomy)
- **Severity:** P0
- **Action:** Move the niche concentration logic from a soft multiplier in `ranking.service.ts` into a hard rejection rule inside `validation.engine.ts`. Ensure "maximum 40% same niche" operates at the control layer.
- **Reason:** Conflict between Quality Spec and Marketplace Control Spec; Control Spec dictates hard control.

### 4. Fully Wire Task Event Score Hooks (IP-012)
- **Dependency:** None
- **Severity:** P0
- **Action:** Ensure `scoring.service.ts` hooks into *every* state transition across the provider and requester flow (Apply, Select, Approve, Dispute, Cancel, Expire) and not just completion.
- **Reason:** Reputation logic is partially incomplete if early aborts or cancellations are missed.

### 5. Enforce Hard Filters on All Paths (IP-004)
- **Dependency:** None
- **Severity:** P0
- **Action:** Audit all assignment endpoints, specifically admin paths or internal legacy auto-assignment, to ensure they call `validation.engine.ts`.
- **Reason:** Verification filters must never be bypassed, even by internal bulk jobs.

## Phase 3: Infrastructure and Scaling (P1)

### 6. Migrate Maintenance Jobs to BullMQ (IP-013)
- **Dependency:** None
- **Severity:** P1
- **Action:** Refactor `boost-decay.cron.ts`, `opportunity-guarantee.cron.ts`, `impression-cleanup.cron.ts`, etc., from `@nestjs/schedule` to repeatable BullMQ jobs.
- **Reason:** Cron decorators do not scale in a multi-pod Kubernetes/Docker environment without Redis locking, leading to double-execution of decay logic.

### 7. Multi-Domain Control Enhancement (QC-007)
- **Dependency:** None
- **Severity:** P1
- **Action:** Extend `analytics.engine.ts` and `pattern-monitor.service.ts` to actively group interactions by `authorId` or `userId` (Account Level), not just `websiteId`.
- **Reason:** Cross-domain concentration within a single user account currently goes undetected.

## Phase 4: Observability and Quality (P1 / P2)

### 8. Comprehensive Override Audit Logging (MC-014)
- **Dependency:** None
- **Severity:** P1
- **Action:** Ensure every mutation in `marketplace-override.service.ts` generates a permanent, non-deletable audit log row including actor identity and reason.

### 9. Resolve Priority/Multiplier Conflict (CR-001)
- **Dependency:** None
- **Severity:** P2
- **Action:** Normalize `MarketplaceScoringConfig.qualityWeight` and `internalPriorityWeight`. Decide if `LOW_PRIORITY` relies exclusively on the additive score or the multiplicative scalar, and remove the other.
- **Reason:** Double penalty applied to low priority accounts.

### 10. Admin Views for Neglected Websites (IP-015)
- **Dependency:** Phase 3 (BullMQ)
- **Severity:** P2
- **Action:** Enhance `admin-dashboard.service.ts` to expose the websites flagged by the neglect-cron to administrators.
