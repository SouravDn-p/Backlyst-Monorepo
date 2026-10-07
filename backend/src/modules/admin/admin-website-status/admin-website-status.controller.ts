import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { WebsiteStatusService } from './admin-website-status.service';
import {
  ResetQualityScoreDto,
  SetTierLimitsDto,
  SetWebsiteStatusDto,
} from './dto/admin-website-status.dto';

@ApiTags('Admin Website Marketplace Status')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/website-status')
export class AdminWebsiteStatusController {
  constructor(private readonly websiteStatusService: WebsiteStatusService) {}

  @Post()
  @ApiOperation({
    summary:
      'Set a website marketplace status (spec §7): ACTIVE / LOW_PRIORITY / ' +
      'LIMITED_ACCESS / UNDER_REVIEW / RESTRICTED / SUSPENDED',
  })
  setStatus(
    @CurrentUser('id') adminId: string,
    @Body() dto: SetWebsiteStatusDto,
  ) {
    return this.websiteStatusService.setStatus(adminId, dto);
  }

  @Patch(':websiteId/tier-limits')
  @ApiOperation({
    summary:
      'Set per-profile tier velocity limits (spec §16): weeklyInteractionLimit / tierVelocityLimit',
  })
  @ApiParam({
    name: 'websiteId',
    type: String,
    description: 'Website ID whose matching profile limits should be set',
  })
  setTierLimits(
    @CurrentUser('id') adminId: string,
    @Param('websiteId') websiteId: string,
    @Body() dto: SetTierLimitsDto,
  ) {
    return this.websiteStatusService.setTierLimits(adminId, websiteId, dto);
  }

  @Get(':websiteId/quality-metrics')
  @ApiOperation({
    summary:
      'View a website internal quality metrics (spec §15). Admin-only; never exposed to end users (§18).',
  })
  @ApiParam({ name: 'websiteId', type: String })
  getQualityMetrics(@Param('websiteId') websiteId: string) {
    return this.websiteStatusService.getQualityMetrics(websiteId);
  }

  @Get(':websiteId/quality-history')
  @ApiOperation({
    summary:
      'View a website quality status-change history / audit log (spec §15/§16).',
  })
  @ApiParam({ name: 'websiteId', type: String })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getQualityHistory(
    @Param('websiteId') websiteId: string,
    @Query('limit') limit?: string,
  ) {
    return this.websiteStatusService.getQualityHistory(
      websiteId,
      limit ? Number(limit) : undefined,
    );
  }

  @Post(':websiteId/reset-quality-score')
  @ApiOperation({
    summary:
      'Reset a website internal quality score (spec §15). Records an ADMIN_RESET audit row.',
  })
  @ApiParam({ name: 'websiteId', type: String })
  resetQualityScore(
    @CurrentUser('id') adminId: string,
    @Param('websiteId') websiteId: string,
    @Body() dto: ResetQualityScoreDto,
  ) {
    return this.websiteStatusService.resetQualityScore(adminId, websiteId, dto);
  }

  @Post(':websiteId/recompute')
  @ApiOperation({
    summary:
      'Admin-triggered full quality recompute for a website (spec §6). Re-runs ' +
      'the composite (incl. diversity/behaviour + activity decay), reconciles the ' +
      'automatic status band, refreshes premium-access, and appends a history snapshot.',
  })
  @ApiParam({ name: 'websiteId', type: String })
  recomputeQuality(
    @CurrentUser('id') adminId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.websiteStatusService.recomputeQuality(adminId, websiteId);
  }

  @Get(':websiteId/quality-trend')
  @ApiOperation({
    summary:
      'View a website quality-score time-series (spec §6): composite + sub-signal ' +
      'snapshots over time for trend/drift analysis. Admin-only (§18).',
  })
  @ApiParam({ name: 'websiteId', type: String })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getQualityTrend(
    @Param('websiteId') websiteId: string,
    @Query('limit') limit?: string,
  ) {
    return this.websiteStatusService.getQualityTrend(
      websiteId,
      limit ? Number(limit) : undefined,
    );
  }
}
