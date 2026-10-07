import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  MARKETPLACE_MAINTENANCE_JOB_NAMES,
} from 'src/bullmq/constants/queue.constants';

import { MarketplaceEngineModule } from '../marketplace-engine/marketplace-engine.module';
import { TaskNotificationModule } from 'src/modules/task-notification/task-notification.module';
import { CreditModule } from 'src/modules/credit/credit.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { TaskFlowModule } from '../task-flow/task-flow.module';
import { AdminManualMatchQueueModule } from 'src/modules/admin/admin-manual-match-queue/admin-manual-match-queue.module';

import { OpportunityGuaranteeService } from '../market-algoritm/opportunity-guarantee.service';
import { ImpressionCleanupService } from '../market-algoritm/impression-cleanup.service';
import { ManualMatchQueueService } from '../market-algoritm/manual-match-queue.service';
import { SupplyDemandMonitorService } from '../market-algoritm/supply-demand-monitor.service';
import { RelationshipRetentionService } from '../market-algoritm/relationship-retention.service';
import { RiskDecayService } from '../market-algoritm/risk-decay.service';
import { ReminderCronService } from '../market-algoritm/reminder-cron.service';
import { BoostDecayService } from '../market-algoritm/boost-decay.service';

import { MarketplaceMaintenanceWorker } from './marketplace-maintenance.worker';
import { TaskExpirationService } from './task-expiration.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_MAINTENANCE }),
    MarketplaceEngineModule,
    TaskNotificationModule,
    CreditModule,
    NotificationModule,
    TaskFlowModule,
    AdminManualMatchQueueModule,
  ],
  providers: [
    OpportunityGuaranteeService,
    ImpressionCleanupService,
    ManualMatchQueueService,
    SupplyDemandMonitorService,
    RelationshipRetentionService,
    RiskDecayService,
    ReminderCronService,
    BoostDecayService,
    MarketplaceMaintenanceWorker,
    TaskExpirationService,
  ],
})
export class MarketplaceMaintenanceModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(MarketplaceMaintenanceModule.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_MAINTENANCE)
    private readonly maintenanceQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Registering repeatable marketplace maintenance jobs...');

    const jobs = [
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.UPDATE_OPPORTUNITY_SCORES,
        cron: '0 2 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.DECAY_BOOST_FACTORS,
        cron: '0 4 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.CLEANUP_IMPRESSIONS,
        cron: '30 4 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.FLAG_NEGLECTED_WEBSITES,
        cron: '0 3 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.RECALC_QUALITY,
        cron: '15 2 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.RECALC_BEHAVIOUR,
        cron: '30 3 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.REBALANCE_SUPPLY_DEMAND,
        cron: '0 5 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.MONITOR_PATTERNS,
        cron: '0 */6 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.RETAIN_RELATIONSHIPS,
        cron: '0 3 * * *',
      }, // EVERY_DAY_AT_3AM
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.DECAY_RISK_SCORES,
        cron: '0 1 * * 0',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.EXPIRE_TASKS,
        cron: '0 3 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.SCAN_OPPORTUNITIES,
        cron: '*/15 * * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.MAINTAIN_VISIBILITY,
        cron: '*/5 * * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.REMINDER_PROVIDER_RESPONSE,
        cron: '0 * * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.REMINDER_REQUESTER_REVIEW,
        cron: '0 */6 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.REMINDER_OVERDUE_ESCALATION,
        cron: '0 8 * * *',
      },
      {
        name: MARKETPLACE_MAINTENANCE_JOB_NAMES.EXPIRE_OVERRIDES,
        cron: '0 3 * * *',
      }, // New job, run daily at 3AM
    ];

    for (const job of jobs) {
      try {
        await this.maintenanceQueue.add(
          job.name,
          {},
          {
            repeat: { pattern: job.cron },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to register repeatable job "${job.name}": ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.log(
      'Completed marketplace maintenance repeatable jobs registration.',
    );
  }
}
