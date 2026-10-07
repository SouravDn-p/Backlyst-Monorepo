import {
  BadRequestException,
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
import { TaskRequesterService } from './task-requester.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  AllowedFileType,
  UploadMultipleFiles,
} from 'src/common/decorator/upload-file.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { SelectProviderDto } from './dto/select-provider.dto';
import { CancelTaskDto } from './dto/cancel-task.dto';
import { ReviewTaskDto } from './dto/review-task.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import { RespondDeadlineExtensionDto } from './dto/respond-deadline-extension.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { GetMozStatsDto } from './dto/get-moz-stats.dto';
import { Public } from 'src/common/decorator/public.decorator';
import { QualityRubricDto } from '../dto/quality-rubric.dto';

@Controller('task-requester')
@ApiTags('Task - Requester')
@ApiBearerAuth(ACCESS_TOKEN)
@UseGuards(JwtAuthGuard)
export class TaskRequesterController {
  constructor(
    private readonly taskRequesterService: TaskRequesterService,
    private readonly s3: AwsS3Service,
  ) {}

  @Post('moz-stats')
  @Public()
  @ApiOperation({
    summary: 'Get MOZ stats by domain',
    description: 'Fetches MOZ metrics for a given domain or URL.',
  })
  getMozStats(@Body() payload: GetMozStatsDto) {
    return this.taskRequesterService.getDomainMozStats(payload.domain);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a task',
    description: `Allows a requester to create a marketplace placement task. Support documents are optional, with a maximum of five files.

### 💡 Request Format
This endpoint accepts **\`multipart/form-data\`**.
- **\`data\`** *(required, string)*: A stringified JSON string matching \`CreateTaskDto\`.
- **\`files\`** *(optional, array of files)*: Up to 5 supporting documents.

### 📋 cURL Example:
\`\`\`bash
curl -X POST "http://localhost:5001/task-requester" \\
  -H "Authorization: Bearer <REQUESTER_ACCESS_TOKEN>" \\
  -F 'data={
    "requesterWebsiteId": "646fd05f-5676-458f-b25f-c2d9dbc3d695",
    "projectTitle": "Guest Post SEO Campaign",
    "targetUrl": "https://example.com/blog/seo-guide",
    "anchorText": "best seo tools",
    "placementType": "GUEST_POST",
    "linkAttribute": "DOFOLLOW",
    "requestedDeadlineDays": 7,
    "walletType": "SUBSCRIPTION",
    "placementGuidelines": "Must be placed within relevant content."
  }' \\
  -F 'files=@/path/to/guidelines.pdf'
\`\`\`
`,
  })
  @UploadMultipleFiles('files', 5, AllowedFileType.ANY)
  @ApiConsumes('multipart/form-data')
  @ApiExtraModels(CreateTaskDto)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          $ref: getSchemaPath(CreateTaskDto),
          description:
            'Marketplace task creation payload. Note: When sending via multipart/form-data, stringify this JSON object.',
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional supporting documents (max 5 files).',
        },
      },
      required: ['data'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully.',
    schema: {
      example: {
        success: true,
        message: 'Task created successfully.',
        data: {
          id: 'task-uuid-1234',
          requesterId: 'user-requester-id',
          requesterWebsiteId: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
          projectTitle: 'Guest Post SEO Campaign',
          targetUrl: 'https://example.com/blog/seo-guide',
          anchorText: 'best seo tools',
          placementType: 'GUEST_POST',
          linkAttribute: 'DOFOLLOW',
          requestedDeadlineDays: 7,
          creditCost: 2,
          reservedCreditAmount: 2,
          walletType: 'SUBSCRIPTION',
          lifecycleStatus: 'OPEN',
          createdAt: '2026-08-03T10:00:00.000Z',
          updatedAt: '2026-08-03T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid JSON data, validation error, or insufficient credit balance.',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'Insufficient subscription task credits.',
      },
    },
  })
  async createTask(
    @CurrentUser('id') requesterId: string,
    @Body() payload: { data: string },
    @UploadedFiles() supportDocuments?: Express.Multer.File[],
  ) {
    let parsed: CreateTaskDto;
    try {
      parsed = plainToInstance(CreateTaskDto, JSON.parse(payload.data));
    } catch {
      throw new BadRequestException('Invalid JSON in data field.');
    }

    const validationErrors = await validate(parsed);
    console.log(
      '🚀 ~ TaskRequesterController ~ createTask ~ validationErrors:',
      validationErrors,
    );
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        validationErrors
          .map((item) => Object.values(item.constraints ?? {}).join(', '))
          .filter(Boolean)
          .join('; ') || 'Invalid task payload.',
      );
    }

    const uploadedDocuments = await Promise.all(
      (supportDocuments ?? []).map((file) =>
        this.s3.uploadFileToS3(file, 'task-support'),
      ),
    );

    return this.taskRequesterService.createTask(requesterId, {
      ...parsed,
      supportDocuments: uploadedDocuments.map((document) => document.key),
    });
  }

  @Get('my-tasks')
  @ApiOperation({
    summary: 'Get requester tasks',
    description:
      'Returns all tasks created by the authenticated requester. Supports optional filtering by lifecycle status and deadline status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'DRAFT',
      'OPEN',
      'WAITING_FOR_APPLICANTS',
      'ASSIGNED',
      'IN_PROGRESS',
      'SUBMITTED',
      'REVISION_REQUESTED',
      'APPROVED',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
      'FROZEN',
      'DISPUTED',
    ],
    description: 'Filter by task lifecycle status.',
  })
  @ApiQuery({
    name: 'deadlineStatus',
    required: false,
    enum: ['LATE', 'ONTIME'],
    description:
      'Filter by deadline condition. LATE=true tasks, ONTIME=false tasks.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getMyTasks(
    @CurrentUser('id') requesterId: string,
    @Query('status') status?: string,
    @Query('deadlineStatus') deadlineStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.taskRequesterService.getMyTasks(requesterId, {
      status,
      deadlineStatus,
      page,
      limit,
    });
  }

  @Get(':taskId/applicants')
  @ApiOperation({
    summary: 'Get task applicants',
    description:
      'Returns all applicants for one requester-owned task. Includes provider profile summary and application status.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID to fetch applicant list for.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getMyTaskApplicants(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.taskRequesterService.getMyTaskApplicants(requesterId, taskId, {
      page,
      limit,
    });
  }

  @Patch(':taskId/select-provider')
  @ApiOperation({
    summary: 'Select a provider',
    description:
      'Allows a requester to select one provider from the task applicants.',
  })
  @ApiParam({
    name: 'taskId',
    description:
      'Placement task ID where one applicant will be selected as provider.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  selectProvider(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
    @Body() payload: SelectProviderDto,
  ) {
    return this.taskRequesterService.selectProvider(
      taskId,
      requesterId,
      payload,
    );
  }

  @Patch(':taskId/cancel')
  @ApiOperation({
    summary: 'Cancel a task',
    description:
      'Cancels immediately only when no provider is selected. If provider is already selected, this endpoint creates a cancellation request (PENDING) that the selected provider must accept/reject.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID to cancel.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  cancelTask(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
    @Body() payload: CancelTaskDto,
  ) {
    return this.taskRequesterService.cancelTask(
      taskId,
      requesterId,
      payload.note,
    );
  }

  @Patch(':taskId/review')
  @ApiOperation({
    summary: 'Review a submission ( Requester Only )',
    description:
      'Allows requester action on SUBMITTED task: APPROVE (COMPLETED + APPROVED), REQUEST_REVISION (REVISION_REQUESTED), or REJECT (DISPUTED + REJECTED).',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID to review submitted work.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  reviewTask(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
    @Body() payload: ReviewTaskDto,
  ) {
    return this.taskRequesterService.reviewTask(taskId, requesterId, payload);
  }

  @Get(':taskId')
  @ApiOperation({
    summary: 'Get requester task details',
    description:
      'Returns a single task owned by the current requester, including applicants, timeline, and deadline extension entries.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  getTaskById(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.taskRequesterService.getTaskByIdRequester(taskId, requesterId);
  }

  @Get(':taskId/timeline')
  @ApiOperation({
    summary: 'Get requester task timeline',
    description:
      'Returns chronological TaskFlow events for a task with computed UI action labels and current status context.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID to fetch full timeline for.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  getTaskTimeline(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.taskRequesterService.getTaskTimeline(taskId, userId, role);
  }

  @Patch(':taskId/deadline')
  @ApiOperation({
    summary: 'Update requested deadline days',
    description:
      'Updates requested deadline days before provider selection. Allowed values: 3, 5, 7, 10, 14, 21, 30.',
  })
  updateDeadline(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
    @Body() payload: UpdateDeadlineDto,
  ) {
    return this.taskRequesterService.updateTaskDeadline(
      taskId,
      requesterId,
      payload,
    );
  }

  @Post(':taskId/extend-deadline')
  @ApiOperation({
    summary: 'Extend selected provider deadline',
    description:
      'Extends current delivery deadline for an active selected-provider task. Body: extendDays (1, 3, 5, 7, 14) and optional reason.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID to extend delivery deadline.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  extendDeadline(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
    @Body() payload: ExtendDeadlineDto,
  ) {
    return this.taskRequesterService.extendDeadline(
      taskId,
      requesterId,
      payload,
    );
  }

  @Patch(':taskId/deadline-extension-requests/:requestId/respond')
  @ApiOperation({
    summary: 'Respond to provider deadline extension request',
    description:
      'Requester can approve or reject a selected provider deadline extension request. Approval updates the task delivery deadline.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Deadline extension request ID.',
    example: 'deadline-request-id',
  })
  respondDeadlineExtensionRequest(
    @Param('taskId') taskId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('id') requesterId: string,
    @Body() payload: RespondDeadlineExtensionDto,
  ) {
    return this.taskRequesterService.respondDeadlineExtensionRequest(
      taskId,
      requestId,
      requesterId,
      payload,
    );
  }

  @Get('provider-trust/:providerWebsiteId')
  @ApiOperation({
    summary: 'Get provider trust indicators',
    description:
      'Returns trust indicators (verified badge, quality tier, response time, completion rate, dispute rate) for a specific provider website.',
  })
  @ApiParam({
    name: 'providerWebsiteId',
    description: 'Provider website ID to get trust indicators for.',
    example: 'website-id',
  })
  getProviderTrustIndicators(
    @CurrentUser('id') requesterId: string,
    @Param('providerWebsiteId') providerWebsiteId: string,
  ) {
    return this.taskRequesterService.getProviderTrustIndicators(
      requesterId,
      providerWebsiteId,
    );
  }

  @Post(':taskId/quality-rubric')
  @ApiOperation({
    summary: 'Submit quality rubric for completed task',
    description:
      'Allows requester to rate provider across multiple dimensions for a completed task. Updates provider quality rating.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Placement task ID to submit rubric for.',
    example: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
  })
  @ApiBody({ type: QualityRubricDto })
  submitQualityRubric(
    @Param('taskId') taskId: string,
    @CurrentUser('id') requesterId: string,
    @Body() payload: QualityRubricDto,
  ) {
    return this.taskRequesterService.submitQualityRubric(
      taskId,
      requesterId,
      payload,
    );
  }
}
