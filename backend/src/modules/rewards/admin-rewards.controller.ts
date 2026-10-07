import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RewardAuditActorType } from '@prisma/client';
import type { Request } from 'express';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import {
  AdminAssignBadgeDto,
  AdminBadgeListQueryDto,
  AdminRewardLedgerQueryDto,
  AdminRevokeBadgeDto,
  CreateBadgeDefinitionDto,
  DynamicBadgeRefreshDto,
  RewardAuditQueryDto,
  RewardOutboxQueryDto,
  RewardOutboxRecoveryDto,
  UpdateBadgeDefinitionDto,
} from './dto';
import { AdditionalRewardService } from './services/additional-reward.service';
import { AdminBadgeAssignmentService } from './services/admin-badge-assignment.service';
import { BadgeDefinitionService } from './services/badge-definition.service';
import { DynamicBadgeRefreshService } from './services/dynamic-badge-refresh.service';
import { RewardAuditService, RewardAuditRequestContext } from './services/reward-audit.service';
import { RewardLedgerService } from './services/reward-ledger.service';
import { RewardOutboxProcessorService } from './services/reward-outbox-processor.service';
import { RewardOutboxService } from './services/reward-outbox.service';

@ApiTags('Rewards - Admin')
@ApiBearerAuth(ACCESS_TOKEN)
@AdminGuard()
@Controller('admin/rewards')
export class AdminRewardsController {
  constructor(
    private readonly badgeDefinitionService: BadgeDefinitionService,
    private readonly additionalRewardService: AdditionalRewardService,
    private readonly rewardLedgerService: RewardLedgerService,
    private readonly adminBadgeAssignmentService: AdminBadgeAssignmentService,
    private readonly dynamicBadgeRefreshService: DynamicBadgeRefreshService,
    private readonly rewardOutboxService: RewardOutboxService,
    private readonly rewardOutboxProcessorService: RewardOutboxProcessorService,
    private readonly rewardAuditService: RewardAuditService,
  ) {}

  @Get('badges')
  @ApiOperation({ summary: 'Get reward badge definitions for admin' })
  getBadges(@Query() query: AdminBadgeListQueryDto) {
    return this.badgeDefinitionService.getAdminBadges(query);
  }

  @Get('badges/:id')
  @ApiOperation({ summary: 'Get one reward badge definition for admin' })
  @ApiParam({ name: 'id', type: String })
  getBadgeById(@Param('id') id: string) {
    return this.badgeDefinitionService.getAdminBadgeById(id);
  }

  @Post('badges')
  @ApiOperation({ summary: 'Create reward badge definition' })
  @ApiBody({ type: CreateBadgeDefinitionDto })
  createBadge(
    @Body() dto: CreateBadgeDefinitionDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.badgeDefinitionService.createAdminBadge(
      dto,
      adminId,
      this.toAuditContext(req),
    );
  }

  @Patch('badges/:id')
  @ApiOperation({ summary: 'Update reward badge definition' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateBadgeDefinitionDto })
  updateBadge(
    @Param('id') id: string,
    @Body() dto: UpdateBadgeDefinitionDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.badgeDefinitionService.updateAdminBadge(
      id,
      dto,
      adminId,
      this.toAuditContext(req),
    );
  }

  @Delete('badges/:id')
  @ApiOperation({ summary: 'Soft disable reward badge definition' })
  @ApiParam({ name: 'id', type: String })
  removeBadge(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.badgeDefinitionService.softDeleteAdminBadge(
      id,
      adminId,
      this.toAuditContext(req),
    );
  }

  @Post('seed-defaults')
  @ApiOperation({
    summary: 'Seed default badge definitions and additional reward definitions',
  })
  async seedDefaults(@CurrentUser('id') adminId: string, @Req() req: Request) {
    const [badges, additionalRewards] = await Promise.all([
      this.badgeDefinitionService.ensureDefaultBadges(
        adminId,
        this.toAuditContext(req),
      ),
      this.additionalRewardService.ensureDefaultAdditionalRewards(),
    ]);

    return {
      success: true,
      message: 'Reward defaults seeded successfully.',
      data: {
        badges,
        additionalRewards,
      },
    };
  }
  @Get('outbox/health')
  @ApiOperation({ summary: 'Get reward outbox health for admin/ops' })
  getOutboxHealth() {
    return this.rewardOutboxService.getOutboxHealth();
  }

  @Get('outbox')
  @ApiOperation({ summary: 'Get reward outbox rows for admin/ops' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getOutboxRows(@Query() query: RewardOutboxQueryDto) {
    return this.rewardOutboxService.getOutboxRows(query);
  }

  @Post('outbox/recover-stale')
  @ApiOperation({ summary: 'Recover stale PROCESSING reward outbox rows' })
  @ApiBody({ type: RewardOutboxRecoveryDto, required: false })
  recoverStaleOutbox(
    @Body() dto: RewardOutboxRecoveryDto = new RewardOutboxRecoveryDto(),
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.rewardOutboxProcessorService.recoverStaleProcessing(dto, {
      actorType: RewardAuditActorType.ADMIN,
      actorId: adminId,
      source: 'ADMIN_PANEL',
      requestContext: this.toAuditContext(req),
      triggeredBy: 'ADMIN',
    });
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get one user reward state for admin' })
  @ApiParam({ name: 'userId', type: String })
  getUserRewards(@Param('userId') userId: string) {
    return this.adminBadgeAssignmentService.getAdminUserRewardDetail(userId);
  }

  @Post('users/:userId/badges/assign')
  @ApiOperation({ summary: 'Assign one badge to a user as admin' })
  @ApiParam({ name: 'userId', type: String })
  @ApiBody({ type: AdminAssignBadgeDto })
  assignBadge(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminAssignBadgeDto,
    @Req() req: Request,
  ) {
    return this.adminBadgeAssignmentService.assignBadgeToUser({
      ...dto,
      userId,
      adminId,
      requestContext: this.toAuditContext(req),
    });
  }

  @Post('users/:userId/badges/revoke')
  @ApiOperation({ summary: 'Revoke one badge from a user as admin' })
  @ApiParam({ name: 'userId', type: String })
  @ApiBody({ type: AdminRevokeBadgeDto })
  revokeBadge(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminRevokeBadgeDto,
    @Req() req: Request,
  ) {
    return this.adminBadgeAssignmentService.revokeBadgeFromUser({
      ...dto,
      userId,
      adminId,
      requestContext: this.toAuditContext(req),
    });
  }

  @Post('dynamic-refresh')
  @ApiOperation({ summary: 'Refresh due dynamic badges now' })
  @ApiBody({ type: DynamicBadgeRefreshDto, required: false })
  refreshDynamicBadges(
    @Body() dto: DynamicBadgeRefreshDto = new DynamicBadgeRefreshDto(),
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.dynamicBadgeRefreshService.refreshDueBadges(dto, {
      actorType: RewardAuditActorType.ADMIN,
      actorId: adminId,
      source: 'ADMIN_PANEL',
      requestContext: this.toAuditContext(req),
      triggeredBy: 'ADMIN',
    });
  }

  @Post('expire-benefits')
  @ApiOperation({ summary: 'Expire stale reward benefits now' })
  @ApiBody({ type: DynamicBadgeRefreshDto, required: false })
  expireBenefits(
    @Body() dto: DynamicBadgeRefreshDto = new DynamicBadgeRefreshDto(),
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ) {
    return this.dynamicBadgeRefreshService.expireStaleBenefits(dto, {
      actorType: RewardAuditActorType.ADMIN,
      actorId: adminId,
      source: 'ADMIN_PANEL',
      requestContext: this.toAuditContext(req),
      triggeredBy: 'ADMIN',
    });
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get reward ledger entries for admin' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'rewardType', required: false, type: String })
  @ApiQuery({ name: 'rewardCode', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAdminLedger(@Query() query: AdminRewardLedgerQueryDto) {
    return this.rewardLedgerService.getAdminLedger(query);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get reward audit logs for admin' })
  getAuditLogs(@Query() query: RewardAuditQueryDto) {
    return this.rewardAuditService.getAdminAuditLogs(query);
  }

  @Get('audit-logs/:id')
  @ApiOperation({ summary: 'Get one reward audit log for admin' })
  @ApiParam({ name: 'id', type: String })
  getAuditLogDetail(@Param('id') id: string) {
    return this.rewardAuditService.getAdminAuditLogDetail(id);
  }

  private toAuditContext(req: Request): RewardAuditRequestContext {
    return {
      ipAddress: req.ip ?? null,
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null,
    };
  }
}
