import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { BaseQueueWorker } from 'src/bullmq/bullmq.worker.bootstrap';
import {
  QUEUE_NAMES,
  REWARDS_QUEUE_JOB_NAMES,
} from 'src/bullmq/constants/queue.constants';
import { WeeklyContributionService } from './weekly-contribution.service';

@Processor(QUEUE_NAMES.REWARDS)
export class StreakMaintenanceWorker extends BaseQueueWorker {
  constructor(
    private readonly weeklyContributionService: WeeklyContributionService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logJobStarted(job);

    try {
      if (job.name === REWARDS_QUEUE_JOB_NAMES.CHECK_STREAKS) {
        await this.weeklyContributionService.checkStreaks();
      }

      this.logJobFinished(job);
    } catch (error) {
      this.logJobFailed(job, error);
      throw error;
    }
  }
}
