import {
  AnalyticsDataSource,
  AnalyticsReportType,
} from '../enums/analytics.enums';
import { AnalyticsReportDefinition } from '../types/analytics.types';

export const ANALYTICS_REPORT_REGISTRY: AnalyticsReportDefinition[] = [
  {
    reportType: AnalyticsReportType.WEBSITES_TASKS_SUMMARY,
    name: 'Websites vs Task Summary',
    description:
      'Marketplace supply and task workload summary without visibility metrics.',
    dataSource: AnalyticsDataSource.PLATFORM_RECORDS,
    totalRecordsDefinition:
      'Matching non-deleted websites plus matching placement tasks.',
  },
  {
    reportType: AnalyticsReportType.CREDIT_USAGE_SUMMARY,
    name: 'Credit Usage Summary',
    description:
      'Platform credit ledger movement, in credit units rather than currency.',
    dataSource: AnalyticsDataSource.PAYMENT_AND_CREDIT_SYSTEM,
    totalRecordsDefinition:
      'Matching CreditLog rows in the selected date range.',
  },
  {
    reportType: AnalyticsReportType.DAILY_PLATFORM_ACTIVITY,
    name: 'Daily Platform Activity',
    description:
      'Daily users, websites, tasks, task-flow events, messages, and credit ledger activity.',
    dataSource: AnalyticsDataSource.USER_ACTIVITY,
    totalRecordsDefinition:
      'Aggregated daily records across supported platform activity sources.',
  },
  {
    reportType: AnalyticsReportType.FOLLOW_NOFOLLOW_LINKS,
    name: 'Follow vs No-follow Links',
    description: 'Approved completed placement link attribute distribution.',
    dataSource: AnalyticsDataSource.TASK_LIFECYCLE,
    totalRecordsDefinition:
      'Approved completed placement tasks in the selected date range.',
  },
  {
    reportType: AnalyticsReportType.USER_RETENTION_GROWTH,
    name: 'User Retention and Growth',
    description: 'Rolling active-user retention based on session activity.',
    dataSource: AnalyticsDataSource.USER_ACTIVITY,
    totalRecordsDefinition:
      'Users and session records matching the selected period.',
  },
  {
    reportType: AnalyticsReportType.TASK_LIFECYCLE_RISK,
    name: 'Task Lifecycle and Risk',
    description:
      'Task lifecycle, late, revision, cancellation, dispute, and duration metrics.',
    dataSource: AnalyticsDataSource.TASK_LIFECYCLE,
    totalRecordsDefinition: 'Matching placement tasks and task-flow events.',
  },
  {
    reportType: AnalyticsReportType.PROVIDER_PERFORMANCE,
    name: 'Provider Performance',
    description:
      'Selected provider delivery and quality metrics from existing task records.',
    dataSource: AnalyticsDataSource.TASK_LIFECYCLE,
    totalRecordsDefinition:
      'Tasks with selected providers in the selected date range.',
  },
  {
    reportType: AnalyticsReportType.GOVERNANCE_RISK,
    name: 'Governance and Risk',
    description:
      'Admin-safe governance counts from users, websites, tasks, messages, and reports.',
    dataSource: AnalyticsDataSource.GOVERNANCE,
    totalRecordsDefinition:
      'Supported governance and risk records in the selected date range.',
  },
];

export const FULL_PLATFORM_REPORT_DEFINITION: AnalyticsReportDefinition = {
  reportType: AnalyticsReportType.FULL_PLATFORM_SUMMARY,
  name: 'Full Platform Summary',
  description: 'Combined snapshot of all eight analytics report sections.',
  dataSource: AnalyticsDataSource.ALL,
  totalRecordsDefinition: 'Sum of component report total records.',
};

export function getAnalyticsReportDefinition(reportType: AnalyticsReportType) {
  return reportType === AnalyticsReportType.FULL_PLATFORM_SUMMARY
    ? FULL_PLATFORM_REPORT_DEFINITION
    : ANALYTICS_REPORT_REGISTRY.find(
        (report) => report.reportType === reportType,
      );
}
