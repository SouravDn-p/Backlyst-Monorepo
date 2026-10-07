# Backlyst Marketplace Error Catalogue

## Document identity

- Branch: `fix/prisma-migration-history`
- Base commit: `285028080233238c214cdc9231a292fda390ea1f`
- Source state: base commit plus uncommitted working-tree changes
- Source-defined marketplace/supporting exception branches scanned: `283`
- Unique exception class/message expressions catalogued: `198`
- Status: `SOURCE_VERIFIED_ERROR_INVENTORY`

## Critical contract findings

1. Ordinary NestJS `HttpException` responses do **not** include a stable application error code.
2. The global response envelope for those errors is:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "string or string array"
}
```

3. Only mapped Prisma failures expose a machine-readable `code` field.
4. Marketplace validation deliberately randomizes safe public messages. Playwright tests must assert the allowed message set, not one fixed string.
5. Internal fields such as `failedRules`, `restrictions`, `blockedReason`, and cooldown timing are not part of the public rejection contract.
6. DTO/ValidationPipe failures can return `message` as an array of field-validation strings.
7. In production, unhandled errors are reduced to `Internal server error`; development responses may include stack details.

## Global error contract

| Condition | HTTP | Public response behavior | Stable code | Playwright assertion |
|---|---:|---|---|---|
| NestJS `BadRequestException` | 400 | Global envelope; message string or array | No | Assert 400, `success=false`, `statusCode=400`; assert scenario message |
| Missing/invalid JWT | 401 | Passport/JWT strategy or strategy-specific message | No | Assert 401 and global envelope |
| Forbidden role/ownership/business rule | 403 | Global envelope | No | Assert 403; avoid assuming one message for randomized algorithm rejection |
| Missing record | 404 | Global envelope | No | Assert 404 and the source-defined message |
| Duplicate/conflict | 409 | Global envelope | No | Assert 409 and source-defined message |
| Prisma `P2002` | 409 | `Duplicate value violates a unique constraint.` | `P2002` | Assert 409 and `code=P2002` |
| Prisma `P2003` | 400 | `Related record not found (foreign key constraint failed).` | `P2003` | Assert 400 and `code=P2003` |
| Prisma `P2025` | 404 | `Requested record was not found.` | `P2025` | Assert 404 and `code=P2025` |
| Other known Prisma request error | 503 | `Database error` plus Prisma metadata | Prisma code | Treat as infrastructure failure, not expected business rejection |
| Prisma validation error | 400 | `Invalid database input payload.` | No | Treat as backend contract defect unless intentionally tested |
| Prisma initialization/unknown error | 503 | `Database error` | No | Fail test as environment/backend failure |
| Unhandled non-HTTP error | 500 | Generic in production; detailed in development | No | Fail test; never classify as expected marketplace rejection |

## Marketplace algorithm rejection contract

The validation engine returns one randomized public message. The same public set may represent multiple internal rules, preventing clients from inferring cooldown, quota, reciprocal, niche, pattern, or eligibility internals.

### Cooldown/limit message set

- `This opportunity is currently unavailable.`
- `This match is temporarily hidden.`
- `You cannot access this opportunity right now.`

Used when internal failures include one or more of:

- `DOMAIN_COOLDOWN`
- `DAILY_LIMIT`
- `WEEKLY_LIMIT`
- `DOMAIN_VELOCITY_LIMIT`
- `MATCH_SPACING`

### Eligibility message set

- `This opportunity is currently unavailable.`
- `This match requires a different profile setup.`
- `Your current profile does not meet the requirements for this task.`

Used for other rejected rules, including pattern, niche, and eligibility restrictions.

### Required Playwright assertion

```ts
expect(response.status()).toBe(403);
expect(body).toMatchObject({ success: false, statusCode: 403 });
expect([
  'This opportunity is currently unavailable.',
  'This match is temporarily hidden.',
  'You cannot access this opportunity right now.',
  'This match requires a different profile setup.',
  'Your current profile does not meet the requirements for this task.',
]).toContain(body.message);
expect(body.failedRules).toBeUndefined();
expect(body.blockedReason).toBeUndefined();
```

## Source-defined error inventory

The route-family column is based on the owning module. A service may be called by more than one route in that family; exact method-level route mapping remains part of the detailed API-contract stage.

### ADMIN_ANALYTICS

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-ADMIN_ANALYTICS-001` | 400 | `BadRequestException` | `'Both from and to are required for a custom date range'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/analytics-date-range.service.ts:15` |
| `ERR-ADMIN_ANALYTICS-002` | 400 | `BadRequestException` | `'CUSTOM range requires both from and to'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/analytics-date-range.service.ts:22` |
| `ERR-ADMIN_ANALYTICS-003` | 400 | `BadRequestException` | `'Custom range cannot exceed five years'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/analytics-date-range.service.ts:60` |
| `ERR-ADMIN_ANALYTICS-004` | 400 | `BadRequestException` | `'Domain pair stat not found'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/admin-analytics.service.ts:66` |
| `ERR-ADMIN_ANALYTICS-005` | 400 | `BadRequestException` | `'Invalid from or to date'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/analytics-date-range.service.ts:52` |
| `ERR-ADMIN_ANALYTICS-006` | 400 | `BadRequestException` | `'Unsupported analytics range'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/analytics-date-range.service.ts:117` |
| `ERR-ADMIN_ANALYTICS-007` | 400 | `BadRequestException` | `'Unsupported analytics report type'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/admin-analytics.controller.ts:511`<br>`src/modules/admin/admin-analytics/services/admin-analytics.service.ts:193`<br>`src/modules/admin/admin-analytics/services/analytics-report-builder.service.ts:66`<br>`src/modules/admin/admin-analytics/services/saved-analytics-report.service.ts:173` |
| `ERR-ADMIN_ANALYTICS-008` | 400 | `BadRequestException` | `'from must be before to'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/analytics-date-range.service.ts:56` |
| `ERR-ADMIN_ANALYTICS-009` | 400 | `BadRequestException` | `'generatedFrom must be before generatedTo'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/saved-analytics-report.service.ts:57` |
| `ERR-ADMIN_ANALYTICS-010` | 404 | `NotFoundException` | `'Saved analytics report not found'` | `ADMIN-ANALYTICS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/saved-analytics-report.service.ts:236` |
| `ERR-ADMIN_ANALYTICS-011` | 404 | `NotFoundException` | ``PatternFlag ${id} not found.`` | `ADMIN-ANALYTICS-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-analytics/services/pattern-flag.service.ts:42` |
|  |  |  | **Test guidance:** Assert HTTP 404; assert stable message prefix/regex and dynamic value. |  |  |  |  |
### ADMIN_MANUAL_MATCH

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-ADMIN_MANUAL_MATCH-001` | 400 | `BadRequestException` | `'An open manual match queue entry already exists for this task/provider/requester triplet.'` | `ADMIN-MATCH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-manual-match-queue/manual-match-queue.service.ts:69` |
| `ERR-ADMIN_MANUAL_MATCH-002` | 400 | `BadRequestException` | `'Both providerWebsiteId and requesterWebsiteId must reference existing, non-deleted websites.'` | `ADMIN-MATCH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-manual-match-queue/manual-match-queue.service.ts:54` |
| `ERR-ADMIN_MANUAL_MATCH-003` | 400 | `BadRequestException` | ``Queue entry is already in a terminal status (${row.status}) and cannot be changed.`` | `ADMIN-MATCH-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-manual-match-queue/manual-match-queue.service.ts:100` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-ADMIN_MANUAL_MATCH-004` | 404 | `NotFoundException` | `'Manual match queue entry not found.'` | `ADMIN-MATCH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-manual-match-queue/manual-match-queue.service.ts:97` |
| `ERR-ADMIN_MANUAL_MATCH-005` | 404 | `NotFoundException` | `'Task not found.'` | `ADMIN-MATCH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-manual-match-queue/manual-match-queue.service.ts:43`<br>`src/modules/task/admin-task/admin-task.service.ts:606`<br>`src/modules/task/admin-task/admin-task.service.ts:651`<br>`src/modules/task/admin-task/admin-task.service.ts:773`<br>`src/modules/task/admin-task/admin-task.service.ts:941`<br>`src/modules/task/admin-task/admin-task.service.ts:1161`<br>+23 more |
### ADMIN_NICHE

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-ADMIN_NICHE-001` | 404 | `NotFoundException` | `'MarketplaceCategory not found for categoryKey.'` | `ADMIN-NICHE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-niche-cap/admin-niche-cap.service.ts:41` |
| `ERR-ADMIN_NICHE-002` | 404 | `NotFoundException` | `'Niche distribution cap not found.'` | `ADMIN-NICHE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-niche-cap/admin-niche-cap.service.ts:66`<br>`src/modules/admin/admin-niche-cap/admin-niche-cap.service.ts:98` |
### ADMIN_PAIR

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-ADMIN_PAIR-001` | 404 | `NotFoundException` | `'Both domainA and domainB must resolve to a valid root domain.'` | `ADMIN-PAIR-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-domain-pair-inspection/admin-domain-pair-inspection.service.ts:61` |
### ADMIN_TASK

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-ADMIN_TASK-001` | 400 | `BadRequestException` | `'Assigned provider website is required before force-approving provider rewards.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:948` |
| `ERR-ADMIN_TASK-002` | 400 | `BadRequestException` | `'Assigned provider website is required before force-completing provider rewards.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:788` |
| `ERR-ADMIN_TASK-003` | 400 | `BadRequestException` | `'Audit note is required.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:653` |
| `ERR-ADMIN_TASK-004` | 400 | `BadRequestException` | `'Completed or cancelled task cannot be flagged for abuse.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1528` |
| `ERR-ADMIN_TASK-005` | 400 | `BadRequestException` | `'Completed or cancelled task cannot be frozen.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1241` |
| `ERR-ADMIN_TASK-006` | 400 | `BadRequestException` | `'Credit adjustment amount must be greater than 0.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1316` |
| `ERR-ADMIN_TASK-007` | 400 | `BadRequestException` | `'Invalid from date.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:170` |
| `ERR-ADMIN_TASK-008` | 400 | `BadRequestException` | `'Invalid to date.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:174` |
| `ERR-ADMIN_TASK-009` | 400 | `BadRequestException` | `'Only disputed tasks can be resolved.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1392` |
| `ERR-ADMIN_TASK-010` | 400 | `BadRequestException` | `'Resolved final task type is required before settling verified placement rewards.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:848`<br>`src/modules/task/admin-task/admin-task.service.ts:1063`<br>`src/modules/task/task-requester/task-requester.service.ts:1253` |
| `ERR-ADMIN_TASK-011` | 400 | `BadRequestException` | `'Task cannot be force-approved in current state.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:943` |
| `ERR-ADMIN_TASK-012` | 400 | `BadRequestException` | `'Task cannot be force-completed in current state.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:783` |
| `ERR-ADMIN_TASK-013` | 400 | `BadRequestException` | `'Task cannot be force-rejected in current state.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1163` |
| `ERR-ADMIN_TASK-014` | 400 | `BadRequestException` | `'Task is already frozen.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1238` |
| `ERR-ADMIN_TASK-015` | 400 | `BadRequestException` | `'Task must be overdue, frozen, or submitted to force-complete.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:778` |
| `ERR-ADMIN_TASK-016` | 400 | `BadRequestException` | `'Unsupported admin action.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:639` |
| `ERR-ADMIN_TASK-017` | 400 | `BadRequestException` | `'Use settlement-specific admin actions for COMPLETED, APPROVED, REJECTED, or DISPUTED states.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:659` |
| `ERR-ADMIN_TASK-018` | 400 | `BadRequestException` | `'disputeResolution is required for RESOLVE_DISPUTE.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1395` |
| `ERR-ADMIN_TASK-019` | 400 | `BadRequestException` | `'from must be before to.'` | `ADMIN-TASK-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:178` |
| `ERR-ADMIN_TASK-020` | 400 | `BadRequestException` | ``Credit adjustment amount cannot exceed ${maxAdjustable}.`` | `ADMIN-TASK-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1321` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-ADMIN_TASK-021` | 400 | `BadRequestException` | ``Invalid transition: ${task.lifecycleStatus} -> ${payload.status}`` | `ADMIN-TASK-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:666` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-ADMIN_TASK-022` | 400 | `BadRequestException` | ``amount is required for ${payload.adjustmentType} adjustments.`` | `ADMIN-TASK-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:1310` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-ADMIN_TASK-023` | 403 | `ForbiddenException` | `adminValidation.publicMessage` | `ADMIN-TASK-*` | `INDIRECT_RUNTIME_MESSAGE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/admin-task/admin-task.service.ts:982` |
|  |  |  | **Test guidance:** Assert HTTP 403; assert global error envelope; do not assert one fixed message. |  |  |  |  |
### ADMIN_TAXONOMY

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-ADMIN_TAXONOMY-001` | 404 | `NotFoundException` | `'Parent category not found'` | `ADMIN-TAX-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:31`<br>`src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:53` |
| `ERR-ADMIN_TAXONOMY-002` | 404 | `NotFoundException` | `'Source category not found'` | `ADMIN-TAX-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:116` |
| `ERR-ADMIN_TAXONOMY-003` | 404 | `NotFoundException` | `'Target category not found'` | `ADMIN-TAX-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:120` |
| `ERR-ADMIN_TAXONOMY-004` | 409 | `ConflictException` | `'Category with this slug already exists'` | `ADMIN-TAX-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:25` |
| `ERR-ADMIN_TAXONOMY-005` | 409 | `ConflictException` | `'Slug already in use'` | `ADMIN-TAX-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:46`<br>`src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:92` |
| `ERR-ADMIN_TAXONOMY-006` | 409 | `ConflictException` | `'Tag with this slug already exists'` | `ADMIN-TAX-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-taxonomy/admin-taxonomy.service.ts:78` |
### ADMIN_WEBSITE_STATUS

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-ADMIN_WEBSITE_STATUS-001` | 404 | `NotFoundException` | `'Website not found.'` | `ADMIN-WEBSTAT-* / ADMIN-VIS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-website-status/admin-website-status.service.ts:37`<br>`src/modules/admin/admin-website-status/admin-website-status.service.ts:274`<br>`src/modules/task/market-algoritm/marketplace-override.service.ts:56` |
| `ERR-ADMIN_WEBSITE_STATUS-002` | 404 | `NotFoundException` | `'Website quality profile not found.'` | `ADMIN-WEBSTAT-* / ADMIN-VIS-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/admin/admin-website-status/admin-website-status.service.ts:152`<br>`src/modules/admin/admin-website-status/admin-website-status.service.ts:212`<br>`src/modules/admin/admin-website-status/admin-website-status.service.ts:349` |
### AUTH

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-AUTH-001` | 400 | `BadRequestException` | `'Invalid OTP'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:280`<br>`src/modules/auth/password.service.ts:186` |
| `ERR-AUTH-002` | 400 | `BadRequestException` | `'Invalid Password'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/password.service.ts:58` |
| `ERR-AUTH-003` | 400 | `BadRequestException` | `'Invalid image key'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:151` |
| `ERR-AUTH-004` | 400 | `BadRequestException` | `'Invalid referral code'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:174` |
| `ERR-AUTH-005` | 400 | `BadRequestException` | `'New password cannot be same as old password'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/password.service.ts:62`<br>`src/modules/auth/password.service.ts:157`<br>`src/modules/auth/password.service.ts:278` |
| `ERR-AUTH-006` | 400 | `BadRequestException` | `'OTP expired or invalid. Please request a new one.'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/password.service.ts:178` |
| `ERR-AUTH-007` | 400 | `BadRequestException` | `'OTP expired or not found, please request a new one'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:271` |
| `ERR-AUTH-008` | 400 | `BadRequestException` | `'Password already exists'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/password.service.ts:245` |
| `ERR-AUTH-009` | 400 | `BadRequestException` | `'Please wait before requesting another OTP'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:527`<br>`src/modules/auth/password.service.ts:97` |
| `ERR-AUTH-010` | 400 | `BadRequestException` | `'Referral code is disabled'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:182` |
| `ERR-AUTH-011` | 400 | `BadRequestException` | `'TEMP_PASSWORD_RESET_SECRET is not configured'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.controller.ts:203` |
| `ERR-AUTH-012` | 400 | `BadRequestException` | `'This account does not support password authentication'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/password.service.ts:47` |
| `ERR-AUTH-013` | 400 | `BadRequestException` | `'This account does not support password login'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:345` |
| `ERR-AUTH-014` | 400 | `BadRequestException` | `'User is not active'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:341`<br>`src/modules/auth/auth.service.ts:415` |
| `ERR-AUTH-015` | 400 | `BadRequestException` | `'You cannot use your own referral code'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:178` |
| `ERR-AUTH-016` | 401 | `UnauthorizedException` | `'Invalid Credentials'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:331`<br>`src/modules/auth/auth.service.ts:356` |
| `ERR-AUTH-017` | 401 | `UnauthorizedException` | `'Invalid session'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/strategies/jwt.strategy.ts:64` |
| `ERR-AUTH-018` | 401 | `UnauthorizedException` | `'Session expired'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/strategies/jwt.strategy.ts:68` |
| `ERR-AUTH-019` | 401 | `UnauthorizedException` | `'User is banned'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/strategies/jwt.strategy.ts:41` |
| `ERR-AUTH-020` | 401 | `UnauthorizedException` | `'User not found'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/strategies/jwt.strategy.ts:37` |
| `ERR-AUTH-021` | 401 | `UnauthorizedException` | `'User not verified, Please verify your account first.'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:335` |
| `ERR-AUTH-022` | 401 | `UnauthorizedException` | ``User is suspended until ${user.suspendEnd.toISOString()}`` | `AUTH-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/strategies/jwt.strategy.ts:47` |
|  |  |  | **Test guidance:** Assert HTTP 401; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-AUTH-023` | 403 | `ForbiddenException` | `'Invalid temporary password reset secret'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.controller.ts:209` |
| `ERR-AUTH-024` | 403 | `ForbiddenException` | `'Temporary password reset is disabled in production'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.controller.ts:193` |
| `ERR-AUTH-025` | 404 | `NotFoundException` | `'No active sessions found'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:598` |
| `ERR-AUTH-026` | 404 | `NotFoundException` | `'Session not found'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:578`<br>`src/modules/auth/auth.service.ts:634` |
| `ERR-AUTH-027` | 404 | `NotFoundException` | `'User not found'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:253`<br>`src/modules/auth/auth.service.ts:411`<br>`src/modules/auth/auth.service.ts:508`<br>`src/modules/auth/password.service.ts:42`<br>`src/modules/auth/password.service.ts:149`<br>`src/modules/auth/password.service.ts:240`<br>+1 more |
| `ERR-AUTH-028` | 409 | `ConflictException` | `'User already exist'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:140`<br>`src/modules/auth/auth.service.ts:456` |
| `ERR-AUTH-029` | 409 | `ConflictException` | `'User already verified'` | `AUTH-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/auth/auth.service.ts:257`<br>`src/modules/auth/auth.service.ts:512` |
### DISPUTE

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-DISPUTE-001` | 400 | `BadRequestException` | `'A dispute can only be opened for a task that has an assigned provider.'` | `DISPUTE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:88` |
| `ERR-DISPUTE-002` | 400 | `BadRequestException` | `'This dispute has already been resolved.'` | `DISPUTE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:237` |
| `ERR-DISPUTE-003` | 400 | `BadRequestException` | `'creditAdjustment.amount is required and must be >= 1.'` | `DISPUTE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:438` |
| `ERR-DISPUTE-004` | 400 | `BadRequestException` | `'creditAdjustment.walletType is required for credit adjustments.'` | `DISPUTE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:443` |
| `ERR-DISPUTE-005` | 400 | `BadRequestException` | ``An active dispute (${existing.status}) already exists for this task.`` | `DISPUTE-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:117` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-DISPUTE-006` | 400 | `BadRequestException` | ``Cannot open a dispute for a task in ${task.lifecycleStatus} status.`` | `DISPUTE-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:97` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-DISPUTE-007` | 403 | `ForbiddenException` | `'You are not authorized to open a dispute for this task.'` | `DISPUTE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:559` |
| `ERR-DISPUTE-008` | 404 | `NotFoundException` | `'Dispute not found.'` | `DISPUTE-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/dispute/dispute.service.ts:230` |
### MARKETPLACE_ALGORITHM

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-MARKETPLACE_ALGORITHM-001` | 400 | `BadRequestException` | ``status must be one of: ${this.openLifecycleStatuses.join(', ')}`` | `PROVIDER-001/004, REQUESTER-005/007, ADMIN-PAIR-001` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/market-algoritm/matching.engine.ts:259` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-MARKETPLACE_ALGORITHM-002` | 403 | `ForbiddenException` | `validationResult.publicMessage` | `PROVIDER-001/004, REQUESTER-005/007, ADMIN-PAIR-001` | `INDIRECT_RUNTIME_MESSAGE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/market-algoritm/domain-interaction-recorder.service.ts:127` |
|  |  |  | **Test guidance:** Assert HTTP 403; assert global error envelope; do not assert one fixed message. |  |  |  |  |
| `ERR-MARKETPLACE_ALGORITHM-003` | 404 | `NotFoundException` | `'Override is not active.'` | `PROVIDER-001/004, REQUESTER-005/007, ADMIN-PAIR-001` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/market-algoritm/marketplace-override.service.ts:126` |
| `ERR-MARKETPLACE_ALGORITHM-004` | 404 | `NotFoundException` | `'Override not found.'` | `PROVIDER-001/004, REQUESTER-005/007, ADMIN-PAIR-001` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/market-algoritm/marketplace-override.service.ts:124` |
| `ERR-MARKETPLACE_ALGORITHM-005` | 404 | `NotFoundException` | `'Website not found for marketplace scoring.'` | `PROVIDER-001/004, REQUESTER-005/007, ADMIN-PAIR-001` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/market-algoritm/scoring.service.ts:93` |
### OTHER_MARKETPLACE_SUPPORT

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-OTHER_MARKETPLACE_SUPPORT-001` | 400 | `BadRequestException` | `'actorId is required'` | `route mapping requires call-path verification` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:93` |
| `ERR-OTHER_MARKETPLACE_SUPPORT-002` | 400 | `BadRequestException` | `'actorRole is required'` | `route mapping requires call-path verification` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:101` |
| `ERR-OTHER_MARKETPLACE_SUPPORT-003` | 400 | `BadRequestException` | `'eventKey is required'` | `route mapping requires call-path verification` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:109` |
| `ERR-OTHER_MARKETPLACE_SUPPORT-004` | 400 | `BadRequestException` | `'eventType is required'` | `route mapping requires call-path verification` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:97` |
| `ERR-OTHER_MARKETPLACE_SUPPORT-005` | 400 | `BadRequestException` | `'placementTaskId is required'` | `route mapping requires call-path verification` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:85` |
| `ERR-OTHER_MARKETPLACE_SUPPORT-006` | 400 | `BadRequestException` | `'requesterId is required'` | `route mapping requires call-path verification` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:89` |
| `ERR-OTHER_MARKETPLACE_SUPPORT-007` | 400 | `BadRequestException` | `'toStatus is required'` | `route mapping requires call-path verification` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:105` |
| `ERR-OTHER_MARKETPLACE_SUPPORT-008` | 400 | `BadRequestException` | ``providerId and providerWebsiteId are required for ${input.eventType}`` | `route mapping requires call-path verification` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-flow/task-flow.service.ts:116` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
### PROVIDER_TASK

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-PROVIDER_TASK-001` | 400 | `BadRequestException` | `'Invalid lifecycle status.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:1308` |
| `ERR-PROVIDER_TASK-002` | 400 | `BadRequestException` | `'Invalid proof file type. Allowed: image, PDF, DOC, DOCX, TXT.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:908`<br>`src/modules/task/provider-task/provider-task.service.ts:1225` |
| `ERR-PROVIDER_TASK-003` | 400 | `BadRequestException` | `'Max 3 approved deadline extensions allowed.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:797` |
| `ERR-PROVIDER_TASK-004` | 400 | `BadRequestException` | `'No pending cancellation request for this task.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:1372` |
| `ERR-PROVIDER_TASK-005` | 400 | `BadRequestException` | `'Provider must not be requester.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:589` |
| `ERR-PROVIDER_TASK-006` | 400 | `BadRequestException` | `'Requester website not found for this task.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:612` |
| `ERR-PROVIDER_TASK-007` | 400 | `BadRequestException` | `'Task does not have a delivery deadline yet.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:783` |
| `ERR-PROVIDER_TASK-008` | 400 | `BadRequestException` | `'Task must be open for applications.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:591` |
| `ERR-PROVIDER_TASK-009` | 400 | `BadRequestException` | `'Task state does not allow deadline extension request.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:792` |
| `ERR-PROVIDER_TASK-010` | 400 | `BadRequestException` | `'Task state does not allow proof upload.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:1220` |
| `ERR-PROVIDER_TASK-011` | 400 | `BadRequestException` | `'Task status must be ASSIGNED or IN_PROGRESS for submit.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:884` |
| `ERR-PROVIDER_TASK-012` | 400 | `BadRequestException` | `'Task status must be ASSIGNED to start work.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:1033` |
| `ERR-PROVIDER_TASK-013` | 400 | `BadRequestException` | `'Task status must be REVISION_REQUESTED for resubmit.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:889` |
| `ERR-PROVIDER_TASK-014` | 400 | `BadRequestException` | `'Total approved extension days cannot exceed 30.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:802` |
| `ERR-PROVIDER_TASK-015` | 400 | `BadRequestException` | `'You already have a pending deadline extension request.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:816` |
| `ERR-PROVIDER_TASK-016` | 400 | `BadRequestException` | `'You have already applied to this task.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:639`<br>`src/modules/task/provider-task/provider-task.service.ts:755` |
| `ERR-PROVIDER_TASK-017` | 400 | `BadRequestException` | `'finalTaskType is allowed only for FLEXIBLE task.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:894` |
| `ERR-PROVIDER_TASK-018` | 400 | `BadRequestException` | `'finalTaskType is required for FLEXIBLE task.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:899` |
| `ERR-PROVIDER_TASK-019` | 400 | `BadRequestException` | `'providerWebsiteId is invalid, deleted, or not owned by provider.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:603` |
| `ERR-PROVIDER_TASK-020` | 400 | `BadRequestException` | ``Your Domain Rating (${domainAuthority}) does not meet the task's requirement of ${task.requiredDomainRating}.`` | `PROVIDER-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:624` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-PROVIDER_TASK-021` | 400 | `BadRequestException` | ``extendDays must be one of: ${DEADLINE_EXTENSION_DAYS_ENUM.join(', ')}`` | `PROVIDER-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:768`<br>`src/modules/task/task-requester/task-requester.service.ts:1716` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-PROVIDER_TASK-022` | 401 | `UnauthorizedException` | `'Missing authenticated provider context. Please login and include a valid Bearer token.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:579` |
| `ERR-PROVIDER_TASK-023` | 403 | `ForbiddenException` | `'Only selected provider can request deadline extension.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:778` |
| `ERR-PROVIDER_TASK-024` | 403 | `ForbiddenException` | `'Only selected provider can respond to cancellation request.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:1367` |
| `ERR-PROVIDER_TASK-025` | 403 | `ForbiddenException` | `'Only selected provider can start work.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:1030` |
| `ERR-PROVIDER_TASK-026` | 403 | `ForbiddenException` | `'Only selected provider can submit.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:877` |
| `ERR-PROVIDER_TASK-027` | 403 | `ForbiddenException` | `'Only selected provider can upload proof.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:1217` |
| `ERR-PROVIDER_TASK-028` | 403 | `ForbiddenException` | `'Provider must be selected provider or applicant.'` | `PROVIDER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:523` |
| `ERR-PROVIDER_TASK-029` | 403 | `ForbiddenException` | `validation.publicMessage` | `PROVIDER-*` | `INDIRECT_RUNTIME_MESSAGE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/provider-task/provider-task.service.ts:677`<br>`src/modules/task/task-requester/task-requester.service.ts:704` |
|  |  |  | **Test guidance:** Assert HTTP 403; assert global error envelope; do not assert one fixed message. |  |  |  |  |
### REQUESTER_TASK

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-REQUESTER_TASK-001` | 400 | `BadRequestException` | `'A category cannot be both PRIMARY and SECONDARY.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:349`<br>`src/modules/website/website.service.ts:107`<br>`src/modules/website/website.service.ts:652` |
| `ERR-REQUESTER_TASK-002` | 400 | `BadRequestException` | `'Application must belong to task and be APPLIED.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:652` |
| `ERR-REQUESTER_TASK-003` | 400 | `BadRequestException` | `'Application must belong to task and still be APPLIED.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:719` |
| `ERR-REQUESTER_TASK-004` | 400 | `BadRequestException` | `'Assigned provider website is required before rewarding the provider.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1116` |
| `ERR-REQUESTER_TASK-005` | 400 | `BadRequestException` | `'Cancellation request already pending provider response.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:882` |
| `ERR-REQUESTER_TASK-006` | 400 | `BadRequestException` | `'Deadline days can be changed only before provider is selected.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1660` |
| `ERR-REQUESTER_TASK-007` | 400 | `BadRequestException` | `'Deadline extension request is already resolved.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1850` |
| `ERR-REQUESTER_TASK-008` | 400 | `BadRequestException` | `'Invalid JSON in data field.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.controller.ts:100` |
| `ERR-REQUESTER_TASK-009` | 400 | `BadRequestException` | `'Max 3 deadline extensions allowed.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1738` |
| `ERR-REQUESTER_TASK-010` | 400 | `BadRequestException` | `'No selected provider.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1082` |
| `ERR-REQUESTER_TASK-011` | 400 | `BadRequestException` | `'One or more Marketplace Tags are invalid or disabled'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:374` |
| `ERR-REQUESTER_TASK-012` | 400 | `BadRequestException` | `'One or more Target Marketplace Categories are not found or disabled'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:362` |
| `ERR-REQUESTER_TASK-013` | 400 | `BadRequestException` | `'Only the selected provider deadline request can be resolved.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1858` |
| `ERR-REQUESTER_TASK-014` | 400 | `BadRequestException` | `'Provider was already selected for this task.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:744` |
| `ERR-REQUESTER_TASK-015` | 400 | `BadRequestException` | `'Quality rubric already submitted for this task.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:2000` |
| `ERR-REQUESTER_TASK-016` | 400 | `BadRequestException` | `'Selected provider is required before approving a task.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1107` |
| `ERR-REQUESTER_TASK-017` | 400 | `BadRequestException` | `'Submission status must be SUBMITTED.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1079` |
| `ERR-REQUESTER_TASK-018` | 400 | `BadRequestException` | `'Task cannot be cancelled in current state.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:876` |
| `ERR-REQUESTER_TASK-019` | 400 | `BadRequestException` | `'Task must be COMPLETED to submit a quality rubric.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1988` |
| `ERR-REQUESTER_TASK-020` | 400 | `BadRequestException` | `'Task must be DRAFT/OPEN/WAITING_FOR_APPLICANTS.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1669` |
| `ERR-REQUESTER_TASK-021` | 400 | `BadRequestException` | `'Task must be OPEN or WAITING_FOR_APPLICANTS.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:639` |
| `ERR-REQUESTER_TASK-022` | 400 | `BadRequestException` | `'Task must have a selected provider.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1993` |
| `ERR-REQUESTER_TASK-023` | 400 | `BadRequestException` | `'Task must have selected provider.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1728` |
| `ERR-REQUESTER_TASK-024` | 400 | `BadRequestException` | `'Task state does not allow extension.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1735` |
| `ERR-REQUESTER_TASK-025` | 400 | `BadRequestException` | `'Total extension days cannot exceed 30.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1742` |
| `ERR-REQUESTER_TASK-026` | 400 | `BadRequestException` | `'requesterWebsiteId is invalid, not verified, flag active, wallet-locked, or hidden.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:330` |
| `ERR-REQUESTER_TASK-027` | 400 | `BadRequestException` | ``requestedDeadlineDays must be one of: ${REQUESTED_DEADLINE_DAYS_ENUM.join(', ')}`` | `REQUESTER-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:310` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-REQUESTER_TASK-028` | 400 | `BadRequestException` | `validationErrors .map((item) => Object.values(item.constraints ?? {}).join(', ')) .filter(Boolean) .join('; ') \|\| 'Invalid task payload.'` | `REQUESTER-*` | `DYNAMIC_EXPRESSION` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.controller.ts:109` |
|  |  |  | **Test guidance:** Assert HTTP 400; message requires scenario-specific or source-path assertion. |  |  |  |  |
| `ERR-REQUESTER_TASK-029` | 403 | `ForbiddenException` | `'No permission.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:637`<br>`src/modules/task/task-requester/task-requester.service.ts:874`<br>`src/modules/task/task-requester/task-requester.service.ts:1077`<br>`src/modules/task/task-requester/task-requester.service.ts:1546`<br>`src/modules/task/task-requester/task-requester.service.ts:1658`<br>`src/modules/task/task-requester/task-requester.service.ts:1726`<br>+2 more |
| `ERR-REQUESTER_TASK-030` | 403 | `ForbiddenException` | `'Only task requester or admin can view timeline.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1573` |
| `ERR-REQUESTER_TASK-031` | 403 | `ForbiddenException` | `'Requester account is not active.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:322` |
| `ERR-REQUESTER_TASK-032` | 403 | `ForbiddenException` | `'You do not have permission to view applicants for this task.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:580` |
| `ERR-REQUESTER_TASK-033` | 404 | `NotFoundException` | `'Deadline extension request not found.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1847` |
| `ERR-REQUESTER_TASK-034` | 404 | `NotFoundException` | `'Provider website not found.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:1965` |
| `ERR-REQUESTER_TASK-035` | 404 | `NotFoundException` | `'Task not found after provider selection.'` | `REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task-requester/task-requester.service.ts:776` |
### TASK_SHARED

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-TASK_SHARED-001` | 403 | `ForbiddenException` | `'Only requester or selected provider can access deadline history.'` | `PROVIDER-*/REQUESTER-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/task/task.service.ts:35` |
### VERIFY

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-VERIFY-001` | 400 | `BadRequestException` | `'A manual review request is already pending'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:382` |
| `ERR-VERIFY-002` | 400 | `BadRequestException` | `'A verification request is already pending'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-dns.service.ts:79`<br>`src/modules/website/website-verification/website-verification-meta.service.ts:203` |
| `ERR-VERIFY-003` | 400 | `BadRequestException` | `'Failed verification request not found'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:401` |
| `ERR-VERIFY-004` | 400 | `BadRequestException` | `'Invalid screenshot image key'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:37` |
| `ERR-VERIFY-005` | 400 | `BadRequestException` | `'Invalid website URL'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-dns.service.ts:220` |
| `ERR-VERIFY-006` | 400 | `BadRequestException` | `'Manual review can only be requested after failed verification'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:365` |
| `ERR-VERIFY-007` | 400 | `BadRequestException` | `'Unable to access website. Check connectivity or bot protection settings.'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-meta.service.ts:114` |
| `ERR-VERIFY-008` | 400 | `BadRequestException` | `'Unable to access website. Try disabling bot protection or firewall restrictions.'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-meta.service.ts:259` |
| `ERR-VERIFY-009` | 400 | `BadRequestException` | `'Unable to fetch DNS TXT records. Ensure the record is published and try again.'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-dns.service.ts:121` |
| `ERR-VERIFY-010` | 400 | `BadRequestException` | `'Unauthorized'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:56`<br>`src/modules/website/website-verification/website-verification.service.ts:357` |
| `ERR-VERIFY-011` | 400 | `BadRequestException` | `'Unsupported verification type'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:337` |
| `ERR-VERIFY-012` | 400 | `BadRequestException` | `'Website already verified'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:60`<br>`src/modules/website/website-verification/website-verification.service.ts:361` |
| `ERR-VERIFY-013` | 400 | `BadRequestException` | `'Website not found'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:52`<br>`src/modules/website/website-verification/website-verification.service.ts:353` |
| `ERR-VERIFY-014` | 400 | `BadRequestException` | `'screenshotImageKey is required'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:33` |
| `ERR-VERIFY-015` | 400 | `BadRequestException` | ``Unable to fetch DNS TXT records for "${lookupName}"`` | `VERIFY-*` | `DYNAMIC_TEMPLATE` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-dns.service.ts:241` |
|  |  |  | **Test guidance:** Assert HTTP 400; assert stable message prefix/regex and dynamic value. |  |  |  |  |
| `ERR-VERIFY-016` | 404 | `NotFoundException` | `'DNS configuration not found'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-dns.service.ts:208` |
| `ERR-VERIFY-017` | 404 | `NotFoundException` | `'Meta tag not found'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification.service.ts:292` |
| `ERR-VERIFY-018` | 404 | `NotFoundException` | `'Meta verification config not found'` | `VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-meta.service.ts:219` |
### VERIFY_ADMIN

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-VERIFY_ADMIN-001` | 400 | `BadRequestException` | `'Already reviewed or not eligible for approval'` | `ADMIN-VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-admin/website-verification-admin.service.ts:56` |
| `ERR-VERIFY_ADMIN-002` | 400 | `BadRequestException` | `'Already reviewed or not eligible for rejection'` | `ADMIN-VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-admin/website-verification-admin.service.ts:183` |
| `ERR-VERIFY_ADMIN-003` | 400 | `BadRequestException` | `'Website is not verified yet or already requires verification'` | `ADMIN-VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-admin/website-verification-admin.service.ts:502` |
| `ERR-VERIFY_ADMIN-004` | 404 | `NotFoundException` | `'Verification not found'` | `ADMIN-VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-admin/website-verification-admin.service.ts:377`<br>`src/modules/website/website-verification/website-verification.service.ts:119` |
| `ERR-VERIFY_ADMIN-005` | 404 | `NotFoundException` | `'Website not found'` | `ADMIN-VERIFY-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website-verification/website-verification-admin/website-verification-admin.service.ts:498`<br>`src/modules/website/website-verification/website-verification-dns.service.ts:155`<br>`src/modules/website/website-verification/website-verification-meta.service.ts:148`<br>`src/modules/website/website.service.ts:376`<br>`src/modules/website/website.service.ts:414`<br>`src/modules/website/website.service.ts:450`<br>+4 more |
### WEBSITE

| Error ID | HTTP | Exception | Message/expression | Route family | Stability | Retry | Source |
|---|---:|---|---|---|---|---|---|
| `ERR-WEBSITE-001` | 400 | `BadRequestException` | `'Either marketplaceCategoryId or primaryCategoryId must be provided.'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:89` |
| `ERR-WEBSITE-002` | 400 | `BadRequestException` | `'Primary category is required.'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:647` |
| `ERR-WEBSITE-003` | 400 | `BadRequestException` | `'marketplaceCategoryId and primaryCategoryId cannot have conflicting values.'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:99` |
| `ERR-WEBSITE-004` | 400 | `BadRequestException` | `'marketplaceTagIds and marketplaceTagKeys cannot have conflicting values.'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:133` |
| `ERR-WEBSITE-005` | 403 | `ForbiddenException` | `'Access denied'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:776` |
| `ERR-WEBSITE-006` | 403 | `ForbiddenException` | `'You cannot update this website'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:612` |
| `ERR-WEBSITE-007` | 404 | `NotFoundException` | `'One or more Marketplace Categories are not found or disabled'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:117`<br>`src/modules/website/website.service.ts:662` |
| `ERR-WEBSITE-008` | 404 | `NotFoundException` | `'One or more Marketplace Tags are invalid or disabled'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:145`<br>`src/modules/website/website.service.ts:684` |
| `ERR-WEBSITE-009` | 404 | `NotFoundException` | `'Trust profile not found'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:591` |
| `ERR-WEBSITE-010` | 409 | `ConflictException` | `'Website already exists'` | `WEB-*` | `EXACT_LITERAL` | `YES_WITH_CHANGED_INPUT` | `src/modules/website/website.service.ts:71`<br>`src/modules/website/website.service.ts:191` |

## Authentication and authorization notes

- `JwtAuthGuard` applies Passport JWT handling; missing/invalid credentials should be asserted as HTTP 401, but the exact Passport-generated message must be verified at runtime.
- The JWT strategy has explicit messages for user-not-found, banned user, suspended user, invalid session, and expired session.
- Admin/user decorators and service-level ownership checks can produce different 403 messages. Tests must arrange only one failure cause per scenario.
- `POST /auth/register` is publicly reachable in the reviewed source and remains a P0 conflict with the fixed-user/no-public-registration product requirement.

## Validation error rules

- Global `ValidationPipe` uses `transform`, `whitelist`, and implicit conversion.
- Unknown fields are stripped unless a local pipe/config overrides this behavior; `forbidNonWhitelisted` is not globally enabled.
- Field validation failures should assert status 400 and that `message` is a non-empty string or string array containing the relevant field constraint.
- Do not hard-code the order of multiple validation messages unless runtime tests prove it stable.

## Contract gaps

- `ERROR_CONTRACT_INCOMPLETE`: ordinary business errors do not expose stable application codes.
- `ALGORITHM_ERROR_NONDETERMINISTIC`: safe marketplace messages are randomized by design.
- `ROUTE_ERROR_MAPPING_PARTIAL`: service-level exceptions are grouped by owning route family, not yet tied to every individual controller method.
- `RESPONSE_SCHEMA_UNTYPED`: several controllers return service values without explicit response DTOs.
- `PASSPORT_MESSAGE_RUNTIME_VERIFICATION`: default guard messages require execution evidence.

## Acceptance rules for later Playwright tests

1. Expected business rejections must be 4xx, never 500/503.
2. Assert the global error envelope on every negative API test.
3. Assert an exact literal only when this catalogue marks the message `EXACT_LITERAL` and the test triggers the documented branch.
4. Use regex/set assertions for dynamic or randomized messages.
5. Ensure internal algorithm rule names are not exposed to normal marketplace users.
6. Treat Prisma initialization, deadlock, migration, fixture, and foreign-key failures as test/environment failures rather than valid algorithm outcomes.
7. Record any runtime message that differs from this source catalogue as a documentation or implementation drift finding.
