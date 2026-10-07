import {
  NotificationAudience,
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createReferralNotificationIfAllowed } from './referral-notification.util';

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

describe('createReferralNotificationIfAllowed', () => {
  it('creates a reward category notification for an active user', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });
    db.notification.findFirst.mockResolvedValue(null);
    db.notification.create.mockResolvedValue({ id: 'notification-1' });

    await createReferralNotificationIfAllowed(db as any, {
      recipientId: 'user-1',
      actorId: 'actor-1',
      referralId: 'referral-1',
      type: NotificationType.REWARD_EARNED,
      title: 'Referral reward unlocked',
      body: 'You earned referral credits.',
      idempotencyKey: 'referral-stage-1-user-1',
      data: {
        stage: 'WEBSITE_VERIFIED',
        taskCredits: 1,
      },
    });

    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        recipientId: 'user-1',
        actorId: 'actor-1',
        audience: NotificationAudience.USER,
        type: NotificationType.REWARD_EARNED,
        category: NotificationCategory.REWARD,
        priority: NotificationPriority.NORMAL,
        title: 'Referral reward unlocked',
        body: 'You earned referral credits.',
        entityType: NotificationEntityType.REWARD,
        entityId: 'referral-1',
        idempotencyKey: 'referral-stage-1-user-1',
        data: {
          referralId: 'referral-1',
          stage: 'WEBSITE_VERIFIED',
          taskCredits: 1,
        },
      },
      select: { id: true },
    });
  });

  it('skips when recipient is not an active user', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });

    const result = await createReferralNotificationIfAllowed(db as any, {
      recipientId: 'admin-1',
      referralId: 'referral-1',
      type: NotificationType.REWARD_EARNED,
      title: 'Referral reward unlocked',
      body: 'You earned referral credits.',
      idempotencyKey: 'referral-stage-1-admin-1',
      data: {},
    });

    expect(result).toBeNull();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it('returns existing notification for the same idempotency key', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });
    db.notification.findFirst.mockResolvedValue({ id: 'notification-1' });

    const result = await createReferralNotificationIfAllowed(db as any, {
      recipientId: 'user-1',
      referralId: 'referral-1',
      type: NotificationType.REWARD_EARNED,
      title: 'Referral reward unlocked',
      body: 'You earned referral credits.',
      idempotencyKey: 'referral-stage-1-user-1',
      data: {},
    });

    expect(result).toEqual({ id: 'notification-1' });
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
