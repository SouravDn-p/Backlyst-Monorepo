import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageContextType,
  MessageRecordType,
  MessageRegistryStatus,
  MessageReportReason,
  MessageReportStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CacheUtil } from 'src/cache/redis-cache.util';
import { ReportMessageDto } from './dto/report-message.dto';
import { UpdateMessageRegistryStatusDto } from './dto/update-message-registry-status.dto';
import { MessagingPubSubService } from './messaging-pubsub.service';
import { ReviewMessageReportDto } from './dto/review-message-report.dto';
import { SendMessageInput, UserIdentity } from './message.interface';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import { MessageRegistryService } from './message-registry.service';
type ViewerRole = 'USER' | 'ADMIN';

const messageInclude = {
  Sender: {
    select: {
      id: true,
      name: true,
      email: true,
      imageKey: true,
      role: true,
      isVerified: true,
    },
  },
  Receiver: {
    select: {
      id: true,
      name: true,
      email: true,
      imageKey: true,
      role: true,
      isVerified: true,
    },
  },
} as const;

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly cacheTtlSeconds = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsS3Service,
    private readonly cacheUtil: CacheUtil,
    private readonly messagingPubSubService: MessagingPubSubService,
    private readonly messageRegistryService: MessageRegistryService,
  ) {}

  private getListCacheKey(userId: string): string {
    return `messaging:list:${userId}`;
  }

  private getListQueryCacheKey(options: {
    userId: string;
    taskId?: string | null;
    page?: number;
    limit?: number;
    search?: string;
  }): string {
    const taskPart = options.taskId ? `task:${options.taskId}` : 'all';
    const searchPart = options.search?.trim()
      ? `:search:${options.search.trim().toLowerCase()}`
      : '';
    return `${this.getListCacheKey(options.userId)}:${taskPart}:page:${options.page ?? 1}:limit:${options.limit ?? 20}${searchPart}`;
  }

  public getConversationCacheKey(
    userAId: string,
    userBId: string,
    taskId?: string | null,
  ): string {
    const [first, second] = [userAId, userBId].sort();
    return taskId
      ? `messaging:chat:${first}:${second}:task:${taskId}`
      : `messaging:chat:${first}:${second}:direct`;
  }

  private getConversationHistoryCacheKey(options: {
    userAId: string;
    userBId: string;
    taskId?: string | null;
    cursor?: string | null;
    limit: number;
  }): string {
    const baseKey = this.getConversationCacheKey(
      options.userAId,
      options.userBId,
      options.taskId,
    );
    return `${baseKey}:cursor:${options.cursor ?? 'initial'}:limit:${options.limit}`;
  }

  private buildConversationWhere(
    userAId: string,
    userBId: string,
    taskId?: string | null,
  ): Prisma.MessageWhereInput {
    return {
      isDeleted: false,
      OR: [
        { senderId: userAId, recipientId: userBId },
        { senderId: userBId, recipientId: userAId },
      ],
      taskId: taskId ?? null,
    };
  }

  private clampPage(value?: number, fallback = 1): number {
    return Math.max(1, Number(value ?? fallback));
  }

  private clampLimit(value?: number, fallback = 30, max = 100): number {
    return Math.min(max, Math.max(1, Number(value ?? fallback)));
  }

  private parseEnumQuery<T extends Record<string, string>>(
    enumObject: T,
    value: string | undefined,
    label: string,
  ): T[keyof T] | undefined {
    if (!value) return undefined;

    const allowedValues = Object.values(enumObject);
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(
        `${label} must be one of: ${allowedValues.join(', ')}`,
      );
    }

    return value as T[keyof T];
  }

  private parseDateQuery(value: string | undefined, label: string) {
    if (!value) return undefined;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date`);
    }

    return date;
  }

  private parseNonNegativeIntQuery(value: string | undefined, label: string) {
    if (value === undefined) return undefined;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`${label} must be a non-negative integer`);
    }

    return parsed;
  }

  private async invalidateMessageCaches(
    senderId: string,
    recipientId: string,
    taskId?: string | null,
  ): Promise<void> {
    const listBaseKeys = [
      this.getListCacheKey(senderId),
      this.getListCacheKey(recipientId),
    ];
    const conversationBaseKey = this.getConversationCacheKey(
      senderId,
      recipientId,
      taskId,
    );

    await Promise.all([
      ...listBaseKeys.map((key) => this.cacheUtil.deleteByPattern(`${key}*`)),
      this.cacheUtil.deleteByPattern(`${conversationBaseKey}*`),
    ]);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  async resolveUserIdentifier(
    identifier: string,
    label: 'Sender' | 'Receiver' | 'Participant',
  ): Promise<UserIdentity> {
    const normalized = String(identifier ?? '').trim();
    if (!normalized) {
      throw new BadRequestException(`${label} is required`);
    }

    const where = this.isUuid(normalized)
      ? { id: normalized }
      : { email: normalized };

    const user = await this.prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        status: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException(`${label} not found`);
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(`${label} is not active`);
    }

    return user;
  }

  private normalizeText(text?: string): string | null {
    const value = text?.trim() ?? '';
    return value.length > 0 ? value : null;
  }

  private async validateTaskParticipants(
    taskId: string,
    senderId: string,
    recipientId: string,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        requesterId: true,
        selectedProviderId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.selectedProviderId) {
      throw new BadRequestException(
        'Task chat is available after provider selection',
      );
    }

    const participants = [task.requesterId, task.selectedProviderId];
    if (
      !participants.includes(senderId) ||
      !participants.includes(recipientId) ||
      senderId === recipientId
    ) {
      throw new ForbiddenException(
        'Only the requester and selected provider can use task chat.',
      );
    }

    return task;
  }

  async validateSendMessageContext(
    senderId: string,
    recipientId: string,
    taskId?: string | null,
  ) {
    const sender = await this.resolveUserIdentifier(senderId, 'Sender');
    const recipient = await this.resolveUserIdentifier(recipientId, 'Receiver');

    if (sender.id === recipient.id) {
      throw new BadRequestException('senderId cannot equal recipientId');
    }

    if (taskId) {
      await this.validateTaskParticipants(taskId, sender.id, recipient.id);
    }

    return { sender, recipient };
  }

  private sanitizeMessageForViewer<
    T extends {
      isDeleted: boolean;
      registryStatus: MessageRegistryStatus;
      text: string | null;
      document: string | null;
      id: string;
      senderId: string;
      recipientId: string;
      taskId?: string | null;
      contextType?: MessageContextType;
      createdAt: Date;
    },
  >(message: T, viewerRole: ViewerRole) {
    if (viewerRole === 'ADMIN') {
      return message;
    }

    if (message.isDeleted) {
      return {
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        taskId: message.taskId ?? null,
        contextType: message.contextType,
        registryStatus: message.registryStatus,
        deleted: true,
        deletedMessage: 'This message was deleted.',
        text: null,
        document: null,
        createdAt: message.createdAt,
      };
    }

    if (message.registryStatus === MessageRegistryStatus.RESTRICTED) {
      return {
        ...message,
        text: null,
        document: null,
        restricted: true,
        restrictedMessage: 'This message is restricted.',
      };
    }

    return message;
  }

  private async resolveMessageAttachment<
    T extends {
      document: string | null;
    },
  >(message: T) {
    const documentKey = message.document
      ? this.awsS3Service.extractFileKeyFromUrl(message.document)
      : null;
    const documentUrl = message.document
      ? await this.awsS3Service.resolveFileUrl(message.document)
      : null;

    return {
      ...message,
      document: documentUrl,
      documentKey,
      documentUrl,
    };
  }

  private async sanitizeMessagesForViewer<
    T extends {
      isDeleted: boolean;
      registryStatus: MessageRegistryStatus;
      text: string | null;
      document: string | null;
      id: string;
      senderId: string;
      recipientId: string;
      taskId?: string | null;
      contextType?: MessageContextType;
      createdAt: Date;
    },
  >(messages: T[], viewerRole: ViewerRole) {
    return Promise.all(
      messages.map(async (message) =>
        this.resolveMessageAttachment(
          this.sanitizeMessageForViewer(message, viewerRole),
        ),
      ),
    );
  }

  private async resolveConversationCursor(
    cursor: string,
    currentUserId: string,
    recipientId: string,
    taskId?: string | null,
  ) {
    const cursorMessage = await this.prisma.message.findUnique({
      where: { id: cursor },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        taskId: true,
        createdAt: true,
        isDeleted: true,
      },
    });

    if (!cursorMessage || cursorMessage.isDeleted) {
      throw new BadRequestException('Invalid cursor');
    }

    const participants = [
      cursorMessage.senderId,
      cursorMessage.recipientId,
    ].sort();
    const expectedParticipants = [currentUserId, recipientId].sort();
    const sameParticipants =
      participants[0] === expectedParticipants[0] &&
      participants[1] === expectedParticipants[1];

    if (
      !sameParticipants ||
      (cursorMessage.taskId ?? null) !== (taskId ?? null)
    ) {
      throw new BadRequestException(
        'Cursor does not belong to this conversation',
      );
    }

    return cursorMessage;
  }

  private async createMessage(params: SendMessageInput) {
    const text = this.normalizeText(params.text);
    const document = params.document ?? null;

    if (!text && !document) {
      throw new BadRequestException('Message text or file is required');
    }

    const { sender, recipient } = await this.validateSendMessageContext(
      params.senderId,
      params.recipientId,
      params.taskId,
    );

    let taskId: string | null = null;
    let contextType: MessageContextType = MessageContextType.DIRECT;

    if (params.taskId) {
      taskId = params.taskId;
      contextType = MessageContextType.TASK;
    }

    const recordType =
      document && !text ? MessageRecordType.FILE : MessageRecordType.MESSAGE;

    const message = await this.prisma.message.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        senderEmailSnapshot: sender.email,
        recipientEmailSnapshot: recipient.email,
        text,
        document,
        taskId,
        contextType,
        recordType,
        ...this.messageRegistryService.getInitialRegistryState(),
      },
      include: messageInclude,
    });

    await this.invalidateMessageCaches(sender.id, recipient.id, taskId);

    return message;
  }

  async sendMessage(input: SendMessageInput) {
    return this.createMessage(input);
  }

  async sendMessageByIds(input: SendMessageInput) {
    return this.createMessage(input);
  }

  async getMessagesList(
    currentUserId: string,
    options?: {
      taskId?: string;
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    const currentUser = await this.resolveUserIdentifier(
      currentUserId,
      'Sender',
    );
    const page = this.clampPage(options?.page, 1);
    const limit = this.clampLimit(options?.limit, 20, 100);
    const taskId = options?.taskId ?? null;
    const search = options?.search?.trim() || undefined;
    const skip = (page - 1) * limit;
    const cacheKey = this.getListQueryCacheKey({
      userId: currentUser.id,
      taskId,
      page,
      limit,
      search,
    });

    return this.cacheUtil.getWithAutoRefresh(
      cacheKey,
      async () => {
        const sql = Prisma.sql`
          WITH ranked_messages AS (
            SELECT
              m."id",
              m."createdAt",
              CASE
                WHEN m."senderId" = ${currentUser.id} THEN m."recipientId"
                ELSE m."senderId"
              END AS "otherUserId",
              ROW_NUMBER() OVER (
                PARTITION BY
                  LEAST(m."senderId", m."recipientId"),
                  GREATEST(m."senderId", m."recipientId"),
                  COALESCE(m."taskId", '__DIRECT__')
                ORDER BY m."createdAt" DESC, m."id" DESC
              ) AS "rowNum"
            FROM "Message" m
            WHERE
              m."isDeleted" = false
              AND (m."senderId" = ${currentUser.id} OR m."recipientId" = ${currentUser.id})
              AND ${taskId ? Prisma.sql`m."taskId" = ${taskId}` : Prisma.sql`m."taskId" IS NULL OR m."taskId" IS NOT NULL`}
              ${
                search
                  ? Prisma.sql`AND (
                      COALESCE(m."senderEmailSnapshot", '') ILIKE ${`%${search}%`}
                      OR COALESCE(m."recipientEmailSnapshot", '') ILIKE ${`%${search}%`}
                    )`
                  : Prisma.empty
              }
          )
          SELECT "id", "otherUserId", "createdAt"
          FROM ranked_messages
          WHERE "rowNum" = 1
          ORDER BY "createdAt" DESC, "id" DESC
          LIMIT ${limit}
          OFFSET ${skip}
        `;

        const countSql = Prisma.sql`
          WITH ranked_messages AS (
            SELECT
              ROW_NUMBER() OVER (
                PARTITION BY
                  LEAST(m."senderId", m."recipientId"),
                  GREATEST(m."senderId", m."recipientId"),
                  COALESCE(m."taskId", '__DIRECT__')
                ORDER BY m."createdAt" DESC, m."id" DESC
              ) AS "rowNum"
            FROM "Message" m
            WHERE
              m."isDeleted" = false
              AND (m."senderId" = ${currentUser.id} OR m."recipientId" = ${currentUser.id})
              AND ${taskId ? Prisma.sql`m."taskId" = ${taskId}` : Prisma.sql`m."taskId" IS NULL OR m."taskId" IS NOT NULL`}
              ${
                search
                  ? Prisma.sql`AND (
                      COALESCE(m."senderEmailSnapshot", '') ILIKE ${`%${search}%`}
                      OR COALESCE(m."recipientEmailSnapshot", '') ILIKE ${`%${search}%`}
                    )`
                  : Prisma.empty
              }
          )
          SELECT COUNT(*)::int AS "count"
          FROM ranked_messages
          WHERE "rowNum" = 1
        `;

        const [conversationRows, countRows] = await Promise.all([
          this.prisma.$queryRaw<
            Array<{ id: string; otherUserId: string; createdAt: Date }>
          >(sql),
          this.prisma.$queryRaw<Array<{ count: number }>>(countSql),
        ]);

        if (conversationRows.length === 0) {
          return sendResponse('Messages fetched successfully', {
            items: [],
            meta: {
              page,
              limit,
              totalItems: 0,
              totalPages: 0,
            },
          });
        }

        const messageIds = conversationRows.map((item) => item.id);
        const otherUserIds = [
          ...new Set(conversationRows.map((item) => item.otherUserId)),
        ];

        const [messages, otherUsers] = await Promise.all([
          this.prisma.message.findMany({
            where: { id: { in: messageIds } },
            include: {
              ...messageInclude,
              task: {
                select: {
                  id: true,
                  projectTitle: true,
                  lifecycleStatus: true,
                  submissionStatus: true,
                },
              },
            },
          }),
          this.prisma.user.findMany({
            where: { id: { in: otherUserIds } },
            select: {
              id: true,
              name: true,
              email: true,
              imageKey: true,
              role: true,
              isVerified: true,
            },
          }),
        ]);

        const messageById = new Map(
          messages.map((message) => [message.id, message]),
        );
        const userById = new Map(otherUsers.map((user) => [user.id, user]));
        const totalItems = countRows[0]?.count ?? 0;

        const items = (
          await Promise.all(
            conversationRows.map(async (row) => {
              const message = messageById.get(row.id);
              if (!message) {
                return null;
              }

              const otherUser =
                userById.get(row.otherUserId) ??
                (message.senderId === currentUser.id
                  ? message.Receiver
                  : message.Sender);
              const preview = await this.resolveMessageAttachment(
                this.sanitizeMessageForViewer(message, 'USER'),
              );

              return {
                participant: otherUser,
                task: message.task ?? null,
                lastMessage: preview,
                lastMessageAt: message.createdAt,
                unreadCount: 0,
                contextType: message.contextType,
              };
            }),
          )
        ).filter((item) => item !== null);

        return sendResponse('Messages fetched successfully', {
          items,
          meta: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
          },
        });
      },
      this.cacheTtlSeconds,
    );
  }

  async getOneToOneMessages(
    currentUserId: string,
    recipientIdentifier: string,
    taskId?: string,
    cursor?: string,
    limitInput?: number,
  ) {
    const currentUser = await this.resolveUserIdentifier(
      currentUserId,
      'Sender',
    );
    const recipient = await this.resolveUserIdentifier(
      recipientIdentifier,
      'Receiver',
    );

    if (currentUser.id === recipient.id) {
      throw new BadRequestException('recipientId cannot equal current user');
    }

    if (taskId) {
      await this.validateTaskParticipants(taskId, currentUser.id, recipient.id);
    }

    const limit = this.clampLimit(limitInput, 30, 100);
    const cacheKey = this.getConversationHistoryCacheKey({
      userAId: currentUser.id,
      userBId: recipient.id,
      taskId: taskId ?? null,
      cursor: cursor ?? null,
      limit,
    });

    return this.cacheUtil.getWithAutoRefresh(
      cacheKey,
      async () => {
        const cursorMessage = cursor
          ? await this.resolveConversationCursor(
              cursor,
              currentUser.id,
              recipient.id,
              taskId ?? null,
            )
          : null;

        const where: Prisma.MessageWhereInput = this.buildConversationWhere(
          currentUser.id,
          recipient.id,
          taskId ?? null,
        );

        if (cursorMessage) {
          where.AND = [
            {
              OR: [
                { createdAt: { lt: cursorMessage.createdAt } },
                {
                  AND: [
                    { createdAt: cursorMessage.createdAt },
                    { id: { lt: cursorMessage.id } },
                  ],
                },
              ],
            },
          ];
        }

        const messages = await this.prisma.message.findMany({
          where,
          include: messageInclude,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
        });

        const hasMore = messages.length > limit;
        const pageItems = hasMore ? messages.slice(0, limit) : messages;
        const nextCursor = hasMore
          ? (pageItems[pageItems.length - 1]?.id ?? null)
          : null;
        const orderedMessages = [...pageItems].reverse();

        return sendResponse('1v1 messages fetched successfully', {
          data: await this.sanitizeMessagesForViewer(orderedMessages, 'USER'),
          meta: {
            limit,
            nextCursor,
            hasMore,
          },
        });
      },
      this.cacheTtlSeconds,
    );
  }

  async getOneToOneMessagesForAdmin(
    senderIdentifier: string,
    receiverIdentifier: string,
    taskId?: string,
  ) {
    const sender = await this.resolveUserIdentifier(senderIdentifier, 'Sender');
    const receiver = await this.resolveUserIdentifier(
      receiverIdentifier,
      'Receiver',
    );

    const messages = await this.prisma.message.findMany({
      where: this.buildConversationWhere(
        sender.id,
        receiver.id,
        taskId ?? null,
      ),
      include: messageInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return sendResponse(
      'Admin 1v1 messages fetched successfully',
      await this.sanitizeMessagesForViewer(messages, 'ADMIN'),
    );
  }

  async deleteMessage(messageId: string, senderId: string) {
    const existingMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });

    if (!existingMessage) {
      throw new NotFoundException('Message not found');
    }

    if (existingMessage.senderId !== senderId) {
      throw new ForbiddenException('Only sender can delete this message');
    }

    if (existingMessage.document) {
      const key = this.awsS3Service.extractFileKeyFromUrl(
        existingMessage.document,
      );
      if (key) {
        try {
          await this.awsS3Service.deleteFileFromS3(key);
        } catch (error) {
          this.logger.warn(
            `Message attachment cleanup failed for message ${messageId}. The message will still be soft-deleted.`,
          );
          this.logger.warn(
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    const deletedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        text: null,
        document: null,
      },
      include: messageInclude,
    });

    await this.invalidateMessageCaches(
      deletedMessage.senderId,
      deletedMessage.recipientId,
      deletedMessage.taskId,
    );
    await this.messagingPubSubService.publishMessageDeleted(deletedMessage);

    return sendResponse('Message deleted successfully', deletedMessage);
  }

  async reportMessage(
    messageId: string,
    reporterId: string,
    payload: ReportMessageDto,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        taskId: true,
        isDeleted: true,
        registryStatus: true,
        reportCount: true,
        isManualOverride: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Deleted messages cannot be reported');
    }

    if (![message.senderId, message.recipientId].includes(reporterId)) {
      throw new ForbiddenException(
        'Only message participants can report this message.',
      );
    }

    try {
      const reportResult = await this.prisma.$transaction(async (tx) => {
        const createdReport = await tx.messageReport.create({
          data: {
            messageId,
            reporterId,
            reason: payload.reason,
            note: payload.note?.trim() || null,
          },
        });

        const updatedRegistry =
          await this.messageRegistryService.updateFromReport(
            messageId,
            createdReport.id,
            tx,
          );

        return { createdReport, updatedRegistry };
      });

      await this.messagingPubSubService.publishMessageReported(
        message,
        reportResult.createdReport,
      );

      if (
        reportResult.updatedRegistry.registryStatus !== message.registryStatus
      ) {
        await this.invalidateMessageCaches(
          message.senderId,
          message.recipientId,
          message.taskId,
        );
        await this.messagingPubSubService.publishMessageRegistryUpdated(
          reportResult.updatedRegistry,
        );
      }

      return sendResponse(
        'Message reported successfully',
        reportResult.createdReport,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('You have already reported this message.');
      }

      throw error;
    }
  }

  async getAdminRegistry(query: {
    page?: number;
    limit?: number;
    recordType?: string;
    registryStatus?: string;
    contextType?: string;
    taskId?: string;
    senderId?: string;
    recipientId?: string;
    senderEmail?: string;
    recipientEmail?: string;
    hasFile?: string;
    reportedOnly?: string;
    reportCount?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.MessageWhereInput = {};
    const recordType = this.parseEnumQuery(
      MessageRecordType,
      query.recordType,
      'recordType',
    );
    const registryStatus = this.parseEnumQuery(
      MessageRegistryStatus,
      query.registryStatus,
      'registryStatus',
    );
    const contextType = this.parseEnumQuery(
      MessageContextType,
      query.contextType,
      'contextType',
    );
    const reportCount = this.parseNonNegativeIntQuery(
      query.reportCount,
      'reportCount',
    );
    const dateFrom = this.parseDateQuery(query.dateFrom, 'dateFrom');
    const dateTo = this.parseDateQuery(query.dateTo, 'dateTo');

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be before dateTo');
    }

    if (recordType) {
      where.recordType = recordType;
    }
    if (registryStatus) {
      where.registryStatus = registryStatus;
    }
    if (contextType) {
      where.contextType = contextType;
    }
    if (query.taskId) {
      where.taskId = query.taskId;
    }
    if (query.senderId) {
      where.senderId = query.senderId;
    }
    if (query.recipientId) {
      where.recipientId = query.recipientId;
    }
    if (query.senderEmail) {
      where.senderEmailSnapshot = {
        contains: query.senderEmail,
        mode: 'insensitive',
      };
    }
    if (query.recipientEmail) {
      where.recipientEmailSnapshot = {
        contains: query.recipientEmail,
        mode: 'insensitive',
      };
    }
    if (query.hasFile === 'true') {
      where.document = { not: null };
    }
    if (query.hasFile === 'false') {
      where.document = null;
    }
    if (query.reportedOnly === 'true') {
      where.reportCount = { gt: 0 };
    }
    if (reportCount !== undefined) {
      where.reportCount = reportCount;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const [totalItems, messages] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          Sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isVerified: true,
            },
          },
          Receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isVerified: true,
            },
          },
          task: {
            select: {
              id: true,
              projectTitle: true,
              lifecycleStatus: true,
              submissionStatus: true,
            },
          },
        },
      }),
    ]);

    const latestReportIds = [
      ...new Set(
        messages
          .map((message) => message.latestReportId)
          .filter((reportId): reportId is string => Boolean(reportId)),
      ),
    ];
    const latestReports = latestReportIds.length
      ? await this.prisma.messageReport.findMany({
          where: { id: { in: latestReportIds } },
          include: {
            reporter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      : [];
    const latestReportById = new Map(
      latestReports.map((report) => [report.id, report]),
    );

    return sendResponse('Message registry fetched successfully', {
      items: messages.map((message) => ({
        ...message,
        latestReport: message.latestReportId
          ? (latestReportById.get(message.latestReportId) ?? null)
          : null,
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  }

  async getAdminMessageReports(query: {
    status?: string;
    reporterId?: string;
    messageId?: string;
    reason?: string;
    taskId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = this.clampPage(query.page, 1);
    const limit = this.clampLimit(query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MessageReportWhereInput = {};
    const status = this.parseEnumQuery(
      MessageReportStatus,
      query.status,
      'status',
    );
    const reason = this.parseEnumQuery(
      MessageReportReason,
      query.reason,
      'reason',
    );
    const dateFrom = this.parseDateQuery(query.dateFrom, 'dateFrom');
    const dateTo = this.parseDateQuery(query.dateTo, 'dateTo');

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be before dateTo');
    }

    if (status) {
      where.status = status;
    }
    if (query.reporterId) {
      where.reporterId = query.reporterId;
    }
    if (query.messageId) {
      where.messageId = query.messageId;
    }
    if (reason) {
      where.reason = reason;
    }
    if (query.taskId) {
      where.message = {
        taskId: query.taskId,
      };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const [totalItems, reports] = await Promise.all([
      this.prisma.messageReport.count({ where }),
      this.prisma.messageReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              imageKey: true,
              role: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          message: {
            select: {
              id: true,
              senderId: true,
              recipientId: true,
              taskId: true,
              contextType: true,
              recordType: true,
              registryStatus: true,
              reportCount: true,
              latestReportId: true,
              isManualOverride: true,
              createdAt: true,
              Sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              Receiver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              task: {
                select: {
                  id: true,
                  projectTitle: true,
                  lifecycleStatus: true,
                  submissionStatus: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return sendResponse('Message reports fetched successfully', {
      items: reports,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  }

  async reviewMessageReport(
    reportId: string,
    adminId: string,
    payload: ReviewMessageReportDto,
  ) {
    if (payload.status === MessageReportStatus.PENDING) {
      throw new BadRequestException(
        'status must be REVIEWED, DISMISSED, or ACTION_TAKEN',
      );
    }

    const report = await this.prisma.messageReport.findUnique({
      where: { id: reportId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('Message report not found');
    }

    const updated = await this.prisma.messageReport.update({
      where: { id: reportId },
      data: {
        status: payload.status,
        reviewNote: payload.reviewNote?.trim() || null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        message: {
          select: {
            id: true,
            taskId: true,
            senderId: true,
            recipientId: true,
            contextType: true,
            registryStatus: true,
            createdAt: true,
          },
        },
      },
    });

    return sendResponse('Message report reviewed successfully', updated);
  }

  async deleteMessageReport(reportId: string) {
    const existingReport = await this.prisma.messageReport.findUnique({
      where: { id: reportId },
      select: {
        messageId: true,
        message: {
          select: {
            id: true,
            senderId: true,
            recipientId: true,
            taskId: true,
            registryStatus: true,
          },
        },
      },
    });

    if (!existingReport) {
      throw new NotFoundException('Message report not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const report = await tx.messageReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          messageId: true,
        },
      });

      if (!report) {
        throw new NotFoundException('Message report not found');
      }

      await tx.messageReport.delete({
        where: { id: reportId },
      });

      const updatedMessage =
        await this.messageRegistryService.recomputeRegistry(
          report.messageId,
          tx,
        );

      return {
        deletedReportId: reportId,
        updatedMessage,
      };
    });

    if (
      result.updatedMessage.registryStatus !==
      existingReport.message.registryStatus
    ) {
      await this.invalidateMessageCaches(
        result.updatedMessage.senderId,
        result.updatedMessage.recipientId,
        result.updatedMessage.taskId,
      );
      await this.messagingPubSubService.publishMessageRegistryUpdated(
        result.updatedMessage,
      );
    }

    return sendResponse('Message report deleted successfully', {
      id: result.deletedReportId,
      registryStatus: result.updatedMessage.registryStatus,
      reportCount: result.updatedMessage.reportCount,
      latestReportId: result.updatedMessage.latestReportId,
    });
  }

  async generateMessageEvidencePdf(messageId: string): Promise<Buffer> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        Sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        Receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        task: {
          select: {
            id: true,
            projectTitle: true,
            lifecycleStatus: true,
            submissionStatus: true,
          },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(18).text('Backlyst Message Evidence', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor('gray')
      .text(`Generated at: ${new Date().toISOString()}`, { align: 'center' });
    doc.fillColor('black').moveDown(1.5);

    doc.fontSize(13).text('Message Registry', { underline: true });
    doc.moveDown(0.4);
    this.writePdfLine(doc, 'Message ID', message.id);
    this.writePdfLine(doc, 'Context Type', message.contextType);
    this.writePdfLine(doc, 'Record Type', message.recordType);
    this.writePdfLine(doc, 'Registry Status', message.registryStatus);
    this.writePdfLine(doc, 'Registry Reason', message.registryReason ?? 'N/A');
    this.writePdfLine(doc, 'Report Count', String(message.reportCount ?? 0));
    this.writePdfLine(doc, 'Latest Report ID', message.latestReportId ?? 'N/A');
    this.writePdfLine(
      doc,
      'Manual Override',
      message.isManualOverride ? 'Yes' : 'No',
    );
    this.writePdfLine(
      doc,
      'Registry Updated At',
      message.registryUpdatedAt?.toISOString() ?? 'N/A',
    );
    this.writePdfLine(doc, 'Created At', message.createdAt.toISOString());
    this.writePdfLine(doc, 'Deleted', message.isDeleted ? 'Yes' : 'No');
    this.writePdfLine(
      doc,
      'Deleted At',
      message.deletedAt?.toISOString() ?? 'N/A',
    );

    doc.moveDown();
    doc.fontSize(13).text('Linked Task', { underline: true });
    doc.moveDown(0.4);
    this.writePdfLine(
      doc,
      'Task ID',
      message.task?.id ?? message.taskId ?? 'N/A',
    );
    this.writePdfLine(
      doc,
      'Project Title',
      message.task?.projectTitle ?? 'N/A',
    );
    this.writePdfLine(
      doc,
      'Task Lifecycle Status',
      message.task?.lifecycleStatus ?? 'N/A',
    );
    this.writePdfLine(
      doc,
      'Task Submission Status',
      message.task?.submissionStatus ?? 'N/A',
    );

    doc.moveDown();
    doc.fontSize(13).text('Participants', { underline: true });
    doc.moveDown(0.4);
    this.writePdfLine(
      doc,
      'Sender',
      `${message.Sender.name ?? 'Unnamed'} <${message.Sender.email}> (${message.senderId})`,
    );
    this.writePdfLine(
      doc,
      'Recipient',
      `${message.Receiver.name ?? 'Unnamed'} <${message.Receiver.email}> (${message.recipientId})`,
    );
    this.writePdfLine(
      doc,
      'Sender Email Snapshot',
      message.senderEmailSnapshot ?? 'N/A',
    );
    this.writePdfLine(
      doc,
      'Recipient Email Snapshot',
      message.recipientEmailSnapshot ?? 'N/A',
    );

    doc.moveDown();
    doc
      .fontSize(13)
      .text('Evidence Transcript / Metadata', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).text(message.text ?? '[No text content]', {
      width: 500,
      indent: 12,
    });
    doc.moveDown(0.4);
    this.writePdfLine(doc, 'Attachment URL', message.document ?? 'N/A');

    doc.moveDown();
    doc.fontSize(13).text('Message Reports', { underline: true });
    doc.moveDown(0.4);
    if (message.reports.length === 0) {
      doc.fontSize(10).text('No reports found for this message.');
    } else {
      message.reports.forEach((report, index) => {
        doc.fontSize(11).text(`Report ${index + 1}`, { underline: true });
        this.writePdfLine(doc, 'Report ID', report.id);
        this.writePdfLine(doc, 'Reason', report.reason);
        this.writePdfLine(doc, 'Status', report.status);
        this.writePdfLine(doc, 'Note', report.note ?? 'N/A');
        this.writePdfLine(
          doc,
          'Reporter',
          `${report.reporter.name ?? 'Unnamed'} <${report.reporter.email}> (${report.reporterId})`,
        );
        this.writePdfLine(doc, 'Created At', report.createdAt.toISOString());
        this.writePdfLine(
          doc,
          'Reviewed By',
          report.reviewedBy
            ? `${report.reviewedBy.name ?? 'Unnamed'} <${report.reviewedBy.email}>`
            : 'N/A',
        );
        this.writePdfLine(
          doc,
          'Reviewed At',
          report.reviewedAt?.toISOString() ?? 'N/A',
        );
        this.writePdfLine(doc, 'Review Note', report.reviewNote ?? 'N/A');
        doc.moveDown(0.7);
      });
    }

    doc.moveDown();
    doc
      .fontSize(8)
      .fillColor('gray')
      .text(
        'Generated by Backlyst admin message registry. Evidence packet is read-only.',
      );
    doc.end();

    return done;
  }

  private writePdfLine(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(10).fillColor('gray').text(`${label}: `, { continued: true });
    doc.fillColor('black').text(value || 'N/A');
  }

  async updateRegistryStatus(
    messageId: string,
    adminId: string,
    payload: UpdateMessageRegistryStatusDto,
  ) {
    const updated = await this.messageRegistryService.updateStatusManually(
      messageId,
      payload.registryStatus,
      adminId,
      payload.reason,
    );

    await this.invalidateMessageCaches(
      updated.senderId,
      updated.recipientId,
      updated.taskId,
    );
    await this.messagingPubSubService.publishMessageRegistryUpdated(updated);

    return sendResponse(
      'Message registry status updated successfully',
      updated,
    );
  }
}
