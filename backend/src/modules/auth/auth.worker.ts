import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { BaseQueueWorker } from 'src/bullmq/bullmq.worker.bootstrap';
import { QUEUE_NAMES } from 'src/bullmq/constants/queue.constants';

@Processor(QUEUE_NAMES.AUTH)
export class AuthWorker extends BaseQueueWorker {
  process(job: Job): Promise<void> {
    this.logJobStarted(job);

    // Feature-specific job handling will be added later.

    this.logJobFinished(job);
    return Promise.resolve();
  }
}
