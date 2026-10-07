import { Module } from '@nestjs/common';
import { ProviderTaskService } from './provider-task.service';
import { ProviderTaskController } from './provider-task.controller';
import { CreditModule } from 'src/modules/credit/credit.module';
import { TaskFlowModule } from '../task-flow/task-flow.module';
import { TaskNotificationModule } from 'src/modules/task-notification/task-notification.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { AdminManualMatchQueueModule } from 'src/modules/admin/admin-manual-match-queue/admin-manual-match-queue.module';
import { MarketplaceEngineModule } from '../marketplace-engine/marketplace-engine.module';
import { MarketplaceMaintenanceModule } from '../marketplace-maintenance/marketplace-maintenance.module';

@Module({
  imports: [
    CreditModule,
    TaskFlowModule,
    TaskNotificationModule,
    NotificationModule,
    AdminManualMatchQueueModule,
    MarketplaceEngineModule,
    MarketplaceMaintenanceModule,
  ],
  controllers: [ProviderTaskController],
  providers: [ProviderTaskService],
})
export class ProviderTaskModule {}
