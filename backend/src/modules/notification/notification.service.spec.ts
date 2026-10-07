import {
  NotificationAudience,
  NotificationCategory,
  NotificationStatus,
  NotificationType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { NotificationService } from './notification.service';

const activeUser = {
  id: 'user-1',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  isDeleted: false,
  notificationTaskStatusUpdates: true,
  notificationCreditBalanceAlerts: true,
  notificationDisputeReviewNotifications: true,
  notificationSystemAnnouncements: false,
};

const baseNotification = {
  id: 'notification-1',
  recipientId: 'user-1',
  actorId: null,
  audience: NotificationAudience.USER,
  type: NotificationType.TASK_APPROVED,
  category: NotificationCategory.TASK_STATUS,
  priority: 'NORMAL',
  title: 'Task approved',
  body: 'Your task has been approved.',
  data: null,
  entityType: null,
  entityId: null,
  status: NotificationStatus.UNREAD,
  deliveryStatus: 'PENDING',
  deliveredAt: null,
  readAt: null,
  idempotencyKey: null,
  createdAt: new Date('2026-06-29T00:00:00.000Z'),
  updatedAt: new Date('2026-06-29T00:00:00.000Z'),
};

function createMocks() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const gateway = {
    emitToUser: jest.fn(),
  };

  const queue = {
    add: jest.fn(),
  };

  const pubSub = {
    publish: jest.fn(),
  };

  const metrics = {
    recordMetric: jest.fn(),
  };

  const service = new NotificationService(
    prisma as any,
    pubSub as any,
    metrics as any,
    queue as any,
  );
  return { service, prisma, gateway, queue, pubSub, metrics };
}

describe('NotificationService', () => {
  it('creates a user notification and queues realtime delivery', async () => {
    const { service, prisma, queue } = createMocks();
    prisma.user.findUnique.mockResolvedValue(activeUser);
    prisma.notificationPreference.findUnique.mockResolvedValue({
      userId: 'user-1',
      taskStatusUpdates: true,
      creditBalanceAlerts: true,
      disputeReviewNotifications: true,
      systemAnnouncements: false,
      contactPreferenceTags: null,
    });
    prisma.notification.create.mockResolvedValue(baseNotification);
    queue.add.mockResolvedValue({ id: 'job-1' });

    const result = await service.sendNotification({
      recipientId: 'user-1',
      type: NotificationType.TASK_APPROVED,
    });

    expect(result).toEqual(baseNotification);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: 'user-1',
          audience: NotificationAudience.USER,
          type: NotificationType.TASK_APPROVED,
          category: NotificationCategory.TASK_STATUS,
        }),
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'notification.emit-realtime',
      { notificationId: 'notification-1' },
      expect.any(Object),
    );
  });

  it('skips a disabled user preference category', async () => {
    const { service, prisma, queue } = createMocks();
    prisma.user.findUnique.mockResolvedValue(activeUser);
    prisma.notificationPreference.findUnique.mockResolvedValue({
      userId: 'user-1',
      taskStatusUpdates: false,
      creditBalanceAlerts: true,
      disputeReviewNotifications: true,
      systemAnnouncements: false,
      contactPreferenceTags: null,
    });

    const result = await service.sendNotification({
      recipientId: 'user-1',
      type: NotificationType.TASK_APPROVED,
    });

    expect(result).toEqual(
      expect.objectContaining({ skipped: true, recipientId: 'user-1' }),
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('creates one admin notification row for every active admin', async () => {
    const { service, prisma, queue } = createMocks();
    prisma.user.findMany.mockResolvedValue([
      { id: 'admin-1' },
      { id: 'admin-2' },
    ]);
    prisma.notification.create
      .mockResolvedValueOnce({
        ...baseNotification,
        id: 'admin-notification-1',
        recipientId: 'admin-1',
        audience: NotificationAudience.ADMIN,
      })
      .mockResolvedValueOnce({
        ...baseNotification,
        id: 'admin-notification-2',
        recipientId: 'admin-2',
        audience: NotificationAudience.ADMIN,
      });
    queue.add.mockResolvedValue({ id: 'job-1' });

    const result = await service.sendAdminNotification({
      type: NotificationType.ADMIN_CREDIT_LEDGER_ALERT,
      category: NotificationCategory.ADMIN_LEDGER,
    });

    expect(result).toHaveLength(2);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith(
      'notification.bulk-emit-realtime',
      { notificationIds: ['admin-notification-1', 'admin-notification-2'] },
      expect.any(Object),
    );
  });

  it('does not let one user mark another user notification as read', async () => {
    const { service, prisma } = createMocks();
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(
      service.markAsRead('user-1', 'notification-owned-by-user-2'),
    ).rejects.toThrow('Notification not found');
  });
});
