import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { BaseQueueWorker } from 'src/bullmq/bullmq.worker.bootstrap';
import {
  MESSAGING_QUEUE_JOB_NAMES,
  QUEUE_NAMES,
} from 'src/bullmq/constants/queue.constants';
import { MessagingService } from './messaging.service';
import { type CreateMessageJobData } from './message.interface';
import { MessagingPubSubService } from './messaging-pubsub.service';

@Processor(QUEUE_NAMES.MESSAGING)
export class MessagingWorker extends BaseQueueWorker {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingPubSubService: MessagingPubSubService,
  ) {
    super();
  }

  async process(job: Job<CreateMessageJobData>): Promise<void> {
    this.logJobStarted(job);

    try {
      if (job.name === MESSAGING_QUEUE_JOB_NAMES.CREATE_MESSAGE) {
        const message = await this.messagingService.sendMessageByIds(job.data);
        // Workers do not emit WebSocket events directly because the connected
        // recipient socket may live on a different app instance.
        await this.messagingPubSubService.publishMessageCreated(message);
      }

      this.logJobFinished(job);
    } catch (error) {
      this.logJobFailed(job, error);
      throw error;
    }
  }
}
