import { Module } from '@nestjs/common';
import { AdminSubscriptionService } from './admin-subscription.service';
import { AdminSubscriptionController } from './admin-subscription.controller';

@Module({
  controllers: [AdminSubscriptionController],
  providers: [AdminSubscriptionService],
})
export class AdminSubscriptionModule {}
