import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeStatus,
  TaskFlowActorRole,
  TaskFlowEventType,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreditTaskService } from 'src/modules/credit/credit-task/credit-task.service';
import {
  CreditWalletTypeDtoEnum,
  RefundTaskCreditDto,
  RewardProviderCreditDto,
} from 'src/modules/credit/credit-task/dto/task-credit.dto';
import { TaskFlowService } from '../task-flow/task-flow.service';
import { taskFlowEventKey } from '../task-flow/task-flow-event-key.util';
import { TaskNotificationService } from 'src/modules/task-notification/task-notification.service';
import { TaskNotificationTrigger } from 'src/modules/task-notification/enums/task-notification-trigger.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationCategory, NotificationType } from '@prisma/client';
import { sendResponse } from 'src/utils/sendResponse';
import {
  DisputeCreditAdjustmentTypeDtoEnum,
  DisputeDecisionDtoEnum,
  ResolveDisputeDto,
} from './dto/resolve-dispute.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { GraduatedPenaltyService } from '../market-algoritm/graduated-penalty.service';
import { RiskEngine } from '../market-algoritm/risk.engine';
import { DomainInteractionRecorderService } from '../market-algoritm/domain-interaction-recorder.service';

const DISPUTE_OPENABLE_STATUSES: TaskStatus[] = [
  TaskStatus.SUBMITTED,
  TaskStatus.REVISION_REQUESTED,
  TaskStatus.APPROVED,
  TaskStatus.REJECTED,
];

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditTaskService: CreditTaskService,
    private readonly taskFlowService: TaskFlowService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly notificationService: NotificationService,
    private readonly graduatedPenaltyService: GraduatedPenaltyService,
    private readonly riskEngine: RiskEngine,
    private readonly domainInteractionRecorder: DomainInteractionRecorderService,
  ) {}

  /**
   * Open a dispute for a task. Only the owner of either the requester or the
   * provider website involved in the task may open it. Opening flips the task
   * to DISPUTED and notifies both parties.
   */
  async openDispute(actorId: string, taskId: string, payload: OpenDisputeDto) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        requesterId: true,
        requesterWebsiteId: true,
        assignedProviderWebsiteId: true,
        selectedProviderId: true,
        lifecycleStatus: true,
        projectTitle: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    if (
      !task.requesterWebsiteId ||
      !task.assignedProviderWebsiteId ||
      !task.selectedProviderId
    ) {
      throw new BadRequestException(
        'A dispute can only be opened for a task that has an assigned provider.',
      );
    }

    if (
      task.lifecycleStatus !== TaskStatus.DISPUTED &&
      !DISPUTE_OPENABLE_STATUSES.includes(task.lifecycleStatus)
    ) {
      throw new BadRequestException(
        `Cannot open a dispute for a task in ${task.lifecycleStatus} status.`,
      );
    }

    await this.ensureActorOwnsEitherWebsite(
      actorId,
      task.requesterWebsiteId,
      task.assignedProviderWebsiteId,
    );

    const existing = await this.prisma.dispute.findFirst({
      where: {
        taskId,
        status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      throw new BadRequestException(
        `An active dispute (${existing.status}) already exists for this task.`,
      );
    }

    const now = new Date();

    const dispute = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          taskId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId!,
          openedById: actorId,
          status: DisputeStatus.OPEN,
          reason: payload.reason,
          evidence: (payload.evidence ?? null) as any,
          openedAt: now,
        },
      });

      await tx.placementTask.update({
        where: { id: taskId },
        data: { lifecycleStatus: TaskStatus.DISPUTED },
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId: task.selectedProviderId,
          actorId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.TASK_DISPUTED,
          actorRole: TaskFlowActorRole.REQUESTER,
          fromStatus: task.lifecycleStatus,
          toStatus: TaskStatus.DISPUTED,
          note: payload.reason,
          eventKey: taskFlowEventKey.disputed(taskId),
        },
        tx,
      );

      return created;
    });

    const notifyTask = {
      id: taskId,
      requesterId: task.requesterId,
      selectedProviderId: task.selectedProviderId,
      requesterWebsiteId: task.requesterWebsiteId,
      assignedProviderWebsiteId: task.assignedProviderWebsiteId,
      projectTitle: task.projectTitle,
    };

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_DISPUTED,
      task: notifyTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId,
      extraData: { disputeId: dispute.id, reason: payload.reason },
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_DISPUTED,
      task: notifyTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId,
      extraData: { disputeId: dispute.id, reason: payload.reason },
    });

    // Notify admins that a dispute requires review (orphaned trigger
    // ADMIN_DISPUTE_OPENED is now actually emitted).
    try {
      await this.notificationService.sendAdminNotification({
        type: NotificationType.ADMIN_DISPUTE_OPENED,
        category: NotificationCategory.DISPUTE_REVIEW,
        title: 'New dispute opened',
        body: `A dispute was opened for task "${task.projectTitle}".`,
        entityType: 'TASK',
        entityId: taskId,
        actorId,
        data: { disputeId: dispute.id, taskId, reason: payload.reason },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send admin dispute-opened notification for dispute ${dispute.id}: ${err?.message ?? err}`,
      );
    }

    return sendResponse('Dispute opened successfully.', dispute);
  }

  /**
   * Resolve a dispute as an admin. Applies an optional credit adjustment
   * (refund requester or reward provider) and persists the resulting
   * CreditLog id via creditAdjustmentId.
   */
  async resolveDispute(
    adminId: string,
    disputeId: string,
    payload: ResolveDisputeDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found.');
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.REJECTED
    ) {
      throw new BadRequestException('This dispute has already been resolved.');
    }

    const decision =
      payload.decision ?? DisputeDecisionDtoEnum.RESOLVE_IN_FAVOR_OF_REQUESTER;

    const { status, taskStatus } = this.mapDecisionToStatuses(decision);

    const creditAdjustment = payload.creditAdjustment;
    let creditAdjustmentId: string | null = null;

    if (
      creditAdjustment &&
      creditAdjustment.type &&
      creditAdjustment.type !== DisputeCreditAdjustmentTypeDtoEnum.NONE
    ) {
      creditAdjustmentId = await this.applyCreditAdjustment(
        adminId,
        dispute,
        creditAdjustment,
      );
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.placementTask.update({
        where: { id: dispute.taskId },
        data: { lifecycleStatus: taskStatus },
      });

      if (taskStatus === TaskStatus.COMPLETED) {
        const providerSite = await tx.website.findUnique({
          where: { id: dispute.providerWebsiteId },
          select: { rootDomain: true },
        });
        const requesterSite = await tx.website.findUnique({
          where: { id: dispute.requesterWebsiteId },
          select: { rootDomain: true },
        });
        await this.domainInteractionRecorder.validateAndRecord(
          tx,
          {
            taskId: dispute.taskId,
            requesterWebsiteId: dispute.requesterWebsiteId,
            providerWebsiteId: dispute.providerWebsiteId,
            completedAt: now,
          },
          {
            stage: 'COMPLETE',
            actorUserId: adminId,
            providerDomain: providerSite?.rootDomain ?? undefined,
            requesterDomain: requesterSite?.rootDomain ?? undefined,
          },
        );
      }

      return tx.dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolvedById: adminId,
          resolvedAt: now,
          creditAdjustmentId,
        },
      });
    });

    // Apply graduated penalty to provider when dispute resolved in their disfavor.
    if (decision === DisputeDecisionDtoEnum.RESOLVE_IN_FAVOR_OF_REQUESTER) {
      try {
        const providerWebsite = await this.prisma.website.findUnique({
          where: { id: dispute.providerWebsiteId },
          select: { authorId: true },
        });

        if (providerWebsite) {
          const penalty = await this.graduatedPenaltyService.computePenalty(
            providerWebsite.authorId,
            'DISPUTE',
          );

          const profile = await this.prisma.websiteMatchingProfile.findUnique({
            where: { websiteId: dispute.providerWebsiteId },
            select: {
              riskScore: true,
              boostFactor: true,
              lastRiskEventAt: true,
            },
          });

          if (profile) {
            // Boost / suppression decisions still come from GraduatedPenaltyService
            // (it owns the boost math), but the RISK effect is routed through
            // RiskEngine so the RiskEvent ledger + decay stay consistent with
            // every other risk mutation in the system.
            const newBoost = Math.max(
              1.0,
              profile.boostFactor * penalty.boostMultiplier,
            );
            const shouldSuppress =
              newBoost > penalty.suppressionThreshold ||
              profile.riskScore >= 70;

            // Single source of truth for riskScore + RiskEvent row.
            await this.riskEngine.processRiskEvent(
              dispute.providerWebsiteId,
              'DISPUTE',
              profile,
            );

            await this.prisma.websiteMatchingProfile.update({
              where: { websiteId: dispute.providerWebsiteId },
              data: {
                boostFactor: newBoost,
                isSuppressed: shouldSuppress ? true : undefined,
                suppressedUntil: shouldSuppress
                  ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                  : undefined,
              },
            });

            this.logger.log(
              `Graduated penalty applied to provider ${providerWebsite.authorId} for dispute ${disputeId}: ${penalty.message}`,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to apply graduated penalty for dispute ${disputeId}: ${(err as Error).message}`,
        );
      }
    }

    return sendResponse('Dispute resolved successfully.', updated);
  }

  /**
   * List disputes. Admins see all; other authenticated users see only disputes
   * tied to websites they own.
   */
  async listDisputes(
    actorId: string,
    actorRole: UserRole,
    query: {
      status?: DisputeStatus;
      taskId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.taskId) where.taskId = query.taskId;

    if (actorRole !== UserRole.ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
      const ownedWebsites = await this.prisma.website.findMany({
        where: { authorId: actorId, isDeleted: false },
        select: { id: true },
      });
      const ownedIds = ownedWebsites.map((w) => w.id);
      where.OR = [
        { requesterWebsiteId: { in: ownedIds } },
        { providerWebsiteId: { in: ownedIds } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.dispute.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return sendResponse('Disputes retrieved successfully.', {
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  private async applyCreditAdjustment(
    adminId: string,
    dispute: {
      taskId: string;
      requesterWebsiteId: string;
      providerWebsiteId: string;
    },
    adjustment: {
      type: DisputeCreditAdjustmentTypeDtoEnum;
      amount?: number;
      walletType?: CreditWalletTypeDtoEnum;
      note?: string;
    },
  ): Promise<string> {
    if (!adjustment.amount || adjustment.amount < 1) {
      throw new BadRequestException(
        'creditAdjustment.amount is required and must be >= 1.',
      );
    }
    if (!adjustment.walletType) {
      throw new BadRequestException(
        'creditAdjustment.walletType is required for credit adjustments.',
      );
    }

    let creditLogId = '';

    if (
      adjustment.type === DisputeCreditAdjustmentTypeDtoEnum.REFUND_REQUESTER
    ) {
      const dto: RefundTaskCreditDto = {
        taskId: dispute.taskId,
        requesterWebsiteId: dispute.requesterWebsiteId,
        creditAmount: adjustment.amount,
        walletType: adjustment.walletType,
        note: adjustment.note ?? 'Dispute resolution: refund requester',
      };
      const result = await this.creditTaskService.refundTaskCredit(
        adminId,
        dto,
      );
      const maybeId =
        (result as any).creditLogId ?? (result as any).creditLog?.id;
      if (maybeId) {
        creditLogId = maybeId;
      } else {
        const log = await this.prisma.creditLog.findFirst({
          where: {
            taskId: dispute.taskId,
            websiteId: dispute.requesterWebsiteId,
            action: 'REFUND',
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        creditLogId = log?.id ?? '';
      }
    } else {
      const dto: RewardProviderCreditDto = {
        taskId: dispute.taskId,
        providerWebsiteId: dispute.providerWebsiteId,
        creditAmount: adjustment.amount,
        note: adjustment.note ?? 'Dispute resolution: reward provider',
      };
      await this.creditTaskService.rewardProviderCredit(adminId, dto);
      const log = await this.prisma.creditLog.findFirst({
        where: {
          taskId: dispute.taskId,
          websiteId: dispute.providerWebsiteId,
          creditType: 'EARNED_TASK',
          action: 'REWARD',
          reason: 'TASK_COMPLETION',
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      creditLogId = log?.id ?? '';
    }

    if (!creditLogId) {
      this.logger.warn(
        `Credit adjustment applied for dispute ${dispute.taskId} but no CreditLog id was captured.`,
      );
    }

    return creditLogId;
  }

  private mapDecisionToStatuses(decision: DisputeDecisionDtoEnum): {
    status: DisputeStatus;
    taskStatus: TaskStatus;
  } {
    switch (decision) {
      case DisputeDecisionDtoEnum.RESOLVE_IN_FAVOR_OF_REQUESTER:
        return {
          status: DisputeStatus.RESOLVED,
          taskStatus: TaskStatus.REVISION_REQUESTED,
        };
      case DisputeDecisionDtoEnum.RESOLVE_IN_FAVOR_OF_PROVIDER:
        return {
          status: DisputeStatus.RESOLVED,
          taskStatus: TaskStatus.COMPLETED,
        };
      case DisputeDecisionDtoEnum.REJECT:
        return {
          status: DisputeStatus.REJECTED,
          taskStatus: TaskStatus.DISPUTED,
        };
      case DisputeDecisionDtoEnum.MARK_UNDER_REVIEW:
      default:
        return {
          status: DisputeStatus.UNDER_REVIEW,
          taskStatus: TaskStatus.DISPUTED,
        };
    }
  }

  private async ensureActorOwnsEitherWebsite(
    actorId: string,
    requesterWebsiteId: string,
    providerWebsiteId: string,
  ) {
    const websites = await this.prisma.website.findMany({
      where: {
        id: { in: [requesterWebsiteId, providerWebsiteId] },
        isDeleted: false,
      },
      select: { id: true, authorId: true },
    });
    const ownsRequester = websites.some(
      (w) => w.id === requesterWebsiteId && w.authorId === actorId,
    );
    const ownsProvider = websites.some(
      (w) => w.id === providerWebsiteId && w.authorId === actorId,
    );
    if (!ownsRequester && !ownsProvider) {
      throw new ForbiddenException(
        'You are not authorized to open a dispute for this task.',
      );
    }
  }
}
