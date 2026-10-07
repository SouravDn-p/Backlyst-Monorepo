import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { TaskNotificationModule } from 'src/modules/task-notification/task-notification.module';
import { QUEUE_NAMES } from 'src/bullmq/constants/queue.constants';

import { DistributionEngine } from '../market-algoritm/distribution-engine.service';
import { DomainInteractionRecorderService } from '../market-algoritm/domain-interaction-recorder.service';
import { GraduatedPenaltyService } from '../market-algoritm/graduated-penalty.service';
import { LiquidityEngine } from '../market-algoritm/liquidity.engine';
import { MarketplaceConfigService } from '../market-algoritm/marketplace-config.service';
import { MarketplaceOverrideService } from '../market-algoritm/marketplace-override.service';
import { MatchingRelaxationEngine } from '../market-algoritm/matching-relaxation.engine';
import { MatchingEngine } from '../market-algoritm/matching.engine';
import { OpportunityAlertService } from '../market-algoritm/opportunity-alert.service';
import { PatternMonitorService } from '../market-algoritm/pattern-monitor.service';
import { QualityEngine } from '../market-algoritm/quality.engine';
import { QualityStatusEngine } from '../market-algoritm/quality-status.engine';

import { RankingService } from '../market-algoritm/ranking.service';
import { ImpressionService } from '../market-algoritm/impression.service';
import { RecommendationService } from '../market-algoritm/recommendation.service';
import { VisibilityControlService } from '../market-algoritm/visibility-control.service';
import { RiskEngine } from '../market-algoritm/risk.engine';
import { ScoringService } from '../market-algoritm/scoring.service';
import { SupplyDemandRebalancerService } from '../market-algoritm/supply-demand-rebalancer.service';
import { TierEngine } from '../market-algoritm/tier-engine.service';
import { TrustIndicatorService } from '../market-algoritm/trust-indicator.service';
import { ValidationEngine } from '../market-algoritm/validation.engine';
import { BehaviourPatternService } from '../market-algoritm/behaviour-pattern.service';
import { AnalyticsEngine } from '../market-algoritm/analytics.engine';
import { BoostService } from '../market-algoritm/boost.service';
import { MarketplaceScoringProducer } from '../market-algoritm/marketplace-scoring.producer';
import { OpportunityAlertProducer } from '../market-algoritm/opportunity-alert.producer';
import { WebsiteStatusQueryService } from '../market-algoritm/website-status-query.service';
import { RootDomainNormalizerService } from '../market-algoritm/root-domain-normalizer.service';
import {
  MarketplaceScoringWorker,
  MarketplaceOpportunityAlertWorker,
} from '../market-algoritm/marketplace-queue.worker';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    TaskNotificationModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.MARKETPLACE_SCORING },
      { name: QUEUE_NAMES.OPPORTUNITY_ALERT },
    ),
  ],
  providers: [
    MatchingEngine,
    MatchingRelaxationEngine,
    RankingService,
    ImpressionService,
    RecommendationService,
    VisibilityControlService,
    ScoringService,
    ValidationEngine,
    DistributionEngine,
    QualityEngine,
    QualityStatusEngine,
    RiskEngine,
    TierEngine,
    LiquidityEngine,
    PatternMonitorService,
    MarketplaceConfigService,
    MarketplaceOverrideService,
    DomainInteractionRecorderService,
    GraduatedPenaltyService,
    TrustIndicatorService,
    SupplyDemandRebalancerService,
    OpportunityAlertService,
    BehaviourPatternService,
    AnalyticsEngine,
    BoostService,
    WebsiteStatusQueryService,
    RootDomainNormalizerService,
    MarketplaceScoringProducer,
    OpportunityAlertProducer,
    MarketplaceScoringWorker,
    MarketplaceOpportunityAlertWorker,
  ],
  exports: [
    MatchingEngine,
    MatchingRelaxationEngine,
    RankingService,
    ImpressionService,
    RecommendationService,
    VisibilityControlService,
    ScoringService,
    ValidationEngine,
    DistributionEngine,
    QualityEngine,
    QualityStatusEngine,
    RiskEngine,

    TierEngine,
    LiquidityEngine,
    PatternMonitorService,
    MarketplaceConfigService,
    MarketplaceOverrideService,
    DomainInteractionRecorderService,
    GraduatedPenaltyService,
    TrustIndicatorService,
    SupplyDemandRebalancerService,
    OpportunityAlertService,
    BehaviourPatternService,
    AnalyticsEngine,
    BoostService,
    WebsiteStatusQueryService,
    RootDomainNormalizerService,
    MarketplaceScoringProducer,
    OpportunityAlertProducer,
  ],
})
export class MarketplaceEngineModule {}
