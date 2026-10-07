import {
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';
import { VisibilityMaintenanceService } from './visibility-maintenance.service';

const now = new Date('2026-08-05T10:00:00.000Z');
const inactiveBefore = new Date('2026-08-05T09:58:00.000Z');
const graceEndsAt = new Date('2026-08-05T10:02:00.000Z');

const baseWebsite = {
  websiteId: 'website-1',
  ownerId: 'user-1',
  websiteName: 'Backlyst Test Site',
  websiteUrl: 'https://backlyst-test.com',
  marketplaceVisibilityStatus: 'VISIBLE',
  visibilityGraceEndsAt: null,
  visibilityCredits: 0,
  visibilityActiveUntil: null,
  lastActivityAt: new Date('2026-08-05T09:50:00.000Z'),
};

function createService() {
  const prisma = {
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  const notificationService = {
    sendNotification: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };

  const service = new VisibilityMaintenanceService(
    prisma as any,
    notificationService as any,
  );

  return { service, prisma, notificationService };
}

describe('VisibilityMaintenanceService', () => {
  it('notifies the owner when an inactive visible website enters grace period', async () => {
    const { service, prisma, notificationService } = createService();

    await (service as any).updateWebsiteVisibilityState(
      baseWebsite,
      now,
      inactiveBefore,
      graceEndsAt,
    );

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'user-1',
        type: NotificationType.WEBSITE_VISIBILITY_EXPIRING,
        category: NotificationCategory.MARKETPLACE,
        entityType: NotificationEntityType.WEBSITE,
        entityId: 'website-1',
        title: 'Website entered grace period',
      }),
    );
  });

  it('notifies the owner when grace period expires and website becomes hidden', async () => {
    const { service, prisma, notificationService } = createService();
    const visibilityGraceEndsAt = new Date('2026-08-05T09:59:00.000Z');

    await (service as any).updateWebsiteVisibilityState(
      {
        ...baseWebsite,
        marketplaceVisibilityStatus: 'GRACE_PERIOD',
        visibilityGraceEndsAt,
      },
      now,
      inactiveBefore,
      graceEndsAt,
    );

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'user-1',
        type: NotificationType.WEBSITE_VISIBILITY_EXPIRED,
        category: NotificationCategory.MARKETPLACE,
        entityType: NotificationEntityType.WEBSITE,
        entityId: 'website-1',
        title: 'Website visibility expired',
        idempotencyKey: `website-visibility-expired-website-1-${visibilityGraceEndsAt.toISOString()}`,
      }),
    );
  });

  it('notifies the owner when visibility is restored from grace period', async () => {
    const { service, prisma, notificationService } = createService();

    await (service as any).updateWebsiteVisibilityState(
      {
        ...baseWebsite,
        marketplaceVisibilityStatus: 'GRACE_PERIOD',
        visibilityCredits: 1,
        visibilityGraceEndsAt: new Date('2026-08-05T10:02:00.000Z'),
      },
      now,
      inactiveBefore,
      graceEndsAt,
    );

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'user-1',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        category: NotificationCategory.MARKETPLACE,
        entityType: NotificationEntityType.WEBSITE,
        entityId: 'website-1',
        title: 'Website visibility restored',
      }),
    );
  });

  it('does not notify when the website stays visible', async () => {
    const { service, prisma, notificationService } = createService();

    await (service as any).updateWebsiteVisibilityState(
      {
        ...baseWebsite,
        visibilityCredits: 1,
      },
      now,
      inactiveBefore,
      graceEndsAt,
    );

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(notificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('does not notify if the visibility status update fails', async () => {
    const { service, prisma, notificationService } = createService();
    prisma.$executeRaw.mockRejectedValue(new Error('database unavailable'));

    await (service as any).updateWebsiteVisibilityState(
      baseWebsite,
      now,
      inactiveBefore,
      graceEndsAt,
    );

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(notificationService.sendNotification).not.toHaveBeenCalled();
  });
});
