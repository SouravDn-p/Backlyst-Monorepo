import { Logger } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';

export abstract class BaseQueueWorker extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  protected logJobStarted(job: Job): void {
    this.logger.debug(`Started job ${job.name} (${job.id ?? 'n/a'})`);
  }

  protected logJobFinished(job: Job): void {
    this.logger.debug(`Finished job ${job.name} (${job.id ?? 'n/a'})`);
  }

  protected logJobFailed(job: Job, error: unknown): void {
    this.logger.error(
      `Failed job ${job.name} (${job.id ?? 'n/a'})`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
