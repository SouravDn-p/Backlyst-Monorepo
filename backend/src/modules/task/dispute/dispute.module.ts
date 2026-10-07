import { Module } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { CreditModule } from 'src/modules/credit/credit.module';
import { TaskFlowModule } from '../task-flow/task-flow.module';
import { TaskNotificationModule } from 'src/modules/task-notification/task-notification.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { GraduatedPenaltyService } from '../market-algoritm/graduated-penalty.service';
import { RiskEngine } from '../market-algoritm/risk.engine';
import { MarketplaceEngineModule } from '../marketplace-engine/marketplace-engine.module';
import { PlatformFeatureToggleModule } from 'src/modules/admin/platform-feature-toggle/platform-feature-toggle.module';

@Module({
  imports: [
    CreditModule,
    TaskFlowModule,
    TaskNotificationModule,
    NotificationModule,
    MarketplaceEngineModule,
    PlatformFeatureToggleModule,
  ],
  controllers: [DisputeController],
  providers: [DisputeService, GraduatedPenaltyService, RiskEngine],
  exports: [DisputeService],
})
export class DisputeModule {}
