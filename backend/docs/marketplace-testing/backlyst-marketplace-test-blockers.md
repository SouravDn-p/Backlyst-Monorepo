# Backlyst Marketplace Testing Blockers

## Document identity

- **Branch:** `fix/prisma-migration-history`
- **Base commit:** `285028080233238c214cdc9231a292fda390ea1f`
- **Source state:** Base commit plus uncommitted working-tree changes
- **Verified route inventory:** 104 unique routes
- **Verified workflow catalogue:** 77 workflows
- **Seed requirements:** 67 scenarios
- **Error catalogue:** 198 source-defined error conditions
- **State transitions:** 71 unique transition IDs
- **Status:** `PARTIAL_WITH_BLOCKERS`

## Severity model

| Severity | Meaning |
|---|---|
| `P0` | Testing cannot produce trustworthy results, or a critical product/security requirement is violated. |
| `P1` | A major marketplace workflow or algorithm rule cannot be verified correctly. |
| `P2` | Coverage, determinism, maintainability, or documentation quality is incomplete. |
| `P3` | Source-quality issue that should be repaired but does not independently block all testing. |

## Blocker summary

| Severity | Open blockers |
|---|---:|
| `P0` | 8 |
| `P1` | 16 |
| `P2` | 10 |
| `P3` | 2 |
| **Total** | **36** |

---

# P0 blockers

## BLK-P0-001 — Prisma migration chain is not yet proven healthy

- **Category:** `DATABASE_MIGRATION_BLOCKED`
- **Evidence:** The observed local `prisma migrate deploy` run failed with P3018 and PostgreSQL `42P07` because `DomainInteraction_sourcePrimaryCategoryKey_idx` already existed. Earlier runtime evidence also showed `Website.qualityScore` missing.
- **Impact:** Seed setup, Prisma Client queries, API workflows, and concurrency tests can fail before marketplace logic runs.
- **Affected workflows:** All 77 workflows; especially `WF-031`–`WF-033`, `WF-063`–`WF-077`.
- **Required action:** Repair and apply the complete migration chain to a newly created scratch database, then recreate or reconcile the dedicated E2E database.
- **Exit condition:** `prisma migrate deploy` and `prisma migrate status` pass on an empty test database; `Website.qualityScore` and all marketplace objects exist.

## BLK-P0-002 — No verified isolated test-database safety guard

- **Category:** `TEST_ENVIRONMENT_BLOCKED`
- **Evidence:** The uploaded seed function accepts any `PrismaClient`; no database-name, host, environment, or destructive-reset guard exists in `test/marketplace-seed.ts`.
- **Impact:** A reset/cleanup command could target the wrong database, and test state may contaminate development data.
- **Affected workflows:** Every workflow requiring seed/reset.
- **Required action:** Add a guard requiring `NODE_ENV=test`, an approved database-name suffix such as `_test` or `e2e`, and an explicit reset flag.
- **Exit condition:** Reset refuses all non-test URLs and succeeds only against the approved disposable database.

## BLK-P0-003 — Public self-registration conflicts with the fixed-user requirement

- **Category:** `PRODUCT_REQUIREMENT_CONFLICT`
- **Evidence:** `POST /auth/register` and `POST /auth/verify-register-otp` are public in `src/modules/auth/auth.controller.ts:46-65`.
- **Impact:** The deployed authentication surface contradicts the stated requirement: fixed users and no public registration.
- **Affected workflows:** `WF-005`, `WF-006`, all authentication/security tests.
- **Required action:** Product owner must decide whether to disable/remove public registration or formally change the requirement.
- **Exit condition:** A security test proves unauthenticated public registration is unavailable, or the requirement is explicitly revised.

## BLK-P0-004 — Existing Playwright application test uses the wrong route

- **Category:** `STALE_TEST_ROUTE`
- **Evidence:** `test/e2e/marketplace-algorithm.api.spec.ts:104` calls `POST /provider-task/apply/:id`; the verified route is `POST /provider-task/:id/apply` (`PROVIDER-004`).
- **Impact:** The test does not exercise the application handler.
- **Affected workflows:** `WF-036`–`WF-038`, `WF-069`–`WF-076`.
- **Required action:** Replace the stale path with route ID `PROVIDER-004`.
- **Exit condition:** Test reaches `ProviderTaskController.applyToTask` with a valid task and provider website.

## BLK-P0-005 — “Concurrency” test does not test a valid concurrent business race

- **Category:** `CONCURRENCY_NOT_VERIFIED`
- **Evidence:** `test/e2e/marketplace-algorithm.api.spec.ts:100-116` sends three requests for `e2e-non-existent-task-id` and only asserts that responses are not HTTP 500.
- **Impact:** It cannot prove duplicate protection, weekly quota locking, same-day limits, cooldown, reciprocal protection, idempotency, or transactional rollback.
- **Affected workflows:** `WF-075`, `WF-076`, transition `TR-TASK-004`, all algorithm race requirements.
- **Required action:** Seed independently valid requests competing for one real invariant and verify exactly one logical winner plus stable business rejections.
- **Exit condition:** Real PostgreSQL concurrency tests assert row counts, statuses, counters, pair state, and no partial failed-request data.

## BLK-P0-006 — Authentication failures can silently skip most existing tests

- **Category:** `FALSE_GREEN_TEST_RISK`
- **Evidence:** Existing tests use `test.skip(!token, ...)` at lines 52, 62, 79, and 98. Login failure can therefore turn critical tests into skips rather than failures.
- **Impact:** A broken seed, login route, response shape, or base URL can produce an apparently successful suite with minimal execution.
- **Affected workflows:** Current API suite and all actor-dependent workflows.
- **Required action:** Make actor authentication a required fixture assertion; fail setup when required tokens are unavailable.
- **Exit condition:** Missing provider/requester/admin authentication fails the suite before marketplace tests execute.

## BLK-P0-007 — Current executable seed is far below required coverage

- **Category:** `MISSING_SEED_CAPABILITY`
- **Evidence:** `test/marketplace-seed.ts` creates one requester, one active provider, one restricted provider, their websites/profiles, and one wallet. It creates no marketplace task, application, assignment, completion, dispute, interaction history, impression, pattern flag, override, taxonomy relation, or concurrency boundary.
- **Impact:** Most of the 77 documented workflows and all meaningful algorithm tests cannot be arranged.
- **Affected workflows:** `WF-018`–`WF-077`.
- **Required action:** Implement scenario factories for all 67 seed requirements, beginning with the minimal dependency chain for the one-by-one checklist.
- **Exit condition:** Every test references a seed factory that validates its starting invariants.

## BLK-P0-008 — Frontend/browser workflow source is not available for verification

- **Category:** `MISSING_FRONTEND_ROUTE`
- **Evidence:** The uploaded evidence contains the NestJS backend only. No frontend routes, components, API client, selectors, or browser authentication implementation were included.
- **Impact:** Browser-visible Playwright workflows cannot be mapped or proven.
- **Affected workflows:** Every workflow intended for headed browser execution.
- **Required action:** Provide the frontend repository or a source ZIP containing routes, marketplace pages, API clients, auth/session handling, and stable selectors.
- **Exit condition:** Each user-visible workflow maps to an existing frontend route and verified UI elements.

---

# P1 blockers

## BLK-P1-001 — Playwright configuration was not included in reviewed evidence

- **Category:** `TEST_ENVIRONMENT_BLOCKED`
- **Evidence:** Working-tree output lists untracked `playwright.config.ts`, but the evidence ZIP did not include it.
- **Impact:** `baseURL`, web-server startup, browser projects, traces, screenshots, videos, retries, timeouts, and reporter behavior are unverified.
- **Required action:** Include and review `playwright.config.ts`.
- **Exit condition:** Config starts/validates backend and frontend, uses the isolated E2E environment, and captures failure artifacts.

## BLK-P1-002 — Existing test suite contains only five shallow API tests

- **Category:** `TEST_COVERAGE_INCOMPLETE`
- **Evidence:** `test/e2e/marketplace-algorithm.api.spec.ts` defines five tests; none covers a full task lifecycle, state transition matrix, admin workflow, seed cleanup, or browser flow.
- **Impact:** 104 routes, 77 workflows, 71 transitions, and core algorithm rules remain untested.
- **Required action:** Regenerate tests from the verified catalogue rather than extending the five-test draft ad hoc.
- **Exit condition:** Every in-scope route/workflow has mapped positive, authorization, validation, and state tests.

## BLK-P1-003 — Opportunity test only checks that a body exists

- **Category:** `RESPONSE_CONTRACT_INCOMPLETE`
- **Evidence:** Existing opportunity test asserts HTTP 200 and `body` is defined (`marketplace-algorithm.api.spec.ts:51-59`).
- **Impact:** Filtering, pagination, scoring, ranking, match reasons, non-exposure of internals, and deterministic ordering are not verified.
- **Required action:** Define the exact response contract and assert eligible/ineligible task IDs, metadata, order, pagination, and hidden fields.
- **Exit condition:** Controlled candidates produce the expected ordered result and exact schema.

## BLK-P1-004 — Suppression test can pass without evaluating suppression

- **Category:** `WEAK_ASSERTION`
- **Evidence:** The assertion runs only when the guessed response value is an array (`lines 69-75`). If the response shape differs, the test performs no marketplace assertion.
- **Impact:** A restricted/suppressed profile may be mishandled while the test passes.
- **Required action:** Assert the exact response schema first, then assert the expected blocked/empty behavior from the actual algorithm contract.
- **Exit condition:** The test fails for every incorrect suppression outcome.

## BLK-P1-005 — Static seed identifiers are collision-prone

- **Category:** `NONDETERMINISTIC_TEST_DATA`
- **Evidence:** Seed uses fixed emails, IDs, and domains such as `requester.e2e@backlyst.test` and `e2e-provider-active-website-id`.
- **Impact:** Parallel workers and repeated runs share mutable state, causing order dependence and stale histories.
- **Required action:** Introduce one run-scoped identifier and scenario-scoped cleanup.
- **Exit condition:** Two consecutive and parallel test runs do not collide.

## BLK-P1-006 — Seed updates do not restore a known complete state

- **Category:** `STALE_STATE_RISK`
- **Evidence:** Several `upsert(... update: {})` calls preserve old website/profile data; other updates restore only selected fields.
- **Impact:** Prior tests can leave categories, scores, limits, flags, impressions, or statuses that alter later results.
- **Required action:** Make each seed factory overwrite every state relevant to its scenario or recreate records in an isolated schema/database.
- **Exit condition:** Seed validation reports identical starting state on every run.

## BLK-P1-007 — No cleanup implementation is verified

- **Category:** `TEST_DATA_NOT_CLEANED`
- **Evidence:** The seed function returns entities but defines no teardown, run ID, dependency-order deletion, config restoration, or external-file cleanup.
- **Impact:** Tests are not repeatable and may influence later matching, exposure, quota, pattern, and quality calculations.
- **Required action:** Implement cleanup by run ID and snapshot/restore singleton configuration.
- **Exit condition:** Database returns to the baseline after the suite, including failures.

## BLK-P1-008 — Canonical taxonomy matching data is not seeded

- **Category:** `MISSING_SEED_CAPABILITY`
- **Evidence:** Current seed writes legacy `Website.categories` arrays but does not create canonical marketplace categories, tags, relations, or website/task taxonomy joins.
- **Impact:** Exact, related, broad, tag-overlap, niche-distribution, and progressive-relaxation tests are not trustworthy.
- **Affected workflows:** `WF-025`–`WF-028`, `WF-059`, `WF-073`.
- **Required action:** Implement `SEED-TAXONOMY-BASE` and matching-specific taxonomy scenarios.
- **Exit condition:** Matching tests use the same normalized taxonomy models as production services.

## BLK-P1-009 — Response DTO contracts remain unverified for many routes

- **Category:** `RESPONSE_CONTRACT_INCOMPLETE`
- **Evidence:** Route inventory marks many results `SERVICE_RETURN_REQUIRES_DETAILED_VERIFICATION`; controllers often return service objects without explicit response DTOs.
- **Impact:** Playwright cannot safely assert exact schemas, pagination, hidden fields, or frontend types.
- **Required action:** Trace every route through service returns and serializer/global response behavior.
- **Exit condition:** Each route has documented success and error JSON schemas.

## BLK-P1-010 — Stable application error codes are absent

- **Category:** `ERROR_CONTRACT_INCOMPLETE`
- **Evidence:** Ordinary NestJS business exceptions expose status/message but no stable application code; only mapped Prisma errors include codes.
- **Impact:** Frontend and Playwright tests must depend on messages, some of which are dynamic or randomized.
- **Required action:** Either add stable business error codes in a separate backend task or formally test the current allowed message sets.
- **Exit condition:** Negative tests have a stable machine-readable assertion contract.

## BLK-P1-011 — Marketplace validation messages are randomized

- **Category:** `NONDETERMINISTIC_ERROR_CONTRACT`
- **Evidence:** Validation uses safe randomized public messages for cooldown, quota, reciprocal, niche, pattern, and eligibility failures.
- **Impact:** Exact-message Playwright assertions will be flaky and cannot distinguish internal rules through public API output alone.
- **Required action:** Assert the allowed public set and verify internal rule invariants through direct integration observability/admin APIs.
- **Exit condition:** Tests deterministically prove the business rule without relying on one message.

## BLK-P1-012 — DomainInteraction non-completed states are not runtime-proven

- **Category:** `PARTIAL_IMPLEMENTATION`
- **Evidence:** Prisma enum contains `PENDING`, `ACCEPTED`, `COMPLETED`, `REJECTED`, `CANCELLED`, and `DISPUTED`, but reviewed call sites prove the recorder mainly through `COMPLETED` settlement.
- **Impact:** Documentation/tests cannot claim rejected, cancelled, or disputed relationship tracking.
- **Affected workflows:** `WF-048`–`WF-054`, `WF-069`–`WF-076`.
- **Required action:** Verify/add explicit call paths in a separate implementation task.
- **Exit condition:** Each required interaction status has a reachable source path and integration test.

## BLK-P1-013 — Marketplace override has no update route

- **Category:** `MISSING_BACKEND_API`
- **Evidence:** Verified routes provide create, list, and delete/revoke only: `ADMIN-OVERRIDE-001`–`003`.
- **Impact:** A documented “update override” workflow cannot be tested as a direct update.
- **Required action:** Treat changes as revoke + create, or add a dedicated update API through a separate backend task.
- **Exit condition:** Workflow and UI use the chosen canonical behavior.

## BLK-P1-014 — No persisted requester draft workflow is exposed

- **Category:** `MISSING_BACKEND_API`
- **Evidence:** `TaskStatus.DRAFT` exists, but `REQUESTER-002` creates and publishes an `OPEN` task. No requester draft-save/update route was verified.
- **Impact:** Frontend “save draft/edit draft/publish” cannot be tested against the current backend contract.
- **Required action:** Mark draft UI blocked or implement draft APIs separately.
- **Exit condition:** Either workflow is removed from scope or real draft routes exist.

## BLK-P1-015 — Expiry transition lacks a verified direct execution path

- **Category:** `BACKGROUND_WORKER_UNVERIFIED`
- **Evidence:** `EXPIRED` exists in the lifecycle model, but no direct user route was found and worker execution was not proven.
- **Impact:** Task expiry and removal from opportunity results remain untested.
- **Required action:** Trace the exact maintenance worker/producer call path and add deterministic worker invocation plus queue-to-worker coverage.
- **Exit condition:** A controlled clock moves eligible tasks to EXPIRED and removes them from matching.

## BLK-P1-016 — Redis/BullMQ worker runtime is unverified

- **Category:** `REDIS_OR_WORKER_BLOCKED`
- **Evidence:** Worker source exists, but uploaded evidence contains no successful Redis health, producer, queue registration, worker-start, retry, or end-to-end execution result.
- **Impact:** Override expiry, impression cleanup, quality/boost maintenance, and other background effects cannot be claimed.
- **Affected workflow:** `WF-077`.
- **Required action:** Add deterministic direct-worker tests and at least one real queue-to-worker test.
- **Exit condition:** Worker execution and observable state changes pass in the E2E environment.

---

# P2 blockers

## BLK-P2-001 — Working tree is dirty

- **Category:** `SOURCE_IDENTITY_AMBIGUOUS`
- **Evidence:** Modified `package.json`, marketplace engine module, TypeScript configs, and multiple untracked test/document files.
- **Impact:** Commit SHA alone does not identify the tested source and regeneration may drift.
- **Required action:** Commit or stash unrelated work and record the exact diff included in testing.
- **Exit condition:** Test report identifies one immutable commit, or commit plus an archived patch hash.

## BLK-P2-002 — Existing documentation and executable tests are out of sync

- **Category:** `DOCUMENTATION_DRIFT`
- **Evidence:** Docs now contain 104 routes, 77 workflows, 67 seeds, 198 errors, and 71 transitions; executable test code still contains the earlier five-test draft.
- **Impact:** Documentation readiness may be mistaken for implemented coverage.
- **Required action:** Keep statuses explicit: `DOCUMENTED`, `IMPLEMENTED`, `EXECUTED`, `PASSED`.
- **Exit condition:** Traceability maps each test ID to a real test implementation and latest execution result.

## BLK-P2-003 — No frontend stable-selector inventory

- **Category:** `MISSING_FRONTEND_ROUTE`
- **Evidence:** No frontend source was reviewed.
- **Impact:** Browser tests may rely on brittle visible text/CSS selectors.
- **Required action:** Inventory semantic roles and add minimal `data-testid` attributes where necessary.
- **Exit condition:** Every browser workflow has stable selectors and accessibility assertions.

## BLK-P2-004 — External OAuth is environment-dependent

- **Category:** `EXTERNAL_DEPENDENCY`
- **Evidence:** Google OAuth routes exist, but no test OAuth environment or callback evidence was supplied.
- **Impact:** Full Google login cannot be marked as automated E2E coverage.
- **Required action:** Maintain a dedicated OAuth test client or mark one manual contract test separately.
- **Exit condition:** Callback flow is executed safely in a non-production environment.

## BLK-P2-005 — MOZ integration is environment-dependent

- **Category:** `EXTERNAL_DEPENDENCY`
- **Evidence:** `REQUESTER-001 POST /task-requester/moz-stats` exists; deterministic external credentials/responses were not provided.
- **Impact:** Task-creation support flow may be flaky or blocked offline.
- **Required action:** Decide whether to use a controlled provider sandbox or contract-test adapter.
- **Exit condition:** Tests use deterministic external behavior without claiming a mock proves production availability.

## BLK-P2-006 — File-upload/storage dependencies are unverified

- **Category:** `EXTERNAL_DEPENDENCY`
- **Evidence:** Completion and verification workflows can use proof documents/screenshots; S3/Cloudinary packages exist, but no E2E storage configuration was reviewed.
- **Impact:** Browser completion and screenshot-verification workflows may fail outside algorithm logic.
- **Required action:** Configure a safe test bucket/provider or an approved local adapter.
- **Exit condition:** Upload, retrieval, cleanup, and invalid-file tests pass.

## BLK-P2-007 — Time-bound algorithm tests lack a controlled clock

- **Category:** `NONDETERMINISTIC_TIME`
- **Evidence:** No frozen-time fixture is implemented for cooldown, daily/weekly limits, expiry, impressions, overrides, deadlines, or maintenance.
- **Impact:** Boundary tests can become flaky and slow.
- **Required action:** Add deterministic clock/database timestamp helpers and prohibit arbitrary sleeps.
- **Exit condition:** One millisecond before/at/after boundary tests are repeatable.

## BLK-P2-008 — Route-level ownership mapping remains incomplete

- **Category:** `AUTHORIZATION_UNVERIFIED`
- **Evidence:** Controllers commonly apply JWT guards, while ownership and marketplace eligibility are enforced inside services.
- **Impact:** Route inventory alone cannot prove wrong-user/wrong-website access behavior.
- **Required action:** Map service-level ownership branch and error for every mutation/read involving private data.
- **Exit condition:** Every route has valid actor, wrong actor, wrong owner, and deleted/disabled actor tests.

## BLK-P2-009 — Unknown-field behavior must follow whitelist semantics

- **Category:** `VALIDATION_CONTRACT`
- **Evidence:** Global `ValidationPipe` uses `whitelist: true` but not globally `forbidNonWhitelisted`.
- **Impact:** Tests expecting unknown fields to fail may be incorrect; they may instead be stripped.
- **Required action:** Document per-route behavior and assert stripped fields do not alter persisted state.
- **Exit condition:** Validation tests match runtime pipe configuration.

## BLK-P2-010 — No execution report from a complete environment

- **Category:** `NOT_VERIFIABLE_ENVIRONMENT`
- **Evidence:** No recorded successful backend start, frontend start, database migration, seed validation, Playwright API run, headed browser run, worker run, lint, typecheck, or build accompanies the docs.
- **Impact:** No workflow can yet be classified `PASSED`.
- **Required action:** Execute in the documented dependency order and record command, environment, exit code, test count, failures, skips, and artifacts.
- **Exit condition:** Canonical execution report exists and has no unexplained skips.

---

# P3 source-quality blockers

## BLK-P3-001 — Duplicate route decorator on manual review request

- **Category:** `SOURCE_QUALITY_DEFECT`
- **Evidence:** `src/modules/website/website-verification/website-verification.controller.ts:187` and `:199` both declare `@Post('manual-review/request/:websiteId')` on the same method.
- **Impact:** Documentation noise and possible Swagger/runtime metadata ambiguity.
- **Required action:** Remove the duplicate decorator/metadata in a separate source change.
- **Exit condition:** One route decorator and one coherent Swagger operation remain.

## BLK-P3-002 — Shared TaskStatus enum is broader than application-state semantics

- **Category:** `MODEL_CONTRACT_AMBIGUITY`
- **Evidence:** `PlacementApplication.status` reuses task lifecycle values, while runtime only proves a subset for applications.
- **Impact:** Tests/frontends may assume unsupported application transitions.
- **Required action:** Restrict documentation/tests to source-proven states; consider a dedicated application enum in a future migration.
- **Exit condition:** API contracts expose only valid application states or the data model is narrowed.

---

# Testing readiness gates

Do not begin the complete Playwright implementation until Gates 1–3 pass.

## Gate 1 — Environment safety

- [ ] Scratch migration chain passes
- [ ] Dedicated E2E database identity is verified
- [ ] Reset safety guard is implemented
- [ ] Backend health check passes
- [ ] Redis/worker availability is explicitly known
- [ ] Frontend source and start command are available

## Gate 2 — Deterministic data

- [ ] Actor authentication fixtures fail instead of skip
- [ ] Minimum task lifecycle seed exists
- [ ] Canonical taxonomy seed exists
- [ ] Cleanup by run ID exists
- [ ] Singleton config snapshot/restore exists
- [ ] Frozen-time fixture exists

## Gate 3 — Contract correctness

- [ ] Current tests use verified route IDs
- [ ] Response schemas are documented
- [ ] Ownership branches are mapped
- [ ] Randomized error assertions use allowed sets
- [ ] Public-registration requirement conflict is resolved
- [ ] Browser routes and stable selectors are inventoried

## Gate 4 — Coverage implementation

- [ ] Every documented test ID has source code
- [ ] No critical test is skipped
- [ ] Major user workflow has browser coverage
- [ ] Each mutation has auth, role/ownership, validation, state, retry, and side-effect tests
- [ ] Algorithm rules have controlled positive, negative, boundary, and real PostgreSQL concurrency tests
- [ ] Background jobs have direct-worker and queue-to-worker coverage

## Gate 5 — Final execution

- [ ] Migration and seed validation pass
- [ ] Playwright API suite passes
- [ ] Headed browser workflow suite passes
- [ ] Real concurrency suite passes
- [ ] Worker tests pass
- [ ] Typecheck, lint, unit/integration tests, and builds pass
- [ ] Execution report contains zero unexplained skips and all failure artifacts

---

# Recommended remediation order

1. Repair and prove the Prisma migration chain.
2. Verify the dedicated E2E database and add the reset safety guard.
3. Review `playwright.config.ts` and frontend source.
4. Replace stale route usage in the current API test.
5. Implement the smallest deterministic seed chain:
   authentication → websites → taxonomy → open task → application → assignment → completion.
6. Implement cleanup and frozen-time fixtures.
7. Execute the first complete lifecycle through API.
8. Add browser-visible lifecycle coverage.
9. Add algorithm component tests.
10. Add real PostgreSQL concurrency tests.
11. Add admin controls and maintenance workers.
12. Regenerate traceability and final document verification from executed evidence.

## Final status

`PARTIAL_WITH_BLOCKERS`

The documentation foundation is significantly improved, but no claim of complete marketplace test coverage is currently supportable.
