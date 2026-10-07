import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MarketplaceMaintenanceWorker } from './marketplace-maintenance.worker';
import { OpportunityGuaranteeService } from '../market-algoritm/opportunity-guarantee.service';
import { BoostDecayService } from '../market-algoritm/boost-decay.service';
import { ImpressionCleanupService } from '../market-algoritm/impression-cleanup.service';
import { TaskExpirationService } from './task-expiration.service';
import { ManualMatchQueueService } from '../market-algoritm/manual-match-queue.service';
import { SupplyDemandMonitorService } from '../market-algoritm/supply-demand-monitor.service';
import { RelationshipRetentionService } from '../market-algoritm/relationship-retention.service';
import { RiskDecayService } from '../market-algoritm/risk-decay.service';
import { MarketplaceOverrideService } from '../market-algoritm/marketplace-override.service';
import { ScoringService } from '../market-algoritm/scoring.service';
import { BehaviourPatternService } from '../market-algoritm/behaviour-pattern.service';
import { PatternMonitorService } from '../market-algoritm/pattern-monitor.service';
import { OpportunityAlertService } from '../market-algoritm/opportunity-alert.service';
import { VisibilityMaintenanceService } from '../../credit/visibility-credit/visibility-maintenance.service';
import { ReminderCronService } from '../market-algoritm/reminder-cron.service';

describe('MarketplaceMaintenanceWorker', () => {
  let worker: MarketplaceMaintenanceWorker;
  let opportunityGuaranteeService: jest.Mocked<OpportunityGuaranteeService>;
  let boostDecayService: jest.Mocked<BoostDecayService>;
  let loggerWarnSpy: jest.SpyInstance;

  let moduleRef: TestingModule;

  beforeEach(async () => {
    opportunityGuaranteeService = {
      refreshOpportunityFairness: jest.fn().mockResolvedValue(undefined),
    } as any;
    boostDecayService = {
      handleBoostDecay: jest.fn().mockResolvedValue(undefined),
    } as any;

    moduleRef = await Test.createTestingModule({
      providers: [
        MarketplaceMaintenanceWorker,
        {
          provide: OpportunityGuaranteeService,
          useValue: opportunityGuaranteeService,
        },
        { provide: BoostDecayService, useValue: boostDecayService },
        {
          provide: ImpressionCleanupService,
          useValue: { purgeStaleImpressions: jest.fn() },
        },
        {
          provide: TaskExpirationService,
          useValue: { expireOverdueTasks: jest.fn() },
        },
        {
          provide: ManualMatchQueueService,
          useValue: { scanForLiquidityGaps: jest.fn() },
        },
        {
          provide: SupplyDemandMonitorService,
          useValue: { checkImbalance: jest.fn() },
        },
        { provide: RelationshipRetentionService, useValue: { run: jest.fn() } },
        { provide: RiskDecayService, useValue: { handleRiskDecay: jest.fn() } },
        {
          provide: MarketplaceOverrideService,
          useValue: { expireOverrides: jest.fn() },
        },
        {
          provide: ScoringService,
          useValue: { recomputeAllQuality: jest.fn() },
        },
        { provide: BehaviourPatternService, useValue: { scanAll: jest.fn() } },
        { provide: PatternMonitorService, useValue: { scan: jest.fn() } },
        {
          provide: OpportunityAlertService,
          useValue: { scanOpenTasks: jest.fn() },
        },
        {
          provide: VisibilityMaintenanceService,
          useValue: { maintainWebsiteVisibility: jest.fn() },
        },
        {
          provide: ReminderCronService,
          useValue: {
            handleProviderResponseReminder: jest.fn(),
            handleRequesterReviewReminder: jest.fn(),
            handleOverdueTaskEscalation: jest.fn(),
          },
        },
      ],
    }).compile();

    worker = moduleRef.get<MarketplaceMaintenanceWorker>(
      MarketplaceMaintenanceWorker,
    );
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('processes UPDATE_OPPORTUNITY_SCORES', async () => {
    await worker.process({ name: 'marketplace-maintenance:update-opportunity-scores' } as Job);
    expect(moduleRef.get(OpportunityGuaranteeService).refreshOpportunityFairness).toHaveBeenCalledTimes(1);
  });

  it('processes DECAY_BOOST_FACTORS', async () => {
    await worker.process({ name: 'marketplace-maintenance:decay-boost-factors' } as Job);
    expect(moduleRef.get(BoostDecayService).handleBoostDecay).toHaveBeenCalledTimes(1);
  });

  it('processes EXPIRE_OVERRIDES', async () => {
    await worker.process({ name: 'marketplace-maintenance:expire-overrides' } as Job);
    expect(moduleRef.get(MarketplaceOverrideService).expireOverrides).toHaveBeenCalledTimes(1);
  });

  it('processes CLEANUP_IMPRESSIONS', async () => {
    await worker.process({ name: 'marketplace-maintenance:cleanup-impressions' } as Job);
    expect(moduleRef.get(ImpressionCleanupService).purgeStaleImpressions).toHaveBeenCalledTimes(1);
  });

  it('processes FLAG_NEGLECTED_WEBSITES', async () => {
    await worker.process({ name: 'marketplace-maintenance:flag-neglected-websites' } as Job);
    expect(moduleRef.get(ManualMatchQueueService).scanForLiquidityGaps).toHaveBeenCalledTimes(1);
  });

  it('processes RECALC_QUALITY', async () => {
    await worker.process({ name: 'marketplace-maintenance:recalc-quality' } as Job);
    expect(moduleRef.get(ScoringService).recomputeAllQuality).toHaveBeenCalledTimes(1);
  });

  it('processes RECALC_BEHAVIOUR', async () => {
    await worker.process({ name: 'marketplace-maintenance:recalc-behaviour' } as Job);
    expect(moduleRef.get(BehaviourPatternService).scanAll).toHaveBeenCalledTimes(1);
  });

  it('processes REBALANCE_SUPPLY_DEMAND', async () => {
    await worker.process({ name: 'marketplace-maintenance:rebalance-supply-demand' } as Job);
    expect(moduleRef.get(SupplyDemandMonitorService).checkImbalance).toHaveBeenCalledTimes(1);
  });

  it('processes MONITOR_PATTERNS', async () => {
    await worker.process({ name: 'marketplace-maintenance:monitor-patterns' } as Job);
    expect(moduleRef.get(PatternMonitorService).scan).toHaveBeenCalledTimes(1);
  });

  it('processes RETAIN_RELATIONSHIPS', async () => {
    await worker.process({ name: 'marketplace-maintenance:retain-relationships' } as Job);
    expect(moduleRef.get(RelationshipRetentionService).run).toHaveBeenCalledTimes(1);
  });

  it('processes DECAY_RISK_SCORES', async () => {
    await worker.process({ name: 'marketplace-maintenance:decay-risk-scores' } as Job);
    expect(moduleRef.get(RiskDecayService).handleRiskDecay).toHaveBeenCalledTimes(1);
  });

  it('processes EXPIRE_TASKS', async () => {
    await worker.process({ name: 'marketplace-maintenance:expire-tasks' } as Job);
    expect(moduleRef.get(TaskExpirationService).expireOverdueTasks).toHaveBeenCalledTimes(1);
  });

  it('processes SCAN_OPPORTUNITIES', async () => {
    await worker.process({ name: 'marketplace-maintenance:scan-opportunities' } as Job);
    expect(moduleRef.get(OpportunityAlertService).scanOpenTasks).toHaveBeenCalledTimes(1);
  });

  it('processes MAINTAIN_VISIBILITY', async () => {
    await worker.process({ name: 'marketplace-maintenance:maintain-visibility' } as Job);
    expect(moduleRef.get(VisibilityMaintenanceService).maintainWebsiteVisibility).toHaveBeenCalledTimes(1);
  });

  it('processes REMINDER_PROVIDER_RESPONSE', async () => {
    await worker.process({ name: 'marketplace-maintenance:reminder-provider-response' } as Job);
    expect(moduleRef.get(ReminderCronService).handleProviderResponseReminder).toHaveBeenCalledTimes(1);
  });

  it('processes REMINDER_REQUESTER_REVIEW', async () => {
    await worker.process({ name: 'marketplace-maintenance:reminder-requester-review' } as Job);
    expect(moduleRef.get(ReminderCronService).handleRequesterReviewReminder).toHaveBeenCalledTimes(1);
  });

  it('processes REMINDER_OVERDUE_ESCALATION', async () => {
    await worker.process({ name: 'marketplace-maintenance:reminder-overdue-escalation' } as Job);
    expect(moduleRef.get(ReminderCronService).handleOverdueTaskEscalation).toHaveBeenCalledTimes(1);
  });

  it('logs warning for unknown jobs, rather than failing the queue', async () => {
    const job = { name: 'unknown-job' } as Job;
    await worker.process(job);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Unknown job name: unknown-job');
  });
});
