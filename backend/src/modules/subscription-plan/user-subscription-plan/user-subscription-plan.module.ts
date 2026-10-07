import { Module } from '@nestjs/common';
import { UserSubscriptionPlanService } from './user-subscription-plan.service';
import { UserSubscriptionPlanController } from './user-subscription-plan.controller';

@Module({
  controllers: [UserSubscriptionPlanController],
  providers: [UserSubscriptionPlanService],
})
export class UserSubscriptionPlanModule {}
