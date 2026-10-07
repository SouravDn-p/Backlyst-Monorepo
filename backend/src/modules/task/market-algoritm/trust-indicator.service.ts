import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type TrustIndicators = {
  isVerified: boolean;
  qualityTier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'UNRATED';
  avgResponseTimeHours: number | null;
  completionRate: number;
  disputeRate: number;
  totalCompletedTasks: number;
  memberSince: Date;
};

@Injectable()
export class TrustIndicatorService {
  constructor(private readonly prisma: PrismaService) {}

  async getIndicators(websiteId: string): Promise<TrustIndicators> {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        verificationStatus: true,
        createdAt: true,
        matchingProfile: {
          select: {
            completedInteractions: true,
            failedInteractions: true,
            totalInteractions: true,
            completionRate: true,
            avgQualityRating: true,
            lastMatchedAt: true,
            lastSelectedAt: true,
            lastCompletedAt: true,
          },
        },
      },
    });

    if (!website) {
      return this.emptyIndicators();
    }

    const profile = website.matchingProfile;
    const totalCompleted = profile?.completedInteractions ?? 0;
    const totalInteractions = profile?.totalInteractions ?? 0;
    const completionRate =
      totalInteractions > 0
        ? Number(((totalCompleted / totalInteractions) * 100).toFixed(1))
        : 0;

    const disputeCount = await this.prisma.dispute.count({
      where: {
        OR: [
          { requesterWebsiteId: websiteId },
          { providerWebsiteId: websiteId },
        ],
        status: { in: ['OPEN', 'UNDER_REVIEW', 'RESOLVED'] },
      },
    });

    const disputeRate =
      totalInteractions > 0
        ? Number(((disputeCount / totalInteractions) * 100).toFixed(1))
        : 0;

    const avgQualityRating = profile?.avgQualityRating ?? 0;

    const avgResponseTimeHours =
      await this.computeAvgResponseTimeHours(websiteId);

    const qualityTier = this.computeQualityTier(
      completionRate,
      disputeRate,
      avgQualityRating,
      totalCompleted,
    );

    return {
      isVerified: website.verificationStatus === 'VERIFIED',
      qualityTier,
      avgResponseTimeHours,
      completionRate,
      disputeRate,
      totalCompletedTasks: totalCompleted,
      memberSince: website.createdAt,
    };
  }

  async getIndicatorsBatch(
    websiteIds: string[],
  ): Promise<Map<string, TrustIndicators>> {
    const results = new Map<string, TrustIndicators>();
    if (websiteIds.length === 0) return results;

    const websites = await this.prisma.website.findMany({
      where: { id: { in: websiteIds } },
      select: {
        id: true,
        verificationStatus: true,
        createdAt: true,
        matchingProfile: {
          select: {
            completedInteractions: true,
            failedInteractions: true,
            totalInteractions: true,
            completionRate: true,
            avgQualityRating: true,
          },
        },
      },
    });

    const disputeCounts = await this.prisma.dispute.groupBy({
      by: ['requesterWebsiteId', 'providerWebsiteId'],
      where: {
        OR: [
          { requesterWebsiteId: { in: websiteIds } },
          { providerWebsiteId: { in: websiteIds } },
        ],
        status: { in: ['OPEN', 'UNDER_REVIEW', 'RESOLVED'] },
      },
      _count: true,
    });

    const disputeMap = new Map<string, number>();
    for (const row of disputeCounts) {
      const rid = row.requesterWebsiteId;
      const pid = row.providerWebsiteId;
      if (rid && websiteIds.includes(rid)) {
        disputeMap.set(rid, (disputeMap.get(rid) ?? 0) + row._count);
      }
      if (pid && websiteIds.includes(pid)) {
        disputeMap.set(pid, (disputeMap.get(pid) ?? 0) + row._count);
      }
    }

    for (const website of websites) {
      const profile = website.matchingProfile;
      const totalCompleted = profile?.completedInteractions ?? 0;
      const totalInteractions = profile?.totalInteractions ?? 0;
      const completionRate =
        totalInteractions > 0
          ? Number(((totalCompleted / totalInteractions) * 100).toFixed(1))
          : 0;
      const disputeCount = disputeMap.get(website.id) ?? 0;
      const disputeRate =
        totalInteractions > 0
          ? Number(((disputeCount / totalInteractions) * 100).toFixed(1))
          : 0;
      const avgQualityRating = profile?.avgQualityRating ?? 0;

      results.set(website.id, {
        isVerified: website.verificationStatus === 'VERIFIED',
        qualityTier: this.computeQualityTier(
          completionRate,
          disputeRate,
          avgQualityRating,
          totalCompleted,
        ),
        avgResponseTimeHours: null,
        completionRate,
        disputeRate,
        totalCompletedTasks: totalCompleted,
        memberSince: website.createdAt,
      });
    }

    return results;
  }

  private computeQualityTier(
    completionRate: number,
    disputeRate: number,
    avgQualityRating: number,
    totalCompleted: number,
  ): TrustIndicators['qualityTier'] {
    if (totalCompleted < 5) return 'UNRATED';
    if (completionRate >= 95 && disputeRate <= 2 && avgQualityRating >= 4.5)
      return 'PLATINUM';
    if (completionRate >= 85 && disputeRate <= 5 && avgQualityRating >= 4.0)
      return 'GOLD';
    if (completionRate >= 70 && disputeRate <= 10) return 'SILVER';
    if (completionRate >= 50) return 'BRONZE';
    return 'UNRATED';
  }

  private async computeAvgResponseTimeHours(
    websiteId: string,
  ): Promise<number | null> {
    const interactions = await this.prisma.domainInteraction.findMany({
      where: {
        OR: [{ sourceWebsiteId: websiteId }, { targetWebsiteId: websiteId }],
      },
      select: {
        sourceWebsiteId: true,
        targetWebsiteId: true,
        completedAt: true,
        taskId: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    if (interactions.length === 0) return null;

    const responseTimes: number[] = [];
    for (const interaction of interactions) {
      const task = await this.prisma.placementTask.findUnique({
        where: { id: interaction.taskId },
        select: { assignedAt: true, createdAt: true },
      });
      if (task?.assignedAt) {
        const hours =
          (interaction.completedAt.getTime() - task.assignedAt.getTime()) /
          (1000 * 60 * 60);
        if (hours >= 0) responseTimes.push(hours);
      }
    }

    if (responseTimes.length === 0) return null;
    return Number(
      (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(
        1,
      ),
    );
  }

  private emptyIndicators(): TrustIndicators {
    return {
      isVerified: false,
      qualityTier: 'UNRATED',
      avgResponseTimeHours: null,
      completionRate: 0,
      disputeRate: 0,
      totalCompletedTasks: 0,
      memberSince: new Date(),
    };
  }
}
