import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreditModule } from '../credit/credit.module';
import { UserSubscriptionModule } from '../subscription/user-subscription/user-subscription.module';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';

@Module({
  imports: [ConfigModule, CreditModule, UserSubscriptionModule],
  controllers: [StripeWebhookController],
  providers: [StripeWebhookService],
})
export class StripeWebhookModule {}
