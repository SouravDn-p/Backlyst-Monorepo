import {
  AnalyticsDataSource,
  AnalyticsParticipant,
  AnalyticsRange,
  AnalyticsReportType,
} from '../enums/analytics.enums';

export type AnalyticsDateRange = {
  range: AnalyticsRange;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  display: string;
};

export type AnalyticsFilters = {
  range: AnalyticsRange;
  from?: string;
  to?: string;
  participant: AnalyticsParticipant;
  source?: AnalyticsDataSource;
};

export type AnalyticsTrendDirection = 'UP' | 'DOWN' | 'FLAT' | 'NEW';

export type AnalyticsTrend = {
  current: number;
  previous: number;
  trendPercent: number | null;
  trendDirection: AnalyticsTrendDirection;
};

export type AnalyticsReportDefinition = {
  reportType: AnalyticsReportType;
  name: string;
  description: string;
  dataSource: AnalyticsDataSource;
  totalRecordsDefinition: string;
};

export type BuiltAnalyticsReport = {
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
