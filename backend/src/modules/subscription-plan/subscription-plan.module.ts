import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { UserSubscriptionPlanModule } from './user-subscription-plan/user-subscription-plan.module';

@Module({
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService],
  imports: [UserSubscriptionPlanModule],
})
export class SubscriptionPlanModule {}
