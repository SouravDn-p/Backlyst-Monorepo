import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { DisputeStatus, UserRole } from '@prisma/client';
import { DisputeService } from './dispute.service';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { PlatformFeatureToggleKeyDtoEnum } from 'src/modules/admin/platform-feature-toggle/dto/update-platform-feature-toggles.dto';
import { PlatformFeatureToggleService } from 'src/modules/admin/platform-feature-toggle/platform-feature-toggle.service';

@Controller()
@ApiTags('Task - Dispute')
@ApiBearerAuth(ACCESS_TOKEN)
export class DisputeController {
  constructor(
    private readonly disputeService: DisputeService,
    private readonly platformFeatureToggleService: PlatformFeatureToggleService,
  ) {}

  private async ensureSelfServiceDisputesEnabled() {
    await this.platformFeatureToggleService.ensureEnabled(
      PlatformFeatureToggleKeyDtoEnum.SELF_SERVICE_DISPUTE_CENTER,
      'Self-service dispute center is currently disabled.',
    );
  }

  @Post('tasks/:taskId/disputes')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Open a dispute for a task',
    description:
      'Opens a dispute for the given task. Only the owner of the requester or provider website involved in the task may open it. Flips the task to DISPUTED and notifies both parties.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task id to open a dispute against.',
  })
  async openDispute(
    @CurrentUser('id') actorId: string,
    @Param('taskId') taskId: string,
    @Body() payload: OpenDisputeDto,
  ) {
    await this.ensureSelfServiceDisputesEnabled();

    return this.disputeService.openDispute(actorId, taskId, payload);
  }

  @Get('disputes')
  @UserGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'List disputes',
    description:
      'Lists disputes. Admins see all disputes; other users see only disputes tied to websites they own.',
  })
  async listDisputes(
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') role: UserRole,
    @Query('status') status?: DisputeStatus,
    @Query('taskId') taskId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.ensureSelfServiceDisputesEnabled();

    return this.disputeService.listDisputes(actorId, role, {
      status,
      taskId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('admin/disputes/:id/resolve')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Resolve a dispute (admin)',
    description:
      'Admin-only. Resolves a dispute, optionally applying a credit adjustment persisted via creditAdjustmentId.',
  })
  @ApiParam({ name: 'id', description: 'Dispute id to resolve.' })
  resolveDispute(
    @CurrentUser('id') adminId: string,
    @Param('id') disputeId: string,
    @Body() payload: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(adminId, disputeId, payload);
  }
}
