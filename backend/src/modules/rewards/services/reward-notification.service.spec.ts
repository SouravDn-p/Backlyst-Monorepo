import {
  BadgeRewardType,
  NotificationAudience,
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { RewardNotificationService } from './reward-notification.service';

function createDbMock() {
  return {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
}

describe('RewardNotificationService', () => {
  let service: RewardNotificationService;

  beforeEach(() => {
    service = new RewardNotificationService();
  });

  it('creates a badge unlocked notification for an active user', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });
    db.notification.findFirst.mockResolvedValue(null);
    db.notification.create.mockResolvedValue({ id: 'notification-1' });

    await service.notifyBadgeUnlocked(db as any, {
      userId: 'user-1',
      badge: {
        id: 'badge-1',
        code: 'FIRST_SUCCESS',
        name: 'First Success',
        rewardType: BadgeRewardType.RECOGNITION_ONLY,
        rewardValue: null,
      },
      taskId: 'task-1',
      source: 'AUTO',
    });

    expect(db.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientId: 'user-1',
        audience: NotificationAudience.USER,
        type: NotificationType.BADGE_UNLOCKED,
        category: NotificationCategory.REWARD,
        priority: NotificationPriority.NORMAL,
        title: 'Badge unlocked',
        entityType: NotificationEntityType.BADGE,
        entityId: 'badge-1',
        idempotencyKey: 'badge-unlocked-user-1-FIRST_SUCCESS',
        data: expect.objectContaining({
          badgeCode: 'FIRST_SUCCESS',
          taskId: 'task-1',
          source: 'AUTO',
        }),
      }),
      select: { id: true },
    });
  });

  it('creates a milestone notification with a stable idempotency key', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });
    db.notification.findFirst.mockResolvedValue(null);
    db.notification.create.mockResolvedValue({ id: 'notification-1' });

    await service.notifyMilestoneReached(db as any, {
      userId: 'user-1',
      websiteId: 'website-1',
      taskId: 'task-1',
      totalVerifiedPlacements: 10,
      rewardCredits: 1,
    });

    expect(db.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientId: 'user-1',
        type: NotificationType.MILESTONE_REACHED,
        category: NotificationCategory.REWARD,
        entityType: NotificationEntityType.WEBSITE,
        entityId: 'website-1',
        idempotencyKey: 'milestone-website-1-10',
        data: expect.objectContaining({
          totalVerifiedPlacements: 10,
          rewardCredits: 1,
        }),
      }),
      select: { id: true },
    });
  });

  it('does not create duplicate notification rows for the same idempotency key', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });
    db.notification.findFirst.mockResolvedValue({ id: 'notification-1' });

    const result = await service.notifyWeeklyContributionRewarded(db as any, {
      userId: 'user-1',
      websiteId: 'website-1',
      taskId: 'task-1',
      weekStartAt: new Date('2026-08-03T00:00:00.000Z'),
      weekEndAt: new Date('2026-08-09T23:59:59.999Z'),
      rewardCredits: 1,
    });

    expect(result).toEqual({ id: 'notification-1' });
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
