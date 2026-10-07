# Admin Analytics Frontend API Guide

This guide explains how the frontend should integrate the Backlyst Admin Analytics APIs step by step.

Base URL examples:
- Local: `http://localhost:5000`
- Deployed: `http://3.7.116.63`

All endpoints are admin-only.

Required header:

```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

Do not call these APIs with normal user tokens.

---

## 1. Frontend Implementation Order

Recommended implementation sequence:

1. Build common analytics filters.
2. Load overview cards.
3. Load report registry table.
4. Open one live report detail.
5. Add PDF/CSV live export buttons.
6. Add saved report creation.
7. Add saved report list/detail/update/delete.
8. Add saved report export buttons.

This order lets the page become useful early while keeping advanced saved-report features separate.

---

## 2. Shared Query Filters

Most analytics APIs support these query params:

| Param | Type | Required | Values | Notes |
|---|---:|---:|---|---|
| `range` | string | no | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, `CUSTOM` | Default should be `MONTHLY` |
| `from` | ISO date string | only for custom | Example: `2026-06-01T00:00:00.000Z` | Required when `range=CUSTOM` |
| `to` | ISO date string | only for custom | Example: `2026-06-30T23:59:59.999Z` | Required when `range=CUSTOM` |
| `participant` | string | no | `ALL`, `REQUESTER`, `PROVIDER` | Activity-role filter, not permanent user role |

Frontend filter state example:

```ts
type AnalyticsFilters = {
  range: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  from?: string;
  to?: string;
  participant: 'ALL' | 'REQUESTER' | 'PROVIDER';
};
```

Build query string:

```ts
const params = new URLSearchParams();
params.set('range', filters.range);
params.set('participant', filters.participant);

if (filters.range === 'CUSTOM') {
  params.set('from', filters.from!);
  params.set('to', filters.to!);
}
```

Validation reminder:
- If `range=CUSTOM`, send both `from` and `to`.
- Use ISO strings.
- Do not send only one date.

---

## 3. Overview Cards

### API

```http
GET /admin/analytics/overview
```

### Purpose

Use this API for the top admin analytics cards:
- Marketplace supply/workload
- Credit economy
- Task health and risk

### Example Request

```bash
curl -X GET \
  "http://localhost:5000/admin/analytics/overview?range=MONTHLY&participant=ALL" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### Example Response

```json
{
  "success": true,
  "message": "Admin analytics overview fetched successfully",
  "data": {
    "period": {
      "range": "MONTHLY",
      "from": "2026-06-01T00:00:00.000Z",
      "to": "2026-06-30T23:59:59.999Z",
      "previousFrom": "2026-05-02T00:00:00.000Z",
      "previousTo": "2026-05-31T23:59:59.999Z",
      "display": "2026-06-01T00:00:00.000Z - 2026-06-30T23:59:59.999Z"
    },
    "filters": {
      "participant": "ALL"
    },
    "cards": {
      "marketplace": {
        "availableWebsites": 2452,
        "activeTasks": 4312,
        "snapshotNote": "availableWebsites and activeTasks are current-state snapshots. Historical snapshot trends are not calculated without a snapshot table.",
        "websitesVerifiedThisPeriod": 120,
        "websitesVerifiedPreviousPeriod": 98,
        "tasksCreatedThisPeriod": 842,
        "tasksCreatedPreviousPeriod": 721,
        "websiteVerificationTrend": {
          "current": 120,
          "previous": 98,
          "trendPercent": 22.45,
          "trendDirection": "UP"
        },
        "taskCreationTrend": {
          "current": 842,
          "previous": 721,
          "trendPercent": 16.78,
          "trendDirection": "UP"
        },
        "activeTaskDefinition": {
          "included": [
            "OPEN",
            "WAITING_FOR_APPLICANTS",
            "ASSIGNED",
            "IN_PROGRESS",
            "SUBMITTED",
            "REVISION_REQUESTED"
          ],
          "excluded": [
            "COMPLETED",
            "CANCELLED",
            "EXPIRED",
            "REJECTED",
            "APPROVED",
            "DISPUTED",
            "FROZEN"
          ]
        }
      },
      "creditEconomy": {
        "creditsSpent": 4800,
        "creditsEarned": 1300,
        "creditsRefunded": 120,
        "creditsExpired": 0,
        "netCreditFlow": -3380,
        "unit": "platform_credits",
        "averageTaskSettlementDays": 3.42,
        "settlementTaskCount": 87,
        "settlementDefinition": "Approved completed tasks using completedAt - publishedAt."
      },
      "taskHealthAndRisk": {
        "completionRate": 51.2,
        "approvalRate": 76.9,
        "disputeRate": 1.66,
        "revisionRate": 9.5,
        "lateOrOverdueTaskCount": 14,
        "cancelledTaskCount": 22,
        "averageLifecycleDurationDays": 5.83,
        "completionTrend": {
          "current": 275,
          "previous": 240,
          "trendPercent": 14.58,
          "trendDirection": "UP"
        },
        "taskCreationTrend": {
          "current": 842,
          "previous": 721,
          "trendPercent": 16.78,
          "trendDirection": "UP"
        }
      }
    }
  }
}
```

### Frontend Mapping

Marketplace card:
- `availableWebsites`
- `activeTasks`
- `websiteVerificationTrend`
- `taskCreationTrend`

Credit card:
- `creditsSpent`
- `creditsEarned`
- `creditsRefunded`
- `netCreditFlow`
- `averageTaskSettlementDays`

Task health card:
- `completionRate`
- `approvalRate`
- `disputeRate`
- `revisionRate`
- `lateOrOverdueTaskCount`
- `cancelledTaskCount`

Important:
- Credits are platform credits, not money.
- Do not display `$`.

---

## 4. Report Registry Table

### API

```http
GET /admin/analytics/report-registry
```

### Purpose

Use this API for the Analytics Registry table/list.

### Extra Query Params

| Param | Type | Values |
|---|---|---|
| `metric` | string | `ALL`, `WEBSITES_TASKS_SUMMARY`, `CREDIT_USAGE_SUMMARY`, `DAILY_PLATFORM_ACTIVITY`, `FOLLOW_NOFOLLOW_LINKS`, `USER_RETENTION_GROWTH`, `TASK_LIFECYCLE_RISK`, `PROVIDER_PERFORMANCE`, `GOVERNANCE_RISK` |
| `source` | string | `ALL`, `PLATFORM_RECORDS`, `TASK_LIFECYCLE`, `PAYMENT_AND_CREDIT_SYSTEM`, `USER_ACTIVITY`, `GOVERNANCE` |

### Example Request

```bash
curl -X GET \
  "http://localhost:5000/admin/analytics/report-registry?range=MONTHLY&metric=ALL&source=ALL&participant=ALL" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### Example Response

```json
{
  "success": true,
  "message": "Admin analytics report registry fetched successfully",
  "data": {
    "period": {
      "range": "MONTHLY",
      "from": "2026-06-01T00:00:00.000Z",
      "to": "2026-06-30T23:59:59.999Z",
      "previousFrom": "2026-05-02T00:00:00.000Z",
      "previousTo": "2026-05-31T23:59:59.999Z",
      "display": "2026-06-01T00:00:00.000Z - 2026-06-30T23:59:59.999Z"
    },
    "filters": {
      "metric": "ALL",
      "source": "ALL",
      "participant": "ALL"
    },
    "data": [
      {
        "reportType": "WEBSITES_TASKS_SUMMARY",
        "name": "Websites vs Task Summary",
        "description": "Marketplace supply and task workload summary without visibility metrics.",
        "dataSource": "PLATFORM_RECORDS",
        "dateRange": {
          "from": "2026-06-01T00:00:00.000Z",
          "to": "2026-06-30T23:59:59.999Z",
          "display": "2026-06-01T00:00:00.000Z - 2026-06-30T23:59:59.999Z"
        },
        "frequency": "MONTHLY",
        "totalRecords": 1242,
        "totalRecordsDefinition": "Matching non-deleted websites plus matching placement tasks.",
        "latestSavedReport": {
          "id": "0c373a00-2b2d-497d-a7f2-b6f5847a71de",
          "reportCode": "ANR-20260624-143025-A82F",
          "generatedAt": "2026-06-24T14:30:25.000Z"
        }
      }
    ]
  }
}
```

### Registry Report Types

Render these as table rows:

```ts
const reportTypes = [
  'WEBSITES_TASKS_SUMMARY',
  'CREDIT_USAGE_SUMMARY',
  'DAILY_PLATFORM_ACTIVITY',
  'FOLLOW_NOFOLLOW_LINKS',
  'USER_RETENTION_GROWTH',
  'TASK_LIFECYCLE_RISK',
  'PROVIDER_PERFORMANCE',
  'GOVERNANCE_RISK',
];
```

`FULL_PLATFORM_SUMMARY` is not a normal registry row. It is used for saved reports and all-report exports.

---

## 5. Live Report Detail

### API

```http
GET /admin/analytics/reports/:reportType
```

### Purpose

Open one report from the registry.

### Example Request

```bash
curl -X GET \
  "http://localhost:5000/admin/analytics/reports/TASK_LIFECYCLE_RISK?range=MONTHLY&participant=ALL" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### Example Response

```json
{
  "success": true,
  "message": "Admin analytics report fetched successfully",
  "data": {
    "metadata": {
      "reportType": "TASK_LIFECYCLE_RISK",
      "reportName": "Task Lifecycle and Risk",
      "generatedAt": "2026-06-24T12:00:00.000Z",
      "range": "MONTHLY",
      "from": "2026-06-01T00:00:00.000Z",
      "to": "2026-06-30T23:59:59.999Z",
      "participant": "ALL",
      "participantFilterApplied": false,
      "totalRecords": 842,
      "snapshotVersion": 1
    },
    "summary": {
      "created": 842,
      "providerSelected": 1204,
      "startedOrInProgress": 350,
      "submitted": 140,
      "revisionRequested": 32,
      "approvedCompleted": 275,
      "rejected": 18,
      "cancelled": 22,
      "expired": 5,
      "frozen": 2,
      "disputed": 14,
      "lateOrOverdue": 9,
      "completionRate": 32.66,
      "approvalRate": 71.61,
      "revisionRate": 8.33,
      "cancellationRate": 2.61,
      "disputeRate": 1.66,
      "averageCompletionDurationDays": 5.42,
      "averageReviewDurationDays": 1.24
    },
    "data": {
      "statusBreakdown": [],
      "taskFlowEventBreakdown": []
    }
  }
}
```

### Common Detail Rendering Strategy

For every live report:

```ts
const { metadata, summary, data } = response.data;
```

Recommended UI:
- Top: report title from `metadata.reportName`
- Small metadata row: date range, participant, total records
- Cards/table: `summary`
- Charts/advanced tables: `data`

---

## 6. Live Export APIs

Binary endpoints do not return JSON.

### Export All Reports as PDF

```http
GET /admin/analytics/export/all/pdf
```

Example:

```bash
curl -L \
  "http://localhost:5000/admin/analytics/export/all/pdf?range=MONTHLY&participant=ALL" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -o backlyst-all-analytics.pdf
```

### Export All Reports as CSV

```http
GET /admin/analytics/export/all/csv
```

Example:

```bash
curl -L \
  "http://localhost:5000/admin/analytics/export/all/csv?range=MONTHLY&participant=ALL" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -o backlyst-all-analytics.csv
```

### Export One Report as PDF

```http
GET /admin/analytics/export/:reportType/pdf
```

Example:

```bash
curl -L \
  "http://localhost:5000/admin/analytics/export/CREDIT_USAGE_SUMMARY/pdf?range=MONTHLY" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -o credit-usage.pdf
```

### Export One Report as CSV

```http
GET /admin/analytics/export/:reportType/csv
```

Example:

```bash
curl -L \
  "http://localhost:5000/admin/analytics/export/CREDIT_USAGE_SUMMARY/csv?range=MONTHLY" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -o credit-usage.csv
```

### Frontend Download Example

```ts
async function downloadAnalyticsFile(url: string, filename: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to download analytics file');
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
```

---

## 7. Save Analytics Report

### API

```http
POST /admin/analytics/saved-reports
```

### Purpose

Generate a live analytics report and store an immutable JSON snapshot.

### Payload

```json
{
  "name": "June Full Platform Summary",
  "description": "Monthly admin analytics report",
  "reportType": "FULL_PLATFORM_SUMMARY",
  "range": "MONTHLY",
  "participant": "ALL"
}
```

Custom date payload:

```json
{
  "name": "Q2 Credit Usage",
  "description": "Credit activity for Q2",
  "reportType": "CREDIT_USAGE_SUMMARY",
  "range": "CUSTOM",
  "from": "2026-04-01T00:00:00.000Z",
  "to": "2026-06-30T23:59:59.999Z",
  "participant": "ALL"
}
```

### Example Request

```bash
curl -X POST \
  "http://localhost:5000/admin/analytics/saved-reports" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "June Full Platform Summary",
    "reportType": "FULL_PLATFORM_SUMMARY",
    "range": "MONTHLY",
    "participant": "ALL"
  }'
```

### Example Response

```json
{
  "success": true,
  "message": "Admin analytics report saved successfully",
  "data": {
    "id": "0c373a00-2b2d-497d-a7f2-b6f5847a71de",
    "reportCode": "ANR-20260624-143025-A82F",
    "name": "June Full Platform Summary",
    "description": null,
    "reportType": "FULL_PLATFORM_SUMMARY",
    "period": "MONTHLY",
    "dateFrom": "2026-06-01T00:00:00.000Z",
    "dateTo": "2026-06-30T23:59:59.999Z",
    "participant": "ALL",
    "filters": {
      "range": "MONTHLY",
      "from": null,
      "to": null,
      "participant": "ALL"
    },
    "snapshotVersion": 1,
    "totalRecords": 4312,
    "status": "READY",
    "generatedById": "admin-user-id",
    "generatedAt": "2026-06-24T14:30:25.000Z",
    "createdAt": "2026-06-24T14:30:25.000Z",
    "updatedAt": "2026-06-24T14:30:25.000Z",
    "deletedAt": null
  }
}
```

Important:
- The saved report stores a snapshot.
- Viewing/exporting saved reports does not recalculate live data.
- Updating saved reports only changes `name` and `description`.

---

## 8. Saved Reports List

### API

```http
GET /admin/analytics/saved-reports
```

### Query Params

| Param | Type | Notes |
|---|---|---|
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |
| `search` | string | Searches `name` and `reportCode` |
| `reportType` | string | Optional |
| `status` | string | `READY`, `FAILED` |
| `generatedFrom` | ISO date | Optional |
| `generatedTo` | ISO date | Optional |
| `sortBy` | string | `generatedAt`, `name`, `reportType`, `status` |
| `sortOrder` | string | `asc`, `desc` |

### Example Request

```bash
curl -X GET \
  "http://localhost:5000/admin/analytics/saved-reports?page=1&limit=20&sortBy=generatedAt&sortOrder=desc" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### Example Response

```json
{
  "success": true,
  "message": "Saved analytics reports fetched successfully",
  "data": {
    "data": [
      {
        "id": "0c373a00-2b2d-497d-a7f2-b6f5847a71de",
        "reportCode": "ANR-20260624-143025-A82F",
        "name": "June Full Platform Summary",
        "description": null,
        "reportType": "FULL_PLATFORM_SUMMARY",
        "period": "MONTHLY",
        "dateFrom": "2026-06-01T00:00:00.000Z",
        "dateTo": "2026-06-30T23:59:59.999Z",
        "participant": "ALL",
        "totalRecords": 4312,
        "status": "READY",
        "generatedAt": "2026-06-24T14:30:25.000Z",
        "generatedBy": {
          "id": "admin-user-id",
          "name": "Admin",
          "email": "admin@example.com"
        }
      }
    ],
    "meta": {
      "currentPage": 1,
      "perPage": 20,
      "totalItems": 1,
      "totalPages": 1,
      "pageItemCount": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

## 9. Saved Report Detail

### API

```http
GET /admin/analytics/saved-reports/:id
```

### Example Request

```bash
curl -X GET \
  "http://localhost:5000/admin/analytics/saved-reports/0c373a00-2b2d-497d-a7f2-b6f5847a71de" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### Example Response

```json
{
  "success": true,
  "message": "Saved analytics report fetched successfully",
  "data": {
    "id": "0c373a00-2b2d-497d-a7f2-b6f5847a71de",
    "reportCode": "ANR-20260624-143025-A82F",
    "name": "June Full Platform Summary",
    "reportType": "FULL_PLATFORM_SUMMARY",
    "period": "MONTHLY",
    "dateFrom": "2026-06-01T00:00:00.000Z",
    "dateTo": "2026-06-30T23:59:59.999Z",
    "participant": "ALL",
    "filters": {
      "range": "MONTHLY",
      "from": null,
      "to": null,
      "participant": "ALL"
    },
    "snapshot": {
      "metadata": {},
      "summary": {},
      "data": {}
    },
    "snapshotVersion": 1,
    "totalRecords": 4312,
    "status": "READY",
    "generatedAt": "2026-06-24T14:30:25.000Z",
    "generatedBy": {
      "id": "admin-user-id",
      "name": "Admin",
      "email": "admin@example.com"
    }
  }
}
```

Frontend rendering:
- Use saved report `snapshot`, not live report API.
- Display `reportCode` prominently for downloaded/audited reports.

---

## 10. Update Saved Report

### API

```http
PATCH /admin/analytics/saved-reports/:id
```

### Payload

```json
{
  "name": "Updated June Summary",
  "description": "Updated internal admin note"
}
```

### Example Request

```bash
curl -X PATCH \
  "http://localhost:5000/admin/analytics/saved-reports/0c373a00-2b2d-497d-a7f2-b6f5847a71de" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated June Summary",
    "description": "Updated internal admin note"
  }'
```

Important:
- Do not send `reportType`, `snapshot`, `filters`, `dateFrom`, `dateTo`, or `generatedById`.
- Backend only allows `name` and `description`.

---

## 11. Delete Saved Report

### API

```http
DELETE /admin/analytics/saved-reports/:id
```

This is a soft delete.

Example:

```bash
curl -X DELETE \
  "http://localhost:5000/admin/analytics/saved-reports/0c373a00-2b2d-497d-a7f2-b6f5847a71de" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

Response:

```json
{
  "success": true,
  "message": "Saved analytics report deleted successfully"
}
```

---

## 12. Regenerate Saved Report

### API

```http
POST /admin/analytics/saved-reports/:id/regenerate
```

### Purpose

Creates a new saved report using the original saved filters.

Behavior:
- If original range was `MONTHLY`, regeneration uses the current month.
- If original range was `CUSTOM`, regeneration uses the same original custom dates.
- Original saved report remains unchanged.
- New saved report gets a new `id` and `reportCode`.

Example:

```bash
curl -X POST \
  "http://localhost:5000/admin/analytics/saved-reports/0c373a00-2b2d-497d-a7f2-b6f5847a71de/regenerate" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

---

## 13. Saved Report Exports

Saved exports use stored snapshots and do not recalculate live analytics.

### Saved PDF

```http
GET /admin/analytics/saved-reports/:id/export/pdf
```

Example:

```bash
curl -L \
  "http://localhost:5000/admin/analytics/saved-reports/0c373a00-2b2d-497d-a7f2-b6f5847a71de/export/pdf" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -o saved-report.pdf
```

### Saved CSV

```http
GET /admin/analytics/saved-reports/:id/export/csv
```

Example:

```bash
curl -L \
  "http://localhost:5000/admin/analytics/saved-reports/0c373a00-2b2d-497d-a7f2-b6f5847a71de/export/csv" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -o saved-report.csv
```

---

## 14. Error Handling

Common errors:

### Missing or invalid token

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Non-admin token

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### Invalid custom date range

```json
{
  "success": false,
  "statusCode": 400,
  "message": "CUSTOM range requires both from and to"
}
```

### Unsupported report type

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Unsupported analytics report type"
}
```

### Saved report not found

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Saved analytics report not found"
}
```

Frontend recommendation:
- Show field-specific validation messages for `range=CUSTOM`.
- Show a permission message for `403`.
- Show a retry option for export failures.

---

## 15. Manual Testing Checklist

### Auth

1. Call `GET /admin/analytics/overview` without token.
2. Expected: `401`.
3. Call with normal user token.
4. Expected: `403`.
5. Call with admin token.
6. Expected: `200`.

### Overview

1. Load `range=DAILY`.
2. Load `range=WEEKLY`.
3. Load `range=MONTHLY`.
4. Load `range=YEARLY`.
5. Load `range=CUSTOM&from=...&to=...`.
6. Confirm marketplace snapshot values have no fake historical snapshot trend.
7. Confirm credit values are displayed as credits, not money.

### Registry

1. Load registry with `metric=ALL&source=ALL`.
2. Filter `metric=TASK_LIFECYCLE_RISK`.
3. Filter `source=GOVERNANCE`.
4. Confirm table row counts load quickly.

### Live Detail

1. Click each registry row.
2. Call `/admin/analytics/reports/:reportType`.
3. Confirm `metadata`, `summary`, and `data` render.

### Exports

1. Export all PDF.
2. Confirm file downloads and opens.
3. Export all CSV.
4. Confirm CSV opens in Excel/Google Sheets.
5. Export one report PDF.
6. Export one report CSV.

### Saved Reports

1. Create saved `FULL_PLATFORM_SUMMARY`.
2. Confirm it appears in saved report list.
3. Open detail.
4. Confirm snapshot exists.
5. Update name/description.
6. Confirm snapshot did not change.
7. Regenerate saved report.
8. Confirm new `id` and `reportCode`.
9. Export saved PDF/CSV.
10. Delete saved report.
11. Confirm it no longer appears in list.

---

## 16. Suggested Frontend File Structure

Example Next.js/Redux structure:

```text
src/
  redux/
    features/
      adminAnalytics/
        adminAnalyticsApi.ts
        adminAnalyticsSlice.ts
        adminAnalyticsTypes.ts
  app/
    admin/
      analytics/
        page.tsx
        components/
          AnalyticsFilters.tsx
          AnalyticsOverviewCards.tsx
          AnalyticsReportRegistry.tsx
          AnalyticsReportDetail.tsx
          SavedReportsTable.tsx
          ExportButtons.tsx
```

Suggested API groups:
- `getAnalyticsOverview`
- `getAnalyticsReportRegistry`
- `getAnalyticsReport`
- `createSavedAnalyticsReport`
- `getSavedAnalyticsReports`
- `getSavedAnalyticsReport`
- `updateSavedAnalyticsReport`
- `deleteSavedAnalyticsReport`
- `regenerateSavedAnalyticsReport`
- `downloadAnalyticsExport`

---

## 17. TypeScript Frontend Types

```ts
export type AnalyticsRange = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export type AnalyticsParticipant = 'ALL' | 'REQUESTER' | 'PROVIDER';

export type AnalyticsReportType =
  | 'WEBSITES_TASKS_SUMMARY'
  | 'CREDIT_USAGE_SUMMARY'
  | 'DAILY_PLATFORM_ACTIVITY'
  | 'FOLLOW_NOFOLLOW_LINKS'
  | 'USER_RETENTION_GROWTH'
  | 'TASK_LIFECYCLE_RISK'
  | 'PROVIDER_PERFORMANCE'
  | 'GOVERNANCE_RISK'
  | 'FULL_PLATFORM_SUMMARY';

export type AnalyticsDataSource =
  | 'ALL'
  | 'PLATFORM_RECORDS'
  | 'TASK_LIFECYCLE'
  | 'PAYMENT_AND_CREDIT_SYSTEM'
  | 'USER_ACTIVITY'
  | 'GOVERNANCE';

export type AnalyticsTrend = {
  current: number;
  previous: number;
  trendPercent: number | null;
  trendDirection: 'UP' | 'DOWN' | 'FLAT' | 'NEW';
};

export type AnalyticsReport = {
  metadata: {
    reportType: AnalyticsReportType;
    reportName: string;
    generatedAt: string;
    range: AnalyticsRange;
    from: string;
    to: string;
    participant: AnalyticsParticipant;
    participantFilterApplied: boolean;
    totalRecords: number;
    snapshotVersion: number;
  };
  summary: Record<string, unknown>;
  data: Record<string, unknown>;
};
```

---

## 18. UX Notes

Use these labels:

| API Field | UI Label |
|---|---|
| `availableWebsites` | Available Websites |
| `activeTasks` | Active Tasks |
| `creditsSpent` | Credits Spent |
| `creditsEarned` | Credits Earned |
| `netCreditFlow` | Net Credit Flow |
| `averageTaskSettlementDays` | Avg Settlement Days |
| `completionRate` | Completion Rate |
| `approvalRate` | Approval Rate |
| `disputeRate` | Dispute Rate |
| `revisionRate` | Revision Rate |

Important UI warnings:
- Do not show credit values as dollars.
- Show snapshot note for marketplace card in tooltip.
- For CSV/PDF downloads, use loading state and disable duplicate clicks.
- For saved reports, show `reportCode`.

