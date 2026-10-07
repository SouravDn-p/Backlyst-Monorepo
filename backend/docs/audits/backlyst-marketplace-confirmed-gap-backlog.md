# BACKLYST MARKETPLACE CONFIRMED GAP BACKLOG

## Confirmed Gaps Proven Against Current Git HEAD

### Gap 1
- **Requirement ID:** MC-002
- **Exact missing behavior:** The completion validation stage lacks strict transaction boundaries to prevent double spending of slot quotas under heavy load.
- **Current partial implementation:** Validation runs locally in memory before persisting the interaction, but without advisory locks.
- **Runtime consequence:** Potential quota exhaustion / tier bypass if multiple assignments happen simultaneously.
- **Files requiring change:** `src/modules/task/market-algoritm/validation.engine.ts`
- **Migration impact:** None.
- **Tests required:** Concurrency test suite simulating high concurrent assignment requests.
- **Severity:** P0
- **Implementation dependency:** Transaction/locking mechanism across NestJS modules.

### Gap 2
- **Requirement ID:** MC-005
- **Exact missing behavior:** Weekly limit increments are not protected by row-level locking.
- **Current partial implementation:** `DistributionEngine` reads limits and counts, but the increment operation is non-atomic.
- **Runtime consequence:** Miscounting weekly limits under race conditions.
- **Files requiring change:** `src/modules/task/market-algoritm/distribution-engine.service.ts`
- **Migration impact:** None.
- **Tests required:** DB locking test confirming sequential processing.
- **Severity:** P0
- **Implementation dependency:** Gap 1 (Locking architecture).
