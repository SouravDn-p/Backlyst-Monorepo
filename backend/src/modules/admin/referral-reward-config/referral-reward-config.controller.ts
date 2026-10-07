import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { UpdateReferralRewardConfigDto } from './dto/update-referral-reward-config.dto';
import { ReferralRewardConfigService } from './referral-reward-config.service';

@ApiTags('Admin Referral Reward Config')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/referral-reward-config')
export class ReferralRewardConfigController {
  constructor(
    private readonly referralRewardConfigService: ReferralRewardConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get referral reward configuration',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Referral reward config fetched successfully',
        data: {
          id: 'REFERRAL_REWARD_CONFIG',
          rewardPerReferralCredits: 150,
          maxUserReferralPool: 5000,
          oneCreditPerUserEnforced: true,
          createdAt: '2026-06-24T00:00:00.000Z',
          updatedAt: '2026-06-24T00:00:00.000Z',
        },
      },
    },
  })
  getConfig() {
    return this.referralRewardConfigService.getConfig();
  }

  @Patch()
  @ApiOperation({
    summary: 'Update referral reward configuration',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Referral reward config updated successfully',
        data: {
          id: 'REFERRAL_REWARD_CONFIG',
          rewardPerReferralCredits: 150,
          maxUserReferralPool: 5000,
          oneCreditPerUserEnforced: true,
          createdAt: '2026-06-24T00:00:00.000Z',
          updatedAt: '2026-06-24T00:00:00.000Z',
        },
      },
    },
  })
  updateConfig(@Body() payload: UpdateReferralRewardConfigDto) {
    return this.referralRewardConfigService.updateConfig(payload);
  }
}
