import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { ReferrerService } from './referrer.service';

@Controller('credits/referrers')
export class ReferrerController {
  constructor(private readonly referrerService: ReferrerService) {}

  @Get('summary')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get referral program summary for current user' })
  @ApiResponse({
    status: 200,
    description: 'Referral program page summary for the current user',
    schema: {
      example: {
        referralCode: 'SARAH2026',
        referralLink: 'https://backlyst.com/ref/SARAH2026',
        isReferralEnabled: true,
        totalReferrals: 24,
        earnedTaskCredits: 3600,
        earnedVisibilityCredits: 0,
        earnedCredits: 3600,
        convertedReferrals: 16,
        conversionRate: 68,
      },
    },
  })
  getReferralSummary(@CurrentUser('id') userId: string) {
    return this.referrerService.getReferralSummary(userId);
  }

  @Get('progress')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({ summary: 'Get current user referral progress' })
  @ApiResponse({
    status: 200,
    description: 'Referral progress rows for the current referrer',
    schema: {
      example: [
        {
          referralId: 'ref_001',
          codeUsed: 'ARIF2026',
          currentStage: 'FIRST_BACKLINK_ACCEPTED',
          referredUser: {
            id: '9ff0ec1e-cbc7-4303-bc7c-d45a28395f85',
            name: 'Rahim',
            email: 'rahim@example.com',
          },
          referredWebsite: {
            id: '2a7b4cf2-44ef-45fd-9f34-4d4a5e9f673d',
            name: 'Rahim Blog',
            websiteUrl: 'https://rahimblog.com',
          },
          signedUpAt: '2026-05-17T08:00:00.000Z',
          websiteVerifiedAt: '2026-05-17T10:30:00.000Z',
          firstBacklinkAt: '2026-05-20T09:15:00.000Z',
          paidSubscriptionAt: null,
          stage1: {
            completed: true,
            taskCreditsEarned: 1,
            visibilityCreditsEarned: 0,
            rewardedAt: '2026-05-17T10:31:00.000Z',
          },
          stage2: {
            completed: true,
            taskCreditsEarned: 2,
            visibilityCreditsEarned: 0,
            rewardedAt: '2026-05-20T09:16:00.000Z',
          },
          stage3: {
            completed: false,
            taskCreditsEarned: 0,
            visibilityCreditsEarned: 0,
            rewardedAt: null,
          },
          totalTaskCreditsEarned: 3,
          totalVisibilityCreditsEarned: 0,
        },
        {
          referralId: 'ref_002',
          codeUsed: 'ARIF2026',
          currentStage: 'PAID_SUBSCRIPTION',
          referredUser: {
            id: 'd4d9e977-f6f7-45b0-b0b8-14b5c6ee9b36',
            name: 'Karim',
            email: 'karim@example.com',
          },
          referredWebsite: {
            id: '44a0874c-0f3a-4c9a-8cd0-e9644c7567cf',
            name: 'Karim Media',
            websiteUrl: 'https://karimmedia.com',
          },
          signedUpAt: '2026-05-10T09:00:00.000Z',
          websiteVerifiedAt: '2026-05-11T11:00:00.000Z',
          firstBacklinkAt: '2026-05-14T13:00:00.000Z',
          paidSubscriptionAt: '2026-05-16T16:00:00.000Z',
          stage1: {
            completed: true,
            taskCreditsEarned: 1,
            visibilityCreditsEarned: 0,
            rewardedAt: '2026-05-11T11:01:00.000Z',
          },
          stage2: {
            completed: true,
            taskCreditsEarned: 2,
            visibilityCreditsEarned: 0,
            rewardedAt: '2026-05-14T13:01:00.000Z',
          },
          stage3: {
            completed: true,
            taskCreditsEarned: 3,
            visibilityCreditsEarned: 1,
            rewardedAt: '2026-05-16T16:01:00.000Z',
          },
          totalTaskCreditsEarned: 6,
          totalVisibilityCreditsEarned: 1,
        },
      ],
    },
  })
  getReferralProgress(@CurrentUser('id') userId: string) {
    return this.referrerService.getReferralProgress(userId);
  }
}
