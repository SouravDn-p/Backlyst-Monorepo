import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { WeeklyContributionService } from './weekly-contribution.service';

@Controller('websites')
@UserGuard()
@ApiTags('Website Streak')
@ApiBearerAuth(ACCESS_TOKEN)
export class WebsiteStreakController {
  constructor(
    private readonly weeklyContributionService: WeeklyContributionService,
  ) {}

  @Get(':websiteId/streak')
  @ApiOperation({
    summary: 'Get website activity streak',
    description:
      'Returns the current streak, longest streak, current week activity, and whether the website still needs activity this week.',
  })
  @ApiParam({
    name: 'websiteId',
    type: String,
    example: '44a0874c-0f3a-4c9a-8cd0-e9644c7567cf',
  })
  getWebsiteStreak(
    @Param('websiteId') websiteId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: string,
  ) {
    return this.weeklyContributionService.getWebsiteStreak(
      websiteId,
      currentUserId,
      currentUserRole,
    );
  }
}
