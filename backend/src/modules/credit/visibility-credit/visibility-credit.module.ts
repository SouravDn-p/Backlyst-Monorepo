import { Module } from '@nestjs/common';
import { CreditCoreModule } from '../credit-core.module';
import { VisibilityCreditController } from './visibility-credit.controller';
import { VisibilityCreditService } from './visibility-credit.service';
import { VisibilityMaintenanceService } from './visibility-maintenance.service';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [CreditCoreModule, NotificationModule],
  controllers: [VisibilityCreditController],
  providers: [VisibilityCreditService, VisibilityMaintenanceService],
  exports: [VisibilityMaintenanceService],
})
export class VisibilityCreditModule {}
