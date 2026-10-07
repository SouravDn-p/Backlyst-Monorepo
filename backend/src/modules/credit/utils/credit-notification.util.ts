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

type CreateCreditNotificationInput = {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  amount: number;
  websiteId?: string | null;
  taskId?: string | null;
  directTaskRequestId?: string | null;
  sessionId?: string | null;
  walletType?: string | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  idempotencyKey: string;
};

/**
 * Store credit-balance notifications in the same transaction as the credit
 * movement. This keeps notification rows consistent with wallet/log writes:
 * if the credit transaction rolls back, the notification rolls back too.
 *
 * Realtime delivery is intentionally not queued here because external queues
 * cannot be committed atomically with Prisma transactions. The notification is
 * still visible through GET /notifications after commit.
 */
export async function createCreditNotificationIfAllowed(
  db: DbClient,
  input: CreateCreditNotificationInput,
) {
  const user = await db.user.findUnique({
    where: { id: input.recipientId },
    select: {
      id: true,
      role: true,
      status: true,
      isDeleted: true,
      notificationCreditBalanceAlerts: true,
      notificationPreference: {
        select: { creditBalanceAlerts: true },
      },
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

  const creditAlertsEnabled =
    user.notificationPreference?.creditBalanceAlerts ??
    user.notificationCreditBalanceAlerts;

  if (!creditAlertsEnabled) {
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
      category: NotificationCategory.CREDIT_BALANCE,
      priority: NotificationPriority.NORMAL,
      title: input.title,
      body: input.body,
      entityType: NotificationEntityType.CREDIT,
      entityId:
        input.taskId ?? input.directTaskRequestId ?? input.sessionId ?? null,
      idempotencyKey: input.idempotencyKey,
      data: {
        amount: input.amount,
        websiteId: input.websiteId ?? null,
        taskId: input.taskId ?? null,
        directTaskRequestId: input.directTaskRequestId ?? null,
        sessionId: input.sessionId ?? null,
        walletType: input.walletType ?? null,
        balanceBefore: input.balanceBefore ?? null,
        balanceAfter: input.balanceAfter ?? null,
      } satisfies Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}
