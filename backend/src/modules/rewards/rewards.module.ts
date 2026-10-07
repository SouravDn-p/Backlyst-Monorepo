import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RewardsController } from './rewards.controller';
import { AdminRewardsController } from './admin-rewards.controller';
import { RewardEngineService } from './services/reward-engine.service';
import { UserRewardProfileService } from './services/user-reward-profile.service';
import { BadgeDefinitionService } from './services/badge-definition.service';
import { BadgeEngineService } from './services/badge-engine.service';
import { BadgeRuleEvaluatorService } from './services/badge-rule-evaluator.service';
import { BadgeRewardImpactService } from './services/badge-reward-impact.service';
import { AdditionalRewardService } from './services/additional-reward.service';
import { RewardBenefitService } from './services/reward-benefit.service';
import { RewardLedgerService } from './services/reward-ledger.service';
import { RewardNotificationService } from './services/reward-notification.service';
import { RewardOutboxService } from './services/reward-outbox.service';
import { RewardOutboxProcessorService } from './services/reward-outbox-processor.service';
import { AdminBadgeAssignmentService } from './services/admin-badge-assignment.service';
import { DynamicBadgeRefreshService } from './services/dynamic-badge-refresh.service';
import { RewardAuditService } from './services/reward-audit.service';


@Module({
  imports: [PrismaModule],
  controllers: [RewardsController, AdminRewardsController],
  providers: [
    RewardEngineService,
    UserRewardProfileService,
    BadgeDefinitionService,
    BadgeEngineService,
    BadgeRuleEvaluatorService,
    BadgeRewardImpactService,
    AdditionalRewardService,
    RewardBenefitService,
    RewardLedgerService,
    RewardNotificationService,
    RewardOutboxService,
    RewardOutboxProcessorService,
    AdminBadgeAssignmentService,
    DynamicBadgeRefreshService,
    RewardAuditService,
  ],
  exports: [
    RewardEngineService,
    UserRewardProfileService,
    BadgeDefinitionService,
    BadgeEngineService,
    BadgeRuleEvaluatorService,
    BadgeRewardImpactService,
    AdditionalRewardService,
    RewardBenefitService,
    RewardLedgerService,
    RewardNotificationService,
    RewardOutboxService,
    RewardOutboxProcessorService,
    AdminBadgeAssignmentService,
    DynamicBadgeRefreshService,
    RewardAuditService,
  ],
})
export class RewardsModule {}

