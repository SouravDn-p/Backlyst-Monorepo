# Credit System Guide For Task And Website Developers

This document explains how the current credit system works from the task and website side. It is written for developers working in `src/modules/task` and `src/modules/website` who need to know when and how to call the credit functions.

## 1. Core Idea

Backlyst has two wallet levels:

| Wallet | Model | Meaning |
| --- | --- | --- |
| Master/user wallet | `UserCreditWallet` | Account-level wallet. Purchased, referral, subscription, and visibility credits arrive here first. |
| Website wallet | `WebsiteCreditWallet` | Marketplace wallet for one website. Task create/deduct/refund/reward works from here. |

For task flow, the important rule is:

```text
Task credit spend/refund/reward happens on WebsiteCreditWallet.
UserCreditWallet is mainly the master holding wallet before allocation.
CreditLog is the statement/audit record.
```

## 2. Credit Types

Task developers will mostly work with these wallet types:

| DTO value | Website wallet field | Meaning |
| --- | --- | --- |
| `SUBSCRIPTION` | `subscriptionTaskCredits` | Credits from active subscription allocation. |
| `PURCHASED` | `allocatedPurchasedCredits` | Credits bought by user, then allocated to website. |
| `REFERRAL` | `allocatedReferralCredits` | Referral task credits, then allocated to website. |
| `EARNED` | `earnedTaskCredits` | Credits earned by website after completing provider work. |

Visibility credits are separate. They are not used for task create cost.

## 3. Main Credit Files

| File | Purpose |
| --- | --- |
| `src/modules/credit/credit.service.ts` | Main wallet overview, buy, allocate, statement, Stripe checkout/webhook logic. |
| `src/modules/credit/credit-task/credit-task.service.ts` | Task-specific credit spend, refund, provider reward, rejected/failed reconciliation. |
| `src/modules/credit/credit-task/dto/task-credit.dto.ts` | DTOs used by task credit methods and routes. |
| `src/modules/credit/purchased-credit/*` | Purchased task credit buy/allocate routes. |
| `src/modules/credit/subscription-credit/*` | Subscription credit allocation routes. |
| `src/modules/credit/referrer/*` | Referral progress/reward/allocation logic. |
| `src/modules/credit/visibility-credit/*` | Visibility buy/allocate/maintenance logic. |
| `prisma/schema/credit.prisma` | Wallet, log, referral, adjustment models. |

## 4. Task Credit Public Routes

These routes exist mainly as business operation endpoints and Swagger/testing helpers. In normal task flow, task services usually call the service functions directly.

| Route | Service function | Purpose |
| --- | --- | --- |
| `POST /credits/tasks/deduct` | `CreditTaskService.deductTaskCredit()` | Deduct/reserve requester website credits when a task is created. |
| `POST /credits/tasks/refund` | `CreditTaskService.refundTaskCredit()` | Return reserved task credits back to requester website wallet. |
| `POST /credits/tasks/reward-provider` | `CreditTaskService.rewardProviderCredit()` | Add earned credits to selected provider website after approved completion. |

## 5. Before A Task Can Spend Credits

The user must already have credits in the website wallet.

Typical flow:

1. User buys or receives master credits.
2. User allocates credits from master wallet to a website wallet.
3. Task create spends from that website wallet.

Allocation routes:

| Route | Purpose |
| --- | --- |
| `POST /credits/subscription/allocate` | Move subscription task credits from master wallet to website wallet. |
| `POST /credits/purchased/allocate` | Move purchased task credits from master wallet to website wallet. |
| `POST /credits/referral/allocate` | Move referral task credits from master wallet to website wallet. |

Earned credits are different:

```text
Earned task credits are website-bound.
They are added directly to the provider website wallet after task completion.
```

## 6. Task Create Flow

Main caller:

```text
src/modules/task/task-requester/task-requester.service.ts
```

Current integration point:

```ts
await this.creditTaskService.deductTaskCredit(requesterId, {
  taskId: createdTask.id,
  requesterWebsiteId: payload.requesterWebsiteId,
  userId: requesterId,
  creditAmount: reservedCreditAmount,
  walletType: payload.walletType,
  note: `Requester spent ${reservedCreditAmount} task credit(s) for this task.`,
});
```

Function:

```text
CreditTaskService.deductTaskCredit(actorUserId, body)
```

What it does step by step:

1. Validates `creditAmount` is positive.
2. Requires `walletType`.
3. Loads task by `taskId`.
4. Confirms the actor is the requester or admin.
5. Confirms `requesterWebsiteId` matches the task requester website.
6. Opens a Prisma transaction.
7. Gets requester user master wallet for log relation.
8. Gets requester website wallet.
9. Resolves the wallet field from `walletType`.
10. Checks the website wallet has enough balance.
11. Decrements the selected website wallet field.
12. Creates a `CreditLog` with `action: SPEND` and `reason: TASK_POST`.
13. Returns deducted amount and source.

Important:

```text
Task create must pass the same walletType that should later be used for refund.
The task should persist walletType/reservedCreditAmount so cancel/reject/failure can refund the same bucket.
```

## 7. Task Cancel Flow

Main callers:

| File | When |
| --- | --- |
| `src/modules/task/task-requester/task-requester.service.ts` | Requester cancels task. |
| `src/modules/task/provider-task/provider-task.service.ts` | Provider accepts cancellation request. |

Function:

```text
CreditTaskService.refundTaskCredit(actorUserId, body)
```

What it does step by step:

1. Validates `creditAmount` is positive.
2. Requires `walletType`.
3. Loads task by `taskId`.
4. Confirms the actor is the requester or admin.
5. Confirms `requesterWebsiteId` matches the task requester website.
6. Opens a Prisma transaction.
7. Gets requester master wallet for log relation.
8. Gets requester website wallet.
9. Resolves the website wallet field from `walletType`.
10. Increments that website wallet field.
11. Creates a `CreditLog` with `action: REFUND`.
12. Returns refunded amount and destination wallet type.

Expected refund rule:

```text
Refund must go back to the same website wallet bucket that was used during deduct.
Example: deducted from PURCHASED means refund to allocatedPurchasedCredits.
```

## 8. Task Completion Flow

Main caller:

```text
src/modules/task/task-requester/task-requester.service.ts
```

When requester approves submitted work and task becomes `COMPLETED`, it calls:

```ts
await this.creditTaskService.rewardProviderCredit(
  requesterId,
  {
    taskId: task.id,
    providerId: task.selectedProviderId,
    providerWebsiteId: nextTask.assignedProviderWebsiteId,
    creditAmount: nextTask.providerRewardCredits ?? task.creditCost,
    note: 'Provider earned task credit after successful completion.',
  },
  tx,
);
```

Function:

```text
CreditTaskService.rewardProviderCredit(actorUserId, body, tx?)
```

What it does step by step:

1. Validates reward amount is positive.
2. Loads task context.
3. Resolves final selected provider user.
4. Allows requester, selected provider, or admin actor.
5. Confirms `providerWebsiteId` belongs to the selected provider user.
6. Checks duplicate reward for same task/provider/website.
7. Calls `addEarnedTaskCredit()`.
8. Adds credits into provider website `earnedTaskCredits`.
9. Creates `CreditLog` with `action: REWARD` and `reason: TASK_COMPLETION`.

Important:

```text
Provider reward goes to provider website wallet, not provider master wallet.
The task flow must store assignedProviderWebsiteId reliably before completion.
```

## 9. Rejected And Failed Task Reconciliation

Special helper functions:

| Function | Purpose |
| --- | --- |
| `CreditTaskService.handleRejectedTaskCredit()` | Refund requester after rejected submission when not disputed. |
| `CreditTaskService.handleFailedTaskCredit()` | Refund requester after terminal failed/expired task. |

Current callers:

| File | Function used |
| --- | --- |
| `src/modules/task/task-requester/task-requester.service.ts` | `handleRejectedTaskCredit()` |
| `src/modules/task/marketplace-maintenance/task-expiration.service.ts` | `handleFailedTaskCredit()` |

Important implementation note:

```text
These helpers are intended to be idempotent wrappers around refundTaskCredit().
They should prevent duplicate refunds for the same task outcome.
```

Known caution:

```text
Current refundTaskCredit() writes refund logs with reason TASK_POST.
The rejected/failed helpers check for REJECTED_TASK / FAILED_TASK.
That mismatch should be fixed before relying on replay safety.
```

## 10. Dispute Flow

Main caller:

```text
src/modules/task/dispute/dispute.service.ts
```

Dispute resolution can do either:

| Adjustment | Function |
| --- | --- |
| Refund requester | `CreditTaskService.refundTaskCredit()` |
| Reward provider | `CreditTaskService.rewardProviderCredit()` |

Admin can trigger dispute credit movement. This is valid because `rewardProviderCredit()` supports admin actor access.

## 11. Wallet Type Resolution

`CreditTaskService.resolveWebsiteWalletSource()` maps DTO wallet type to website wallet field.

Expected mapping:

| Wallet type | Website wallet field |
| --- | --- |
| `SUBSCRIPTION` | `subscriptionTaskCredits` |
| `PURCHASED` | `allocatedPurchasedCredits` |
| `REFERRAL` | `allocatedReferralCredits` |
| `EARNED` | `earnedTaskCredits` |

Task module should not guess the field name. It should pass `walletType` and let credit service resolve it.

## 12. What Task Developer Must Store On Task

For reliable credit lifecycle, `PlacementTask` should keep:

| Field | Why needed |
| --- | --- |
| `requesterWebsiteId` | Know which website spent credits. |
| `selectedProviderId` | Know final provider user. |
| `assignedProviderWebsiteId` | Know which provider website receives earned credits. |
| `creditCost` | Original task cost. |
| `reservedCreditAmount` | Exact amount reserved/deducted. |
| `walletType` | Exact bucket used during deduction. |
| `completionRewardedAt` | Lock to prevent duplicate completion reward. |

## 13. Recommended Task Lifecycle Integration

Task create:

```text
1. Create task with requesterWebsiteId, creditCost, reservedCreditAmount, walletType.
2. Call CreditTaskService.deductTaskCredit().
3. If deduct fails, rollback/delete the created task or keep task as draft.
```

Task cancel:

```text
1. Mark task cancelled.
2. Resolve walletType from saved task.walletType.
3. Call CreditTaskService.refundTaskCredit().
```

Task approved/completed:

```text
1. Mark submission approved and task completed.
2. Ensure selectedProviderId and assignedProviderWebsiteId are present.
3. Lock reward with completionRewardedAt or equivalent.
4. Call CreditTaskService.rewardProviderCredit().
```

Task rejected:

```text
1. If rejected without dispute, call CreditTaskService.handleRejectedTaskCredit().
2. If disputed, let DisputeService own the final credit adjustment.
```

Task failed/expired:

```text
1. Mark task failed/expired.
2. Call CreditTaskService.handleFailedTaskCredit().
```

## 14. Statement And Debug Routes

Use these routes to verify balances and logs:

| Route | What to check |
| --- | --- |
| `GET /credits/websites/:websiteId/wallet` | Final website wallet balances. |
| `GET /credits/websites/:websiteId/statement` | All credit movement for one website. |
| `GET /credits/statement` | Full user credit statement. |
| `GET /credits/master` | Master wallet balances before allocation. |
| `GET /credits/master/statement` | Master wallet-only movement statement. |
| `GET /credits/me` | Combined user overview. |

## 15. Testing Checklist For Task Developer

Test task create spend:

```text
1. Buy or grant master task credits.
2. Allocate credits to requester website.
3. Create task using walletType.
4. Check /credits/websites/:websiteId/wallet decreased in the matching bucket.
5. Check /credits/websites/:websiteId/statement has SPEND / TASK_POST.
```

Test cancel refund:

```text
1. Create task and deduct credits.
2. Cancel task.
3. Check same website wallet bucket increased.
4. Check statement has REFUND.
5. Retry cancel/refund path and confirm no duplicate refund happens.
```

Test provider reward:

```text
1. Provider applies with a provider website.
2. Requester selects provider.
3. Provider submits.
4. Requester approves/completes task.
5. Check provider website earnedTaskCredits increased.
6. Check provider website statement has REWARD / TASK_COMPLETION.
7. Retry completion path and confirm duplicate reward is blocked.
```

## 16. Current Caution Points

These are current implementation risks the task/website developer should know:

1. `GET /credits/me` currently does not include website allocated purchased/referral credits in combined totals.
2. Purchased/referral logs are stored as `creditType: EARNED_TASK` and rely on note prefixes for logical bucket classification.
3. Rejected/failed refund helpers intend to use `REJECTED_TASK` / `FAILED_TASK`, but `refundTaskCredit()` currently writes `TASK_POST`.
4. Purchased and visibility checkout grants use a note-prefix idempotency check, which should be hardened before heavy production traffic.
5. Task credit service is task-aware, not a generic wallet service. It validates task ownership and provider website ownership.

## 17. Short Summary

For task developers:

```text
Task create    -> deductTaskCredit()
Task cancel    -> refundTaskCredit()
Task reject    -> handleRejectedTaskCredit()
Task failed    -> handleFailedTaskCredit()
Task complete  -> rewardProviderCredit()
```

For website developers:

```text
WebsiteCreditWallet is the spendable task wallet.
Website verification/ownership must be correct before credits are allocated or used.
Provider rewards must always include providerWebsiteId.
```

