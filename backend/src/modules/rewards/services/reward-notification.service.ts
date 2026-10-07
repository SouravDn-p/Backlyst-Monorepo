import { Injectable } from '@nestjs/common';
import {
  BadgeDefinition,
  NotificationAudience,
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';

type RewardNotificationInput = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string | null;
  idempotencyKey: string;
  data: Record<string, unknown>;
};

type BadgeNotificationInput = {
  userId: string;
  actorId?: string | null;
  badge: Pick<
    BadgeDefinition,
    'id' | 'code' | 'name' | 'rewardType' | 'rewardValue'
  >;
  taskId?: string | null;
  source: 'AUTO' | 'ADMIN';
};

@Injectable()
export class RewardNotificationService {
  /**
   * Reward notifications are written in the same Prisma transaction as the
   * reward/badge/milestone update. This avoids telling a user they earned
   * something if the actual reward transaction is rolled back.
   */
  async createRewardNotificationIfAllowed(
    db: Prisma.TransactionClient,
    input: RewardNotificationInput,
  ) {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        role: true,
        status: true,
        isDeleted: true,
      },
    });

    if (
      !user ||
      user.isDeleted ||
      user.status !== UserStatus.ACTIVE ||
      user.role !== UserRole.USER
    ) {
      return null;
    }

    const existing = await db.notification.findFirst({
      where: {
        recipientId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    return db.notification.create({
      data: {
        recipientId: input.userId,
        actorId: input.actorId ?? null,
        audience: NotificationAudience.USER,
        type: input.type,
        category: NotificationCategory.REWARD,
        priority: NotificationPriority.NORMAL,
        title: input.title,
        body: input.body,
        entityType: input.entityType ?? NotificationEntityType.REWARD,
        entityId: input.entityId ?? null,
        idempotencyKey: input.idempotencyKey,
        data: input.data as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  }

  async notifyBadgeUnlocked(
    db: Prisma.TransactionClient,
    input: BadgeNotificationInput,
  ) {
    const rewardText =
      input.badge.rewardValue && input.badge.rewardValue > 0
        ? ` Reward benefit: ${input.badge.rewardValue} ${input.badge.rewardType.toLowerCase().replace(/_/g, ' ')}.`
        : '';

    return this.createRewardNotificationIfAllowed(db, {
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: NotificationType.BADGE_UNLOCKED,
      title: 'Badge unlocked',
      body: `You unlocked the ${input.badge.name} badge.${rewardText}`,
      entityType: NotificationEntityType.BADGE,
      entityId: input.badge.id,
      idempotencyKey: `badge-unlocked-${input.userId}-${input.badge.code}`,
      data: {
        badgeId: input.badge.id,
        badgeCode: input.badge.code,
        badgeName: input.badge.name,
        taskId: input.taskId ?? null,
        source: input.source,
        rewardType: input.badge.rewardType,
        rewardValue: input.badge.rewardValue ?? null,
      },
    });
  }

  async notifyBadgeActivated(
    db: Prisma.TransactionClient,
    input: BadgeNotificationInput,
  ) {
    return this.createRewardNotificationIfAllowed(db, {
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: NotificationType.REWARD_EARNED,
      title: 'Reward badge activated',
      body: `${input.badge.name} is now active on your account.`,
      entityType: NotificationEntityType.BADGE,
      entityId: input.badge.id,
      idempotencyKey: `badge-activated-${input.userId}-${input.badge.code}`,
      data: {
        badgeId: input.badge.id,
        badgeCode: input.badge.code,
        badgeName: input.badge.name,
        taskId: input.taskId ?? null,
        source: input.source,
        rewardType: input.badge.rewardType,
        rewardValue: input.badge.rewardValue ?? null,
      },
    });
  }

  async notifyMilestoneReached(
    db: Prisma.TransactionClient,
    input: {
      userId: string;
      websiteId: string;
      taskId: string;
      totalVerifiedPlacements: number;
      rewardCredits: number;
    },
  ) {
    return this.createRewardNotificationIfAllowed(db, {
      userId: input.userId,
      type: NotificationType.MILESTONE_REACHED,
      title: 'Milestone reached',
      body: `Your website reached ${input.totalVerifiedPlacements} verified placements and earned ${input.rewardCredits} task credit.`,
      entityType: NotificationEntityType.WEBSITE,
      entityId: input.websiteId,
      idempotencyKey: `milestone-${input.websiteId}-${input.totalVerifiedPlacements}`,
      data: {
        websiteId: input.websiteId,
        taskId: input.taskId,
        totalVerifiedPlacements: input.totalVerifiedPlacements,
        rewardCredits: input.rewardCredits,
      },
    });
  }

  async notifyWeeklyContributionRewarded(
    db: Prisma.TransactionClient,
    input: {
      userId: string;
      websiteId: string;
      taskId: string;
      weekStartAt: Date;
      weekEndAt: Date;
      rewardCredits: number;
    },
  ) {
    return this.createRewardNotificationIfAllowed(db, {
      userId: input.userId,
      type: NotificationType.WEEKLY_CONTRIBUTION_REWARDED,
      title: 'Weekly contribution reward earned',
      body: `You earned ${input.rewardCredits} task credit for this week's verified contribution.`,
      entityType: NotificationEntityType.WEBSITE,
      entityId: input.websiteId,
      idempotencyKey: `weekly-contribution-${input.websiteId}-${input.weekStartAt.toISOString()}`,
      data: {
        websiteId: input.websiteId,
        taskId: input.taskId,
        weekStartAt: input.weekStartAt.toISOString(),
        weekEndAt: input.weekEndAt.toISOString(),
        rewardCredits: input.rewardCredits,
      },
    });
  }

  async notifyStreakUpdated(
    db: Prisma.TransactionClient,
    input: {
      userId: string;
      websiteId: string;
      currentStreakWeeks: number;
      longestStreakWeeks: number;
      weekStartAt: Date;
    },
  ) {
    return this.createRewardNotificationIfAllowed(db, {
      userId: input.userId,
      type: NotificationType.STREAK_UPDATED,
      title: 'Contribution streak updated',
      body: `Your website contribution streak is now ${input.currentStreakWeeks} week${input.currentStreakWeeks === 1 ? '' : 's'}.`,
      entityType: NotificationEntityType.WEBSITE,
      entityId: input.websiteId,
      idempotencyKey: `streak-updated-${input.websiteId}-${input.weekStartAt.toISOString()}`,
      data: {
        websiteId: input.websiteId,
        currentStreakWeeks: input.currentStreakWeeks,
        longestStreakWeeks: input.longestStreakWeeks,
        weekStartAt: input.weekStartAt.toISOString(),
      },
    });
  }
}
