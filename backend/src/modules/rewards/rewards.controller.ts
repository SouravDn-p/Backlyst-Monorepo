import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { RewardBadgeQueryDto, RewardLedgerQueryDto } from './dto';
import { AdditionalRewardService } from './services/additional-reward.service';
import { BadgeDefinitionService } from './services/badge-definition.service';
import { RewardLedgerService } from './services/reward-ledger.service';
import { UserRewardProfileService } from './services/user-reward-profile.service';
@ApiTags('Rewards')
@ApiBearerAuth(ACCESS_TOKEN)
@UserGuard()
@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly userRewardProfileService: UserRewardProfileService,
    private readonly badgeDefinitionService: BadgeDefinitionService,
    private readonly additionalRewardService: AdditionalRewardService,
    private readonly rewardLedgerService: RewardLedgerService,
  ) {}
  @Get('me')
  @ApiOperation({ summary: 'Get my rewards overview dashboard' })
  async getMyRewards(@CurrentUser('id') userId: string) {
    const [profile, badges, additionalRewards, activeBenefits, recentLedger] =
      await Promise.all([
        this.userRewardProfileService.getOrCreateProfile(userId),
        this.badgeDefinitionService.getMyBadgesData(userId),
        this.additionalRewardService.getMyAdditionalRewardsData(userId),
        this.additionalRewardService.getMyActiveBenefitsData(userId),
        this.rewardLedgerService.getMyLedgerRows(userId, { page: 1, limit: 5 }),
      ]);
    const nextAchievements = [
      ...badges.eligible.slice(0, 3),
      ...badges.locked.slice(0, 3),
    ].slice(0, 5);
    const nextBadge = badges.eligible[0] ?? badges.locked[0] ?? null;
    return {
      success: true,
      message: 'Rewards overview fetched successfully.',
      data: {
        summary: {
          badgesEarned: badges.earned.length + badges.active.length,
          activeBadges: badges.active.length,
          lockedBadges: badges.locked.length,
          inactiveBadges: badges.inactive.length,
          activeBenefits: activeBenefits.length,
          kickstarterBadges: badges.kickstarter.length,
          hallOfFameBadges: badges.hallOfFame.length,
          nextBadge,
        },
        profile,
        badges: {
          earned: badges.earned,
          active: badges.active,
          locked: badges.locked,
          inactive: badges.inactive,
          kickstarter: badges.kickstarter,
          hallOfFame: badges.hallOfFame,
        },
        activeBenefits,
        additionalRewards,
        recentLedger,
        nextAchievements,
      },
    };
  }
  @Get('me/profile')
  @ApiOperation({ summary: 'Get my reward profile' })
  getMyRewardProfile(@CurrentUser('id') userId: string) {
    return this.userRewardProfileService.getMyRewardProfile(userId);
  }
  @Get('me/badges')
  @ApiOperation({ summary: 'Get my rewards badges' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  getMyBadges(
    @CurrentUser('id') userId: string,
    @Query() query: RewardBadgeQueryDto,
  ) {
    return this.badgeDefinitionService.getMyBadges(userId, query);
  }
  @Get('me/additional-rewards')
  @ApiOperation({ summary: 'Get my additional rewards' })
  getMyAdditionalRewards(@CurrentUser('id') userId: string) {
    return this.additionalRewardService.getMyAdditionalRewards(userId);
  }
  @Get('me/ledger')
  @ApiOperation({ summary: 'Get my reward ledger entries' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'rewardType', required: false, type: String })
  @ApiQuery({ name: 'badgeDefinitionId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyRewardLedger(
    @CurrentUser('id') userId: string,
    @Query() query: RewardLedgerQueryDto,
  ) {
    return this.rewardLedgerService.getMyLedger(userId, query);
  }
}
