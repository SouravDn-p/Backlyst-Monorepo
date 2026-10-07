import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserSubscriptionService } from './user-subscription.service';
import { UserSubscriptionController } from './user-subscription.controller';
import { ReferrerModule } from 'src/modules/credit/referrer/referrer.module';

@Module({
  imports: [ConfigModule, ReferrerModule],
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService],
  exports: [UserSubscriptionService],
})
export class UserSubscriptionModule {}
