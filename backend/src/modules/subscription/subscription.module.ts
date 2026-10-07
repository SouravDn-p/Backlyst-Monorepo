import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { UserSubscriptionModule } from './user-subscription/user-subscription.module';
import { AdminSubscriptionModule } from './admin-subscription/admin-subscription.module';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  imports: [UserSubscriptionModule, AdminSubscriptionModule],
})
export class SubscriptionModule {}
