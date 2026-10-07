# Credit Module Scope Checklist

This checklist is intentionally scoped to `src/modules/credit/` and excludes visibility-credit work.

Target folder:

- [src/modules/credit/](/home/imran/Desktop/backlyst-backend/src/modules/credit/)

This document answers one question:

- inside the `credit` module, what still needs to be changed so the credit system becomes production-ready and aligned with the intended marketplace task-credit model

## 1. Current State of the Credit Module

Current files:

- [credit.module.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit.module.ts:1)
- [controllers/credit.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/controllers/credit.controller.ts:1)
- [controllers/referrer.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/controllers/referrer.controller.ts:1)
- [credit-task/credit-task.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.controller.ts:1)
- [credit-task/credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:1)
- [credit-task/dto/task-credit.dto.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/dto/task-credit.dto.ts:1)
- [dto/credit-statement-query.dto.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/dto/credit-statement-query.dto.ts:1)
- [services/credit.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/services/credit.service.ts:1)
- [services/referrer.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/services/referrer.service.ts:1)

Current module capability:

- user-level credit summary
- user-level credit statement/history
- earned balance endpoint
- subscription balance endpoint
- referral progress read
- task credit deduct
- task credit refund
- provider earned reward

Main problem:

- this module still works mostly with `userId`-centric wallet behavior
- the desired direction for task credit is website-aware and source-aware

## 2. High-Priority Problems Inside `src/modules/credit/`

## 2.1 Security problem: routes trust body ids

Problem:

- `credits/tasks/deduct`
- `credits/tasks/refund`
- `credits/tasks/reward-provider`

currently accept `userId` or `providerId` from request body and pass those directly into balance mutation logic.

Files:

- [credit-task.controller.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.controller.ts:21)
- [task-credit.dto.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/dto/task-credit.dto.ts:11)
- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:14)

What to do:

- stop trusting raw `userId` in body for requester spend/refund
- stop trusting raw `providerId` in body for reward if caller is not privileged internal flow
- derive authenticated user from token where applicable
- validate task ownership and task/provider relationship server-side

Implementation direction:

- controller should read `@CurrentUser('id')`
- service should resolve the task first
- task should decide the allowed requester/provider identities

## 2.2 Wrong ownership context in service methods

Problem:

`CreditTaskService` currently starts from:

- `userId`

but task-credit operations should eventually be executed in a stronger context:

- `taskId`
- `requesterWebsiteId`
- task owner user
- source pool

Files:

- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:19)

What to do:

- make `taskId` the primary context
- resolve related task, requester, requester website, selected provider from DB
- let service decide valid spend source based on task context, not caller-supplied ids alone

## 2.3 Spend order is incomplete

Current behavior:

- subscription first
- earned second

Files:

- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:59)

What still needs to be added:

- allocated referral credits as third source
- allocated purchased credits as fourth source

Even if purchased/referral tables live outside the module schema-wise, the orchestration logic belongs here.

## 2.4 Refund logic is not source-accurate

Problem:

subscription refund currently goes to the first active batch for the user, not necessarily the original funding source.

File:

- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:116)

What to do:

- refund must use original spend source metadata
- ideally refund should reference:
  - original transaction id
  - source pool type
  - source allocation id / subscription batch id

Without this, refunds become incorrect once there are multiple subscriptions or future allocation pools.

## 2.5 Ledger does not yet capture rich pool breakdown

Problem:

Current `CreditLog` write pattern records one aggregated spend row per action. That is not enough once one task spend may consume multiple pools.

Files:

- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:94)
- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:140)
- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:184)
- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:270)
- [credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:326)

What to do:

- define a consistent ledger strategy for:
  - source-specific spend entries
  - source-specific refund entries
  - provider reward entries
  - future purchased/referral allocation source entries

Recommended:

- if one task consumes multiple sources, write one log row per source consumed
- add a shared settlement correlation id in metadata or future schema

## 3. File-by-File Change List

## 3.1 `credit.module.ts`

Current role:

- wires controllers and providers

What to do:

- keep as module entrypoint
- if credit grows, split into sub-services:
  - `CreditSummaryService`
  - `TaskCreditSettlementService`
  - `ReferralCreditAllocationService`
  - `PurchasedCreditAllocationService`

Recommendation:

- do not keep all future credit logic inside one or two service files

## 3.2 `controllers/credit.controller.ts`

Current routes:

- `GET /credits/me`
- `GET /credits/statement`
- `GET /credits/earned`
- `GET /credits/subscription`

What to change:

### Keep but reshape

- `GET /credits/me`

Should no longer only return merged user-level summary.

Instead it should eventually return:

- master purchased credit summary
- master referral credit summary
- high-level website credit summary list

### Add website-aware summary route

Need new route:

- `GET /credits/websites/:websiteId/summary`

Should return separated pools for that website:

- subscription task credits
- earned task credits
- allocated referral credits
- allocated purchased credits

### Add website-aware history route

Need new route:

- `GET /credits/websites/:websiteId/statement`

Current `GET /credits/statement` can remain for master account-level history if needed, but website statement should be first-class.

### Potentially deprecate or narrow these routes

- `GET /credits/earned`
- `GET /credits/subscription`

Reason:

- they are currently user-level and too narrow for the new pool model

## 3.3 `dto/credit-statement-query.dto.ts`

Current filters:

- `page`
- `limit`
- `creditType`
- `action`
- `reason`
- `websiteId`
- `fromDate`
- `toDate`

What to add later:

- `sourcePool`
- `taskId`
- `subscriptionId`
- `allocationType`
- `allocationId`

What to improve now:

- this DTO is okay as a base
- but it assumes one generic statement shape
- future credit statements will need pool-aware filtering

## 3.4 `services/credit.service.ts`

Current responsibility:

- summary and statement queries

What to change:

### `getMyCredits()`

Current issue:

- returns combined user-level balances
- hides source separation too much

Need:

- return separated credit families
- stop presenting `totalTaskCredits` as the main mental model
- expose source-specific balances clearly

### `getCreditStatement()`

Current issue:

- user statement only
- website filter is optional, but not a website-first API

Need:

- add website-scoped statement method
- add summary method per website
- support future purchased/referral transaction histories

### `getEarnedCredits()` / `getSubscriptionCredits()`

Current issue:

- too tied to user-level aggregation

Need:

- either replace with website-scoped versions
- or clearly define them as master-account helper endpoints only

## 3.5 `credit-task/dto/task-credit.dto.ts`

Current problem:

- request bodies contain:
  - `userId`
  - `providerId`

This is fragile and unsafe for direct wallet mutation endpoints.

What to change:

### Deduct DTO

Current:

- `taskId`
- `userId`
- `creditAmount`
- `walletType?`
- `note?`

Needs:

- remove `userId` from public route DTO
- optionally add `websiteId` if route is website-explicit
- replace `walletType` with richer source enum later if needed:
  - `SUBSCRIPTION`
  - `EARNED`
  - `REFERRAL`
  - `PURCHASED`

### Refund DTO

Current:

- `taskId`
- `userId`
- `creditAmount`
- `walletType`
- `note?`

Needs:

- remove `userId`
- ideally refund by original settlement reference, not manual source guessing
- add `originalCreditLogId` or `settlementId`

### Reward DTO

Current:

- `taskId`
- `providerId`
- `creditAmount`
- `note?`

Needs:

- avoid trusting arbitrary `providerId` from request body in public route
- use task relationship to determine valid provider
- if provider reward is internal-only, mark route/service accordingly

## 3.6 `credit-task/credit-task.controller.ts`

Current routes:

- `POST /credits/tasks/deduct`
- `POST /credits/tasks/refund`
- `POST /credits/tasks/reward-provider`

What to change:

### Route security

- all three routes need ownership/authorization tightening

### Consider route semantics

Better long-term options:

- internal-only settlement hooks
- or requester website explicit routes

Example future shapes:

- `POST /credits/tasks/:taskId/settle`
- `POST /credits/tasks/:taskId/refund`
- `POST /credits/tasks/:taskId/reward-provider`

This reduces bad input surface.

## 3.7 `credit-task/credit-task.service.ts`

This file needs the biggest work inside the module.

### Must-fix items

1. Validate actor ownership properly
2. Resolve task relationships before mutation
3. Stop relying on caller-supplied `userId`
4. Support four-step spend order:
   - subscription
   - earned
   - referral allocated
   - purchased allocated
5. Make refund source-aware
6. Make all wallet mutations transactional
7. Make log creation source-aware and deterministic

### Transaction consistency

Current issue:

- some deduction/update/log sequences are not wrapped in one explicit transaction block

Need:

- use `prisma.$transaction()` for:
  - batch decrement
  - wallet decrement
  - log insert
  - settlement summary writes

### Service refactor suggestion

Split this file into internal methods like:

- `resolveTaskSpendContext()`
- `collectAvailableCreditPools()`
- `deductFromSubscriptionPool()`
- `deductFromEarnedPool()`
- `deductFromReferralPool()`
- `deductFromPurchasedPool()`
- `writeSettlementLogs()`
- `refundOriginalSettlement()`
- `rewardProviderWebsite()`

### Important note

Visibility logic should stay out of this file for now, per current scope.

## 3.8 `controllers/referrer.controller.ts`

Current route:

- `GET /credits/referrers/progress`

This route is fine as read-only progress reporting.

What may still be needed inside credit module later:

- master referral credit balance endpoint
- allocation endpoint from account-level referral pool to a website
- referral allocation history endpoint

If referral allocation is implemented in credit module, these would likely live near this controller or in a dedicated `referral-credit.controller.ts`.

## 3.9 `services/referrer.service.ts`

Current responsibility:

- returns referral progress

What to do:

- keep current progress formatting
- do not mix allocation logic directly into the same read-only service
- if referral-credit allocation is added, create a separate service for:
  - allocation
  - reallocation
  - master referral credit summary

## 4. What Should Be Added Inside `src/modules/credit/`

Even if some schema changes happen elsewhere, these new module files will likely be needed:

### Recommended new DTOs

- `dto/website-credit-summary-query.dto.ts`
- `dto/allocate-referral-credit.dto.ts`
- `dto/allocate-purchased-credit.dto.ts`
- `dto/reallocate-credit.dto.ts`
- `dto/task-credit-settlement.dto.ts`

### Recommended new controllers

- `controllers/website-credit.controller.ts`
- `controllers/referral-credit.controller.ts`
- `controllers/purchased-credit.controller.ts`

### Recommended new services

- `services/website-credit.service.ts`
- `services/task-credit-settlement.service.ts`
- `services/referral-credit-allocation.service.ts`
- `services/purchased-credit-allocation.service.ts`

## 5. Minimum Practical Refactor Order for the Credit Module

If work starts only inside `src/modules/credit/`, the safest order is:

1. Fix route security and remove body-trusted user ids
2. Refactor `CreditTaskService` into transaction-safe settlement methods
3. Add website-aware summary/statement routes in `CreditController`
4. Introduce source-aware spend/refund log strategy
5. Add referral/purchased pool orchestration hooks
6. Split large services into focused services

## 6. What Not to Do

Inside the credit module, avoid these mistakes:

- do not keep expanding `userId`-centric public spend APIs
- do not mix visibility logic into task-credit settlement right now
- do not hide all pools behind one `totalTaskCredits` number
- do not refund subscription credit to an arbitrary active batch
- do not let public routes accept wallet owner ids blindly

## 7. Bottom Line

If we strictly scope to `src/modules/credit/` and ignore visibility for now, the real work left is:

- secure the task-credit mutation routes
- redesign the service around task/website context instead of raw user ids
- add source-aware settlement and refund handling
- expand spend order to support future referral and purchased pools
- expose website-level summary and statement APIs
- split the module into cleaner services before it grows further

This is the right place to fix the orchestration layer, even though some supporting schema changes will still be required outside the module.

