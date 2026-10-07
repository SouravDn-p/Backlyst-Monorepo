# Credit System Gap Analysis Against Client Marketplace Specification

This document compares the client's requested credit architecture with the current Backlyst backend implementation and identifies the changes required to support the target design.

## Executive Summary

The current implementation is **not a small extension** of the requested model. It is a **partial credit system** built primarily around:

- user-level wallet ownership
- task-level cost tracking
- subscription credit batch spending
- earned credit storage at user level
- transaction logging
- referral progress reporting

The client specification requires a **multi-pool, multi-owner, website-aware marketplace credit system** with:

- website-bound subscription credits
- account-owned purchased credits with website allocation
- website-bound earned credits with cap rules
- account-owned referral credits with website allocation
- separate visibility economy
- configurable per-credit-type expiry/cap/reward rules
- deterministic usage order across four task-credit pools

That means the current codebase needs a **domain redesign**, not just a few endpoint changes.

## 1. Current Architecture Snapshot

### What exists today

Current schema and services support:

- `UserCreditWallet` with:
  - `earnedTaskCredits`
  - `visibilityCredits`
- `SubscriptionCreditBatch` tied to:
  - `walletId`
  - `userId`
  - optional `subscriptionId`
- `CreditLog`
- `UserReferral`
- `ReferralReward`
- task-side fields:
  - `creditCost`
  - `reservedCreditAmount`
  - `finalCreditCost`
  - `providerRewardCredits`

### Current ownership model

The active model is mostly:

- **user-owned wallet**
- **user-owned subscription batches**
- **user-level earned balance**

This is the main mismatch with the client specification.

## 2. Highest-Risk Mismatches

### Critical mismatch 1: subscription is user-level, not website-level

Current implementation:

- `Subscription` has `userId`, `planId`
- there is **no `websiteId` on `Subscription`**
- active subscription is queried by `userId`

Impact:

- one subscription belongs to a user account, not a specific website
- impossible to enforce "Site A Silver credits belong only to Site A"
- impossible to stop free cross-website use of subscription credits

### Critical mismatch 2: no website wallet model

Current implementation:

- only `UserCreditWallet` exists
- there is **no `WebsiteCreditWallet`**
- there is no per-website task-credit pool

Impact:

- impossible to separate:
  - Site A earned credits
  - Site B earned credits
  - Site C allocated purchased credits

### Critical mismatch 3: purchased credits do not exist

Current implementation:

- there is no purchased-credit table
- there is no purchase/allocation/transfer flow
- there is no master account credit pool

Impact:

- client requirement for "buy once at account level, allocate to websites later" is completely missing

### Critical mismatch 4: referral credits are only progress-tracked, not allocated as a pool

Current implementation:

- `UserReferral` and `ReferralReward` exist
- referral progress endpoint exists
- no visible master referral wallet pool exists
- no website allocation flow exists

Impact:

- the client's referral-credit behavior is not implemented

### Critical mismatch 5: visibility economy is not separated as a first-class subsystem

Current implementation:

- `visibilityCredits` exists on `UserCreditWallet`
- some referral response examples mention visibility rewards
- there is no visibility allocation, duration, decay, purchase, or website-specific visibility ledger flow

Impact:

- visibility is currently only a field, not a real marketplace subsystem

## 3. Requirement-by-Requirement Gap Analysis

## 3.1 Subscription Credits

### Client requirement

Subscription credits must be:

- tied to a specific website subscription
- tier-capped
- subject to expiry/rollover rules
- consumed before other task credits
- not transferable between websites

### Current status

Partially implemented, but wrong ownership model.

What exists:

- subscription credit batches
- expiry field `expiresAt`
- oldest-first spending

What is missing:

- `websiteId` on `Subscription`
- `websiteId` on `SubscriptionCreditBatch`
- website-level summary APIs
- enforcement that subscription credits can only be used by the subscribed website
- rollover rule configuration
- tier-specific per-website capacity enforcement

### Required changes

Schema:

- add `websiteId` to `Subscription`
- add `websiteId` to `SubscriptionCreditBatch`
- optionally add `subscriptionTierSnapshot` if needed for historical reporting

Business logic:

- change checkout flow to purchase subscription for a selected website
- require verified website before subscription activation
- create credit batches for that website only
- spend subscription credits only when the task's `requesterWebsiteId` matches the batch `websiteId`

API:

- subscription checkout must include `websiteId`
- active subscription endpoint should support website-specific query
- credit summary should expose website-specific subscription balance

## 3.2 Purchased Credits

### Client requirement

Purchased credits should:

- be owned by the master user account
- be allocatable to verified owned websites
- be movable between owned websites while unused
- not be locked at purchase time
- have configurable expiry rules

### Current status

Not implemented.

### Required changes

New schema needed:

- `UserPurchasedCreditWallet`
- `PurchasedCreditLot` or `PurchasedCreditBatch`
- `WebsitePurchasedCreditAllocation`
- `PurchasedCreditTransfer`
- `PurchasedCreditUsage`

Suggested model behavior:

- user buys a master pool
- the pool is recorded in account wallet / batches
- user allocates available amount to one verified website
- task spending consumes from allocated amount only
- unused allocated amounts can be rebalanced across the same owner's verified websites

Key enforcement:

- transfers allowed only for unused allocated purchased credits
- once spent on task, no transfer/reassignment allowed

API additions:

- `POST /credits/purchased/buy`
- `GET /credits/purchased/master`
- `POST /credits/purchased/allocate`
- `POST /credits/purchased/reallocate`
- `GET /credits/websites/:websiteId/purchased-balance`

## 3.3 Earned Credits

### Client requirement

Earned credits should:

- belong to the website that earned them
- remain separate from subscription credits
- not use monthly expiry
- be limited by tier-based earned-credit caps
- support overflow handling instead of silent deletion

### Current status

Only partially implemented.

What exists:

- provider rewards increase `earnedTaskCredits`
- earned credits are tracked separately from subscription credits

What is wrong:

- earned credits are stored at **user level**, not website level
- no earned cap per tier
- no overflow strategy
- no linkage between earning website and the earned credit destination

### Required changes

Schema:

- move earned balances from user wallet to website wallet, or
- introduce `WebsiteCreditWallet.earnedTaskCredits`
- add optional `pendingEarnedCredits` / `overflowEarnedCredits`
- add `earnedCreditCap` config per tier

Business logic:

- provider reward must identify **which website earned it**
- reward should increase that website's earned pool
- if cap reached:
  - convert overflow to visibility
  - or mark pending
  - or store overflow event for later claim

API additions:

- website-level earned balance endpoint
- earned overflow visibility endpoint or notification mechanism

## 3.4 Referral Credits

### Client requirement

Referral credits should:

- originate at account level
- then be allocatable to verified owned websites

### Current status

Referral tracking exists, but the actual referral-credit pool architecture does not.

### Required changes

New schema needed:

- `UserReferralCreditWallet`
- `WebsiteReferralCreditAllocation`
- `ReferralCreditTransferLog`

Business logic:

- reward issuance should credit the user's master referral pool
- user can allocate referral credits to any verified owned website
- task spend order should consume allocated referral credits before purchased credits

API additions:

- `GET /credits/referral/master`
- `POST /credits/referral/allocate`
- `POST /credits/referral/reallocate`

## 3.5 Visibility Credits

### Client requirement

Visibility credits must be a separate system controlling:

- exposure
- ranking
- activity positioning
- discoverability duration

They must not be mixed with task credits.

### Current status

Not implemented as a standalone subsystem.

What exists:

- `visibilityCredits` field

What is missing:

- website-level visibility wallet
- duration-based visibility accounting
- visibility purchase flow
- visibility refresh from verified contributions
- decay/expiration rules
- visibility ranking integration

### Required changes

New schema needed:

- `WebsiteVisibilityWallet`
- `VisibilityTransaction`
- `VisibilityBoostWindow` or `VisibilityPeriod`
- `VisibilityConfig`

Business logic:

- verified backlink contribution should add visibility duration to that website
- purchased visibility should also add duration
- background job or query logic should compute active visibility state

API additions:

- `GET /credits/websites/:websiteId/visibility`
- `POST /credits/visibility/purchase`
- `POST /credits/visibility/grant`
- admin visibility config routes

## 3.6 Credit Usage Order

### Client requirement

When a website creates a task, spend order must be:

1. subscription credits
2. earned credits
3. allocated referral credits
4. allocated purchased credits

### Current status

Partially implemented.

What exists:

- subscription first
- earned second fallback

What is missing:

- referral pool in the order
- purchased pool in the order
- website-specific consumption context

### Required changes

`CreditTaskService` must be redesigned to:

- accept `websiteId` as primary context
- resolve four credit pools for that website
- spend in deterministic order
- log source breakdown when a task consumes multiple pools

Potential improvement:

- create a `TaskCreditSettlementService` that returns:
  - requested amount
  - actual pool breakdown
  - remaining balances
  - transaction ids

## 3.7 Capacity Rule

### Client requirement

- subscription cap applies only to subscription credits
- purchased and visibility should not use subscription cap
- earned uses its own separate cap

### Current status

Not implemented correctly.

Current plan table has:

- `credit`
- `monthlyTaskCreditAllowance`
- `maxTaskCreditCapacity`

But there is no clear enforcement layer separating:

- subscription cap
- earned cap
- purchased no-cap
- visibility no-cap

### Required changes

Config model must distinguish:

- `subscriptionCapacity`
- `subscriptionMonthlyAllowance`
- `earnedCreditCap`
- `purchasedCreditExpiryDays`
- `visibilityRules`

Business logic must enforce cap by credit family instead of one shared concept.

## 3.8 Admin Configuration

### Client requirement

Admin must be able to configure:

- subscription limits per tier
- earned limits per tier
- rollover limits
- expiry periods per credit type
- purchased inactivity expiry
- contribution rewards
- milestone rewards
- referral rewards
- visibility duration
- visibility decay
- enterprise limits

### Current status

Mostly missing.

What exists:

- admin can create subscription plans
- plan contains a few credit-related fields

What is missing:

- central marketplace economy config
- per-credit-type expiry config
- reward tuning config
- rollover config
- enterprise override config
- visibility config

### Required changes

New schema recommended:

- `CreditEconomyConfig`
- `TierCreditPolicy`
- `RewardPolicy`
- `VisibilityPolicy`

Possible implementation styles:

- one normalized config table set
- or one JSON-backed admin config table plus typed validation layer

Recommendation:

- use structured tables for core policy values
- use JSON only for optional advanced enterprise overrides

## 3.9 Enterprise Limits

### Client requirement

Enterprise should use configurable large limits, not true infinity.

### Current status

Not explicitly modeled.

### Required changes

- add per-tier override support
- set enterprise caps via config, not hardcoded "unlimited"

## 3.10 Main Marketplace Principle

### Client requirement

The system must keep separate internal pools so marketplace economy remains controllable.

### Current status

Current implementation combines too much at the user-wallet layer and does not model website pool separation deeply enough.

### Required changes

The credit subsystem should be redesigned around:

- **ownership layer**
- **allocation layer**
- **usage layer**
- **policy/config layer**
- **audit layer**

## 4. Recommended Target Data Model

The cleanest future direction is to split the current model into explicit ownership pools.

### 4.1 Website credit wallet

Recommended new table:

- `WebsiteCreditWallet`

Suggested fields:

- `id`
- `websiteId`
- `earnedTaskCredits`
- `allocatedReferralCredits`
- `allocatedPurchasedCredits`
- `activeVisibilityCredits` or separate visibility relation
- `createdAt`
- `updatedAt`

### 4.2 Master user credit wallets

Recommended new tables:

- `UserPurchasedCreditWallet`
- `UserReferralCreditWallet`

These represent account-level but not website-level ownership.

### 4.3 Allocation tables

Recommended:

- `WebsitePurchasedCreditAllocation`
- `WebsiteReferralCreditAllocation`

These tables should record:

- source wallet
- website destination
- allocated amount
- used amount
- transferable remaining amount
- expiry metadata if applicable

### 4.4 Visibility subsystem

Recommended:

- `WebsiteVisibilityWallet`
- `VisibilityTransaction`
- `VisibilityWindow`

### 4.5 Unified ledger

The existing `CreditLog` can be evolved rather than discarded, but it needs richer source metadata.

Recommended additions:

- `websiteId` as first-class required context for website-bound operations
- `creditFamily`
- `creditPoolOwnerType` (`USER`, `WEBSITE`, `SUBSCRIPTION`)
- `sourceAllocationId`
- `transferId`
- `expiresAt`
- `metadata` JSON

## 5. Service-Level Changes Needed

## 5.1 Subscription service

Files impacted:

- [src/modules/subscription/user-subscription/user-subscription.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/subscription/user-subscription/user-subscription.service.ts:1)
- [src/modules/subscription/user-subscription/dto/create-user-subscription.dto.ts](/home/imran/Desktop/backlyst-backend/src/modules/subscription/user-subscription/dto/create-user-subscription.dto.ts:1)

Required changes:

- checkout DTO must include `websiteId`
- active subscription lookup must become website-specific
- subscription creation must validate website ownership and verification
- grant flow must create website-specific subscription credit batches

## 5.2 Credit summary service

Files impacted:

- [src/modules/credit/services/credit.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/services/credit.service.ts:1)

Required changes:

- add website-level summary methods
- stop presenting only user-level total
- support per-website balances:
  - subscription
  - earned
  - allocated referral
  - allocated purchased
  - visibility

## 5.3 Credit task service

Files impacted:

- [src/modules/credit/credit-task/credit-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/credit-task.service.ts:1)
- [src/modules/credit/credit-task/dto/task-credit.dto.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/credit-task/dto/task-credit.dto.ts:1)

Required changes:

- change task credit context from `userId` to `websiteId`
- fetch task requester website and enforce website-bound usage
- spend across four pools in required order
- add purchased/referral pool resolution
- support partial pool breakdown in logs
- support website reward destination for earned credits

## 5.4 Task requester service

Files impacted:

- [src/modules/task/task-requester/task-requester.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/task-requester/task-requester.service.ts:1)

Required changes:

- re-enable verified website enforcement
- optionally enforce "website must have enough credit to create task"
- decide the exact lifecycle moment when reserve/deduct happens
- persist a settlement snapshot if task cost can change later

Important note:

The current code comment shows verified-website enforcement is disabled:

- `// verificationStatus: 'VERIFIED'`

That must be corrected for the client's model.

## 5.5 Provider reward flow

Files impacted:

- [src/modules/task/provider-task/provider-task.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/task/provider-task/provider-task.service.ts:1)

Required changes:

- provider reward must credit the earning website, not just the user account
- task/provider context needs to know which website earned the marketplace contribution

## 5.6 Referral service

Files impacted:

- [src/modules/credit/services/referrer.service.ts](/home/imran/Desktop/backlyst-backend/src/modules/credit/services/referrer.service.ts:1)

Required changes:

- keep progress reporting
- add actual referral-credit issuance
- add referral allocation to verified websites
- add referral transfer history

## 5.7 Admin service

Files impacted:

- subscription plan admin module
- task admin module
- likely a new dedicated credit admin module

Required changes:

- add full economy configuration UI/API
- add manual grant/revoke tools per credit family
- add transfer oversight
- add per-website balance inspection

## 6. API Surface Additions Likely Needed

Below is a practical route set for the target architecture.

### Website credit summary

- `GET /credits/websites/:websiteId/summary`
- `GET /credits/websites/:websiteId/history`
- `GET /credits/websites/:websiteId/visibility`

### Purchased credits

- `POST /credits/purchased/checkout`
- `GET /credits/purchased/master`
- `POST /credits/purchased/allocate`
- `POST /credits/purchased/reallocate`
- `GET /credits/purchased/transfers`

### Referral credits

- `GET /credits/referral/master`
- `POST /credits/referral/allocate`
- `POST /credits/referral/reallocate`

### Subscription credits

- `POST /subscriptions/checkout`
- request must include `websiteId`
- `GET /subscriptions/websites/:websiteId/active`

### Admin configuration

- `GET /admin/credit-economy/config`
- `PATCH /admin/credit-economy/config`
- `GET /admin/credits/websites/:websiteId`
- `POST /admin/credits/manual-grant`
- `POST /admin/credits/manual-revoke`

## 7. Migration Complexity

This change is medium-to-high complexity because it affects:

- schema ownership model
- spend logic
- subscription flow
- task lifecycle
- admin controls
- analytics and statement semantics

### Main migration risks

- existing user-level earned balances do not naturally map to websites
- current subscriptions are user-level; assigning them to websites requires migration rules
- current logs may not contain enough context to replay exact website allocation history

### Migration options

#### Option A: Hard cutover

- introduce new tables
- stop writing to old user-wallet-only model
- migrate what can be migrated deterministically

Pros:

- clean architecture

Cons:

- more migration effort

#### Option B: Hybrid transition

- keep current tables
- add new website/master allocation tables
- slowly route new operations through the new model

Pros:

- safer rollout

Cons:

- significantly more complexity during transition

Recommendation:

- use a **hybrid transition**, but define a hard deprecation target for old user-level task credit flows

## 8. Recommended Implementation Order

### Phase 1: schema foundation

- add website-aware subscription ownership
- add website wallet tables
- add purchased credit tables
- add referral allocation tables
- add visibility subsystem tables
- add admin config tables

### Phase 2: read models

- implement website-level summary APIs
- implement website-level history APIs
- implement admin inspection APIs

### Phase 3: write paths

- website-specific subscription purchase and batch grant
- purchased credit buy + allocation
- referral issuance + allocation
- earned credit website reward flow
- visibility grant/purchase flow

### Phase 4: task settlement engine

- centralize spend order logic
- enforce:
  1. subscription
  2. earned
  3. referral allocated
  4. purchased allocated

### Phase 5: migration and deprecation

- backfill compatible data
- freeze old routes
- remove ambiguous user-wallet spending flows

## 9. Concrete Conclusion

To implement the client specification, the backend needs these major changes:

1. Convert subscription ownership from user-level to website-level.
2. Introduce a website wallet model for task-credit usage.
3. Introduce a master purchased-credit wallet plus website allocation tables.
4. Introduce a master referral-credit wallet plus website allocation tables.
5. Move earned-credit ownership from user-level to website-level.
6. Build a standalone visibility-credit subsystem.
7. Redesign task spend logic around website context and four-pool usage order.
8. Add admin-configurable marketplace economy policies.
9. Add migration rules for existing user-level balances and subscriptions.
10. Treat this as a credit-domain redesign, not a minor patch.

## 10. Bottom Line for Planning

If the client spec is accepted as the target architecture:

- **schema changes are mandatory**
- **service changes are mandatory**
- **new endpoints are mandatory**
- **existing credit flows will need refactoring**
- **data migration strategy must be planned before implementation starts**

The current codebase provides a useful starting point for:

- task cost metadata
- credit logging
- basic spend/refund/reward patterns
- referral progress tracking

But it does **not yet match** the marketplace-grade wallet separation model the client described.

