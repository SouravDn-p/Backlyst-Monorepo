# Backlyst Marketplace One-by-One Test Checklist
## Document identity

- **Branch:** `fix/prisma-migration-history`
- **Base commit:** `285028080233238c214cdc9231a292fda390ea1f`
- **Source state:** Base commit plus uncommitted working-tree changes
- **Verified routes:** 104
- **Verified workflows:** 77
- **Canonical requirements:** 51
- **Seed scenarios:** 67
- **Error conditions:** 198
- **State transitions:** 71
- **Canonical test cases:** 195
- **Current automation state:** `PLANNED_NOT_IMPLEMENTED`
- **Current execution state:** `NOT_EXECUTED`

## How to use this checklist

Execute exactly one test entry at a time. Do not mark an entry complete until its seed, action, response, authoritative state, negative case, and evidence fields are complete.

A route returning a non-500 status is not sufficient. A test passes only when the documented business result and all required database or API-observable side effects are correct.

## Result vocabulary

| Result | Meaning |
|---|---|
| `PASS` | All assertions and required evidence completed. |
| `FAIL` | The source-proven behavior was executed but produced an incorrect result. |
| `BLOCKED` | A listed environment, migration, seed, frontend, worker, or product blocker prevented execution. |
| `NOT_IMPLEMENTED` | The canonical requirement is absent or incomplete in source; do not count as product compliance. |
| `SKIPPED_APPROVED` | Intentionally excluded with an owner, reason, and approval. |
| `NOT_RUN` | Not yet attempted. |

## Mandatory execution gates

- [ ] **Gate 1:** Prisma migration chain passes on a new scratch PostgreSQL database.
- [ ] **Gate 2:** E2E database safety guard proves the database is disposable.
- [ ] **Gate 3:** Required requester, provider, and admin login fixtures fail setup instead of silently skipping.
- [ ] **Gate 4:** Seed factory and cleanup exist for the selected test.
- [ ] **Gate 5:** Backend health check passes.
- [ ] **Gate 6:** Redis/worker availability is known for worker-dependent tests.
- [ ] **Gate 7:** Frontend source, start command, and stable selectors exist for browser tests.
- [ ] **Gate 8:** Time/config-dependent tests use a deterministic clock and configuration snapshot.
- [ ] **Gate 9:** Failure traces, screenshots, logs, and database evidence have an output directory.
- [ ] **Gate 10:** The exact source identity and environment are recorded in the execution report.

Do not begin the full suite while a mandatory gate for the selected test is unresolved.

# Stage 1 — Authentication and actor foundations
Tests in this stage: **7**

### 001. `TC-WF-001` — Workflow: Provider password login

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_AUTH_WORKFLOW` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-001` |
| Routes | `AUTH-003`, `AUTH-004` |
| Seeds | `SEED-ACTOR-PROVIDER-A` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 002. `TC-WF-002` — Workflow: Requester password login

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_AUTH_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-002` |
| Routes | `AUTH-003`, `AUTH-004` |
| Seeds | `SEED-ACTOR-REQUESTER-A` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 003. `TC-WF-003` — Workflow: Administrator password login

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_AUTH_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-003` |
| Routes | `AUTH-003`, `AUTH-004` |
| Seeds | `SEED-ACTOR-ADMIN` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 004. `TC-WF-004` — Workflow: Logout authenticated actor

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_AUTH_WORKFLOW` |
| Actor | Provider/Requester/Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-004` |
| Routes | `AUTH-006` |
| Seeds | `SEED-ACTOR-AUTHENTICATED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 005. `TC-WF-005` — Workflow: Admin creates fixed user

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_AUTH_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-005` |
| Routes | `AUTH-005` |
| Seeds | `SEED-ACTOR-ADMIN` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 006. `TC-WF-006` — Workflow: Public registration conflict verification

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_AUTH_WORKFLOW` |
| Actor | Unauthenticated visitor |
| Requirement | Workflow-derived |
| Workflow | `WF-006` |
| Routes | `AUTH-001`, `AUTH-002` |
| Seeds | `SEED-UNUSED-EMAIL` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-003` |
| Expected result | CONFLICT_EVIDENCE |
| Business assertion | The test proves whether public self-registration is reachable. A reachable public registration flow must remain failed against the fixed-user requirement. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated registration availability versus fixed-user/no-registration requirement. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 007. `TC-WF-007` — Workflow: Google authentication callback flow

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_AUTH_WORKFLOW` |
| Actor | User |
| Requirement | Workflow-derived |
| Workflow | `WF-007` |
| Routes | `AUTH-007`, `AUTH-008`, `AUTH-004` |
| Seeds | `SEED-GOOGLE-OAUTH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P2-004` |
| Expected result | DEPENDENCY_REQUIRED |
| Business assertion | The workflow may execute only in an approved external test environment; dependency absence is reported as blocked, not passed. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Dependency unavailable, malformed provider response, timeout, cleanup. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 2 — Website registration and verification
Tests in this stage: **10**

### 008. `TC-WF-008` — Workflow: Register provider/requester website

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Provider/Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-008` |
| Routes | `WEB-001`, `WEB-003`, `WEB-007` |
| Seeds | `SEED-ACTOR-USER` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 009. `TC-WF-009` — Workflow: Update owned website

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Website owner |
| Requirement | Workflow-derived |
| Workflow | `WF-009` |
| Routes | `WEB-008`, `WEB-007` |
| Seeds | `SEED-WEBSITE-OWNED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005` |
| Expected result | 2xx_OWNER_AND_401_403_NON_OWNER |
| Business assertion | The valid owner can perform the workflow; unauthenticated and unauthorized actors are rejected without information leakage or mutation. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Missing token, wrong role, wrong owner, deleted/disabled actor. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 010. `TC-WF-010` — Workflow: Delete owned website

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Website owner |
| Requirement | Workflow-derived |
| Workflow | `WF-010` |
| Routes | `WEB-009` |
| Seeds | `SEED-WEBSITE-OWNED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005` |
| Expected result | 2xx_OWNER_AND_401_403_NON_OWNER |
| Business assertion | The valid owner can perform the workflow; unauthenticated and unauthorized actors are rejected without information leakage or mutation. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Missing token, wrong role, wrong owner, deleted/disabled actor. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 011. `TC-WF-011` — Workflow: Request DNS verification

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Website owner |
| Requirement | Workflow-derived |
| Workflow | `WF-011` |
| Routes | `VERIFY-006`, `VERIFY-003`, `VERIFY-002` |
| Seeds | `SEED-WEBSITE-UNVERIFIED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P1-016` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 012. `TC-WF-012` — Workflow: Request meta-tag verification

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Website owner |
| Requirement | Workflow-derived |
| Workflow | `WF-012` |
| Routes | `VERIFY-004`, `VERIFY-005`, `VERIFY-003`, `VERIFY-002` |
| Seeds | `SEED-WEBSITE-UNVERIFIED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P1-016` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 013. `TC-WF-013` — Workflow: Request screenshot verification

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Website owner |
| Requirement | Workflow-derived |
| Workflow | `WF-013` |
| Routes | `VERIFY-001`, `VERIFY-003`, `VERIFY-002` |
| Seeds | `SEED-WEBSITE-UNVERIFIED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 014. `TC-WF-014` — Workflow: Request manual verification review

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Website owner |
| Requirement | Workflow-derived |
| Workflow | `WF-014` |
| Routes | `VERIFY-007`, `VERIFY-003` |
| Seeds | `SEED-VERIFICATION-FAILED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P3-001` |
| Expected result | RUNTIME_ROUTE_REGISTRATION_CHECK |
| Business assertion | The route is registered exactly once at runtime and behaves consistently; the duplicate source decorator remains a separately tracked defect. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Duplicate route metadata and duplicate runtime registration. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 015. `TC-WF-015` — Workflow: Admin approves verification

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-015` |
| Routes | `ADMIN-VERIFY-005`, `ADMIN-VERIFY-006`, `ADMIN-VERIFY-001` |
| Seeds | `SEED-VERIFICATION-PENDING` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 016. `TC-WF-016` — Workflow: Admin rejects verification

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-016` |
| Routes | `ADMIN-VERIFY-005`, `ADMIN-VERIFY-006`, `ADMIN-VERIFY-002` |
| Seeds | `SEED-VERIFICATION-PENDING` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 017. `TC-WF-017` — Workflow: Admin force re-verification

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-017` |
| Routes | `ADMIN-VERIFY-009`, `ADMIN-VERIFY-005` |
| Seeds | `SEED-WEBSITE-VERIFIED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 3 — Requester task creation and setup
Tests in this stage: **5**

### 018. `TC-WF-018` — Workflow: Requester obtains MOZ stats before task creation

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-018` |
| Routes | `REQUESTER-001` |
| Seeds | `SEED-ACTOR-REQUESTER-A` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P2-005` |
| Expected result | CONTROLLED_DEPENDENCY_RESULT |
| Business assertion | The controlled dependency returns the expected contract; dependency outages are reported explicitly and are not confused with marketplace business failures. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Dependency unavailable, malformed provider response, timeout, cleanup. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 019. `TC-WF-019` — Workflow: Requester creates marketplace task

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-019` |
| Routes | `REQUESTER-002`, `REQUESTER-003`, `REQUESTER-008` |
| Seeds | `SEED-REQUESTER-WEBSITE-CREDITS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-008` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 020. `TC-WF-020` — Workflow: Requester lists and filters own tasks

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-020` |
| Routes | `REQUESTER-003` |
| Seeds | `SEED-REQUESTER-MULTI-STATUS-TASKS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 021. `TC-WF-021` — Workflow: Requester reads task details and timeline

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-021` |
| Routes | `REQUESTER-008`, `REQUESTER-009` |
| Seeds | `SEED-TASK-REQUESTER-OWNED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_OWNER_AND_401_403_NON_OWNER |
| Business assertion | The valid owner can perform the workflow; unauthenticated and unauthorized actors are rejected without information leakage or mutation. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Missing token, wrong role, wrong owner, deleted/disabled actor. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 022. `TC-WF-022` — Workflow: Requester updates pre-selection deadline

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-022` |
| Routes | `REQUESTER-010`, `REQUESTER-008` |
| Seeds | `SEED-TASK-OPEN-NO-SELECTION` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 4 — Provider opportunity discovery and matching
Tests in this stage: **13**

### 023. `TC-WF-023` — Workflow: Provider discovers opportunities

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-023` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MARKETPLACE-NORMAL-SUPPLY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004`, `BLK-P1-016` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 024. `TC-WF-024` — Workflow: Hard eligibility filtering

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-024` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004`, `BLK-P1-016` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 025. `TC-WF-025` — Workflow: Exact-category matching

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-025` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MATCH-EXACT-CATEGORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-003`, `BLK-P1-008`, `BLK-P0-008`, `BLK-P1-004` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 026. `TC-WF-026` — Workflow: Related-category matching

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-026` |
| Routes | `PROVIDER-001`, `ADMIN-TAX-007` |
| Seeds | `SEED-MATCH-RELATED-CATEGORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-003`, `BLK-P1-008`, `BLK-P0-008`, `BLK-P1-004` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 027. `TC-WF-027` — Workflow: Broad-category fallback

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-027` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-MATCH-BROAD-CATEGORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-003`, `BLK-P1-008`, `BLK-P0-008`, `BLK-P1-004` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 028. `TC-WF-028` — Workflow: Low-pool progressive relaxation

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-028` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-MODE-001` |
| Seeds | `SEED-MARKETPLACE-LOW-SUPPLY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-003`, `BLK-P0-008`, `BLK-P1-016`, `BLK-P1-004` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 029. `TC-WF-029` — Workflow: Safe empty marketplace result

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-029` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MARKETPLACE-NO-VALID-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 030. `TC-WF-030` — Workflow: Opportunity filter and pagination stability

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-030` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MARKETPLACE-PAGINATED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 031. `TC-WF-031` — Workflow: Opportunity scoring and deterministic ranking

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-031` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-003`, `BLK-P1-009`, `BLK-P1-016`, `BLK-P1-013`, `BLK-P1-008`, `BLK-P2-009` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 032. `TC-WF-032` — Workflow: Impression logging and exposure penalty

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-032` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-IMPRESSION-THRESHOLD` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-013`, `BLK-P1-003`, `BLK-P1-016`, `BLK-P0-008`, `BLK-P1-004` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 033. `TC-WF-033` — Workflow: Visibility and quality effects

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-033` |
| Routes | `PROVIDER-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-009`, `BLK-P1-016`, `BLK-P2-010`, `BLK-P1-003`, `BLK-P2-009` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 034. `TC-WF-034` — Workflow: Boost, suppression and force-match effects

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_INTEGRATION` |
| Actor | Admin/Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-034` |
| Routes | `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `PROVIDER-001`, `ADMIN-OVERRIDE-003` |
| Seeds | `SEED-OVERRIDE-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004`, `BLK-P1-013`, `BLK-P1-016`, `BLK-P1-011` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 035. `TC-WF-035` — Workflow: Provider reads opportunity detail

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-035` |
| Routes | `PROVIDER-003` |
| Seeds | `SEED-TASK-OPEN-VISIBLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | 2xx_OWNER_AND_401_403_NON_OWNER |
| Business assertion | The valid owner can perform the workflow; unauthenticated and unauthorized actors are rejected without information leakage or mutation. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Missing token, wrong role, wrong owner, deleted/disabled actor. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 5 — Application, assignment, work, and completion
Tests in this stage: **13**

### 036. `TC-WF-036` — Workflow: Provider applies to eligible task

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_WORKFLOW` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-036` |
| Routes | `PROVIDER-004`, `PROVIDER-002`, `REQUESTER-004` |
| Seeds | `SEED-TASK-OPEN-ELIGIBLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P1-011`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-012` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 037. `TC-WF-037` — Workflow: Duplicate application prevention

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `SERVICE_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-037` |
| Routes | `PROVIDER-004` |
| Seeds | `SEED-TASK-ALREADY-APPLIED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-003` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 038. `TC-WF-038` — Workflow: Own-task application exclusion

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `SERVICE_INTEGRATION` |
| Actor | Provider/Requester same account |
| Requirement | Workflow-derived |
| Workflow | `WF-038` |
| Routes | `PROVIDER-001`, `PROVIDER-004` |
| Seeds | `SEED-TASK-OWNED-BY-PROVIDER-ACTOR` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-003` |
| Expected result | RULE_RESULT_AND_OBSERVABLE_EVIDENCE |
| Business assertion | Controlled candidates produce the expected eligibility, scoring, visibility, or database-observable effect without exposing internal rule names. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 039. `TC-WF-039` — Workflow: Requester reviews applicants and provider trust

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-039` |
| Routes | `REQUESTER-004`, `REQUESTER-013` |
| Seeds | `SEED-TASK-WITH-APPLICANTS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-009` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 040. `TC-WF-040` — Workflow: Requester selects provider

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-040` |
| Routes | `REQUESTER-005`, `REQUESTER-008`, `PROVIDER-002` |
| Seeds | `SEED-TASK-WITH-ELIGIBLE-APPLICANT` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P1-011`, `BLK-P0-008`, `BLK-P1-012` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 041. `TC-WF-041` — Workflow: Provider starts work

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-041` |
| Routes | `PROVIDER-006`, `PROVIDER-002` |
| Seeds | `SEED-TASK-PROVIDER-SELECTED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 042. `TC-WF-042` — Workflow: Provider requests deadline extension

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-042` |
| Routes | `PROVIDER-005`, `REQUESTER-008` |
| Seeds | `SEED-TASK-IN-PROGRESS-DEADLINE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 043. `TC-WF-043` — Workflow: Requester responds to provider deadline request

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-043` |
| Routes | `REQUESTER-012`, `REQUESTER-008` |
| Seeds | `SEED-DEADLINE-REQUEST-PENDING` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 044. `TC-WF-044` — Workflow: Requester directly extends selected-provider deadline

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-044` |
| Routes | `REQUESTER-011`, `REQUESTER-008` |
| Seeds | `SEED-TASK-ACTIVE-SELECTED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 045. `TC-WF-045` — Workflow: Provider submits completion

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-045` |
| Routes | `PROVIDER-008`, `REQUESTER-008`, `REQUESTER-009` |
| Seeds | `SEED-TASK-IN-PROGRESS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P2-006` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 046. `TC-WF-046` — Workflow: Requester requests revision

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-046` |
| Routes | `REQUESTER-007`, `PROVIDER-002`, `REQUESTER-009` |
| Seeds | `SEED-TASK-SUBMITTED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 047. `TC-WF-047` — Workflow: Provider resubmits revised completion

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-047` |
| Routes | `PROVIDER-009`, `REQUESTER-008`, `REQUESTER-009` |
| Seeds | `SEED-TASK-REVISION-REQUESTED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P2-006` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 048. `TC-WF-048` — Workflow: Requester approves completion

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-048` |
| Routes | `REQUESTER-007`, `REQUESTER-014`, `REQUESTER-008`, `REQUESTER-009` |
| Seeds | `SEED-TASK-SUBMITTED-APPROVABLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P1-011`, `BLK-P0-008`, `BLK-P1-012`, `BLK-P1-003`, `BLK-P2-009` |
| Expected result | 2xx_PLUS_ATOMIC_SIDE_EFFECTS |
| Business assertion | The route succeeds and all credits, flows, timestamps, notifications, quality, application, dispute, and interaction effects are atomically correct. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Rollback, duplicate credit/reward/interaction, missing flow/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 6 — Disputes, cancellation, and completion aftermath
Tests in this stage: **6**

### 049. `TC-WF-049` — Workflow: Requester rejects completion into dispute state

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-049` |
| Routes | `REQUESTER-007`, `DISPUTE-002` |
| Seeds | `SEED-TASK-SUBMITTED-REJECTABLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012` |
| Expected result | 2xx_PLUS_ATOMIC_SIDE_EFFECTS |
| Business assertion | The route succeeds and all credits, flows, timestamps, notifications, quality, application, dispute, and interaction effects are atomically correct. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Rollback, duplicate credit/reward/interaction, missing flow/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 050. `TC-WF-050` — Workflow: Requester cancels task before provider selection

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-050` |
| Routes | `REQUESTER-006`, `REQUESTER-008` |
| Seeds | `SEED-TASK-OPEN-NO-SELECTION` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 051. `TC-WF-051` — Workflow: Requester cancellation request after selection

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester/Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-051` |
| Routes | `REQUESTER-006`, `PROVIDER-007`, `REQUESTER-008`, `REQUESTER-009` |
| Seeds | `SEED-TASK-SELECTED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012` |
| Expected result | 2xx_VALID_AND_DOCUMENTED_4xx_INVALID |
| Business assertion | The valid transition succeeds; invalid state, repeat action, wrong actor, and stale-data cases return documented 4xx responses without partial state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Illegal pre-state, stale transition, repeat action, invalid action value. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 052. `TC-WF-052` — Workflow: Task expiry and deadline buckets

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Provider/Requester |
| Requirement | Workflow-derived |
| Workflow | `WF-052` |
| Routes | `PROVIDER-010`, `PROVIDER-002`, `REQUESTER-003` |
| Seeds | `SEED-TASK-DEADLINE-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-015`, `BLK-P1-016` |
| Expected result | INTERNAL_PATH_REQUIRED |
| Business assertion | Only the source-proven internal or maintenance path is tested. No direct public mutation route is claimed. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 053. `TC-WF-053` — Workflow: Open and list dispute

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Requester/Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-053` |
| Routes | `DISPUTE-001`, `DISPUTE-002` |
| Seeds | `SEED-TASK-DISPUTABLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012` |
| Expected result | 2xx_OWNER_AND_401_403_NON_OWNER |
| Business assertion | The valid owner can perform the workflow; unauthenticated and unauthorized actors are rejected without information leakage or mutation. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Missing token, wrong role, wrong owner, deleted/disabled actor. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 054. `TC-WF-054` — Workflow: Admin resolves dispute

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-054` |
| Routes | `DISPUTE-002`, `DISPUTE-003`, `DISPUTE-002` |
| Seeds | `SEED-DISPUTE-OPEN` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012` |
| Expected result | 2xx_PLUS_ATOMIC_SIDE_EFFECTS |
| Business assertion | The route succeeds and all credits, flows, timestamps, notifications, quality, application, dispute, and interaction effects are atomically correct. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Rollback, duplicate credit/reward/interaction, missing flow/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 7 — Admin configuration, controls, and taxonomy
Tests in this stage: **14**

### 055. `TC-WF-055` — Workflow: Admin reads and updates marketplace config

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-055` |
| Routes | `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-ACTOR-ADMIN` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-013`, `BLK-P1-009`, `BLK-P1-003`, `BLK-P2-009` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 056. `TC-WF-056` — Workflow: Admin changes marketplace mode

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-056` |
| Routes | `ADMIN-MODE-001`, `ADMIN-MODE-002`, `ADMIN-MODE-001` |
| Seeds | `SEED-ACTOR-ADMIN` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-009`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-013` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 057. `TC-WF-057` — Workflow: Admin manages override lifecycle

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-057` |
| Routes | `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003`, `ADMIN-OVERRIDE-002` |
| Seeds | `SEED-OVERRIDE-TARGET-WEBSITE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-013`, `BLK-P1-009`, `BLK-P1-016`, `BLK-P1-011` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 058. `TC-WF-058` — Workflow: Admin manages niche caps

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-058` |
| Routes | `ADMIN-NICHE-001`, `ADMIN-NICHE-002`, `ADMIN-NICHE-003`, `ADMIN-NICHE-004`, `ADMIN-NICHE-001` |
| Seeds | `SEED-NICHE-CAP-SCOPE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-008` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 059. `TC-WF-059` — Workflow: Admin manages categories, tags and relations

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-059` |
| Routes | `ADMIN-TAX-001`, `ADMIN-TAX-002`, `ADMIN-TAX-003`, `ADMIN-TAX-004`, `ADMIN-TAX-005`, `ADMIN-TAX-006`, `ADMIN-TAX-007` |
| Seeds | `SEED-TAXONOMY-BASE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-008` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 060. `TC-WF-060` — Workflow: Admin inspects domain pair

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-060` |
| Routes | `ADMIN-PAIR-001` |
| Seeds | `SEED-DOMAIN-PAIR-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012`, `BLK-P1-013`, `BLK-P1-009`, `BLK-P0-005` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 061. `TC-WF-061` — Workflow: Admin manual match queue lifecycle

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-061` |
| Routes | `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003`, `ADMIN-MATCH-001` |
| Seeds | `SEED-MANUAL-MATCH-CANDIDATE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-009`, `BLK-P1-013` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 062. `TC-WF-062` — Workflow: Admin sets website marketplace status and tier limits

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-062` |
| Routes | `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-002`, `ADMIN-VIS-001` |
| Seeds | `SEED-WEBSITE-VERIFIED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-009`, `BLK-P1-003`, `BLK-P1-013`, `BLK-P1-011` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 063. `TC-WF-063` — Workflow: Admin reviews and recomputes website quality

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-063` |
| Routes | `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-007`, `ADMIN-WEBSTAT-006`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-009`, `BLK-P1-016`, `BLK-P2-010`, `BLK-P1-003`, `BLK-P1-012`, `BLK-P2-009` |
| Expected result | 2xx_PLUS_ATOMIC_SIDE_EFFECTS |
| Business assertion | The route succeeds and all credits, flows, timestamps, notifications, quality, application, dispute, and interaction effects are atomically correct. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Rollback, duplicate credit/reward/interaction, missing flow/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 064. `TC-WF-064` — Workflow: Admin resets website quality score

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-064` |
| Routes | `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-005`, `ADMIN-WEBSTAT-004` |
| Seeds | `SEED-WEBSITE-QUALITY-DEGRADED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-016`, `BLK-P2-010`, `BLK-P1-009` |
| Expected result | 2xx_PLUS_ATOMIC_SIDE_EFFECTS |
| Business assertion | The route succeeds and all credits, flows, timestamps, notifications, quality, application, dispute, and interaction effects are atomically correct. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Rollback, duplicate credit/reward/interaction, missing flow/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 065. `TC-WF-065` — Workflow: Admin reviews and resolves pattern flags

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-065` |
| Routes | `ADMIN-ANALYTICS-003`, `ADMIN-ANALYTICS-004`, `ADMIN-ANALYTICS-003` |
| Seeds | `SEED-PATTERN-FLAGS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-009`, `BLK-P1-013`, `BLK-P1-011` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 066. `TC-WF-066` — Workflow: Admin marketplace analytics and liquidity

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-066` |
| Routes | `ADMIN-ANALYTICS-001`, `ADMIN-ANALYTICS-005`, `ADMIN-ANALYTICS-006` |
| Seeds | `SEED-MARKETPLACE-ANALYTICS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-003`, `BLK-P1-009`, `BLK-P1-016` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 067. `TC-WF-067` — Workflow: Admin marketplace health check

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-067` |
| Routes | `ADMIN-HEALTH-001` |
| Seeds | `SEED-MARKETPLACE-HEALTH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-016`, `BLK-P2-010` |
| Expected result | CONTROLLED_DEPENDENCY_RESULT |
| Business assertion | The controlled dependency returns the expected contract; dependency outages are reported explicitly and are not confused with marketplace business failures. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Dependency unavailable, malformed provider response, timeout, cleanup. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 068. `TC-WF-068` — Workflow: Admin task oversight and action

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_ADMIN_WORKFLOW` |
| Actor | Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-068` |
| Routes | `ADMIN-TASK-001`, `ADMIN-TASK-002`, `ADMIN-TASK-003`, `ADMIN-TASK-004`, `ADMIN-TASK-005`, `ADMIN-TASK-006` |
| Seeds | `SEED-TASK-LIFECYCLE-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007` |
| Expected result | 2xx_VALID_PATH_AND_DOCUMENTED_NEGATIVE_MATRIX |
| Business assertion | The route sequence completes with the documented global response envelope, correct read-back, and no unexpected server error. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 8 — Algorithm rule matrices
Tests in this stage: **8**

### 069. `TC-WF-069` — Workflow: Repeat-pair cooldown

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-069` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-COOLDOWN-ACTIVE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-012`, `BLK-P1-009`, `BLK-P2-007`, `BLK-P1-011`, `BLK-P0-008` |
| Expected result | RULE_RESULT_PLUS_DATABASE_INVARIANTS |
| Business assertion | Controlled data produces the expected allowed or blocked decision and preserves all pair, quota, pattern, and audit invariants. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 070. `TC-WF-070` — Workflow: Reciprocal pair restriction

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-070` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-RECIPROCAL-ACTIVE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-012`, `BLK-P1-009`, `BLK-P2-007`, `BLK-P1-011`, `BLK-P0-008` |
| Expected result | RULE_RESULT_PLUS_DATABASE_INVARIANTS |
| Business assertion | Controlled data produces the expected allowed or blocked decision and preserves all pair, quota, pattern, and audit invariants. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 071. `TC-WF-071` — Workflow: Weekly interaction quota

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-071` |
| Routes | `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P2-007`, `BLK-P1-011`, `BLK-P0-008` |
| Expected result | RULE_RESULT_PLUS_DATABASE_INVARIANTS |
| Business assertion | Controlled data produces the expected allowed or blocked decision and preserves all pair, quota, pattern, and audit invariants. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 072. `TC-WF-072` — Workflow: Same-day clustering restriction

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-072` |
| Routes | `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-SAME-DAY-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P2-007`, `BLK-P1-011`, `BLK-P0-008` |
| Expected result | RULE_RESULT_PLUS_DATABASE_INVARIANTS |
| Business assertion | Controlled data produces the expected allowed or blocked decision and preserves all pair, quota, pattern, and audit invariants. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 073. `TC-WF-073` — Workflow: Niche distribution restriction

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-073` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-NICHE-001` |
| Seeds | `SEED-NICHE-DISTRIBUTION-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P1-008`, `BLK-P1-011`, `BLK-P2-007`, `BLK-P0-008` |
| Expected result | RULE_RESULT_PLUS_DATABASE_INVARIANTS |
| Business assertion | Controlled data produces the expected allowed or blocked decision and preserves all pair, quota, pattern, and audit invariants. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 074. `TC-WF-074` — Workflow: Pattern-flag marketplace effect

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-ANALYTICS-003` |
| Seeds | `SEED-PATTERN-MEDIUM-HIGH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P0-005`, `BLK-P1-009`, `BLK-P1-011`, `BLK-P2-007`, `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-013` |
| Expected result | RULE_RESULT_PLUS_DATABASE_INVARIANTS |
| Business assertion | Controlled data produces the expected allowed or blocked decision and preserves all pair, quota, pattern, and audit invariants. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Allowed/blocked matrix, deterministic order, safe public message set, hidden internals. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 075. `TC-WF-075` — Workflow: Concurrent final quota slot

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-075` |
| Routes | `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-WEEKLY-ONE-SLOT-LEFT` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012`, `BLK-P0-005`, `BLK-P2-007`, `BLK-P0-008` |
| Expected result | POLICY_ALLOWED_WINNERS_AND_NO_PARTIAL_STATE |
| Business assertion | Parallel requests produce exactly the policy-allowed winners, stable business rejections, no unexpected 500/503, and no partial failed-request state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Race conditions, duplicate effects, quota bypass, deadlocks, and partial writes. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 076. `TC-WF-076` — Workflow: Concurrent repeat and reciprocal pair races

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider |
| Requirement | Workflow-derived |
| Workflow | `WF-076` |
| Routes | `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-012`, `BLK-P0-005`, `BLK-P2-007`, `BLK-P0-008` |
| Expected result | POLICY_ALLOWED_WINNERS_AND_NO_PARTIAL_STATE |
| Business assertion | Parallel requests produce exactly the policy-allowed winners, stable business rejections, no unexpected 500/503, and no partial failed-request state. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Race conditions, duplicate effects, quota bypass, deadlocks, and partial writes. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 9 — Maintenance and worker execution
Tests in this stage: **1**

### 077. `TC-WF-077` — Workflow: Background marketplace maintenance effects

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `WORKER_JOB` |
| Actor | Internal/Admin |
| Requirement | Workflow-derived |
| Workflow | `WF-077` |
| Routes | `ADMIN-HEALTH-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-002`, `BLK-P0-007`, `BLK-P1-016`, `BLK-P2-010`, `BLK-P1-013`, `BLK-P1-003`, `BLK-P1-015` |
| Expected result | INTERNAL_PATH_REQUIRED |
| Business assertion | Only the source-proven internal or maintenance path is tested. No direct public mutation route is claimed. |
| State/side effects | Assert final state, timestamps, ownership, TaskFlow/audit history, related records, credits/rewards, notifications, quality, visibility, and interaction effects when applicable. |
| Negative focus | Unauthenticated, unauthorized, malformed input, unknown fields, not-found, and repeat request. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 10 — API contracts and security
Tests in this stage: **43**

### 078. `REQ-MC-001-API` — MC-001 API_CONTRACT: Track interactions, control frequency/repetition, prevent over-concentration, distribute interactions, enforce tier limits, operate independently of user intent.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-001` |
| Workflow | `WF-023`, `WF-024`, `WF-031`, `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-DOMAIN-PAIR-HISTORY`, `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-WEEKLY-QUOTA-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-005`, `BLK-P0-007` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 079. `REQ-MC-003-API` — MC-003 API_CONTRACT: Execute at match generation, application/accept, and before final approval. No interaction can complete without passing validation.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-003` |
| Workflow | `WF-023`, `WF-024`, `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-TASK-OPEN-ELIGIBLE`, `SEED-TASK-SUBMITTED-APPROVABLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-007`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 080. `REQ-MC-004-API` — MC-004 API_CONTRACT: If Domain A interacts with B, B must not interact with A within window (Early: 60-90 days, Scaling: 120 days).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider |
| Requirement | `MC-004` |
| Workflow | `WF-070`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-RECIPROCAL-ACTIVE`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 081. `REQ-MC-005-API` — MC-005 API_CONTRACT: Same two domains must not interact again within: Early 60-90 days, Scaling 90 days. Regardless of content.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider |
| Requirement | `MC-005` |
| Workflow | `WF-069`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-COOLDOWN-ACTIVE`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 082. `REQ-MC-006-API` — MC-006 API_CONTRACT: Prioritise spreading interactions, reduce repeated pairings, prioritise not recently used, avoid concentration.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `MC-006` |
| Workflow | `WF-031`, `WF-066` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-ANALYTICS-001`, `ADMIN-ANALYTICS-005` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-MARKETPLACE-ANALYTICS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 083. `REQ-MC-007-API` — MC-007 API_CONTRACT: Max 40% interactions within same niche. Min 60% adjacent or broader niches.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Admin/Provider |
| Requirement | `MC-007` |
| Workflow | `WF-058`, `WF-073` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-NICHE-001`, `ADMIN-NICHE-002`, `ADMIN-NICHE-003`, `ADMIN-NICHE-004` |
| Seeds | `SEED-NICHE-CAP-SCOPE`, `SEED-NICHE-DISTRIBUTION-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-008` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 084. `REQ-MC-008-API` — MC-008 API_CONTRACT: Early: 1-3/week. Scaling: max 5/week. No same-day clustering. Distribute over time.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider |
| Requirement | `MC-008` |
| Workflow | `WF-071`, `WF-072`, `WF-075` |
| Routes | `PROVIDER-004`, `ADMIN-CONFIG-001`, `ADMIN-WEBSTAT-002`, `ADMIN-PAIR-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-WEEKLY-ONE-SLOT-LEFT`, `SEED-SAME-DAY-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 085. `REQ-MC-009-API` — MC-009 API_CONTRACT: Detect repeated interactions, reciprocal patterns, concentration, over-reliance. Reduce priority, restrict new interactions.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_CONTRACT` |
| Actor | Admin/Provider |
| Requirement | `MC-009` |
| Workflow | `WF-065`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-ANALYTICS-003`, `ADMIN-ANALYTICS-004` |
| Seeds | `SEED-PATTERN-FLAGS`, `SEED-PATTERN-MEDIUM-HIGH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 086. `REQ-MC-010-API` — MC-010 API_CONTRACT: Dynamic score based on frequency, unique domains, velocity. Exceeding threshold reduces visibility, limits approvals, prioritises diversification.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `MC-010` |
| Workflow | `WF-033`, `WF-063`, `WF-065`, `WF-066`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007`, `ADMIN-ANALYTICS-003` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-PATTERN-MEDIUM-HIGH`, `SEED-MARKETPLACE-ANALYTICS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 087. `REQ-MC-011-API` — MC-011 API_CONTRACT: Control final match assignment. Override preferences if violated. Users must never directly select unrestricted partners.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-011` |
| Workflow | `WF-023`, `WF-040`, `WF-061` |
| Routes | `PROVIDER-001`, `REQUESTER-005`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003` |
| Seeds | `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-TASK-WITH-ELIGIBLE-APPLICANT` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 088. `REQ-MC-012-API` — MC-012 API_CONTRACT: Before approving, validate reciprocal, repeat pair, domain distribution, niche, velocity, pattern flags, risk score. Reject or return alternatives.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-012` |
| Workflow | `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001` |
| Seeds | `SEED-TASK-OPEN-ELIGIBLE`, `SEED-TASK-SUBMITTED-APPROVABLE`, `SEED-DOMAIN-PAIR-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P1-011` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 089. `REQ-MC-013-API` — MC-013 API_CONTRACT: Free (max 2/wk, low priority), Silver (max 3/wk, medium), Gold (max 4/wk, high), Platinum (max 5/wk, high), Enterprise (max 5/wk PER DOMAIN).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `MC-013` |
| Workflow | `WF-023`, `WF-031`, `WF-062` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-002`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS`, `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 090. `REQ-MC-016-API` — MC-016 API_CONTRACT: Admin can override reciprocal, cooldowns, weekly limits, risk, manually assign, adjust scoring. All must be logged.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Admin |
| Requirement | `MC-016` |
| Workflow | `WF-055`, `WF-057`, `WF-060`, `WF-061` |
| Routes | `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003`, `ADMIN-PAIR-001` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-DOMAIN-PAIR-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-013`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 091. `REQ-MC-017-API` — MC-017 API_CONTRACT: Support low user volume: 1-3 limit, 60-90 days reciprocity, manual matching. Admin distributes and prevents clustering.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_CONTRACT` |
| Actor | Admin/Provider |
| Requirement | `MC-017` |
| Workflow | `WF-056`, `WF-061`, `WF-072` |
| Routes | `ADMIN-MODE-001`, `ADMIN-MODE-002`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002` |
| Seeds | `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-SAME-DAY-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 092. `REQ-MC-018-API` — MC-018 API_CONTRACT: Configurable transition to scale: 120 days reciprocity, max 5 limit, fully automated, stricter distribution.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_CONTRACT` |
| Actor | Admin/Provider |
| Requirement | `MC-018` |
| Workflow | `WF-056`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073` |
| Routes | `ADMIN-MODE-001`, `ADMIN-MODE-002`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `PROVIDER-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-PAIR-RECIPROCAL-ACTIVE`, `SEED-NICHE-DISTRIBUTION-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 093. `REQ-MC-019-API` — MC-019 API_CONTRACT: Show valid options, hide restricted/blocked, guide to valid matches. Users must not see internal restrictions.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `MC-019` |
| Workflow | `WF-023`, `WF-024`, `WF-029`, `WF-030`, `WF-034`, `WF-035` |
| Routes | `PROVIDER-001`, `PROVIDER-003` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-MARKETPLACE-NO-VALID-CANDIDATES`, `SEED-OVERRIDE-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 094. `REQ-QC-002-API` — QC-002 API_CONTRACT: Status field: Active (default), Low Priority, Limited Access, Under Review, Restricted, Suspended (admin).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `API_CONTRACT` |
| Actor | Admin |
| Requirement | `QC-002` |
| Workflow | `WF-062`, `WF-063`, `WF-064` |
| Routes | `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-007`, `ADMIN-VIS-001` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 095. `REQ-QC-003-API` — QC-003 API_CONTRACT: Add internal score variable. NOT visible to users. Used ONLY for sorting matches, adjusting visibility. Inputs: completion, activity, niche clarity, diversity, patterns.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `QC-003` |
| Workflow | `WF-031`, `WF-033`, `WF-063`, `WF-066` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007`, `ADMIN-ANALYTICS-005` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 096. `REQ-QC-004-API` — QC-004 API_CONTRACT: NON-DESTRUCTIVE. Do NOT remove websites. Increase for high-score, decrease for low-score via ordering weight and frequency control.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `QC-004` |
| Workflow | `WF-033`, `WF-062`, `WF-063` |
| Routes | `PROVIDER-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-006` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 097. `REQ-QC-006-API` — QC-006 API_CONTRACT: No hard blocks for low-quality. Reduce frequency/visibility/access. Escalate to Restricted/Suspended if repeated negative behavior.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `QC-006` |
| Workflow | `WF-033`, `WF-062`, `WF-063`, `WF-064` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-006` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS`, `SEED-WEBSITE-QUALITY-DEGRADED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 098. `REQ-QC-007-API` — QC-007 API_CONTRACT: If insufficient matches: relax niche strictness, increase visibility of lower-priority, allow broader matching. Trigger: low count or admin. Avoid empty UX.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `QC-007` |
| Workflow | `WF-028`, `WF-029`, `WF-056` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-MODE-001`, `ADMIN-MODE-002` |
| Seeds | `SEED-MARKETPLACE-LOW-SUPPLY`, `SEED-MARKETPLACE-NO-VALID-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 099. `REQ-QC-008-API` — QC-008 API_CONTRACT: Do NOT block multi-domain users. Track interactions across all domains, detect repeated external pairings. Apply priority/visibility reduction.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Requester/Website owner/Admin |
| Requirement | `QC-008` |
| Workflow | `WF-008`, `WF-009`, `WF-010`, `WF-060`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-075`, `WF-076` |
| Routes | `WEB-001`, `WEB-003`, `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-ACTOR-PROVIDER-A`, `SEED-DOMAIN-PAIR-HISTORY`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P0-005` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 100. `REQ-QC-009-API` — QC-009 API_CONTRACT: Adjust status, override priority, manually assign, apply/remove restrictions, enable low-pool, review flagged. All logged.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Admin |
| Requirement | `QC-009` |
| Workflow | `WF-056`, `WF-057`, `WF-061`, `WF-062`, `WF-065` |
| Routes | `ADMIN-WEBSTAT-001`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-003`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003`, `ADMIN-MODE-001`, `ADMIN-MODE-002`, `ADMIN-ANALYTICS-003`, `ADMIN-ANALYTICS-004` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-PATTERN-FLAGS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-013`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 101. `REQ-QC-010-API` — QC-010 API_CONTRACT: If no matches, do NOT show system error. Attempt fallback. Guide behavior through visibility, prevent abuse silently.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider |
| Requirement | `QC-010` |
| Workflow | `WF-028`, `WF-029`, `WF-030` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MARKETPLACE-LOW-SUPPLY`, `SEED-MARKETPLACE-NO-VALID-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 102. `REQ-IP-002-API` — IP-002 API_CONTRACT: Marketplace Foundation Schema: WebsiteMatchingProfile, OpportunityImpression, MarketplaceScoringConfig, MarketplaceOverride.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-002` |
| Workflow | `WF-031`, `WF-032`, `WF-034`, `WF-055`, `WF-057`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-IMPRESSION-THRESHOLD`, `SEED-OVERRIDE-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-013` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 103. `REQ-IP-003-API` — IP-003 API_CONTRACT: Replace UserMatchingProfile with WebsiteMatchingProfile. Refactor scoring to update scores by websiteId. Validate qualityRating 1-5.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin/Requester |
| Requirement | `IP-003` |
| Workflow | `WF-033`, `WF-048`, `WF-063`, `WF-064` |
| Routes | `PROVIDER-001`, `REQUESTER-014`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-006`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-WEBSITE-QUALITY-DEGRADED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 104. `REQ-IP-004-API` — IP-004 API_CONTRACT: Taxonomy/Categories/Tags: MarketplaceCategory, MarketplaceTag, CategoryRelation tables. Update website/task APIs. Admin controls taxonomy.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Requester/Provider/Admin |
| Requirement | `IP-004` |
| Workflow | `WF-019`, `WF-025`, `WF-026`, `WF-027`, `WF-059` |
| Routes | `ADMIN-TAX-001`, `ADMIN-TAX-002`, `ADMIN-TAX-003`, `ADMIN-TAX-004`, `ADMIN-TAX-005`, `ADMIN-TAX-006`, `ADMIN-TAX-007`, `REQUESTER-002`, `WEB-001`, `WEB-008` |
| Seeds | `SEED-TAXONOMY-BASE`, `SEED-MATCH-EXACT-CATEGORY`, `SEED-MATCH-RELATED-CATEGORY`, `SEED-MATCH-BROAD-CATEGORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-008` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 105. `REQ-IP-005-API` — IP-005 API_CONTRACT: Hard Eligibility Filters: Do not relax verification. Do not show own tasks, already applied, deleted websites, cancelled/expired tasks.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Requester same account |
| Requirement | `IP-005` |
| Workflow | `WF-024`, `WF-029`, `WF-036`, `WF-037`, `WF-038` |
| Routes | `PROVIDER-001`, `PROVIDER-004` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-TASK-ALREADY-APPLIED`, `SEED-TASK-OWNED-BY-PROVIDER-ACTOR` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 106. `REQ-IP-006-API` — IP-006 API_CONTRACT: Candidate Pool Selection: Hard filters applied first, soft filters applied by relaxation level. Status OPEN / WAITING_FOR_APPLICANTS.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider |
| Requirement | `IP-006` |
| Workflow | `WF-023`, `WF-024`, `WF-025`, `WF-026`, `WF-027`, `WF-028`, `WF-029`, `WF-030` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-MARKETPLACE-LOW-SUPPLY`, `SEED-MARKETPLACE-PAGINATED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 107. `REQ-IP-007-API` — IP-007 API_CONTRACT: Dynamic Relaxation Engine: L0 exact, L1 related, L2 broad, L3 relax optional (country/DA), L4 valid active. Stop when minViableMatches reached.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `IP-007` |
| Workflow | `WF-026`, `WF-027`, `WF-028`, `WF-029`, `WF-055`, `WF-056` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-MODE-001`, `ADMIN-MODE-002` |
| Seeds | `SEED-MATCH-RELATED-CATEGORY`, `SEED-MATCH-BROAD-CATEGORY`, `SEED-MARKETPLACE-LOW-SUPPLY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 108. `REQ-IP-010-API` — IP-010 API_CONTRACT: Visibility Score: Use WebsiteMatchingProfile.visibilityScore. Combine with contribution/streak.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `IP-010` |
| Workflow | `WF-031`, `WF-033`, `WF-062`, `WF-063` |
| Routes | `PROVIDER-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-VARIANTS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 109. `REQ-IP-011-API` — IP-011 API_CONTRACT: Reputation Score: Increase for approved/high-rated completions. Reduce for rejection, revisions, disputes, poor quality.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Requester/Admin |
| Requirement | `IP-011` |
| Workflow | `WF-039`, `WF-048`, `WF-063`, `WF-064` |
| Routes | `REQUESTER-013`, `REQUESTER-014`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-006`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-TASK-SUBMITTED-APPROVABLE`, `SEED-TASK-SUBMITTED-REJECTABLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 110. `REQ-IP-012-API` — IP-012 API_CONTRACT: Boost Factor: Onboarding boost, underserved boost (BullMQ), admin boost. Decay after interactions or expiry.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Admin/Provider/Internal |
| Requirement | `IP-012` |
| Workflow | `WF-034`, `WF-057`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-016`, `BLK-P1-013` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 111. `REQ-IP-013-API` — IP-013 API_CONTRACT: Exposure Penalty: Penalize repeated display. Apply soft penalties. Return penalized valid results rather than empty if caps remove all.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-013` |
| Workflow | `WF-032`, `WF-066`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-005`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-IMPRESSION-THRESHOLD`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-003`, `BLK-P1-016` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 112. `REQ-IP-014-API` — IP-014 API_CONTRACT: Risk Penalty / Suppression: Use dispute rate, rejection, abuse, override. Suppressed excluded unless explicitly force-matched.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Admin/Provider |
| Requirement | `IP-014` |
| Workflow | `WF-034`, `WF-057`, `WF-062`, `WF-065`, `WF-074` |
| Routes | `PROVIDER-001`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-003`, `ADMIN-WEBSTAT-001`, `ADMIN-ANALYTICS-003`, `ADMIN-ANALYTICS-004` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-PATTERN-MEDIUM-HIGH`, `SEED-WEBSITE-QUALITY-VARIANTS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-011`, `BLK-P1-013` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 113. `REQ-IP-015-API` — IP-015 API_CONTRACT: Final Ranking Formula: Combine components with configurable weights from MarketplaceScoringConfig. Sort descending. Breakdown only in debug.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin |
| Requirement | `IP-015` |
| Workflow | `WF-031`, `WF-055` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 114. `REQ-IP-016-API` — IP-016 API_CONTRACT: Scoring Config API (GET/PATCH) for weights/thresholds. Override API (POST/GET/PATCH/DELETE) for boost, suppression, force-match, requires reasonCode.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Admin |
| Requirement | `IP-016` |
| Workflow | `WF-055`, `WF-057` |
| Routes | `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003` |
| Seeds | `SEED-ACTOR-ADMIN`, `SEED-OVERRIDE-MATRIX` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-013`, `BLK-P1-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 115. `REQ-IP-017-API` — IP-017 API_CONTRACT: GET /provider-task/opportunities. Authenticate -> validate ACTIVE -> verify ownership -> hard filters -> relaxation -> score -> sort -> paginate -> log impression.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Requester/Admin |
| Requirement | `IP-017` |
| Workflow | `WF-001`, `WF-004`, `WF-023`, `WF-024`, `WF-025`, `WF-026`, `WF-027`, `WF-028`, `WF-029`, `WF-030`, `WF-032` |
| Routes | `AUTH-003`, `AUTH-004`, `WEB-003`, `PROVIDER-001` |
| Seeds | `SEED-ACTOR-PROVIDER-A`, `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-MARKETPLACE-PAGINATED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 116. `REQ-IP-018-API` — IP-018 API_CONTRACT: Opportunity Impression Logging: Log shown tasks for exposure balancing and analytics.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-018` |
| Workflow | `WF-032`, `WF-066`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-005`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-IMPRESSION-THRESHOLD`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-016` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 117. `REQ-IP-021-API` — IP-021 API_CONTRACT: Scores clamped 0-100. Boost factor min/max. Quality rating 1-5. Users do not see internal score breakdown.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `API_CONTRACT` |
| Actor | Provider/Admin/Requester |
| Requirement | `IP-021` |
| Workflow | `WF-031`, `WF-033`, `WF-048`, `WF-055`, `WF-063` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `REQUESTER-014`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009`, `BLK-P2-009` |
| Expected result | 2xx for the accepted path and source-documented 4xx for rejected paths; no unexpected 500/503. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Request/response schema, auth, validation, ownership, hidden fields, and read-back. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 118. `REQ-QC-003-SECURITY` — QC-003 SECURITY: Add internal score variable. NOT visible to users. Used ONLY for sorting matches, adjusting visibility. Inputs: completion, activity, niche clarity, diversity, patterns.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `SECURITY` |
| Actor | Provider/Admin |
| Requirement | `QC-003` |
| Workflow | `WF-031`, `WF-033`, `WF-063`, `WF-066` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007`, `ADMIN-ANALYTICS-005` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | 401/403/404 according to source; no mutation, no cross-tenant data, and no sensitive/internal fields. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Authentication, authorization, ownership, enumeration, mass assignment, and hidden-score exposure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 119. `REQ-IP-015-SECURITY` — IP-015 SECURITY: Final Ranking Formula: Combine components with configurable weights from MarketplaceScoringConfig. Sort descending. Breakdown only in debug.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `SECURITY` |
| Actor | Provider/Admin |
| Requirement | `IP-015` |
| Workflow | `WF-031`, `WF-055` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | 401/403/404 according to source; no mutation, no cross-tenant data, and no sensitive/internal fields. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Authentication, authorization, ownership, enumeration, mass assignment, and hidden-score exposure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 120. `REQ-IP-021-SECURITY` — IP-021 SECURITY: Scores clamped 0-100. Boost factor min/max. Quality rating 1-5. Users do not see internal score breakdown.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `SECURITY` |
| Actor | Provider/Admin/Requester |
| Requirement | `IP-021` |
| Workflow | `WF-031`, `WF-033`, `WF-048`, `WF-055`, `WF-063` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `REQUESTER-014`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009`, `BLK-P2-009` |
| Expected result | 401/403/404 according to source; no mutation, no cross-tenant data, and no sensitive/internal fields. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Authentication, authorization, ownership, enumeration, mass assignment, and hidden-score exposure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 11 — Integration, boundaries, and deterministic ordering
Tests in this stage: **49**

### 121. `REQ-MC-001-INT` — MC-001 POSTGRES_INTEGRATION: Track interactions, control frequency/repetition, prevent over-concentration, distribute interactions, enforce tier limits, operate independently of user intent.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-001` |
| Workflow | `WF-023`, `WF-024`, `WF-031`, `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-DOMAIN-PAIR-HISTORY`, `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-WEEKLY-QUOTA-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-005`, `BLK-P0-007` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 122. `REQ-MC-002-INT` — MC-002 POSTGRES_INTEGRATION: Store source_domain, target_domain, timestamp, interaction_id, niche_primary, niche_secondary. Logic must operate at ROOT DOMAIN level.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin/Provider |
| Requirement | `MC-002` |
| Workflow | `WF-060`, `WF-069`, `WF-070`, `WF-075`, `WF-076` |
| Routes | `ADMIN-PAIR-001`, `ADMIN-ANALYTICS-002`, `ADMIN-ANALYTICS-006` |
| Seeds | `SEED-DOMAIN-PAIR-HISTORY`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-012` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 123. `REQ-MC-003-INT` — MC-003 POSTGRES_INTEGRATION: Execute at match generation, application/accept, and before final approval. No interaction can complete without passing validation.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-003` |
| Workflow | `WF-023`, `WF-024`, `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-TASK-OPEN-ELIGIBLE`, `SEED-TASK-SUBMITTED-APPROVABLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 124. `REQ-MC-004-INT` — MC-004 POSTGRES_INTEGRATION: If Domain A interacts with B, B must not interact with A within window (Early: 60-90 days, Scaling: 120 days).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | `MC-004` |
| Workflow | `WF-070`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-RECIPROCAL-ACTIVE`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 125. `REQ-MC-005-INT` — MC-005 POSTGRES_INTEGRATION: Same two domains must not interact again within: Early 60-90 days, Scaling 90 days. Regardless of content.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | `MC-005` |
| Workflow | `WF-069`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-COOLDOWN-ACTIVE`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 126. `REQ-MC-006-INT` — MC-006 POSTGRES_INTEGRATION: Prioritise spreading interactions, reduce repeated pairings, prioritise not recently used, avoid concentration.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `MC-006` |
| Workflow | `WF-031`, `WF-066` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-ANALYTICS-001`, `ADMIN-ANALYTICS-005` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-MARKETPLACE-ANALYTICS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 127. `REQ-MC-007-INT` — MC-007 POSTGRES_INTEGRATION: Max 40% interactions within same niche. Min 60% adjacent or broader niches.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin/Provider |
| Requirement | `MC-007` |
| Workflow | `WF-058`, `WF-073` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-NICHE-001`, `ADMIN-NICHE-002`, `ADMIN-NICHE-003`, `ADMIN-NICHE-004` |
| Seeds | `SEED-NICHE-CAP-SCOPE`, `SEED-NICHE-DISTRIBUTION-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-008` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 128. `REQ-MC-008-INT` — MC-008 POSTGRES_INTEGRATION: Early: 1-3/week. Scaling: max 5/week. No same-day clustering. Distribute over time.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | `MC-008` |
| Workflow | `WF-071`, `WF-072`, `WF-075` |
| Routes | `PROVIDER-004`, `ADMIN-CONFIG-001`, `ADMIN-WEBSTAT-002`, `ADMIN-PAIR-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-WEEKLY-ONE-SLOT-LEFT`, `SEED-SAME-DAY-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 129. `REQ-MC-009-INT` — MC-009 POSTGRES_INTEGRATION: Detect repeated interactions, reciprocal patterns, concentration, over-reliance. Reduce priority, restrict new interactions.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin/Provider |
| Requirement | `MC-009` |
| Workflow | `WF-065`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-ANALYTICS-003`, `ADMIN-ANALYTICS-004` |
| Seeds | `SEED-PATTERN-FLAGS`, `SEED-PATTERN-MEDIUM-HIGH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 130. `REQ-MC-010-INT` — MC-010 POSTGRES_INTEGRATION: Dynamic score based on frequency, unique domains, velocity. Exceeding threshold reduces visibility, limits approvals, prioritises diversification.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `MC-010` |
| Workflow | `WF-033`, `WF-063`, `WF-065`, `WF-066`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007`, `ADMIN-ANALYTICS-003` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-PATTERN-MEDIUM-HIGH`, `SEED-MARKETPLACE-ANALYTICS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 131. `REQ-MC-011-INT` — MC-011 POSTGRES_INTEGRATION: Control final match assignment. Override preferences if violated. Users must never directly select unrestricted partners.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-011` |
| Workflow | `WF-023`, `WF-040`, `WF-061` |
| Routes | `PROVIDER-001`, `REQUESTER-005`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003` |
| Seeds | `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-TASK-WITH-ELIGIBLE-APPLICANT` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 132. `REQ-MC-012-INT` — MC-012 POSTGRES_INTEGRATION: Before approving, validate reciprocal, repeat pair, domain distribution, niche, velocity, pattern flags, risk score. Reject or return alternatives.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-012` |
| Workflow | `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001` |
| Seeds | `SEED-TASK-OPEN-ELIGIBLE`, `SEED-TASK-SUBMITTED-APPROVABLE`, `SEED-DOMAIN-PAIR-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P1-011` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 133. `REQ-MC-013-INT` — MC-013 POSTGRES_INTEGRATION: Free (max 2/wk, low priority), Silver (max 3/wk, medium), Gold (max 4/wk, high), Platinum (max 5/wk, high), Enterprise (max 5/wk PER DOMAIN).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `MC-013` |
| Workflow | `WF-023`, `WF-031`, `WF-062` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-002`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS`, `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 134. `REQ-MC-014-INT` — MC-014 POSTGRES_INTEGRATION: 5/week absolute max per domain. Tiers increase access/priority/quality but DO NOT bypass cooldowns, reciprocal limits, distribution, risk.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `MC-014` |
| Workflow | `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-004`, `ADMIN-WEBSTAT-002`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-PAIR-COOLDOWN-ACTIVE`, `SEED-PAIR-RECIPROCAL-ACTIVE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 135. `REQ-MC-015-INT` — MC-015 POSTGRES_INTEGRATION: Enforce in order: 1. Validation, 2. Tier limits, 3. Additional constraints. Strictest applies.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-015` |
| Workflow | `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-PATTERN-MEDIUM-HIGH` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-011` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 136. `REQ-MC-017-INT` — MC-017 POSTGRES_INTEGRATION: Support low user volume: 1-3 limit, 60-90 days reciprocity, manual matching. Admin distributes and prevents clustering.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin/Provider |
| Requirement | `MC-017` |
| Workflow | `WF-056`, `WF-061`, `WF-072` |
| Routes | `ADMIN-MODE-001`, `ADMIN-MODE-002`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002` |
| Seeds | `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-SAME-DAY-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 137. `REQ-MC-018-INT` — MC-018 POSTGRES_INTEGRATION: Configurable transition to scale: 120 days reciprocity, max 5 limit, fully automated, stricter distribution.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin/Provider |
| Requirement | `MC-018` |
| Workflow | `WF-056`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073` |
| Routes | `ADMIN-MODE-001`, `ADMIN-MODE-002`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `PROVIDER-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-PAIR-RECIPROCAL-ACTIVE`, `SEED-NICHE-DISTRIBUTION-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 138. `REQ-QC-001-INT` — QC-001 POSTGRES_INTEGRATION: Additive safety layer. No change to onboarding. Adjusts priority and exposure, not access. Operates in background.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin/Internal |
| Requirement | `QC-001` |
| Workflow | `WF-033`, `WF-063`, `WF-064`, `WF-067`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-006`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-016`, `BLK-P2-010` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 139. `REQ-QC-002-INT` — QC-002 POSTGRES_INTEGRATION: Status field: Active (default), Low Priority, Limited Access, Under Review, Restricted, Suspended (admin).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin |
| Requirement | `QC-002` |
| Workflow | `WF-062`, `WF-063`, `WF-064` |
| Routes | `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-007`, `ADMIN-VIS-001` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 140. `REQ-QC-003-INT` — QC-003 POSTGRES_INTEGRATION: Add internal score variable. NOT visible to users. Used ONLY for sorting matches, adjusting visibility. Inputs: completion, activity, niche clarity, diversity, patterns.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `QC-003` |
| Workflow | `WF-031`, `WF-033`, `WF-063`, `WF-066` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007`, `ADMIN-ANALYTICS-005` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 141. `REQ-QC-004-INT` — QC-004 POSTGRES_INTEGRATION: NON-DESTRUCTIVE. Do NOT remove websites. Increase for high-score, decrease for low-score via ordering weight and frequency control.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `QC-004` |
| Workflow | `WF-033`, `WF-062`, `WF-063` |
| Routes | `PROVIDER-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-006` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 142. `REQ-QC-005-INT` — QC-005 POSTGRES_INTEGRATION: Step 1 Eligibility. Step 2 Behavior/Risk (reduce priority, do not exclude). Step 3 Niche. Step 4 Distribution (avoid loops). Step 5 Tier Priority (must not override risk). Step 6 Final Weighting.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `QC-005` |
| Workflow | `WF-024`, `WF-025`, `WF-026`, `WF-027`, `WF-028`, `WF-031`, `WF-033`, `WF-074` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-WEBSTAT-002`, `ADMIN-ANALYTICS-003` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-PATTERN-MEDIUM-HIGH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 143. `REQ-QC-006-INT` — QC-006 POSTGRES_INTEGRATION: No hard blocks for low-quality. Reduce frequency/visibility/access. Escalate to Restricted/Suspended if repeated negative behavior.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `QC-006` |
| Workflow | `WF-033`, `WF-062`, `WF-063`, `WF-064` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-006` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS`, `SEED-WEBSITE-QUALITY-DEGRADED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 144. `REQ-QC-008-INT` — QC-008 POSTGRES_INTEGRATION: Do NOT block multi-domain users. Track interactions across all domains, detect repeated external pairings. Apply priority/visibility reduction.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester/Website owner/Admin |
| Requirement | `QC-008` |
| Workflow | `WF-008`, `WF-009`, `WF-010`, `WF-060`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-075`, `WF-076` |
| Routes | `WEB-001`, `WEB-003`, `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-ACTOR-PROVIDER-A`, `SEED-DOMAIN-PAIR-HISTORY`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P0-005` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 145. `REQ-IP-002-INT` — IP-002 POSTGRES_INTEGRATION: Marketplace Foundation Schema: WebsiteMatchingProfile, OpportunityImpression, MarketplaceScoringConfig, MarketplaceOverride.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-002` |
| Workflow | `WF-031`, `WF-032`, `WF-034`, `WF-055`, `WF-057`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-IMPRESSION-THRESHOLD`, `SEED-OVERRIDE-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-013` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 146. `REQ-IP-003-INT` — IP-003 POSTGRES_INTEGRATION: Replace UserMatchingProfile with WebsiteMatchingProfile. Refactor scoring to update scores by websiteId. Validate qualityRating 1-5.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin/Requester |
| Requirement | `IP-003` |
| Workflow | `WF-033`, `WF-048`, `WF-063`, `WF-064` |
| Routes | `PROVIDER-001`, `REQUESTER-014`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-006`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-WEBSITE-QUALITY-DEGRADED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 147. `REQ-IP-004-INT` — IP-004 POSTGRES_INTEGRATION: Taxonomy/Categories/Tags: MarketplaceCategory, MarketplaceTag, CategoryRelation tables. Update website/task APIs. Admin controls taxonomy.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Requester/Provider/Admin |
| Requirement | `IP-004` |
| Workflow | `WF-019`, `WF-025`, `WF-026`, `WF-027`, `WF-059` |
| Routes | `ADMIN-TAX-001`, `ADMIN-TAX-002`, `ADMIN-TAX-003`, `ADMIN-TAX-004`, `ADMIN-TAX-005`, `ADMIN-TAX-006`, `ADMIN-TAX-007`, `REQUESTER-002`, `WEB-001`, `WEB-008` |
| Seeds | `SEED-TAXONOMY-BASE`, `SEED-MATCH-EXACT-CATEGORY`, `SEED-MATCH-RELATED-CATEGORY`, `SEED-MATCH-BROAD-CATEGORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-008` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 148. `REQ-IP-005-INT` — IP-005 POSTGRES_INTEGRATION: Hard Eligibility Filters: Do not relax verification. Do not show own tasks, already applied, deleted websites, cancelled/expired tasks.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester same account |
| Requirement | `IP-005` |
| Workflow | `WF-024`, `WF-029`, `WF-036`, `WF-037`, `WF-038` |
| Routes | `PROVIDER-001`, `PROVIDER-004` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-TASK-ALREADY-APPLIED`, `SEED-TASK-OWNED-BY-PROVIDER-ACTOR` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 149. `REQ-IP-006-INT` — IP-006 POSTGRES_INTEGRATION: Candidate Pool Selection: Hard filters applied first, soft filters applied by relaxation level. Status OPEN / WAITING_FOR_APPLICANTS.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | `IP-006` |
| Workflow | `WF-023`, `WF-024`, `WF-025`, `WF-026`, `WF-027`, `WF-028`, `WF-029`, `WF-030` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-MARKETPLACE-LOW-SUPPLY`, `SEED-MARKETPLACE-PAGINATED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 150. `REQ-IP-007-INT` — IP-007 POSTGRES_INTEGRATION: Dynamic Relaxation Engine: L0 exact, L1 related, L2 broad, L3 relax optional (country/DA), L4 valid active. Stop when minViableMatches reached.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `IP-007` |
| Workflow | `WF-026`, `WF-027`, `WF-028`, `WF-029`, `WF-055`, `WF-056` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-MODE-001`, `ADMIN-MODE-002` |
| Seeds | `SEED-MATCH-RELATED-CATEGORY`, `SEED-MATCH-BROAD-CATEGORY`, `SEED-MARKETPLACE-LOW-SUPPLY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 151. `REQ-IP-008-INT` — IP-008 POSTGRES_INTEGRATION: Compatibility Score: Compare category/tags. Exact > related. Shared tags overlap. DA/DR as signal only, never credit cost.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider |
| Requirement | `IP-008` |
| Workflow | `WF-025`, `WF-026`, `WF-027`, `WF-031` |
| Routes | `PROVIDER-001`, `ADMIN-TAX-002`, `ADMIN-TAX-005`, `ADMIN-TAX-007` |
| Seeds | `SEED-MATCH-EXACT-CATEGORY`, `SEED-MATCH-RELATED-CATEGORY`, `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-008`, `BLK-P1-003` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 152. `REQ-IP-009-INT` — IP-009 POSTGRES_INTEGRATION: Opportunity Score: Higher if few applicants, older active task, low recent requester exposure. Lower if shown too many times.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `IP-009` |
| Workflow | `WF-031`, `WF-032`, `WF-066` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-001`, `ADMIN-ANALYTICS-005` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-IMPRESSION-THRESHOLD`, `SEED-MARKETPLACE-ANALYTICS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-003`, `BLK-P0-007` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 153. `REQ-IP-010-INT` — IP-010 POSTGRES_INTEGRATION: Visibility Score: Use WebsiteMatchingProfile.visibilityScore. Combine with contribution/streak.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `IP-010` |
| Workflow | `WF-031`, `WF-033`, `WF-062`, `WF-063` |
| Routes | `PROVIDER-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-VARIANTS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 154. `REQ-IP-011-INT` — IP-011 POSTGRES_INTEGRATION: Reputation Score: Increase for approved/high-rated completions. Reduce for rejection, revisions, disputes, poor quality.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Requester/Admin |
| Requirement | `IP-011` |
| Workflow | `WF-039`, `WF-048`, `WF-063`, `WF-064` |
| Routes | `REQUESTER-013`, `REQUESTER-014`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-006`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-TASK-SUBMITTED-APPROVABLE`, `SEED-TASK-SUBMITTED-REJECTABLE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 155. `REQ-IP-012-INT` — IP-012 POSTGRES_INTEGRATION: Boost Factor: Onboarding boost, underserved boost (BullMQ), admin boost. Decay after interactions or expiry.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin/Provider/Internal |
| Requirement | `IP-012` |
| Workflow | `WF-034`, `WF-057`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-016`, `BLK-P1-013` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 156. `REQ-IP-013-INT` — IP-013 POSTGRES_INTEGRATION: Exposure Penalty: Penalize repeated display. Apply soft penalties. Return penalized valid results rather than empty if caps remove all.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-013` |
| Workflow | `WF-032`, `WF-066`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-005`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-IMPRESSION-THRESHOLD`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-003`, `BLK-P1-016` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 157. `REQ-IP-014-INT` — IP-014 POSTGRES_INTEGRATION: Risk Penalty / Suppression: Use dispute rate, rejection, abuse, override. Suppressed excluded unless explicitly force-matched.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Admin/Provider |
| Requirement | `IP-014` |
| Workflow | `WF-034`, `WF-057`, `WF-062`, `WF-065`, `WF-074` |
| Routes | `PROVIDER-001`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-003`, `ADMIN-WEBSTAT-001`, `ADMIN-ANALYTICS-003`, `ADMIN-ANALYTICS-004` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-PATTERN-MEDIUM-HIGH`, `SEED-WEBSITE-QUALITY-VARIANTS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-011`, `BLK-P1-013` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 158. `REQ-IP-015-INT` — IP-015 POSTGRES_INTEGRATION: Final Ranking Formula: Combine components with configurable weights from MarketplaceScoringConfig. Sort descending. Breakdown only in debug.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin |
| Requirement | `IP-015` |
| Workflow | `WF-031`, `WF-055` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009` |
| Expected result | Service result and database state satisfy the requirement atomically. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 159. `REQ-IP-018-INT` — IP-018 POSTGRES_INTEGRATION: Opportunity Impression Logging: Log shown tasks for exposure balancing and analytics.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-018` |
| Workflow | `WF-032`, `WF-066`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-005`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-IMPRESSION-THRESHOLD`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-016` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 160. `REQ-IP-019-INT` — IP-019 POSTGRES_INTEGRATION: Task Event Score Hooks: Update matching profiles after apply, select, approve, dispute, cancel events.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `POSTGRES_INTEGRATION` |
| Actor | Provider/Requester/Admin |
| Requirement | `IP-019` |
| Workflow | `WF-036`, `WF-040`, `WF-048`, `WF-049`, `WF-050`, `WF-051`, `WF-053`, `WF-054`, `WF-063` |
| Routes | `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-006`, `REQUESTER-007`, `DISPUTE-001`, `DISPUTE-003`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-TASK-OPEN-ELIGIBLE`, `SEED-TASK-SUBMITTED-APPROVABLE`, `SEED-DISPUTE-OPEN`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-012` |
| Expected result | Service result and database state satisfy the requirement atomically. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Database invariants, rollback, idempotency, normalization, counters, and event/audit records. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 161. `REQ-MC-007-BOUNDARY` — MC-007 BOUNDARY_ANALYSIS: Max 40% interactions within same niche. Min 60% adjacent or broader niches.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Admin/Provider |
| Requirement | `MC-007` |
| Workflow | `WF-058`, `WF-073` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-NICHE-001`, `ADMIN-NICHE-002`, `ADMIN-NICHE-003`, `ADMIN-NICHE-004` |
| Seeds | `SEED-NICHE-CAP-SCOPE`, `SEED-NICHE-DISTRIBUTION-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-008` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 162. `REQ-MC-013-BOUNDARY` — MC-013 BOUNDARY_ANALYSIS: Free (max 2/wk, low priority), Silver (max 3/wk, medium), Gold (max 4/wk, high), Platinum (max 5/wk, high), Enterprise (max 5/wk PER DOMAIN).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Provider/Admin |
| Requirement | `MC-013` |
| Workflow | `WF-023`, `WF-031`, `WF-062` |
| Routes | `PROVIDER-001`, `ADMIN-WEBSTAT-001`, `ADMIN-WEBSTAT-002`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-WEBSITE-QUALITY-VARIANTS`, `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-009` |
| Expected result | Each boundary produces the exact allowed/blocked result defined by source and configuration. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 163. `REQ-MC-015-BOUNDARY` — MC-015 BOUNDARY_ANALYSIS: Enforce in order: 1. Validation, 2. Tier limits, 3. Additional constraints. Strictest applies.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-015` |
| Workflow | `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-PATTERN-MEDIUM-HIGH` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-011` |
| Expected result | Each boundary produces the exact allowed/blocked result defined by source and configuration. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 164. `REQ-IP-003-BOUNDARY` — IP-003 BOUNDARY_ANALYSIS: Replace UserMatchingProfile with WebsiteMatchingProfile. Refactor scoring to update scores by websiteId. Validate qualityRating 1-5.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Provider/Admin/Requester |
| Requirement | `IP-003` |
| Workflow | `WF-033`, `WF-048`, `WF-063`, `WF-064` |
| Routes | `PROVIDER-001`, `REQUESTER-014`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-004`, `ADMIN-WEBSTAT-006`, `ADMIN-WEBSTAT-007` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-WEBSITE-QUALITY-DEGRADED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-009` |
| Expected result | Each boundary produces the exact allowed/blocked result defined by source and configuration. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 165. `REQ-IP-007-BOUNDARY` — IP-007 BOUNDARY_ANALYSIS: Dynamic Relaxation Engine: L0 exact, L1 related, L2 broad, L3 relax optional (country/DA), L4 valid active. Stop when minViableMatches reached.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Provider/Admin |
| Requirement | `IP-007` |
| Workflow | `WF-026`, `WF-027`, `WF-028`, `WF-029`, `WF-055`, `WF-056` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-MODE-001`, `ADMIN-MODE-002` |
| Seeds | `SEED-MATCH-RELATED-CATEGORY`, `SEED-MATCH-BROAD-CATEGORY`, `SEED-MARKETPLACE-LOW-SUPPLY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | Each boundary produces the exact allowed/blocked result defined by source and configuration. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 166. `REQ-IP-008-BOUNDARY` — IP-008 BOUNDARY_ANALYSIS: Compatibility Score: Compare category/tags. Exact > related. Shared tags overlap. DA/DR as signal only, never credit cost.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Provider |
| Requirement | `IP-008` |
| Workflow | `WF-025`, `WF-026`, `WF-027`, `WF-031` |
| Routes | `PROVIDER-001`, `ADMIN-TAX-002`, `ADMIN-TAX-005`, `ADMIN-TAX-007` |
| Seeds | `SEED-MATCH-EXACT-CATEGORY`, `SEED-MATCH-RELATED-CATEGORY`, `SEED-SCORING-CONTROLLED-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-008`, `BLK-P1-003` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 167. `REQ-IP-009-BOUNDARY` — IP-009 BOUNDARY_ANALYSIS: Opportunity Score: Higher if few applicants, older active task, low recent requester exposure. Lower if shown too many times.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Provider/Admin |
| Requirement | `IP-009` |
| Workflow | `WF-031`, `WF-032`, `WF-066` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-001`, `ADMIN-ANALYTICS-005` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-IMPRESSION-THRESHOLD`, `SEED-MARKETPLACE-ANALYTICS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-003`, `BLK-P0-007` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 168. `REQ-IP-021-BOUNDARY` — IP-021 BOUNDARY_ANALYSIS: Scores clamped 0-100. Boost factor min/max. Quality rating 1-5. Users do not see internal score breakdown.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `BOUNDARY_ANALYSIS` |
| Actor | Provider/Admin/Requester |
| Requirement | `IP-021` |
| Workflow | `WF-031`, `WF-033`, `WF-048`, `WF-055`, `WF-063` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `REQUESTER-014`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-009`, `BLK-P2-009` |
| Expected result | Each boundary produces the exact allowed/blocked result defined by source and configuration. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Off-by-one, date-window, score, quota, cap, decay, and time-zone boundaries. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 169. `REQ-QC-005-ORDER` — QC-005 DETERMINISTIC_ORDERING: Step 1 Eligibility. Step 2 Behavior/Risk (reduce priority, do not exclude). Step 3 Niche. Step 4 Distribution (avoid loops). Step 5 Tier Priority (must not override risk). Step 6 Final Weighting.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `DETERMINISTIC_ORDERING` |
| Actor | Provider/Admin |
| Requirement | `QC-005` |
| Workflow | `WF-024`, `WF-025`, `WF-026`, `WF-027`, `WF-028`, `WF-031`, `WF-033`, `WF-074` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-WEBSTAT-002`, `ADMIN-ANALYTICS-003` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-SCORING-CONTROLLED-CANDIDATES`, `SEED-PATTERN-MEDIUM-HIGH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-003` |
| Expected result | Results follow the documented deterministic order and remain stable across repeated identical calls. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Tie-breaking, pagination stability, non-deterministic DB order, and hidden randomization. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 12 — Audit trail verification
Tests in this stage: **3**

### 170. `REQ-MC-016-AUDIT` — MC-016 AUDIT_TRAIL: Admin can override reciprocal, cooldowns, weekly limits, risk, manually assign, adjust scoring. All must be logged.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `AUDIT_TRAIL` |
| Actor | Admin |
| Requirement | `MC-016` |
| Workflow | `WF-055`, `WF-057`, `WF-060`, `WF-061` |
| Routes | `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003`, `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003`, `ADMIN-PAIR-001` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-DOMAIN-PAIR-HISTORY` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-013`, `BLK-P1-009` |
| Expected result | The mutation and immutable audit evidence contain actor, target, action, before/after, and timestamp. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Missing audit, mutable audit data, wrong actor attribution, and duplicate actions. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 171. `REQ-QC-009-AUDIT` — QC-009 AUDIT_TRAIL: Adjust status, override priority, manually assign, apply/remove restrictions, enable low-pool, review flagged. All logged.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `AUDIT_TRAIL` |
| Actor | Admin |
| Requirement | `QC-009` |
| Workflow | `WF-056`, `WF-057`, `WF-061`, `WF-062`, `WF-065` |
| Routes | `ADMIN-WEBSTAT-001`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-003`, `ADMIN-MATCH-001`, `ADMIN-MATCH-002`, `ADMIN-MATCH-003`, `ADMIN-MODE-001`, `ADMIN-MODE-002`, `ADMIN-ANALYTICS-003`, `ADMIN-ANALYTICS-004` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-MANUAL-MATCH-CANDIDATE`, `SEED-PATTERN-FLAGS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-013`, `BLK-P1-009` |
| Expected result | The mutation and immutable audit evidence contain actor, target, action, before/after, and timestamp. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Missing audit, mutable audit data, wrong actor attribution, and duplicate actions. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 172. `REQ-IP-016-AUDIT` — IP-016 AUDIT_TRAIL: Scoring Config API (GET/PATCH) for weights/thresholds. Override API (POST/GET/PATCH/DELETE) for boost, suppression, force-match, requires reasonCode.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `AUDIT_TRAIL` |
| Actor | Admin |
| Requirement | `IP-016` |
| Workflow | `WF-055`, `WF-057` |
| Routes | `ADMIN-CONFIG-001`, `ADMIN-CONFIG-002`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003` |
| Seeds | `SEED-ACTOR-ADMIN`, `SEED-OVERRIDE-MATRIX` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-013`, `BLK-P1-009` |
| Expected result | The mutation and immutable audit evidence contain actor, target, action, before/after, and timestamp. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Missing audit, mutable audit data, wrong actor attribution, and duplicate actions. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 13 — Real PostgreSQL concurrency
Tests in this stage: **9**

### 173. `REQ-MC-001-CONC` — MC-001 POSTGRES_CONCURRENCY: Track interactions, control frequency/repetition, prevent over-concentration, distribute interactions, enforce tier limits, operate independently of user intent.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-001` |
| Workflow | `WF-023`, `WF-024`, `WF-031`, `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-DOMAIN-PAIR-HISTORY`, `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-WEEKLY-QUOTA-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-005`, `BLK-P0-007` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 174. `REQ-MC-002-CONC` — MC-002 POSTGRES_CONCURRENCY: Store source_domain, target_domain, timestamp, interaction_id, niche_primary, niche_secondary. Logic must operate at ROOT DOMAIN level.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Admin/Provider |
| Requirement | `MC-002` |
| Workflow | `WF-060`, `WF-069`, `WF-070`, `WF-075`, `WF-076` |
| Routes | `ADMIN-PAIR-001`, `ADMIN-ANALYTICS-002`, `ADMIN-ANALYTICS-006` |
| Seeds | `SEED-DOMAIN-PAIR-HISTORY`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-012` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 175. `REQ-MC-004-CONC` — MC-004 POSTGRES_CONCURRENCY: If Domain A interacts with B, B must not interact with A within window (Early: 60-90 days, Scaling: 120 days).

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider |
| Requirement | `MC-004` |
| Workflow | `WF-070`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-RECIPROCAL-ACTIVE`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 176. `REQ-MC-005-CONC` — MC-005 POSTGRES_CONCURRENCY: Same two domains must not interact again within: Early 60-90 days, Scaling 90 days. Regardless of content.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider |
| Requirement | `MC-005` |
| Workflow | `WF-069`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-PAIR-COOLDOWN-ACTIVE`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 177. `REQ-MC-008-CONC` — MC-008 POSTGRES_CONCURRENCY: Early: 1-3/week. Scaling: max 5/week. No same-day clustering. Distribute over time.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider |
| Requirement | `MC-008` |
| Workflow | `WF-071`, `WF-072`, `WF-075` |
| Routes | `PROVIDER-004`, `ADMIN-CONFIG-001`, `ADMIN-WEBSTAT-002`, `ADMIN-PAIR-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-WEEKLY-ONE-SLOT-LEFT`, `SEED-SAME-DAY-BOUNDARY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 178. `REQ-MC-012-CONC` — MC-012 POSTGRES_CONCURRENCY: Before approving, validate reciprocal, repeat pair, domain distribution, niche, velocity, pattern flags, risk score. Reject or return alternatives.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-012` |
| Workflow | `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001` |
| Seeds | `SEED-TASK-OPEN-ELIGIBLE`, `SEED-TASK-SUBMITTED-APPROVABLE`, `SEED-DOMAIN-PAIR-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P1-011` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 179. `REQ-MC-014-CONC` — MC-014 POSTGRES_CONCURRENCY: 5/week absolute max per domain. Tiers increase access/priority/quality but DO NOT bypass cooldowns, reciprocal limits, distribution, risk.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider/Admin |
| Requirement | `MC-014` |
| Workflow | `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074` |
| Routes | `PROVIDER-004`, `ADMIN-WEBSTAT-002`, `ADMIN-CONFIG-001` |
| Seeds | `SEED-WEEKLY-QUOTA-BOUNDARY`, `SEED-PAIR-COOLDOWN-ACTIVE`, `SEED-PAIR-RECIPROCAL-ACTIVE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-005`, `BLK-P2-007` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 180. `REQ-MC-020-CONC` — MC-020 POSTGRES_CONCURRENCY: No overuse, no excessive repetition, balanced distribution. All logic enforced server-side.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-020` |
| Workflow | `WF-023`, `WF-024`, `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074`, `WF-075`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-DOMAIN-PAIR-HISTORY`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-005`, `BLK-P0-007`, `BLK-P0-008` |
| Expected result | Exactly the policy-allowed winners; losers receive stable business rejection; no partial state or 5xx. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 181. `REQ-QC-008-CONC` — QC-008 POSTGRES_CONCURRENCY: Do NOT block multi-domain users. Track interactions across all domains, detect repeated external pairings. Apply priority/visibility reduction.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `POSTGRES_CONCURRENCY` |
| Actor | Provider/Requester/Website owner/Admin |
| Requirement | `QC-008` |
| Workflow | `WF-008`, `WF-009`, `WF-010`, `WF-060`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-075`, `WF-076` |
| Routes | `WEB-001`, `WEB-003`, `PROVIDER-001`, `PROVIDER-004`, `ADMIN-PAIR-001` |
| Seeds | `SEED-ACTOR-PROVIDER-A`, `SEED-DOMAIN-PAIR-HISTORY`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P0-005` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Final-slot races, duplicate pair creation, reciprocal races, quota bypass, deadlock handling. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 14 — Worker and scheduled-job tests
Tests in this stage: **6**

### 182. `REQ-QC-001-JOB` — QC-001 WORKER_JOB: Additive safety layer. No change to onboarding. Adjusts priority and exposure, not access. Operates in background.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `WORKER_JOB` |
| Actor | Provider/Admin/Internal |
| Requirement | `QC-001` |
| Workflow | `WF-033`, `WF-063`, `WF-064`, `WF-067`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003`, `ADMIN-WEBSTAT-006`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-WEBSITE-QUALITY-HISTORY`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-016`, `BLK-P2-010` |
| Expected result | Only eligible records change; rerun is safe; queue and direct-worker results are equivalent. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Redis/worker availability, retry, duplicate delivery, stale jobs, and partial batch failure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 183. `REQ-IP-001-JOB` — IP-001 WORKER_JOB: Controlled matching system. Website-based scoring. Verification never relaxed (only soft filters like category/tags/country/DA). BullMQ for maintenance.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `WORKER_JOB` |
| Actor | Website owner/Provider/Internal/Admin |
| Requirement | `IP-001` |
| Workflow | `WF-011`, `WF-012`, `WF-023`, `WF-024`, `WF-028`, `WF-031`, `WF-077` |
| Routes | `VERIFY-005`, `VERIFY-006`, `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-WEBSITE-UNVERIFIED`, `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-016` |
| Expected result | Only eligible records change; rerun is safe; queue and direct-worker results are equivalent. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Redis/worker availability, retry, duplicate delivery, stale jobs, and partial batch failure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 184. `REQ-IP-012-JOB` — IP-012 WORKER_JOB: Boost Factor: Onboarding boost, underserved boost (BullMQ), admin boost. Decay after interactions or expiry.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `WORKER_JOB` |
| Actor | Admin/Provider/Internal |
| Requirement | `IP-012` |
| Workflow | `WF-034`, `WF-057`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-OVERRIDE-001`, `ADMIN-OVERRIDE-002`, `ADMIN-OVERRIDE-003`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-OVERRIDE-MATRIX`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-016`, `BLK-P1-013` |
| Expected result | Only eligible records change; rerun is safe; queue and direct-worker results are equivalent. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Redis/worker availability, retry, duplicate delivery, stale jobs, and partial batch failure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 185. `REQ-IP-013-JOB` — IP-013 WORKER_JOB: Exposure Penalty: Penalize repeated display. Apply soft penalties. Return penalized valid results rather than empty if caps remove all.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `WORKER_JOB` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-013` |
| Workflow | `WF-032`, `WF-066`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-005`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-IMPRESSION-THRESHOLD`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-003`, `BLK-P1-016` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Redis/worker availability, retry, duplicate delivery, stale jobs, and partial batch failure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 186. `REQ-IP-018-JOB` — IP-018 WORKER_JOB: Opportunity Impression Logging: Log shown tasks for exposure balancing and analytics.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `WORKER_JOB` |
| Actor | Provider/Admin/Internal |
| Requirement | `IP-018` |
| Workflow | `WF-032`, `WF-066`, `WF-077` |
| Routes | `PROVIDER-001`, `ADMIN-ANALYTICS-005`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-IMPRESSION-THRESHOLD`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `CONDITIONAL` |
| Blockers | `BLK-P1-003`, `BLK-P1-016` |
| Expected result | Only eligible records change; rerun is safe; queue and direct-worker results are equivalent. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Redis/worker availability, retry, duplicate delivery, stale jobs, and partial batch failure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 187. `REQ-IP-020-JOB` — IP-020 WORKER_JOB: BullMQ jobs: decay-boost-factors, expire-overrides, cleanup-impressions, flag-neglected-websites, update-opportunity-scores.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `WORKER_JOB` |
| Actor | Internal/Admin |
| Requirement | `IP-020` |
| Workflow | `WF-077` |
| Routes | `ADMIN-HEALTH-001`, `ADMIN-OVERRIDE-002`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-MAINTENANCE-DUE-RECORDS`, `SEED-MARKETPLACE-HEALTH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-015`, `BLK-P1-016`, `BLK-P2-010` |
| Expected result | Only eligible records change; rerun is safe; queue and direct-worker results are equivalent. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Redis/worker availability, retry, duplicate delivery, stale jobs, and partial batch failure. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 15 — End-to-end API journeys
Tests in this stage: **5**

### 188. `REQ-MC-020-E2E` — MC-020 END_TO_END: No overuse, no excessive repetition, balanced distribution. All logic enforced server-side.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `END_TO_END` |
| Actor | Provider/Requester/Admin |
| Requirement | `MC-020` |
| Workflow | `WF-023`, `WF-024`, `WF-036`, `WF-040`, `WF-048`, `WF-069`, `WF-070`, `WF-071`, `WF-072`, `WF-073`, `WF-074`, `WF-075`, `WF-076` |
| Routes | `PROVIDER-001`, `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-007`, `ADMIN-PAIR-001` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-DOMAIN-PAIR-HISTORY`, `SEED-CONCURRENT-PAIR-RACE` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P0-005`, `BLK-P0-007`, `BLK-P0-008` |
| Expected result | The full journey completes only through valid transitions and all downstream effects are correct. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Cross-module state, actor boundaries, refresh/read-back, rollback, and final settlement. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 189. `REQ-IP-001-E2E` — IP-001 END_TO_END: Controlled matching system. Website-based scoring. Verification never relaxed (only soft filters like category/tags/country/DA). BullMQ for maintenance.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `END_TO_END` |
| Actor | Website owner/Provider/Internal/Admin |
| Requirement | `IP-001` |
| Workflow | `WF-011`, `WF-012`, `WF-023`, `WF-024`, `WF-028`, `WF-031`, `WF-077` |
| Routes | `VERIFY-005`, `VERIFY-006`, `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-HEALTH-001` |
| Seeds | `SEED-WEBSITE-UNVERIFIED`, `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-MAINTENANCE-DUE-RECORDS` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-001`, `BLK-P1-016` |
| Expected result | The full journey completes only through valid transitions and all downstream effects are correct. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Cross-module state, actor boundaries, refresh/read-back, rollback, and final settlement. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 190. `REQ-IP-017-E2E` — IP-017 END_TO_END: GET /provider-task/opportunities. Authenticate -> validate ACTIVE -> verify ownership -> hard filters -> relaxation -> score -> sort -> paginate -> log impression.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `END_TO_END` |
| Actor | Provider/Requester/Admin |
| Requirement | `IP-017` |
| Workflow | `WF-001`, `WF-004`, `WF-023`, `WF-024`, `WF-025`, `WF-026`, `WF-027`, `WF-028`, `WF-029`, `WF-030`, `WF-032` |
| Routes | `AUTH-003`, `AUTH-004`, `WEB-003`, `PROVIDER-001` |
| Seeds | `SEED-ACTOR-PROVIDER-A`, `SEED-MARKETPLACE-NORMAL-SUPPLY`, `SEED-MARKETPLACE-PAGINATED` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | The full journey completes only through valid transitions and all downstream effects are correct. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Cross-module state, actor boundaries, refresh/read-back, rollback, and final settlement. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 191. `REQ-IP-019-E2E` — IP-019 END_TO_END: Task Event Score Hooks: Update matching profiles after apply, select, approve, dispute, cancel events.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P1` |
| Type | `END_TO_END` |
| Actor | Provider/Requester/Admin |
| Requirement | `IP-019` |
| Workflow | `WF-036`, `WF-040`, `WF-048`, `WF-049`, `WF-050`, `WF-051`, `WF-053`, `WF-054`, `WF-063` |
| Routes | `PROVIDER-004`, `REQUESTER-005`, `REQUESTER-006`, `REQUESTER-007`, `DISPUTE-001`, `DISPUTE-003`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-TASK-OPEN-ELIGIBLE`, `SEED-TASK-SUBMITTED-APPROVABLE`, `SEED-DISPUTE-OPEN`, `SEED-WEBSITE-QUALITY-HISTORY` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-007`, `BLK-P1-012` |
| Expected result | The full journey completes only through valid transitions and all downstream effects are correct. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Cross-module state, actor boundaries, refresh/read-back, rollback, and final settlement. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 192. `REQ-IP-020-E2E` — IP-020 END_TO_END: BullMQ jobs: decay-boost-factors, expire-overrides, cleanup-impressions, flag-neglected-websites, update-opportunity-scores.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P0` |
| Type | `END_TO_END` |
| Actor | Internal/Admin |
| Requirement | `IP-020` |
| Workflow | `WF-077` |
| Routes | `ADMIN-HEALTH-001`, `ADMIN-OVERRIDE-002`, `ADMIN-VIS-001`, `ADMIN-WEBSTAT-003` |
| Seeds | `SEED-MAINTENANCE-DUE-RECORDS`, `SEED-MARKETPLACE-HEALTH` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P1-015`, `BLK-P1-016`, `BLK-P2-010` |
| Expected result | The full journey completes only through valid transitions and all downstream effects are correct. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Cross-module state, actor boundaries, refresh/read-back, rollback, and final settlement. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Stage 16 — Browser UI tests
Tests in this stage: **3**

### 193. `REQ-MC-019-UI` — MC-019 BROWSER_UI: Show valid options, hide restricted/blocked, guide to valid matches. Users must not see internal restrictions.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `BROWSER_UI` |
| Actor | Provider/Admin |
| Requirement | `MC-019` |
| Workflow | `WF-023`, `WF-024`, `WF-029`, `WF-030`, `WF-034`, `WF-035` |
| Routes | `PROVIDER-001`, `PROVIDER-003` |
| Seeds | `SEED-MATCH-HARD-FILTER-MATRIX`, `SEED-MARKETPLACE-NO-VALID-CANDIDATES`, `SEED-OVERRIDE-MATRIX` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003`, `BLK-P1-004` |
| Expected result | Browser state accurately represents API eligibility/result and exposes no internal rule names. The implemented subpath may pass, but the documented gap must remain blocked and prevents a full requirement pass. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Frontend source availability, selectors, loading/error/empty states, refresh and session behavior. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 194. `REQ-QC-007-UI` — QC-007 BROWSER_UI: If insufficient matches: relax niche strictness, increase visibility of lower-priority, allow broader matching. Trigger: low count or admin. Avoid empty UX.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `BROWSER_UI` |
| Actor | Provider/Admin |
| Requirement | `QC-007` |
| Workflow | `WF-028`, `WF-029`, `WF-056` |
| Routes | `PROVIDER-001`, `ADMIN-CONFIG-001`, `ADMIN-MODE-001`, `ADMIN-MODE-002` |
| Seeds | `SEED-MARKETPLACE-LOW-SUPPLY`, `SEED-MARKETPLACE-NO-VALID-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Frontend source availability, selectors, loading/error/empty states, refresh and session behavior. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

### 195. `REQ-QC-010-UI` — QC-010 BROWSER_UI: If no matches, do NOT show system error. Attempt fallback. Guide behavior through visibility, prevent abuse silently.

- [ ] **Preconditions and seed validated**
- [ ] **Primary action executed**
- [ ] **HTTP/service result asserted**
- [ ] **Authoritative state and side effects asserted**
- [ ] **Negative/boundary behavior asserted**
- [ ] **Failure artifacts recorded when applicable**

| Field | Value |
|---|---|
| Priority | `P2` |
| Type | `BROWSER_UI` |
| Actor | Provider |
| Requirement | `QC-010` |
| Workflow | `WF-028`, `WF-029`, `WF-030` |
| Routes | `PROVIDER-001` |
| Seeds | `SEED-MARKETPLACE-LOW-SUPPLY`, `SEED-MARKETPLACE-NO-VALID-CANDIDATES` |
| Readiness | `BLOCKED` |
| Blockers | `BLK-P0-008`, `BLK-P1-003` |
| Expected result | Expected gap evidence: the required behavior is absent or incomplete. Do not mark this test passed as product compliance. |
| Business assertion | Requirement behavior is proven only to the extent supported by the reviewed source. Partial or missing implementation remains explicitly failed/blocked. |
| State/side effects | Assert all requirement-specific database rows, counters, normalized domains, timestamps, status changes, events, audit records, visibility, scoring, quota, and cooldown effects. |
| Negative focus | Frontend source availability, selectors, loading/error/empty states, refresh and session behavior. |
| Automation | `PLANNED_NOT_IMPLEMENTED` |
| Execution | `NOT_EXECUTED` |

**Evidence record**

- Command/spec:
- Started:
- Finished:
- Result: `NOT_RUN`
- HTTP/service output:
- Database/read-back evidence:
- Screenshot/trace/log:
- Defect or blocker ID:
- Notes:

# Final execution sign-off

- [ ] All 195 test entries have an explicit result.
- [ ] Every `FAIL`, `BLOCKED`, `NOT_IMPLEMENTED`, or approved skip links to a defect/blocker record.
- [ ] No critical authentication fixture was silently skipped.
- [ ] No business-rule test was accepted merely because it avoided HTTP 500.
- [ ] Database state was checked after every mutation and concurrency test.
- [ ] Background jobs were tested directly and through the real queue where required.
- [ ] Browser tests used authoritative API refresh/read-back.
- [ ] Final counts reconcile with the CSV test catalogue.
- [ ] Typecheck, lint, unit/integration tests, builds, and Playwright suites are recorded.
- [ ] The document verification report was regenerated from the executed evidence.

## Current baseline summary

| Metric | Count |
|---|---:|
| Total tests | 195 |
| Workflow tests | 77 |
| Requirement tests | 118 |
| Blocked classification | 162 |
| Conditional classification | 33 |
| Priority P0 | 71 |
| Priority P1 | 84 |
| Priority P2 | 40 |

## Test-type totals

| Test type | Count |
|---|---:|
| `API_ADMIN_WORKFLOW` | 10 |
| `API_AUTH_WORKFLOW` | 7 |
| `API_CONTRACT` | 40 |
| `API_INTEGRATION` | 12 |
| `API_WORKFLOW` | 37 |
| `AUDIT_TRAIL` | 3 |
| `BOUNDARY_ANALYSIS` | 8 |
| `BROWSER_UI` | 3 |
| `DETERMINISTIC_ORDERING` | 1 |
| `END_TO_END` | 5 |
| `POSTGRES_CONCURRENCY` | 11 |
| `POSTGRES_INTEGRATION` | 46 |
| `SECURITY` | 3 |
| `SERVICE_INTEGRATION` | 2 |
| `WORKER_JOB` | 7 |

## Baseline conclusion

The checklist is complete as a source-grounded execution plan. It does **not** claim that Playwright automation is implemented or that any marketplace test has passed.
