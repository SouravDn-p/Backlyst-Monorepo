# Backlyst Task Placement API

This document describes the current task-placement API and related gamification/dashboard endpoints in `D:\Project\backlyst-backend`.

Source of truth:
- `src/modules/task/**`
- `src/modules/provider-dashboard/**`
- `src/modules/credit/referrer/**`
- `prisma/schema/placement.prisma`

It reflects the current codebase, including:
- requester task APIs
- provider task APIs
- admin task APIs
- task timeline/activity model (`TaskFlow`)
- verified placement / weekly contribution / streak data model
- provider dashboard metrics

## Base Response Contract

Successful responses use the shared helper shape:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Errors are raised through NestJS exceptions such as:
- `BadRequestException`
- `ForbiddenException`
- `NotFoundException`
- `UnauthorizedException`

## Authentication

- User endpoints use authenticated JWT context via `@CurrentUser(...)`
- Admin endpoints use `@AdminGuard()`
- Public exception:
  - `POST /task-requester/moz-stats`

## Core Task Domain

### PlacementTask lifecycle

Main lifecycle statuses used by the task module:
- `DRAFT`
- `OPEN`
- `WAITING_FOR_APPLICANTS`
- `ASSIGNED`
- `IN_PROGRESS`
- `SUBMITTED`
- `REVISION_REQUESTED`
- `REJECTED`
- `APPROVED`
- `COMPLETED`
- `CANCELLED`
- `EXPIRED`
- `FROZEN`
- `DISPUTED`

### Submission statuses
- `NOT_SUBMITTED`
- `SUBMITTED`
- `REVISION_REQUESTED`
- `APPROVED`
- `REJECTED`

### Placement types
- `BACKLINK_INSERTION`
- `GUEST_POST`
- `FLEXIBLE`

### Link attributes
- `DOFOLLOW`
- `NOFOLLOW`
- `UGC`
- `SPONSORED`

### Final task type
Used for verified placement settlement:
- `BACKLINK`
- `GUEST_POST`

## Gamification / Reward Data Model

The task module now stores verified placement and activity progress using these models:

### `WebsiteVerifiedPlacement`
One row per verified placement task.

Key rules:
- `taskId` is unique
- "verified placement" currently means:
  - `lifecycleStatus = COMPLETED`
  - `submissionStatus = APPROVED`
- duplicate approval retry does not create a second verified placement row

Important fields:
- `userId`
- `websiteId`
- `taskId`
- `finalTaskType`
- `status: VERIFIED | REVOKED`
- `verifiedAt`

### `WebsiteWeeklyContribution`
One weekly contribution reward row per website per UTC week.

Key rules:
- unique by `websiteId + weekStartAt`
- first verified placement of the week grants the weekly reward
- later verified placements in the same week only increment `verifiedPlacementCount`

Important fields:
- `triggerTaskId`
- `weekStartAt`
- `weekEndAt`
- `verifiedPlacementCount`
- `rewardCredits`
- `status`

### `WebsiteMilestoneProgress`
Tracks cumulative verified placement counts.

Important fields:
- `totalVerifiedPlacements`
- `lastMilestoneAtCount`
- `lastVerifiedPlacementAt`

### `WebsiteActivityStreak`
Tracks consecutive active weeks per website.

Important fields:
- `currentStreakWeeks`
- `longestStreakWeeks`
- `status: ACTIVE | AT_RISK | BROKEN`
- `streakStartedWeekStart`
- `lastActiveWeekStart`
- `lastActiveWeekEnd`
- `lastVerifiedPlacementAt`

### `TaskFlow`
Structured task activity log used for timeline, dashboard activity, and future gamification.

Important fields:
- `eventType`
- `actorRole`
- `requesterWebsiteId`
- `providerWebsiteId`
- `fromStatus`
- `toStatus`
- `note`
- `metadata`
- `eventKey`

Common event types:
- `TASK_CREATED`
- `TASK_PUBLISHED`
- `PROVIDER_APPLIED`
- `PROVIDER_SELECTED`
- `APPLICATION_REJECTED`
- `WORK_STARTED`
- `WORK_SUBMITTED`
- `WORK_RESUBMITTED`
- `REVISION_REQUESTED`
- `TASK_APPROVED`
- `TASK_COMPLETED`
- `TASK_REJECTED`
- `TASK_CANCELLED`
- `TASK_DISPUTED`
- `DEADLINE_EXTENDED`
- `CANCELLATION_REQUESTED`
- `CANCELLATION_ACCEPTED`
- `CANCELLATION_REJECTED`
- `TASK_FROZEN`
- `ADMIN_STATUS_OVERRIDE`
- `ADMIN_CREDIT_ADJUSTED`
- `ADMIN_ABUSE_PATTERN_FLAGGED`

## Reward Rules Implemented

### Base provider reward
Granted on approved/completed settlement.

Rules:
- `BACKLINK_INSERTION` -> `1` earned task credit
- `GUEST_POST` -> `2` earned task credits
- `FLEXIBLE` resolves through `finalTaskType`

### Weekly contribution reward
Granted once per website per active UTC week.

Rules:
- first verified placement in that week -> `+1` earned task credit
- same-week extra placements do not grant another weekly reward
- same-week extra placements do increment `verifiedPlacementCount`

### Milestone reward
Granted every 10 verified placements.

Rules:
- every verified placement counts as `1`
- every 10th verified placement -> `+1` earned task credit

### Streak
Based on consecutive active weeks, not task count.

Rules:
- first verified placement of a new active week may extend streak
- same-week extra placements do not extend streak again
- daily maintenance marks streaks:
  - `ACTIVE`
  - `AT_RISK`
  - `BROKEN`

## Requester APIs

Base route: `/task-requester`

### `POST /task-requester/moz-stats`
Public endpoint to fetch MOZ metrics by domain or URL.

Request body:
```json
{
  "domain": "example.com"
}
```

Use case:
- pre-check domain metrics before creating a task

### `POST /task-requester`
Create a new task.

Content type:
- `multipart/form-data`

Form fields:
- `data` (required): JSON string matching `CreateTaskDto`
- `files` (optional): up to 5 support files

`CreateTaskDto`:
```json
{
  "requesterWebsiteId": "uuid",
  "projectTitle": "Guest post for fintech campaign",
  "targetUrl": "https://example.com/target",
  "anchorText": "best seo agency",
  "placementGuidelines": "Optional notes",
  "requiredDomainRating": 40,
  "placementType": "GUEST_POST",
  "linkAttribute": "DOFOLLOW",
  "requestedDeadlineDays": 7,
  "walletType": "SUBSCRIPTION"
}
```

Validation:
- `projectTitle`: 3-160 chars
- `targetUrl`: valid URL
- `anchorText`: 2-120 chars
- `placementGuidelines`: max 3000 chars
- `requiredDomainRating`: 0-100
- `requestedDeadlineDays`: `3 | 5 | 7 | 10 | 14 | 21 | 30`
- `walletType`: `SUBSCRIPTION | PURCHASED | REFERRAL | EARNED`

Business notes:
- requester website must exist, belong to requester, and be valid per service rules
- support files are uploaded before persistence
- task is published as part of creation flow
- current create-time credit deduction still happens after task persistence and is not yet fully transactional

Response:
- created `PlacementTask`

### `GET /task-requester/my-tasks`
List requester-owned tasks.

Query params:
- `status?`
- `deadlineStatus? = LATE | ONTIME`
- `page?`
- `limit?`

Response includes:
- paginated task list
- selected provider summary when present
- counts such as application/taskFlow counts where included by service output

### `GET /task-requester/:taskId/applicants`
List applicants for a requester-owned task.

Query params:
- `page?`
- `limit?`

Validation:
- task must exist
- requester must own task

### `PATCH /task-requester/:taskId/select-provider`
Select one application as the winning provider.

Request body:
```json
{
  "applicationId": "uuid"
}
```

Behavior:
- task is atomically assigned inside a transaction
- selected application becomes `SELECTED`
- other `APPLIED` applications become `REJECTED`
- task becomes `ASSIGNED`
- `deliveryDeadline` is set from `requestedDeadlineDays`
- writes `PROVIDER_SELECTED` and `APPLICATION_REJECTED` activity logs

Important safety note:
- this route now uses an atomic `updateMany(... selectedProviderId: null ...)` pattern to avoid double-selection race conditions

### `PATCH /task-requester/:taskId/cancel`
Cancel a task or create a cancellation request.

Request body:
```json
{
  "note": "Optional cancellation reason"
}
```

Behavior:
- if no provider is selected:
  - task is cancelled immediately
- if a provider is selected:
  - requester creates a provider-facing cancellation request
  - task remains active until provider accepts/rejects

Important note:
- immediate cancellation refund is still outside the cancellation transaction in the current implementation

### `PATCH /task-requester/:taskId/review`
Requester reviews a submitted task.

Request body:
```json
{
  "action": "APPROVE",
  "note": "Optional review note"
}
```

Allowed actions:
- `APPROVE`
- `REQUEST_REVISION`
- `REJECT`

Behavior:
- `APPROVE`
  - task becomes `COMPLETED`
  - submission becomes `APPROVED`
  - base provider reward is settled
  - verified placement processing runs
  - weekly/milestone/streak logic may run
- `REQUEST_REVISION`
  - task becomes `REVISION_REQUESTED`
- `REJECT`
  - task becomes `DISPUTED`
  - submission becomes `REJECTED`

Settlement safety:
- approval settlement runs under `completionRewardedAt` lock
- duplicate retry does not double-pay provider reward or weekly reward

### `GET /task-requester/:taskId`
Get full requester view of a task.

Includes:
- requester summary
- selected provider summary
- applications
- task flow timeline records
- deadline extension records
- MOZ analytics history

### `GET /task-requester/:taskId/timeline`
Get requester/admin-visible timeline for a task.

Behavior:
- uses `TaskFlow`
- returns chronological activity list
- includes UI-friendly action mapping in service response

### `PATCH /task-requester/:taskId/deadline`
Update requested deadline days before provider selection.

Request body:
```json
{
  "requestedDeadlineDays": 14
}
```

Allowed values:
- `3 | 5 | 7 | 10 | 14 | 21 | 30`

Behavior:
- only allowed before provider selection
- logs `REQUESTED_DEADLINE_UPDATED`

### `POST /task-requester/:taskId/extend-deadline`
Extend an active provider delivery deadline.

Request body:
```json
{
  "extendDays": 3,
  "reason": "Need more time for publisher response"
}
```

Allowed values:
- `1 | 3 | 5 | 7 | 14`

Behavior:
- extends `deliveryDeadline`
- updates deadline counters
- creates `TaskDeadlineExtension`
- logs `DEADLINE_EXTENDED`

## Provider APIs

Base route: `/provider-task`

### `GET /provider-task/opportunities`
List open opportunities the provider can still apply to.

Query params:
- `placementType? = BACKLINK_INSERTION | GUEST_POST | FLEXIBLE`
- `linkAttribute? = DOFOLLOW | NOFOLLOW | UGC | SPONSORED`
- `status? = OPEN | WAITING_FOR_APPLICANTS`
- `page?`
- `limit?`

Behavior:
- excludes requester's own tasks
- excludes tasks already applied to by this provider
- only returns tasks with no selected provider

### `GET /provider-task/tasks`
Consolidated provider task list endpoint.

Query params:
- `scope? = SELECTED | APPLIED | INVOLVED`
- `lifecycleStatus?`
- `page?`
- `limit?`

Supported `lifecycleStatus` values:
- `ALL`
- `DRAFT`
- `OPEN`
- `WAITING_FOR_APPLICANTS`
- `APPLIED`
- `SELECTED`
- `ASSIGNED`
- `IN_PROGRESS`
- `SUBMITTED`
- `REVISION_REQUESTED`
- `REJECTED`
- `APPROVED`
- `COMPLETED`
- `CANCELLED`
- `EXPIRED`
- `FROZEN`
- `DISPUTED`

### `GET /provider-task/provider/:id`
Get provider-visible task detail.

Access rules:
- provider must be selected provider, or
- provider must have applied to the task

### `POST /provider-task/:id/apply`
Apply to a task.

Request body:
```json
{
  "providerWebsiteId": "uuid",
  "note": "Optional provider note"
}
```

Behavior:
- only one application per provider per task
- provider website must belong to provider and not be deleted
- writes `PROVIDER_APPLIED`
- if task was `OPEN`, it may transition to `WAITING_FOR_APPLICANTS`

### `PATCH /provider-task/:id/start-work`
Mark selected task as in progress.

Behavior:
- selected provider only
- task must be `ASSIGNED`
- writes `WORK_STARTED`

### `PATCH /provider-task/:id/respond-cancel-request`
Respond to requester cancellation request.

Request body:
```json
{
  "action": "ACCEPT",
  "note": "Optional response note"
}
```

Allowed actions:
- `ACCEPT`
- `REJECT`

Behavior:
- `ACCEPT`
  - task becomes `CANCELLED`
  - requester refund is triggered
  - logs `CANCELLATION_ACCEPTED`
- `REJECT`
  - cancellation request is rejected
  - logs `CANCELLATION_REJECTED`

Important note:
- requester refund still occurs outside the cancellation transaction in current code

### `PATCH /provider-task/:id/submit`
Submit work.

Content type:
- `multipart/form-data`

Fields:
- `deliveryMessage` (required)
- `proofUrl?`
- `additionalNotes?`
- `finalTaskType? = BACKLINK | GUEST_POST`
- `files?[]`

Behavior:
- selected provider only
- non-resubmit path requires task lifecycle compatible with submission
- sets final task settlement fields
- sets `submittedAt`
- may set `isLate` / `lateAt`
- writes `WORK_SUBMITTED`

### `PATCH /provider-task/:id/resubmit`
Resubmit work after revision request.

Body is the same as submit.

Behavior:
- allowed only for revision path
- writes `WORK_RESUBMITTED`

### `GET /provider-task/deadline-status`
Get deadline buckets for provider active tasks.

Response includes grouped buckets such as:
- `upcoming`
- `dueToday`
- `overdue`
- `extended`
- `counts`

## Generic Task API

Base route: `/task`

### `GET /task/:id/deadline-history`
Get delivery deadline extension history for requester or selected provider.

Response:
```json
{
  "task": {
    "id": "uuid",
    "requestedDeadlineDays": 7,
    "deliveryDeadline": "2026-06-10T00:00:00.000Z",
    "deadlineExtensionCount": 1,
    "deadlineExtendedDaysTotal": 3,
    "deadlineLastExtendedAt": "2026-06-05T00:00:00.000Z"
  },
  "extensions": []
}
```

## Admin Task APIs

Base route: `/admin-task`

### `GET /admin-task/all`
Admin task listing.

Query params:
- `status?`
- `search?`
- `placementType?`
- `linkAttribute?`
- `deadlineStatus? = LATE | ONTIME`
- `page?`
- `limit?`

### `GET /admin-task/:id`
Get full admin task detail.

Includes:
- requester
- selected provider
- applications
- task flows
- deadline extensions

### `POST /admin-task/:id/action`
Single admin task action endpoint.

Request body:
```json
{
  "action": "FREEZE",
  "reason": "Fraud review pending"
}
```

Supported actions:
- `FREEZE`
- `FORCE_APPROVE`
- `FORCE_REJECT`
- `CREDIT_REFUND`
- `CREDIT_REVERSE`
- `RESOLVE_DISPUTE`
- `FLAG_ABUSE_PATTERN`

Optional fields:
- `amount?` for credit actions
- `disputeResolution? = APPROVE | REJECT | REQUEST_REVISION`

Behavior summary:
- `FREEZE`
  - sets task to `FROZEN`
- `FORCE_APPROVE`
  - completes and approves task through settlement path
  - base reward + verified placement reward path is executed under lock
- `FORCE_REJECT`
  - rejects task
- `CREDIT_REFUND`
  - adjusts task credit numbers administratively
- `CREDIT_REVERSE`
  - reverses task credit numbers administratively
- `RESOLVE_DISPUTE`
  - routes to approve/reject/revision outcome
- `FLAG_ABUSE_PATTERN`
  - freezes task and logs abuse signal

### Internal admin status override behavior
There is service-level support for `adminUpdateTaskStatus(...)`, but settlement states are intentionally blocked.

Do not use generic status override for:
- `COMPLETED`
- `APPROVED`
- `REJECTED`
- `DISPUTED`

Those must go through explicit admin settlement/action flows.

## Provider Dashboard APIs

Base route: `/provider/dashboard`

### `GET /provider/dashboard/summary`
Get provider dashboard summary metrics.

Query params:
- `websiteId?`
- `range? = 7d | 30d | 90d | all`
- `from?` ISO date
- `to?` ISO date

Priority:
- explicit `from`/`to` overrides `range`
- default `range = 30d`

Response shape:
```json
{
  "applications": {
    "totalApplied": 0,
    "selected": 0,
    "rejected": 0,
    "pending": 0,
    "submitted": 0,
    "inProgress": 0,
    "completed": 0
  },
  "tasks": {
    "assigned": 0,
    "inProgress": 0,
    "submitted": 0,
    "revisionRequested": 0,
    "completed": 0,
    "cancelled": 0,
    "disputed": 0,
    "expired": 0,
    "lateTasks": 0
  },
  "performance": {
    "approvalRate": 0,
    "completionRate": 0,
    "revisionRate": 0,
    "disputeRate": 0
  },
  "contribution": {
    "verifiedPlacements": 0,
    "lastVerifiedPlacementAt": null,
    "lastMilestoneAtCount": 0,
    "nextMilestoneAt": 10,
    "placementsUntilNextMilestone": 10,
    "contributionRewardsCount": 0
  },
  "meta": {
    "providerId": "uuid",
    "websiteId": "uuid",
    "range": "30d",
    "from": "2026-05-01T00:00:00.000Z",
    "to": "2026-05-31T23:59:59.999Z"
  }
}
```

Implementation notes:
- `completionRate = completed tasks / selectedTaskCount`
- task date filtering currently uses `assignedAt` for workload range filtering
- richer per-status date filtering is still a future improvement

### `GET /provider/dashboard/activity`
Get provider task activity feed from `TaskFlow`.

Query params:
- `websiteId?`
- `eventType?` any `TaskFlowEventType`
- `page?` default `1`
- `limit?` default `20`, max `100`
- `from?` ISO date
- `to?` ISO date

Response shape:
```json
{
  "data": [
    {
      "id": "uuid",
      "taskId": "uuid",
      "eventType": "WORK_SUBMITTED",
      "actorRole": "PROVIDER",
      "label": "You submitted work",
      "fromStatus": "IN_PROGRESS",
      "toStatus": "SUBMITTED",
      "note": null,
      "metadata": {},
      "createdAt": "2026-06-09T08:00:00.000Z",
      "task": {
        "id": "uuid",
        "projectTitle": "Guest post campaign",
        "placementType": "GUEST_POST",
        "linkAttribute": "DOFOLLOW",
        "lifecycleStatus": "SUBMITTED",
        "submissionStatus": "SUBMITTED"
      },
      "actor": { "id": "uuid", "name": "...", "email": "..." },
      "requester": { "id": "uuid", "name": "...", "email": "..." },
      "provider": { "id": "uuid", "name": "...", "email": "..." }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

## Website Streak API

### `GET /websites/:websiteId/streak`
Get website streak summary.

Access:
- website owner
- or admin

Response shape:
```json
{
  "websiteId": "uuid",
  "currentStreakWeeks": 2,
  "longestStreakWeeks": 4,
  "status": "AT_RISK",
  "lastActiveWeekStart": "2026-06-02T00:00:00.000Z",
  "lastActiveWeekEnd": "2026-06-08T23:59:59.999Z",
  "lastVerifiedPlacementAt": "2026-06-07T12:00:00.000Z",
  "placementsThisWeek": 0,
  "needsActivityThisWeek": true
}
```

## Settlement / Retry Safety Notes

### Approval settlement lock
Requester approval and admin settlement flows use `completionRewardedAt` as the settlement lock.

Protected flows:
- requester `reviewTask(... APPROVE ...)`
- admin `FORCE_APPROVE`
- admin `forceCompleteTask(...)`

### Duplicate reward protection
Duplicate reward on retry is blocked by multiple layers:
- `completionRewardedAt` lock on `PlacementTask`
- provider base reward duplicate check in `CreditLog`
- `WebsiteVerifiedPlacement.taskId` unique constraint
- `WebsiteWeeklyContribution (websiteId, weekStartAt)` unique constraint
- milestone update only after newly created verified placement

### Streak maintenance
Daily streak maintenance runs in batches and updates:
- `ACTIVE`
- `AT_RISK`
- `BROKEN`

## Known Implementation Notes

1. Task creation credit deduction is still not fully transactional with task creation.
2. Cancellation refund still runs after task state transaction in current implementation.
3. Provider dashboard task date range currently filters workload by `assignedAt`.
4. Verified placement revocation is reserved for future work and is not fully implemented yet.
5. Generic admin status override must not be used for settlement states.

## Quick Payload Reference

### Create task
```json
{
  "requesterWebsiteId": "uuid",
  "projectTitle": "Guest post for fintech campaign",
  "targetUrl": "https://example.com/target",
  "anchorText": "best seo agency",
  "placementGuidelines": "Needs contextual placement",
  "requiredDomainRating": 40,
  "placementType": "GUEST_POST",
  "linkAttribute": "DOFOLLOW",
  "requestedDeadlineDays": 7,
  "walletType": "SUBSCRIPTION"
}
```

### Select provider
```json
{
  "applicationId": "uuid"
}
```

### Requester review
```json
{
  "action": "APPROVE",
  "note": "Looks good"
}
```

### Provider apply
```json
{
  "providerWebsiteId": "uuid",
  "note": "I can deliver within 48 hours"
}
```

### Provider submit/resubmit
```json
{
  "deliveryMessage": "Delivered placement with all requested requirements.",
  "proofUrl": "https://drive.google.com/file/d/xxxxx/view",
  "additionalNotes": "Optional note",
  "finalTaskType": "GUEST_POST"
}
```

### Admin action
```json
{
  "action": "FORCE_APPROVE",
  "reason": "Admin manually verified placement"
}
```
