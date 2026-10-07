import { Injectable } from '@nestjs/common';
import { CacheUtil } from 'src/cache/redis-cache.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { AnalyticsEngine } from 'src/modules/task/market-algoritm/analytics.engine';

export type MarketplaceAnalyticsQuery = {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
};

@Injectable()
export class MarketplaceAnalyticsDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheUtil: CacheUtil,
    private readonly analyticsEngine: AnalyticsEngine,
  ) {}

  async getMarketplaceAnalytics(query: MarketplaceAnalyticsQuery) {
    const from = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.dateTo ? new Date(query.dateTo) : new Date();
    const cacheKey = `admin:analytics:marketplace:${from.toISOString()}:${to.toISOString()}:${query.category ?? 'ALL'}:v1`;

    const data = await this.cacheUtil.getWithAutoRefresh(
      cacheKey,
      () => this.buildAnalytics(from, to, query.category),
      300,
    );

    return sendResponse('Marketplace analytics fetched successfully.', data);
  }

  private async buildAnalytics(from: Date, to: Date, category?: string) {
    const [
      matchingPipeline,
      providerActivity,
      requesterBehavior,
      nicheHealth,
      conversionFunnel,
    ] = await Promise.all([
      this.getMatchingPipelineStats(from, to),
      this.getProviderActivityMetrics(from, to),
      this.getRequesterBehaviorMetrics(from, to),
      this.getNicheHealthDashboard(from, to, category),
      this.getConversionFunnel(from, to),
    ]);

    return {
      matchingPipeline,
      providerActivity,
      requesterBehavior,
      nicheHealth,
      conversionFunnel,
    };
  }

  private async getMatchingPipelineStats(from: Date, to: Date) {
    const auditLogs = await this.prisma.matchingAuditLog.findMany({
      where: { timestamp: { gte: from, lte: to } },
      select: {
        candidatesEval: true,
        eligibleMatches: true,
        relaxationLevel: true,
        processingTimeMs: true,
        timestamp: true,
      },
    });

    const totalAttempted = auditLogs.length;
    const totalEligible = auditLogs.reduce(
      (sum, l) => sum + l.eligibleMatches,
      0,
    );
    const avgProcessingTime =
      totalAttempted > 0
        ? auditLogs.reduce((sum, l) => sum + l.processingTimeMs, 0) /
          totalAttempted
        : 0;

    const relaxationDistribution: Record<number, number> = {};
    for (const log of auditLogs) {
      relaxationDistribution[log.relaxationLevel] =
        (relaxationDistribution[log.relaxationLevel] ?? 0) + 1;
    }

    const matchAttempts = await this.prisma.placementApplication.count({
      where: {
        createdAt: { gte: from, lte: to },
        status: { in: ['APPLIED', 'SELECTED', 'REJECTED'] },
      },
    });

    const matchSuccesses = await this.prisma.placementApplication.count({
      where: {
        createdAt: { gte: from, lte: to },
        status: 'SELECTED',
      },
    });

    const matchSuccessRate =
      matchAttempts > 0
        ? Number(((matchSuccesses / matchAttempts) * 100).toFixed(1))
        : 0;

    const rejectionLogs = await this.prisma.marketplaceValidationLog.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        decision: 'REJECTED',
      },
      select: { failedRule: true },
    });

    const rejectionReasons: Record<string, number> = {};
    for (const log of rejectionLogs) {
      const rule = log.failedRule ?? 'UNKNOWN';
      rejectionReasons[rule] = (rejectionReasons[rule] ?? 0) + 1;
    }

    return {
      totalAttempted,
      totalEligible,
      matchSuccessRate,
      avgProcessingTimeMs: Math.round(avgProcessingTime),
      relaxationDistribution,
      rejectionReasons,
    };
  }

  // Provider KPIs are owned by AnalyticsEngine (spec P5a) to avoid duplicated
  // Prisma queries across the dashboard surfaces.
  private async getProviderActivityMetrics(from: Date, to: Date) {
    const { activeProviders, dormantProviders, totalProviders } =
      await this.analyticsEngine.getProviderCounts(from, to);

    const totalMatches = await this.prisma.placementApplication.count({
      where: {
        createdAt: { gte: from, lte: to },
        status: { in: ['SELECTED', 'COMPLETED'] },
      },
    });

    const monthsInRange = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (30 * 24 * 60 * 60 * 1000)),
    );
    const avgMatchesPerProviderPerMonth =
      totalProviders > 0
        ? Number((totalMatches / totalProviders / monthsInRange).toFixed(2))
        : 0;

    const currentMonthStart = new Date(from.getFullYear(), from.getMonth(), 1);
    const prevMonthStart = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    const prevMonthEnd = new Date(from.getFullYear(), from.getMonth(), 0);

    const currentMonthProviders =
      await this.prisma.placementApplication.groupBy({
        by: ['providerId'],
        where: {
          createdAt: { gte: currentMonthStart, lte: to },
          status: { in: ['SELECTED', 'COMPLETED'] },
        },
      });

    const prevMonthProviders = await this.prisma.placementApplication.groupBy({
      by: ['providerId'],
      where: {
        createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        status: { in: ['SELECTED', 'COMPLETED'] },
      },
    });

    const currentSet = new Set(currentMonthProviders.map((p) => p.providerId));
    const prevSet = new Set(prevMonthProviders.map((p) => p.providerId));
    const retainedCount = [...currentSet].filter((id) =>
      prevSet.has(id),
    ).length;
    const retentionRate =
      prevSet.size > 0
        ? Number(((retainedCount / prevSet.size) * 100).toFixed(1))
        : 0;

    const topProviders = await this.prisma.placementApplication.groupBy({
      by: ['providerId'],
      where: {
        createdAt: { gte: from, lte: to },
        status: { in: ['SELECTED', 'COMPLETED'] },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const tierDistribution: Record<string, number> = {
      PLATINUM: 0,
      GOLD: 0,
      SILVER: 0,
      BRONZE: 0,
      UNRATED: 0,
    };

    const allProfiles = await this.prisma.websiteMatchingProfile.findMany({
      where: { marketplaceStatus: 'ACTIVE' },
      select: {
        completedInteractions: true,
        totalInteractions: true,
        avgQualityRating: true,
        completionRate: true,
      },
    });

    for (const p of allProfiles) {
      const total = p.totalInteractions;
      const completed = p.completedInteractions;
      const cr = total > 0 ? (completed / total) * 100 : 0;
      const disputeRate = 0;
      const rating = p.avgQualityRating;

      let tier = 'UNRATED';
      if (completed < 5) tier = 'UNRATED';
      else if (cr >= 95 && disputeRate <= 2 && rating >= 4.5) tier = 'PLATINUM';
      else if (cr >= 85 && disputeRate <= 5 && rating >= 4.0) tier = 'GOLD';
      else if (cr >= 70 && disputeRate <= 10) tier = 'SILVER';
      else if (cr >= 50) tier = 'BRONZE';

      tierDistribution[tier]++;
    }

    return {
      activeProviders,
      dormantProviders,
      avgMatchesPerProviderPerMonth,
      retentionRate,
      topProviders: topProviders.map((p) => ({
        providerId: p.providerId,
        matchCount: p._count.id,
      })),
      tierDistribution,
    };
  }

  // Requester KPIs are owned by AnalyticsEngine (spec P5a).
  private async getRequesterBehaviorMetrics(from: Date, to: Date) {
    const requesterStats = await this.analyticsEngine.getRequesterStats(
      from,
      to,
    );

    const tasksWithAssign = await this.prisma.placementTask.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        assignedAt: { not: null },
      },
      select: { createdAt: true, assignedAt: true },
      take: 1000,
    });

    const avgTimeToFirstMatchHours =
      tasksWithAssign.length > 0
        ? Number(
            (
              tasksWithAssign.reduce(
                (sum, t) =>
                  sum +
                  (t.assignedAt!.getTime() - t.createdAt.getTime()) /
                    (1000 * 60 * 60),
                0,
              ) / tasksWithAssign.length
            ).toFixed(1),
          )
        : 0;

    return {
      repeatRequesterRate: requesterStats.repeatRequesterRate,
      avgTasksPerRequester: requesterStats.avgTasksPerRequester,
      taskCompletionRate: requesterStats.taskCompletionRate,
      avgTimeToFirstMatchHours,
      totalRequesters: requesterStats.totalRequesters,
      totalTasks: requesterStats.totalTasks,
    };
  }

  // Niche distribution is owned by AnalyticsEngine (spec P5a): it computes the
  // per-category interaction counts; the dashboard layers on cap utilization.
  private async getNicheHealthDashboard(
    from: Date,
    to: Date,
    category?: string,
  ) {
    const nicheCaps = await this.prisma.nicheDistributionCap.findMany({
      where: { isActive: true },
    });

    const categoryInteractions =
      await this.analyticsEngine.getNicheDistribution(from, to, category);

    const perCategory: Record<string, any> = {};
    for (const ci of categoryInteractions) {
      const cat = ci.categoryKey;
      perCategory[cat] = {
        categoryKey: cat,
        totalInteractions: ci.totalInteractions,
        supplyDemandRatio: 0,
        avgMatchTimeHours: 0,
        completionRate: 0,
      };
    }

    for (const cap of nicheCaps) {
      if (!perCategory[cap.categoryKey]) {
        perCategory[cap.categoryKey] = {
          categoryKey: cap.categoryKey,
          totalInteractions: 0,
          supplyDemandRatio: 0,
          avgMatchTimeHours: 0,
          completionRate: 0,
        };
      }
      perCategory[cap.categoryKey].capUtilization = {
        maxPerWindow: cap.maxPerWindow,
        windowDays: cap.windowDays,
      };
    }

    return {
      categories: Object.values(perCategory),
      totalNichesTracked: nicheCaps.length,
    };
  }

  private async getConversionFunnel(from: Date, to: Date) {
    const created = await this.prisma.placementTask.count({
      where: { createdAt: { gte: from, lte: to } },
    });

    const matched = await this.prisma.placementTask.count({
      where: {
        createdAt: { gte: from, lte: to },
        lifecycleStatus: {
          in: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'],
        },
      },
    });

    const inProgress = await this.prisma.placementTask.count({
      where: {
        createdAt: { gte: from, lte: to },
        lifecycleStatus: { in: ['IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] },
      },
    });

    const completed = await this.prisma.placementTask.count({
      where: {
        createdAt: { gte: from, lte: to },
        lifecycleStatus: 'COMPLETED',
      },
    });

    const paid = await this.prisma.placementTask.count({
      where: {
        createdAt: { gte: from, lte: to },
        lifecycleStatus: 'COMPLETED',
        completionRewardedAt: { not: null },
      },
    });

    const dropOffCreatedToMatched =
      created > 0
        ? Number((((created - matched) / created) * 100).toFixed(1))
        : 0;
    const dropOffMatchedToInProgress =
      matched > 0
        ? Number((((matched - inProgress) / matched) * 100).toFixed(1))
        : 0;
    const dropOffInProgressToCompleted =
      inProgress > 0
        ? Number((((inProgress - completed) / inProgress) * 100).toFixed(1))
        : 0;
    const dropOffCompletedToPaid =
      completed > 0
        ? Number((((completed - paid) / completed) * 100).toFixed(1))
        : 0;

    const completedTasks = await this.prisma.placementTask.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        lifecycleStatus: 'COMPLETED',
        assignedAt: { not: null },
        completedAt: { not: null },
      },
      select: { assignedAt: true, completedAt: true },
      take: 2000,
    });

    const completionTimesHours = completedTasks.map(
      (t) =>
        (t.completedAt!.getTime() - t.assignedAt!.getTime()) / (1000 * 60 * 60),
    );

    const timeToCompletionDistribution = {
      under24h: completionTimesHours.filter((h) => h < 24).length,
      '1to3days': completionTimesHours.filter((h) => h >= 24 && h < 72).length,
      '3to7days': completionTimesHours.filter((h) => h >= 72 && h < 168).length,
      '7to14days': completionTimesHours.filter((h) => h >= 168 && h < 336)
        .length,
      over14days: completionTimesHours.filter((h) => h >= 336).length,
    };

    return {
      funnel: {
        created,
        matched,
        inProgress,
        completed,
        paid,
      },
      dropOffRates: {
        createdToMatched: dropOffCreatedToMatched,
        matchedToInProgress: dropOffMatchedToInProgress,
        inProgressToCompleted: dropOffInProgressToCompleted,
        completedToPaid: dropOffCompletedToPaid,
      },
      timeToCompletionDistribution,
    };
  }
}
