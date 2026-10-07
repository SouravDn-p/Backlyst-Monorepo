import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { NotificationService } from 'src/modules/notification/notification.service';
import { SendTaskNotificationInput } from './types/task-notification.types';
import { TASK_NOTIFICATION_TRIGGER_MAP } from './utils/task-notification-map.util';

@Injectable()
export class TaskNotificationService {
  private readonly logger = new Logger(TaskNotificationService.name);

  constructor(private readonly notificationService: NotificationService) {}

  async sendTaskNotification(input: SendTaskNotificationInput) {
    const config = TASK_NOTIFICATION_TRIGGER_MAP[input.trigger];
    const recipientId =
      config.recipientRole === 'REQUESTER'
        ? input.requesterId
        : input.providerId;

    if (!recipientId) {
      this.logger.warn(
        `Skipped task notification ${input.trigger}: missing ${config.recipientRole.toLowerCase()} recipient id for task ${input.task?.id ?? 'unknown'}`,
      );
      return {
        skipped: true,
        reason: `Missing ${config.recipientRole.toLowerCase()} recipient id`,
        trigger: input.trigger,
        taskId: input.task?.id ?? null,
      };
    }

    if (!input.task?.id) {
      this.logger.warn(
        `Skipped task notification ${input.trigger}: missing task id`,
      );
      return {
        skipped: true,
        reason: 'Missing task id',
        trigger: input.trigger,
        recipientId,
      };
    }

    const taskTitle = input.task.projectTitle ?? input.task.title ?? null;
    const requesterId = input.requesterId ?? input.task.requesterId ?? null;
    const providerId =
      input.providerId ?? input.task.selectedProviderId ?? null;
    const providerWebsiteId =
      input.providerWebsiteId ?? input.task.assignedProviderWebsiteId ?? null;

    try {
      return await this.notificationService.sendNotification({
        recipientId,
        actorId: input.actorId ?? undefined,
        type: config.notificationType,
        category: config.category,
        entityType: config.entityType,
        entityId: input.task.id,
        title: input.title ?? config.title,
        body: input.body ?? config.body,
        data: {
          taskId: input.task.id,
          taskTitle,
          requesterId,
          providerId,
          providerWebsiteId,
          action: config.action,
          trigger: input.trigger,
          ...(input.extraData ? { extraData: input.extraData } : {}),
        } as Prisma.InputJsonValue,
        idempotencyKey:
          input.idempotencyKey ??
          `task-notification-${input.trigger}-${input.task.id}-${recipientId}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send task notification ${input.trigger} for task ${input.task.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        skipped: true,
        reason: 'Notification delivery failed',
        trigger: input.trigger,
        taskId: input.task.id,
        recipientId,
      };
    }
  }
}
