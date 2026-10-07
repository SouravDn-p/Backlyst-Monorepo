# Credit And Referral API Guide

This document explains the routes in [credit.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit.controller.ts:1), how they connect to each other, what each route depends on, what is still missing, and which routes are probably broader than they need to be.

## Scope

Current implementation covers:

- website wallet task credits
- referral relationship creation
- staged referral reward unlocking
- reward freeze, unfreeze, revoke, and abuse flags
- referral program configuration
- subscription and task credit issuance

Current implementation does not cover:

- visibility credits
- cash conversion or transfers
- full admin workflow around resolving abuse flags
- automatic wiring from other modules such as website verification, backlink acceptance, and subscription activation

## Core Model

There are two connected parts in this module.

### 1. Credit wallet

Credits belong to a `Website`, not directly to a user.

- `CreditHistory` stores credit lots.
- `CreditLedger` stores credit transactions.
- Credits have two buckets:
  `SUBSCRIPTION`
  `EARN`
- Spending order is:
  subscription credits first
  then earned credits

### 2. Referral workflow

A `Referral` is a staged relationship between:

- a referrer user
- a referee user
- an optional referrer reward website
- an optional referee reward website

Referral stages are:

1. `SIGNED_UP`
2. `WEBSITE_VERIFIED`
3. `FIRST_BACKLINK_ACCEPTED`
4. `SUBSCRIBED`

Each stage can issue task credits to:

- the referrer
- the referee

Those issued rewards are tracked in `ReferralStageReward`.

## Route Groups

The controller has four practical groups.

### A. Wallet inspection

- `GET /credits/total/{websiteId}`
- `GET /credits/history/{websiteId}`

### B. Direct wallet mutation

- `POST /credits/add`
- `POST /credits/deduct`
- `POST /credits/subscriptions/grant`
- `POST /credits/tasks/reward`
- `POST /credits/tasks/spend`

### C. Referral program setup and admin controls

- `GET /credits/referrals/config`
- `PATCH /credits/referrals/config`
- `PATCH /credits/referrals/users/{userId}/status`
- `POST /credits/referrals/{referralId}/freeze`
- `POST /credits/referrals/{referralId}/unfreeze`
- `POST /credits/referrals/{referralId}/revoke`
- `POST /credits/referrals/flags`

### D. Referral lifecycle

- `GET /credits/referral-code/{userId}`
- `POST /credits/referrals/register`
- `POST /credits/referrals/website-verified`
- `POST /credits/referrals/backlink-accepted`
- `POST /credits/referrals/subscribed`
- `GET /credits/referrals/{referralId}`
- `GET /credits/referrals/user/{userId}`

## Route By Route

### `GET /credits/total/{websiteId}`

Purpose:
Returns the task-credit summary for a website wallet.

What it reads:

- active credit lots
- expired credit lots
- bucket split between subscription and earned credits

What it depends on:

- the website must exist
- Redis cache is used for summary caching and expiry hints

Connected routes:

- updated after `add`, `deduct`, `subscriptions/grant`, `tasks/reward`, `tasks/spend`, and referral reward stage unlocks

### `GET /credits/history/{websiteId}`

Purpose:
Returns the transaction ledger for task credits on a website wallet.

What it depends on:

- the website must exist

Connected routes:

- every mutation route writes here directly or indirectly

### `POST /credits/add`

Purpose:
Manual credit creation on a website wallet.

Typical use:

- admin adjustment
- migration backfill
- emergency support credit

What it depends on:

- valid `websiteId`
- source
- bucket
- future `expiresAt` if provided

Connected routes:

- affects `GET /credits/total/{websiteId}`
- appears in `GET /credits/history/{websiteId}`

Comment:
This is very broad. In production it should usually be admin-only or internal-only.

### `POST /credits/deduct`

Purpose:
Manual credit deduction from a website wallet.

What it depends on:

- valid `websiteId`
- enough available credits

Connected routes:

- affects summary and history

Comment:
Also very broad and should likely be admin-only or internal-only.

### `GET /credits/referral-code/{userId}`

Purpose:
Gets or lazily creates a referral code for a user.

Current response:

- `userId`
- `referralId`
- `referralCode`

Important note:
`referralId` here is not the ID of the share link or code. It is the existing referral relationship where this user is the referee, if one already exists. It will often be `null`.

What it depends on:

- user must exist

Connected routes:

- `POST /credits/referrals/register` uses this code later

### `POST /credits/referrals/register`

Purpose:
Creates the referral relationship when a new user signs up through a referral code.

What it does:

- validates global referral config is enabled
- validates referee exists
- finds the referrer by `referralCode`
- blocks self-referral
- blocks duplicate referral relationship for the same referee
- optionally stores the referrer reward website
- stores referral metadata
- creates automatic abuse flags

What it depends on:

- a valid referral code from `GET /credits/referral-code/{userId}`
- a real referee user

What it does not do:

- it does not issue reward credits yet

Connected routes:

- must happen before all stage unlock routes

### `POST /credits/referrals/website-verified`

Purpose:
Unlocks stage 1 reward after the referee verifies a website.

What it does:

- requires current stage `SIGNED_UP`
- validates referee website belongs to referee
- resolves or validates reward website for referrer
- stores referee reward website
- advances referral to `WEBSITE_VERIFIED`
- issues stage 1 task credits to referee and referrer
- may create shared-website abuse flag

What it depends on:

- a referral created by `register`
- a referee website record

Connected routes:

- must happen before backlink accepted

### `POST /credits/referrals/backlink-accepted`

Purpose:
Unlocks stage 2 reward after first accepted backlink.

What it does:

- requires current stage `WEBSITE_VERIFIED`
- stores backlink reference
- advances stage to `FIRST_BACKLINK_ACCEPTED`
- issues stage 2 task credits to referee and referrer

What it depends on:

- successful website verification unlock first
- a backlink reference ID from the backlink/task domain

Connected routes:

- must happen before subscribed

### `POST /credits/referrals/subscribed`

Purpose:
Unlocks stage 3 reward after paid subscription.

What it does:

- requires current stage `FIRST_BACKLINK_ACCEPTED`
- validates an active subscription belonging to the referee
- advances stage to `SUBSCRIBED`
- issues stage 3 task credits to referee and referrer

What it depends on:

- stage 2 already completed
- subscription module data must exist and match the referee

Connected routes:

- final stage of the referral lifecycle

### `GET /credits/referrals/{referralId}`

Purpose:
Returns full referral detail for one referral relationship.

What it includes:

- referrer user
- referee user
- reward websites
- stage rewards
- flags
- audit logs

Best use:

- admin review
- detailed troubleshooting

### `GET /credits/referrals/user/{userId}`

Purpose:
Returns referral data grouped around one user.

Current response shape:

- `user`
- `summary`
- `referrals.asReferrer`
- `referrals.asReferee`

Best use:

- user dashboard
- admin overview

Connected routes:

- shows output from registration, stage unlocks, flags, and reward issuance

### `GET /credits/referrals/config`

Purpose:
Returns the referral program settings.

What it includes:

- global enable/disable
- stage reward amounts
- caps
- temporary boost values

Best use:

- admin settings screen

### `PATCH /credits/referrals/config`

Purpose:
Updates referral program settings.

What it depends on:

- `reasonCode`
- optional `actorAdminUserId`

What it also does:

- writes audit logs

Comment:
This is clearly admin-only.

### `PATCH /credits/referrals/users/{userId}/status`

Purpose:
Turns referrals on or off for one user.

What it depends on:

- target user must exist
- `reasonCode`

What it also does:

- writes audit logs

Comment:
This is also admin-only.

### `POST /credits/referrals/{referralId}/freeze`

Purpose:
Prevents future reward stage unlocks from issuing credits.

What it does not do:

- it does not revoke already-issued credits

Connected routes:

- stage unlock routes check `isFrozen` and fail when frozen

### `POST /credits/referrals/{referralId}/unfreeze`

Purpose:
Reopens the referral for future reward stage unlocks.

Connected routes:

- allows the next stage unlock route to proceed again

### `POST /credits/referrals/{referralId}/revoke`

Purpose:
Revokes already-issued reward credits for one stage and one beneficiary.

What it does:

- finds the specific `ReferralStageReward`
- zeroes out remaining credit lots tied to that reward
- writes a debit ledger entry
- marks the reward as revoked
- writes audit logs

What it depends on:

- referral reward must already exist
- that reward must not already be revoked

Comment:
This is a strong admin action and should be protected carefully.

### `POST /credits/referrals/flags`

Purpose:
Creates a manual abuse flag for a referral.

What it does:

- creates a `ReferralFlag`
- writes audit logs

Comment:
This is useful for manual review, but there is no matching route yet to resolve a flag.

### `POST /credits/subscriptions/grant`

Purpose:
Grants subscription-bucket task credits to a website wallet.

What it does:

- validates website belongs to the user
- validates active subscription belongs to the same user
- prevents duplicate grant for the same subscription
- creates an expiring subscription credit lot

What it depends on:

- subscription module
- website ownership

Connected routes:

- these credits are consumed first by `tasks/spend`

### `POST /credits/tasks/reward`

Purpose:
Grants earned task credits for a completed task.

What it does:

- validates website exists
- prevents duplicate reward for the same `taskId`
- creates earned credit

Connected routes:

- these credits are consumed after subscription credits

### `POST /credits/tasks/spend`

Purpose:
Consumes exactly one task credit for task usage.

What it does:

- delegates to manual deduction logic
- uses `TASK_CREDIT_COST`
- consumes subscription credits first, then earned credits

Connected routes:

- depends on `subscriptions/grant`, `tasks/reward`, manual add, or referral reward issuance having created credits first

## Main Workflow Connections

### Normal wallet flow

1. Credits are created by `subscriptions/grant`, `tasks/reward`, referral stage unlock routes, or manual `add`.
2. Wallet state is inspected by `total` and `history`.
3. Credits are consumed by `tasks/spend` or manual `deduct`.

### Normal referral flow

1. `GET /credits/referral-code/{userId}`
2. `POST /credits/referrals/register`
3. `POST /credits/referrals/website-verified`
4. `POST /credits/referrals/backlink-accepted`
5. `POST /credits/referrals/subscribed`
6. Inspect with `GET /credits/referrals/{referralId}` or `GET /credits/referrals/user/{userId}`

### Referral admin control flow

1. `GET /credits/referrals/config`
2. `PATCH /credits/referrals/config`
3. `PATCH /credits/referrals/users/{userId}/status`
4. Review with `GET /credits/referrals/{referralId}`
5. Use `freeze`, `unfreeze`, `flags`, or `revoke` as needed

## Dependencies Between Routes

Strict stage dependencies:

1. `register` must happen before any unlock route.
2. `website-verified` must happen before `backlink-accepted`.
3. `backlink-accepted` must happen before `subscribed`.
4. `freeze` blocks later stage unlocks until `unfreeze`.
5. `revoke` only makes sense after a reward has been issued.

Cross-module dependencies:

- `website-verified` depends on website ownership and, conceptually, website verification status.
- `backlink-accepted` depends on backlink/task acceptance logic outside this module.
- `subscribed` depends on the subscription module and active subscription state.
- `subscriptions/grant` also depends on subscription ownership and state.

Internal technical dependencies:

- Redis is used for summary caching.
- Prisma models needed:
  `User`
  `Website`
  `CreditHistory`
  `CreditLedger`
  `Referral`
  `ReferralStageReward`
  `ReferralFlag`
  `ReferralAuditLog`
  `ReferralProgramConfig`

## Missing Or Incomplete Pieces

These are the main gaps in the current design.

### 1. No route guards in the controller

`credit.controller.ts` currently has no `@UserGuard()`, `@AdminGuard()`, or role-based protection.

That means many sensitive routes are exposed at controller level unless protected elsewhere globally.

This is the biggest missing piece.

### 2. No flag resolution route

The data model supports:

- `resolvedAt`
- `resolvedByAdminUserId`
- `resolutionNote`

But there is no route to resolve a flag.

Recommended missing route:

- `PATCH /credits/referrals/flags/{flagId}/resolve`

### 3. No orchestration from source modules

The credit module exposes manual stage-unlock endpoints, but the actual business events probably live elsewhere:

- website verification module
- backlink/task acceptance module
- subscription activation module

Today, these stage routes look like internal orchestration endpoints rather than end-user APIs.

### 4. `referral-code` response mixes two concepts

This route returns:

- the user's own referral code
- the referral relationship ID where the same user is a referee

That is technically valid, but semantically a bit mixed.

Cleaner alternatives:

- keep `referral-code` only about the share code
- let referral relationship lookup live in `/credits/referrals/user/{userId}`

### 5. No route to list all referrals globally

There is:

- one referral by ID
- one user's referral view

But there is no full admin list with filters such as:

- by stage
- by flagged state
- by frozen state
- by date range

Recommended missing route:

- `GET /credits/referrals`

### 6. No route to preview reward eligibility without mutating state

Useful for admin and UI:

- can this referral move to next stage?
- will caps block reward issuance?
- which website will receive reward?

Recommended missing route:

- `GET /credits/referrals/{referralId}/eligibility`

## Extra Or Probably Unnecessary Public APIs

These routes work, but they feel too low-level or too public for a production API.

### `POST /credits/add`

This is very broad and can create any credit lot shape. It should probably be:

- admin-only
- or internal-only

### `POST /credits/deduct`

Same concern. This is a low-level mutation route and can bypass normal business flow.

### `POST /credits/tasks/reward`

This feels more like an internal task-event handler than a public API.

Better owner:

- task module service
- internal event consumer

### `POST /credits/tasks/spend`

Also feels internal. A task creation or task acceptance workflow should probably spend credits inside the task domain, not through a public route.

### `POST /credits/subscriptions/grant`

This also looks internal. Subscription activation should probably trigger this automatically inside the subscription module.

### Stage unlock routes

- `website-verified`
- `backlink-accepted`
- `subscribed`

These are valid as integration endpoints, but they read more like internal orchestration endpoints than direct UI endpoints.

## Recommended Access Levels

Suggested access separation:

- User-facing:
  `GET /credits/total/{websiteId}`
  `GET /credits/history/{websiteId}`
  `GET /credits/referral-code/{userId}`
  `GET /credits/referrals/user/{userId}`

- Admin-facing:
  `GET /credits/referrals/config`
  `PATCH /credits/referrals/config`
  `PATCH /credits/referrals/users/{userId}/status`
  `GET /credits/referrals/{referralId}`
  `POST /credits/referrals/{referralId}/freeze`
  `POST /credits/referrals/{referralId}/unfreeze`
  `POST /credits/referrals/{referralId}/revoke`
  `POST /credits/referrals/flags`

- Internal-only:
  `POST /credits/referrals/register`
  `POST /credits/referrals/website-verified`
  `POST /credits/referrals/backlink-accepted`
  `POST /credits/referrals/subscribed`
  `POST /credits/subscriptions/grant`
  `POST /credits/tasks/reward`
  `POST /credits/tasks/spend`
  `POST /credits/add`
  `POST /credits/deduct`

## Suggested Simplification

If you want a cleaner public API, the controller can be reduced to three layers.

### Public user layer

- wallet summary
- wallet history
- own referral code
- own referral overview

### Admin review layer

- config
- user referral status
- referral detail
- freeze, unfreeze, revoke
- flags

### Internal integration layer

- register referral
- unlock stage 1, 2, 3
- grant subscription credits
- reward task credits
- spend task credits

## Final Assessment

The current controller is functional, but it mixes:

- end-user read APIs
- admin control APIs
- internal workflow APIs
- low-level wallet mutation APIs

That is the main architectural issue.

If you keep the same business model, the best next improvements are:

1. Add guards and role protection to every route.
2. Move internal workflow endpoints behind service-to-service or internal-only access.
3. Add flag resolution APIs.
4. Decide whether manual add and deduct should exist in production.
5. Keep referral lifecycle automation in the modules where the source events actually happen.
