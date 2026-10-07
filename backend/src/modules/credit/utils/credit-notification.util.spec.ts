import {
  NotificationAudience,
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createCreditNotificationIfAllowed } from './credit-notification.util';

describe('createCreditNotificationIfAllowed', () => {
  const baseUser = {
    id: 'user-1',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    isDeleted: false,
    notificationCreditBalanceAlerts: true,
    notificationPreference: null,
  };

  const input = {
    recipientId: 'user-1',
    actorId: 'actor-1',
    type: NotificationType.CREDIT_DEDUCTED,
    title: 'Task credits deducted',
    body: '2 task credits were reserved.',
    amount: 2,
    websiteId: 'website-1',
    taskId: 'task-1',
    walletType: 'PURCHASED',
    balanceBefore: 10,
    balanceAfter: 8,
    idempotencyKey: 'credit-deducted-task-1',
  };

  function mockDb(overrides: Record<string, unknown> = {}) {
    return {
      user: {
        findUnique: jest.fn().mockResolvedValue(baseUser),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      },
      ...overrides,
    } as any;
  }

  it('stores a credit notification for active users with credit alerts enabled', async () => {
    const db = mockDb();

    await createCreditNotificationIfAllowed(db, input);

    expect(db.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientId: 'user-1',
        actorId: 'actor-1',
        audience: NotificationAudience.USER,
        type: NotificationType.CREDIT_DEDUCTED,
        category: NotificationCategory.CREDIT_BALANCE,
        entityType: NotificationEntityType.CREDIT,
        entityId: 'task-1',
        idempotencyKey: 'credit-deducted-task-1',
      }),
      select: { id: true },
    });
  });

  it('does not store notification when credit alerts are disabled', async () => {
    const db = mockDb({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...baseUser,
          notificationPreference: { creditBalanceAlerts: false },
        }),
      },
    });

    const result = await createCreditNotificationIfAllowed(db, input);

    expect(result).toBeNull();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it('reuses existing notification for the same idempotency key', async () => {
    const db = mockDb({
      notification: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-notification' }),
        create: jest.fn(),
      },
    });

    const result = await createCreditNotificationIfAllowed(db, input);

    expect(result).toEqual({ id: 'existing-notification' });
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
