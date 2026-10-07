# Credit Developer Guide

This document explains the current credit system in the codebase so a new developer can understand the schema, routes, task-credit lifecycle, and current architectural behavior without reverse-engineering the project.

## 1. Purpose

The credit system is responsible for:

- tracking each user's spendable credit balance
- separating subscription credit from earned credit
- recording every credit movement in an audit log
- attaching credit cost and settlement data to tasks
- exposing summary and statement APIs
- supporting referral-progress reporting
- supporting admin credit adjustment on tasks

In short:

- requesters spend credits to post or settle tasks
- providers earn credits after successful completion
- subscription credits are stored as expiring batches
- every movement should be traceable through `CreditLog`

## 2. Core Modules and Services

### Credit module

- Module: [src/modules/credit/credit.module.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit.module.ts:1)
- Controllers:
  - [credit.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/controllers/credit.controller.ts:1)
  - [referrer.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/controllers/referrer.controller.ts:1)
  - [credit-task.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.controller.ts:1)
- Services:
  - [credit.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/services/credit.service.ts:1)
  - [referrer.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/services/referrer.service.ts:1)
  - [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:1)

### Related modules

- Task creation and task credit metadata:
  - [task-requester.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/task-requester/task-requester.service.ts:1)
  - [provider-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/provider-task/provider-task.service.ts:1)
- Admin credit adjustment:
  - [admin-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/admin-task/admin-task.service.ts:323)
- User registration wallet bootstrap:
  - [auth.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/auth/auth.service.ts:113)

## 3. Credit Data Model

Primary schema: [prisma/schema/credit.prisma](/home/imran/Desktop/backlyst-backend/prisma/schema/credit.prisma:1)

### Main tables

| Table | Purpose |
| --- | --- |
| `UserCreditWallet` | Stores wallet-level balances such as `earnedTaskCredits` and `visibilityCredits` |
| `SubscriptionCreditBatch` | Stores subscription credits in expiring batches |
| `CreditLog` | Immutable transaction/audit history for all credit movements |
| `UserReferral` | Tracks referral relationship and referral stage progress |
| `ReferralReward` | Tracks stage-wise referral reward breakdown |

### Shared related tables

| Table | Credit relevance |
| --- | --- |
| `User` | Owns wallet, subscriptions, referrals, and credit logs |
| `Subscription` | Source of subscription credit batches |
| `SubscriptionPlan` | Defines plan-level credit configuration |
| `PlacementTask` | Stores task-level credit cost, reserve, final cost, and provider reward |
| `Website` | Can be attached to credit logs and referral flow |

## 4. Credit Types, Actions, and Reasons

### Credit types

| Enum | Meaning |
| --- | --- |
| `SUBSCRIPTION_TASK` | Task credit granted from subscription |
| `EARNED_TASK` | Task credit earned by providers or manually added |
| `VISIBILITY` | Visibility-oriented credit bucket |

### Credit actions

| Enum | Meaning |
| --- | --- |
| `ADD` | Manual or system add |
| `SPEND` | Credit spent |
| `EXPIRE` | Credit expired |
| `REFUND` | Credit returned |
| `REWARD` | Credit granted as reward |

### Credit reasons

| Enum | Meaning |
| --- | --- |
| `SUBSCRIPTION_PURCHASE` | Credit granted from plan purchase |
| `TASK_COMPLETION` | Provider reward after task completion |
| `TASK_POST` | Task posting or settlement flow |
| `REFERRAL_WEBSITE_VERIFIED` | Referral stage 1 |
| `REFERRAL_FIRST_BACKLINK` | Referral stage 2 |
| `REFERRAL_PAID_SUBSCRIPTION` | Referral stage 3 |
| `MANUAL` | Manual admin/system operation |

## 5. Route Inventory

### 5.1 Credit summary and statement routes

Controller: [src/modules/credit/controllers/credit.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/controllers/credit.controller.ts:1)

| Method | Route | Purpose | Main service |
| --- | --- | --- | --- |
| `GET` | `/credits/me` | Returns combined credit summary for current user | `CreditService.getMyCredits` |
| `GET` | `/credits/statement` | Returns paginated credit statement with filters | `CreditService.getCreditStatement` |
| `GET` | `/credits/earned` | Returns only earned task balance | `CreditService.getEarnedCredits` |
| `GET` | `/credits/subscription` | Returns active subscription task balance | `CreditService.getSubscriptionCredits` |

#### `/credits/me`

Returns:

- `subscriptionCredits`
- `earnedTaskCredits`
- `visibilityCredits`
- `totalTaskCredits`

#### `/credits/statement`

Supports filters:

- `page`
- `limit`
- `creditType`
- `action`
- `reason`
- `websiteId`
- `fromDate`
- `toDate`

This is the main ledger browsing endpoint for the current user.

### 5.2 Referral progress route

Controller: [src/modules/credit/controllers/referrer.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/controllers/referrer.controller.ts:1)

| Method | Route | Purpose | Main service |
| --- | --- | --- | --- |
| `GET` | `/credits/referrers/progress` | Returns stage-by-stage referral progress and reward breakdown | `ReferrerService.getReferralProgress` |

This route is read-only. It reports:

- referred user
- referred website
- current stage
- stage 1 reward
- stage 2 reward
- stage 3 reward
- total credits earned from the referral

### 5.3 Task credit operation routes

Controller: [src/modules/credit/credit-task/credit-task.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.controller.ts:1)

| Method | Route | Purpose | Request body |
| --- | --- | --- | --- |
| `POST` | `/credits/tasks/deduct` | Deduct task credit from requester wallet | `DeductTaskCreditDto` |
| `POST` | `/credits/tasks/refund` | Refund task credit back to requester wallet | `RefundTaskCreditDto` |
| `POST` | `/credits/tasks/reward-provider` | Reward provider earned credit after task completion | `RewardProviderCreditDto` |

#### `POST /credits/tasks/deduct`

Used when requester credit needs to be spent.

Request body:

- `taskId`
- `userId`
- `creditAmount`
- `walletType?`
- `note?`

Behavior:

- validates `creditAmount > 0`
- validates task exists
- loads or creates wallet
- if `walletType = EARNED`, deducts only from earned wallet
- if `walletType = SUBSCRIPTION`, deducts only from subscription batches
- if `walletType` is omitted, uses subscription first, then earned fallback
- creates a `CreditLog` row

#### `POST /credits/tasks/refund`

Used when requester credit should be returned.

Request body:

- `taskId`
- `userId`
- `creditAmount`
- `walletType`
- `note?`

Behavior:

- validates `creditAmount > 0`
- validates task exists
- if refund target is `EARNED`, increments `earnedTaskCredits`
- if refund target is `SUBSCRIPTION`, increments an active subscription batch
- creates a `CreditLog` row

#### `POST /credits/tasks/reward-provider`

Used when provider should receive earned credit after successful task completion.

Request body:

- `taskId`
- `providerId`
- `creditAmount`
- `note?`

Behavior:

- validates `creditAmount > 0`
- validates task exists
- loads or creates provider wallet
- increments provider `earnedTaskCredits`
- creates a `CreditLog` row with `REWARD` action and `TASK_COMPLETION` reason

### 5.4 Admin credit adjustment route

Controller: [src/modules/task/admin-task/admin-task.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/admin-task/admin-task.controller.ts:1)

| Method | Route | Purpose | Request body |
| --- | --- | --- | --- |
| `POST` | `/admin-task/:id/add-credit-adjustment` | Adjust task credit values at admin level | `AddCreditAdjustmentDto` |

Request body:

- `adjustmentType`
- `amount?`
- `note`

Supported adjustment types:

- `REFUND`
- `REVERSE`
- `ADD`

Current behavior:

- updates `finalCreditCost`
- updates `reservedCreditAmount`
- adds a task flow note
- does not currently create a dedicated credit adjustment table row because that code is commented out

## 6. Task Creation: Which Fields Matter for Credit

Task creation controller: [src/modules/task/task-requester/task-requester.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/task-requester/task-requester.controller.ts:1)

Task DTO: [src/modules/task/task-requester/dto/create-task.dto.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/task-requester/dto/create-task.dto.ts:1)

### Incoming request shape

`POST /task-requester`

This endpoint expects `multipart/form-data` with:

- `data`: JSON string containing `CreateTaskDto`
- `files?`: optional support documents

### Required task fields

| Field | Required | Credit relevance |
| --- | --- | --- |
| `requesterWebsiteId` | Yes | Ownership is validated before task creation |
| `projectTitle` | Yes | Not used in credit calculation |
| `targetUrl` | Yes | Not used in credit calculation |
| `anchorText` | Yes | Not used in credit calculation |
| `placementType` | Yes | Main driver of credit cost |
| `linkAttribute` | Yes | Not used in credit calculation |
| `requestedDeadlineDays` | Yes | Not currently used in credit cost |
| `placementGuidelines` | No | Not used in credit calculation |
| `requiredDomainRating` | No | Not used in credit calculation |

### Credit-relevant task creation logic

Inside `TaskRequesterService.createTask()`:

- `placementType = BACKLINK_INSERTION` => `creditCost = 1`
- other task types => `creditCost = 2`
- `placementType = FLEXIBLE` => `reservedCreditAmount = 2`
- otherwise => `reservedCreditAmount = creditCost`

So the fields a developer must care about for credit during task creation are:

- `requesterWebsiteId`
- `placementType`

And the task record will persist:

- `creditCost`
- `reservedCreditAmount`

## 7. Task Submission Fields That Affect Final Credit

Submit DTO: [src/modules/task/provider-task/dto/submit-task.dto.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/provider-task/dto/submit-task.dto.ts:1)

Credit-relevant submit field:

| Field | Required | Credit relevance |
| --- | --- | --- |
| `finalTaskType` | Only for `FLEXIBLE` tasks | Determines final settlement cost |

Final settlement rules:

- `GUEST_POST` => final cost `2`
- `BACKLINK` => final cost `1`
- `FLEXIBLE + BACKLINK` => final cost `1`
- `FLEXIBLE + GUEST_POST` => final cost `2`

When provider submits work, the system stores:

- `finalCreditCost`
- `providerRewardCredits`

## 8. End-to-End Credit Process

### Step 1. User registration

- user account is created
- a zeroed `UserCreditWallet` is created automatically

### Step 2. Subscription credit existence

- subscription credits are expected to live in `SubscriptionCreditBatch`
- balances are read from active, non-expired batches

### Step 3. Task creation

- requester creates task
- system validates ownership of `requesterWebsiteId`
- system calculates `creditCost`
- system calculates `reservedCreditAmount`
- these values are stored on `PlacementTask`

Important:

- current task creation flow calculates and stores credit metadata
- it does not directly call `CreditTaskService.deductTaskCredit()`

### Step 4. Credit deduction

When actual requester spend must happen:

- `POST /credits/tasks/deduct` is called
- system checks wallet and source
- system spends subscription first by default
- if subscription is insufficient, earned credits are used as fallback
- a ledger row is written to `CreditLog`

### Step 5. Provider submission and settlement

- provider submits task
- system determines `finalCreditCost`
- system stores `providerRewardCredits`
- downstream credit operations can then spend requester credit and reward provider credit

### Step 6. Approval or dispute

Depending on task review outcome:

- task can be completed
- task can move to revision requested
- task can become disputed
- refund or reverse flow may happen through credit APIs or admin action

### Step 7. Provider reward

If provider should be rewarded:

- `POST /credits/tasks/reward-provider` is called
- provider's `earnedTaskCredits` increases
- reward is logged in `CreditLog`

### Step 8. Refund

If requester credit should be returned:

- `POST /credits/tasks/refund` is called
- refund goes back to earned wallet or subscription batch
- refund is logged in `CreditLog`

## 9. Use Cases

### Use case 1: Standard backlink task

- requester creates task with `placementType = BACKLINK_INSERTION`
- system stores `creditCost = 1`
- system stores `reservedCreditAmount = 1`
- deduction should spend 1 credit
- if completed, provider reward can be 1 credit

### Use case 2: Guest post task

- requester creates task with `placementType = GUEST_POST`
- system stores `creditCost = 2`
- system stores `reservedCreditAmount = 2`
- requester spends 2 credits
- if completed, provider reward can be 2 credits

### Use case 3: Flexible task resolved as backlink

- requester creates task with `placementType = FLEXIBLE`
- system reserves 2 credits
- provider submits with `finalTaskType = BACKLINK`
- system stores `finalCreditCost = 1`
- depending on orchestration, 1 credit is final spend and difference may need refund/reversal

### Use case 4: Flexible task resolved as guest post

- requester creates task with `placementType = FLEXIBLE`
- system reserves 2 credits
- provider submits with `finalTaskType = GUEST_POST`
- final cost remains 2

### Use case 5: Task cancelled or disputed

- credit may need refund
- refund route returns credit to the correct wallet source

### Use case 6: Admin correction

- admin uses `/admin-task/:id/add-credit-adjustment`
- system changes task settlement values
- task flow is updated for audit visibility

## 10. What a New Developer Must Remember

- `PlacementTask` stores credit metadata, but wallet movement is handled by `CreditTaskService`
- subscription credits are batch-based and can expire
- earned credits live directly on `UserCreditWallet`
- `CreditLog` is the source of truth for transaction history
- task creation does not automatically prove spend happened
- provider submission does not automatically prove reward happened
- some orchestration still depends on how services are wired by higher-level flow

## 11. Current Gaps and Caveats

These are important for any future developer:

- task creation currently calculates credit values but does not directly deduct wallet balance
- `SubscriptionCreditBatch` read/update logic is visible, but batch creation/grant flow is not clearly visible in the current repo
- referral progress reporting exists, but full referral reward issuance flow is not clearly visible in the current repo
- admin credit adjustment updates task cost fields, but does not currently persist a dedicated adjustment record because that code is commented out

## 12. Recommended Future Improvements

- wire task creation or task assignment flow explicitly to `deductTaskCredit()`
- wire task completion flow explicitly to `rewardProviderCredit()`
- introduce a single orchestration service for task-credit settlement
- persist admin adjustment rows in a dedicated table
- document which service is the final authority for reserve, settle, refund, and reward

## 13. Quick Reference

### Routes

- `GET /credits/me`
- `GET /credits/statement`
- `GET /credits/earned`
- `GET /credits/subscription`
- `GET /credits/referrers/progress`
- `POST /credits/tasks/deduct`
- `POST /credits/tasks/refund`
- `POST /credits/tasks/reward-provider`
- `POST /admin-task/:id/add-credit-adjustment`

### Credit rules

- `BACKLINK_INSERTION` = `1` credit
- `GUEST_POST` = `2` credits
- `FLEXIBLE` = reserve `2`, final settle by `finalTaskType`
- default spend order = subscription first, earned second

