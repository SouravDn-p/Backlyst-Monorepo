# Admin Credit Panel API Analysis

Date: 2026-06-10

This document maps the requested admin credit/governance panel against the current Backlyst backend. It answers:

- what the screenshots require
- which APIs already exist
- which APIs are missing
- what data models and services the feature depends on
- recommended API names for a clean admin implementation

## 1. Executive Summary

The backend already has a real credit foundation:

- master user credit wallet
- website credit wallet
- subscription, purchased, referral, earned, and visibility credit buckets
- credit ledger through `CreditLog`
- task credit reserve, refund, and provider reward flows
- referral progress read API
- admin task governance API
- admin user registry API
- website verification admin API

However, the screenshots describe a much broader admin panel than the current backend exposes. The current API is strong for user-owned credit operations and task-level admin actions, but it does not yet provide a dedicated admin credit console with aggregate dashboards, system configuration, referral oversight, badge/reward governance, visibility governance, compliance exports, or forensic credit reversal records.

Recommended new admin namespace:

```text
/admin-credits/*
```

This matches the existing project style (`/admin-task`, `/admin-user`, `/admin-subscription-plan`) while keeping admin credit/governance APIs separate from user credit APIs under `/credits`.

## 2. Source Files Reviewed

Credit module:

- [credit.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit.controller.ts:1)
- [credit.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit.service.ts:1)
- [credit-task.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.controller.ts:1)
- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:1)
- [referrer.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/referrer/referrer.controller.ts:1)
- [referrer.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/referrer/referrer.service.ts:1)
- [weekly-contribution.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/referrer/weekly-contribution.service.ts:1)

Related admin and marketplace modules:

- [admin-task.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/admin-task/admin-task.controller.ts:1)
- [admin-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/admin-task/admin-task.service.ts:1)
- [admin-user.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/user/admin-user/admin-user.controller.ts:1)
- [website-verification-admin.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/website/website-verification/website-verification-admin/website-verification-admin.controller.ts:1)
- [task-requester.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/task-requester/task-requester.service.ts:1)

Main schema files:

- [credit.prisma](/home/imran/Desktop/backlyst-backend/prisma/schema/credit.prisma:1)
- [placement.prisma](/home/imran/Desktop/backlyst-backend/prisma/schema/placement.prisma:1)
- [website.prisma](/home/imran/Desktop/backlyst-backend/prisma/schema/website.prisma:1)
- [subscription.prisma](/home/imran/Desktop/backlyst-backend/prisma/schema/subscription.prisma:1)
- [subscriptionPlan.prisma](/home/imran/Desktop/backlyst-backend/prisma/schema/subscriptionPlan.prisma:1)

## 3. Screenshot Requirement Analysis

| Image | Screen | Backend Requirement | Current Status |
| --- | --- | --- | --- |
| 1 | Forensic identification / escrow reversal proof | Admin immutable credit reversal record, before/after state, authority/admin id, hash/proof | Partially exists through `CreditLog` and `TaskFlow`; missing forensic proof/hash API |
| 2 | System configuration | Admin can configure subscription pricing, tier limits, grace periods, referral rewards, feature toggles | Partially exists through subscription plan admin APIs; missing central credit config API |
| 3 | Marketplace supply vs demand report | Read-only analytics reports with weekly series and export | Missing dedicated analytics/report API |
| 4 | Analytics registry | Admin dashboard for credit usage speed, visibility changes, saved reports, CSV/PDF export | Missing dedicated analytics registry API |
| 5 | Compliance & governance | Read-only disclosure mode, user consent records, data protection/audit requests, disputes, compliance log | Legal-doc and messaging/report pieces exist; missing combined compliance dashboard |
| 6 | Referral credit details modal | Referral chain, reward credit history, approve/revoke/disable actions | Progress read exists; admin actions missing |
| 7 | Referral attribution registry | Admin list of referral attributions, status, conversions, emergency freeze | Missing admin referral registry/action API |
| 8 | Rewards & badges | Badge/reward tables, badge thresholds, recognition, discounts, priority handling | Missing model and API |
| 9 | Website visibility profile action panel | Pause/restore/extend visibility, grace override, compliance summary | Website and credit wallet exist; missing visibility governance API |
| 10 | Marketplace visibility table | List websites by visibility status, compliance, usage, grace timer | Missing visibility registry API |
| 11 | Credit governance ledger | Platform aggregate liquidity, selected website wallet, transaction history, lock/override actions | Partially exists through credit/user/website wallet APIs; admin aggregate and actions missing |
| 12 | Task metadata and governance actions | Task detail, escrow value, force approve/reject/refund/freeze/resolve/flag abuse | Mostly exists through `/admin-task/:id` and `/admin-task/:id/action` |
| 13 | Task ledger | Admin task list with filters and task status | Exists through `/admin-task/all` |
| 14 | User oversight profile | User account status, linked websites, credit reserves, suspend/ban/reset/logout/note | Partially exists through `/admin-user`; missing profile detail, credit reserve summary, notes, force logout |
| 15 | User registry | Admin user list with filters and credit usage summary | Partially exists through `/admin-user`; credit summary per row missing |
| 16 | Institutional operations dashboard | Aggregate system dashboard, task lifecycle, security audit, governance feed | Missing dedicated admin dashboard API |

## 4. Existing API Inventory

All routes run without a global prefix. Swagger is available at `/api/docs` in non-production.

### 4.1 User Credit APIs

Controller: `CreditController`, base route `/credits`.

| Method | API | Auth | Exists | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/credits/me` | User | Yes | Current user's combined credit summary |
| GET | `/credits/master` | User | Yes | Current user's master wallet summary |
| GET | `/credits/master/statement` | User | Yes | Master wallet ledger filtered by master note prefixes |
| GET | `/credits/statement` | User | Yes | Current user's full credit statement |
| GET | `/credits/websites/:websiteId/summary` | User | Yes | Owned website wallet summary plus latest activity |
| GET | `/credits/websites/:websiteId/wallet` | User | Yes | Owned website wallet balances |
| GET | `/credits/websites/:websiteId/statement` | User | Yes | Owned website credit statement |
| POST | `/credits/purchased/buy` | User | Yes | Manually add purchased credits to master wallet |
| POST | `/credits/purchased/allocate` | User | Yes | Allocate purchased credits from master wallet to verified website |
| POST | `/credits/referral/allocate` | User | Yes | Allocate referral credits from master wallet to verified website |
| POST | `/credits/subscription/allocate` | User | Yes | Allocate subscription credits from master wallet to verified website |
| GET | `/credits/earned` | User | Yes | Aggregate earned credits across owned websites |
| GET | `/credits/subscription` | User | Yes | Master subscription task credits |
| GET | `/credits/visibility/me` | User | Yes | Master plus website visibility credits |
| GET | `/credits/visibility/statement` | User | Yes | Visibility credit statement |

### 4.2 Task Credit APIs

Controller: `CreditTaskController`, base route `/credits/tasks`.

| Method | API | Auth | Exists | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/credits/tasks/deduct` | User | Yes | Deduct/reserve requester website task credits |
| POST | `/credits/tasks/refund` | User | Yes | Refund requester website reserved credits |
| POST | `/credits/tasks/reward-provider` | User | Yes | Add earned credits to provider website |

Supported wallet source enum:

```text
SUBSCRIPTION
PURCHASED
REFERRAL
EARNED
```

Important behavior:

- task credit operations validate task ownership from `taskId`
- website wallet source columns are used for spend/refund
- provider rewards go to provider `WebsiteCreditWallet.earnedTaskCredits`
- ledger rows are written to `CreditLog`

### 4.3 Referral APIs

Controller: `ReferrerController`, base route `/credits/referrers`.

| Method | API | Auth | Exists | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/credits/referrers/progress` | User | Yes | Current user's referral progress and reward stages |

This is user-facing and read-only. It does not provide admin approval, revocation, disabling, freeze, or oversight.

### 4.4 Admin Task Governance APIs

Controller: `AdminTaskController`, base route `/admin-task`.

| Method | API | Auth | Exists | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/admin-task/all` | Admin | Yes | Admin marketplace task ledger with filters |
| GET | `/admin-task/:id` | Admin | Yes | Admin task details, flow history, applications |
| POST | `/admin-task/:id/action` | Admin | Yes | Unified admin task action endpoint |

Supported `action` values for `/admin-task/:id/action`:

```text
FREEZE
FORCE_APPROVE
FORCE_REJECT
CREDIT_REFUND
CREDIT_REVERSE
RESOLVE_DISPUTE
FLAG_ABUSE_PATTERN
```

Supported dispute resolutions:

```text
APPROVE
REJECT
REQUEST_REVISION
```

This covers most requirements shown in screenshots 12 and 13.

### 4.5 Admin User APIs

Controller: `AdminUserController`, base route `/admin-user`.

| Method | API | Auth | Exists | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/admin-user` | Admin | Yes | Paginated user registry with status, role, search filters |
| PATCH | `/admin-user/block-user/:userId` | Admin | Yes | Block/ban user |
| PATCH | `/admin-user/suspend-user/:userId` | Admin | Yes | Suspend user |
| PATCH | `/admin-user/reactivate-user/:userId` | Admin | Yes | Reactivate user |
| PATCH | `/admin-user/change-role/:id` | Admin | Yes | Change user role |
| DELETE | `/admin-user/admin/delete-user/:id` | Admin | Yes | Delete user |

Missing for screenshots 14 and 15:

- `GET /admin-user/:id/profile`
- user credit reserve summary
- linked websites summary
- admin notes ledger
- force logout/reset password admin action

### 4.6 Website Verification Admin APIs

Controller: `WebsiteVerificationAdminController`, base route `/website-verification-admin`.

| Method | API | Auth | Exists | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/website-verification-admin/pending` | Admin | Yes | Verification requests list |
| GET | `/website-verification-admin/details/:id` | Admin | Yes | Verification detail |
| PATCH | `/website-verification-admin/screenshot/approve` | Admin | Yes | Approve screenshot verification |
| PATCH | `/website-verification-admin/screenshot/reject` | Admin | Yes | Reject screenshot verification |
| POST | `/website-verification-admin/meta-tag` | Admin | Yes | Add/update verification meta tag |
| GET | `/website-verification-admin/meta-tag` | Admin | Yes | Get verification meta tag |

## 5. Current Data Model

### 5.1 Credit Tables

| Model | Exists | Purpose |
| --- | --- | --- |
| `UserCreditWallet` | Yes | Master user wallet: subscription, earned, purchased, referral, visibility |
| `WebsiteCreditWallet` | Yes | Website wallet: subscription, earned, allocated purchased, allocated referral, visibility |
| `SubscriptionCreditBatch` | Yes | Expiring subscription credit batches |
| `CreditLog` | Yes | Transaction ledger for credit movements |
| `UserReferral` | Yes | Referrer/referred relationship and current stage |
| `ReferralReward` | Yes | Stage-level referral reward records |
| `WebsiteWeeklyContribution` | Yes | Weekly verified placement contribution reward |
| `WebsiteMilestoneProgress` | Yes | Per-website milestone reward progress |

### 5.2 Credit Buckets

Current master wallet buckets:

- `subscriptionTaskCredits`
- `earnedTaskCredits`
- `purchasedTaskCredits`
- `referralTaskCredits`
- `visibilityCredits`

Current website wallet buckets:

- `subscriptionTaskCredits`
- `earnedTaskCredits`
- `allocatedPurchasedCredits`
- `allocatedReferralCredits`
- `visibilityCredits`

### 5.3 Ledger Enums

Credit types:

```text
SUBSCRIPTION_TASK
EARNED_TASK
VISIBILITY
```

Credit actions:

```text
ADD
SPEND
EXPIRE
REFUND
REWARD
```

Credit reasons:

```text
SUBSCRIPTION_PURCHASE
TASK_COMPLETION
TASK_POST
WEEKLY_BACKLINK_CONTRIBUTION
MILESTONE_VERIFIED_BACKLINK
REFERRAL_WEBSITE_VERIFIED
REFERRAL_FIRST_BACKLINK
REFERRAL_PAID_SUBSCRIPTION
MANUAL
```

## 6. Recommended Missing Admin Credit APIs

### 6.1 Admin Credit Overview

Required for screenshots 11 and 16.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/overview` | Platform-wide credit liquidity summary |
| GET | `/admin-credits/dashboard` | Operations dashboard: active users, active websites, task oversight, credit simulation |
| GET | `/admin-credits/usage-speed` | Average credit circulation and earned/spent velocity |

Suggested response fields:

- total subscription pool credits
- total referral credits
- total visibility pool credits
- total earned credits
- credits used vs available
- active users
- active websites by verification/compliance status
- task lifecycle counts
- disputed task count

Status: missing.

### 6.2 Admin Credit Ledger

Required for screenshots 1 and 11.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/ledger` | Admin global credit log with filters |
| GET | `/admin-credits/ledger/:id` | Single ledger entry detail |
| GET | `/admin-credits/wallets/users/:userId` | Master wallet summary for a user |
| GET | `/admin-credits/wallets/websites/:websiteId` | Website wallet summary |
| POST | `/admin-credits/wallets/websites/:websiteId/lock` | Lock website wallet |
| POST | `/admin-credits/wallets/websites/:websiteId/unlock` | Unlock website wallet |
| POST | `/admin-credits/wallets/websites/:websiteId/cap-override` | Enforce cap override |

Suggested query filters for `/admin-credits/ledger`:

- `page`
- `limit`
- `userId`
- `websiteId`
- `taskId`
- `creditType`
- `action`
- `reason`
- `fromDate`
- `toDate`
- `sourceBucket`

Status: missing as admin API. User-level statement APIs exist.

### 6.3 Admin Manual Credit Adjustment

Required for screenshots 1, 11, 12, and 14.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| POST | `/admin-credits/adjustments` | Manually add/remove/reverse credits with audit reason |
| GET | `/admin-credits/adjustments` | List manual adjustment records |
| GET | `/admin-credits/adjustments/:id` | Single adjustment details |
| POST | `/admin-credits/reversals` | Create forensic reversal record |
| GET | `/admin-credits/reversals/:id/proof` | Forensic proof and before/after state |

Recommended request body for `POST /admin-credits/adjustments`:

```json
{
  "targetType": "USER|WEBSITE",
  "targetId": "uuid",
  "bucket": "SUBSCRIPTION|PURCHASED|REFERRAL|EARNED|VISIBILITY",
  "action": "ADD|REMOVE|LOCK|UNLOCK|REVERSE",
  "amount": 450,
  "reasonCode": "POL-ABUSE-09",
  "note": "Confirmed non-delivery after 72h SLA breach."
}
```

Recommended new model:

```text
AdminCreditAdjustment
```

Minimum fields:

- `id`
- `adminId`
- `targetType`
- `targetId`
- `walletId`
- `creditLogId`
- `bucket`
- `action`
- `amount`
- `balanceBefore`
- `balanceAfter`
- `reasonCode`
- `note`
- `integrityHash`
- `createdAt`

Status: task-specific adjustment partially exists under `/admin-task/:id/action`, but a generic admin credit adjustment API is missing.

### 6.4 Admin Referral Governance

Required for screenshots 6 and 7.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/referrals` | Referral attribution registry |
| GET | `/admin-credits/referrals/:id` | Referral detail with chain and reward history |
| POST | `/admin-credits/referrals/:id/approve-credit` | Approve pending referral credit |
| POST | `/admin-credits/referrals/:id/revoke-credit` | Revoke referral credit |
| POST | `/admin-credits/referrals/:id/disable-entity-referrals` | Disable referral earning for entity |
| POST | `/admin-credits/referrals/freeze` | Emergency freeze all referral processing |
| POST | `/admin-credits/referrals/unfreeze` | Lift emergency freeze |

Status: user progress read exists; admin referral governance is missing.

Recommended new fields or models:

- `ReferralStatus`: `PENDING`, `VERIFIED`, `FLAGGED`, `REVOKED`
- `ReferralAdminAction`
- global config flag for referral freeze

### 6.5 Admin Visibility Governance

Required for screenshots 9 and 10.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/visibility/websites` | Visibility registry table |
| GET | `/admin-credits/visibility/websites/:websiteId` | Visibility profile/action panel |
| POST | `/admin-credits/visibility/websites/:websiteId/pause` | Pause visibility |
| POST | `/admin-credits/visibility/websites/:websiteId/restore` | Restore visibility |
| POST | `/admin-credits/visibility/websites/:websiteId/extend` | Extend visibility/grace by hours |
| POST | `/admin-credits/visibility/websites/:websiteId/grace-override` | Log grace override |

Status: visibility credit balances and statements exist; visibility marketplace governance is missing.

Recommended new model:

```text
WebsiteVisibilityState
```

Minimum fields:

- `websiteId`
- `status`: `VISIBLE`, `GRACE_PERIOD`, `HIDDEN`
- `complianceStatus`
- `visibilityCreditsUsed`
- `graceEndsAt`
- `pausedAt`
- `pausedByAdminId`
- `pauseReason`

### 6.6 System Credit Configuration

Required for screenshot 2.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/config` | Read full credit system configuration |
| PATCH | `/admin-credits/config/subscription-pricing` | Update tier pricing/credit values |
| PATCH | `/admin-credits/config/tier-limits` | Update max credits per tier |
| PATCH | `/admin-credits/config/grace-period` | Update grace window and extensions |
| PATCH | `/admin-credits/config/referral-rewards` | Update referral reward values |
| PATCH | `/admin-credits/config/feature-toggles` | Update module toggles |
| GET | `/admin-credits/config/audit` | Config change audit history |

Status: subscription plan admin routes partially cover plan pricing and activation, but there is no unified system configuration endpoint.

Existing related APIs:

- `/admin-subscription-plan`
- `/admin-subscription-plan/all`
- `/admin-subscription-plan/make-plan-inactive`

### 6.7 Analytics and Reports

Required for screenshots 3 and 4.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/analytics/registry` | Analytics registry cards and saved reports |
| GET | `/admin-credits/analytics/supply-demand` | Weekly supply vs demand report |
| GET | `/admin-credits/analytics/visibility-changes` | New visible/lost visibility report |
| GET | `/admin-credits/analytics/credit-usage-summary` | Credit usage summary |
| GET | `/admin-credits/reports` | Saved reports list |
| POST | `/admin-credits/reports/:id/export` | Export CSV/PDF |

Status: missing.

Project dependency note:

- `pdfkit` already exists for PDF generation
- CSV export can be implemented without a new dependency, or with a small CSV package if preferred

### 6.8 Rewards and Badges

Required for screenshot 8.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/rewards` | Rewards registry |
| GET | `/admin-credits/badges` | Badge registry |
| POST | `/admin-credits/badges` | Create badge |
| PATCH | `/admin-credits/badges/:id` | Update badge |
| POST | `/admin-credits/badges/:id/award` | Award badge to website/user |
| POST | `/admin-credits/badges/:id/revoke` | Revoke badge |
| GET | `/admin-credits/rewards/config` | Reward threshold configuration |
| PATCH | `/admin-credits/rewards/config` | Update thresholds |

Status: missing.

Recommended new models:

- `RewardRule`
- `Badge`
- `BadgeAward`
- `DiscountReward`
- `PriorityHandlingReward`

### 6.9 Compliance and Governance

Required for screenshot 5.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-credits/compliance/overview` | Compliance dashboard |
| GET | `/admin-credits/compliance/consents` | User consent records |
| GET | `/admin-credits/compliance/data-requests` | GDPR/UK GDPR request registry |
| PATCH | `/admin-credits/compliance/data-requests/:id/status` | Update request status |
| GET | `/admin-credits/compliance/disputes` | Disputes and abuse registry |
| GET | `/admin-credits/compliance/payment-records` | Payment compliance read-only records |
| POST | `/admin-credits/compliance/export` | Export disclosure/compliance package |

Status: partially covered by legal docs, messaging reports, and task dispute flows; combined compliance center is missing.

Existing related APIs:

- `/legal-docs`
- `/legal-docs/me`
- `/messaging/admin/registry`
- `/messaging/admin/message-reports`
- `/admin-task/:id/action`

### 6.10 User Oversight Extensions

Required for screenshots 14 and 15.

| Method | Recommended API | Purpose |
| --- | --- | --- |
| GET | `/admin-user/:id/profile` | User profile registry detail |
| GET | `/admin-user/:id/credit-summary` | User master and website credit reserves |
| GET | `/admin-user/:id/websites` | Linked website assets |
| POST | `/admin-user/:id/notes` | Append admin note to ledger |
| GET | `/admin-user/:id/notes` | Admin notes history |
| POST | `/admin-user/:id/reset-password` | Admin-triggered password reset |
| POST | `/admin-user/:id/force-logout` | Invalidate sessions |

Status: base registry and ban/suspend/reactivate exist; profile detail and notes are missing.

## 7. Existing vs Needed Summary

### Already Exists

- `/credits/me`
- `/credits/master`
- `/credits/master/statement`
- `/credits/statement`
- `/credits/websites/:websiteId/summary`
- `/credits/websites/:websiteId/wallet`
- `/credits/websites/:websiteId/statement`
- `/credits/purchased/buy`
- `/credits/purchased/allocate`
- `/credits/referral/allocate`
- `/credits/subscription/allocate`
- `/credits/visibility/me`
- `/credits/visibility/statement`
- `/credits/tasks/deduct`
- `/credits/tasks/refund`
- `/credits/tasks/reward-provider`
- `/credits/referrers/progress`
- `/admin-task/all`
- `/admin-task/:id`
- `/admin-task/:id/action`
- `/admin-user`
- `/admin-user/block-user/:userId`
- `/admin-user/suspend-user/:userId`
- `/admin-user/reactivate-user/:userId`
- `/website-verification-admin/*`

### Needed For The Screenshots

- `/admin-credits/overview`
- `/admin-credits/dashboard`
- `/admin-credits/ledger`
- `/admin-credits/ledger/:id`
- `/admin-credits/wallets/users/:userId`
- `/admin-credits/wallets/websites/:websiteId`
- `/admin-credits/adjustments`
- `/admin-credits/reversals`
- `/admin-credits/reversals/:id/proof`
- `/admin-credits/referrals`
- `/admin-credits/referrals/:id`
- `/admin-credits/referrals/:id/approve-credit`
- `/admin-credits/referrals/:id/revoke-credit`
- `/admin-credits/referrals/:id/disable-entity-referrals`
- `/admin-credits/referrals/freeze`
- `/admin-credits/visibility/websites`
- `/admin-credits/visibility/websites/:websiteId`
- `/admin-credits/visibility/websites/:websiteId/pause`
- `/admin-credits/visibility/websites/:websiteId/restore`
- `/admin-credits/visibility/websites/:websiteId/extend`
- `/admin-credits/config`
- `/admin-credits/config/*`
- `/admin-credits/analytics/*`
- `/admin-credits/reports`
- `/admin-credits/rewards`
- `/admin-credits/badges`
- `/admin-credits/compliance/*`
- `/admin-user/:id/profile`
- `/admin-user/:id/credit-summary`
- `/admin-user/:id/notes`
- `/admin-user/:id/force-logout`

## 8. Dependency Map

### Runtime Dependencies Already In Project

| Dependency | Current Use / Relevance |
| --- | --- |
| `@nestjs/common`, `@nestjs/core` | Main API framework |
| `@nestjs/swagger` | Swagger decorators and API docs |
| `@prisma/client`, `prisma` | Database schema and queries |
| `class-validator`, `class-transformer` | DTO validation |
| `@nestjs/jwt`, `passport-jwt` | Auth and guards |
| `stripe` | Subscription/payment source |
| `pdfkit` | PDF export support |
| `bullmq`, `@nestjs/bullmq`, `ioredis` | Background jobs/queues |
| `date-fns` | Date calculations |
| `axios`, `cheerio` | External fetch/parsing, relevant to verification/analytics |
| `nodemailer`, `handlebars` | Email notifications |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | File/proof exports and S3 evidence assets |

### Internal Dependencies

| Internal Service | Needed By Admin Credit Panel |
| --- | --- |
| `PrismaService` | All admin credit queries and transactions |
| `CreditService` | Existing wallet summaries and allocation logic |
| `CreditTaskService` | Task spend/refund/reward logic |
| `WeeklyContributionService` | Reward rules for verified placements |
| `AdminTaskService` | Task governance actions |
| `AdminUserService` | User governance actions |
| `WebsiteVerificationAdminService` | Verification/compliance inputs |

### New Dependencies Not Strictly Required

No required new package is needed for the first implementation. Existing dependencies can handle the core work.

Optional only:

- CSV utility package if exports become complex
- hashing helper can use Node `crypto`, no package needed
- report scheduling can use existing `@nestjs/schedule` and BullMQ

## 9. Recommended Implementation Plan

### Phase 1: Admin Credit Read Layer

Create:

- `src/modules/credit/admin-credit/admin-credit.module.ts`
- `src/modules/credit/admin-credit/admin-credit.controller.ts`
- `src/modules/credit/admin-credit/admin-credit.service.ts`

Implement:

- `GET /admin-credits/overview`
- `GET /admin-credits/ledger`
- `GET /admin-credits/wallets/users/:userId`
- `GET /admin-credits/wallets/websites/:websiteId`

This unlocks screenshots 11 and the credit parts of 14 and 15.

### Phase 2: Admin Credit Actions

Implement:

- `POST /admin-credits/adjustments`
- `POST /admin-credits/reversals`
- `GET /admin-credits/reversals/:id/proof`

Add:

- `AdminCreditAdjustment`
- optional `AdminCreditReversalProof`
- integrity hash generated with Node `crypto`

This unlocks screenshot 1 and improves audit quality for screenshot 12.

### Phase 3: Referral Governance

Implement:

- referral registry
- referral detail modal data
- approve/revoke actions
- freeze referrals toggle

This unlocks screenshots 6 and 7.

### Phase 4: Visibility Governance

Implement:

- visibility website registry
- pause/restore/extend/grace override
- visibility state model

This unlocks screenshots 9 and 10.

### Phase 5: Config, Analytics, Compliance

Implement:

- system config endpoints
- report/analytics endpoints
- compliance dashboard
- exports

This unlocks screenshots 2, 3, 4, 5, 8, and 16.

## 10. Important Risks And Fixes

### Risk 1: `CreditLog.creditType` is too broad for purchased/referral

Purchased and referral task credits are currently logged as `EARNED_TASK` with note prefixes. This works, but admin analytics should not parse business meaning from `note`.

Recommended fix:

- add `sourceBucket` enum to `CreditLog`
- values: `SUBSCRIPTION`, `PURCHASED`, `REFERRAL`, `EARNED`, `VISIBILITY`

### Risk 2: generic admin adjustment needs stronger audit model

Task `CREDIT_REFUND` and `CREDIT_REVERSE` exist, but they modify task values and write `TaskFlow`. A forensic admin credit panel needs a dedicated adjustment record and linked `CreditLog`.

Recommended fix:

- add `AdminCreditAdjustment`
- require `reasonCode` and `note`
- store before/after balance
- store `adminId`
- store integrity hash

### Risk 3: central config should not overwrite plan APIs silently

Subscription plan admin APIs already exist. The new `/admin-credits/config` should either compose those services or clearly own only credit-governance settings.

Recommended fix:

- keep subscription plan CRUD in `AdminSubscriptionPlanModule`
- create separate `CreditSystemConfig` for grace, referral, visibility, badge, and feature toggles

### Risk 4: visibility status is not modeled

Visibility credits exist, but marketplace visibility status and grace timers do not appear as a first-class model.

Recommended fix:

- add `WebsiteVisibilityState`
- record every admin visibility action in `WebsiteVisibilityActionLog`

## 11. Suggested Naming Correction

The example `/creadet/all` should probably become one of these:

```text
GET /admin-credits/ledger
GET /admin-credits/overview
GET /admin-credits/referrals
```

Use `/credits/*` for normal authenticated user credit APIs.

Use `/admin-credits/*` for admin panel APIs.

Avoid misspelled or ambiguous route groups like `/creadet`.

## 12. Minimum API Set To Build First

If the goal is to make the admin panel usable quickly, build these first:

| Priority | API | Why |
| --- | --- | --- |
| P0 | `GET /admin-credits/overview` | Top dashboard cards |
| P0 | `GET /admin-credits/ledger` | Credit governance ledger |
| P0 | `GET /admin-credits/wallets/websites/:websiteId` | Website wallet profile |
| P0 | `POST /admin-credits/adjustments` | Manual add/remove/reverse |
| P0 | `GET /admin-task/all` | Already exists for task ledger |
| P0 | `GET /admin-task/:id` | Already exists for task detail |
| P0 | `POST /admin-task/:id/action` | Already exists for task actions |
| P1 | `GET /admin-credits/referrals` | Referral registry |
| P1 | `GET /admin-credits/referrals/:id` | Referral detail modal |
| P1 | `POST /admin-credits/referrals/:id/revoke-credit` | Referral control |
| P1 | `GET /admin-credits/visibility/websites` | Visibility table |
| P1 | `POST /admin-credits/visibility/websites/:websiteId/extend` | Grace extension |
| P2 | `GET /admin-credits/config` | System config |
| P2 | `GET /admin-credits/analytics/registry` | Analytics registry |
| P2 | `GET /admin-credits/compliance/overview` | Compliance center |

