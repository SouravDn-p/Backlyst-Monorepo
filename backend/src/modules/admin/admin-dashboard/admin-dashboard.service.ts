import { Injectable } from '@nestjs/common';
import {
  MessageRegistryStatus,
  MessageReportStatus,
  Prisma,
  TaskFlowActorRole,
  TaskFlowEventType,
  TaskStatus,
  UserStatus,
  WebsiteVerificationStatus,
} from '@prisma/client';
import { CreditService } from 'src/modules/credit/credit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  AdminDashboardRange,
  AdminDashboardOverviewQueryDto,
} from './dto/admin-dashboard-overview.dto';
import { AdminDashboardPeriod } from './dto/admin-dashboard-query.dto';

type DateRangeMeta = {
  range: AdminDashboardRange;
  from: Date;
  to: Date;
};

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {}

  async getOverview(query: AdminDashboardOverviewQueryDto = {}) {
    const dateRange = this.resolveDateRange(
      query.range ?? this.periodToRange(query.period) ?? 'daily',
    );
    const periodDateWhere = this.buildDateWhere(dateRange);

    const [
      activeUsers,
      activeWebsites,
      taskOversight,
      creditSimulation,
      taskLifecycle,
      securityAudit,
      governanceFeed,
      accessAuditLogs,
    ] = await Promise.all([
      this.getActiveUsers(periodDateWhere),
      this.getActiveWebsites(periodDateWhere),
      this.getTaskOversight(periodDateWhere),
      this.getCreditSimulation(),
      this.getTaskLifecycle(periodDateWhere),
      this.getSecurityAudit(periodDateWhere),
      this.getGovernanceFeed(periodDateWhere),
      this.getAccessAuditLogs(periodDateWhere),
    ]);

    return sendResponse('Admin dashboard overview fetched successfully', {
      activeUsers,
      activeWebsites,
      taskOversight,
      creditSimulation,
      taskLifecycle,
      securityAudit,
      governanceFeed,
      accessAuditLogs,
      meta: {
        range: dateRange.range,
        from: dateRange.from,
        to: dateRange.to,
        generatedAt: new Date(),
      },
    });
  }

  async getMarketplaceHealth() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      providerCount,
      taskCount,
      matches24h,
      highRiskProviders,
      openPatternFlags,
      suppressedProviders,
    ] = await Promise.all([
      this.prisma.websiteMatchingProfile.count({
        where: { marketplaceStatus: 'ACTIVE' },
      }),
      this.prisma.placementTask.count({
        where: { lifecycleStatus: 'OPEN' },
      }),
      this.prisma.matchingAuditLog.findMany({
        where: { timestamp: { gte: last24h } },
        select: { eligibleMatches: true, processingTimeMs: true },
      }),
      this.prisma.websiteMatchingProfile.count({
        where: { riskScore: { gt: 75 } },
      }),
      this.prisma.patternFlag.count({
        where: { status: 'OPEN' },
      }),
      this.prisma.websiteMatchingProfile.count({
        where: { isSuppressed: true },
      }),
    ]);

    const ratio = taskCount > 0 ? providerCount / taskCount : 0;
    let supplyDemandStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (ratio < 0.1 || ratio > 10) supplyDemandStatus = 'CRITICAL';
    else if (ratio < 0.5 || ratio > 5) supplyDemandStatus = 'WARNING';

    const totalMatchesLast24h = matches24h.length;
    let avgProcessingTimeMs = 0;
    let successRate = 0;
    if (totalMatchesLast24h > 0) {
      avgProcessingTimeMs =
        matches24h.reduce((acc, cur) => acc + cur.processingTimeMs, 0) /
        totalMatchesLast24h;
      const successes = matches24h.filter((m) => m.eligibleMatches > 0).length;
      successRate = successes / totalMatchesLast24h;
    }

    let matchingPipelineStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (totalMatchesLast24h > 0) {
      if (successRate < 0.2) matchingPipelineStatus = 'CRITICAL';
      else if (successRate < 0.5) matchingPipelineStatus = 'WARNING';
    }

    const highRiskRatio =
      providerCount > 0 ? highRiskProviders / providerCount : 0;
    let riskAlertsStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (highRiskRatio > 0.25 || openPatternFlags > 10)
      riskAlertsStatus = 'CRITICAL';
    else if (highRiskRatio > 0.1 || openPatternFlags > 5)
      riskAlertsStatus = 'WARNING';

    let globalStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (
      supplyDemandStatus === 'CRITICAL' ||
      matchingPipelineStatus === 'CRITICAL' ||
      riskAlertsStatus === 'CRITICAL'
    ) {
      globalStatus = 'CRITICAL';
    } else if (
      supplyDemandStatus === 'WARNING' ||
      matchingPipelineStatus === 'WARNING' ||
      riskAlertsStatus === 'WARNING'
    ) {
      globalStatus = 'DEGRADED';
    }

    return sendResponse('Marketplace health fetched successfully', {
      status: globalStatus,
      checkedAt: now,
      checks: {
        supplyDemand: {
          status: supplyDemandStatus,
          providerCount,
          taskCount,
          ratio,
        },
        matchingPipeline: {
          status: matchingPipelineStatus,
          avgProcessingTimeMs,
          successRate,
          totalMatchesLast24h,
        },
        riskAlerts: {
          status: riskAlertsStatus,
          highRiskProviders,
          openPatternFlags,
          suppressedProviders,
        },
        configHealth: {
          status: 'OK',
          lastUpdated: now,
          isCacheValid: true,
        },
      },
    });
  }

  private async getActiveUsers(createdAt: Prisma.DateTimeFilter) {
    const [count, totalUsers, newUsersInRange] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: 'USER',
          status: UserStatus.ACTIVE,
          isVerified: true,
          isDeleted: false,
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'USER',
          isDeleted: false,
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'USER',
          isDeleted: false,
          createdAt,
        },
      }),
    ]);

    return {
      count,
      totalUsers,
      newUsersInRange,
      description: 'Verified Marketing Participants',
    };
  }

  private async getActiveWebsites(createdAt: Prisma.DateTimeFilter) {
    const [statusRows, flagged, newWebsitesInRange] = await Promise.all([
      this.prisma.website.groupBy({
        by: ['verificationStatus'],
        where: {
          isDeleted: false,
          isFlag: false,
        },
        _count: { _all: true },
      }),
      this.prisma.website.count({
        where: {
          isFlag: true,
          isDeleted: false,
        },
      }),
      this.prisma.website.count({
        where: {
          isDeleted: false,
          createdAt,
        },
      }),
    ]);

    const statusCounts = this.toCountMap(statusRows, 'verificationStatus');
    const pending =
      (statusCounts.PENDING ?? 0) +
      (statusCounts.REQUESTED_FOR_MANUAL_REVIEW ?? 0) +
      (statusCounts.APPEALED ?? 0);

    return {
      verified: statusCounts.VERIFIED ?? 0,
      pending,
      flagged,
      failed: statusCounts.VERIFICATION_FAILED ?? 0,
      rejected: statusCounts.REJECTED ?? 0,
      newWebsitesInRange,
    };
  }

  private async getTaskOversight(createdAt: Prisma.DateTimeFilter) {
    const [totalTasks, totalUsers, disputedTasks, tasksInRange] =
      await Promise.all([
        this.prisma.placementTask.count(),
        this.prisma.user.count({
          where: {
            role: 'USER',
            isDeleted: false,
          },
        }),
        this.prisma.placementTask.count({
          where: {
            lifecycleStatus: TaskStatus.DISPUTED,
          },
        }),
        this.prisma.placementTask.count({
          where: {
            createdAt,
          },
        }),
      ]);

    return {
      totalTasks,
      totalUsers,
      disputedTasks,
      tasksInRange,
    };
  }

  private async getCreditSimulation() {
    const creditSimulation = await this.creditService.getAdminCreditDashboard();

    return {
      subscriptionCredits: creditSimulation.subscriptions,
      referralEarnedCredits: creditSimulation.referralEarned,
      visibilityCredits: creditSimulation.visibility,
    };
  }

  private async getTaskLifecycle(createdAt: Prisma.DateTimeFilter) {
    const now = new Date();
    const graceStartedAt = this.daysAgo(7);

    const [
      created,
      accepted,
      completed,
      disputed,
      visible,
      gracePeriod,
      hidden,
      linkAttributeRows,
    ] = await Promise.all([
      this.prisma.placementTask.count({ where: { createdAt } }),
      this.prisma.placementTask.count({
        where: {
          createdAt,
          lifecycleStatus: {
            in: [
              TaskStatus.SELECTED,
              TaskStatus.ASSIGNED,
              TaskStatus.IN_PROGRESS,
              TaskStatus.SUBMITTED,
              TaskStatus.REVISION_REQUESTED,
              TaskStatus.APPROVED,
            ],
          },
        },
      }),
      this.prisma.placementTask.count({
        where: {
          createdAt,
          lifecycleStatus: TaskStatus.COMPLETED,
        },
      }),
      this.prisma.placementTask.count({
        where: {
          createdAt,
          lifecycleStatus: TaskStatus.DISPUTED,
        },
      }),
      this.prisma.websiteCreditWallet.count({
        where: {
          visibilityCredits: { gt: 0 },
          OR: [
            { visibilityActiveUntil: null },
            { visibilityActiveUntil: { gte: now } },
          ],
        },
      }),
      this.prisma.websiteCreditWallet.count({
        where: {
          visibilityCredits: { gt: 0 },
          visibilityActiveUntil: {
            lt: now,
            gte: graceStartedAt,
          },
        },
      }),
      this.prisma.websiteCreditWallet.count({
        where: {
          OR: [
            { visibilityCredits: { lte: 0 } },
            { visibilityActiveUntil: { lt: graceStartedAt } },
          ],
        },
      }),
      this.prisma.placementTask.groupBy({
        by: ['linkAttribute'],
        where: { createdAt },
        _count: { _all: true },
      }),
    ]);

    const linkAttributeCounts = this.toCountMap(
      linkAttributeRows,
      'linkAttribute',
    );
    const follow = linkAttributeCounts.DOFOLLOW ?? 0;
    const noFollow =
      (linkAttributeCounts.NOFOLLOW ?? 0) +
      (linkAttributeCounts.UGC ?? 0) +
      (linkAttributeCounts.SPONSORED ?? 0);
    const totalLinks = follow + noFollow;

    return {
      counts: {
        created,
        accepted,
        completed,
        disputed,
      },
      visibilityModeStatus: {
        visible,
        gracePeriod,
        hidden,
      },
      backlinkTrustRatio: {
        follow,
        noFollow,
        followPercent: this.percent(follow, totalLinks),
        noFollowPercent: this.percent(noFollow, totalLinks),
      },
      operationalActions: [
        {
          key: 'OPEN_VIOLATION_PROTOCOL',
          label: 'Open Violation Protocol',
          route: '/admin-task/all?status=DISPUTED',
        },
        {
          key: 'COMPLIANCE_CENTER',
          label: 'Compliance Center',
          route: '/website-verification-admin/pending',
        },
      ],
    };
  }

  private async getSecurityAudit(createdAt: Prisma.DateTimeFilter) {
    const [
      flaggedMessages,
      pendingReports,
      failedVerifications,
      disputedTasks,
      messageViolationCount,
      reportViolationCount,
      verificationViolationCount,
      disputedTaskCount,
    ] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          registryStatus: {
            in: [
              MessageRegistryStatus.FLAGGED,
              MessageRegistryStatus.RESTRICTED,
            ],
          },
          createdAt,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          registryStatus: true,
          registryReason: true,
          createdAt: true,
        },
      }),
      this.prisma.messageReport.findMany({
        where: {
          status: MessageReportStatus.PENDING,
          createdAt,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reason: true,
          note: true,
          createdAt: true,
          messageId: true,
        },
      }),
      this.prisma.websiteVerification.findMany({
        where: {
          status: {
            in: [
              WebsiteVerificationStatus.VERIFICATION_FAILED,
              WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW,
              WebsiteVerificationStatus.REJECTED,
            ],
          },
          createdAt,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          errorMessage: true,
          rejectReason: true,
          createdAt: true,
          website: {
            select: {
              id: true,
              websiteUrl: true,
            },
          },
        },
      }),
      this.prisma.placementTask.findMany({
        where: {
          lifecycleStatus: TaskStatus.DISPUTED,
          createdAt,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          projectTitle: true,
          createdAt: true,
        },
      }),
      this.prisma.message.count({
        where: {
          registryStatus: {
            in: [
              MessageRegistryStatus.FLAGGED,
              MessageRegistryStatus.RESTRICTED,
            ],
          },
          createdAt,
        },
      }),
      this.prisma.messageReport.count({
        where: {
          status: MessageReportStatus.PENDING,
          createdAt,
        },
      }),
      this.prisma.websiteVerification.count({
        where: {
          status: {
            in: [
              WebsiteVerificationStatus.VERIFICATION_FAILED,
              WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW,
              WebsiteVerificationStatus.REJECTED,
            ],
          },
          createdAt,
        },
      }),
      this.prisma.placementTask.count({
        where: {
          lifecycleStatus: TaskStatus.DISPUTED,
          createdAt,
        },
      }),
    ]);

    const items = [
      ...flaggedMessages.map((item) => ({
        id: item.id,
        type: 'MESSAGE_REGISTRY',
        title:
          item.registryReason ??
          `Message registry status ${item.registryStatus}`,
        severity:
          item.registryStatus === MessageRegistryStatus.RESTRICTED
            ? 'HIGH'
            : 'MEDIUM',
        createdAt: item.createdAt,
      })),
      ...pendingReports.map((item) => ({
        id: item.id,
        type: 'MESSAGE_REPORT',
        title: item.note ?? `Pending message report: ${item.reason}`,
        severity: 'MEDIUM',
        messageId: item.messageId,
        createdAt: item.createdAt,
      })),
      ...failedVerifications.map((item) => ({
        id: item.id,
        type: 'WEBSITE_VERIFICATION',
        title:
          item.errorMessage ??
          item.rejectReason ??
          `Website verification ${item.status}`,
        severity:
          item.status === WebsiteVerificationStatus.REJECTED
            ? 'HIGH'
            : 'MEDIUM',
        website: item.website,
        createdAt: item.createdAt,
      })),
      ...disputedTasks.map((item) => ({
        id: item.id,
        type: 'DISPUTED_TASK',
        title: item.projectTitle,
        severity: 'HIGH',
        createdAt: item.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      currentEmergentViolations:
        messageViolationCount +
        reportViolationCount +
        verificationViolationCount +
        disputedTaskCount,
      items,
    };
  }

  private async getGovernanceFeed(createdAt: Prisma.DateTimeFilter) {
    const [adminTaskFlows, governanceNotes] = await Promise.all([
      this.prisma.taskFlow.findMany({
        where: {
          createdAt,
          OR: [
            { actorRole: TaskFlowActorRole.ADMIN },
            {
              eventType: {
                in: [
                  TaskFlowEventType.ADMIN_STATUS_OVERRIDE,
                  TaskFlowEventType.ADMIN_CREDIT_ADJUSTED,
                  TaskFlowEventType.ADMIN_ABUSE_PATTERN_FLAGGED,
                  TaskFlowEventType.TASK_FROZEN,
                  TaskFlowEventType.TASK_DISPUTED,
                ],
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          placementTaskId: true,
          eventType: true,
          actionTaken: true,
          note: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.adminUserGovernanceNote.findMany({
        where: { createdAt },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          subjectUserId: true,
          note: true,
          createdAt: true,
          adminUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const items = [
      ...adminTaskFlows.map((item) => ({
        id: item.id,
        type: 'TASK_FLOW',
        title: item.actionTaken ?? item.eventType ?? 'Admin task activity',
        note: item.note,
        taskId: item.placementTaskId,
        actor: item.actor,
        createdAt: item.createdAt,
      })),
      ...governanceNotes.map((item) => ({
        id: item.id,
        type: 'GOVERNANCE_NOTE',
        title: item.note,
        subjectUserId: item.subjectUserId,
        actor: item.adminUser,
        createdAt: item.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      items,
    };
  }

  private async getAccessAuditLogs(loginAt: Prisma.DateTimeFilter) {
    const [totalInRange, activeSessions, recent] = await Promise.all([
      this.prisma.session.count({
        where: { loginAt },
      }),
      this.prisma.session.count({
        where: { logoutAt: null },
      }),
      this.prisma.session.findMany({
        where: { loginAt },
        orderBy: { loginAt: 'desc' },
        take: 10,
        select: {
          id: true,
          ipAddress: true,
          device: true,
          userAgent: true,
          loginAt: true,
          logoutAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      totalInRange,
      activeSessions,
      recent,
    };
  }

  private resolveDateRange(range: AdminDashboardRange): DateRangeMeta {
    const now = new Date();
    const from = new Date(now);

    if (range === 'daily') {
      from.setHours(0, 0, 0, 0);
    } else if (range === 'weekly') {
      from.setDate(from.getDate() - 7);
    } else {
      from.setDate(from.getDate() - 30);
    }

    return { range, from, to: now };
  }

  private periodToRange(
    period?: AdminDashboardPeriod,
  ): AdminDashboardRange | null {
    if (!period) {
      return null;
    }

    const rangeMap: Record<AdminDashboardPeriod, AdminDashboardRange> = {
      [AdminDashboardPeriod.DAILY]: 'daily',
      [AdminDashboardPeriod.WEEKLY]: 'weekly',
      [AdminDashboardPeriod.MONTHLY]: 'monthly',
    };

    return rangeMap[period];
  }

  private buildDateWhere(dateRange: DateRangeMeta): Prisma.DateTimeFilter {
    return {
      gte: dateRange.from,
      lte: dateRange.to,
    };
  }

  private toCountMap<T extends string>(
    rows: Array<Record<T, string> & { _count: { _all: number } }>,
    key: T,
  ) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row[key]] = row._count._all;
      return acc;
    }, {});
  }

  private percent(value: number, total: number) {
    if (total === 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
