import { Module } from '@nestjs/common';
import { DirectTaskRequestController } from './direct-task-request.controller';
import { DirectTaskRequestService } from './direct-task-request.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CreditTaskModule } from 'src/modules/credit/credit-task/credit-task.module';
import { TaskFlowModule } from '../task-flow/task-flow.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { UploadFileModule } from 'src/common/upload-file/upload-file.module';
import { MarketplaceEngineModule } from '../marketplace-engine/marketplace-engine.module';

@Module({
  imports: [
    PrismaModule,
    CreditTaskModule,
    TaskFlowModule,
    NotificationModule,
    UploadFileModule,
    MarketplaceEngineModule,
  ],
  controllers: [DirectTaskRequestController],
  providers: [DirectTaskRequestService],
  exports: [DirectTaskRequestService],
})
export class DirectTaskRequestModule {}
