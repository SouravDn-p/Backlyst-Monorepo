import { BadRequestException, Injectable } from '@nestjs/common';
import { CacheUtil } from 'src/cache/redis-cache.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  ANALYTICS_REPORT_REGISTRY,
  getAnalyticsReportDefinition,
} from '../registry/analytics-report.registry';
import {
  AnalyticsDataSource,
  AnalyticsMetric,
  AnalyticsParticipant,
  AnalyticsReportType,
} from '../enums/analytics.enums';
import { AnalyticsDateRangeService } from './analytics-date-range.service';
import { AnalyticsReportBuilderService } from './analytics-report-builder.service';
import {
  calculateRate,
  calculateTrend,
  average,
} from '../utils/analytics-rate.util';
import {
  AdminAnalyticsQueryDto,
  AdminAnalyticsRegistryQueryDto,
} from '../dto/admin-analytics-query.dto';

const ACTIVE_TASK_STATUSES = [
  'OPEN',
  'WAITING_FOR_APPLICANTS',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REVISION_REQUESTED',
];

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheUtil: CacheUtil,
    private readonly dateRangeService: AnalyticsDateRangeService,
    private readonly reportBuilder: AnalyticsReportBuilderService,
  ) {}

  async getOverview(query: AdminAnalyticsQueryDto) {
    const period = this.dateRangeService.resolve(
      query.range,
      query.from,
      query.to,
    );
    const participant = query.participant ?? AnalyticsParticipant.ALL;
    const cacheKey = `admin:analytics:overview:${period.range}:${period.from.toISOString()}:${period.to.toISOString()}:${participant}:v1`;

    const data = await this.withCache(cacheKey, () =>
      this.buildOverview(period, participant),
    );
    return sendResponse('Admin analytics overview fetched successfully', data);
  }

  async inspectDomainPair(pairKey: string) {
    const stat = await this.prisma.domainPairStat.findUnique({
      where: { normalizedPairKey: pairKey },
    });

    if (!stat) {
      throw new BadRequestException('Domain pair stat not found');
    }

    const [recentInteractions, flags] = await Promise.all([
      this.prisma.domainInteraction.findMany({
        where: {
          OR: [
            { sourceDomain: stat.domainA, targetDomain: stat.domainB },
            { sourceDomain: stat.domainB, targetDomain: stat.domainA },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          sourceWebsiteId: true,
          targetWebsiteId: true,
          createdAt: true,
        },
      }),
      this.prisma.patternFlag.findMany({
        where: {
          status: 'OPEN',
          memberDomains: { hasSome: [stat.domainA, stat.domainB] },
        },
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return sendResponse('Domain pair inspection data fetched successfully', {
      pair: {
        domainA: stat.domainA,
        domainB: stat.domainB,
        normalizedPairKey: stat.normalizedPairKey,
      },
      stats: {
        interactionCount: stat.interactionCount,
        lastInteractionAt: stat.lastInteractionAt,
      },
      recentInteractions: recentInteractions.map((interaction) => ({
        id: interaction.id,
        sourceWebsiteId: interaction.sourceWebsiteId,
        targetWebsiteId: interaction.targetWebsiteId,
        createdAt: interaction.createdAt,
      })),
      flags,
    });
  }

  async getReportRegistry(query: AdminAnalyticsRegistryQueryDto) {
    const period = this.dateRangeService.resolve(
      query.range,
      query.from,
      query.to,
    );
    const metric = query.metric ?? AnalyticsMetric.ALL;
    const source = query.source ?? AnalyticsDataSource.ALL;
    const participant = query.participant ?? AnalyticsParticipant.ALL;

    let definitions = ANALYTICS_REPORT_REGISTRY;
    if (metric !== AnalyticsMetric.ALL) {
      definitions = definitions.filter(
        (report) =>
          report.reportType === (metric as unknown as AnalyticsReportType),
      );
    }
    if (source !== AnalyticsDataSource.ALL) {
      definitions = definitions.filter(
        (report) => report.dataSource === source,
      );
    }

    const rows = await Promise.all(
      definitions.map(async (definition) => {
        const [totalRecords, latestSavedReport] = await Promise.all([
          this.reportBuilder.getReportRegistryCount(
            definition.reportType,
            period,
            participant,
          ),
          this.prisma.adminAnalyticsReport.findFirst({
            where: { reportType: definition.reportType, deletedAt: null },
            orderBy: { generatedAt: 'desc' },
            select: { id: true, reportCode: true, generatedAt: true },
          }),
        ]);

        return {
          reportType: definition.reportType,
          name: definition.name,
          description: definition.description,
          dataSource: definition.dataSource,
          dateRange: {
            from: period.from,
            to: period.to,
            display: period.display,
          },
          frequency: period.range,
          totalRecords,
          totalRecordsDefinition: definition.totalRecordsDefinition,
          latestSavedReport,
        };
      }),
    );

    return sendResponse(
      'Admin analytics report registry fetched successfully',
      {
        period: this.periodDto(period),
        filters: { metric, source, participant },
        data: rows,
      },
    );
  }

  async getReport(
    reportType: AnalyticsReportType,
    query: AdminAnalyticsQueryDto,
  ) {
    const definition = getAnalyticsReportDefinition(reportType);
    if (!definition)
      throw new BadRequestException('Unsupported analytics report type');

    const period = this.dateRangeService.resolve(
      query.range,
      query.from,
      query.to,
    );
    const participant = query.participant ?? AnalyticsParticipant.ALL;
    const cacheKey = `admin:analytics:report:${reportType}:${period.range}:${period.from.toISOString()}:${period.to.toISOString()}:${participant}:v1`;
    const report = await this.withCache(cacheKey, () =>
      this.reportBuilder.buildReport(reportType, period, participant),
    );

    return sendResponse('Admin analytics report fetched successfully', report);
  }

  async buildLiveReport(
    reportType: AnalyticsReportType,
    query: AdminAnalyticsQueryDto,
  ) {
    const period = this.dateRangeService.resolve(
      query.range,
      query.from,
      query.to,
    );
    return this.reportBuilder.buildReport(
      reportType,
      period,
      query.participant ?? AnalyticsParticipant.ALL,
    );
  }

  async buildAllLiveReports(query: AdminAnalyticsQueryDto) {
    const period = this.dateRangeService.resolve(
      query.range,
      query.from,
      query.to,
    );
    const participant = query.participant ?? AnalyticsParticipant.ALL;
    return Promise.all(
      ANALYTICS_REPORT_REGISTRY.map((definition) =>
        this.reportBuilder.buildReport(
          definition.reportType,
          period,
          participant,
        ),
      ),
    );
  }

  private async buildOverview(
    period: ReturnType<AnalyticsDateRangeService['resolve']>,
    participant: AnalyticsParticipant,
  ) {
    const currentTaskWhere = {
      createdAt: { gte: period.from, lte: period.to },
      ...this.participantTaskWhere(participant),
    };
    const previousTaskWhere = {
      createdAt: { gte: period.previousFrom, lte: period.previousTo },
      ...this.participantTaskWhere(participant),
    };

    const [
      currentAvailableWebsites,
      currentActiveTasks,
      websitesVerifiedThisPeriod,
      websitesVerifiedPreviousPeriod,
      creditActions,
      completedTasks,
      previousCompletedTasks,
      createdTasks,
      previousCreatedTasks,
      revisionTasks,
      disputedTasks,
      lateTasks,
      cancelledTasks,
      lifecycleDurations,
    ] = await Promise.all([
      this.prisma.website.count({
        where: {
          verificationStatus: 'VERIFIED',
          isDeleted: false,
          isFlag: false,
        },
      }),
      this.prisma.placementTask.count({
        where: {
          lifecycleStatus: { in: ACTIVE_TASK_STATUSES as any },
          ...this.participantTaskWhere(participant),
        } as any,
      }),
      this.prisma.website.count({
        where: {
          verificationStatus: 'VERIFIED',
          isDeleted: false,
          isFlag: false,
          verifiedAt: { gte: period.from, lte: period.to },
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
      this.prisma.creditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: period.from, lte: period.to } },
        _sum: { amount: true },
      }),
      this.prisma.placementTask.count({
        where: {
          ...currentTaskWhere,
          lifecycleStatus: 'COMPLETED',
          submissionStatus: 'APPROVED',
        } as any,
      }),
      this.prisma.placementTask.count({
        where: {
          ...previousTaskWhere,
          lifecycleStatus: 'COMPLETED',
          submissionStatus: 'APPROVED',
        } as any,
      }),
      this.prisma.placementTask.count({ where: currentTaskWhere }),
      this.prisma.placementTask.count({ where: previousTaskWhere }),
      this.prisma.placementTask.count({
        where: {
          ...currentTaskWhere,
          lifecycleStatus: 'REVISION_REQUESTED',
        } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...currentTaskWhere, lifecycleStatus: 'DISPUTED' } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...currentTaskWhere, isLate: true } as any,
      }),
      this.prisma.placementTask.count({
        where: { ...currentTaskWhere, lifecycleStatus: 'CANCELLED' } as any,
      }),
      this.getLifecycleDurationDays(period.from, period.to),
    ]);

    const actionMap = Object.fromEntries(
      creditActions.map((action) => [action.action, action._sum.amount ?? 0]),
    );
    const creditsAdded = actionMap.ADD ?? 0;
    const creditsSpent = actionMap.SPEND ?? 0;
    const creditsRewarded = actionMap.REWARD ?? 0;
    const creditsRefunded = actionMap.REFUND ?? 0;
    const creditsExpired = actionMap.EXPIRE ?? 0;
    const netCreditFlow =
      creditsAdded +
      creditsRewarded +
      creditsRefunded -
      creditsSpent -
      creditsExpired;
    const settlement = await this.getSettlementMetrics(period.from, period.to);

    return {
      period: this.periodDto(period),
      filters: { participant },
      cards: {
        marketplace: {
          availableWebsites: currentAvailableWebsites,
          activeTasks: currentActiveTasks,
          snapshotNote:
            'availableWebsites and activeTasks are current-state snapshots. Historical snapshot trends are not calculated without a snapshot table.',
          websitesVerifiedThisPeriod,
          websitesVerifiedPreviousPeriod,
          tasksCreatedThisPeriod: createdTasks,
          tasksCreatedPreviousPeriod: previousCreatedTasks,
          websiteVerificationTrend: calculateTrend(
            websitesVerifiedThisPeriod,
            websitesVerifiedPreviousPeriod,
          ),
          taskCreationTrend: calculateTrend(createdTasks, previousCreatedTasks),
          activeTaskDefinition: {
            included: ACTIVE_TASK_STATUSES,
            excluded: [
              'COMPLETED',
              'CANCELLED',
              'EXPIRED',
              'REJECTED',
              'APPROVED',
              'DISPUTED',
              'FROZEN',
            ],
          },
        },
        creditEconomy: {
          creditsSpent,
          creditsEarned: creditsAdded + creditsRewarded,
          creditsRefunded,
          creditsExpired,
          netCreditFlow,
          unit: 'platform_credits',
          averageTaskSettlementDays: settlement.averageSettlementDays,
          settlementTaskCount: settlement.taskCount,
          settlementDefinition:
            'Approved completed tasks using completedAt - publishedAt.',
        },
        taskHealthAndRisk: {
          completionRate: calculateRate(completedTasks, createdTasks),
          approvalRate: calculateRate(
            completedTasks,
            completedTasks + revisionTasks + disputedTasks,
          ),
          disputeRate: calculateRate(disputedTasks, createdTasks),
          revisionRate: calculateRate(
            revisionTasks,
            completedTasks + revisionTasks + disputedTasks,
          ),
          lateOrOverdueTaskCount: lateTasks,
          cancelledTaskCount: cancelledTasks,
          averageLifecycleDurationDays: average(lifecycleDurations),
          completionTrend: calculateTrend(
            completedTasks,
            previousCompletedTasks,
          ),
          taskCreationTrend: calculateTrend(createdTasks, previousCreatedTasks),
        },
      },
    };
  }

  private async getSettlementMetrics(from: Date, to: Date) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        lifecycleStatus: 'COMPLETED',
        submissionStatus: 'APPROVED',
        publishedAt: { not: null },
        completedAt: { gte: from, lte: to },
      } as any,
      select: { publishedAt: true, completedAt: true },
    });
    const durations = tasks
      .filter((task) => task.publishedAt && task.completedAt)
      .map(
        (task) =>
          (task.completedAt!.getTime() - task.publishedAt!.getTime()) /
          (24 * 60 * 60 * 1000),
      );
    return {
      taskCount: durations.length,
      averageSettlementDays: average(durations),
    };
  }

  private async getLifecycleDurationDays(from: Date, to: Date) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        completedAt: { not: null },
      } as any,
      select: { createdAt: true, completedAt: true },
    });
    return tasks.map(
      (task) =>
        (task.completedAt!.getTime() - task.createdAt.getTime()) /
        (24 * 60 * 60 * 1000),
    );
  }

  private periodDto(period: ReturnType<AnalyticsDateRangeService['resolve']>) {
    return {
      range: period.range,
      from: period.from,
      to: period.to,
      previousFrom: period.previousFrom,
      previousTo: period.previousTo,
      display: period.display,
    };
  }

  private async withCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.cacheUtil.get<T>(key);
      if (cached) return cached;

      const freshData = await fetchFn();
      await this.cacheUtil.set(key, freshData, 60);
      return freshData;
    } catch {
      return fetchFn();
    }
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
}
