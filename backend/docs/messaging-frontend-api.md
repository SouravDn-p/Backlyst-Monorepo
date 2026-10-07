# Messaging Frontend API Guide

This document is the frontend-focused implementation guide for Backlyst messaging.

It covers:
- user messaging APIs
- admin moderation and registry APIs
- WebSocket connection and realtime events
- payloads, enums, and validation rules
- recommended frontend integration sequence

This guide is based on the current backend implementation in:
- `src/modules/messaging/messaging.controller.ts`
- `src/modules/messaging/messaging.service.ts`
- `src/modules/messaging/messaging.gateway.ts`
- `src/modules/messaging/messaging.worker.ts`
- `prisma/schema/message.prisma`

---

## 1. Messaging architecture summary

Current messaging flow is:

1. Frontend sends message by HTTP or WebSocket.
2. Backend validates the sender, recipient, and optional `taskId` context.
3. Message creation is queued through BullMQ.
4. Worker persists the message in the database.
5. Worker publishes a Redis Pub/Sub realtime event.
6. Every app instance receives the Pub/Sub event.
7. Only the instance that owns the connected user socket emits the final WebSocket event.

Important frontend implication:

- `POST /messaging/send` does **not** return the created message.
- It returns a queued/accepted response.
- The actual delivered message should be consumed from WebSocket event `message`.
- If WebSocket is unavailable, frontend should refetch chat history after send.

---

## 2. Base conventions

### 2.1 Base URL

Use your backend base URL, for example:

```text
http://3.7.116.63
```

So a messaging endpoint becomes:

```text
http://3.7.116.63/messaging
```

### 2.2 Auth

All messaging HTTP APIs require Bearer auth unless noted otherwise.

Example:

```http
Authorization: Bearer <JWT>
```

### 2.3 Standard response envelope

Most successful HTTP responses use:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

### 2.4 Primary identifiers

Messaging is now **userId-based**, not email-based.

Frontend should prefer:
- `recipientId`
- `senderId`
- `taskId`

Legacy email fallback still exists in some routes for backward compatibility, but frontend should stop depending on it.

### 2.5 Chat context model

There are two important chat contexts:

1. Direct chat
- based on `senderId + recipientId + taskId = null`
- this is normal 1v1 chat outside a task

2. Task chat
- based on `senderId + recipientId + taskId = specific task id`
- only the requester and the selected provider can use task chat

Frontend must treat direct chat and task chat as separate threads.

---

## 3. Message enums frontend should know

### 3.1 `MessageContextType`

```ts
'DIRECT' | 'TASK' | 'DISPUTE' | 'ADMIN_SUPPORT'
```

Current active frontend-relevant values are mostly:
- `DIRECT`
- `TASK`

### 3.2 `MessageRecordType`

```ts
'MESSAGE' | 'FILE'
```

Rules:
- `FILE` means attachment-only message without text
- `MESSAGE` means normal text message or text + file message

### 3.3 `MessageRegistryStatus`

```ts
'VERIFIED' | 'FLAGGED' | 'RESTRICTED'
```

Meaning:
- `VERIFIED`: normal visible message
- `FLAGGED`: reported or flagged, but still visible
- `RESTRICTED`: content must be hidden for normal users

### 3.4 `MessageReportReason`

```ts
'SPAM'
'ABUSE'
'FAKE_PROOF'
'OFF_PLATFORM_PAYMENT'
'SENSITIVE_INFORMATION'
'THREAT'
'OTHER'
```

### 3.5 `MessageReportStatus`

```ts
'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTION_TAKEN'
```

---

## 4. User messaging APIs

## 4.1 Get conversation list

### Endpoint

```http
GET /messaging
```

### Query params

- `taskId?`: optional string
- `page?`: default `1`
- `limit?`: default `20`
- `search?`: optional string

### What it returns

Returns paginated conversation summaries for the logged-in user.

Each item contains:
- `participant`
- `task` or `null`
- `lastMessage`
- `lastMessageAt`
- `unreadCount` currently always `0`
- `contextType`

### Example request

```http
GET /messaging?page=1&limit=20
Authorization: Bearer <JWT>
```

### Example task-filtered request

```http
GET /messaging?taskId=TASK_UUID&page=1&limit=20
Authorization: Bearer <JWT>
```

### Example response

```json
{
  "success": true,
  "message": "Messages fetched successfully",
  "data": {
    "items": [
      {
        "participant": {
          "id": "user-2",
          "name": "Provider Name",
          "email": "provider@example.com",
          "imageKey": "avatar.png",
          "role": "USER",
          "isVerified": true
        },
        "task": {
          "id": "task-1",
          "projectTitle": "Guest post campaign",
          "lifecycleStatus": "IN_PROGRESS",
          "submissionStatus": "NOT_SUBMITTED"
        },
        "lastMessage": {
          "id": "message-1",
          "senderId": "user-1",
          "recipientId": "user-2",
          "taskId": "task-1",
          "contextType": "TASK",
          "registryStatus": "VERIFIED",
          "text": "Please review the target URL.",
          "document": null,
          "createdAt": "2026-06-22T06:00:00.000Z"
        },
        "lastMessageAt": "2026-06-22T06:00:00.000Z",
        "unreadCount": 0,
        "contextType": "TASK"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

### Frontend notes

- If `taskId` is provided, use this as a task-conversation list filter.
- If `taskId` is omitted, backend currently returns the latest conversation rows across contexts. Frontend should still separate display by `contextType` and `task.id` when needed.
- `search` currently checks message email snapshots, not rich participant profile search.

---

## 4.2 Get one direct or task chat history

### Endpoint

```http
GET /messaging/chat/:recipientId
```

### Path param

- `recipientId`: preferred recipient user id
- legacy email also works temporarily, but frontend should send user id only

### Query params

- `taskId?`: optional task chat context
- `cursor?`: optional previous message id for older history
- `limit?`: default `30`, max `100`

### Direct chat request

```http
GET /messaging/chat/RECIPIENT_USER_ID?limit=30
Authorization: Bearer <JWT>
```

### Task chat request

```http
GET /messaging/chat/RECIPIENT_USER_ID?taskId=TASK_UUID&limit=30
Authorization: Bearer <JWT>
```

### Older page request

```http
GET /messaging/chat/RECIPIENT_USER_ID?taskId=TASK_UUID&cursor=MESSAGE_UUID&limit=30
Authorization: Bearer <JWT>
```

### Response shape

```json
{
  "success": true,
  "message": "1v1 messages fetched successfully",
  "data": {
    "data": [
      {
        "id": "message-1",
        "senderId": "user-1",
        "recipientId": "user-2",
        "senderEmailSnapshot": "sender@example.com",
        "recipientEmailSnapshot": "recipient@example.com",
        "text": "Hello",
        "document": null,
        "taskId": null,
        "contextType": "DIRECT",
        "recordType": "MESSAGE",
        "registryStatus": "VERIFIED",
        "isDeleted": false,
        "createdAt": "2026-06-22T06:00:00.000Z",
        "Sender": {
          "id": "user-1",
          "name": "Sender",
          "email": "sender@example.com",
          "imageKey": null,
          "role": "USER",
          "isVerified": true
        },
        "Receiver": {
          "id": "user-2",
          "name": "Receiver",
          "email": "receiver@example.com",
          "imageKey": null,
          "role": "USER",
          "isVerified": true
        }
      }
    ],
    "meta": {
      "limit": 30,
      "nextCursor": "message-last-id-on-this-page",
      "hasMore": true
    }
  }
}
```

### Pagination behavior

- backend fetches newest messages internally
- backend reverses the page before returning
- frontend receives the page in ascending timeline order
- `nextCursor` should be used to fetch older messages

### Cursor rule

The cursor message must belong to the same:
- user pair
- `taskId` context

Otherwise backend returns `400`.

### Frontend notes

- For infinite scroll, prepend older pages above the current list.
- Do not use one task thread state for another task thread.
- A direct chat and a task chat between the same two users are different threads.

---

## 4.3 Send message via HTTP

### Endpoint

```http
POST /messaging/send
```

### Content type

```http
multipart/form-data
```

### Supported body fields

You can send either:

1. direct multipart fields
2. a `data` field containing JSON string

Preferred payload fields:

```ts
{
  recipientId: string;
  text?: string;
  content?: string;
  taskId?: string;
}
```

Optional multipart file:
- `file`

Legacy fallback fields still supported temporarily:
- `receiver`
- `recipientEmail`

### Example multipart JSON payload

`data` field:

```json
{
  "recipientId": "9cf997b3-f495-4efe-a353-d7c1563dae65",
  "text": "Hello from HTTP",
  "taskId": "b8e9d1df-6baf-4d74-b5d0-5b2b3d70a100"
}
```

### Validation rules

- `recipientId` should be a valid UUID when used
- `taskId` should be a valid UUID when used
- `text` max length is `5000`
- at least one of text or file must exist
- sender cannot equal recipient
- if `taskId` exists:
  - task must exist
  - task must already have selected provider
  - only requester and selected provider may chat in that task

### Response behavior

This endpoint queues the message job. It does **not** return the final created message row.

### Example response

```json
{
  "success": true,
  "message": "Message queued successfully",
  "data": {
    "jobId": "123",
    "senderId": "sender-user-id",
    "senderEmail": "sender@example.com",
    "recipientId": "recipient-user-id",
    "recipientEmail": "recipient@example.com",
    "taskId": "task-id-or-null"
  }
}
```

### Frontend handling recommendation

After HTTP send:

1. optimistically show pending state if you want
2. wait for WebSocket `message` event for final delivered message
3. if no socket, refetch `GET /messaging/chat/:recipientId`

---

## 4.4 Send message via WebSocket

### Client outbound event

```json
{
  "event": "message",
  "data": {
    "recipientId": "RECIPIENT_USER_ID",
    "text": "Hello over websocket",
    "taskId": "TASK_UUID"
  }
}
```

Supported payload fields:

```ts
{
  recipientId?: string;
  recipientEmail?: string;
  text?: string;
  document?: string;
  taskId?: string;
}
```

Important:
- frontend should send `recipientId`
- backend does not trust sender from payload
- sender is always taken from authenticated socket user
- gateway only enqueues the message job
- final delivered message still arrives through realtime `message` event after persistence

### Error event from socket send failure

If enqueue or validation fails:

```json
{
  "event": "message:error",
  "data": {
    "message": "Receiver not found"
  }
}
```

Frontend should surface this in UI and revert optimistic pending state if used.

---

## 4.5 Delete message

### Endpoint

```http
DELETE /messaging/delete/:messageId
```

### Rules

- sender only
- soft delete only
- backend clears text/document and sets delete flags
- if S3 attachment exists, backend attempts S3 deletion too

### Example request

```http
DELETE /messaging/delete/MESSAGE_UUID
Authorization: Bearer <JWT>
```

### Example response

```json
{
  "success": true,
  "message": "Message deleted successfully",
  "data": {
    "id": "message-id",
    "senderId": "sender-id",
    "recipientId": "recipient-id",
    "taskId": "task-id-or-null",
    "isDeleted": true,
    "deletedAt": "2026-06-22T06:10:00.000Z",
    "text": null,
    "document": null
  }
}
```

### Realtime follow-up

Participants also receive:

```json
{
  "event": "message:deleted",
  "data": {
    "messageId": "message-id",
    "taskId": "task-id-or-null"
  }
}
```

### Frontend recommendation

When `message:deleted` arrives:
- find message by `messageId`
- remove it from list or mark it deleted based on your UX
- if you later refetch the thread, deleted rows are excluded from normal user chat history fetches

---

## 4.6 Report message

### Endpoint

```http
POST /messaging/messages/:messageId/report
```

### Body

```json
{
  "reason": "OFF_PLATFORM_PAYMENT",
  "note": "User asked to continue on Telegram."
}
```

### Validation

- reporter must be sender or recipient of the message
- deleted messages cannot be reported
- same reporter cannot report the same message twice
- `note` max length `1000`

### Example response

```json
{
  "success": true,
  "message": "Message reported successfully",
  "data": {
    "id": "report-id",
    "messageId": "message-id",
    "reporterId": "user-id",
    "reason": "OFF_PLATFORM_PAYMENT",
    "note": "User asked to continue on Telegram.",
    "status": "PENDING",
    "createdAt": "2026-06-22T06:20:00.000Z",
    "updatedAt": "2026-06-22T06:20:00.000Z"
  }
}
```

### Realtime side effect

If the message was still `VERIFIED`, backend auto-flags it to `FLAGGED`.
Then participants may receive:

```json
{
  "event": "message:registry_updated",
  "data": {
    "messageId": "message-id",
    "taskId": "task-id-or-null",
    "registryStatus": "FLAGGED"
  }
}
```

Possible optional event:

```json
{
  "event": "message:reported",
  "data": {
    "messageId": "message-id",
    "reportId": "report-id",
    "taskId": "task-id-or-null"
  }
}
```

---

## 5. Admin messaging APIs

## 5.1 Admin get chat between two users

### Endpoint

```http
GET /messaging/admin/chat
```

### Query options

Preferred:
- `senderId`
- `receiverId`

Legacy fallback also supported:
- `senderEmail`
- `receiverEmail`

Optional:
- `taskId`

### Example direct admin chat request

```http
GET /messaging/admin/chat?senderId=USER_1&receiverId=USER_2
Authorization: Bearer <ADMIN_JWT>
```

### Example task chat request

```http
GET /messaging/admin/chat?senderId=USER_1&receiverId=USER_2&taskId=TASK_UUID
Authorization: Bearer <ADMIN_JWT>
```

### Response

Returns the full message list in ascending order.
Admin gets the unsanitized message records.

Important:
- admin can still see messages that are `RESTRICTED`
- this endpoint uses full records for moderation/evidence review

---

## 5.2 Admin registry list

### Endpoint

```http
GET /messaging/admin/registry
```

### Query params

- `recordType?`
- `registryStatus?`
- `contextType?`
- `taskId?`
- `senderId?`
- `recipientId?`
- `senderEmail?`
- `recipientEmail?`
- `hasFile?` = `true | false`
- `reportedOnly?` = `true | false`
- `dateFrom?`
- `dateTo?`
- `page?` default `1`
- `limit?` default `20`, max `100`

### Example request

```http
GET /messaging/admin/registry?registryStatus=FLAGGED&reportedOnly=true&page=1&limit=20
Authorization: Bearer <ADMIN_JWT>
```

### Response shape

```json
{
  "success": true,
  "message": "Message registry fetched successfully",
  "data": {
    "items": [
      {
        "id": "message-id",
        "senderId": "user-1",
        "recipientId": "user-2",
        "text": "Suspicious message content",
        "document": null,
        "taskId": "task-id",
        "contextType": "TASK",
        "recordType": "MESSAGE",
        "registryStatus": "FLAGGED",
        "registryReason": "Reported by user",
        "Sender": {
          "id": "user-1",
          "name": "Sender",
          "email": "sender@example.com",
          "role": "USER",
          "isVerified": true
        },
        "Receiver": {
          "id": "user-2",
          "name": "Receiver",
          "email": "receiver@example.com",
          "role": "USER",
          "isVerified": true
        },
        "task": {
          "id": "task-id",
          "projectTitle": "Guest post campaign",
          "lifecycleStatus": "IN_PROGRESS",
          "submissionStatus": "NOT_SUBMITTED"
        },
        "reportCount": 2,
        "latestReport": {
          "id": "report-id",
          "reason": "FAKE_PROOF"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 10,
      "totalPages": 1
    }
  }
}
```

### Admin frontend use

Use this page for:
- moderation queue
- flagged/restricted message review
- evidence access
- filters by task or file presence

---

## 5.3 Admin update registry status

### Endpoint

```http
PATCH /messaging/admin/registry/:id/status
```

### Body

```json
{
  "registryStatus": "RESTRICTED",
  "reason": "Sensitive payment information shared in chat."
}
```

### Validation rules

- `registryStatus` required
- `reason` required when status is:
  - `FLAGGED`
  - `RESTRICTED`

### Response

Returns the updated message.

### Realtime side effect

Participants receive:

```json
{
  "event": "message:registry_updated",
  "data": {
    "messageId": "message-id",
    "taskId": "task-id-or-null",
    "registryStatus": "RESTRICTED"
  }
}
```

### Frontend effect

If current user is a normal user and status becomes `RESTRICTED`:
- hide `text`
- hide `document`
- show a placeholder such as `This message is restricted.`

---

## 5.4 Admin message reports list

### Endpoint

```http
GET /messaging/admin/message-reports
```

### Query params

- `status?`
- `reporterId?`
- `messageId?`
- `reason?`
- `taskId?`
- `dateFrom?`
- `dateTo?`
- `page?`
- `limit?`

### Example request

```http
GET /messaging/admin/message-reports?status=PENDING&page=1&limit=20
Authorization: Bearer <ADMIN_JWT>
```

### Response

Each item includes:
- report details
- reporter summary
- reviewer summary if already reviewed
- message summary
- task summary if linked to task chat

This endpoint is the admin report queue.

---

## 5.5 Admin review message report

### Endpoint

```http
PATCH /messaging/admin/message-reports/:id/review
```

### Body

```json
{
  "status": "ACTION_TAKEN",
  "reviewNote": "Reviewed and escalated to restricted registry status."
}
```

### Allowed status values here

Only use:
- `REVIEWED`
- `DISMISSED`
- `ACTION_TAKEN`

Do not send `PENDING`.

### Example response

```json
{
  "success": true,
  "message": "Message report reviewed successfully",
  "data": {
    "id": "report-id",
    "status": "ACTION_TAKEN",
    "reviewNote": "Reviewed and escalated to restricted registry status.",
    "reviewedAt": "2026-06-22T06:40:00.000Z",
    "reviewedBy": {
      "id": "admin-id",
      "name": "Admin",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "message": {
      "id": "message-id",
      "taskId": "task-id",
      "senderId": "user-1",
      "recipientId": "user-2",
      "contextType": "TASK",
      "registryStatus": "FLAGGED",
      "createdAt": "2026-06-22T06:00:00.000Z"
    }
  }
}
```

---

## 6. WebSocket implementation

## 6.1 Connection URL

Current gateway does **not** use a custom `/messaging` socket path.
It is mounted at the default root WebSocket server.

### Current connection example

If backend is served over plain HTTP:

```text
ws://3.7.116.63/?token=<JWT>
```

If backend is served behind HTTPS domain:

```text
wss://your-domain.com/?token=<JWT>
```

### Required query param

- `token`: JWT access token

### Authentication behavior

If token is missing or invalid, server closes socket.

Possible close reasons:
- `Token missing`
- `Invalid token`
- `User not active`

---

## 6.2 Outbound client event to send a message

Send this from frontend to backend:

```json
{
  "event": "message",
  "data": {
    "recipientId": "RECIPIENT_USER_ID",
    "text": "Hello",
    "taskId": "TASK_UUID"
  }
}
```

Supported fields:

```ts
{
  recipientId?: string;
  recipientEmail?: string;
  text?: string;
  document?: string;
  taskId?: string;
}
```

Frontend should use:
- `recipientId`
- `text`
- optional `taskId`

Do not send sender info.

---

## 6.3 Incoming realtime events to frontend

## `message`

Final persisted message delivery event.

```json
{
  "event": "message",
  "data": {
    "id": "message-id",
    "senderId": "user-1",
    "recipientId": "user-2",
    "text": "Hello",
    "document": null,
    "taskId": null,
    "contextType": "DIRECT",
    "recordType": "MESSAGE",
    "registryStatus": "VERIFIED",
    "createdAt": "2026-06-22T06:00:00.000Z",
    "Sender": {
      "id": "user-1",
      "name": "Sender",
      "email": "sender@example.com"
    },
    "Receiver": {
      "id": "user-2",
      "name": "Receiver",
      "email": "receiver@example.com"
    }
  }
}
```

Frontend action:
- append to current open thread if participant and `taskId` match
- update conversation list preview

## `message:deleted`

```json
{
  "event": "message:deleted",
  "data": {
    "messageId": "message-id",
    "taskId": "task-id-or-null"
  }
}
```

Frontend action:
- remove or mark deleted in active thread
- refresh conversation preview if needed

## `message:registry_updated`

```json
{
  "event": "message:registry_updated",
  "data": {
    "messageId": "message-id",
    "taskId": "task-id-or-null",
    "registryStatus": "RESTRICTED"
  }
}
```

Frontend action:
- find message by id
- if normal user and status is `RESTRICTED`, hide text/document
- optionally badge `FLAGGED` in moderation-oriented UI if needed

## `message:reported`

```json
{
  "event": "message:reported",
  "data": {
    "messageId": "message-id",
    "reportId": "report-id",
    "taskId": "task-id-or-null"
  }
}
```

Current normal-user UI may ignore this if not needed.

## `message:error`

```json
{
  "event": "message:error",
  "data": {
    "message": "Receiver not found"
  }
}
```

Frontend action:
- show toast or inline error
- rollback optimistic pending message if applicable

---

## 7. Sanitization rules normal users must respect

## 7.1 Restricted messages

If backend returns a restricted message for normal user fetch:

```json
{
  "id": "message-id",
  "text": null,
  "document": null,
  "restricted": true,
  "restrictedMessage": "This message is restricted."
}
```

Frontend should render a placeholder.

## 7.2 Deleted messages

In user chat history, deleted messages are generally excluded from fetches.
If a deleted-style payload is encountered, backend shape can look like:

```json
{
  "id": "message-id",
  "deleted": true,
  "deletedMessage": "This message was deleted.",
  "text": null,
  "document": null
}
```

Frontend should not try to render old content.

## 7.3 Admin visibility

Admin registry and admin chat endpoints are moderation endpoints.
Admins can see the full message record for evidence/review.

---

## 8. Recommended frontend implementation sequence

## Phase 1: basic authenticated messaging

Implement first:

1. socket connection with JWT
2. `GET /messaging`
3. `GET /messaging/chat/:recipientId`
4. `POST /messaging/send`
5. consume realtime `message`
6. consume realtime `message:deleted`

## Phase 2: task-aware chat UX

Implement next:

1. when opening task chat, always pass `taskId`
2. keep direct and task threads separate in state
3. use cursor pagination for long chat history
4. show task metadata in conversation header if `task` exists

## Phase 3: moderation and safety UX

Implement next:

1. `POST /messaging/messages/:messageId/report`
2. consume `message:registry_updated`
3. hide restricted content cleanly
4. add sender-only delete action using `DELETE /messaging/delete/:messageId`

## Phase 4: admin moderation UI

Implement next:

1. `GET /messaging/admin/registry`
2. `PATCH /messaging/admin/registry/:id/status`
3. `GET /messaging/admin/message-reports`
4. `PATCH /messaging/admin/message-reports/:id/review`
5. `GET /messaging/admin/chat`

---

## 9. Suggested frontend state model

A clean frontend shape could be:

```ts
type ChatKey = `${recipientId}::${taskId ?? 'direct'}`;
```

Recommended stores:
- `conversationList`
- `activeChatMessagesByKey`
- `chatPaginationMetaByKey`
- `socketConnectionState`
- `messagePendingMap`

When a realtime message arrives:

1. derive its chat key from `senderId`, `recipientId`, and `taskId`
2. append to active chat if open
3. update matching conversation preview
4. avoid duplicates by `message.id`

---

## 10. Common frontend pitfalls to avoid

1. Do not mix direct and task chat in one thread.
2. Do not expect `POST /messaging/send` to return the final message row.
3. Do not rely on email-based receiver fields anymore.
4. Do not assume restricted messages still contain text or document.
5. Do not paginate chat history with page numbers. Use cursor.
6. Do not use one open chat state for different `taskId` contexts.
7. Do not ignore `message:error` on socket sends.

---

## 11. Quick copy-paste payloads

## Send direct message over HTTP

```json
{
  "recipientId": "USER_UUID",
  "text": "Hello"
}
```

## Send task message over HTTP

```json
{
  "recipientId": "USER_UUID",
  "text": "Please check the proof.",
  "taskId": "TASK_UUID"
}
```

## Report message

```json
{
  "reason": "FAKE_PROOF",
  "note": "Attached proof looks manipulated."
}
```

## Admin restrict message

```json
{
  "registryStatus": "RESTRICTED",
  "reason": "Sensitive information shared in chat."
}
```

## Admin review report

```json
{
  "status": "ACTION_TAKEN",
  "reviewNote": "Confirmed violation and escalated moderation action."
}
```

## WebSocket send payload

```json
{
  "event": "message",
  "data": {
    "recipientId": "USER_UUID",
    "text": "Hello from socket",
    "taskId": "TASK_UUID"
  }
}
```

---

## 12. Final frontend checklist

Before shipping frontend messaging, make sure:

- socket auth works with JWT query token
- direct chat fetch works
- task chat fetch works
- send via HTTP or socket works
- message append via realtime works
- delete via realtime works
- restricted placeholder rendering works
- report action works
- admin registry filters work
- admin report review works
- chat cursor pagination works without duplicates
