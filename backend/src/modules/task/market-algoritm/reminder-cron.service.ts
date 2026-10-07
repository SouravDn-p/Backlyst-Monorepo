import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import {
  NotificationType,
  NotificationCategory,
  NotificationEntityType,
  UserRole,
  UserStatus,
} from '@prisma/client';

@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleProviderResponseReminder() {
    this.logger.log('Running provider response reminder cron...');
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 48);

      const tasks = await this.prisma.placementTask.findMany({
        where: {
          lifecycleStatus: 'APPROVED',
          selectedProviderId: { not: null },
          updatedAt: { lt: cutoff },
        },
        select: {
          id: true,
          projectTitle: true,
          selectedProviderId: true,
          deliveryDeadline: true,
        },
      });

      for (const task of tasks) {
        if (!task.selectedProviderId) continue;

        const idempotencyKey = `reminder-provider-response-${task.id}-${new Date().toISOString().slice(0, 10)}`;
        const deadlineText = task.deliveryDeadline
          ? ` Deadline: ${task.deliveryDeadline.toLocaleDateString()}.`
          : '';

        await this.notificationService
          .sendNotification({
            recipientId: task.selectedProviderId,
            type: NotificationType.TASK_CREATED,
            title: 'Provider response overdue',
            body: `Provider has not started work on "${task.projectTitle}" for 48 hours.${deadlineText}`,
            category: NotificationCategory.TASK_STATUS,
            entityType: NotificationEntityType.TASK,
            entityId: task.id,
            action: 'VIEW_TASK',
            idempotencyKey,
          } as any)
          .catch(() => {
            /* fire-and-forget */
          });
      }

      this.logger.log(
        `Provider response reminder: processed ${tasks.length} tasks`,
      );
    } catch (error) {
      this.logger.error('Failed to run provider response reminder cron', error);
    }
  }

  async handleRequesterReviewReminder() {
    this.logger.log('Running requester review reminder cron...');
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 72);

      const tasks = await this.prisma.placementTask.findMany({
        where: {
          lifecycleStatus: 'COMPLETED',
          updatedAt: { lt: cutoff },
        },
        select: {
          id: true,
          projectTitle: true,
          requesterId: true,
          selectedProviderId: true,
          updatedAt: true,
        },
      });

      for (const task of tasks) {
        const daysWaiting = Math.floor(
          (Date.now() - task.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
        );

        const idempotencyKey = `reminder-requester-review-${task.id}-${new Date().toISOString().slice(0, 10)}`;

        await this.notificationService
          .sendNotification({
            recipientId: task.requesterId,
            type: NotificationType.TASK_CREATED,
            title: 'Review and release payment',
            body: `Task "${task.projectTitle}" has been completed for ${daysWaiting} days. Please review and release payment.`,
            category: NotificationCategory.TASK_STATUS,
            entityType: NotificationEntityType.TASK,
            entityId: task.id,
            action: 'VIEW_TASK',
            idempotencyKey,
          } as any)
          .catch(() => {
            /* fire-and-forget */
          });
      }

      this.logger.log(
        `Requester review reminder: processed ${tasks.length} tasks`,
      );
    } catch (error) {
      this.logger.error('Failed to run requester review reminder cron', error);
    }
  }

  async handleOverdueTaskEscalation() {
    this.logger.log('Running overdue task escalation cron...');
    try {
      const tasks = await this.prisma.placementTask.findMany({
        where: {
          lifecycleStatus: 'IN_PROGRESS',
          OR: [
            {
              deliveryDeadline: { not: null, lt: new Date() },
            },
            {
              deliveryDeadline: null,
              updatedAt: { lt: this.getDaysAgoDate(30) },
            },
          ],
        },
        select: {
          id: true,
          projectTitle: true,
          requesterId: true,
          selectedProviderId: true,
          deliveryDeadline: true,
          updatedAt: true,
        },
      });

      for (const task of tasks) {
        const overdueDays = task.deliveryDeadline
          ? Math.floor(
              (Date.now() - task.deliveryDeadline.getTime()) /
                (24 * 60 * 60 * 1000),
            )
          : Math.floor(
              (Date.now() - task.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
            );

        const requesterKey = `reminder-overdue-requester-${task.id}-${new Date().toISOString().slice(0, 10)}`;
        await this.notificationService
          .sendNotification({
            recipientId: task.requesterId,
            type: NotificationType.TASK_CREATED,
            title: 'Task overdue',
            body: `Task "${task.projectTitle}" is ${overdueDays} days overdue.`,
            category: NotificationCategory.TASK_STATUS,
            entityType: NotificationEntityType.TASK,
            entityId: task.id,
            action: 'VIEW_TASK',
            idempotencyKey: requesterKey,
          } as any)
          .catch(() => {
            /* fire-and-forget */
          });

        if (task.selectedProviderId) {
          const providerKey = `reminder-overdue-provider-${task.id}-${new Date().toISOString().slice(0, 10)}`;
          await this.notificationService
            .sendNotification({
              recipientId: task.selectedProviderId,
              type: NotificationType.TASK_CREATED,
              title: 'Task overdue',
              body: `Task "${task.projectTitle}" is ${overdueDays} days overdue.`,
              category: NotificationCategory.TASK_STATUS,
              entityType: NotificationEntityType.TASK,
              entityId: task.id,
              action: 'VIEW_TASK',
              idempotencyKey: providerKey,
            } as any)
            .catch(() => {
              /* fire-and-forget */
            });
        }

        if (overdueDays > 7) {
          const admins = await this.prisma.user.findMany({
            where: {
              role: UserRole.ADMIN,
              status: UserStatus.ACTIVE,
              isDeleted: false,
            },
            select: { id: true },
          });

          for (const admin of admins) {
            const adminKey = `reminder-overdue-admin-${task.id}-${admin.id}-${new Date().toISOString().slice(0, 10)}`;
            await this.notificationService
              .sendNotification({
                recipientId: admin.id,
                type: NotificationType.ADMIN_TASK_RISK_FLAGGED,
                title: 'Overdue task escalation',
                body: `Task "${task.projectTitle}" has been overdue for ${overdueDays} days and requires admin review.`,
                category: NotificationCategory.ADMIN_GOVERNANCE,
                entityType: NotificationEntityType.TASK,
                entityId: task.id,
                action: 'VIEW_TASK',
                idempotencyKey: adminKey,
              } as any)
              .catch(() => {
                /* fire-and-forget */
              });
          }
        }
      }

      this.logger.log(
        `Overdue task escalation: processed ${tasks.length} tasks`,
      );
    } catch (error) {
      this.logger.error('Failed to run overdue task escalation cron', error);
    }
  }

  private getDaysAgoDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
