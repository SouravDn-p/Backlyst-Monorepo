/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DirectTaskRequestStatus,
  NotificationCategory,
  NotificationType,
  TaskFlowActorRole,
  TaskFlowEventType,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateDirectTaskRequestDto } from './dto/create-direct-task-request.dto';
import { AcceptDirectTaskRequestDto } from './dto/accept-direct-task-request.dto';
import { RejectDirectTaskRequestDto } from './dto/reject-direct-task-request.dto';
import { CancelDirectTaskRequestDto } from './dto/cancel-direct-task-request.dto';
import { GetDirectTaskRequestsQueryDto } from './dto/get-direct-task-requests-query.dto';
import { CreditTaskService } from 'src/modules/credit/credit-task/credit-task.service';
import { ValidationEngine } from '../market-algoritm/validation.engine';
import { TaskFlowService } from '../task-flow/task-flow.service';
import { taskFlowEventKey } from '../task-flow/task-flow-event-key.util';
import { NotificationService } from 'src/modules/notification/notification.service';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { getPagination } from 'src/common/utils/pagination';
import {
  PlacementTypeDtoEnum,
  REQUESTED_DEADLINE_DAYS_ENUM,
} from '../task-requester/dto/create-task.dto';

@Injectable()
export class DirectTaskRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditTaskService: CreditTaskService,
    private readonly validationEngine: ValidationEngine,
    private readonly taskFlowService: TaskFlowService,
    private readonly notificationService: NotificationService,
    private readonly s3: AwsS3Service,
  ) { }

  private getCreditCost(placementType: PlacementTypeDtoEnum): number {
    if (placementType === PlacementTypeDtoEnum.BACKLINK_INSERTION) return 1;
    if (placementType === PlacementTypeDtoEnum.GUEST_POST) return 2;
    if (placementType === PlacementTypeDtoEnum.FLEXIBLE) return 2;
    return 1;
  }

  private ensureRequestedDeadlineDays(days: number) {
    if (!REQUESTED_DEADLINE_DAYS_ENUM.includes(days as never)) {
      throw new BadRequestException(
        `requestedDeadlineDays must be one of: ${REQUESTED_DEADLINE_DAYS_ENUM.join(', ')}`,
      );
    }
  }

  async createDirectRequest(
    requesterId: string,
    payload: CreateDirectTaskRequestDto,
    supportDocuments: string[] = [],
  ) {
    this.ensureRequestedDeadlineDays(payload.requestedDeadlineDays);

    const isUserActive = await this.validationEngine.isUserActive(requesterId);
    if (!isUserActive) {
      throw new ForbiddenException('Requester account is not active.');
    }

    const targetProvider = await this.prisma.user.findUnique({
      where: { id: payload.targetProviderId },
    });
    if (!targetProvider || targetProvider.isDeleted) {
      throw new NotFoundException('Target Provider not found.');
    }

    const creditCost = this.getCreditCost(payload.placementType);
    const reservedCreditAmount =
      payload.placementType === PlacementTypeDtoEnum.FLEXIBLE ? 2 : creditCost;

    const directRequest = await this.prisma.$transaction(async (tx) => {
      const createdRequest = await tx.directTaskRequest.create({
        data: {
          requesterId,
          requesterWebsiteId: payload.requesterWebsiteId,
          targetProviderId: payload.targetProviderId,
          projectTitle: payload.projectTitle,
          targetUrl: payload.targetUrl,
          anchorText: payload.anchorText,
          placementGuidelines: payload.placementGuidelines ?? null,
          requiredDomainRating: payload.requiredDomainRating ?? null,
          placementType: payload.placementType,
          linkAttribute: payload.linkAttribute,
          requestedDeadlineDays: payload.requestedDeadlineDays,
          creditCost,
          reservedCreditAmount,
          walletType: payload.walletType,
          supportDocuments,
          status: DirectTaskRequestStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
        },
      });

      return createdRequest;
    });

    try {
      await this.creditTaskService.deductTaskCredit(requesterId, {
        taskId: directRequest.id,
        requesterWebsiteId: payload.requesterWebsiteId,
        userId: requesterId,
        creditAmount: reservedCreditAmount,
        walletType: payload.walletType as any,
        note: `Requester reserved ${reservedCreditAmount} credit(s) for direct task request.`,
      });
    } catch (error) {
      await this.prisma.directTaskRequest.delete({
        where: { id: directRequest.id },
      });
      throw error;
    }

    await this.notificationService.sendNotification({
      recipientId: payload.targetProviderId,
      actorId: requesterId,
      type: NotificationType.DIRECT_TASK_REQUEST_RECEIVED,
      category: NotificationCategory.TASK_STATUS,
      title: 'New Direct Task Request Received',
      body: `You have received a direct task request: "${payload.projectTitle}".`,
      data: { directTaskRequestId: directRequest.id },
    });

    return sendResponse(
      'Direct task request created successfully.',
      directRequest,
    );
  }

  async getSentDirectRequests(
    requesterId: string,
    query: GetDirectTaskRequestsQueryDto,
  ) {
    const where = {
      requesterId,
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await this.prisma.directTaskRequest.count({ where });
    const { skip, take, meta } = getPagination(query.page, query.limit, total);

    const items = await this.prisma.directTaskRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        targetProvider: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        createdTask: true,
      },
    });

    return sendResponse('Sent direct task requests fetched successfully.', {
      items,
      meta,
    });
  }

  async getReceivedDirectRequests(
    providerId: string,
    query: GetDirectTaskRequestsQueryDto,
  ) {
    const where = {
      targetProviderId: providerId,
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await this.prisma.directTaskRequest.count({ where });
    const { skip, take, meta } = getPagination(query.page, query.limit, total);

    const items = await this.prisma.directTaskRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        createdTask: true,
      },
    });

    return sendResponse('Received direct task requests fetched successfully.', {
      items,
      meta,
    });
  }

  async getDirectRequestById(userId: string, requestId: string) {
    const request = await this.prisma.directTaskRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        targetProvider: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        createdTask: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Direct task request not found.');
    }

    if (request.requesterId !== userId && request.targetProviderId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to view this direct task request.',
      );
    }

    return sendResponse('Direct task request fetched successfully.', request);
  }

  async acceptDirectRequest(
    providerId: string,
    requestId: string,
    payload: AcceptDirectTaskRequestDto,
  ) {
    const request = await this.prisma.directTaskRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Direct task request not found.');
    }

    if (request.targetProviderId !== providerId) {
      throw new ForbiddenException(
        'You are not authorized to accept this direct task request.',
      );
    }

    if (request.status !== DirectTaskRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot accept direct task request with status ${request.status}.`,
      );
    }

    const providerWebsite = await this.prisma.website.findUnique({
      where: { id: payload.providerWebsiteId },
    });
    if (
      !providerWebsite ||
      providerWebsite.authorId !== providerId ||
      providerWebsite.isDeleted
    ) {
      throw new BadRequestException(
        'providerWebsiteId is invalid, deleted, or does not belong to you.',
      );
    }

    const deliveryDeadline = new Date(
      Date.now() + request.requestedDeadlineDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const createdTask = await tx.placementTask.create({
        data: {
          requesterId: request.requesterId,
          requesterWebsiteId: request.requesterWebsiteId,
          selectedProviderId: providerId,
          assignedProviderWebsiteId: payload.providerWebsiteId,
          projectTitle: request.projectTitle,
          targetUrl: request.targetUrl,
          anchorText: request.anchorText,
          placementGuidelines: request.placementGuidelines,
          requiredDomainRating: request.requiredDomainRating,
          placementType: request.placementType,
          linkAttribute: request.linkAttribute,
          requestedDeadlineDays: request.requestedDeadlineDays,
          deliveryDeadline,
          lifecycleStatus: TaskStatus.ASSIGNED,
          submissionStatus: 'NOT_SUBMITTED',
          creditCost: request.creditCost,
          reservedCreditAmount: request.reservedCreditAmount,
          walletType: request.walletType,
          supportDocuments: request.supportDocuments,
          publishedAt: new Date(),
          assignedAt: new Date(),
        } as any,
      });

      const application = await tx.placementApplication.create({
        data: {
          providerId,
          providerWebsiteId: payload.providerWebsiteId,
          placementTaskId: createdTask.id,
          status: TaskStatus.SELECTED,
        },
      });

      await tx.placementTask.update({
        where: { id: createdTask.id },
        data: { selectedApplicationId: application.id },
      });

      const updatedRequest = await tx.directTaskRequest.update({
        where: { id: requestId },
        data: {
          status: DirectTaskRequestStatus.ACCEPTED,
          createdTaskId: createdTask.id,
          respondedAt: new Date(),
        },
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: createdTask.id,
          requesterId: request.requesterId,
          providerId,
          actorId: providerId,
          requesterWebsiteId: request.requesterWebsiteId,
          providerWebsiteId: payload.providerWebsiteId,
          eventType: TaskFlowEventType.PROVIDER_SELECTED,
          actorRole: TaskFlowActorRole.PROVIDER,
          fromStatus: null,
          toStatus: TaskStatus.ASSIGNED,
          note: 'Direct task request accepted by provider.',
          metadata: {
            directTaskRequestId: requestId,
            placementType: createdTask.placementType,
          },
          eventKey: taskFlowEventKey.providerSelected(
            createdTask.id,
            providerId,
          ),
        },
        tx,
      );

      return { updatedRequest, createdTask };
    }, { timeout: 15000 });

    await this.notificationService.sendNotification({
      recipientId: request.requesterId,
      actorId: providerId,
      type: NotificationType.DIRECT_TASK_REQUEST_ACCEPTED,
      category: NotificationCategory.TASK_STATUS,
      title: 'Direct Task Request Accepted',
      body: `Provider accepted your direct task request: "${request.projectTitle}". Task is now ASSIGNED.`,
      data: {
        directTaskRequestId: requestId,
        taskId: result.createdTask.id,
      },
    });

    return sendResponse('Direct task request accepted successfully.', result);
  }

  async rejectDirectRequest(
    providerId: string,
    requestId: string,
    payload: RejectDirectTaskRequestDto,
  ) {
    const request = await this.prisma.directTaskRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Direct task request not found.');
    }

    if (request.targetProviderId !== providerId) {
      throw new ForbiddenException(
        'You are not authorized to reject this direct task request.',
      );
    }

    if (request.status !== DirectTaskRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject direct task request with status ${request.status}.`,
      );
    }

    const updatedRequest = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.directTaskRequest.update({
          where: { id: requestId },
          data: {
            status: DirectTaskRequestStatus.REJECTED,
            rejectionReason: payload.rejectionReason ?? null,
            respondedAt: new Date(),
          },
        });

        await this.creditTaskService.refundTaskCredit(request.requesterId, {
          taskId: request.id,
          requesterWebsiteId: request.requesterWebsiteId,
          userId: request.requesterId,
          creditAmount: request.reservedCreditAmount,
          walletType: request.walletType as any,
          note: `Refund for rejected direct task request.`,
        });

        return updated;
      },
      {
        timeout: 15000, // Increase transaction timeout to 15 seconds
      }
    );

    await this.notificationService.sendNotification({
      recipientId: request.requesterId,
      actorId: providerId,
      type: NotificationType.DIRECT_TASK_REQUEST_REJECTED,
      category: NotificationCategory.TASK_STATUS,
      title: 'Direct Task Request Rejected',
      body: `Provider rejected your direct task request: "${request.projectTitle}". Credits refunded.`,
      data: { directTaskRequestId: requestId },
    });

    return sendResponse(
      'Direct task request rejected successfully.',
      updatedRequest,
    );
  }

  async cancelDirectRequest(
    requesterId: string,
    requestId: string,
    payload: CancelDirectTaskRequestDto,
  ) {
    const request = await this.prisma.directTaskRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Direct task request not found.');
    }

    if (request.requesterId !== requesterId) {
      throw new ForbiddenException(
        'You are not authorized to cancel this direct task request.',
      );
    }

    if (request.status !== DirectTaskRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel direct task request with status ${request.status}.`,
      );
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.directTaskRequest.update({
        where: { id: requestId },
        data: {
          status: DirectTaskRequestStatus.CANCELLED,
          cancellationReason: payload.cancellationReason ?? null,
          cancelledAt: new Date(),
        },
      });

      await this.creditTaskService.refundTaskCredit(request.requesterId, {
        taskId: request.id,
        requesterWebsiteId: request.requesterWebsiteId,
        userId: request.requesterId,
        creditAmount: request.reservedCreditAmount,
        walletType: request.walletType as any,
        note: `Refund for cancelled direct task request.`,
      });

      return updated;
    });

    await this.notificationService.sendNotification({
      recipientId: request.targetProviderId,
      actorId: requesterId,
      type: NotificationType.DIRECT_TASK_REQUEST_CANCELLED,
      category: NotificationCategory.TASK_STATUS,
      title: 'Direct Task Request Cancelled',
      body: `Requester cancelled the direct task request: "${request.projectTitle}".`,
      data: { directTaskRequestId: requestId },
    });

    return sendResponse(
      'Direct task request cancelled successfully.',
      updatedRequest,
    );
  }
}
