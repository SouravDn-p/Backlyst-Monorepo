import { Module } from '@nestjs/common';
import { AdminSubscriptionPlanService } from './admin-subscription-plan.service';
import { AdminSubscriptionPlanController } from './admin-subscription-plan.controller';

@Module({
  controllers: [AdminSubscriptionPlanController],
  providers: [AdminSubscriptionPlanService],
})
export class AdminSubscriptionPlanModule {}
