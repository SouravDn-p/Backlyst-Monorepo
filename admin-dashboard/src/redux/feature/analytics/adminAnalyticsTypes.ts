// ── Shared filter / range types ────────────────────────────────────────────
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

export type AnalyticsTrendDirection = 'UP' | 'DOWN' | 'FLAT' | 'NEW';

export type AnalyticsTrend = {
  current: number;
  previous: number;
  trendPercent: number | null;
  trendDirection: AnalyticsTrendDirection;
};

// ── Shared query params ────────────────────────────────────────────────────
export type AnalyticsBaseParams = {
  range?: AnalyticsRange;
  from?: string;
  to?: string;
  participant?: AnalyticsParticipant;
};

// ── Period shape returned in most responses ────────────────────────────────
export type AnalyticsPeriod = {
  range: AnalyticsRange;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  display: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. GET /admin/analytics/overview
// ═══════════════════════════════════════════════════════════════════════════
export type OverviewMarketplace = {
  availableWebsites: number;
  activeTasks: number;
  snapshotNote: string;
  websitesVerifiedThisPeriod: number;
  websitesVerifiedPreviousPeriod: number;
  tasksCreatedThisPeriod: number;
  tasksCreatedPreviousPeriod: number;
  websiteVerificationTrend: AnalyticsTrend;
  taskCreationTrend: AnalyticsTrend;
  activeTaskDefinition: {
    included: string[];
    excluded: string[];
  };
};

export type OverviewCreditEconomy = {
  creditsSpent: number;
  creditsEarned: number;
  creditsRefunded: number;
  creditsExpired: number;
  netCreditFlow: number;
  unit: string; // "platform_credits"
  averageTaskSettlementDays: number;
  settlementTaskCount: number;
  settlementDefinition: string;
};

export type OverviewTaskHealthAndRisk = {
  completionRate: number;
  approvalRate: number;
  disputeRate: number;
  revisionRate: number;
  lateOrOverdueTaskCount: number;
  cancelledTaskCount: number;
  averageLifecycleDurationDays: number;
  completionTrend: AnalyticsTrend;
  taskCreationTrend: AnalyticsTrend;
};

export type AnalyticsOverviewData = {
  period: AnalyticsPeriod;
  filters: { participant: AnalyticsParticipant };
  cards: {
    marketplace: OverviewMarketplace;
    creditEconomy: OverviewCreditEconomy;
    taskHealthAndRisk: OverviewTaskHealthAndRisk;
  };
};

export type AnalyticsOverviewResponse = {
  success: boolean;
  message: string;
  data: AnalyticsOverviewData;
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. GET /admin/analytics/report-registry
// ═══════════════════════════════════════════════════════════════════════════
export type RegistryReportParams = AnalyticsBaseParams & {
  metric?: AnalyticsReportType | 'ALL';
  source?: AnalyticsDataSource;
};

export type LatestSavedReportMeta = {
  id: string;
  reportCode: string;
  generatedAt: string;
};

export type RegistryReportRow = {
  reportType: AnalyticsReportType;
  name: string;
  description: string;
  dataSource: AnalyticsDataSource;
  dateRange: {
    from: string;
    to: string;
    display: string;
  };
  frequency: string;
  totalRecords: number;
  totalRecordsDefinition: string;
  latestSavedReport: LatestSavedReportMeta | null;
};

export type AnalyticsReportRegistryData = {
  period: AnalyticsPeriod;
  filters: {
    metric: string;
    source: string;
    participant: AnalyticsParticipant;
  };
  data: RegistryReportRow[];
};

export type AnalyticsReportRegistryResponse = {
  success: boolean;
  message: string;
  data: AnalyticsReportRegistryData;
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. GET /admin/analytics/reports/:reportType  (live detail)
// ═══════════════════════════════════════════════════════════════════════════
export type LiveReportParams = AnalyticsBaseParams & {
  reportType: AnalyticsReportType;
};

export type LiveReportMetadata = {
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

export type LiveReportData = {
  metadata: LiveReportMetadata;
  summary: Record<string, unknown>;
  data: Record<string, unknown>;
};

export type LiveReportResponse = {
  success: boolean;
  message: string;
  data: LiveReportData;
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. GET /admin/analytics/saved-reports (paginated list)
// ═══════════════════════════════════════════════════════════════════════════
export type SavedReportsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  reportType?: AnalyticsReportType;
  status?: 'READY' | 'FAILED';
  generatedFrom?: string;
  generatedTo?: string;
  sortBy?: 'generatedAt' | 'name' | 'reportType' | 'status';
  sortOrder?: 'asc' | 'desc';
};

export type SavedReportListItem = {
  id: string;
  reportCode: string;
  name: string;
  description: string | null;
  reportType: AnalyticsReportType;
  period: string;
  dateFrom: string;
  dateTo: string;
  participant: AnalyticsParticipant;
  totalRecords: number;
  status: 'READY' | 'FAILED';
  generatedAt: string;
  generatedBy: {
    id: string;
    name: string;
    email: string;
  };
};

export type SavedReportsMeta = {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  pageItemCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type SavedReportsListResponse = {
  success: boolean;
  message: string;
  data: {
    data: SavedReportListItem[];
    meta: SavedReportsMeta;
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. GET /admin/analytics/saved-reports/:id (single with snapshot)
// ═══════════════════════════════════════════════════════════════════════════
export type SavedReportDetail = {
  id: string;
  reportCode: string;
  name: string;
  description: string | null;
  reportType: AnalyticsReportType;
  period: string;
  dateFrom: string;
  dateTo: string;
  participant: AnalyticsParticipant;
  filters: {
    range: AnalyticsRange;
    from: string | null;
    to: string | null;
    participant: AnalyticsParticipant;
  };
  snapshot: {
    metadata?: Record<string, unknown>;
    summary?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
  snapshotVersion: number;
  totalRecords: number;
  status: 'READY' | 'FAILED';
  generatedAt: string;
  generatedBy: {
    id: string;
    name: string;
    email: string;
  };
};

export type SavedReportDetailResponse = {
  success: boolean;
  message: string;
  data: SavedReportDetail;
};

// ═══════════════════════════════════════════════════════════════════════════
// 12. POST /admin/analytics/saved-reports (create)
// ═══════════════════════════════════════════════════════════════════════════
export type CreateSavedReportRequest = {
  name: string;
  description?: string;
  reportType: AnalyticsReportType;
  range: AnalyticsRange;
  from?: string;
  to?: string;
  participant: AnalyticsParticipant;
};

export type CreateSavedReportResponseData = {
  id: string;
  reportCode: string;
  name: string;
  description: string | null;
  reportType: AnalyticsReportType;
  period: string;
  dateFrom: string;
  dateTo: string;
  participant: AnalyticsParticipant;
  filters: {
    range: AnalyticsRange;
    from: string | null;
    to: string | null;
    participant: AnalyticsParticipant;
  };
  snapshotVersion: number;
  totalRecords: number;
  status: 'READY' | 'FAILED';
  generatedById: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateSavedReportResponse = {
  success: boolean;
  message: string;
  data: CreateSavedReportResponseData;
};

// ═══════════════════════════════════════════════════════════════════════════
// 13. PATCH /admin/analytics/saved-reports/:id (update name/description only)
// ═══════════════════════════════════════════════════════════════════════════
export type UpdateSavedReportRequest = {
  id: string;
  name: string;
  description?: string;
};

export type UpdateSavedReportResponse = {
  success: boolean;
  message: string;
  data: CreateSavedReportResponseData;
};

// ═══════════════════════════════════════════════════════════════════════════
// 14. DELETE /admin/analytics/saved-reports/:id (soft delete)
// ═══════════════════════════════════════════════════════════════════════════
export type DeleteSavedReportResponse = {
  success: boolean;
  message: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// 15. POST /admin/analytics/saved-reports/:id/regenerate
// ═══════════════════════════════════════════════════════════════════════════
export type RegenerateSavedReportResponse = {
  success: boolean;
  message: string;
  data: CreateSavedReportResponseData;
};
