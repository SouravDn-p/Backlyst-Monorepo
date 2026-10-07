# Confirmed Gap Backlog

## Overview
This backlog organizes the remaining confirmed requirement gaps following the comprehensive remediation of Package 1.

*Note: All P0 and P1 gaps identified in the initial audits (MC-002, MC-005, MC-007, MC-008, MC-012, MC-016, IP-003, IP-014, IP-016, IP-021) were successfully implemented and are no longer in this backlog.*

## 1. P0 Correctness and Security
- **None**

## 2. P0 Data Integrity and Concurrency
- **None**

## 3. P0 Authorization and Lifecycle Bypasses
- **None**

## 4. P1 Runtime Integration
- **None**

## 5. P1 Background Processing
- **None**

## 6. P2 Scoring and UX
- **MC-006 (Domain Distribution Logic)**
  - *Exact missing behavior:* `DistributionEngine` exists but is not strictly wired into the core `OpportunityAlertService` matching loop to force network-spread scoring as a hard modifier. 
  - *Runtime consequence:* Marketplace opportunities might cluster heavily towards higher-tier websites rather than distributing impressions evenly.
  - *Files likely affected:* `distribution-engine.service.ts`, `opportunity-alert.service.ts`
  - *Estimated implementation scope:* Small. Add it to the score weighting matrix in `ScoringEngine`.

## 7. P3 Cleanup and Maintainability
- **APP-TEST-001 (PostgreSQL Integration Constraints)**
  - *Exact missing behavior:* Concurrency checks throw socket/connection errors when executed in the local test sandbox, requiring bypass mocks for full E2E local testing.
  - *Runtime consequence:* Reduces developer confidence if they cannot run lock traces locally.
  - *Files likely affected:* Docker compose configs / Jest configs.
  - *Estimated implementation scope:* Medium. Deploy a stable test container.