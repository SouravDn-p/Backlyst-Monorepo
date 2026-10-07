import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminTaskService } from './admin-task.service';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { AdminTaskActionDto } from './dto/admin-task-action.dto';
import { GetAdminTaskDashboardQueryDto } from './dto/get-admin-task-dashboard-query.dto';

@Controller('admin-task')
@ApiTags('Tasks - Admin')
@ApiBearerAuth(ACCESS_TOKEN)
export class AdminTaskController {
  constructor(private readonly adminTaskService: AdminTaskService) {}

  @Get('dashboard/oversight')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get admin task oversight dashboard',
    description:
      'Returns the task oversight summary card values for the admin dashboard, including total tasks created in range, unique involved users, and disputed task events.',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
    description:
      'Preset time range. Ignored when custom from/to values are provided.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-06-01T00:00:00.000Z',
    description: 'Custom ISO start date. Overrides range when provided.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-06-30T23:59:59.999Z',
    description: 'Custom ISO end date. Overrides range when provided.',
  })
  getTaskOversightDashboard(@Query() query: GetAdminTaskDashboardQueryDto) {
    return this.adminTaskService.getTaskOversightDashboard(query);
  }

  @Get('dashboard/lifecycle')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get admin task lifecycle dashboard',
    description:
      'Returns task lifecycle event totals for the admin dashboard, including created, accepted, completed, and disputed counts for the selected period.',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
    description:
      'Preset time range. Ignored when custom from/to values are provided.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-06-01T00:00:00.000Z',
    description: 'Custom ISO start date. Overrides range when provided.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-06-30T23:59:59.999Z',
    description: 'Custom ISO end date. Overrides range when provided.',
  })
  getTaskLifecycleDashboard(@Query() query: GetAdminTaskDashboardQueryDto) {
    return this.adminTaskService.getTaskLifecycleDashboard(query);
  }

  @Get('dashboard/lifecycle-panel')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get admin task lifecycle panel',
    description:
      'Returns task lifecycle totals together with backlink trust ratio for completed approved placements in the selected period.',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
    description:
      'Preset time range. Ignored when custom from/to values are provided.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-06-01T00:00:00.000Z',
    description: 'Custom ISO start date. Overrides range when provided.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-06-30T23:59:59.999Z',
    description: 'Custom ISO end date. Overrides range when provided.',
  })
  getTaskLifecyclePanel(@Query() query: GetAdminTaskDashboardQueryDto) {
    return this.adminTaskService.getTaskLifecyclePanel(query);
  }

  @Get('all')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get all tasks for admin',
    description: 'Returns all tasks with optional admin-level filters.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'DRAFT',
      'OPEN',
      'WAITING_FOR_APPLICANTS',
      'APPLIED',
      'SELECTED',
      'ASSIGNED',
      'IN_PROGRESS',
      'SUBMITTED',
      'REVISION_REQUESTED',
      'REJECTED',
      'APPROVED',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
      'FROZEN',
      'DISPUTED',
    ],
  })
  @ApiQuery({ name: 'search', required: false, example: 'seo' })
  @ApiQuery({
    name: 'placementType',
    required: false,
    enum: ['BACKLINK_INSERTION', 'GUEST_POST', 'FLEXIBLE'],
  })
  @ApiQuery({
    name: 'linkAttribute',
    required: false,
    enum: ['DOFOLLOW', 'NOFOLLOW', 'UGC', 'SPONSORED'],
  })
  @ApiQuery({
    name: 'deadlineStatus',
    required: false,
    enum: ['LATE', 'ONTIME'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getAllTasksForAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('placementType') placementType?: string,
    @Query('linkAttribute') linkAttribute?: string,
    @Query('deadlineStatus') deadlineStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminTaskService.getAllTasksForAdmin({
      status,
      search,
      placementType,
      linkAttribute,
      deadlineStatus,
      page,
      limit,
    });
  }

  @Get(':id')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Get task details for admin',
    description:
      'Returns a single task with requester, provider, applications, and flow history.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  getTaskByIdForAdmin(@Param('id') taskId: string) {
    return this.adminTaskService.getTaskByIdForAdmin(taskId);
  }

  @Post(':id/action')
  @AdminGuard()
  @ApiBearerAuth(ACCESS_TOKEN)
  @ApiOperation({
    summary: 'Run admin task action',
    description:
      'Single admin action endpoint for freeze, force approve/reject, credit refund/reverse, dispute resolution, and abuse pattern flagging. Every action requires an audit reason.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  @ApiBody({
    type: AdminTaskActionDto,
    description:
      'Use the `action` enum to decide which admin operation to run. Some actions require extra fields like `amount` or `disputeResolution`.',
    examples: {
      freeze: {
        summary: 'Freeze task',
        value: {
          action: 'FREEZE',
          reason: 'Fraud review pending.',
        },
      },
      forceApprove: {
        summary: 'Force approve task',
        value: {
          action: 'FORCE_APPROVE',
          reason: 'Admin verified proof and placement manually.',
        },
      },
      creditRefund: {
        summary: 'Refund credits',
        value: {
          action: 'CREDIT_REFUND',
          amount: 1,
          reason: 'Refund approved after dispute review.',
        },
      },
      resolveDispute: {
        summary: 'Resolve dispute with revision request',
        value: {
          action: 'RESOLVE_DISPUTE',
          disputeResolution: 'REQUEST_REVISION',
          reason: 'Provider must update proof and placement context.',
        },
      },
    },
  })
  runTaskAction(
    @Param('id') taskId: string,
    @CurrentUser('id') adminId: string,
    @Body() payload: AdminTaskActionDto,
  ) {
    return this.adminTaskService.runTaskAction(taskId, adminId, payload);
  }
}
