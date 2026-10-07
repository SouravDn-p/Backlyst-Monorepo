import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BadgeCategory,
  Prisma,
  RewardBenefitStatus,
  SubmissionStatus,
  TaskStatus,
  UserBadgeStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPeriodDateRange } from '../community-showcase.utils';

@Injectable()
export class UserShowcaseStatsService {
  private readonly logger = new Logger(UserShowcaseStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refreshUserStats(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.USER,
        isDeleted: false,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found for showcase stats refresh.');
    }

    const approvedWhere: Prisma.PlacementTaskWhereInput = {
      selectedProviderId: userId,
      lifecycleStatus: TaskStatus.COMPLETED,
      submissionStatus: SubmissionStatus.APPROVED,
    };

    const reviewedWhere: Prisma.PlacementTaskWhereInput = {
      selectedProviderId: userId,
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
      rewardProfile,
      approvedTasks,
      reviewedTasks,
      disputedTasks,
      revisionTasks,
      weeklyApprovedTasks,
      monthlyApprovedTasks,
      activeBadgeCount,
      permanentBadgeCount,
      hallOfFameCount,
      earnedBadges,
      activeBenefits,
    ] = await Promise.all([
      this.prisma.userRewardProfile.findUnique({
        where: { userId },
        select: {
          totalApprovedTasks: true,
          providerApprovedTasks: true,
          providerApprovalRate: true,
          providerDisputeRate: true,
          providerRevisionRate: true,
          earnedBadgeCount: true,
          activeRewardCount: true,
        },
      }),
      this.prisma.placementTask.count({ where: approvedWhere }),
      this.prisma.placementTask.count({ where: reviewedWhere }),
      this.prisma.placementTask.count({
        where: {
          selectedProviderId: userId,
          lifecycleStatus: TaskStatus.DISPUTED,
        },
      }),
      this.prisma.placementTask.count({
        where: {
          selectedProviderId: userId,
          OR: [
            { lifecycleStatus: TaskStatus.REVISION_REQUESTED },
            { submissionStatus: SubmissionStatus.REVISION_REQUESTED },
          ],
        },
      }),
      this.prisma.placementTask.count({
        where: {
          ...approvedWhere,
          completedAt: {
            gte: weeklyRange.from,
            lte: weeklyRange.to,
          },
        },
      }),
      this.prisma.placementTask.count({
        where: {
          ...approvedWhere,
          completedAt: {
            gte: monthlyRange.from,
            lte: monthlyRange.to,
          },
        },
      }),
      this.prisma.userBadge.count({
        where: {
          userId,
          status: UserBadgeStatus.ACTIVE,
        },
      }),
      this.prisma.userBadge.count({
        where: {
          userId,
          status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
          badge: {
            isPersistent: true,
          },
        },
      }),
      this.prisma.userBadge.count({
        where: {
          userId,
          status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
          badge: {
            category: BadgeCategory.HALL_OF_FAME,
          },
        },
      }),
      this.prisma.userBadge.findMany({
        where: {
          userId,
          status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
          badge: {
            code: { in: ['TRUSTED_PARTNER', 'FIRST_SUCCESS', 'HIGH_APPROVAL'] },
          },
        },
        select: {
          status: true,
          badge: { select: { code: true } },
        },
      }),
      this.prisma.userRewardBenefit.findMany({
        where: {
          userId,
          status: RewardBenefitStatus.ACTIVE,
        },
        select: {
          rewardCode: true,
          rewardType: true,
        },
      }),
    ]);

    const approvalRate = this.calculateRate(approvedTasks, reviewedTasks);
    const disputeRate = this.calculateRate(disputedTasks, reviewedTasks);
    const revisionRate = this.calculateRate(revisionTasks, reviewedTasks);
    const trustedPartnerBadge = earnedBadges.some(
      (item) => item.badge.code === 'TRUSTED_PARTNER',
    );
    const highApprovalBadge = earnedBadges.some(
      (item) => item.badge.code === 'HIGH_APPROVAL',
    );
    const firstSuccessBadge = earnedBadges.some(
      (item) => item.badge.code === 'FIRST_SUCCESS',
    );
    const supportPriorityActive = activeBenefits.some(
      (item) => item.rewardCode === 'SUPPORT_PRIORITY',
    );

    const topContributorScore =
      approvedTasks * 5 +
      approvalRate * 2 +
      activeBadgeCount * 10 +
      hallOfFameCount * 25 +
      weeklyApprovedTasks * 6 +
      monthlyApprovedTasks * 3 -
      disputeRate * 4;

    const trustedPartnerScore =
      approvalRate * 3 +
      approvedTasks * 2 +
      Math.max(0, 100 - disputeRate * 10) +
      permanentBadgeCount * 5 +
      (trustedPartnerBadge ? 40 : 0) +
      (supportPriorityActive ? 15 : 0);

    const risingStarScore =
      monthlyApprovedTasks * 8 +
      weeklyApprovedTasks * 10 +
      approvalRate +
      activeBadgeCount * 4 +
      (firstSuccessBadge ? 10 : 0) +
      (highApprovalBadge ? 20 : 0) -
      disputeRate * 3;

    const payload = {
      approvedTasks,
      approvalRate,
      disputeRate,
      revisionRate,
      activeBadgeCount,
      permanentBadgeCount,
      hallOfFameCount,
      weeklyApprovedTasks,
      monthlyApprovedTasks,
      topContributorScore: this.round(topContributorScore),
      trustedPartnerScore: this.round(trustedPartnerScore),
      risingStarScore: this.round(risingStarScore),
      lastCalculatedAt: new Date(),
    };

    return this.prisma.userShowcaseStats.upsert({
      where: { userId },
      create: {
        userId,
        ...payload,
      },
      update: payload,
    });
  }

  async refreshAllUserStats(limit?: number) {
    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.USER,
        isDeleted: false,
        status: { in: [UserStatus.ACTIVE, UserStatus.NOT_VERIFIED] },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let refreshed = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.refreshUserStats(user.id);
        refreshed += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Failed to refresh user showcase stats for ${user.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      total: users.length,
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

