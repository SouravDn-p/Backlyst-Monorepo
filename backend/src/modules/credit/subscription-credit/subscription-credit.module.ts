import { Module } from '@nestjs/common';
import { CreditCoreModule } from '../credit-core.module';
import { SubscriptionCreditController } from './subscription-credit.controller';
import { SubscriptionCreditService } from './subscription-credit.service';

@Module({
  imports: [CreditCoreModule],
  controllers: [SubscriptionCreditController],
  providers: [SubscriptionCreditService],
})
export class SubscriptionCreditModule {}
