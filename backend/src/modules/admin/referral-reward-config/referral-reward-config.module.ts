import { Module } from '@nestjs/common';
import { ReferralRewardConfigController } from './referral-reward-config.controller';
import { ReferralRewardConfigService } from './referral-reward-config.service';

@Module({
  controllers: [ReferralRewardConfigController],
  providers: [ReferralRewardConfigService],
})
export class ReferralRewardConfigModule {}
