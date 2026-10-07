import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type JobsOptions, Queue } from 'bullmq';
import {
  MARKETPLACE_SCORING_QUEUE_JOB_NAMES,
  QUEUE_NAMES,
} from 'src/bullmq/constants/queue.constants';
import { type RiskEventType } from './scoring.utils';

export interface UpdateScoresJobData {
  websiteId: string;
  wasSuccessful: boolean;
  qualityRating?: number;
  riskEventType?: RiskEventType;
}

/**
 * Producer for the marketplace scoring queue. Hot paths (task completion,
 * admin actions) enqueue a scoring update here instead of calling
 * `ScoringService.updateScoresAfterTask` inline, so bursts can be absorbed by
 * BullMQ workers and processed on any app instance. A synchronous fallback is
 * preserved in the consuming services via a feature flag.
 */
@Injectable()
export class MarketplaceScoringProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_SCORING)
    private readonly scoringQueue: Queue,
  ) {}

  async enqueueUpdateScores(
    payload: UpdateScoresJobData,
    options?: JobsOptions,
  ) {
    return this.scoringQueue.add(
      MARKETPLACE_SCORING_QUEUE_JOB_NAMES.UPDATE_SCORES,
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
