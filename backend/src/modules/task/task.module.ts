import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { DisputeModule } from './dispute/dispute.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { MarketplaceEngineModule } from './marketplace-engine/marketplace-engine.module';
import { MarketplaceMaintenanceModule } from './marketplace-maintenance/marketplace-maintenance.module';
import { DirectTaskRequestModule } from './direct-task-request/direct-task-request.module';

@Module({
  imports: [
    PrismaModule,
    DisputeModule,
    NotificationModule,
    MarketplaceEngineModule,
    MarketplaceMaintenanceModule,
    DirectTaskRequestModule,
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService, DisputeModule, MarketplaceEngineModule, DirectTaskRequestModule],
})
export class TaskModule {}
