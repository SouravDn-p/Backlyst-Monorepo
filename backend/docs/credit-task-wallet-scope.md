# Credit Task Wallet Scope

This module now treats task credit as a website wallet problem, not a user-balance problem.

## What is implemented

- Task credit only
- Website-based credit wallet summary
- Separate wallet buckets:
  - `subscriptionTaskCredits`
  - `earnedTaskCredits`
  - `referralTaskCredits`
- Transaction audit rows with previous and new balance
- Referral relationship tracking
- Referral stage rewards:
  - `WEBSITE_VERIFIED`
  - `FIRST_BACKLINK_ACCEPTED`
  - `PAID_SUBSCRIPTION`
- Admin referral controls:
  - config update
  - freeze
  - unfreeze
  - revoke
  - abuse flag
- Task spend order:
  - subscription credits first
  - earned credits second
  - referral credits last

## Route groups

User and internal credit routes live in:
- [credit.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit.controller.ts:1)

Admin credit routes live in:
- [admin-credit.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/admin-credit.controller.ts:1)

Core logic lives in:
- [credit.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit.service.ts:1)

## Main route flow

User routes:
- `GET /credits/me`
- `GET /credits/websites/:websiteId`
- `GET /credits/history`

Referral lifecycle hooks:
- `POST /credits/referrals/register`
- `POST /credits/referrals/website-verified`
- `POST /credits/referrals/backlink-accepted`
- `POST /credits/referrals/subscribed`

Task and subscription hooks:
- `POST /credits/subscriptions/grant`
- `POST /credits/tasks/reward`
- `POST /credits/tasks/spend`

Admin routes:
- `GET /admin/credits/transactions`
- `GET /admin/users/:userId/credits`
- `POST /admin/users/:userId/credits/task/add`
- `POST /admin/users/:userId/credits/task/deduct`
- `POST /admin/users/:userId/credits/task/revoke`
- `GET /admin/referrals`
- `GET /admin/referrals/:referralId`
- `GET /admin/referrals/user/:userId`
- `GET /admin/referrals/config`
- `PATCH /admin/referrals/config`
- `PATCH /admin/referrals/users/:userId/status`
- `POST /admin/referrals/:referralId/freeze`
- `POST /admin/referrals/:referralId/unfreeze`
- `POST /admin/referrals/:referralId/revoke-task-credits`
- `POST /admin/referrals/flags`

## Important behavior

- Signup alone creates a referral relationship but does not grant credits.
- Stage rewards unlock strictly in order.
- Stage 3 requires an active paid subscription.
- Referrer monthly and lifetime reward caps are checked before stage 1 reward issuance.
- Excess credits over wallet capacity are skipped, not stored.
- Every wallet change writes a transaction row.

## Current technical note

The schema includes new `CreditWallet`, `CreditTransaction`, and `ReferralReward` tables.
The service currently accesses those new tables with SQL through Prisma’s raw query APIs, while existing Prisma-generated models continue to handle older tables like `Referral`, `ReferralFlag`, and `ReferralAuditLog`.
