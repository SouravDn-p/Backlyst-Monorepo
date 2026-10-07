import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseQueueWorker } from 'src/bullmq/bullmq.worker.bootstrap';
import {
  NOTIFICATION_QUEUE_JOB_NAMES,
  QUEUE_NAMES,
} from 'src/bullmq/constants/queue.constants';
import { NotificationPubSubService } from './notification-pubsub.service';
import { NotificationService } from './notification.service';
import {
  NotificationBulkEmitRealtimeJobData,
  NotificationEmitRealtimeJobData,
} from './types/notification.types';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends BaseQueueWorker {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationPubSubService: NotificationPubSubService,
  ) {
    super();
  }

  async process(
    job: Job<
      NotificationEmitRealtimeJobData | NotificationBulkEmitRealtimeJobData
    >,
  ): Promise<void> {
    this.logJobStarted(job);

    try {
      if (job.name === NOTIFICATION_QUEUE_JOB_NAMES.EMIT_REALTIME) {
        const data = job.data as NotificationEmitRealtimeJobData;
        await this.publishNotification(data.notificationId);
      }

      if (job.name === NOTIFICATION_QUEUE_JOB_NAMES.BULK_EMIT_REALTIME) {
        const data = job.data as NotificationBulkEmitRealtimeJobData;
        for (const notificationId of data.notificationIds) {
          await this.publishNotification(notificationId);
        }
      }

      this.logJobFinished(job);
    } catch (error) {
      this.logJobFailed(job, error);
      const data = job.data as Partial<NotificationEmitRealtimeJobData>;
      if (data.notificationId) {
        await this.notificationService.markDeliveryFailed(data.notificationId);
      }
      throw error;
    }
  }

  private async publishNotification(notificationId: string) {
    const event =
      await this.notificationService.getRealtimeNotification(notificationId);
    if (!event) return;

    // Workers publish Redis Pub/Sub events because connected sockets may live
    // on another app instance. Gateways emit only to their local sockets.
    await this.notificationPubSubService.publish(event);
    await this.notificationService.markDeliveryResult(notificationId, true);
  }
}
