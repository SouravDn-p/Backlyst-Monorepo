import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { MessagingService } from './messaging.service';
import { UserGuard } from 'src/common/guards/auth/user.guard';
import { AdminGuard } from 'src/common/guards/auth/admin.guard';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { sendResponse } from 'src/utils/sendResponse';
import { JwtPayload } from 'src/types';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MessagingProducer } from './messaging.producer';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendMessageDto } from './dto/send-message.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { UpdateMessageRegistryStatusDto } from './dto/update-message-registry-status.dto';
import { ReviewMessageReportDto } from './dto/review-message-report.dto';
import type { MultipartSendBody } from './message.interface';
import { PlatformFeatureToggleKeyDtoEnum } from '../admin/platform-feature-toggle/dto/update-platform-feature-toggles.dto';
import { PlatformFeatureToggleService } from '../admin/platform-feature-toggle/platform-feature-toggle.service';

@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly awsS3Service: AwsS3Service,
    private readonly messagingProducer: MessagingProducer,
    private readonly platformFeatureToggleService: PlatformFeatureToggleService,
  ) {}

  private async ensureMessagingEnabled() {
    await this.platformFeatureToggleService.ensureEnabled(
      PlatformFeatureToggleKeyDtoEnum.INTERNAL_ENTITY_MESSAGING,
      'Internal entity messaging is currently disabled.',
    );
  }

  private async validateDto<T extends object>(
    cls: new () => T,
    payload: unknown,
  ): Promise<T> {
    const instance = plainToInstance(cls, payload);
    const errors = await validate(instance as object);

    if (errors.length > 0) {
      throw new BadRequestException(
        errors
          .map((item) => Object.values(item.constraints ?? {}).join(', '))
          .filter(Boolean)
          .join('; ') || 'Invalid payload.',
      );
    }

    return instance;
  }

  private async parseSendBody(
    body: MultipartSendBody,
  ): Promise<SendMessageDto> {
    if (body.data) {
      try {
        const parsed = JSON.parse(body.data);
        return this.validateDto(SendMessageDto, parsed);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Invalid JSON in data field.');
      }
    }

    return this.validateDto(SendMessageDto, body);
  }

  @UserGuard()
  @Get()
  @ApiOperation({
    summary: 'Get all messages for logged-in user',
    description:
      'Returns paginated conversation summaries for the logged-in user. Direct and task conversations remain separated by task context.',
  })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getMessagesList(
    @Req() req: Request & { user: JwtPayload },
    @Query('taskId') taskId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    await this.ensureMessagingEnabled();

    return this.messagingService.getMessagesList(req.user.id, {
      taskId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @UserGuard()
  @Get('/chat/:recipientId')
  @ApiOperation({
    summary: 'Get 1v1 or task chat with one recipient',
  })
  @ApiParam({
    name: 'recipientId',
    required: true,
    description:
      'Preferred recipient user id. Legacy receiver email also works temporarily.',
    type: String,
  })
  @ApiQuery({
    name: 'taskId',
    required: false,
    description: 'Optional task id to fetch task-context chat.',
    type: String,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Optional cursor message id for older history pagination.',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Optional page size. Default 30, max 100.',
    type: Number,
  })
  async getOneToOneMessages(
    @Req() req: Request & { user: JwtPayload },
    @Param('recipientId') recipientId: string,
    @Query('taskId') taskId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    await this.ensureMessagingEnabled();

    return this.messagingService.getOneToOneMessages(
      req.user.id,
      recipientId,
      taskId,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @AdminGuard()
  @Get('/admin/chat')
  @ApiOperation({
    summary: 'Admin: get chat between two users',
    description:
      'Admin-only endpoint. Supports sender/receiver by user id or email, with optional taskId for task-context chat.',
  })
  @ApiQuery({ name: 'senderId', required: false, type: String })
  @ApiQuery({ name: 'receiverId', required: false, type: String })
  @ApiQuery({ name: 'senderEmail', required: false, type: String })
  @ApiQuery({ name: 'receiverEmail', required: false, type: String })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  async getOneToOneMessagesForAdmin(
    @Query('senderId') senderId?: string,
    @Query('receiverId') receiverId?: string,
    @Query('senderEmail') senderEmail?: string,
    @Query('receiverEmail') receiverEmail?: string,
    @Query('taskId') taskId?: string,
  ) {
    const sender = String(senderId ?? senderEmail ?? '').trim();
    const receiver = String(receiverId ?? receiverEmail ?? '').trim();

    if (!sender || !receiver) {
      throw new BadRequestException(
        'senderId/senderEmail and receiverId/receiverEmail are required',
      );
    }

    return this.messagingService.getOneToOneMessagesForAdmin(
      sender,
      receiver,
      taskId,
    );
  }

  @UserGuard()
  @Post('/send')
  @ApiOperation({
    summary: 'Send message via HTTP with optional presigned-upload attachment',
    description:
      'Uses existing messaging endpoint and supports recipientId, optional taskId, and an optional S3 object key uploaded beforehand via a presigned URL.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description:
            'Optional JSON payload string with recipientId, receiver, recipientEmail, text/content, and taskId.',
          example:
            '{"recipientId":"9cf997b3-f495-4efe-a353-d7c1563dae65","text":"Hello","taskId":"b8e9d1df-6baf-4d74-b5d0-5b2b3d70a100"}',
        },
        recipientId: {
          type: 'string',
          description: 'Preferred recipient user id.',
        },
        receiver: {
          type: 'string',
          description: 'Legacy receiver email fallback.',
        },
        recipientEmail: {
          type: 'string',
          description: 'Legacy recipient email fallback.',
        },
        text: {
          type: 'string',
        },
        content: {
          type: 'string',
        },
        taskId: {
          type: 'string',
          description: 'Optional task id for task-context chat.',
        },
        documentKey: {
          type: 'string',
          description:
            'Optional S3 object key for a previously uploaded attachment.',
        },
      },
    },
  })
  async sendMessage(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: MultipartSendBody,
  ) {
    await this.ensureMessagingEnabled();

    const parsedBody = await this.parseSendBody(body);
    const senderId = req.user.id;
    const senderEmail = req.user.email;
    const recipientIdentifier =
      parsedBody.recipientId ??
      parsedBody.receiver ??
      parsedBody.recipientEmail;

    if (!recipientIdentifier) {
      throw new BadRequestException(
        'recipientId or legacy receiver/recipientEmail is required',
      );
    }

    const recipient = await this.messagingService.resolveUserIdentifier(
      recipientIdentifier,
      'Receiver',
    );

    const normalizedText = (parsedBody.text ?? parsedBody.content ?? '').trim();

    await this.messagingService.validateSendMessageContext(
      senderId,
      recipient.id,
      parsedBody.taskId ?? null,
    );

    let documentReference: string | undefined;
    const documentKey = parsedBody.documentKey?.trim();
    if (documentKey) {
      if (!documentKey.startsWith('messaging/')) {
        throw new BadRequestException('Invalid document key');
      }

      documentReference = documentKey;
    }

    if (!normalizedText && !documentReference) {
      throw new BadRequestException('Message text or file is required');
    }

    const job = await this.messagingProducer.enqueueCreateMessage({
      senderId,
      recipientId: recipient.id,
      text: normalizedText || undefined,
      document: documentReference,
      taskId: parsedBody.taskId ?? undefined,
    });

    return sendResponse('Message queued successfully', {
      jobId: job.id,
      senderId,
      senderEmail,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      taskId: parsedBody.taskId ?? null,
    });
  }

  @UserGuard()
  @Delete('/delete/:messageId')
  @ApiOperation({
    summary: 'Soft delete one message (sender only)',
  })
  @ApiParam({
    name: 'messageId',
    required: true,
    type: String,
  })
  async deleteMessage(
    @Req() req: Request & { user: JwtPayload },
    @Param('messageId') messageId: string,
  ) {
    await this.ensureMessagingEnabled();

    return this.messagingService.deleteMessage(messageId, req.user.id);
  }

  @UserGuard()
  @Post('/messages/:messageId/report')
  @ApiOperation({
    summary: 'Report a message',
  })
  async reportMessage(
    @Req() req: Request & { user: JwtPayload },
    @Param('messageId') messageId: string,
    @Body() body: ReportMessageDto,
  ) {
    await this.ensureMessagingEnabled();

    const payload = await this.validateDto(ReportMessageDto, body);
    return this.messagingService.reportMessage(messageId, req.user.id, payload);
  }

  @AdminGuard()
  @Get('/admin/registry')
  @ApiOperation({
    summary: 'Admin message registry list',
  })
  @ApiQuery({ name: 'recordType', required: false, type: String })
  @ApiQuery({ name: 'registryStatus', required: false, type: String })
  @ApiQuery({ name: 'contextType', required: false, type: String })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  @ApiQuery({ name: 'senderId', required: false, type: String })
  @ApiQuery({ name: 'recipientId', required: false, type: String })
  @ApiQuery({ name: 'senderEmail', required: false, type: String })
  @ApiQuery({ name: 'recipientEmail', required: false, type: String })
  @ApiQuery({ name: 'hasFile', required: false, type: String })
  @ApiQuery({ name: 'reportedOnly', required: false, type: String })
  @ApiQuery({ name: 'reportCount', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAdminRegistry(
    @Query('recordType') recordType?: string,
    @Query('registryStatus') registryStatus?: string,
    @Query('contextType') contextType?: string,
    @Query('taskId') taskId?: string,
    @Query('senderId') senderId?: string,
    @Query('recipientId') recipientId?: string,
    @Query('senderEmail') senderEmail?: string,
    @Query('recipientEmail') recipientEmail?: string,
    @Query('hasFile') hasFile?: string,
    @Query('reportedOnly') reportedOnly?: string,
    @Query('reportCount') reportCount?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getAdminRegistry({
      recordType,
      registryStatus,
      contextType,
      taskId,
      senderId,
      recipientId,
      senderEmail,
      recipientEmail,
      hasFile,
      reportedOnly,
      reportCount,
      dateFrom,
      dateTo,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @AdminGuard()
  @Get('/admin/registry/:id/evidence-pdf')
  @ApiOperation({
    summary: 'Admin download one message evidence PDF',
  })
  @ApiProduces('application/pdf')
  async downloadMessageEvidencePdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.messagingService.generateMessageEvidencePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="message-evidence-${id}.pdf"`,
    );
    res.send(buffer);
  }

  @AdminGuard()
  @Patch('/admin/registry/:id/status')
  @ApiOperation({
    summary: 'Admin update message registry status',
  })
  async updateRegistryStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() body: UpdateMessageRegistryStatusDto,
  ) {
    const payload = await this.validateDto(
      UpdateMessageRegistryStatusDto,
      body,
    );
    return this.messagingService.updateRegistryStatus(id, req.user.id, payload);
  }

  @AdminGuard()
  @Get('/admin/message-reports')
  @ApiOperation({
    summary: 'Admin message reports list',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'reporterId', required: false, type: String })
  @ApiQuery({ name: 'messageId', required: false, type: String })
  @ApiQuery({ name: 'reason', required: false, type: String })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAdminMessageReports(
    @Query('status') status?: string,
    @Query('reporterId') reporterId?: string,
    @Query('messageId') messageId?: string,
    @Query('reason') reason?: string,
    @Query('taskId') taskId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getAdminMessageReports({
      status,
      reporterId,
      messageId,
      reason,
      taskId,
      dateFrom,
      dateTo,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @AdminGuard()
  @Delete('/admin/message-reports/:id')
  @ApiOperation({
    summary: 'Admin delete message report',
  })
  async deleteMessageReport(@Param('id') id: string) {
    return this.messagingService.deleteMessageReport(id);
  }

  @AdminGuard()
  @Patch('/admin/message-reports/:id/review')
  @ApiOperation({
    summary: 'Admin review message report',
  })
  async reviewMessageReport(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() body: ReviewMessageReportDto,
  ) {
    const payload = await this.validateDto(ReviewMessageReportDto, body);
    return this.messagingService.reviewMessageReport(id, req.user.id, payload);
  }
}
