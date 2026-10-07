import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RewardBenefitStatus,
  SubmissionStatus,
  TaskStatus,
  UserBadgeStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

type DbClient = PrismaService | Prisma.TransactionClient;

type RefreshForApprovedTaskInput = {
  taskId: string;
  tx?: Prisma.TransactionClient;
};

@Injectable()
export class UserRewardProfileService {
  constructor(private readonly prisma: PrismaService) { }

  async getMyRewardProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return sendResponse('Reward profile fetched successfully.', profile);
  }

  async getOrCreateProfile(userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const existing = await db.userRewardProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    return db.userRewardProfile.create({
      data: {
        userId,
      },
    });
  }

  async syncBadgeAndRewardCounts(userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const [earnedBadgeCount, activeRewardCount] = await Promise.all([
      db.userBadge.count({
        where: {
          userId,
          status: {
            in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE],
          },
        },
      }),
      db.userRewardBenefit.count({
        where: {
          userId,
          status: RewardBenefitStatus.ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);

    return db.userRewardProfile.upsert({
      where: { userId },
      create: {
        userId,
        earnedBadgeCount,
        activeRewardCount,
        lastRewardEvaluatedAt: new Date(),
      },
      update: {
        earnedBadgeCount,
        activeRewardCount,
        lastRewardEvaluatedAt: new Date(),
      },
    });
  }

  async refreshForApprovedTask(input: RefreshForApprovedTaskInput) {
    const db = input.tx ?? this.prisma;

    const task = await db.placementTask.findUnique({
      where: { id: input.taskId },
      select: {
        id: true,
        requesterId: true,
        selectedProviderId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found for reward profile refresh.');
    }

    const uniqueUserIds = [
      ...new Set(
        [task.requesterId, task.selectedProviderId].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ];

    await Promise.all(
      uniqueUserIds.map((userId) => this.refreshUserRewardProfile(db, userId)),
    );

    return {
      requesterUserId: task.requesterId ?? undefined,
      providerUserId: task.selectedProviderId ?? undefined,
    };
  }

  private async refreshUserRewardProfile(db: DbClient, userId: string) {
    const completedApprovedWhere: Prisma.PlacementTaskWhereInput = {
      lifecycleStatus: TaskStatus.COMPLETED,
      submissionStatus: SubmissionStatus.APPROVED,
    };

    const providerReviewedWhere: Prisma.PlacementTaskWhereInput = {
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

    const requesterReviewedWhere: Prisma.PlacementTaskWhereInput = {
      requesterId: userId,
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

    const [
      totalApprovedTasks,
      providerApprovedTasks,
      requesterCompletedTasks,
      providerReviewedTasks,
      providerDisputedTasks,
      providerRevisionTasks,
      requesterReviewedTasks,
      requesterDisputedTasks,
      providerRequesterLinks,
      requesterProviderLinks,
      providerDomainLinks,
      verifiedPlacementCount,
      streakAggregate,
      earnedBadgeCount,
      activeRewardCount,
    ] = await Promise.all([
      db.placementTask.count({
        where: {
          ...completedApprovedWhere,
          OR: [{ requesterId: userId }, { selectedProviderId: userId }],
        },
      }),
      db.placementTask.count({
        where: {
          ...completedApprovedWhere,
          selectedProviderId: userId,
        },
      }),
      db.placementTask.count({
        where: {
          ...completedApprovedWhere,
          requesterId: userId,
        },
      }),
      db.placementTask.count({
        where: providerReviewedWhere,
      }),
      db.placementTask.count({
        where: {
          selectedProviderId: userId,
          lifecycleStatus: TaskStatus.DISPUTED,
        },
      }),
      db.placementTask.count({
        where: {
          selectedProviderId: userId,
          OR: [
            { lifecycleStatus: TaskStatus.REVISION_REQUESTED },
            { submissionStatus: SubmissionStatus.REVISION_REQUESTED },
          ],
        },
      }),
      db.placementTask.count({
        where: requesterReviewedWhere,
      }),
      db.placementTask.count({
        where: {
          requesterId: userId,
          lifecycleStatus: TaskStatus.DISPUTED,
        },
      }),
      db.placementTask.findMany({
        where: {
          ...completedApprovedWhere,
          selectedProviderId: userId,
        },
        distinct: ['requesterId'],
        select: { requesterId: true },
      }),
      db.placementTask.findMany({
        where: {
          ...completedApprovedWhere,
          requesterId: userId,
          selectedProviderId: { not: null },
        },
        distinct: ['selectedProviderId'],
        select: { selectedProviderId: true },
      }),
      db.placementTask.findMany({
        where: {
          ...completedApprovedWhere,
          selectedProviderId: userId,
        },
        distinct: ['requesterWebsiteId'],
        select: { requesterWebsiteId: true },
      }),
      db.websiteVerifiedPlacement.count({
        where: {
          userId,
          status: 'VERIFIED',
        },
      }),
      db.websiteActivityStreak.aggregate({
        where: { userId },
        _max: {
          currentStreakWeeks: true,
          longestStreakWeeks: true,
        },
      }),
      db.userBadge.count({
        where: {
          userId,
          status: {
            in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE],
          },
        },
      }),
      db.userRewardBenefit.count({
        where: {
          userId,
          status: RewardBenefitStatus.ACTIVE,
        },
      }),
    ]);

    const snapshot: Prisma.UserRewardProfileUncheckedCreateInput = {
      userId,
      totalApprovedTasks,
      providerApprovedTasks,
      requesterCompletedTasks,
      providerReviewedTasks,
      providerApprovalRate: this.calculateRate(
        providerApprovedTasks,
        providerReviewedTasks,
      ),
      providerDisputeRate: this.calculateRate(
        providerDisputedTasks,
        providerReviewedTasks,
      ),
      providerRevisionRate: this.calculateRate(
        providerRevisionTasks,
        providerReviewedTasks,
      ),
      requesterDisputeRate: this.calculateRate(
        requesterDisputedTasks,
        requesterReviewedTasks,
      ),
      currentStreakCount: streakAggregate._max.currentStreakWeeks ?? 0,
      bestStreakCount: streakAggregate._max.longestStreakWeeks ?? 0,
      milestoneTaskCount: verifiedPlacementCount,
      nextMilestoneAt: this.calculateNextMilestone(verifiedPlacementCount),
      uniqueRequesterCount: providerRequesterLinks.length,
      uniqueProviderCount: requesterProviderLinks.filter(
        (item) => item.selectedProviderId,
      ).length,
      uniqueDomainCount: providerDomainLinks.filter(
        (item) => item.requesterWebsiteId,
      ).length,
      earnedBadgeCount,
      activeRewardCount,
      lastRewardEvaluatedAt: new Date(),
    };

    const updateData: Prisma.UserRewardProfileUncheckedUpdateInput = {
      totalApprovedTasks,
      providerApprovedTasks,
      requesterCompletedTasks,
      providerReviewedTasks,
      providerApprovalRate: snapshot.providerApprovalRate,
      providerDisputeRate: snapshot.providerDisputeRate,
      providerRevisionRate: snapshot.providerRevisionRate,
      requesterDisputeRate: snapshot.requesterDisputeRate,
      currentStreakCount: snapshot.currentStreakCount,
      bestStreakCount: snapshot.bestStreakCount,
      milestoneTaskCount: snapshot.milestoneTaskCount,
      nextMilestoneAt: snapshot.nextMilestoneAt,
      uniqueRequesterCount: snapshot.uniqueRequesterCount,
      uniqueProviderCount: snapshot.uniqueProviderCount,
      uniqueDomainCount: snapshot.uniqueDomainCount,
      earnedBadgeCount,
      activeRewardCount,
      lastRewardEvaluatedAt: snapshot.lastRewardEvaluatedAt,
      // TODO: providerResponseRate24h, providerFastResponseCount,
      // providerResponseOpportunityCount, requesterReviewRate72h,
      // requesterFastReviewCount, and requesterReviewOpportunityCount
      // need a safer event-time source before they can be refreshed reliably.
      // TODO: if total badge history count is needed later, add a dedicated
      // totalBadgeHistoryCount field instead of overloading earnedBadgeCount.
    };

    await db.userRewardProfile.upsert({
      where: { userId },
      create: snapshot,
      update: updateData,
    });
  }

  private calculateRate(numerator: number, denominator: number) {
    if (!denominator || denominator <= 0) {
      return 0;
    }

    return Number(((numerator / denominator) * 100).toFixed(2));
  }

  private calculateNextMilestone(value: number) {
    if (value <= 0) {
      return 10;
    }

    return Math.floor(value / 10) * 10 + 10;
  }
}
