import { Module } from '@nestjs/common';
import { CreditCoreModule } from '../credit-core.module';
import { PurchasedCreditController } from './purchased-credit.controller';
import { PurchasedCreditService } from './purchased-credit.service';

@Module({
  imports: [CreditCoreModule],
  controllers: [PurchasedCreditController],
  providers: [PurchasedCreditService],
})
export class PurchasedCreditModule {}
