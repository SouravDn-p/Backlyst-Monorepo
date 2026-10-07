import { Module } from '@nestjs/common';
import { AdminTaskService } from './admin-task.service';
import { AdminTaskController } from './admin-task.controller';
import { CreditModule } from 'src/modules/credit/credit.module';
import { TaskFlowModule } from '../task-flow/task-flow.module';
import { TaskNotificationModule } from 'src/modules/task-notification/task-notification.module';
import { DisputeModule } from '../dispute/dispute.module';
import { MarketplaceEngineModule } from '../marketplace-engine/marketplace-engine.module';
import { RewardsModule } from 'src/modules/rewards/rewards.module';

@Module({
  imports: [
    CreditModule,
    TaskFlowModule,
    TaskNotificationModule,
    DisputeModule,
    MarketplaceEngineModule,
    RewardsModule,
  ],
  controllers: [AdminTaskController],
  providers: [AdminTaskService],
})
export class AdminTaskModule {}
