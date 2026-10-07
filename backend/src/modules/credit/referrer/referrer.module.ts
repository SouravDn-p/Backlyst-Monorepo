import { Module } from '@nestjs/common';
import { PlatformFeatureToggleModule } from 'src/modules/admin/platform-feature-toggle/platform-feature-toggle.module';
import { RewardsModule } from 'src/modules/rewards/rewards.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CreditCoreModule } from '../credit-core.module';
import { CreditTaskModule } from '../credit-task/credit-task.module';
import { ReferralCreditController } from './referral-credit.controller';
import { ReferralCreditService } from './referral-credit.service';
import { ReferrerController } from './referrer.controller';
import { ReferrerService } from './referrer.service';
import { WeeklyContributionService } from './weekly-contribution.service';

@Module({
  imports: [
    PrismaModule,
    CreditCoreModule,
    CreditTaskModule,
    PlatformFeatureToggleModule,
    RewardsModule,
  ],
  controllers: [ReferrerController, ReferralCreditController],
  providers: [
    ReferrerService,
    ReferralCreditService,
    WeeklyContributionService,
  ],
  exports: [ReferrerService, WeeklyContributionService],
})
export class ReferrerModule {}
