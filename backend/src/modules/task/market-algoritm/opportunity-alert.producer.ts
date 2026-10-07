import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type JobsOptions, Queue } from 'bullmq';
import {
  OPPORTUNITY_ALERT_QUEUE_JOB_NAMES,
  QUEUE_NAMES,
} from 'src/bullmq/constants/queue.constants';

export interface AlertMatchingProvidersJobData {
  taskId: string;
}

/**
 * Producer for the opportunity-alert fan-out queue. When a task opens, the fan
 * out to potentially many matched providers is enqueued instead of running
 * inline, so notification bursts are absorbed by BullMQ workers. The existing
 * `OpportunityAlertService.alertMatchingProviders` engine method is invoked by
 * the worker (no logic duplication). A synchronous fallback is preserved via a
 * feature flag for low-volume paths.
 */
@Injectable()
export class OpportunityAlertProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.OPPORTUNITY_ALERT)
    private readonly opportunityAlertQueue: Queue,
  ) {}

  async enqueueAlertMatchingProviders(
    payload: AlertMatchingProvidersJobData,
    options?: JobsOptions,
  ) {
    return this.opportunityAlertQueue.add(
      OPPORTUNITY_ALERT_QUEUE_JOB_NAMES.ALERT_MATCHING_PROVIDERS,
      payload,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1_000,
        },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
        ...options,
      },
    );
  }
}
