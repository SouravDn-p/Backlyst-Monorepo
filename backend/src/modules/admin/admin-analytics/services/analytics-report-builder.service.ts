import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ANALYTICS_REPORT_REGISTRY,
  getAnalyticsReportDefinition,
} from '../registry/analytics-report.registry';
import {
  AnalyticsParticipant,
  AnalyticsRange,
  AnalyticsReportType,
} from '../enums/analytics.enums';
import {
  AnalyticsDateRange,
  BuiltAnalyticsReport,
} from '../types/analytics.types';
import {
  average,
  calculateRate,
  calculateTrend,
} from '../utils/analytics-rate.util';

const ACTIVE_TASK_STATUSES = [
  'OPEN',
  'WAITING_FOR_APPLICANTS',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REVISION_REQUESTED',
];

const TERMINAL_TASK_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'REJECTED',
  'APPROVED',
  'DISPUTED',
  'FROZEN',
];

type PartialBuiltAnalyticsReport = {
  metadata: {
    totalRecords: number;
    participantFilterApplied: boolean;
  };
  summary: Record<string, unknown>;
  data: Record<string, unknown>;
};

@Injectable()
export class AnalyticsReportBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildReport(
    reportType: AnalyticsReportType,
    period: AnalyticsDateRange,
    participant = AnalyticsParticipant.ALL,
  ): Promise<BuiltAnalyticsReport> {
    if (reportType === AnalyticsReportType.FULL_PLATFORM_SUMMARY) {
      return this.buildFullPlatformSummary(period, participant);
    }

    const definition = getAnalyticsReportDefinition(reportType);
    if (!definition) {
      throw new BadRequestException('Unsupported analytics report type');
    }

    const reportMap: Record<
      AnalyticsReportType,
      () => Promise<PartialBuiltAnalyticsReport | BuiltAnalyticsReport>
    > = {
      [AnalyticsReportType.WEBSITES_TASKS_SUMMARY]: () =>
        this.buildWebsitesTasksSummary(period, participant),
      [AnalyticsReportType.CREDIT_USAGE_SUMMARY]: () =>
        this.buildCreditUsageSummary(period),
      [AnalyticsReportType.DAILY_PLATFORM_ACTIVITY]: () =>
        this.buildDailyPlatformActivity(period),
      [AnalyticsReportType.FOLLOW_NOFOLLOW_LINKS]: () =>
        this.buildFollowNoFollowLinks(period, participant),
      [AnalyticsReportType.USER_RETENTION_GROWTH]: () =>
        this.buildUserRetentionGrowth(period),
      [AnalyticsReportType.TASK_LIFECYCLE_RISK]: () =>
        this.buildTaskLifecycleRisk(period, participant),
      [AnalyticsReportType.PROVIDER_PERFORMANCE]: () =>
        this.buildProviderPerformance(period),
      [AnalyticsReportType.GOVERNANCE_RISK]: () =>
        this.buildGovernanceRisk(period),
      [AnalyticsReportType.FULL_PLATFORM_SUMMARY]: () =>
        this.buildFullPlatformSummary(period, participant),
    };

    const built = (await reportMap[
      reportType
    ]());
    return {
      metadata: {
        ...this.baseMetadata(
          reportType,
          period,
          participant,
          built.metadata.totalRecords,
        ),
        participantFilterApplied: built.metadata.participantFilterApplied,
      },
      summary: built.summary,
      data: built.data,
    };
  }

  async getReportTotalRecords(
    reportType: AnalyticsReportType,
    period: AnalyticsDateRange,
    participant = AnalyticsParticipant.ALL,
  ) {
    if (reportType === AnalyticsReportType.FULL_PLATFORM_SUMMARY) return 0;
    const report = await this.buildReport(reportType, period, participant);
    return report.metadata.totalRecords;
  }

  async getReportRegistryCount(
    reportType: AnalyticsReportType,
    period: AnalyticsDateRange,
    participant = AnalyticsParticipant.ALL,
  ) {
    const taskWhere = {
      ...this.dateWhere('createdAt', period),
      ...this.participantTaskWhere(participant),
    };

    switch (reportType) {
      case AnalyticsReportType.WEBSITES_TASKS_SUMMARY: {
        const [websites, tasks] = await Promise.all([
          this.prisma.website.count({
            where: { isDeleted: false, ...this.dateWhere('createdAt', period) },
          }),
          this.prisma.placementTask.count({ where: taskWhere as any }),
        ]);
        return websites + tasks;
      }
      case AnalyticsReportType.CREDIT_USAGE_SUMMARY:
        return this.prisma.creditLog.count({
          where: this.dateWhere('createdAt', period),
        });
      case AnalyticsReportType.DAILY_PLATFORM_ACTIVITY: {
        const [users, sessions, websites, tasks, flows, messages, credits] =
          await Promise.all([
            this.prisma.user.count({
              where: {
                role: 'USER',
                status: 'ACTIVE',
                isDeleted: false,
                ...this.dateWhere('createdAt', period),
              },
            }),
            this.prisma.session.count({
              where: {
                loginAt: { gte: period.from, lte: period.to },
                user: { role: 'USER', status: 'ACTIVE', isDeleted: false },
              },
            }),
            this.prisma.website.count({
              where: {
                isDeleted: false,
                ...this.dateWhere('createdAt', period),
              },
            }),
            this.prisma.placementTask.count({
              where: this.dateWhere('createdAt', period),
            }),
            this.prisma.taskFlow.count({
              where: this.dateWhere('createdAt', period),
            }),
            this.prisma.message.count({
              where: this.dateWhere('createdAt', period),
            }),
            this.prisma.creditLog.count({
              where: this.dateWhere('createdAt', period),
            }),
          ]);
        return users + sessions + websites + tasks + flows + messages + credits;
      }
      case AnalyticsReportType.FOLLOW_NOFOLLOW_LINKS:
        return this.prisma.placementTask.count({
          where: this.completedApprovedWhere(period) as any,
        });
      case AnalyticsReportType.USER_RETENTION_GROWTH: {
        const users = await this.distinctSessionUsers(period.from, period.to);
        return users.length;
      }
      case AnalyticsReportType.TASK_LIFECYCLE_RISK:
        return this.prisma.placementTask.count({ where: taskWhere as any });
      case AnalyticsReportType.PROVIDER_PERFORMANCE:
        return this.prisma.placementTask.count({
          where: this.providerAssignedCohortWhere(period) as any,
        });
      case AnalyticsReportType.GOVERNANCE_RISK:
        return this.prisma.messageReport.count({
          where: this.dateWhere('createdAt', period),
        });
      default:
        return 0;
    }
  }

  private baseMetadata(
    reportType: AnalyticsReportType,
    period: AnalyticsDateRange,
    participant: AnalyticsParticipant,
    totalRecords: number,
  ) {
    const definition = getAnalyticsReportDefinition(reportType);
    return {
      reportType,
      reportName: definition?.name ?? reportType,
      generatedAt: new Date().toISOString(),
      range: period.range,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      participant,
      participantFilterApplied: false,
      totalRecords,
      snapshotVersion: 1,
    };
  }

  private dateWhere(field = 'createdAt', period: AnalyticsDateRange) {
    return { [field]: { gte: period.from, lte: period.to } };
  }

  private previousDateWhere(field = 'createdAt', period: AnalyticsDateRange) {
    return { [field]: { gte: period.previousFrom, lte: period.previousTo } };
  }

  private participantTaskWhere(participant: AnalyticsParticipant) {
    if (participant === AnalyticsParticipant.PROVIDER) {
      return {
        OR: [
          { selectedProviderId: { not: null } },
          { placementApplications: { some: {} } },
        ],
      };
    }

    return {};
  }

  private isTaskParticipantFilterApplied(participant: AnalyticsParticipant) {
    return participant === AnalyticsParticipant.PROVIDER;
  }

  private completedApprovedWhere(period: AnalyticsDateRange) {
    return {
      lifecycleStatus: 'COMPLETED',
      submissionStatus: 'APPROVED',
      completedAt: { gte: period.from, lte: period.to },
    };
  }

  private providerAssignedCohortWhere(period: AnalyticsDateRange) {
    return {
      selectedProviderId: { not: null },
      assignedAt: { gte: period.from, lte: period.to },
    };
  }

  private async buildWebsitesTasksSummary(
    period: AnalyticsDateRange,
    participant: AnalyticsParticipant,
  ) {
    const taskWhere = {
      ...this.dateWhere('createdAt', period),
      ...this.participantTaskWhere(participant),
    };
    const previousTaskWhere = {
      ...this.previousDateWhere('createdAt', period),
      ...this.participantTaskWhere(participant),
    };

    const [
      currentVerifiedWebsites,
      previousVerifiedWebsites,
      websitesCreated,
      websitesVerified,
      flaggedWebsites,
      tasksCreated,
      previousTasksCreated,
      activeTasks,
      completedTasks,
      cancelledTasks,
      disputedTasks,
      placementTypeBreakdown,
      lifecycleStatusBreakdown,
      requesterRows,
      providerRows,
    ] = await Promise.all([
      this.prisma.website.count({
        where: {
          verificationStatus: 'VERIFIED',
          isDeleted: false,
          isFlag: false,
        },
      }),
      this.prisma.website.count({
        where: {
          verificationStatus: 'VERIFIED',
          isDeleted: false,
          isFlag: false,
          verifiedAt: { gte: period.previousFrom, lte: period.previousTo },
        },
      }),
      this.prisma.website.count({
        where: { isDeleted: false, ...this.dateWhere('createdAt', period) },
      }),
      this.prisma.website.count({
        where: {
          isDeleted: false,
          verificationStatus: 'VERIFIED',
          verifiedAt: { gte: period.from, lte: period.to },
        },
      }),
      this.prisma.website.count({ where: { isDeleted: false, isFlag: true } }),
      this.prisma.placementTask.count({ where: taskWhere as any }),
      this.prisma.placementTask.count({ where: previousTaskWhere as any }),
      this.prisma.placementTask.count({
        where: {
          lifecycleStatus: { in: ACTIVE_TASK_STATUSES as any },
          ...this.participantTaskWhere(participant),
        } as any,
      }),
      this.prisma.placementTask.count({
        where: {
          ...taskWhere,
          lifecycleStatus: 'COMPLETED',
          submissionStatus: 'APPROVED',
        } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...taskWhere, lifecycleStatus: 'CANCELLED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...taskWhere, lifecycleStatus: 'DISPUTED' } as any,
      }),
      this.prisma.placementTask.groupBy({
        by: ['placementType'],
        where: taskWhere as any,
        _count: { _all: true },
      }),
      this.prisma.placementTask.groupBy({
        by: ['lifecycleStatus'],
        where: taskWhere as any,
        _count: { _all: true },
      }),
      this.prisma.placementTask.findMany({
        where: taskWhere as any,
        distinct: ['requesterId'],
        select: { requesterId: true },
      }),
      this.prisma.placementTask.findMany({
        where: { ...taskWhere, selectedProviderId: { not: null } } as any,
        distinct: ['selectedProviderId'],
        select: { selectedProviderId: true },
      }),
    ]);

    const totalRecords = websitesCreated + tasksCreated;
    return {
      metadata: {
        totalRecords,
        participantFilterApplied:
          this.isTaskParticipantFilterApplied(participant),
      },
      summary: {
        currentVerifiedWebsites,
        websitesVerifiedThisPeriod: websitesVerified,
        websitesVerifiedPreviousPeriod: previousVerifiedWebsites,
        tasksCreated,
        previousTasksCreated,
        activeTasks,
        completedTasks,
        cancelledTasks,
        disputedTasks,
        trend: {
          websiteVerifications: calculateTrend(
            websitesVerified,
            previousVerifiedWebsites,
          ),
          tasksCreated: calculateTrend(tasksCreated, previousTasksCreated),
        },
        snapshotNote:
          'currentVerifiedWebsites and activeTasks are current-state snapshots; trends use period activity because historical snapshots are not stored.',
      },
      data: {
        websitesCreated,
        websitesVerified,
        flaggedWebsites,
        requesterCount: requesterRows.length,
        selectedProviderCount: providerRows.length,
        placementTypeBreakdown,
        lifecycleStatusBreakdown,
        activeTaskDefinition: {
          included: ACTIVE_TASK_STATUSES,
          excludedTerminalOrRisk: TERMINAL_TASK_STATUSES,
        },
      },
    };
  }

  private async buildCreditUsageSummary(period: AnalyticsDateRange) {
    const where = this.dateWhere('createdAt', period);
    const [
      actionGroups,
      creditTypeGroups,
      reasonGroups,
      totalRecords,
      settlement,
    ] = await Promise.all([
      this.prisma.creditLog.groupBy({
        by: ['action'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.creditLog.groupBy({
        by: ['creditType'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.creditLog.groupBy({
        by: ['reason'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.creditLog.count({ where }),
      this.getSettlementMetrics(period),
    ]);

    const sumByAction = Object.fromEntries(
      actionGroups.map((group) => [group.action, group._sum.amount ?? 0]),
    );
    const creditsAdded = sumByAction.ADD ?? 0;
    const creditsSpent = sumByAction.SPEND ?? 0;
    const creditsRewarded = sumByAction.REWARD ?? 0;
    const creditsRefunded = sumByAction.REFUND ?? 0;
    const creditsExpired = sumByAction.EXPIRE ?? 0;
    const netCreditFlow =
      creditsAdded +
      creditsRewarded +
      creditsRefunded -
      creditsSpent -
      creditsExpired;

    return {
      metadata: { totalRecords, participantFilterApplied: false },
      summary: {
        creditsAdded,
        creditsSpent,
        creditsRewarded,
        creditsRefunded,
        creditsExpired,
        netCreditFlow,
        averageSettlementDays: settlement.averageSettlementDays,
        settlementTaskCount: settlement.taskCount,
      },
      data: {
        actionBreakdown: actionGroups,
        creditTypeBreakdown: creditTypeGroups,
        reasonBreakdown: reasonGroups,
        unit: 'platform_credits',
      },
    };
  }

  private async buildDailyPlatformActivity(period: AnalyticsDateRange) {
    const [
      users,
      sessions,
      websites,
      tasks,
      completedTasks,
      flows,
      messages,
      credits,
    ] = await Promise.all([
      this.dailyCount('"User"', '"createdAt"', period),
      this.dailyActiveUserCount(period),
      this.dailyCount('"Website"', '"createdAt"', period),
      this.dailyCount('"PlacementTask"', '"createdAt"', period),
      this.dailyCount(
        '"PlacementTask"',
        '"completedAt"',
        period,
        'COUNT(*)',
        `"completedAt" IS NOT NULL AND "lifecycleStatus" = 'COMPLETED' AND "submissionStatus" = 'APPROVED'`,
      ),
      this.dailyCount('"TaskFlow"', '"createdAt"', period),
      this.dailyCount('"Message"', '"createdAt"', period),
      this.dailyCount('"CreditLog"', '"createdAt"', period),
    ]);

    const series = this.mergeDailySeries(
      {
        newUsers: users,
        activeUsers: sessions,
        newWebsites: websites,
        tasksCreated: tasks,
        tasksCompleted: completedTasks,
        taskFlowEvents: flows,
        messagesSent: messages,
        creditLedgerEntries: credits,
      },
      period,
    );

    const totalEvents = series.reduce(
      (sum, row: any) => sum + row.totalActivityEvents,
      0,
    );
    return {
      metadata: { totalRecords: totalEvents, participantFilterApplied: false },
      summary: { totalActivityEvents: totalEvents, days: series.length },
      data: { series },
    };
  }

  private async buildFollowNoFollowLinks(
    period: AnalyticsDateRange,
    participant: AnalyticsParticipant,
  ) {
    const where = this.completedApprovedWhere(period);

    const [attributeGroups, placementGroups, total] = await Promise.all([
      this.prisma.placementTask.groupBy({
        by: ['linkAttribute'],
        where: where as any,
        _count: { _all: true },
      }),
      this.prisma.placementTask.groupBy({
        by: ['placementType'],
        where: where as any,
        _count: { _all: true },
      }),
      this.prisma.placementTask.count({ where: where as any }),
    ]);

    const counts = Object.fromEntries(
      attributeGroups.map((group) => [group.linkAttribute, group._count._all]),
    );
    const followCount = counts.DOFOLLOW ?? 0;
    const nonFollowCount =
      (counts.NOFOLLOW ?? 0) + (counts.UGC ?? 0) + (counts.SPONSORED ?? 0);

    return {
      metadata: {
        totalRecords: total,
        participantFilterApplied: false,
      },
      summary: {
        dofollow: counts.DOFOLLOW ?? 0,
        nofollow: counts.NOFOLLOW ?? 0,
        ugc: counts.UGC ?? 0,
        sponsored: counts.SPONSORED ?? 0,
        followCount,
        nonFollowCount,
        totalApprovedCompletedPlacements: total,
        followRatio: calculateRate(followCount, total),
        nonFollowRatio: calculateRate(nonFollowCount, total),
      },
      data: {
        linkAttributeBreakdown: attributeGroups,
        placementTypeBreakdown: placementGroups,
      },
    };
  }

  private async buildUserRetentionGrowth(period: AnalyticsDateRange) {
    const [
      newUsers,
      activeUsers,
      previousActiveUsers,
      userStatusBreakdown,
      dailyActive,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: 'USER',
          status: 'ACTIVE',
          isDeleted: false,
          ...this.dateWhere('createdAt', period),
        },
      }),
      this.distinctSessionUsers(period.from, period.to),
      this.distinctSessionUsers(period.previousFrom, period.previousTo),
      this.prisma.user.groupBy({
        by: ['status'],
        where: { createdAt: { lte: period.to } },
        _count: { _all: true },
      }),
      this.dailyActiveUserCount(period),
    ]);

    const activeSet = new Set(activeUsers);
    const previousSet = new Set(previousActiveUsers);
    const retainedUsers = previousActiveUsers.filter((userId) =>
      activeSet.has(userId),
    ).length;
    const returningUsers = activeUsers.filter((userId) =>
      previousSet.has(userId),
    ).length;
    const churnedActiveUsers = previousActiveUsers.length - retainedUsers;

    return {
      metadata: {
        totalRecords: activeUsers.length + newUsers,
        participantFilterApplied: false,
      },
      summary: {
        newUsers,
        activeUsers: activeUsers.length,
        returningUsers,
        retainedUsers,
        previousPeriodActiveUsers: previousActiveUsers.length,
        churnedActiveUsers,
        retentionRate: calculateRate(retainedUsers, previousActiveUsers.length),
        retentionDefinition:
          'Users active in the previous period who were also active in the current period divided by users active in the previous period.',
      },
      data: {
        dailyActiveUsers: dailyActive,
        userStatusBreakdown,
      },
    };
  }

  private async buildTaskLifecycleRisk(
    period: AnalyticsDateRange,
    participant: AnalyticsParticipant,
  ) {
    const where = {
      ...this.dateWhere('createdAt', period),
      ...this.participantTaskWhere(participant),
    };

    const [
      statusBreakdown,
      created,
      selected,
      inProgress,
      submitted,
      revisionRequested,
      approvedCompleted,
      rejected,
      cancelled,
      expired,
      frozen,
      disputed,
      late,
      flowEvents,
      completionDurations,
      reviewDurations,
    ] = await Promise.all([
      this.prisma.placementTask.groupBy({
        by: ['lifecycleStatus'],
        where: where as any,
        _count: { _all: true },
      }),
      this.prisma.placementTask.count({ where: where as any }),
      this.prisma.placementTask.count({
        where: { ...where, selectedProviderId: { not: null } } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'IN_PROGRESS' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'SUBMITTED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'REVISION_REQUESTED' } as any,
      }),
      this.prisma.placementTask.count({
        where: {
          ...where,
          lifecycleStatus: 'COMPLETED',
          submissionStatus: 'APPROVED',
        } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'REJECTED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'CANCELLED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'EXPIRED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'FROZEN' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, lifecycleStatus: 'DISPUTED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...where, isLate: true } as any,
      }),
      this.prisma.taskFlow.groupBy({
        by: ['eventType'],
        where: this.dateWhere('createdAt', period) as any,
        _count: { _all: true },
      }),
      this.getTaskDurationDays(period, 'publishedAt', 'completedAt'),
      this.getTaskDurationDays(period, 'submittedAt', 'approvedAt'),
    ]);

    return {
      metadata: {
        totalRecords: created,
        participantFilterApplied:
          this.isTaskParticipantFilterApplied(participant),
      },
      summary: {
        created,
        providerSelected: selected,
        startedOrInProgress: inProgress,
        submitted,
        revisionRequested,
        approvedCompleted,
        rejected,
        cancelled,
        expired,
        frozen,
        disputed,
        lateOrOverdue: late,
        completionRate: calculateRate(approvedCompleted, created),
        approvalRate: calculateRate(
          approvedCompleted,
          submitted + approvedCompleted + revisionRequested + disputed,
        ),
        revisionRate: calculateRate(
          revisionRequested,
          submitted + approvedCompleted + revisionRequested + disputed,
        ),
        cancellationRate: calculateRate(cancelled, created),
        disputeRate: calculateRate(disputed, created),
        averageCompletionDurationDays: average(completionDurations),
        averageReviewDurationDays: average(reviewDurations),
      },
      data: { statusBreakdown, taskFlowEventBreakdown: flowEvents },
    };
  }

  private async buildProviderPerformance(period: AnalyticsDateRange) {
    const selectedWhere = this.providerAssignedCohortWhere(period);
    const completedWhere = {
      ...selectedWhere,
      lifecycleStatus: 'COMPLETED',
      submissionStatus: 'APPROVED',
    };

    const [
      selectedProviderRows,
      activeProviderRows,
      completedTasks,
      submittedTasks,
      revisions,
      disputes,
      lateTasks,
      taskCount,
      topProviderGroups,
      completionDurations,
    ] = await Promise.all([
      this.prisma.placementTask.findMany({
        where: selectedWhere as any,
        distinct: ['selectedProviderId'],
        select: { selectedProviderId: true },
      }),
      this.prisma.placementTask.findMany({
        where: {
          ...selectedWhere,
          lifecycleStatus: { in: ACTIVE_TASK_STATUSES as any },
        } as any,
        distinct: ['selectedProviderId'],
        select: { selectedProviderId: true },
      }),
      this.prisma.placementTask.count({ where: completedWhere as any }),
      this.prisma.placementTask.count({
        where: { ...selectedWhere, submittedAt: { not: null } } as any,
      }),
      this.prisma.placementTask.count({
        where: {
          ...selectedWhere,
          lifecycleStatus: 'REVISION_REQUESTED',
        } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...selectedWhere, lifecycleStatus: 'DISPUTED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...selectedWhere, isLate: true } as any,
      }),
      this.prisma.placementTask.count({ where: selectedWhere as any }),
      this.prisma.placementTask.groupBy({
        by: ['selectedProviderId'],
        where: completedWhere as any,
        _count: { _all: true },
        orderBy: { _count: { selectedProviderId: 'desc' } },
        take: 10,
      }),
      this.getProviderCohortCompletionDurationDays(period),
    ]);

    const providerIds = topProviderGroups
      .map((group) => group.selectedProviderId)
      .filter(Boolean) as string[];
    const providers = await this.prisma.user.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, name: true, email: true },
    });
    const providerMap = new Map(
      providers.map((provider) => [provider.id, provider]),
    );

    return {
      metadata: { totalRecords: taskCount, participantFilterApplied: true },
      summary: {
        distinctSelectedProviders: selectedProviderRows.length,
        activeProviders: activeProviderRows.length,
        completedTasks,
        submittedTasks,
        revisionRequestedTasks: revisions,
        disputedTasks: disputes,
        lateTasks,
        approvalRate: calculateRate(
          completedTasks,
          submittedTasks + completedTasks + revisions + disputes,
        ),
        completionRate: calculateRate(completedTasks, taskCount),
        revisionRate: calculateRate(
          revisions,
          submittedTasks + completedTasks + revisions + disputes,
        ),
        disputeRate: calculateRate(disputes, taskCount),
        lateDeliveryRate: calculateRate(lateTasks, taskCount),
        averageCompletionDurationDays: average(completionDurations),
      },
      data: {
        topProviders: topProviderGroups.map((group) => ({
          provider: group.selectedProviderId
            ? (providerMap.get(group.selectedProviderId) ?? null)
            : null,
          approvedCompletedTasks: group._count._all,
        })),
      },
    };
  }

  private async buildGovernanceRisk(period: AnalyticsDateRange) {
    const [
      userStatusBreakdown,
      deletedUsers,
      flaggedWebsites,
      frozenTasks,
      disputedTasks,
      flaggedMessages,
      restrictedMessages,
      openMessageReports,
      reviewedReports,
    ] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['status'],
        where: { createdAt: { lte: period.to } },
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: {
          isDeleted: true,
          updatedAt: { gte: period.from, lte: period.to },
        },
      }),
      this.prisma.website.count({ where: { isDeleted: false, isFlag: true } }),
      this.prisma.placementTask.count({ where: { lifecycleStatus: 'FROZEN' } }),
      this.prisma.placementTask.count({
        where: { lifecycleStatus: 'DISPUTED' },
      }),
      this.prisma.message.count({
        where: { registryStatus: 'FLAGGED', createdAt: { lte: period.to } },
      }),
      this.prisma.message.count({
        where: { registryStatus: 'RESTRICTED', createdAt: { lte: period.to } },
      }),
      this.prisma.messageReport.count({ where: { status: 'PENDING' } }),
      this.prisma.messageReport.count({
        where: { status: { in: ['REVIEWED', 'ACTION_TAKEN'] as any } },
      }),
    ]);

    const statusMap = Object.fromEntries(
      userStatusBreakdown.map((group) => [group.status, group._count._all]),
    );

    return {
      metadata: {
        totalRecords:
          deletedUsers +
          flaggedWebsites +
          frozenTasks +
          disputedTasks +
          flaggedMessages +
          restrictedMessages +
          openMessageReports +
          reviewedReports,
        participantFilterApplied: false,
      },
      summary: {
        currentState: {
          activeUsers: statusMap.ACTIVE ?? 0,
          suspendedUsers: statusMap.SUSPENDED ?? 0,
          bannedUsers: statusMap.BANNED ?? 0,
          flaggedWebsites,
          frozenTasks,
          disputedTasks,
          flaggedMessages,
          restrictedMessages,
          openMessageReports,
          reviewedMessageReports: reviewedReports,
        },
        periodActivity: {
          deletedUsers,
        },
      },
      data: {
        userStatusBreakdown,
        supportedMetrics: [
          'user statuses',
          'deleted users',
          'flagged websites',
          'frozen/disputed tasks',
          'message registry status',
          'message report review status',
        ],
        omittedMetrics: ['visibility events', 'private message bodies'],
      },
    };
  }

  private async buildFullPlatformSummary(
    period: AnalyticsDateRange,
    participant: AnalyticsParticipant,
  ): Promise<BuiltAnalyticsReport> {
    const componentTypes = ANALYTICS_REPORT_REGISTRY.map(
      (report) => report.reportType,
    );
    const reports = await Promise.all(
      componentTypes.map((reportType) =>
        this.buildReport(reportType, period, participant),
      ),
    );
    const totalRecords = reports.reduce(
      (sum, report) => sum + report.metadata.totalRecords,
      0,
    );

    return {
      metadata: this.baseMetadata(
        AnalyticsReportType.FULL_PLATFORM_SUMMARY,
        period,
        participant,
        totalRecords,
      ),
      summary: {
        reportCount: reports.length,
        totalRecords,
        generatedSections: componentTypes,
      },
      data: {
        sections: Object.fromEntries(
          reports.map((report) => [
            report.metadata.reportType,
            { summary: report.summary, data: report.data },
          ]),
        ),
      },
    };
  }

  private async getSettlementMetrics(period: AnalyticsDateRange) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        lifecycleStatus: 'COMPLETED',
        submissionStatus: 'APPROVED',
        publishedAt: { not: null },
        completedAt: { gte: period.from, lte: period.to },
      } as any,
      select: { publishedAt: true, completedAt: true },
    });

    const durations = tasks
      .filter((task) => task.publishedAt && task.completedAt)
      .map((task) => {
        const diff = task.completedAt!.getTime() - task.publishedAt!.getTime();
        return diff / (24 * 60 * 60 * 1000);
      });

    return {
      taskCount: durations.length,
      averageSettlementDays: average(durations),
    };
  }

  private async getTaskDurationDays(
    period: AnalyticsDateRange,
    fromField: 'publishedAt' | 'assignedAt' | 'submittedAt',
    toField: 'completedAt' | 'approvedAt',
  ) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        [fromField]: { not: null },
        [toField]: { gte: period.from, lte: period.to },
      } as any,
      select: { [fromField]: true, [toField]: true } as any,
    });

    return tasks
      .filter((task: any) => task[fromField] && task[toField])
      .map(
        (task: any) =>
          (task[toField].getTime() - task[fromField].getTime()) /
          (24 * 60 * 60 * 1000),
      );
  }

  private async distinctSessionUsers(from: Date, to: Date) {
    const rows = await this.prisma.session.findMany({
      where: {
        loginAt: { gte: from, lte: to },
        user: {
          role: 'USER',
          status: 'ACTIVE',
          isDeleted: false,
        },
      },
      distinct: ['userId'],
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }

  private async dailyActiveUserCount(period: AnalyticsDateRange) {
    return this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', s."loginAt")::date AS day, COUNT(DISTINCT s."userId")::bigint AS count
      FROM "Session" s
      INNER JOIN "User" u ON u."id" = s."userId"
      WHERE s."loginAt" >= ${period.from}
        AND s."loginAt" <= ${period.to}
        AND u."role" = 'USER'
        AND u."status" = 'ACTIVE'
        AND u."isDeleted" = false
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  private async getProviderCohortCompletionDurationDays(
    period: AnalyticsDateRange,
  ) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        ...this.providerAssignedCohortWhere(period),
        completedAt: { not: null },
      } as any,
      select: { assignedAt: true, completedAt: true },
    });

    return tasks
      .filter((task) => task.assignedAt && task.completedAt)
      .map(
        (task) =>
          (task.completedAt!.getTime() - task.assignedAt!.getTime()) /
          (24 * 60 * 60 * 1000),
      );
  }

  private async dailyCount(
    table: string,
    field: string,
    period: AnalyticsDateRange,
    aggregate = 'COUNT(*)',
    extraCondition?: string,
  ) {
    const condition = extraCondition
      ? Prisma.raw(`AND ${extraCondition}`)
      : Prisma.empty;
    return this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', ${Prisma.raw(field)})::date AS day, ${Prisma.raw(aggregate)}::bigint AS count
      FROM ${Prisma.raw(table)}
      WHERE ${Prisma.raw(field)} >= ${period.from}
        AND ${Prisma.raw(field)} <= ${period.to}
        ${condition}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  private mergeDailySeries(
    seriesMap: Record<string, { day: Date; count: bigint }[]>,
    period: AnalyticsDateRange,
  ) {
    const byDay = new Map<string, any>();
    const metricNames = Object.keys(seriesMap);
    const cursor = new Date(
      Date.UTC(
        period.from.getUTCFullYear(),
        period.from.getUTCMonth(),
        period.from.getUTCDate(),
      ),
    );
    const end = new Date(
      Date.UTC(
        period.to.getUTCFullYear(),
        period.to.getUTCMonth(),
        period.to.getUTCDate(),
      ),
    );

    while (cursor <= end) {
      const day = cursor.toISOString().slice(0, 10);
      byDay.set(day, {
        date: day,
        totalActivityEvents: 0,
        ...Object.fromEntries(metricNames.map((metric) => [metric, 0])),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const [metric, rows] of Object.entries(seriesMap)) {
      for (const row of rows) {
        const day = new Date(row.day).toISOString().slice(0, 10);
        const existing = byDay.get(day) ?? {
          date: day,
          totalActivityEvents: 0,
          ...Object.fromEntries(
            metricNames.map((metricName) => [metricName, 0]),
          ),
        };
        existing[metric] = Number(row.count);
        existing.totalActivityEvents += Number(row.count);
        byDay.set(day, existing);
      }
    }

    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}
