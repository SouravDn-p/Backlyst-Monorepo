import {
  NotificationAudience,
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';

type ReferralNotificationInput = {
  recipientId: string;
  actorId?: string | null;
  referralId: string;
  type: NotificationType;
  title: string;
  body: string;
  idempotencyKey: string;
  data: Record<string, unknown>;
};

/**
 * Referral stage updates are created inside the same database transaction as
 * the referral/reward changes. That keeps the notification consistent with the
 * business event: if the reward transaction rolls back, the notification rolls
 * back too.
 */
export async function createReferralNotificationIfAllowed(
  db: Prisma.TransactionClient,
  input: ReferralNotificationInput,
) {
  const user = await db.user.findUnique({
    where: { id: input.recipientId },
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
      recipientId: input.recipientId,
      idempotencyKey: input.idempotencyKey,
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return db.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      audience: NotificationAudience.USER,
      type: input.type,
      category: NotificationCategory.REWARD,
      priority: NotificationPriority.NORMAL,
      title: input.title,
      body: input.body,
      entityType: NotificationEntityType.REWARD,
      entityId: input.referralId,
      idempotencyKey: input.idempotencyKey,
      data: {
        referralId: input.referralId,
        ...input.data,
      } satisfies Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}
