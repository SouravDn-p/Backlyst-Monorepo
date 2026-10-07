# Messaging System Guide (Module to Service, A-Z)

This document explains the current messaging system implementation in detail so you can safely modify, optimize, and scale it.

Scope covered:
- `src/modules/messaging/messaging.module.ts`
- `src/modules/messaging/messaging.controller.ts`
- `src/modules/messaging/messaging.service.ts`
- `src/modules/messaging/messaging.gateway.ts`
- `src/common/upload-file/aws-s3.service.ts`
- `src/common/upload-file/upload-file.module.ts`
- `prisma/schema/message.prisma`

---

## 1) High-Level Architecture



Current architecture combines
- HTTP API for fetch/send/delete
- WebSocket for real-time delivery
- Prisma/PostgreSQL for message persistence
- AWS S3 for attachment storage

### Request/Realtime flow

1. Client sends message via:
   - `POST /messaging/send` (with optional file), or
   - WebSocket event `message`.
2. Service validates and saves message in DB.
3. Gateway emits real-time event to sender + receiver.
4. On delete (`DELETE /messaging/delete/:messageId`):
   - attachment removed from S3 (if exists),
   - DB message soft-deleted (`isDeleted`, `deletedAt`),
   - `message:deleted` event emitted to both users.

---

## 2) File-by-File Breakdown

## 2.1 Messaging Module

File: `src/modules/messaging/messaging.module.ts`

```ts
@Module({
  imports: [PrismaModule, UploadFileModule, ConfigModule],
  providers: [MessagingGateway, MessagingService, JwtService],
  controllers: [MessagingController],
})
export class MessagingModule {}
```

### What this does
- Wires all messaging components into Nest DI container.
- Imports dependencies:
  - `PrismaModule` for DB access
  - `UploadFileModule` for `AwsS3Service`
  - `ConfigModule` for env config access (used in gateway/S3 service)
- Registers:
  - `MessagingController` (HTTP routes)
  - `MessagingService` (core business logic)
  - `MessagingGateway` (WebSocket)

### Why implemented this way
- Clean separation of concerns.
- Easy to test each class independently.
- Easy to expand with new providers (e.g., notifications, moderation).

---

## 2.2 Messaging Controller

File: `src/modules/messaging/messaging.controller.ts`

Controller role:
- HTTP boundary layer only
- input parsing
- auth/guard boundary
- delegates business rules to service
- delegates live push to gateway

### A) Get messages

```ts
@UserGuard()
@Get()
async getMessages(
  @Req() req: Request & { user: JwtPayload },
  @Query('receiver') receiver?: string,
) {
  return this.messagingService.getMessages(req.user.email, receiver);
}
```

What it does:
- Auth required via `@UserGuard()`.
- Gets logged-in user from `req.user`.
- Optional `receiver` filters to one conversation.
- Returns conversation/history from service.

### B) Backward-compatible legacy route

```ts
@UserGuard()
@Get('/messages-list')
async myselfAllMessagesList(...) {
  return this.messagingService.getMessages(req.user.email, receiver);
}
```

What it does:
- Same behavior as `GET /messaging`.
- Kept for compatibility with older client code.

### B.1) Admin: inspect chat between two users

```ts
@AdminGuard()
@Get('/admin/chat')
async getOneToOneMessagesForAdmin(
  @Query('senderEmail') senderEmail: string,
  @Query('receiverEmail') receiverEmail: string,
) {
  return this.messagingService.getOneToOneMessagesForAdmin(senderEmail, receiverEmail);
}
```

What it does:
- Admin-only endpoint to inspect a direct conversation.
- Requires query params:
  - `senderEmail`
  - `receiverEmail`
- Returns both participants plus ordered message list.

### C) Send message with optional file

```ts
@UserGuard()
@Post('/send')
@UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
async sendMessage(...) {
  const parsedBody = this.parseSendBody(body);
  const sender = req.user.email;
  const receiver = parsedBody.receiver;
  ...
}
```

What it does:
- Accepts multipart form (`file`) + body JSON.
- Parses payload from either direct fields or `body.data` JSON string.
- Uploads file to S3 when present:

```ts
const uploadedFile = await this.awsS3Service.uploadFileToS3(document, 'messaging');
documentUrl = uploadedFile.url;
```

- Calls service for DB create:

```ts
const message = await this.messagingService.sendMessage({
  sender,
  receiver,
  text: parsedBody.text ?? parsedBody.content,
  document: documentUrl,
});
```

- Emits real-time message to both participants:

```ts
this.messagingGateway.emitMessageToParticipants(
  message.senderEmail,
  message.recipientEmail,
  message,
);
```

### D) Delete message

```ts
@UserGuard()
@Delete('/delete/:messageId')
async deleteMessage(...) {
  const result = await this.messagingService.deleteMessage(messageId, req.user.email);
  ...
}
```

What it does:
- Sender-only deletion enforced in service.
- Emits deletion event:

```ts
this.messagingGateway.emitMessageDeleted(
  deletedMessage.senderEmail,
  deletedMessage.recipientEmail,
  deletedMessage.id,
);
```

### E) Payload parser helper

```ts
private parseSendBody(body: SendMessageBody & { data?: string }): SendMessageBody
```

Why it exists:
- Clients often send multipart + JSON as `data` string.
- Keeps parsing logic in one place and throws clear `BadRequestException` for invalid JSON.

---

## 2.3 Messaging Service

File: `src/modules/messaging/messaging.service.ts`

Service role:
- core messaging business logic
- DB access via Prisma
- attachment deletion via S3 service

### Shared relation projection (`messageInclude`)

```ts
const messageInclude = {
  Sender: { select: { id: true, name: true, email: true, image: true, role: true, isVerified: true } },
  Receiver: { select: { id: true, name: true, email: true, image: true, role: true, isVerified: true } },
} as const;
```

What it does:
- Avoids duplicate include/select logic.
- Ensures API returns sender/receiver metadata consistently.

### A) `sendMessage`

```ts
async sendMessage(input: SendMessageInput) {
  const text = input.text?.trim() ?? null;
  const document = input.document ?? null;

  if (!text && !document) {
    throw new BadRequestException('Message text or file is required');
  }

  const message = await this.prisma.message.create({
    data: {
      senderEmail: input.sender,
      recipientEmail: input.receiver,
      text,
      document,
    },
    include: messageInclude,
  });

  return message;
}
```

Why this matters:
- Enforces minimum message validity (no empty messages).
- Maps external names (`sender`/`receiver`) to DB fields (`senderEmail`/`recipientEmail`).

### B) `getMessages`

```ts
async getMessages(sender: string, receiver?: string) {
  const where = receiver
    ? {
        OR: [
          { senderEmail: sender, recipientEmail: receiver },
          { senderEmail: receiver, recipientEmail: sender },
        ],
      }
    : {
        OR: [{ senderEmail: sender }, { recipientEmail: sender }],
      };
  ...
}
```

What it does:
- If `receiver` provided: returns 1:1 thread.
- If not: returns all messages involving sender.
- Ordered ascending by `createdAt` for chat timeline.

### C) `deleteMessage`

```ts
async deleteMessage(messageId: string, sender: string) {
  const existingMessage = await this.prisma.message.findUnique({ where: { id: messageId } });
  ...
  if (existingMessage.senderEmail !== sender) {
    throw new ForbiddenException('Only sender can delete this message');
  }
  ...
}
```

Delete behavior:
1. Verify message exists.
2. Verify logged-in user is original sender.
3. If file exists and message not yet deleted:
   - extract key from URL
   - delete object from S3
4. Soft delete in DB:

```ts
data: {
  isDeleted: true,
  deletedAt: new Date(),
  text: null,
  document: null,
}
```

Why soft delete:
- Maintains timeline integrity and audit trail.
- Supports future restore/moderation features.

---

## 2.4 Messaging Gateway (WebSocket)

File: `src/modules/messaging/messaging.gateway.ts`

Gateway role:
- authenticate socket connection
- keep active connection map
- process incoming real-time message events
- emit message/deletion events

### In-memory maps

```ts
private readonly clientsByEmail = new Map<string, WebSocket>();
private readonly emailByClient = new Map<WebSocket, string>();
```

What they do:
- `clientsByEmail`: find connected socket by user email.
- `emailByClient`: reverse lookup for disconnect and sender identity.

### A) `handleConnection`

Core logic:
- extract `token` from websocket URL query
- verify JWT via `JwtService.verifyAsync`
- fetch user, ensure active and not deleted
- register socket maps

Why:
- Prevent unauthenticated sockets.
- Avoid sending messages to banned/deleted users.

### B) `handleDisconnect`

```ts
const email = this.emailByClient.get(client);
...
this.clientsByEmail.delete(email);
this.emailByClient.delete(client);
```

Why:
- Prevent memory leaks and stale connections.

### C) `onMessage` event

```ts
@SubscribeMessage('message')
async onMessage(@ConnectedSocket() client, @MessageBody() payload) {
  const senderEmail = this.emailByClient.get(client);
  ...
  const message = await this.messagingService.sendMessage({
    sender: senderEmail,
    receiver: payload.recipientEmail,
    text: payload.text,
    document: payload.document,
  });
  ...
}
```

What it does:
- Uses authenticated sender from connection map.
- Persists message through service.
- Emits to sender and receiver instantly.

### D) Emit helpers

```ts
emitToUser(email, event, data)
emitMessageToParticipants(senderEmail, recipientEmail, data)
emitMessageDeleted(senderEmail, recipientEmail, messageId)
```

Why:
- Reusable event dispatch logic.
- One place to enforce socket ready-state checks.

---

## 2.5 AWS S3 Service

File: `src/common/upload-file/aws-s3.service.ts`

Service role:
- centralized S3 integration
- upload/delete helpers
- key extraction helper

### A) Constructor

Reads and validates env:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

Creates SDK client:

```ts
this.s3Client = new S3Client({
  region: this.region,
  credentials: { ... },
});
```

### B) `uploadFileToS3`

What it does:
- validates file buffer
- sanitizes file name
- creates unique key with `Date.now() + randomUUID()`
- uploads with proper `ContentType`
- returns `{ key, url }`

### C) `deleteFileFromS3`

Deletes by object key using `DeleteObjectCommand`.

### D) `extractFileKeyFromUrl`

Parses S3 URL to object key for delete operations.

Why useful:
- DB stores URL, delete API needs object key.

---

## 2.6 Upload Module

File: `src/common/upload-file/upload-file.module.ts`

```ts
@Module({
  providers: [UploadFileService, AwsS3Service],
  exports: [AwsS3Service],
})
export class UploadFileModule {}
```

What it does:
- Registers `AwsS3Service`.
- Exports it so feature modules (messaging, etc.) can inject and reuse.

---

## 2.7 Prisma Message Model

File: `prisma/schema/message.prisma`

```prisma
model Message {
  id             String   @id @default(uuid())
  senderEmail    String
  recipientEmail String
  text           String?
  document       String?
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  createdAt      DateTime @default(now())
  ...
}
```

Field purpose:
- `senderEmail` / `recipientEmail`: participant identity
- `text`: message body
- `document`: attachment URL
- `isDeleted`: soft-delete marker
- `deletedAt`: deletion timestamp for auditing/compliance

Indexes:
- `@@index([senderEmail])`
- `@@index([recipientEmail])`

Why:
- Improves read performance for conversation queries.

---

## 3) Current API Contracts

## 3.1 HTTP

### `GET /messaging`
Query:
- `receiver` (optional) -> filter one conversation

### `POST /messaging/send`
Content:
- multipart/form-data (optional file field: `file`)
- body:
  - `receiver`
  - `text` or `content`
  - optional `data` (JSON string)

### `DELETE /messaging/delete/:messageId`
Behavior:
- sender-only delete
- S3 delete if attachment exists
- marks message deleted in DB

## 3.2 WebSocket

Connection:
- token query param required: `ws://.../messaging?token=<jwt>`

Inbound event:
- `message` with payload:
  - `recipientEmail` (gateway still uses this field name currently)
  - `text?`
  - `document?`

Outbound events:
- `message`
- `message:deleted` with `{ messageId }`

---

## 4) Why This Design Is Good

1. Clear boundaries:
- Controller = transport
- Service = business logic
- Gateway = realtime transport
- S3 service = storage abstraction

2. Easy extensibility:
- add reactions, typing, read receipts without breaking core design

3. Production-aligned deletion model:
- soft delete + timestamp

4. Reusable file layer:
- same S3 service can be used by other modules

---

## 5) Gaps and What to Improve Next (Industry-Level)

## 5.1 Data model and querying

Recommended:
- Add `conversationId` (or deterministic hash of two users) for faster thread queries.
- Add composite indexes:
  - `(senderEmail, recipientEmail, createdAt)`
  - `(recipientEmail, senderEmail, createdAt)`
- Add cursor pagination for history (avoid loading entire chats).

## 5.2 Realtime scaling (multi-instance)

Current map-based socket tracking is in-memory (single instance only).

Recommended:
- Use Redis-based pub/sub adapter for distributed socket routing.
- Keep presence/session in Redis.
- Add delivery status tracking (sent, delivered, seen).

## 5.3 Reliability

Recommended:
- Add idempotency key on send API to avoid duplicate messages on retries.
- Wrap critical operations in transaction when needed.
- Add retry/dead-letter pattern for downstream failures.

## 5.4 Security and abuse protection

Recommended:
- Validate payloads with DTO + `class-validator`.
- Add rate limiting for send/message events.
- Add antivirus scan pipeline for uploaded files.
- Restrict file type/size by config.
- Use signed URL for private file access instead of public bucket URL.

## 5.5 Product features

Recommended:
- Read receipts (`seenAt`)
- Typing indicators
- Edit message with edit history
- Reply/thread references
- Reactions and mentions
- Attachment metadata (name, size, mime, thumbnail)
- Archived/blocked conversation handling

## 5.6 Operational quality

Recommended:
- Structured logs (requestId, sender, receiver, messageId)
- Metrics:
  - send latency
  - ws delivery latency
  - failed uploads/deletes
  - active socket count
- Tracing for DB + S3 + WS path

---

## 6) Concrete Refactor Opportunities in Current Code

1. Naming consistency:
- Gateway payload still uses `recipientEmail`.
- Consider changing it to `receiver` for consistency.

2. DTO introduction:
- Replace inline body types with DTO classes for better validation docs.

3. Conversation endpoint split:
- `GET /messaging` for thread list
- `GET /messaging/:receiver` for one thread

4. Remove duplicate legacy route when frontend migrated:
- deprecate `/messages-list`.

---

## 7) Safe Modification Guide

When changing behavior, follow this checklist:

1. Update service first (source of business truth).
2. Update controller/gateway contracts.
3. Update Prisma schema + migration if data changes.
4. Update frontend payload field names.
5. Add tests for:
- HTTP send/delete
- WS message emit
- S3 upload/delete error paths

---

## 8) Suggested Next Milestone

For a strong production jump, implement in this order:

1. DTO validation + Swagger docs for messaging routes.
2. Cursor pagination for `GET /messaging`.
3. Redis-backed websocket scaling.
4. Read receipts + delivery state model.
5. Signed S3 URLs and file scanning pipeline.

---

## 9) Quick Reference Mapping

Input naming vs DB naming:
- Service input `sender` -> DB `senderEmail`
- Service input `receiver` -> DB `recipientEmail`

Delete logic summary:
- DB row kept
- content removed (`text`, `document` set `null`)
- flags set (`isDeleted = true`, `deletedAt = now`)

Realtime summary:
- On send: emit `message` to sender + receiver.
- On delete: emit `message:deleted` to sender + receiver.
