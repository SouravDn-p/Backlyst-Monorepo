import {
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';

export type SendNotificationInput = {
  recipientId: string;
  type: NotificationType;
  title?: string;
  body?: string;
  data?: Prisma.InputJsonValue;
  actorId?: string | null;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  idempotencyKey?: string | null;
};

export type SendBulkNotificationsInput = Omit<
  SendNotificationInput,
  'recipientId'
> & {
  recipientIds: string[];
};

export type SendAdminNotificationInput = Omit<
  SendNotificationInput,
  'recipientId' | 'category'
> & {
  category: NotificationCategory;
};

export type NotificationEmitRealtimeJobData = {
  notificationId: string;
};

export type NotificationBulkEmitRealtimeJobData = {
  notificationIds: string[];
};

export type NotificationSocketMeta = {
  userId: string;
  sessionId: string;
};
