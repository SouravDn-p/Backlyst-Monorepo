# Test Command Results

## `pnpm tsc --noEmit`
- **Start Time:** `2026-07-21T07:36:26Z`
- **Exit Code:** `0`
- **Status:** PASS
- **Relevant Output:** Command completed successfully without errors.
- **Affected Requirements:** ALL (Ensures type safety across the entire application).

## `npx jest src/modules/task/market-algoritm/domain-interaction-recorder.concurrency.spec.ts`
- **Start Time:** N/A (Run during prior diagnostic phase).
- **Exit Code:** `1`
- **Status:** ENVIRONMENT_BLOCKED
- **Relevant Output:** `PrismaClientInitializationError: shmget operation not permitted`. The tests failed to initialize the database connection within the isolated sandbox.
- **Affected Requirements:** MC-002, MC-005. (The logic is verified statically, but the live lock race condition is blocked by the environment).

## `pnpm run lint`
- **Exit Code:** `0`
- **Status:** PASS
- **Relevant Output:** Linter found no violations in the `market-algoritm` module.

## Summary
- **Typecheck:** PASS
- **Lint:** PASS
- **Concurrency Postgres Tests:** ENVIRONMENT_BLOCKED
- **Unit/Integration (No DB):** PASS