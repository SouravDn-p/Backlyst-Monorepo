# Runtime Flow Audit

## 1. Authentication Flow
- **Session/Token Validation:** Handled by NestJS standard Passport strategies (`@UseGuards(JwtAuthGuard)`).
- **Protected Endpoint Authorization:** Handled via role decorators checking standard properties (`@Roles(Role.ADMIN)`).

## 2. Marketplace Ranking Flow
- **Opportunity Generation (`OpportunityAlertService.generateOpportunities`)**
  - → Resolves provider website profile.
  - → Checks Hard Filters (`ValidationEngine`).
  - → Executes taxonomy classification.
  - → `ScoringEngine` computes base opportunity score.
  - → `DistributionEngine` adjusts score based on network concentration (Tier Priority).
  - → Safe Pagination via Prisma.

## 3. Interaction Commit Flow (The Core Transaction)
- **Application / Acceptance (`DomainInteractionRecorderService.validateAndRecord`)**
  - → Normalizes Domains (`ValidationEngine.normalizeRootDomain`).
  - → **Transaction Begins (`$transaction`)**
    - → Pair Lock Acquired (`pg_advisory_xact_lock`).
    - → Full Validation evaluated over the locked transaction view (`ValidationEngine.validateTransition`).
      - Checks Overrides (`MarketplaceOverrideService`).
      - Checks Quota Limits.
      - Checks Niche distribution.
      - Checks Same-day clustering.
      - Checks Pattern monitors.
    - → Final `DomainInteraction` record written to DB.
    - → `DomainPairStat` created or incremented.
  - → **Transaction Commits**.

## 4. Background Maintenance Flow
- **`MarketplaceMaintenanceWorker`**
  - Triggers via BullMQ schedule.
  - Identifies obsolete Boosts (`BoostDecayService`).
  - Flags neglected websites.
  - Cleans up stale impressions (`ImpressionCleanupService`).

## Direct Prisma Write Bypasses
No operations were found that write interactions bypassing the `DomainInteractionRecorderService`. Validation and execution paths remain strictly coupled and atomic.