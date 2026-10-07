import {
  NotificationAudience,
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createSubscriptionNotificationIfAllowed } from './subscription-notification.util';

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

describe('createSubscriptionNotificationIfAllowed', () => {
  it('creates a subscription notification for an active user', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });
    db.notification.findFirst.mockResolvedValue(null);
    db.notification.create.mockResolvedValue({ id: 'notification-1' });

    await createSubscriptionNotificationIfAllowed(db as any, {
      userId: 'user-1',
      type: NotificationType.CREDIT_REWARDED,
      category: NotificationCategory.CREDIT_BALANCE,
      title: 'Subscription credits added',
      body: '10 credits added.',
      subscriptionId: 'subscription-1',
      planId: 'plan-1',
      stripeInvoiceId: 'invoice-1',
      amount: 10,
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-09-01T00:00:00.000Z'),
      idempotencyKey: 'subscription-credit-granted-subscription-1-invoice-1',
      data: {
        isRenewal: true,
      },
    });

    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        recipientId: 'user-1',
        audience: NotificationAudience.USER,
        type: NotificationType.CREDIT_REWARDED,
        category: NotificationCategory.CREDIT_BALANCE,
        priority: NotificationPriority.NORMAL,
        title: 'Subscription credits added',
        body: '10 credits added.',
        entityType: NotificationEntityType.SYSTEM,
        entityId: 'subscription-1',
        idempotencyKey: 'subscription-credit-granted-subscription-1-invoice-1',
        data: {
          subscriptionId: 'subscription-1',
          planId: 'plan-1',
          stripeInvoiceId: 'invoice-1',
          stripeSubscriptionId: null,
          amount: 10,
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-09-01T00:00:00.000Z',
          isRenewal: true,
        },
      },
      select: { id: true },
    });
  });

  it('skips inactive or non-user recipients', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });

    const result = await createSubscriptionNotificationIfAllowed(db as any, {
      userId: 'admin-1',
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Subscription renewed',
      body: 'Payment successful.',
      subscriptionId: 'subscription-1',
      idempotencyKey: 'subscription-renewed-subscription-1',
    });

    expect(result).toBeNull();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it('returns an existing notification for duplicate Stripe retries', async () => {
    const db = createDbMock();
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });
    db.notification.findFirst.mockResolvedValue({ id: 'notification-1' });

    const result = await createSubscriptionNotificationIfAllowed(db as any, {
      userId: 'user-1',
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: 'Subscription renewed',
      body: 'Payment successful.',
      subscriptionId: 'subscription-1',
      stripeInvoiceId: 'invoice-1',
      idempotencyKey: 'subscription-payment-success-subscription-1-invoice-1',
    });

    expect(result).toEqual({ id: 'notification-1' });
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
