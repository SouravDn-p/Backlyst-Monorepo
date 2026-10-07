import { Module } from '@nestjs/common';
import { CreditCoreModule } from '../credit-core.module';
import { WebsiteCreditController } from './website-credit.controller';
import { WebsiteCreditService } from './website-credit.service';

@Module({
  imports: [CreditCoreModule],
  controllers: [WebsiteCreditController],
  providers: [WebsiteCreditService],
})
export class WebsiteCreditModule {}
