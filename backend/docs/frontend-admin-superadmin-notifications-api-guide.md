# Frontend API Guide: Admin And Superadmin Notifications

This document is for implementing the admin/superadmin notification UI only. It explains the admin notification routes, send/broadcast behavior, metrics route, realtime behavior, and frontend usage rules.

## 1. Access Rules

| Item | Rule |
| --- | --- |
| Audience | `ADMIN` notifications. |
| Auth | Send `Authorization: Bearer <accessToken>` on every REST request. |
| Guard | Routes use `AdminGuard`. Admin and superadmin login uses `/auth/admin-login`. |
| Base REST path | `/admin/notifications` |
| Metrics path | `/admin/analytics/notifications/metrics` |
| Realtime WebSocket path | `/notifications?token=<accessToken>` |
| Source of truth | REST list/unread-count endpoints. WebSocket is realtime fanout only. |

Important current backend behavior: `sendAdminNotification()` currently finds active users with role `ADMIN`. A superadmin can call the route, but broadcast recipients are normal admins only unless backend recipient logic is changed to include `SUPER_ADMIN`.

## 2. Admin/Superadmin Notification Routes

| Method | Route | Frontend Use |
| --- | --- | --- |
| `GET` | `/admin/notifications` | Admin notification drawer/page list. |
| `GET` | `/admin/notifications/unread-count` | Admin notification bell badge count. |
| `PATCH` | `/admin/notifications/:id/read` | Mark one admin notification as read. |
| `PATCH` | `/admin/notifications/read-all` | Mark all current admin notifications as read. |
| `POST` | `/admin/notifications/send` | Send an admin-wide notification to active admins. |
| `POST` | `/admin/notifications/broadcast` | Broadcast an admin-wide notification to active admins. |
| `GET` | `/admin/analytics/notifications/metrics` | Delivery metrics for notification monitoring. |

## 3. List API

### Route

```http
GET /admin/notifications
```

### Query Parameters

| Query | Type | Example | Meaning |
| --- | --- | --- | --- |
| `page` | number | `1` | Page number. Default `1`. |
| `limit` | number | `20` | Page size. Max `100`. |
| `status` | enum | `UNREAD` | Filter by `UNREAD` or `READ`. |
| `type` | enum | `ADMIN_DISPUTE_OPENED` | Filter by notification type. |
| `category` | enum | `ADMIN_GOVERNANCE` | Filter by category. |
| `priority` | enum | `HIGH` | Filter by priority. |
| `entityType` | enum | `AUDIT` | Filter by related entity type. |
| `dateFrom` | ISO date | `2026-06-01T00:00:00.000Z` | Start date filter. |
| `dateTo` | ISO date | `2026-06-30T23:59:59.999Z` | End date filter. |

### Example Request

```http
GET /admin/notifications?page=1&limit=20&category=ADMIN_RISK&status=UNREAD
Authorization: Bearer <adminAccessToken>
```

### Example Response Shape

```json
{
  "success": true,
  "message": "Admin notifications fetched successfully",
  "data": {
    "data": [
      {
        "id": "notification-id",
        "audience": "ADMIN",
        "type": "ADMIN_MARKETPLACE_RISK_FLAGGED",
        "category": "ADMIN_RISK",
        "title": "Marketplace risk flagged",
        "body": "A marketplace pattern requires admin review.",
        "entityType": "MARKETPLACE",
        "entityId": "risk-or-pattern-id",
        "priority": "HIGH",
        "data": {
          "reason": "Suspicious reciprocal pattern"
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
GET /admin/notifications/unread-count
```

### Frontend Use

Call this on admin shell load and after admin login. Also update it from WebSocket event `notification:unread_count`.

### Example Response

```json
{
  "success": true,
  "message": "Admin unread notification count fetched successfully",
  "data": {
    "count": 3
  }
}
```

## 5. Read Actions

### Mark One As Read

```http
PATCH /admin/notifications/:id/read
```

Use when admin opens a notification or navigates from it.

### Mark All As Read

```http
PATCH /admin/notifications/read-all
```

Use from admin notification drawer/page "Mark all as read" button.

## 6. Send/Broadcast Admin Notifications

### Routes

```http
POST /admin/notifications/send
POST /admin/notifications/broadcast
```

Both routes currently call the same service method and create notifications for active admins.

### Allowed Categories

The backend rejects send/broadcast if `category` is not one of these:

| Allowed Category | Recommended UI Use |
| --- | --- |
| `ADMIN_LEDGER` | Credit ledger, wallet, financial/admin credit alerts. |
| `ADMIN_GOVERNANCE` | Disputes, reported messages, flagged websites, moderation. |
| `ADMIN_RISK` | Marketplace risk, liquidity, pattern abuse, supply/demand imbalance. |
| `ADMIN_SYSTEM` | System health, audit, operational notices. |
| `DISPUTE_REVIEW` | Dispute review notifications. |

### Request Body

```json
{
  "type": "ADMIN_CREDIT_LEDGER_ALERT",
  "category": "ADMIN_LEDGER",
  "title": "Credit ledger alert",
  "body": "A manual credit adjustment was recorded.",
  "data": {
    "websiteId": "website-id",
    "amount": 10
  },
  "actorId": "admin-user-id",
  "entityType": "LEDGER",
  "entityId": "ledger-or-adjustment-id",
  "priority": "HIGH",
  "idempotencyKey": "admin-credit-alert-adjustment-id"
}
```

### Frontend Rules

| Rule | Why |
| --- | --- |
| Always send `category`. | Service requires an admin category. |
| Use stable `idempotencyKey` for repeated actions. | Prevents duplicate notification rows for the same event. |
| Use `priority=HIGH` or `URGENT` only for operationally important alerts. | Keeps admin notification center meaningful. |
| Do not expose broadcast to every admin if product wants only superadmin to broadcast. | Current backend only uses `AdminGuard`; section permission checks are not visible on this controller. |

## 7. Notification Metrics

### Route

```http
GET /admin/analytics/notifications/metrics
```

### Frontend Use

Use this in admin analytics/system monitoring UI. This returns in-memory delivery metrics for notification send/delivery/failure behavior.

### Example Response Shape

```json
{
  "success": true,
  "message": "Notification metrics retrieved.",
  "data": {
    "last24Hours": {
      "totalSent": 20,
      "totalDelivered": 18,
      "totalFailed": 2,
      "avgLatencyMs": 42,
      "failureRate": 0.1,
      "byType": {
        "ADMIN_DISPUTE_OPENED": 5
      },
      "byChannel": {
        "IN_APP": 20
      }
    },
    "last7Days": {},
    "last30Days": {}
  }
}
```

Important: current metrics are in-memory. They are useful for runtime monitoring, but they are not permanent historical analytics after process restart.

## 8. Realtime Notifications

### WebSocket Connection

```text
ws://<api-host>/notifications?token=<adminAccessToken>
```

The gateway emits realtime events by logged-in user id. Admin notifications use the same socket path as user notifications, but the notification payload has `audience: "ADMIN"`.

### Events

| Event | Payload Use |
| --- | --- |
| `notification:new` | Add/prepend one admin notification to drawer/list. |
| `notification:unread_count` | Update admin bell badge count. |
| `notification:read` | Mark one local notification item as read. |
| `notification:read_all` | Mark local admin notification list as read. |

## 9. Admin Notification Categories

| Category | Frontend Group |
| --- | --- |
| `ADMIN_LEDGER` | Credits, payments, ledger, wallet governance. |
| `ADMIN_GOVERNANCE` | Moderation, disputes, reports, flagged websites. |
| `ADMIN_RISK` | Marketplace risk, pattern abuse, liquidity imbalance. |
| `ADMIN_SYSTEM` | System health, audit, platform operations. |
| `DISPUTE_REVIEW` | Dispute review queue. |

## 10. Admin Notification Types

| Type Group | Types |
| --- | --- |
| Ledger | `ADMIN_CREDIT_LEDGER_ALERT` |
| Dispute | `ADMIN_DISPUTE_OPENED`, `ADMIN_DISPUTE_ESCALATED` |
| Messaging | `ADMIN_MESSAGE_REPORTED`, `ADMIN_MESSAGE_RESTRICTED` |
| Website | `ADMIN_WEBSITE_FLAGGED` |
| Task/Risk | `ADMIN_TASK_RISK_FLAGGED`, `ADMIN_MARKETPLACE_RISK_FLAGGED` |
| Marketplace | `ADMIN_LOW_LIQUIDITY_ALERT`, `ADMIN_SUPPLY_DEMAND_IMBALANCE` |
| System/Audit | `ADMIN_SYSTEM_HEALTH_ALERT`, `ADMIN_AUDIT_EVENT` |

## 11. Current Admin Notification Producers

These backend flows can create admin notifications.

| Flow | Expected Admin Notification Effect |
| --- | --- |
| Contact/enquiry | Admin notification for new contact/enquiry where service emits it. |
| Disputes | Admin notification when a dispute is opened/escalated. |
| Marketplace liquidity | Low liquidity and supply/demand imbalance alerts. |
| Pattern monitoring | Marketplace risk flagged alerts. |
| Manual match queue | Low liquidity/manual match queue alerts. |
| Admin manual send/broadcast | Admin-created operational notification. |
| Notification delivery | Metrics are recorded for send/delivered/failed events. |

## 12. Admin Vs Superadmin UI Guidance

| User Type | Suggested Frontend Behavior |
| --- | --- |
| Superadmin | Show notification drawer, metrics page, and send/broadcast UI if product wants superadmin to control operational messages. |
| Admin | Show notification drawer and unread count. Show send/broadcast only if the admin has the matching product permission in your admin permission UI. |

Backend caveat: the notification controller currently uses `AdminGuard`, not a visible section-specific permission decorator in this controller. If the product requires only superadmin to broadcast, add a backend permission/superadmin guard before exposing the UI.

## 13. Frontend Implementation Prompt

Use this prompt for the admin/superadmin notification frontend:

```text
Implement the Backlyst admin/superadmin notification UI using docs/frontend-admin-superadmin-notifications-api-guide.md.
Use GET /admin/notifications/unread-count for the admin bell count when the admin shell loads.
Use GET /admin/notifications?page=1&limit=20 for the notification drawer/page and support filters by status, type, category, priority, entityType, dateFrom, and dateTo.
Use PATCH /admin/notifications/:id/read when an admin opens or clicks a notification.
Use PATCH /admin/notifications/read-all for the Mark all as read action.
Use POST /admin/notifications/send or POST /admin/notifications/broadcast only for authorized admin/superadmin screens.
Send only allowed admin categories: ADMIN_LEDGER, ADMIN_GOVERNANCE, ADMIN_RISK, ADMIN_SYSTEM, or DISPUTE_REVIEW.
Use GET /admin/analytics/notifications/metrics for notification delivery monitoring.
Connect to ws://<api-host>/notifications?token=<adminAccessToken> for realtime updates.
Handle notification:new, notification:unread_count, notification:read, and notification:read_all socket events.
Route notification clicks based on entityType/entityId: LEDGER to credit governance, AUDIT to audit logs, TASK to task detail, WEBSITE to website profile, REPORT/MESSAGE to moderation, MARKETPLACE to marketplace monitoring, SYSTEM to system settings.
Do not call user /notifications routes from admin UI.
```

