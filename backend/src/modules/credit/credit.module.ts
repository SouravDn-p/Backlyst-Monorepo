import { Module } from '@nestjs/common';
import { CreditCoreModule } from './credit-core.module';
import { CreditController } from './credit.controller';
import { ReferrerModule } from './referrer/referrer.module';
import { CreditTaskModule } from './credit-task/credit-task.module';
import { PurchasedCreditModule } from './purchased-credit/purchased-credit.module';
import { SubscriptionCreditModule } from './subscription-credit/subscription-credit.module';
import { VisibilityCreditModule } from './visibility-credit/visibility-credit.module';
import { WebsiteCreditModule } from './website-credit/website-credit.module';

@Module({
  imports: [
    CreditCoreModule,
    ReferrerModule,
    CreditTaskModule,
    PurchasedCreditModule,
    SubscriptionCreditModule,
    VisibilityCreditModule,
    WebsiteCreditModule,
  ],
  controllers: [CreditController],
  exports: [
    CreditCoreModule,
    CreditTaskModule,
    ReferrerModule,
    VisibilityCreditModule,
  ],
})
export class CreditModule {}
