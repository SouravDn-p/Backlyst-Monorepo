# Guide: Withdrawing Validation Restrictions & Embargo (Reverting Commit c484f8d8)

## Overview

In commit `c484f8d8` (`update on algorithm logic`), author `al.mamun3@softvence.com` added a **Stage 4 Re-Validation Block** and **Safe Error Masking** to the task provider selection route (`PATCH /tasks/requester/:taskId/select-provider`).

When a requester selects a provider, if any background governance check fails (cooldowns, domain interaction clustering, pattern monitoring flags, or website status), the selection is rejected with a masked randomized error string:
> `"This match requires a different profile setup."` (Status Code 483 / Forbidden)

This document provides the complete, step-by-step process to **withdraw these restrictions and revert to pre-commit behavior**.

---

## 1. Withdraw Route Restrictions (`selectProvider`)

Before commit `c484f8d8`, selecting an applicant proceeded directly without executing `validationEngine.validateTransition`.

### Targeted File
[`src/modules/task/task-requester/task-requester.service.ts`](file:///Users/betopia/Desktop/projects/tommackay001%20%7C%7C%20FO528F3AACFC7/backlyst-backend/src/modules/task/task-requester/task-requester.service.ts#L688-L707)

### Code Modification

Remove the `validateTransition` block inside `selectProvider`:

```diff
@@ -688,20 +688,0 @@
-      // 2. Validate inside the transaction
-      const validation = await this.validationEngine.validateTransition(
-        {
-          stage: 'ACCEPT',
-          actorUserId: requesterId,
-          providerWebsiteId: application.providerWebsiteId,
-          requesterWebsiteId: task.requesterWebsiteId,
-          taskId: taskId,
-          providerDomain: providerWebsite?.rootDomain ?? undefined,
-          requesterDomain: requesterWebsite?.rootDomain ?? undefined,
-          task: {
-            lifecycleStatus: task.lifecycleStatus,
-            requesterId: task.requesterId,
-            selectedProviderId: task.selectedProviderId,
-          },
-        },
-        tx,
-      );
-      if (validation.decision === 'REJECTED') {
-        throw new ForbiddenException(validation.publicMessage);
-      }
```

---

## 2. Withdraw Safe Message Embargo (Revert Error Masking)

If you also wish to withdraw randomized safe message masking across the algorithm:

### Targeted Files
1. [`src/modules/task/market-algoritm/validation-result.ts`](file:///Users/betopia/Desktop/projects/tommackay001%20%7C%7C%20FO528F3AACFC7/backlyst-backend/src/modules/task/market-algoritm/validation-result.ts)
2. [`src/modules/task/market-algoritm/validation.engine.ts`](file:///Users/betopia/Desktop/projects/tommackay001%20%7C%7C%20FO528F3AACFC7/backlyst-backend/src/modules/task/market-algoritm/validation.engine.ts)

### Option A: Restore Single Deterministic Messages

#### File: `src/modules/task/market-algoritm/validation-result.ts`

```diff
- export const SAFE_MESSAGES = {
-   COOLDOWN: [
-     'This opportunity is currently unavailable.',
-     'This match is temporarily hidden.',
-     'You cannot access this opportunity right now.',
-   ],
-   LIMIT: [
-     'No suitable opportunities are currently available.',
-     'We could not find any matches at this time.',
-     'Please check back later for new opportunities.',
-   ],
-   ELIGIBILITY: [
-     'This opportunity is currently unavailable.',
-     'This match requires a different profile setup.',
-     'Your current profile does not meet the requirements for this task.',
-   ],
-   GENERIC: [
-     'This opportunity is currently unavailable.',
-     'An issue occurred while retrieving this match.',
-     'Please try a different opportunity.',
-   ],
- } as const;
- 
- export function getSafeMessage(category: keyof typeof SAFE_MESSAGES): string {
-   const messages = SAFE_MESSAGES[category];
-   return messages[Math.floor(Math.random() * messages.length)];
- }
+ export const SAFE_MESSAGES = {
+   COOLDOWN: 'This opportunity is currently unavailable.',
+   LIMIT: 'No suitable opportunities are currently available.',
+   ELIGIBILITY: 'This opportunity is currently unavailable.',
+   GENERIC: 'This opportunity is currently unavailable.',
+ } as const;
```

#### File: `src/modules/task/market-algoritm/validation.engine.ts`

```diff
@@ -812,17 +812,17 @@
-    let publicMessage = getSafeMessage('GENERIC');
+    let publicMessage = SAFE_MESSAGES.GENERIC;
     if (failedRules.length === 0) {
       decision =
         restrictions.length > 0 ? 'APPROVED_WITH_RESTRICTIONS' : 'APPROVED';
     } else if (overrideApplied) {
       decision =
         restrictions.length > 0 ? 'APPROVED_WITH_RESTRICTIONS' : 'APPROVED';
     } else {
       decision = 'REJECTED';
       publicMessage =
         failedRules.includes('DOMAIN_COOLDOWN') ||
         failedRules.includes('DAILY_LIMIT') ||
         failedRules.includes('WEEKLY_LIMIT') ||
         failedRules.includes('DOMAIN_VELOCITY_LIMIT') ||
         failedRules.includes('MATCH_SPACING')
-          ? getSafeMessage('COOLDOWN')
-          : getSafeMessage('ELIGIBILITY');
+          ? SAFE_MESSAGES.COOLDOWN
+          : SAFE_MESSAGES.ELIGIBILITY;
     }
```

---

### Option B: Surface Raw Internal Rule Failures

To expose exact underlying failed rule names (e.g. `PROVIDER_WEBSITE_INELIGIBLE`, `SAME_DAY_CLUSTERING`, `PATTERN_RESTRICTION`) instead of safe messages:

#### File: `src/modules/task/market-algoritm/validation.engine.ts`

```diff
@@ -819,11 +819,7 @@
     decision = 'REJECTED';
-    publicMessage =
-      failedRules.includes('DOMAIN_COOLDOWN') ||
-      failedRules.includes('DAILY_LIMIT') ||
-      failedRules.includes('WEEKLY_LIMIT') ||
-      failedRules.includes('DOMAIN_VELOCITY_LIMIT') ||
-      failedRules.includes('MATCH_SPACING')
-        ? getSafeMessage('COOLDOWN')
-        : getSafeMessage('ELIGIBILITY');
+    publicMessage = failedRules.join(', ');
```

---

## 3. Verification Commands

After applying the changes:

```bash
# 1. Verify TypeScript Compilation
pnpm tsc --noEmit

# 2. Run Task Requester Unit Tests
pnpm test src/modules/task/task-requester/task-requester.service.spec.ts

# 3. Run Validation Engine Tests
pnpm test src/modules/task/market-algoritm/validation.engine.spec.ts
```
