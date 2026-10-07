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
import { DirectTaskRequestService } from './direct-task-request.service';
import { CreateDirectTaskRequestDto } from './dto/create-direct-task-request.dto';
import { AcceptDirectTaskRequestDto } from './dto/accept-direct-task-request.dto';
import { RejectDirectTaskRequestDto } from './dto/reject-direct-task-request.dto';
import { CancelDirectTaskRequestDto } from './dto/cancel-direct-task-request.dto';
import { GetDirectTaskRequestsQueryDto } from './dto/get-direct-task-requests-query.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import {
  AllowedFileType,
  UploadMultipleFiles,
} from 'src/common/decorator/upload-file.decorator';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller('task-request')
@ApiTags('Task - Request')
@ApiBearerAuth(ACCESS_TOKEN)
@UseGuards(JwtAuthGuard)
export class DirectTaskRequestController {
  constructor(
    private readonly directTaskRequestService: DirectTaskRequestService,
    private readonly s3: AwsS3Service,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create and send a direct task request',
    description: `Allows a requester to create and send a direct task request to a specific provider. Reserves credits upfront from the specified website wallet.

### 💡 Request Format
This endpoint accepts **\`multipart/form-data\`**.
- **\`data\`** *(required, string)*: A stringified JSON string matching \`CreateDirectTaskRequestDto\`.
- **\`files\`** *(optional, array of files)*: Up to 5 supporting documents.

### 📋 cURL Example:
\`\`\`bash
curl -X POST "http://localhost:5001/task-request" \\
  -H "Authorization: Bearer <REQUESTER_ACCESS_TOKEN>" \\
  -F 'data={
    "requesterWebsiteId": "646fd05f-5676-458f-b25f-c2d9dbc3d695",
    "targetProviderId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "projectTitle": "Direct Guest Post Campaign",
    "targetUrl": "https://example.com/blog/seo-guide",
    "anchorText": "best seo tools",
    "placementType": "GUEST_POST",
    "linkAttribute": "DOFOLLOW",
    "requestedDeadlineDays": 7,
    "walletType": "SUBSCRIPTION",
    "placementGuidelines": "Please place link in main content area."
  }' \\
  -F 'files=@/path/to/guidelines.pdf'
\`\`\`
`,
  })
  @UploadMultipleFiles('files', 5, AllowedFileType.ANY)
  @ApiConsumes('multipart/form-data')
  @ApiExtraModels(CreateDirectTaskRequestDto)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          $ref: getSchemaPath(CreateDirectTaskRequestDto),
          description:
            'Direct task request creation payload. Note: When sending via multipart/form-data, stringify this JSON object.',
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
    description: 'Direct task request created successfully.',
    schema: {
      example: {
        success: true,
        message: 'Direct task request created successfully.',
        data: {
          id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          requesterId: 'user-requester-id',
          requesterWebsiteId: '646fd05f-5676-458f-b25f-c2d9dbc3d695',
          targetProviderId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          projectTitle: 'Direct Guest Post Campaign',
          targetUrl: 'https://example.com/blog/seo-guide',
          anchorText: 'best seo tools',
          placementGuidelines: 'Please place link in main content area.',
          requiredDomainRating: null,
          placementType: 'GUEST_POST',
          linkAttribute: 'DOFOLLOW',
          requestedDeadlineDays: 7,
          creditCost: 2,
          reservedCreditAmount: 2,
          walletType: 'SUBSCRIPTION',
          status: 'PENDING',
          createdTaskId: null,
          supportDocuments: ['task-support/guidelines-12345.pdf'],
          expiresAt: '2026-08-10T10:00:00.000Z',
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
  async createDirectRequest(
    @CurrentUser('id') requesterId: string,
    @Body() payload: { data: string },
    @UploadedFiles() supportDocuments?: Express.Multer.File[],
  ) {
    let parsed: CreateDirectTaskRequestDto;
    try {
      parsed = plainToInstance(
        CreateDirectTaskRequestDto,
        JSON.parse(payload.data),
      );
    } catch {
      throw new BadRequestException('Invalid JSON in data field.');
    }

    const validationErrors = await validate(parsed);
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        validationErrors
          .map((item) => Object.values(item.constraints ?? {}).join(', '))
          .filter(Boolean)
          .join('; ') || 'Invalid payload.',
      );
    }

    const uploadedDocuments = await Promise.all(
      (supportDocuments ?? []).map((file) =>
        this.s3.uploadFileToS3(file, 'task-support'),
      ),
    );

    return this.directTaskRequestService.createDirectRequest(
      requesterId,
      parsed,
      uploadedDocuments.map((doc) => doc.key),
    );
  }

  @Get('sent')
  @ApiOperation({
    summary: 'Get sent direct task requests',
    description: 'Returns all direct task requests sent by the authenticated requester.',
  })
  getSentDirectRequests(
    @CurrentUser('id') requesterId: string,
    @Query() query: GetDirectTaskRequestsQueryDto,
  ) {
    return this.directTaskRequestService.getSentDirectRequests(requesterId, query);
  }

  @Get('received')
  @ApiOperation({
    summary: 'Get received direct task requests',
    description: 'Returns all direct task requests received by the authenticated provider.',
  })
  getReceivedDirectRequests(
    @CurrentUser('id') providerId: string,
    @Query() query: GetDirectTaskRequestsQueryDto,
  ) {
    return this.directTaskRequestService.getReceivedDirectRequests(providerId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get direct task request details',
    description: 'Returns details of a specific direct task request.',
  })
  @ApiParam({ name: 'id', description: 'Direct task request ID' })
  getDirectRequestById(
    @CurrentUser('id') userId: string,
    @Param('id') requestId: string,
  ) {
    return this.directTaskRequestService.getDirectRequestById(userId, requestId);
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Accept direct task request (Provider Only)',
    description:
      'Target provider accepts direct task request and chooses their provider website to fulfill it. Automatically creates PlacementTask and assigns to provider.',
  })
  @ApiParam({ name: 'id', description: 'Direct task request ID' })
  acceptDirectRequest(
    @CurrentUser('id') providerId: string,
    @Param('id') requestId: string,
    @Body() body: AcceptDirectTaskRequestDto,
  ) {
    return this.directTaskRequestService.acceptDirectRequest(
      providerId,
      requestId,
      body,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Reject direct task request (Provider Only)',
    description:
      'Target provider rejects direct task request. Automatically refunds reserved credits to requester.',
  })
  @ApiParam({ name: 'id', description: 'Direct task request ID' })
  rejectDirectRequest(
    @CurrentUser('id') providerId: string,
    @Param('id') requestId: string,
    @Body() payload: RejectDirectTaskRequestDto,
  ) {
    return this.directTaskRequestService.rejectDirectRequest(
      providerId,
      requestId,
      payload,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel direct task request (Requester Only)',
    description:
      'Requester cancels pending direct task request. Automatically refunds reserved credits.',
  })
  @ApiParam({ name: 'id', description: 'Direct task request ID' })
  cancelDirectRequest(
    @CurrentUser('id') requesterId: string,
    @Param('id') requestId: string,
    @Body() payload: CancelDirectTaskRequestDto,
  ) {
    return this.directTaskRequestService.cancelDirectRequest(
      requesterId,
      requestId,
      payload,
    );
  }
}
