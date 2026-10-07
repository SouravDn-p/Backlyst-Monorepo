import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreditTaskService } from 'src/modules/credit/credit-task/credit-task.service';
import { TaskFlowService } from '../task-flow/task-flow.service';
import { TaskFlowEventType, TaskFlowActorRole } from '@prisma/client';
import { taskFlowEventKey } from '../task-flow/task-flow-event-key.util';

@Injectable()
export class TaskExpirationService {
  private readonly logger = new Logger(TaskExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditTaskService: CreditTaskService,
    private readonly taskFlowService: TaskFlowService,
  ) {}

  async expireOverdueTasks() {
    this.logger.log('Running TaskExpirationService...');
    try {
      // Find tasks that are in an active state but their deadline was more than 14 days ago
      const expirationThreshold = new Date();
      expirationThreshold.setDate(expirationThreshold.getDate() - 14);

      const tasksToExpire = await this.prisma.placementTask.findMany({
        where: {
          lifecycleStatus: {
            in: ['ASSIGNED', 'IN_PROGRESS'],
          },
          deliveryDeadline: {
            lt: expirationThreshold,
          },
        },
        select: {
          id: true,
          requesterId: true,
          selectedProviderId: true,
          requesterWebsiteId: true,
          assignedProviderWebsiteId: true,
          lifecycleStatus: true,
        },
      });

      if (!tasksToExpire.length) {
        this.logger.log('No overdue tasks to expire.');
        return;
      }

      let expiredCount = 0;
      const adminSystemId = 'SYSTEM'; // We can use SYSTEM as the actor

      for (const task of tasksToExpire) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // 1. Transition the task status
            const expiredAt = new Date();
            await tx.placementTask.update({
              where: { id: task.id },
              data: {
                lifecycleStatus: 'EXPIRED',
              },
            });

            // 2. Record the task flow event
            if (task.selectedProviderId && task.assignedProviderWebsiteId) {
              await this.taskFlowService.recordTaskFlow(
                {
                  placementTaskId: task.id,
                  requesterId: task.requesterId,
                  providerId: task.selectedProviderId,
                  actorId: adminSystemId,
                  requesterWebsiteId: task.requesterWebsiteId,
                  providerWebsiteId: task.assignedProviderWebsiteId,
                  eventType: TaskFlowEventType.SYSTEM_AUTO_FAILED,
                  actorRole: TaskFlowActorRole.SYSTEM,
                  fromStatus: task.lifecycleStatus,
                  toStatus: 'EXPIRED',
                  note: 'Task automatically expired by system due to passing the 14-day expiration threshold.',
                  eventKey: taskFlowEventKey.systemAction(
                    task.id,
                    'EXPIRE_TASK',
                    expiredAt,
                  ),
                },
                tx,
              );
            }
          });

          // 3. Process the refund via handleFailedTaskCredit (outside transaction to avoid complex locking and allow it to handle its own idempotency)
          if (task.assignedProviderWebsiteId) {
            await this.creditTaskService.handleFailedTaskCredit(
              task.requesterId, // Reverting funds to requester, the actor should be the requester context inside credit logic
              task.assignedProviderWebsiteId,
              task.id,
            );
          }

          expiredCount++;
        } catch (taskError) {
          this.logger.error(`Failed to expire task ${task.id}`, taskError);
        }
      }

      this.logger.log(
        `TaskExpirationService completed. Expired ${expiredCount} tasks.`,
      );
    } catch (error) {
      this.logger.error('Failed to run TaskExpirationService', error);
    }
  }
}
