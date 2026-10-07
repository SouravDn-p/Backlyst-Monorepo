import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Notification,
  NotificationAudience,
  NotificationCategory,
  NotificationDeliveryStatus,
  NotificationPriority,
  NotificationStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  NOTIFICATION_QUEUE_JOB_NAMES,
  QUEUE_NAMES,
} from 'src/bullmq/constants/queue.constants';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationPubSubService } from './notification-pubsub.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import {
  SendAdminNotificationInput,
  SendBulkNotificationsInput,
  SendNotificationInput,
} from './types/notification.types';
import {
  getNotificationTemplate,
  inferNotificationCategory,
} from './utils/notification-template.util';
import { NotificationMetricsService } from './notification-metrics.service';

const adminCategories = new Set<NotificationCategory>([
  NotificationCategory.ADMIN_LEDGER,
  NotificationCategory.ADMIN_GOVERNANCE,
  NotificationCategory.ADMIN_RISK,
  NotificationCategory.ADMIN_SYSTEM,
  NotificationCategory.DISPUTE_REVIEW,
]);

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationPubSubService: NotificationPubSubService,
    private readonly notificationMetricsService: NotificationMetricsService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
  ) {}

  async sendNotification(input: SendNotificationInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.recipientId },
      select: {
        id: true,
        role: true,
        status: true,
        isDeleted: true,
        notificationTaskStatusUpdates: true,
        notificationCreditBalanceAlerts: true,
        notificationDisputeReviewNotifications: true,
        notificationSystemAnnouncements: true,
      },
    });

    if (
      !user ||
      user.isDeleted ||
      user.status !== UserStatus.ACTIVE ||
      user.role !== UserRole.USER
    ) {
      throw new NotFoundException('Recipient not found');
    }

    const category = input.category ?? inferNotificationCategory(input.type);
    const preference = await this.getOrCreatePreference(user.id, user);

    if (!this.isAllowedByPreferences(category, preference)) {
      return {
        skipped: true,
        reason: 'Notification disabled by user preferences',
        recipientId: user.id,
        category,
      };
    }

    const notification = await this.createNotification({
      ...input,
      recipientId: user.id,
      category,
      audience: NotificationAudience.USER,
    });

    await this.enqueueRealtime(notification.id);

    this.notificationMetricsService.recordMetric({
      id: notification.id,
      notificationType: notification.type,
      channel: 'IN_APP',
      status: 'SENT',
      latencyMs: 0,
      createdAt: new Date(),
    });

    return notification;
  }

  async sendBulkNotifications(input: SendBulkNotificationsInput) {
    const results = [] as unknown[];
    for (const recipientId of [...new Set(input.recipientIds)]) {
      results.push(await this.sendNotification({ ...input, recipientId }));
    }
    return results;
  }

  async sendAdminNotification(input: SendAdminNotificationInput) {
    if (!adminCategories.has(input.category)) {
      throw new BadRequestException('Invalid admin notification category');
    }

    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isDeleted: false,
      },
      select: { id: true },
    });

    const notifications: Notification[] = [];
    for (const admin of admins) {
      const notification = await this.createNotification({
        ...input,
        recipientId: admin.id,
        audience: NotificationAudience.ADMIN,
      });
      notifications.push(notification);
    }

    await this.enqueueBulkRealtime(notifications.map((item) => item.id));
    return notifications;
  }

  async getMyNotifications(userId: string, query: NotificationQueryDto) {
    return this.listNotifications(
      userId,
      NotificationAudience.USER,
      query,
      'Notifications fetched successfully',
    );
  }

  async getUnreadCount(userId: string) {
    const count = await this.countUnread(userId, NotificationAudience.USER);
    return sendResponse('Unread notification count fetched successfully', {
      count,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.markOneAsRead(
      userId,
      notificationId,
      NotificationAudience.USER,
    );
    return sendResponse(
      'Notification marked as read successfully',
      notification,
    );
  }

  async markAllAsRead(userId: string) {
    const result = await this.markAllForAudienceAsRead(
      userId,
      NotificationAudience.USER,
    );
    return sendResponse('Notifications marked as read successfully', result);
  }

  async getPreferences(userId: string) {
    const user = await this.findActiveUser(userId);
    const preference = await this.getOrCreatePreference(user.id, user);
    return sendResponse(
      'Notification preferences fetched successfully',
      this.toPreferenceResponse(preference),
    );
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    await this.findActiveUser(userId);
    const preference = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(dto.taskStatusUpdates !== undefined
          ? { taskStatusUpdates: dto.taskStatusUpdates }
          : {}),
        ...(dto.creditBalanceAlerts !== undefined
          ? { creditBalanceAlerts: dto.creditBalanceAlerts }
          : {}),
        ...(dto.disputeReviewNotifications !== undefined
          ? { disputeReviewNotifications: dto.disputeReviewNotifications }
          : {}),
        ...(dto.systemAnnouncements !== undefined
          ? { systemAnnouncements: dto.systemAnnouncements }
          : {}),
        ...(dto.contactPreferenceTags !== undefined
          ? {
              contactPreferenceTags:
                dto.contactPreferenceTags,
            }
          : {}),
      },
      create: {
        userId,
        taskStatusUpdates: dto.taskStatusUpdates ?? true,
        creditBalanceAlerts: dto.creditBalanceAlerts ?? true,
        disputeReviewNotifications: dto.disputeReviewNotifications ?? true,
        systemAnnouncements: dto.systemAnnouncements ?? false,
        contactPreferenceTags: dto.contactPreferenceTags,
      },
    });

    await this.syncLegacyPreferenceFields(userId, preference);
    return sendResponse(
      'Notification preferences updated successfully',
      this.toPreferenceResponse(preference),
    );
  }

  async getAdminNotifications(adminId: string, query: NotificationQueryDto) {
    return this.listNotifications(
      adminId,
      NotificationAudience.ADMIN,
      query,
      'Admin notifications fetched successfully',
    );
  }

  async getAdminUnreadCount(adminId: string) {
    const count = await this.countUnread(adminId, NotificationAudience.ADMIN);
    return sendResponse(
      'Admin unread notification count fetched successfully',
      { count },
    );
  }

  async markAdminAsRead(adminId: string, notificationId: string) {
    const notification = await this.markOneAsRead(
      adminId,
      notificationId,
      NotificationAudience.ADMIN,
    );
    return sendResponse(
      'Admin notification marked as read successfully',
      notification,
    );
  }

  async markAllAdminAsRead(adminId: string) {
    const result = await this.markAllForAudienceAsRead(
      adminId,
      NotificationAudience.ADMIN,
    );
    return sendResponse(
      'Admin notifications marked as read successfully',
      result,
    );
  }

  async markDeliveryResult(notificationId: string, emitted: boolean) {
    const notification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: emitted
        ? {
            deliveryStatus: NotificationDeliveryStatus.DELIVERED,
            deliveredAt: new Date(),
          }
        : { deliveryStatus: NotificationDeliveryStatus.PENDING },
    });

    if (emitted) {
      this.notificationMetricsService.recordMetric({
        id: notification.id,
        notificationType: notification.type,
        channel: 'IN_APP',
        status: 'DELIVERED',
        latencyMs: notification.deliveredAt
          ? notification.deliveredAt.getTime() -
            notification.createdAt.getTime()
          : 0,
        createdAt: new Date(),
      });
    }

    return notification;
  }

  async markDeliveryFailed(notificationId: string) {
    const notification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { deliveryStatus: NotificationDeliveryStatus.FAILED },
    });

    this.notificationMetricsService.recordMetric({
      id: notification.id,
      notificationType: notification.type,
      channel: 'IN_APP',
      status: 'FAILED',
      latencyMs: Date.now() - notification.createdAt.getTime(),
      createdAt: new Date(),
    });

    return notification;
  }

  async getRealtimeNotification(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) return null;

    return {
      event: 'notification.created' as const,
      recipientId: notification.recipientId,
      audience: notification.audience,
      notificationId: notification.id,
      notification: this.toNotificationPayload(notification),
      unreadCount: await this.countUnread(
        notification.recipientId,
        notification.audience,
      ),
    };
  }

  async getUnreadCountValue(
    recipientId: string,
    audience: NotificationAudience,
  ) {
    return this.countUnread(recipientId, audience);
  }

  private async createNotification(
    input: SendNotificationInput & {
      audience: NotificationAudience;
      category: NotificationCategory;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          recipientId: input.recipientId,
          idempotencyKey: input.idempotencyKey,
        },
      });
      if (existing) return existing;
    }

    const template = getNotificationTemplate(input.type);

    try {
      return await this.prisma.notification.create({
        data: {
          recipientId: input.recipientId,
          actorId: input.actorId ?? null,
          audience: input.audience,
          type: input.type,
          category: input.category,
          priority: input.priority ?? NotificationPriority.NORMAL,
          title: input.title ?? template.title,
          body: input.body ?? template.body,
          data: input.data ?? undefined,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        input.idempotencyKey
      ) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            recipientId: input.recipientId,
            idempotencyKey: input.idempotencyKey,
          },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async listNotifications(
    recipientId: string,
    audience: NotificationAudience,
    query: NotificationQueryDto,
    message: string,
  ) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    const where: Prisma.NotificationWhereInput = {
      recipientId,
      audience,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return sendResponse(message, {
      data: data.map((item) => this.toNotificationPayload(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  }

  private async countUnread(
    recipientId: string,
    audience: NotificationAudience,
  ) {
    return this.prisma.notification.count({
      where: { recipientId, audience, status: NotificationStatus.UNREAD },
    });
  }

  private async markOneAsRead(
    userId: string,
    notificationId: string,
    audience: NotificationAudience,
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId, audience },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data:
        notification.status === NotificationStatus.READ
          ? {}
          : { status: NotificationStatus.READ, readAt: new Date() },
    });

    await this.notificationPubSubService.publish({
      event: 'notification.read',
      recipientId: userId,
      audience,
      notificationId,
      unreadCount: await this.countUnread(userId, audience),
    });

    return updated;
  }

  private async markAllForAudienceAsRead(
    userId: string,
    audience: NotificationAudience,
  ) {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        audience,
        status: NotificationStatus.UNREAD,
      },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });

    await this.notificationPubSubService.publish({
      event: 'notification.read_all',
      recipientId: userId,
      audience,
      updatedCount: result.count,
      unreadCount: 0,
    });

    return { updatedCount: result.count };
  }

  private async findActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        isDeleted: true,
        notificationTaskStatusUpdates: true,
        notificationCreditBalanceAlerts: true,
        notificationDisputeReviewNotifications: true,
        notificationSystemAnnouncements: true,
      },
    });

    if (!user || user.isDeleted) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.ACTIVE)
      throw new ForbiddenException('User is not active');
    return user;
  }

  private async getOrCreatePreference(
    userId: string,
    user?: {
      notificationTaskStatusUpdates: boolean;
      notificationCreditBalanceAlerts: boolean;
      notificationDisputeReviewNotifications: boolean;
      notificationSystemAnnouncements: boolean;
    },
  ) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    const legacy =
      user ??
      (await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          notificationTaskStatusUpdates: true,
          notificationCreditBalanceAlerts: true,
          notificationDisputeReviewNotifications: true,
          notificationSystemAnnouncements: true,
        },
      }));

    return this.prisma.notificationPreference.create({
      data: {
        userId,
        taskStatusUpdates: legacy.notificationTaskStatusUpdates,
        creditBalanceAlerts: legacy.notificationCreditBalanceAlerts,
        disputeReviewNotifications:
          legacy.notificationDisputeReviewNotifications,
        systemAnnouncements: legacy.notificationSystemAnnouncements,
      },
    });
  }

  private isAllowedByPreferences(
    category: NotificationCategory,
    preference: {
      taskStatusUpdates: boolean;
      creditBalanceAlerts: boolean;
      disputeReviewNotifications: boolean;
      systemAnnouncements: boolean;
    },
  ) {
    if (category === NotificationCategory.TASK_STATUS)
      return preference.taskStatusUpdates;
    if (category === NotificationCategory.CREDIT_BALANCE)
      return preference.creditBalanceAlerts;
    if (category === NotificationCategory.DISPUTE_REVIEW)
      return preference.disputeReviewNotifications;
    if (category === NotificationCategory.SYSTEM_ANNOUNCEMENT)
      return preference.systemAnnouncements;
    return true;
  }

  private async syncLegacyPreferenceFields(
    userId: string,
    preference: {
      taskStatusUpdates: boolean;
      creditBalanceAlerts: boolean;
      disputeReviewNotifications: boolean;
      systemAnnouncements: boolean;
    },
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationTaskStatusUpdates: preference.taskStatusUpdates,
        notificationCreditBalanceAlerts: preference.creditBalanceAlerts,
        notificationDisputeReviewNotifications:
          preference.disputeReviewNotifications,
        notificationSystemAnnouncements: preference.systemAnnouncements,
      },
    });
  }

  private async enqueueRealtime(notificationId: string) {
    try {
      await this.notificationQueue.add(
        NOTIFICATION_QUEUE_JOB_NAMES.EMIT_REALTIME,
        { notificationId },
        this.defaultJobOptions(),
      );
    } catch (error) {
      this.logger.error(
        'Failed to queue notification realtime delivery',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async enqueueBulkRealtime(notificationIds: string[]) {
    if (notificationIds.length === 0) return;
    try {
      await this.notificationQueue.add(
        NOTIFICATION_QUEUE_JOB_NAMES.BULK_EMIT_REALTIME,
        { notificationIds },
        this.defaultJobOptions(),
      );
    } catch (error) {
      this.logger.error(
        'Failed to queue bulk notification realtime delivery',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private defaultJobOptions() {
    return {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 1000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 5000 },
    };
  }

  private toPreferenceResponse(preference: {
    taskStatusUpdates: boolean;
    creditBalanceAlerts: boolean;
    disputeReviewNotifications: boolean;
    systemAnnouncements: boolean;
    contactPreferenceTags: Prisma.JsonValue | null;
  }) {
    return {
      taskStatusUpdates: preference.taskStatusUpdates,
      creditBalanceAlerts: preference.creditBalanceAlerts,
      disputeReviewNotifications: preference.disputeReviewNotifications,
      systemAnnouncements: preference.systemAnnouncements,
      contactPreferenceTags: Array.isArray(preference.contactPreferenceTags)
        ? preference.contactPreferenceTags
        : [],
    };
  }

  private toNotificationPayload(notification: {
    id: string;
    audience: NotificationAudience;
    type: string;
    category: string;
    priority: string;
    title: string;
    body: string | null;
    data: Prisma.JsonValue | null;
    entityType: string | null;
    entityId: string | null;
    status: string;
    createdAt: Date;
    readAt?: Date | null;
  }) {
    return {
      id: notification.id,
      audience: notification.audience,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      body: notification.body,
      entityType: notification.entityType,
      entityId: notification.entityId,
      priority: notification.priority,
      data: notification.data ?? {},
      status: notification.status,
      readAt: notification.readAt ?? null,
      createdAt: notification.createdAt,
    };
  }
}
