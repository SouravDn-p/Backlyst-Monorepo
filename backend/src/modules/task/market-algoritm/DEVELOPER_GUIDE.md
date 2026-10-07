# Market Algorithm — Developer Guide

Purpose: a precise, developer-focused explanation of the market-algoritm module: what each file does, why design choices were made, how the code behaves at runtime, and where to extend or test it. Use this when reviewing, debugging, tuning, or extending the matching pipeline.

Contents
- Quick summary
- File-by-file analysis (what it does and why)
- Data model fields used
- End-to-end matching flow (step-by-step)
- Key formulas and constants (with rationale)
- Operational considerations and edge-cases
- Extension points and recommended next tasks
- Testing checklist

---

## Quick summary
This subsystem implements a robust matchmaking pipeline that: (1) finds candidate provider `Website` records using a progressive relaxation engine, (2) computes per-provider scores from a combination of Visibility (VS), Opportunity (OS), Reputation (RS) and Boost (BF), (3) applies exposure penalties and daily capacity caps to ensure fair distribution, and (4) runs a daily cron which increases OS/BF for starved providers and can `forceMatchNext` to guarantee opportunities.

Design goals enforced in code
- No-empty-result guarantee via progressive relaxation + absolute fallbacks.
- Fair distribution via exposure penalty and `MAX_MATCHES_PER_DAY` cap.
- New-user support via `boostFactor` with controlled decay.
- Quality protection via `reputationScore` and temporary suppression.

---

## File-by-file analysis

- `matching-relaxation.engine.ts`
  - Responsibility: retrieve an initial candidate set for a `PlacementTask` using progressive filter relaxation.
  - Key functions:
    - `findMatchingWebsites(task)` — main entry. Steps:
      1. Load requester `Website` by `task.requesterWebsiteId`.
      2. Loop relaxation levels 0→4 calling `queryWebsitesByLevel` until `minRequiredCandidates` (default 5) found.
      3. If still empty, fallback to top verified websites (absolute fallback) — ensures the system never returns an empty candidate list.
    - `queryWebsitesByLevel(task, requesterWebsite, level)` — builds a Prisma `where` query per level:
      - level 0: same `industry` and `country` (strict)
      - level 1: same `industry`, any country
      - level 2: any industry, same `country`
      - level 3: any industry/country but must be `VERIFIED`
      - level 4: fully relaxed (drops `verificationStatus` requirement)

  - Why this design: progressive relaxation prioritizes the best matches first and prevents `no result` by progressively widening the pool.

- `ranking.service.ts` (RankingService)
  - Responsibility: compute final scores for candidate `Website` entries and enforce distribution constraints.
  - Key parts:
    - `weights` object: current default `{ vs:0.3, os:0.3, rs:0.2, bf:0.2 }`.
    - Loads all `UserMatchingProfile` records for candidate authors and daily match counts in parallel.
    - For each candidate: computes `boostScore = profile.boostFactor * 20` to map BF into an absolute range.
    - Final score formula (implemented):
      score = vs*w_vs + os*w_os + rs*w_rs + boostScore*w_bf - dailyMatches*EXPOSURE_PENALTY + (forceMatchNext ? FORCE_MATCH_BONUS : 0)
    - Applies suppression: if `profile.isSuppressed && suppressedUntil > now` → candidate receives score 0.
    - Sorts by score and filters out any provider who already hit `MAX_MATCHES_PER_DAY` (default 3).

  - Why: centralizes fairness (exposure penalty + hard cap), reward for underserved users (`OS`) and quality (`RS`). A high `FORCE_MATCH_BONUS` (1000) guarantees forced inclusions when necessary.

- `scoring.utils.ts`
  - Responsibility: pure functions to compute VS, RS, BF, and combined `calculateScores`.
  - Important constants in `SCORING_CONSTANTS` (single source of truth for math):
    - `VISIBILITY_COMPLETION_WEIGHT = 50` (dominant), `VISIBILITY_QUALITY_WEIGHT = 6`, `EXPERIENCE_WEIGHT = 5`, `VISIBILITY_MAX_EXPERIENCE_SCORE = 20`.
    - Reputation rewards/penalties: success reward `+5` when rating >= 4, failure penalty `-15`.
    - Boost decay: `0.15` per consumed boosted opportunity, min BF = `1.0`.
  - Function responsibilities:
    - `calculateVisibilityScore(completionRate, avgQualityRating, completedInteractions)`
    - `calculateReputationScore(currentRs, wasSuccessful, qualityRating?)`
    - `calculateBoost(currentBf, currentDecayCount)`
    - `calculateScores(profile, wasSuccessful, completionRate, avgQualityRating, qualityRating?)` — returns `{vs, rs, bf, decayCount}`

  - Why: keeping pure functions eases unit testing and ensures math can be reviewed independently from DB code.

- `scoring.service.ts` (ScoringService)
  - Responsibility: orchestrate profile creation/updates after a task completes and call `calculateScores`.
  - Key flow in `updateScoresAfterTask(userId, wasSuccessful, qualityRating?)`:
    1. `getOrCreateProfile(userId)` — ensures new users get sensible defaults: `boostFactor=2.5`, `reputationScore=50`, `visibilityScore=50`, `boostDecayCount=10`, etc.
    2. Compute completed/failed/total interactions, update `completionRate`, update `qualityRatingSum` and `avgQualityRating` if applicable.
    3. Call `calculateScores(...)` to get `vs, rs, bf, decayCount`.
    4. Suppression rule: if `total >= 10 && completionRate < 0.4`, set `isSuppressed=true` and `suppressedUntil = now + 7 days`.
    5. Persist profile updates and reset `opportunityScore=0` and `forceMatchNext=false` (consumes force-match).

  - Why: this service bridges runtime events (task completion) and long-term profile metrics.

- `opportunity-guarantee.cron.ts`
  - Responsibility: daily background job to bump `opportunityScore` and `boostFactor` for starved users and set `forceMatchNext` after long starvation.
  - Behavior:
    - For each active profile: compute hours since last match `hoursSinceLastMatch`.
    - `opportunityScore = ln(1 + hoursSinceLastMatch) * 10`.
    - If `hoursSinceLastMatch > 72` (3 days): `boostFactor = min(3.0, boostFactor + 0.5)`.
    - If `hoursSinceLastMatch > 168` (7 days): `forceMatchNext = true` (will be consumed on next `updateScoresAfterTask`).

  - Why: automated starvation remediation. The cron maintains system fairness over time and guarantees eventual inclusion.

---

## Data model fields used (quick reference)
- `UserMatchingProfile` fields referenced in code:
  - `userId`, `visibilityScore`, `opportunityScore`, `reputationScore`, `boostFactor`, `boostDecayCount`, `completedInteractions`, `failedInteractions`, `totalInteractions`, `completionRate`, `qualityRatingSum`, `avgQualityRating`, `lastMatchedAt`, `createdAt`, `forceMatchNext`, `isSuppressed`, `suppressedUntil`.
- `Website` fields used:
  - `id`, `authorId`, `industry`, `country`, `isDeleted`, `verificationStatus`.
- `PlacementTask` fields used:
  - `requesterWebsiteId`, `requesterId`, plus expected usage of `selectedProviderId` and `assignedAt` for counting daily matches.

Ensure these fields exist and are indexed where appropriate (see operational notes below).

---

## End-to-end matching flow (detailed)
1. A new `PlacementTask` is created.
2. Matching flow calls `MatchingRelaxationEngine.findMatchingWebsites(task)`.
3. Engine loads `requesterWebsite`. If missing, returns global verified websites (fallback).
4. Engine iterates relaxation levels; each level runs a Prisma `findMany` query and returns candidates if `candidates.length >= minRequiredCandidates`.
5. The candidate list is passed to `RankingService.rankAndFilter(candidates)`.
6. Ranking loads all matching profiles and daily match counts.
7. For each candidate:
   - If suppressed: score = 0 (filtered out later).
   - Compute `boostScore = boostFactor * 20`.
   - Compute linear combination using `weights`.
   - Subtract `dailyMatches * EXPOSURE_PENALTY`.
   - Add `FORCE_MATCH_BONUS` if `forceMatchNext`.
8. Sort candidates by score desc.
9. Enforce `MAX_MATCHES_PER_DAY` by removing any provider who already reached the cap.
10. Return the balanced list to the caller (probably the placement assignment logic).

Notes: the match consumer must choose from the returned list and set `selectedProviderId` and `assignedAt` appropriately so daily counts reflect reality.

---

## Key formulas and constants (rationale)
- Visibility weight dominance: completion rate is multiplied by 50 so completion reliability dominates VS—this aligns incentives to finish tasks.
- Quality rating multiplier 6 → creates meaningful difference between ratings without overpowering completion rate.
- Experience uses logarithmic scaling (ln(1 + completed)) to reward repeat contributors while avoiding runaway advantage.
- Boost mapping `BF * 20` converts a multiplicative BF into an additive score in same scale as VS/RS (0–100 ish). This keeps the final linear combination meaningful.
- Exposure penalty (15 per match) reduces priority linearly with today's matches; this and `MAX_MATCHES_PER_DAY` together prevent dominance.
- Force match big bonus (1000) is intentionally large so a `forceMatchNext` will nearly always guarantee selection.

Tuning guidance: if matches become too low-quality, increase `w_rs` and/or increase `REPUTATION_FAILURE_PENALTY`. If new users never get assignments, increase initial BF or BF decay slower.

---

## Operational considerations & edge cases
- Database indexing: ensure indices on `website(authorId, industry, country, verificationStatus, isDeleted)` and on `placementTask(selectedProviderId, assignedAt)` for match counts.
- Race conditions: two match operations could simultaneously include the same provider. Protect critical increments/assignments with transactions where appropriate.
- Force-match consumption: `updateScoresAfterTask` sets `forceMatchNext=false` (consumes force-match). If force-match is set by cron and consumed by ranking, ensure consumer persists assignment quickly to avoid double-consumption.
- Suppression window: suppressed users have score 0 — make sure admins can override in emergencies.
- Scaling: `queryWebsitesByLevel` uses unpaginated `findMany` — if the website table is large, consider using `take`/`skip` or ordered queries to page results or use a relevance index.

---

## Extension points (where to add features)
1. Admin REST endpoints (recommended file: `market-admin.controller.ts`)
   - `POST /admin/matching/force-boost` { userId, amount }
   - `POST /admin/matching/override-visibility` { userId, visibilityScore }
   - `POST /admin/matching/tune` { weights, thresholds }
2. Externalize constants to a DB-backed `matching_config` table or to env variables loaded via `ConfigService`.
3. Add telemetry: emit events when relaxation level increments or force-match is applied (use metrics + structured logs).
4. Adaptive weight controller: a small periodic job adjusts `weights` based on system signals (availability, competition, inactivity).

---

## Testing checklist (practical)
- Unit tests (fast):
  - `calculateVisibilityScore` edge cases (0, 1, large completedInteractions), clamp behavior.
  - `calculateReputationScore` for success/failure and clamping.
  - `calculateBoost` decay/count behavior.
- Integration tests (database mocked or test DB):
  - `matching-relaxation.engine` returns appropriate candidate sets per level when seeded with test websites.
  - `ranking.service` respects `MAX_MATCHES_PER_DAY`, exposes suppressed users, and honors `forceMatchNext`.
  - `opportunity-guarantee.cron` updates OS/BF and sets forceMatchNext for simulated starved profiles.

Example Jest test command (project root):
```bash
npm run test
```

---

## Suggested immediate next tasks (priority)
1. Implement basic Admin API endpoints (High) — lets product quickly override issues in production.
2. Extract `weights` and `SCORING_CONSTANTS` to config (High) — enables runtime tuning and A/B experiments.
3. Add unit tests for `scoring.utils` and integration tests for `matching-relaxation.engine` (High).
4. Add structured logs for relaxation decisions and force-match events (Medium).

---

If you want, I can now implement one of the immediate tasks: (A) Admin API skeleton, (B) externalize config to `ConfigService` and env, or (C) add unit tests for `scoring.utils`. Reply with A/B/C and I'll start and track changes in the todo list.
