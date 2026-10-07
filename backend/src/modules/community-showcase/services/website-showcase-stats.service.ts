import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SubmissionStatus,
  TaskStatus,
  VerifiedPlacementStatus,
  WebsiteMarketplaceVisibilityStatus,
  WebsiteVerificationStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPeriodDateRange } from '../community-showcase.utils';

@Injectable()
export class WebsiteShowcaseStatsService {
  private readonly logger = new Logger(WebsiteShowcaseStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refreshWebsiteStats(websiteId: string) {
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        isDeleted: false,
      },
      select: {
        id: true,
        authorId: true,
        verificationStatus: true,
        marketplaceVisibilityStatus: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found for showcase stats refresh.');
    }

    const reviewedWhere: Prisma.PlacementTaskWhereInput = {
      assignedProviderWebsiteId: websiteId,
      OR: [
        {
          submissionStatus: {
            in: [
              SubmissionStatus.APPROVED,
              SubmissionStatus.REJECTED,
              SubmissionStatus.REVISION_REQUESTED,
            ],
          },
        },
        { lifecycleStatus: TaskStatus.DISPUTED },
      ],
    };

    const weeklyRange = getPeriodDateRange('THIS_WEEK')!;
    const monthlyRange = getPeriodDateRange('THIS_MONTH')!;

    const [
      ownerProfile,
      approvedPlacements,
      reviewedTasks,
      disputedTasks,
      weeklyPlacements,
      monthlyPlacements,
    ] = await Promise.all([
      this.prisma.userRewardProfile.findUnique({
        where: { userId: website.authorId },
        select: {
          providerApprovedTasks: true,
          earnedBadgeCount: true,
          activeRewardCount: true,
        },
      }),
      this.prisma.websiteVerifiedPlacement.count({
        where: {
          websiteId,
          status: VerifiedPlacementStatus.VERIFIED,
        },
      }),
      this.prisma.placementTask.count({ where: reviewedWhere }),
      this.prisma.placementTask.count({
        where: {
          assignedProviderWebsiteId: websiteId,
          lifecycleStatus: TaskStatus.DISPUTED,
        },
      }),
      this.prisma.websiteVerifiedPlacement.count({
        where: {
          websiteId,
          status: VerifiedPlacementStatus.VERIFIED,
          verifiedAt: {
            gte: weeklyRange.from,
            lte: weeklyRange.to,
          },
        },
      }),
      this.prisma.websiteVerifiedPlacement.count({
        where: {
          websiteId,
          status: VerifiedPlacementStatus.VERIFIED,
          verifiedAt: {
            gte: monthlyRange.from,
            lte: monthlyRange.to,
          },
        },
      }),
    ]);

    const approvalRate = this.calculateRate(approvedPlacements, reviewedTasks);
    const disputeRate = this.calculateRate(disputedTasks, reviewedTasks);
    const verificationBonus =
      website.verificationStatus === WebsiteVerificationStatus.VERIFIED ? 25 : 0;
    const visibilityPenalty =
      website.marketplaceVisibilityStatus === WebsiteMarketplaceVisibilityStatus.HIDDEN
        ? 20
        : 0;

    const successfulWebsiteScore =
      approvedPlacements * 6 +
      weeklyPlacements * 8 +
      monthlyPlacements * 4 +
      approvalRate +
      (ownerProfile?.providerApprovedTasks ?? 0) * 0.5 +
      (ownerProfile?.earnedBadgeCount ?? 0) * 3 +
      verificationBonus -
      disputeRate * 4 -
      visibilityPenalty;

    const payload = {
      ownerUserId: website.authorId,
      approvedPlacements,
      approvalRate,
      disputeRate,
      weeklyPlacements,
      monthlyPlacements,
      successfulWebsiteScore: this.round(successfulWebsiteScore),
      lastCalculatedAt: new Date(),
    };

    return this.prisma.websiteShowcaseStats.upsert({
      where: { websiteId },
      create: {
        websiteId,
        ...payload,
      },
      update: payload,
    });
  }

  async refreshAllWebsiteStats(limit?: number) {
    const websites = await this.prisma.website.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let refreshed = 0;
    let failed = 0;

    for (const website of websites) {
      try {
        await this.refreshWebsiteStats(website.id);
        refreshed += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Failed to refresh website showcase stats for ${website.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      total: websites.length,
      refreshed,
      failed,
    };
  }

  private calculateRate(numerator: number, denominator: number) {
    if (!denominator || denominator <= 0) {
      return 0;
    }

    return Number(((numerator / denominator) * 100).toFixed(2));
  }

  private round(value: number) {
    return Number(value.toFixed(2));
  }
}
