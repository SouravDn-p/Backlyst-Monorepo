import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { ProviderTaskService } from './provider-task.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { ApplyTaskDto } from './dto/apply-task.dto';
import { ExtendDeadlineDto } from '../task-requester/dto/extend-deadline.dto';
import { RespondCancelRequestDto } from './dto/respond-cancel-request.dto';
import { GetProviderOpportunitiesQueryDto } from './dto/get-provider-opportunities-query.dto';
import {
  AllowedFileType,
  UploadMultipleFiles,
} from 'src/common/decorator/upload-file.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';

@Controller('provider-task')
@ApiTags('Task - Provider')
@ApiBearerAuth(ACCESS_TOKEN)
@UseGuards(JwtAuthGuard)
export class ProviderTaskController {
  constructor(private readonly providerTaskService: ProviderTaskService) {}

  @Get('opportunities')
  @ApiOperation({
    summary: 'Get provider opportunities',
    description:
      'Returns OPEN / WAITING_FOR_APPLICANTS tasks a provider can apply to. Optional filters: placementType (BACKLINK_INSERTION, GUEST_POST, FLEXIBLE), linkAttribute (DOFOLLOW, NOFOLLOW, UGC, SPONSORED), status (OPEN or WAITING_FOR_APPLICANTS), country, and industry. Country and industry are matched against the requester website.',
  })
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
    name: 'status',
    required: false,
    enum: ['OPEN', 'WAITING_FOR_APPLICANTS'],
  })
  @ApiQuery({
    name: 'country',
    required: false,
    example: 'Bangladesh',
    description: 'Filter by requester website country.',
  })
  @ApiQuery({
    name: 'industry',
    required: false,
    example: 'Marketing',
    description: 'Filter by requester website industry.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'includeOwnTasks',
    required: false,
    type: Boolean,
    example: true,
    description: 'Whether to include tasks created by the querying provider',
  })
  getProviderOpportunities(
    @CurrentUser('id') providerId: string,
    @Query() query: GetProviderOpportunitiesQueryDto,
  ) {
    return this.providerTaskService.getProviderOpportunities(providerId, query);
  }

  @Get('tasks')
  @ApiOperation({
    summary: 'Get provider tasks (consolidated)',
    description:
      'Single list API for provider task views. Use scope + lifecycleStatus filters instead of multiple separate list endpoints.',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['SELECTED', 'APPLIED', 'INVOLVED'],
    description:
      'SELECTED: tasks where provider is selected. APPLIED: tasks provider applied to. INVOLVED: both.',
  })
  @ApiQuery({
    name: 'lifecycleStatus',
    required: false,
    enum: [
      'ALL',
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
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  providerGetTasks(
    @CurrentUser('id') providerId: string,
    @Query('lifecycleStatus')
    lifecycleStatus?:
      | 'DRAFT'
      | 'OPEN'
      | 'WAITING_FOR_APPLICANTS'
      | 'ASSIGNED'
      | 'IN_PROGRESS'
      | 'APPROVED'
      | 'COMPLETED'
      | 'REJECTED'
      | 'REVISION_REQUESTED'
      | 'SUBMITTED'
      | 'CANCELLED'
      | 'EXPIRED'
      | 'FROZEN'
      | 'DISPUTED'
      | 'ALL',
    @Query('scope') scope?: 'SELECTED' | 'APPLIED' | 'INVOLVED',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.providerTaskService.providerGetTasks(
      providerId,
      lifecycleStatus,
      scope ?? 'SELECTED',
      page,
      limit,
    );
  }

  @Get('provider/:id')
  @ApiOperation({
    summary: 'Get provider task details',
    description:
      'Returns task details for a provider if the task is open, applied, or selected.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  getProviderTaskById(
    @Param('id') taskId: string,
    @CurrentUser('id') providerId: string,
  ) {
    return this.providerTaskService.getProviderTaskById(taskId, providerId);
  }

  @Post(':id/apply')
  @ApiOperation({
    summary: 'Apply to a task ( Provider Only )',
    description:
      'Creates one application per provider per task. Requires providerWebsiteId owned by provider and not deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  applyToTask(
    @Param('id') taskId: string,
    @CurrentUser('id') providerId: string,
    @Body() payload: ApplyTaskDto,
  ) {
    return this.providerTaskService.applyToTask(taskId, providerId, payload);
  }

  @Post(':id/deadline-extension-request')
  @ApiOperation({
    summary: 'Request deadline extension',
    description:
      'Selected provider can request extra delivery time. The requester must approve before the task deadline changes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  requestDeadlineExtension(
    @Param('id') taskId: string,
    @CurrentUser('id') providerId: string,
    @Body() payload: ExtendDeadlineDto,
  ) {
    return this.providerTaskService.requestDeadlineExtension(
      taskId,
      providerId,
      payload,
    );
  }

  @Patch(':id/start-work')
  @ApiOperation({
    summary: 'Start work on selected task',
    description:
      'Allows the selected provider to mark an assigned task as in progress.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  startWork(
    @Param('id') taskId: string,
    @CurrentUser('id') providerId: string,
  ) {
    return this.providerTaskService.startWork(taskId, providerId);
  }

  @Patch(':id/respond-cancel-request')
  @ApiOperation({
    summary: 'Respond to requester cancellation request',
    description:
      'Selected provider can accept or reject requester cancellation request. Accepting cancels task and refunds requester credits.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  respondCancelRequest(
    @Param('id') taskId: string,
    @CurrentUser('id') providerId: string,
    @Body() payload: RespondCancelRequestDto,
  ) {
    return this.providerTaskService.respondCancelRequest(
      taskId,
      providerId,
      payload,
    );
  }

  @Patch(':id/submit')
  @UploadMultipleFiles('files', 10, AllowedFileType.ANY)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deliveryMessage: {
          type: 'string',
          example: 'Delivered placement with all requested requirements.',
        },
        proofUrl: {
          type: 'string',
          example: 'https://drive.google.com/file/d/xxxxx/view',
        },
        additionalNotes: {
          type: 'string',
          example: 'Password for archive: 1234',
        },
        finalTaskType: {
          type: 'string',
          enum: ['BACKLINK', 'GUEST_POST'],
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['deliveryMessage'],
    },
  })
  @ApiOperation({
    summary: 'Submit a task',
    description:
      'Single delivery submit API. For FLEXIBLE tasks, finalTaskType is required (BACKLINK | GUEST_POST). For non-FLEXIBLE tasks, finalTaskType must be omitted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  submitTask(
    @Param('id') taskId: string,
    @CurrentUser('id') providerId: string,
    @Body() payload: SubmitTaskDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.providerTaskService.submitTask(
      taskId,
      providerId,
      payload,
      false,
      files,
    );
  }

  @Patch(':id/resubmit')
  @UploadMultipleFiles('files', 10, AllowedFileType.ANY)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deliveryMessage: {
          type: 'string',
          example: 'Resubmitted after requested revision updates.',
        },
        proofUrl: {
          type: 'string',
          example: 'https://drive.google.com/file/d/xxxxx/view',
        },
        additionalNotes: {
          type: 'string',
          example: 'Updated section 2 and 4 as requested.',
        },
        finalTaskType: {
          type: 'string',
          enum: ['BACKLINK', 'GUEST_POST'],
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['deliveryMessage'],
    },
  })
  @ApiOperation({
    summary: 'Resubmit a task',
    description:
      'Allows selected provider to resubmit only when lifecycleStatus is REVISION_REQUESTED. FLEXIBLE finalTaskType rule is same as submit.',
  })
  @ApiParam({
    name: 'id',
    description: 'Placement task identifier.',
    example: 'task-id',
  })
  resubmitTask(
    @Param('id') taskId: string,
    @CurrentUser('id') providerId: string,
    @Body() payload: SubmitTaskDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.providerTaskService.submitTask(
      taskId,
      providerId,
      payload,
      true,
      files,
    );
  }

  @Get('deadline-status')
  @ApiOperation({
    summary: 'Get provider deadline status buckets',
    description:
      'Returns UPCOMING, DUE_TODAY, OVERDUE, and EXTENDED task buckets.',
  })
  getDeadlineStatus(@CurrentUser('id') providerId: string) {
    return this.providerTaskService.getDeadlineStatus(providerId);
  }

  @Get('match-history')
  @ApiOperation({
    summary: 'Get provider match history',
    description:
      'Returns paginated list of past matches for the authenticated provider, including task details, match score, match date, and status.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'ALL',
      'OPEN',
      'WAITING_FOR_APPLICANTS',
      'ASSIGNED',
      'IN_PROGRESS',
      'SUBMITTED',
      'COMPLETED',
      'CANCELLED',
      'DISPUTED',
    ],
  })
  getMatchHistory(
    @CurrentUser('id') providerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.providerTaskService.getMatchHistory(
      providerId,
      { page, limit },
      { status },
    );
  }
}
