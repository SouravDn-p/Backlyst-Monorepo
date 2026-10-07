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
import { PrismaService } from 'src/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

type CreateSubscriptionNotificationInput = {
  userId: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  body: string;
  subscriptionId?: string | null;
  entityId?: string | null;
  planId?: string | null;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  amount?: number | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  idempotencyKey: string;
  data?: Record<string, unknown>;
};

/**
 * Subscription/payment notifications are stored with stable idempotency keys so
 * Stripe retries or success-page fallback calls do not create duplicate rows.
 */
export async function createSubscriptionNotificationIfAllowed(
  db: DbClient,
  input: CreateSubscriptionNotificationInput,
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
      audience: NotificationAudience.USER,
      type: input.type,
      category: input.category ?? NotificationCategory.SYSTEM_ANNOUNCEMENT,
      priority: NotificationPriority.NORMAL,
      title: input.title,
      body: input.body,
      entityType: NotificationEntityType.SYSTEM,
      entityId: input.entityId ?? input.subscriptionId ?? null,
      idempotencyKey: input.idempotencyKey,
      data: {
        subscriptionId: input.subscriptionId ?? null,
        planId: input.planId ?? null,
        stripeInvoiceId: input.stripeInvoiceId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        amount: input.amount ?? null,
        periodStart: input.periodStart?.toISOString() ?? null,
        periodEnd: input.periodEnd?.toISOString() ?? null,
        ...(input.data ?? {}),
      } satisfies Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}
