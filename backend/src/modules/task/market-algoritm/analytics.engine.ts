import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIVE_TASK_STATUSES = [
  'OPEN',
  'WAITING_FOR_APPLICANTS',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REVISION_REQUESTED',
];

export interface ProviderCounts {
  activeProviders: number;
  dormantProviders: number;
  totalProviders: number;
}

export interface RequesterStats {
  totalRequesters: number;
  repeatRequesterRate: number;
  avgTasksPerRequester: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
}

export interface MatchVolume {
  totalMatches: number;
  matchAttempts: number;
  matchSuccesses: number;
  matchSuccessRate: number;
}

export interface StatusDistribution {
  [status: string]: number;
}

export interface NicheDistributionRow {
  categoryKey: string;
  totalInteractions: number;
}

export interface RiskDistribution {
  riskScoreBuckets: { bucket: string; count: number }[];
  openRiskEvents: number;
}

// Spec P5a: dedicated analytics engine that owns the marketplace KPI queries the
// admin dashboard previously ran ad-hoc. Centralising them here keeps the
// admin-analytics services thin and avoids duplicated Prisma queries across the
// dashboard, the marketplace dashboard, and any future report builders.
@Injectable()
export class AnalyticsEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getProviderCounts(from: Date, to: Date): Promise<ProviderCounts> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY);
    const ninetyDaysAgo = new Date(Date.now() - 90 * MS_PER_DAY);

    const [activeProviders, dormantProviders] = await Promise.all([
      this.prisma.websiteMatchingProfile.count({
        where: {
          lastMatchedAt: { gte: thirtyDaysAgo },
          marketplaceStatus: 'ACTIVE',
        },
      }),
      this.prisma.websiteMatchingProfile.count({
        where: {
          OR: [
            { lastMatchedAt: { lt: ninetyDaysAgo } },
            { lastMatchedAt: null },
          ],
          marketplaceStatus: 'ACTIVE',
        },
      }),
    ]);

    return {
      activeProviders,
      dormantProviders,
      totalProviders: activeProviders + dormantProviders,
    };
  }

  async getRequesterStats(from: Date, to: Date): Promise<RequesterStats> {
    const allRequesters = await this.prisma.placementTask.groupBy({
      by: ['requesterId'],
      where: { createdAt: { gte: from, lte: to } },
      _count: { id: true },
    });

    const repeatRequesters = allRequesters.filter(
      (r) => r._count.id > 1,
    ).length;
    const totalRequesters = allRequesters.length;
    const totalTaskCount = allRequesters.reduce(
      (sum, r) => sum + r._count.id,
      0,
    );

    const [completedTasks, totalTasks] = await Promise.all([
      this.prisma.placementTask.count({
        where: {
          createdAt: { gte: from, lte: to },
          lifecycleStatus: 'COMPLETED',
        },
      }),
      this.prisma.placementTask.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    return {
      totalRequesters,
      repeatRequesterRate:
        totalRequesters > 0
          ? Number(((repeatRequesters / totalRequesters) * 100).toFixed(1))
          : 0,
      avgTasksPerRequester:
        totalRequesters > 0
          ? Number((totalTaskCount / totalRequesters).toFixed(2))
          : 0,
      totalTasks,
      completedTasks,
      taskCompletionRate:
        totalTasks > 0
          ? Number(((completedTasks / totalTasks) * 100).toFixed(1))
          : 0,
    };
  }

  async getMatchVolume(from: Date, to: Date): Promise<MatchVolume> {
    const [matchAttempts, matchSuccesses, totalMatches] = await Promise.all([
      this.prisma.placementApplication.count({
        where: {
          createdAt: { gte: from, lte: to },
          status: { in: ['APPLIED', 'SELECTED', 'REJECTED'] },
        },
      }),
      this.prisma.placementApplication.count({
        where: { createdAt: { gte: from, lte: to }, status: 'SELECTED' },
      }),
      this.prisma.placementApplication.count({
        where: {
          createdAt: { gte: from, lte: to },
          status: { in: ['SELECTED', 'COMPLETED'] },
        },
      }),
    ]);

    return {
      totalMatches,
      matchAttempts,
      matchSuccesses,
      matchSuccessRate:
        matchAttempts > 0
          ? Number(((matchSuccesses / matchAttempts) * 100).toFixed(1))
          : 0,
    };
  }

  async getStatusDistribution(
    from: Date,
    to: Date,
  ): Promise<StatusDistribution> {
    const grouped = await this.prisma.placementTask.groupBy({
      by: ['lifecycleStatus'],
      where: { createdAt: { gte: from, lte: to } },
      _count: { id: true },
    });

    const distribution: StatusDistribution = {};
    for (const row of grouped) {
      distribution[row.lifecycleStatus] = row._count.id;
    }
    return distribution;
  }

  async getNicheDistribution(
    from: Date,
    to: Date,
    category?: string,
  ): Promise<NicheDistributionRow[]> {
    const grouped = await this.prisma.domainInteraction.groupBy({
      by: ['sourcePrimaryCategoryKey'],
      where: {
        completedAt: { gte: from, lte: to },
        sourcePrimaryCategoryKey: category ? category : undefined,
      },
      _count: { id: true },
    });

    return grouped.map((row) => ({
      categoryKey: row.sourcePrimaryCategoryKey ?? 'UNCATEGORIZED',
      totalInteractions: row._count.id,
    }));
  }

  async getRiskDistribution(): Promise<RiskDistribution> {
    const profiles = await this.prisma.websiteMatchingProfile.findMany({
      select: { riskScore: true },
    });

    const buckets = [
      { bucket: '0-20', count: 0 },
      { bucket: '20-40', count: 0 },
      { bucket: '40-60', count: 0 },
      { bucket: '60-80', count: 0 },
      { bucket: '80-100', count: 0 },
    ];
    for (const p of profiles) {
      const s = p.riskScore;
      if (s < 20) buckets[0].count++;
      else if (s < 40) buckets[1].count++;
      else if (s < 60) buckets[2].count++;
      else if (s < 80) buckets[3].count++;
      else buckets[4].count++;
    }

    const openRiskEvents = await this.prisma.riskEvent.count();

    return { riskScoreBuckets: buckets, openRiskEvents };
  }

  get activeTaskStatuses(): string[] {
    return [...ACTIVE_TASK_STATUSES];
  }
}
