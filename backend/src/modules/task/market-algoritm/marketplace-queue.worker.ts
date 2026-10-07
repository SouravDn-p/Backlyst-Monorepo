import { Injectable } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { BaseQueueWorker } from 'src/bullmq/bullmq.worker.bootstrap';
import {
  MARKETPLACE_SCORING_QUEUE_JOB_NAMES,
  OPPORTUNITY_ALERT_QUEUE_JOB_NAMES,
  QUEUE_NAMES,
} from 'src/bullmq/constants/queue.constants';
import { ScoringService } from './scoring.service';
import { OpportunityAlertService } from './opportunity-alert.service';
import { type UpdateScoresJobData } from './marketplace-scoring.producer';
import { type AlertMatchingProvidersJobData } from './opportunity-alert.producer';

/**
 * BullMQ workers for marketplace burst workloads.
 *
 * `@nestjs/bullmq` registers exactly one Worker per `@Processor` class, so the
 * scoring and opportunity-alert consumers are split into two classes (each
 * decorated with a single `@Processor`). Both workers only dispatch to the
 * existing engine methods — `ScoringService.updateScoresAfterTask` and
 * `OpportunityAlertService.alertMatchingProviders` — so NO scoring / alert
 * logic is duplicated and the queued path produces identical side-effects to
 * the synchronous fallback path.
 */

@Injectable()
@Processor(QUEUE_NAMES.MARKETPLACE_SCORING)
export class MarketplaceScoringWorker extends BaseQueueWorker {
  constructor(private readonly scoringService: ScoringService) {
    super();
  }

  async process(job: Job<UpdateScoresJobData>): Promise<void> {
    this.logJobStarted(job);
    try {
      switch (job.name) {
        case MARKETPLACE_SCORING_QUEUE_JOB_NAMES.UPDATE_SCORES: {
          const data = job.data;
          await this.scoringService.updateScoresAfterTask(
            data.websiteId,
            data.wasSuccessful,
            data.qualityRating,
            data.riskEventType,
          );
          break;
        }
        default:
          this.logger.warn(`MarketplaceScoringWorker: unknown job ${job.name}`);
      }
      this.logJobFinished(job);
    } catch (error) {
      this.logJobFailed(job, error);
      throw error;
    }
  }
}

@Injectable()
@Processor(QUEUE_NAMES.OPPORTUNITY_ALERT)
export class MarketplaceOpportunityAlertWorker extends BaseQueueWorker {
  constructor(
    private readonly opportunityAlertService: OpportunityAlertService,
  ) {
    super();
  }

  async process(job: Job<AlertMatchingProvidersJobData>): Promise<void> {
    this.logJobStarted(job);
    try {
      switch (job.name) {
        case OPPORTUNITY_ALERT_QUEUE_JOB_NAMES.ALERT_MATCHING_PROVIDERS: {
          const data = job.data;
          await this.opportunityAlertService.alertMatchingProviders(
            data.taskId,
          );
          break;
        }
        default:
          this.logger.warn(
            `MarketplaceOpportunityAlertWorker: unknown job ${job.name}`,
          );
      }
      this.logJobFinished(job);
    } catch (error) {
      this.logJobFailed(job, error);
      throw error;
    }
  }
}
