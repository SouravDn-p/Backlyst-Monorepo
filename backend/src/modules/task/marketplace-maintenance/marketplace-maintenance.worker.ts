import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  QUEUE_NAMES,
  MARKETPLACE_MAINTENANCE_JOB_NAMES,
} from 'src/bullmq/constants/queue.constants';

// Services
import { OpportunityGuaranteeService } from '../market-algoritm/opportunity-guarantee.service';
import { BoostDecayService } from '../market-algoritm/boost-decay.service';
import { MarketplaceOverrideService } from '../market-algoritm/marketplace-override.service';
import { ImpressionCleanupService } from '../market-algoritm/impression-cleanup.service';
import { ManualMatchQueueService } from '../market-algoritm/manual-match-queue.service';
import { ScoringService } from '../market-algoritm/scoring.service';
import { BehaviourPatternService } from '../market-algoritm/behaviour-pattern.service';
import { SupplyDemandMonitorService } from '../market-algoritm/supply-demand-monitor.service';
import { PatternMonitorService } from '../market-algoritm/pattern-monitor.service';
import { RelationshipRetentionService } from '../market-algoritm/relationship-retention.service';
import { RiskDecayService } from '../market-algoritm/risk-decay.service';
import { TaskExpirationService } from './task-expiration.service';
import { OpportunityAlertService } from '../market-algoritm/opportunity-alert.service';
import { VisibilityMaintenanceService } from 'src/modules/credit/visibility-credit/visibility-maintenance.service';
import { ReminderCronService } from '../market-algoritm/reminder-cron.service';

@Processor(QUEUE_NAMES.MARKETPLACE_MAINTENANCE)
export class MarketplaceMaintenanceWorker extends WorkerHost {
  private readonly logger = new Logger(MarketplaceMaintenanceWorker.name);

  constructor(
    private readonly opportunityGuarantee: OpportunityGuaranteeService,
    private readonly boostDecay: BoostDecayService,
    private readonly overrideService: MarketplaceOverrideService,
    private readonly impressionCleanup: ImpressionCleanupService,
    private readonly manualMatchQueue: ManualMatchQueueService,
    private readonly scoringService: ScoringService,
    private readonly behaviourPattern: BehaviourPatternService,
    private readonly supplyDemand: SupplyDemandMonitorService,
    private readonly patternMonitor: PatternMonitorService,
    private readonly relationshipRetention: RelationshipRetentionService,
    private readonly riskDecay: RiskDecayService,
    private readonly taskExpiration: TaskExpirationService,
    private readonly opportunityAlert: OpportunityAlertService,
    private readonly visibilityMaintenance: VisibilityMaintenanceService,
    private readonly reminderService: ReminderCronService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing maintenance job: ${job.name}`);
    const startedAt = Date.now();

    try {
      switch (job.name) {
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.UPDATE_OPPORTUNITY_SCORES:
          await this.opportunityGuarantee.refreshOpportunityFairness();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.DECAY_BOOST_FACTORS:
          await this.boostDecay.handleBoostDecay();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.EXPIRE_OVERRIDES:
          await this.overrideService.expireOverrides();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.CLEANUP_IMPRESSIONS:
          await this.impressionCleanup.purgeStaleImpressions();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.FLAG_NEGLECTED_WEBSITES:
          await this.manualMatchQueue.scanForLiquidityGaps();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.RECALC_QUALITY:
          await this.scoringService.recomputeAllQuality();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.RECALC_BEHAVIOUR:
          await this.behaviourPattern.scanAll();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.REBALANCE_SUPPLY_DEMAND:
          await this.supplyDemand.checkImbalance();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.MONITOR_PATTERNS:
          await this.patternMonitor.scan();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.RETAIN_RELATIONSHIPS:
          await this.relationshipRetention.run();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.DECAY_RISK_SCORES:
          await this.riskDecay.handleRiskDecay();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.EXPIRE_TASKS:
          await this.taskExpiration.expireOverdueTasks();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.SCAN_OPPORTUNITIES:
          await this.opportunityAlert.scanOpenTasks();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.MAINTAIN_VISIBILITY:
          await this.visibilityMaintenance.maintainWebsiteVisibility();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.REMINDER_PROVIDER_RESPONSE:
          await this.reminderService.handleProviderResponseReminder();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.REMINDER_REQUESTER_REVIEW:
          await this.reminderService.handleRequesterReviewReminder();
          break;
        case MARKETPLACE_MAINTENANCE_JOB_NAMES.REMINDER_OVERDUE_ESCALATION:
          await this.reminderService.handleOverdueTaskEscalation();
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }

      this.logger.log(
        `Completed maintenance job: ${job.name} in ${Date.now() - startedAt}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process maintenance job: ${job.name} - ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
