# Frontend API Guide: User Notifications

This document is for implementing the user-side notification UI only. It explains which notification routes the frontend should call, what filters are available, how realtime updates work, and which product events create user notifications.

## 1. Access Rules

| Item | Rule |
| --- | --- |
| Audience | `USER` notifications only. |
| Auth | Send `Authorization: Bearer <accessToken>` on every REST request. |
| Guard | Routes use `UserGuard`, so normal logged-in users can access only their own notifications. |
| Base REST path | `/notifications` |
| Realtime WebSocket path | `/notifications?token=<accessToken>` |
| Source of truth | REST list/unread-count endpoints. WebSocket is only realtime fanout. |

## 2. User Notification Routes

| Method | Route | Frontend Use |
| --- | --- | --- |
| `GET` | `/notifications` | Notification drawer/page list with pagination and filters. |
| `GET` | `/notifications/unread-count` | Notification bell badge count. |
| `PATCH` | `/notifications/:id/read` | Mark one notification as read after opening/clicking it. |
| `PATCH` | `/notifications/read-all` | Mark all current user's notifications as read. |
| `GET` | `/notifications/preferences` | Load user notification preference switches. |
| `PATCH` | `/notifications/preferences` | Save user notification preference switches. |
| `PATCH` | `/user/update-notification-preferences` | Legacy user preference update route. Prefer `/notifications/preferences` for new UI. |

## 3. List API

### Route

```http
GET /notifications
```

### Query Parameters

| Query | Type | Example | Meaning |
| --- | --- | --- | --- |
| `page` | number | `1` | Page number. Default `1`. |
| `limit` | number | `20` | Page size. Max `100`. |
| `status` | enum | `UNREAD` | Filter by `UNREAD` or `READ`. |
| `type` | enum | `TASK_APPROVED` | Filter by notification type. |
| `category` | enum | `CREDIT_BALANCE` | Filter by category. |
| `priority` | enum | `NORMAL` | Filter by priority. |
| `entityType` | enum | `TASK` | Filter by related entity type. |
| `dateFrom` | ISO date | `2026-06-01T00:00:00.000Z` | Start date filter. |
| `dateTo` | ISO date | `2026-06-30T23:59:59.999Z` | End date filter. |

### Example Request

```http
GET /notifications?page=1&limit=20&status=UNREAD
Authorization: Bearer <accessToken>
```

### Example Response Shape

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "data": [
      {
        "id": "notification-id",
        "audience": "USER",
        "type": "CREDIT_REWARDED",
        "category": "CREDIT_BALANCE",
        "title": "Task credits added",
        "body": "2 earned task credit(s) were added to your website wallet.",
        "entityType": "CREDIT",
        "entityId": "task-or-credit-entity-id",
        "priority": "NORMAL",
        "data": {
          "amount": 2,
          "websiteId": "website-id",
          "taskId": "task-id",
          "walletType": "EARNED"
        },
        "status": "UNREAD",
        "readAt": null,
        "createdAt": "2026-08-06T08:00:00.000Z"
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
}
```

## 4. Unread Count

### Route

```http
GET /notifications/unread-count
```

### Frontend Use

Call this on app shell load and after login. Also update it from WebSocket event `notification:unread_count`.

### Example Response

```json
{
  "success": true,
  "message": "Unread notification count fetched successfully",
  "data": {
    "count": 5
  }
}
```

## 5. Read Actions

### Mark One As Read

```http
PATCH /notifications/:id/read
```

Use when user opens a notification detail, clicks a notification, or manually marks one item as read.

### Mark All As Read

```http
PATCH /notifications/read-all
```

Use from notification drawer/page "Mark all as read" button.

### Example Mark All Response

```json
{
  "success": true,
  "message": "Notifications marked as read successfully",
  "data": {
    "updatedCount": 12
  }
}
```

## 6. Preferences

### Get Preferences

```http
GET /notifications/preferences
```

### Update Preferences

```http
PATCH /notifications/preferences
Content-Type: application/json
```

### Request Body

```json
{
  "taskStatusUpdates": true,
  "creditBalanceAlerts": true,
  "disputeReviewNotifications": true,
  "systemAnnouncements": false,
  "contactPreferenceTags": ["Notifications", "Payments", "Security"]
}
```

### Preference Meaning

| Field | Controls |
| --- | --- |
| `taskStatusUpdates` | `TASK_STATUS` category notifications. |
| `creditBalanceAlerts` | `CREDIT_BALANCE` category notifications. |
| `disputeReviewNotifications` | `DISPUTE_REVIEW` category notifications. |
| `systemAnnouncements` | `SYSTEM_ANNOUNCEMENT` category notifications. |
| `contactPreferenceTags` | Optional user contact/preference tags for frontend/settings UI. |

Important: categories like `REWARD`, `MARKETPLACE`, `MESSAGE`, and `SECURITY` are not blocked by these four preference booleans in the current service logic.

## 7. Realtime Notifications

### WebSocket Connection

```text
ws://<api-host>/notifications?token=<accessToken>
```

Use the same access token used for REST requests. The gateway validates active users.

### Events

| Event | Payload Use |
| --- | --- |
| `notification:new` | Add/prepend one notification to the drawer/list. |
| `notification:unread_count` | Update bell badge count. |
| `notification:read` | Mark one local notification item as read. |
| `notification:read_all` | Mark local list as read. |

### Example WebSocket Message

```json
{
  "event": "notification:new",
  "data": {
    "id": "notification-id",
    "audience": "USER",
    "type": "TASK_APPROVED",
    "category": "TASK_STATUS",
    "title": "Task approved",
    "body": "Your task has been approved.",
    "entityType": "TASK",
    "entityId": "task-id",
    "priority": "NORMAL",
    "data": {},
    "status": "UNREAD",
    "readAt": null,
    "createdAt": "2026-08-06T08:00:00.000Z"
  }
}
```

## 8. User Notification Categories

| Category | Frontend Group | Typical Source |
| --- | --- | --- |
| `TASK_STATUS` | Tasks | Task created, application received, provider selected, proof submitted, approved/rejected/cancelled/completed, deadline events. |
| `CREDIT_BALANCE` | Credits | Credit deducted, refunded, rewarded, low balance. |
| `DISPUTE_REVIEW` | Disputes | Task disputed or dispute review update. |
| `SYSTEM_ANNOUNCEMENT` | System/Billing | System announcements and subscription/payment status if emitted as system category. |
| `MESSAGE` | Messages | Message received or message report related updates. |
| `REWARD` | Rewards | Reward earned, badge unlocked, milestone reached, streak updated, weekly contribution rewarded. |
| `MARKETPLACE` | Marketplace | New opportunity, low activity reminder, first success, visibility/marketplace events. |
| `SECURITY` | Website/Security | Website verified, rejected, flagged. |

## 9. Important User Notification Types

| Type Group | Types |
| --- | --- |
| Task | `TASK_CREATED`, `TASK_APPLICATION_RECEIVED`, `TASK_PROVIDER_SELECTED`, `TASK_STARTED`, `TASK_PROOF_SUBMITTED`, `TASK_REVISION_REQUESTED`, `TASK_APPROVED`, `TASK_REJECTED`, `TASK_CANCELLED`, `TASK_CANCELLATION_REQUESTED`, `TASK_CANCELLATION_REQUEST_REJECTED`, `TASK_DEADLINE_EXTENSION_REQUESTED`, `TASK_DEADLINE_EXTENSION_APPROVED`, `TASK_DEADLINE_EXTENSION_REJECTED`, `TASK_STATUS_UPDATED`, `TASK_DISPUTED`, `TASK_COMPLETED` |
| Credit | `CREDIT_DEDUCTED`, `CREDIT_REFUNDED`, `CREDIT_REWARDED`, `CREDIT_LOW_BALANCE` |
| Message | `MESSAGE_RECEIVED`, `MESSAGE_REPORTED` |
| Reward | `REWARD_EARNED`, `BADGE_UNLOCKED`, `MILESTONE_REACHED`, `STREAK_UPDATED`, `WEEKLY_CONTRIBUTION_REWARDED` |
| Marketplace | `MARKETPLACE_NEW_OPPORTUNITY`, `MARKETPLACE_LOW_ACTIVITY_REMINDER`, `MARKETPLACE_FIRST_SUCCESS` |
| Website | `WEBSITE_VERIFIED`, `WEBSITE_REJECTED`, `WEBSITE_FLAGGED`, `WEBSITE_VISIBILITY_EXPIRING`, `WEBSITE_VISIBILITY_EXPIRED` |
| System | `SYSTEM_ANNOUNCEMENT` |

## 10. Current User Notification Producers

These are backend flows that can create user notifications.

| Flow | Expected Notification Effect |
| --- | --- |
| Task lifecycle | Task status notifications through task notification service. |
| Credit movement | Deduct, refund, reward, purchase, subscription credit, and visibility credit events can create credit notifications. |
| Website verification | Verified/rejected/reverification and visibility lifecycle events can create user notifications. |
| Referral rewards | Referral joined, website verified stage, first backlink stage, paid subscription stage. |
| Rewards/badges | Badge unlocked, badge activated, milestone reached, weekly contribution, streak updated. |
| Marketplace reminders | Low activity reminders and opportunities. |
| Messaging | Message received/reported where the messaging flow emits notifications. |
| Subscription/payment | Subscription activation, renewal success/failure, cancellation/resume where implemented by subscription service. |

## 11. Frontend Implementation Prompt

Use this prompt for the user notification frontend:

```text
Implement the Backlyst user notification UI using docs/frontend-user-notifications-api-guide.md.
Use GET /notifications/unread-count for the bell count when the app shell loads.
Use GET /notifications?page=1&limit=20 for the notification drawer and support filters by status, type, category, priority, entityType, dateFrom, and dateTo.
Use PATCH /notifications/:id/read when a user opens or clicks a notification.
Use PATCH /notifications/read-all for the Mark all as read button.
Use GET /notifications/preferences and PATCH /notifications/preferences for notification settings.
Connect to ws://<api-host>/notifications?token=<accessToken> for realtime updates.
Handle notification:new, notification:unread_count, notification:read, and notification:read_all socket events.
Route notification clicks based on entityType/entityId: TASK to task detail, WEBSITE to website detail, CREDIT to wallet/statement, MESSAGE to chat, REWARD/BADGE to rewards page, SYSTEM to relevant settings/billing page.
Do not call admin notification routes from user UI.
```

