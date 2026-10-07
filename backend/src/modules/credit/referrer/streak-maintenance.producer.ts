import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  REWARDS_QUEUE_JOB_NAMES,
} from 'src/bullmq/constants/queue.constants';

@Injectable()
export class StreakMaintenanceProducer implements OnModuleInit {
  private readonly logger = new Logger(StreakMaintenanceProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.REWARDS)
    private readonly rewardsQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.ensureDailyStreakMaintenanceJob();
  }

  async ensureDailyStreakMaintenanceJob() {
    try {
      await this.rewardsQueue.add(
        REWARDS_QUEUE_JOB_NAMES.CHECK_STREAKS,
        {},
        {
          jobId: REWARDS_QUEUE_JOB_NAMES.CHECK_STREAKS,
          repeat: {
            pattern: '30 0 * * *',
            tz: 'UTC',
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 30,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
            count: 100,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to register check streaks job: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
