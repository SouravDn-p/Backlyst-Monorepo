import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  TaskFlowActorRole,
  TaskFlowEventType,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { AdminUpdateTaskStatusDto } from './dto/admin-update-task-status.dto';
import { ForceCompleteTaskDto } from './dto/force-complete-task.dto';
import { FreezeTaskDto } from './dto/freeze-task.dto';
import {
  AddCreditAdjustmentDto,
  CreditAdjustmentTypeDtoEnum,
} from './dto/add-credit-adjustment.dto';
import { getPagination } from 'src/common/utils/pagination';
import {
  AdminDisputeResolutionDtoEnum,
  AdminTaskActionDto,
  AdminTaskActionDtoEnum,
} from './dto/admin-task-action.dto';
import { CreditTaskService } from 'src/modules/credit/credit-task/credit-task.service';
import { WeeklyContributionService } from 'src/modules/credit/referrer/weekly-contribution.service';
import { TaskFlowService } from '../task-flow/task-flow.service';
import { taskFlowEventKey } from '../task-flow/task-flow-event-key.util';
import { TaskNotificationService } from 'src/modules/task-notification/task-notification.service';
import { TaskNotificationTrigger } from 'src/modules/task-notification/enums/task-notification-trigger.enum';
import { DisputeService } from '../dispute/dispute.service';
import { DisputeDecisionDtoEnum } from '../dispute/dto/resolve-dispute.dto';
import { ValidationEngine } from '../market-algoritm/validation.engine';
import { ScoringService } from '../market-algoritm/scoring.service';
import { DomainInteractionRecorderService } from '../market-algoritm/domain-interaction-recorder.service';
import { RewardOutboxService } from 'src/modules/rewards/services/reward-outbox.service';
import {
  AdminTaskDashboardRangeDtoEnum,
  GetAdminTaskDashboardQueryDto,
} from './dto/get-admin-task-dashboard-query.dto';

@Injectable()
export class AdminTaskService {
  private readonly logger = new Logger(AdminTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditTaskService: CreditTaskService,
    private readonly weeklyContributionService: WeeklyContributionService,
    private readonly taskFlowService: TaskFlowService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly disputeService: DisputeService,
    private readonly validationEngine: ValidationEngine,
    private readonly scoringService: ScoringService,
    private readonly domainInteractionRecorder: DomainInteractionRecorderService,
    private readonly rewardOutboxService: RewardOutboxService,
  ) {}

  private readonly allowedTransitions: Record<string, string[]> = {
    DRAFT: ['OPEN', 'CANCELLED', 'FROZEN'],
    OPEN: ['WAITING_FOR_APPLICANTS', 'CANCELLED', 'FROZEN', 'EXPIRED'],
    WAITING_FOR_APPLICANTS: ['ASSIGNED', 'CANCELLED', 'FROZEN', 'EXPIRED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED', 'FROZEN'],
    IN_PROGRESS: ['SUBMITTED', 'CANCELLED', 'FROZEN'],
    SUBMITTED: ['APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'FROZEN'],
    REVISION_REQUESTED: ['SUBMITTED', 'CANCELLED', 'FROZEN'],
    APPROVED: ['COMPLETED', 'FROZEN'],
    REJECTED: ['FROZEN'],
    COMPLETED: ['FROZEN'],
    CANCELLED: ['FROZEN'],
    EXPIRED: ['FROZEN'],
    DISPUTED: ['FROZEN', 'REVISION_REQUESTED', 'COMPLETED'],
    FROZEN: ['OPEN', 'WAITING_FOR_APPLICANTS', 'ASSIGNED', 'IN_PROGRESS'],
  };

  private resolveVerifiedPlacementFinalTaskType(task: {
    placementType: string;
    finalTaskType?: string | null;
  }) {
    if (
      task.finalTaskType === 'BACKLINK' ||
      task.finalTaskType === 'GUEST_POST'
    ) {
      return task.finalTaskType;
    }

    if (task.placementType === 'BACKLINK_INSERTION') {
      return 'BACKLINK' as const;
    }

    if (task.placementType === 'GUEST_POST') {
      return 'GUEST_POST' as const;
    }

    return null;
  }

  ///-------ADDED BY IMRAN -------//
  private makePairKey(a: string, b: string) {
    return this.validationEngine.buildPairKey(a, b);
  }

  private buildAdminTaskStatus(task: {
    lifecycleStatus: string;
    submissionStatus: string;
  }) {
    if (task.lifecycleStatus === 'DISPUTED') {
      return {
        code: 'DISPUTED',
        label: 'DISPUTED',
        sublabel: 'DISPUTE FLAGGED',
        tone: 'danger',
      };
    }

    if (task.lifecycleStatus === 'COMPLETED') {
      return {
        code: 'COMPLETED',
        label: 'COMPLETED',
        sublabel: null,
        tone: 'success',
      };
    }

    if (
      ['ASSIGNED', 'IN_PROGRESS'].includes(task.lifecycleStatus) ||
      task.submissionStatus === 'SUBMITTED'
    ) {
      return {
        code: task.lifecycleStatus,
        label: 'ACCEPTED / IN PROGRESS',
        sublabel: null,
        tone: 'info',
      };
    }

    if (task.lifecycleStatus === 'OPEN') {
      return {
        code: 'OPEN',
        label: 'PENDING',
        sublabel: null,
        tone: 'muted',
      };
    }

    if (task.lifecycleStatus === 'FROZEN') {
      return {
        code: 'FROZEN',
        label: 'FROZEN',
        sublabel: null,
        tone: 'warning',
      };
    }

    return {
      code: task.lifecycleStatus,
      label: task.lifecycleStatus.replace(/_/g, ' '),
      sublabel: null,
      tone: 'default',
    };
  }

  private resolveDashboardDateRange(query: GetAdminTaskDashboardQueryDto) {
    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : null;
      const to = query.to ? new Date(query.to) : null;

      if (from && Number.isNaN(from.getTime())) {
        throw new BadRequestException('Invalid from date.');
      }

      if (to && Number.isNaN(to.getTime())) {
        throw new BadRequestException('Invalid to date.');
      }

      if (from && to && from > to) {
        throw new BadRequestException('from must be before to.');
      }

      return {
        from,
        to,
        range: 'CUSTOM',
      } as const;
    }

    const range = query.range ?? AdminTaskDashboardRangeDtoEnum.DAILY;
    const now = new Date();
    const from = new Date(now);

    if (range === AdminTaskDashboardRangeDtoEnum.DAILY) {
      from.setHours(0, 0, 0, 0);
    } else if (range === AdminTaskDashboardRangeDtoEnum.WEEKLY) {
      from.setDate(now.getDate() - 7);
    } else {
      from.setDate(now.getDate() - 30);
    }

    return {
      from,
      to: now,
      range,
    } as const;
  }

  async getTaskOversightDashboard(query: GetAdminTaskDashboardQueryDto) {
    const { from, to, range } = this.resolveDashboardDateRange(query);

    const taskCreatedAtWhere = {
      createdAt: {
        gte: from ?? undefined,
        lte: to ?? undefined,
      },
    };

    const [totalTasks, participantRows, disputedTasks] = await Promise.all([
      this.prisma.placementTask.count({
        where: taskCreatedAtWhere,
      }),
      this.prisma.placementTask.findMany({
        where: taskCreatedAtWhere,
        select: {
          requesterId: true,
          selectedProviderId: true,
        },
      }),
      this.prisma.taskFlow.count({
        where: {
          eventType: TaskFlowEventType.TASK_DISPUTED,
          createdAt: {
            gte: from ?? undefined,
            lte: to ?? undefined,
          },
        },
      }),
    ]);

    const participantIds = new Set<string>();
    for (const row of participantRows) {
      participantIds.add(row.requesterId);
      if (row.selectedProviderId) {
        participantIds.add(row.selectedProviderId);
      }
    }

    return sendResponse(
      'Admin task oversight dashboard fetched successfully.',
      {
        range,
        from,
        to,
        overview: {
          totalTasks,
          totalUsersInvolved: participantIds.size,
          disputedTasks,
        },
      },
    );
  }

  async getTaskLifecycleDashboard(query: GetAdminTaskDashboardQueryDto) {
    const { from, to, range } = this.resolveDashboardDateRange(query);

    const flowCounts = await this.prisma.taskFlow.groupBy({
      by: ['eventType'],
      where: {
        eventType: {
          in: [
            TaskFlowEventType.TASK_CREATED,
            TaskFlowEventType.PROVIDER_SELECTED,
            TaskFlowEventType.TASK_COMPLETED,
            TaskFlowEventType.TASK_DISPUTED,
          ],
        },
        createdAt: {
          gte: from ?? undefined,
          lte: to ?? undefined,
        },
      },
      _count: {
        _all: true,
      },
    });

    return sendResponse(
      'Admin task lifecycle dashboard fetched successfully.',
      {
        range,
        from,
        to,
        lifecycle: this.buildLifecycleSummary(flowCounts),
      },
    );
  }

  private buildLifecycleSummary(
    flowCounts: Array<{
      eventType: TaskFlowEventType | null;
      _count: { _all: number };
    }>,
  ) {
    const lifecycle = {
      created: 0,
      accepted: 0,
      completed: 0,
      disputed: 0,
    };

    for (const item of flowCounts) {
      if (item.eventType === TaskFlowEventType.TASK_CREATED) {
        lifecycle.created = item._count._all;
      } else if (item.eventType === TaskFlowEventType.PROVIDER_SELECTED) {
        lifecycle.accepted = item._count._all;
      } else if (item.eventType === TaskFlowEventType.TASK_COMPLETED) {
        lifecycle.completed = item._count._all;
      } else if (item.eventType === TaskFlowEventType.TASK_DISPUTED) {
        lifecycle.disputed = item._count._all;
      }
    }

    return lifecycle;
  }

  private buildBacklinkTrustRatio(
    trustRows: Array<{
      linkAttribute: string;
      _count: { _all: number };
    }>,
  ) {
    const followCount =
      trustRows.find((item) => item.linkAttribute === 'DOFOLLOW')?._count
        ._all ?? 0;
    const noFollowCount = trustRows
      .filter((item) =>
        ['NOFOLLOW', 'UGC', 'SPONSORED'].includes(item.linkAttribute),
      )
      .reduce((sum, item) => sum + item._count._all, 0);
    const totalRated = followCount + noFollowCount;

    return {
      followCount,
      noFollowCount,
      followRatio:
        totalRated > 0
          ? Number(((followCount / totalRated) * 100).toFixed(2))
          : 0,
      noFollowRatio:
        totalRated > 0
          ? Number(((noFollowCount / totalRated) * 100).toFixed(2))
          : 0,
    };
  }

  async getTaskLifecyclePanel(query: GetAdminTaskDashboardQueryDto) {
    const { from, to, range } = this.resolveDashboardDateRange(query);

    const [flowCounts, trustRows] = await Promise.all([
      this.prisma.taskFlow.groupBy({
        by: ['eventType'],
        where: {
          eventType: {
            in: [
              TaskFlowEventType.TASK_CREATED,
              TaskFlowEventType.PROVIDER_SELECTED,
              TaskFlowEventType.TASK_COMPLETED,
              TaskFlowEventType.TASK_DISPUTED,
            ],
          },
          createdAt: {
            gte: from ?? undefined,
            lte: to ?? undefined,
          },
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.placementTask.groupBy({
        by: ['linkAttribute'],
        where: {
          lifecycleStatus: 'COMPLETED',
          submissionStatus: 'APPROVED',
          completedAt: {
            gte: from ?? undefined,
            lte: to ?? undefined,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    return sendResponse('Admin task lifecycle panel fetched successfully.', {
      range,
      from,
      to,
      lifecycle: this.buildLifecycleSummary(flowCounts),
      backlinkTrustRatio: this.buildBacklinkTrustRatio(trustRows),
    });
  }

  async getAllTasksForAdmin(filters: {
    status?: string;
    search?: string;
    placementType?: string;
    linkAttribute?: string;
    deadlineStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.status) where.lifecycleStatus = filters.status;
    if (filters.placementType) where.placementType = filters.placementType;
    if (filters.linkAttribute) where.linkAttribute = filters.linkAttribute;

    if (filters.deadlineStatus === 'LATE') {
      where.isLate = true;
    } else if (filters.deadlineStatus === 'ONTIME') {
      where.isLate = false;
    }

    if (filters.search) {
      where.OR = [
        { projectTitle: { contains: filters.search } },
        { targetUrl: { contains: filters.search } },
        { anchorText: { contains: filters.search } },
        { requester: { name: { contains: filters.search } } },
        { requester: { email: { contains: filters.search } } },
      ];
    }

    const totalItems = await this.prisma.placementTask.count({ where });
    const { skip, take, meta } = getPagination(
      filters.page,
      filters.limit,
      totalItems,
    );

    const tasks = await this.prisma.placementTask.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        requesterWebsiteId: true,
        assignedProviderWebsiteId: true,
        targetUrl: true,
        placementType: true,
        linkAttribute: true,
        creditCost: true,
        finalCreditCost: true,
        reservedCreditAmount: true,
        lifecycleStatus: true,
        submissionStatus: true,
        createdAt: true,
        selectedProviderId: true,
      },
    });

    const websiteIds = Array.from(
      new Set(
        tasks.flatMap((task) =>
          [task.requesterWebsiteId, task.assignedProviderWebsiteId].filter(
            Boolean,
          ),
        ),
      ),
    ) as string[];

    const websites = websiteIds.length
      ? await this.prisma.website.findMany({
          where: { id: { in: websiteIds } },
          select: {
            id: true,
            name: true,
            websiteUrl: true,
            verificationStatus: true,
          },
        })
      : [];

    const websiteMap = new Map(
      websites.map((website) => [website.id, website]),
    );

    const items = tasks.map((task) => {
      const sourceWebsite = websiteMap.get(task.requesterWebsiteId);
      const targetWebsite = task.assignedProviderWebsiteId
        ? websiteMap.get(task.assignedProviderWebsiteId)
        : null;
      const targetDomain = (() => {
        try {
          return new URL(task.targetUrl).hostname;
        } catch {
          return task.targetUrl;
        }
      })();
      const status = this.buildAdminTaskStatus(task);

      return {
        taskId: task.id,
        createdAt: task.createdAt,
        sites: {
          source: {
            id: sourceWebsite?.id ?? task.requesterWebsiteId,
            name: sourceWebsite?.websiteUrl?.toUpperCase() ?? null,
            label: sourceWebsite?.name ?? null,
          },
          target: {
            id: targetWebsite?.id ?? task.assignedProviderWebsiteId ?? null,
            name:
              targetWebsite?.websiteUrl?.toUpperCase() ??
              targetDomain.toUpperCase(),
            label: targetWebsite?.name ?? null,
          },
        },
        destination: {
          url: task.targetUrl,
          status:
            sourceWebsite?.verificationStatus === 'VERIFIED'
              ? 'ACTIVE'
              : 'INACTIVE',
        },
        typeAttr: {
          type:
            task.placementType === 'BACKLINK_INSERTION'
              ? 'BACKLINK'
              : task.placementType.replace(/_/g, ' '),
          attribute: task.linkAttribute,
        },
        credits: {
          amount:
            task.finalCreditCost ??
            task.reservedCreditAmount ??
            task.creditCost,
          unit: 'CR',
        },
        status,
        authorityAction: {
          label: 'VIEW PROFILE',
          providerId: task.selectedProviderId,
          enabled: Boolean(task.selectedProviderId),
        },
      };
    });

    return sendResponse('Admin task list retrieved successfully.', {
      items,
      meta,
    });
  }

  async getTaskByIdForAdmin(taskId: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        selectedProvider: {
          select: {
            id: true,
            name: true,
            email: true,
            imageKey: true,
            role: true,
          },
        },
        placementApplications: {
          orderBy: { createdAt: 'asc' },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
                imageKey: true,
                role: true,
              },
            },
          },
        },
        taskFlows: {
          orderBy: { createdAt: 'asc' },
          include: {
            requester: { select: { id: true, name: true, email: true } },
            provider: { select: { id: true, name: true, email: true } },
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        deadlineExtensions: { orderBy: { createdAt: 'asc' } },
        // creditAdjustments: {
        //   orderBy: { createdAt: 'asc' },
        //   include: {
        //     admin: { select: { id: true, name: true, email: true } },
        //   },
        // },
      },
    });

    if (!task) throw new NotFoundException('Task not found.');
    return sendResponse('Admin task details retrieved successfully.', task);
  }

  async runTaskAction(
    taskId: string,
    adminId: string,
    payload: AdminTaskActionDto,
  ) {
    switch (payload.action) {
      case AdminTaskActionDtoEnum.FREEZE:
        return this.freezeTask(taskId, adminId, { note: payload.reason });
      case AdminTaskActionDtoEnum.FORCE_APPROVE:
        return this.forceApproveTask(taskId, adminId, payload.reason);
      case AdminTaskActionDtoEnum.FORCE_REJECT:
        return this.forceRejectTask(taskId, adminId, payload.reason);
      case AdminTaskActionDtoEnum.CREDIT_REFUND:
        return this.addCreditAdjustment(taskId, adminId, {
          adjustmentType: CreditAdjustmentTypeDtoEnum.REFUND,
          amount: payload.amount,
          note: payload.reason,
        });
      case AdminTaskActionDtoEnum.CREDIT_REVERSE:
        return this.addCreditAdjustment(taskId, adminId, {
          adjustmentType: CreditAdjustmentTypeDtoEnum.REVERSE,
          amount: payload.amount,
          note: payload.reason,
        });
      case AdminTaskActionDtoEnum.RESOLVE_DISPUTE:
        return this.resolveDispute(taskId, adminId, payload);
      case AdminTaskActionDtoEnum.FLAG_ABUSE_PATTERN:
        return this.flagAbusePattern(taskId, adminId, payload.reason);
      default:
        throw new BadRequestException('Unsupported admin action.');
    }
  }

  async adminUpdateTaskStatus(
    taskId: string,
    adminId: string,
    payload: AdminUpdateTaskStatusDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (!payload.note?.trim()) {
      throw new BadRequestException('Audit note is required.');
    }

    if (
      ['COMPLETED', 'APPROVED', 'REJECTED', 'DISPUTED'].includes(payload.status)
    ) {
      throw new BadRequestException(
        'Use settlement-specific admin actions for COMPLETED, APPROVED, REJECTED, or DISPUTED states.',
      );
    }

    const allowed = this.allowedTransitions[task.lifecycleStatus] ?? [];
    if (!allowed.includes(payload.status)) {
      throw new BadRequestException(
        `Invalid transition: ${task.lifecycleStatus} -> ${payload.status}`,
      );
    }

    const now = new Date();
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: { lifecycleStatus: payload.status as any },
      });

      if (task.selectedProviderId) {
        await tx.placementApplication.updateMany({
          where: {
            providerId: task.selectedProviderId,
            placementTaskId: taskId,
          },
          data: { status: payload.status as any },
        });
      }

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId: task.selectedProviderId,
          actorId: adminId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.ADMIN_STATUS_OVERRIDE,
          actorRole: TaskFlowActorRole.ADMIN,
          fromStatus: task.lifecycleStatus,
          toStatus: payload.status,
          note: payload.note,
          metadata: {
            reason: payload.note,
            overriddenTo: payload.status,
          } as const,
          eventKey: taskFlowEventKey.adminStatusOverride(
            task.id,
            adminId,
            payload.status,
            now,
          ),
        },
        tx,
      );

      return nextTask;
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_STATUS_UPDATED,
      task: updatedTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: adminId,
      extraData: {
        fromStatus: task.lifecycleStatus,
        toStatus: payload.status,
        note: payload.note,
        adminAction: 'STATUS_OVERRIDE',
      },
      idempotencyKey: [
        'task-notification-admin-status',
        task.id,
        payload.status,
        now.toISOString(),
        'requester',
      ].join('-'),
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_STATUS_UPDATED,
      task: updatedTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: adminId,
      extraData: {
        fromStatus: task.lifecycleStatus,
        toStatus: payload.status,
        note: payload.note,
        adminAction: 'STATUS_OVERRIDE',
      },
      idempotencyKey: [
        'task-notification-admin-status',
        task.id,
        payload.status,
        now.toISOString(),
        'provider',
      ].join('-'),
    });

    return sendResponse('Task status updated successfully.', updatedTask);
  }

  async forceCompleteTask(
    taskId: string,
    adminId: string,
    payload: ForceCompleteTaskDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (
      !task.isLate &&
      !['FROZEN', 'SUBMITTED'].includes(task.lifecycleStatus)
    ) {
      throw new BadRequestException(
        'Task must be overdue, frozen, or submitted to force-complete.',
      );
    }
    if (['COMPLETED', 'CANCELLED'].includes(task.lifecycleStatus)) {
      throw new BadRequestException(
        'Task cannot be force-completed in current state.',
      );
    }
    if (task.selectedProviderId && !task.assignedProviderWebsiteId) {
      throw new BadRequestException(
        'Assigned provider website is required before force-completing provider rewards.',
      );
    }

    const now = new Date();
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'COMPLETED',
          submissionStatus: 'APPROVED',
          completedAt: now,
          approvedAt: task.approvedAt ?? now,
          finalCreditCost: task.finalCreditCost ?? task.creditCost,
          providerRewardCredits: task.selectedProviderId
            ? (task.finalCreditCost ?? task.creditCost)
            : task.providerRewardCredits,
        },
      });

      if (task.selectedProviderId) {
        await tx.placementApplication.updateMany({
          where: {
            providerId: task.selectedProviderId,
            placementTaskId: taskId,
          },
          data: { status: 'COMPLETED' },
        });
      }

      if (task.selectedProviderId && nextTask.assignedProviderWebsiteId) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId: task.requesterId,
            providerId: task.selectedProviderId,
            actorId: adminId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: nextTask.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.TASK_COMPLETED,
            actorRole: TaskFlowActorRole.ADMIN,
            fromStatus: task.lifecycleStatus,
            toStatus: TaskStatus.COMPLETED,
            note: payload.note,
            eventKey: taskFlowEventKey.completed(taskId),
          },
          tx,
        );

        const rewardLock = await tx.placementTask.updateMany({
          where: { id: taskId, completionRewardedAt: null },
          data: { completionRewardedAt: now },
        });

        if (rewardLock.count === 1) {
          const resolvedFinalTaskType =
            this.resolveVerifiedPlacementFinalTaskType(nextTask);

          if (!resolvedFinalTaskType) {
            throw new BadRequestException(
              'Resolved final task type is required before settling verified placement rewards.',
            );
          }

          await this.creditTaskService.rewardProviderCredit(
            adminId,
            {
              taskId,
              providerId: task.selectedProviderId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              creditAmount: nextTask.providerRewardCredits ?? task.creditCost,
              note: 'Provider credited after admin force completion.',
            },
            tx,
          );

          await this.weeklyContributionService.processApprovedVerifiedPlacement(
            {
              taskId,
              providerId: task.selectedProviderId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              finalTaskType: resolvedFinalTaskType,
              verifiedAt: now,
            },
            tx,
          );

          ///-------ADDED BY IMRAN -------//
          const providerSite = await tx.website.findUnique({
            where: { id: nextTask.assignedProviderWebsiteId },
            select: { rootDomain: true },
          });
          const requesterSite = await tx.website.findUnique({
            where: { id: task.requesterWebsiteId },
            select: { rootDomain: true },
          });

          await this.domainInteractionRecorder.validateAndRecord(
            tx,
            {
              taskId,
              requesterWebsiteId: task.requesterWebsiteId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              completedAt: now,
            },
            {
              stage: 'ADMIN_FORCE_MATCH',
              actorUserId: adminId,
              providerDomain: providerSite?.rootDomain ?? undefined,
              requesterDomain: requesterSite?.rootDomain ?? undefined,
            },
          );
        }
      }

      await this.rewardOutboxService.enqueueApprovedTask({
        taskId: nextTask.id,
        tx,
        source: 'ADMIN_FORCE_COMPLETE',
      });

      return nextTask;
    });

    if (updatedTask.assignedProviderWebsiteId) {
      await this.scoringService.scheduleOrRunUpdateScores(
        updatedTask.assignedProviderWebsiteId,
        true,
      );
    }

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_COMPLETED,
      task: updatedTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: updatedTask.assignedProviderWebsiteId,
      actorId: adminId,
      extraData: { adminAction: 'FORCE_COMPLETE', note: payload.note },
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_COMPLETED,
      task: updatedTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: updatedTask.assignedProviderWebsiteId,
      actorId: adminId,
      extraData: { adminAction: 'FORCE_COMPLETE', note: payload.note },
    });

    return sendResponse('Task force-completed successfully.', updatedTask);
  }

  async forceApproveTask(taskId: string, adminId: string, note: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (['COMPLETED', 'CANCELLED'].includes(task.lifecycleStatus)) {
      throw new BadRequestException(
        'Task cannot be force-approved in current state.',
      );
    }
    if (task.selectedProviderId && !task.assignedProviderWebsiteId) {
      throw new BadRequestException(
        'Assigned provider website is required before force-approving provider rewards.',
      );
    }

    const providerSite = task.assignedProviderWebsiteId
      ? await this.prisma.website.findUnique({
          where: { id: task.assignedProviderWebsiteId },
          select: { rootDomain: true },
        })
      : null;
    const requesterSite = await this.prisma.website.findUnique({
      where: { id: task.requesterWebsiteId },
      select: { rootDomain: true },
    });

    const adminValidation = await this.validationEngine.validateTransition({
      stage: 'ADMIN_FORCE_MATCH',
      actorUserId: adminId,
      providerWebsiteId: task.assignedProviderWebsiteId ?? undefined,
      requesterWebsiteId: task.requesterWebsiteId,
      taskId: taskId,
      providerDomain: providerSite?.rootDomain ?? undefined,
      requesterDomain: requesterSite?.rootDomain ?? undefined,
      adminOverride: {
        adminId,
        rule: 'RECIPROCAL_COOLDOWN',
        reasonCode: note ?? 'ADMIN_FORCE',
      },
    });
    if (
      adminValidation.decision === 'REJECTED' &&
      !adminValidation.overrideApplied
    ) {
      throw new ForbiddenException(adminValidation.publicMessage);
    }

    const now = new Date();
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'COMPLETED',
          submissionStatus: 'APPROVED',
          completedAt: now,
          approvedAt: now,
          finalCreditCost: task.finalCreditCost ?? task.creditCost,
          providerRewardCredits: task.selectedProviderId
            ? (task.finalCreditCost ?? task.creditCost)
            : task.providerRewardCredits,
        },
      });

      if (task.selectedProviderId) {
        await tx.placementApplication.updateMany({
          where: {
            providerId: task.selectedProviderId,
            placementTaskId: taskId,
          },
          data: { status: 'COMPLETED' },
        });
      }

      if (task.selectedProviderId && nextTask.assignedProviderWebsiteId) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId: task.requesterId,
            providerId: task.selectedProviderId,
            actorId: adminId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: nextTask.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.TASK_APPROVED,
            actorRole: TaskFlowActorRole.ADMIN,
            fromStatus: task.lifecycleStatus,
            toStatus: TaskStatus.COMPLETED,
            note,
            eventKey: taskFlowEventKey.approved(taskId),
          },
          tx,
        );

        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId: task.requesterId,
            providerId: task.selectedProviderId,
            actorId: adminId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: nextTask.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.TASK_COMPLETED,
            actorRole: TaskFlowActorRole.ADMIN,
            fromStatus: task.lifecycleStatus,
            toStatus: TaskStatus.COMPLETED,
            note,
            metadata: {
              providerRewardCredits: nextTask.providerRewardCredits,
            } as const,
            eventKey: taskFlowEventKey.completed(taskId),
          },
          tx,
        );
      }

      if (task.selectedProviderId) {
        const rewardLock = await tx.placementTask.updateMany({
          where: { id: taskId, completionRewardedAt: null },
          data: { completionRewardedAt: now },
        });

        if (rewardLock.count === 1 && nextTask.assignedProviderWebsiteId) {
          const resolvedFinalTaskType =
            this.resolveVerifiedPlacementFinalTaskType(nextTask);

          if (!resolvedFinalTaskType) {
            throw new BadRequestException(
              'Resolved final task type is required before settling verified placement rewards.',
            );
          }

          await this.creditTaskService.rewardProviderCredit(
            adminId,
            {
              taskId,
              providerId: task.selectedProviderId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              creditAmount: nextTask.providerRewardCredits ?? task.creditCost,
              note: 'Provider credited after admin force approval.',
            },
            tx,
          );

          await this.weeklyContributionService.processApprovedVerifiedPlacement(
            {
              taskId,
              providerId: task.selectedProviderId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              finalTaskType: resolvedFinalTaskType,
              verifiedAt: now,
            },
            tx,
          );

          ///-------ADDED BY IMRAN -------//
          const providerSite = await tx.website.findUnique({
            where: { id: nextTask.assignedProviderWebsiteId },
            select: { rootDomain: true },
          });
          const requesterSite = await tx.website.findUnique({
            where: { id: task.requesterWebsiteId },
            select: { rootDomain: true },
          });

          await this.domainInteractionRecorder.validateAndRecord(
            tx,
            {
              taskId,
              requesterWebsiteId: task.requesterWebsiteId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              completedAt: now,
            },
            {
              stage: 'ADMIN_FORCE_MATCH',
              actorUserId: adminId,
              providerDomain: providerSite?.rootDomain ?? undefined,
              requesterDomain: requesterSite?.rootDomain ?? undefined,
            },
          );
        }
      }

      return nextTask;
    });

    if (updatedTask.assignedProviderWebsiteId) {
      await this.scoringService.scheduleOrRunUpdateScores(
        updatedTask.assignedProviderWebsiteId,
        true,
      );
    }

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_COMPLETED,
      task: updatedTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: updatedTask.assignedProviderWebsiteId,
      actorId: adminId,
      extraData: { adminAction: 'FORCE_APPROVE', note },
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_APPROVED,
      task: updatedTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: updatedTask.assignedProviderWebsiteId,
      actorId: adminId,
      extraData: { adminAction: 'FORCE_APPROVE', note },
    });

    return sendResponse('Task force-approved successfully.', updatedTask);
  }

  async forceRejectTask(
    taskId: string,
    adminId: string,
    note: string,
    riskEventType?: 'DISPUTE' | 'REJECTION' | 'FAILURE' | 'ABUSE' | 'SUCCESS',
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (['COMPLETED', 'CANCELLED'].includes(task.lifecycleStatus)) {
      throw new BadRequestException(
        'Task cannot be force-rejected in current state.',
      );
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'REJECTED',
          submissionStatus: 'REJECTED',
        },
      });

      if (task.selectedProviderId) {
        await tx.placementApplication.updateMany({
          where: {
            providerId: task.selectedProviderId,
            placementTaskId: taskId,
          },
          data: { status: 'REJECTED' },
        });
      }

      if (task.selectedProviderId && nextTask.assignedProviderWebsiteId) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId: task.requesterId,
            providerId: task.selectedProviderId,
            actorId: adminId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: nextTask.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.TASK_REJECTED,
            actorRole: TaskFlowActorRole.ADMIN,
            fromStatus: task.lifecycleStatus,
            toStatus: TaskStatus.REJECTED,
            note,
            eventKey: taskFlowEventKey.rejected(taskId),
          },
          tx,
        );
      }

      return nextTask;
    });

    if (updatedTask.assignedProviderWebsiteId) {
      await this.scoringService.scheduleOrRunUpdateScores(
        updatedTask.assignedProviderWebsiteId,
        false,
        undefined,
        riskEventType ?? 'REJECTION',
      );
    }

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_REJECTED,
      task: updatedTask,
      requesterId: task.requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: updatedTask.assignedProviderWebsiteId,
      actorId: adminId,
      extraData: { adminAction: 'FORCE_REJECT', note },
    });

    return sendResponse('Task force-rejected successfully.', updatedTask);
  }

  async freezeTask(taskId: string, adminId: string, payload: FreezeTaskDto) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.lifecycleStatus === 'FROZEN') {
      throw new BadRequestException('Task is already frozen.');
    }
    if (['COMPLETED', 'CANCELLED'].includes(task.lifecycleStatus)) {
      throw new BadRequestException(
        'Completed or cancelled task cannot be frozen.',
      );
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const frozenAt = new Date();
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'FROZEN',
          frozenAt,
        },
      });

      if (task.selectedProviderId) {
        await tx.placementApplication.updateMany({
          where: {
            providerId: task.selectedProviderId,
            placementTaskId: taskId,
          },
          data: { status: 'FROZEN' },
        });
      }

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId: task.selectedProviderId,
          actorId: adminId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.TASK_FROZEN,
          actorRole: TaskFlowActorRole.ADMIN,
          fromStatus: task.lifecycleStatus,
          toStatus: TaskStatus.FROZEN,
          note: payload.note,
          metadata: {
            reason: payload.note,
          } as const,
          eventKey: taskFlowEventKey.taskFrozen(task.id, adminId, frozenAt),
        },
        tx,
      );

      return nextTask;
    });

    return sendResponse('Task frozen successfully.', updatedTask);
  }

  async addCreditAdjustment(
    taskId: string,
    adminId: string,
    payload: AddCreditAdjustmentDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');

    const baseCost = task.finalCreditCost ?? task.creditCost;
    const maxAdjustable = Math.max(baseCost, task.reservedCreditAmount, 0);
    let amount = payload.amount ?? 0;

    if (payload.adjustmentType === CreditAdjustmentTypeDtoEnum.REVERSE) {
      amount = payload.amount ?? maxAdjustable;
    } else if (!payload.amount) {
      throw new BadRequestException(
        `amount is required for ${payload.adjustmentType} adjustments.`,
      );
    }

    if (amount <= 0) {
      throw new BadRequestException(
        'Credit adjustment amount must be greater than 0.',
      );
    }
    if (amount > maxAdjustable) {
      throw new BadRequestException(
        `Credit adjustment amount cannot exceed ${maxAdjustable}.`,
      );
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const adjustedTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          finalCreditCost:
            payload.adjustmentType === CreditAdjustmentTypeDtoEnum.ADD
              ? baseCost + amount
              : Math.max(0, baseCost - amount),
          reservedCreditAmount:
            payload.adjustmentType === CreditAdjustmentTypeDtoEnum.ADD
              ? task.reservedCreditAmount + amount
              : Math.max(0, task.reservedCreditAmount - amount),
        },
      });

      // const adjustment = await tx.taskCreditAdjustment.create({
      //   data: {
      //     placementTaskId: taskId,
      //     adminId,
      //     adjustmentType: payload.adjustmentType as any,
      //     amount,
      //     note: payload.note,
      //   },
      // });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId: task.selectedProviderId,
          actorId: adminId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.ADMIN_CREDIT_ADJUSTED,
          actorRole: TaskFlowActorRole.ADMIN,
          fromStatus: task.lifecycleStatus,
          toStatus: task.lifecycleStatus,
          note: `${payload.adjustmentType} ${amount} credit(s): ${payload.note}`,
          metadata: {
            adjustmentType: payload.adjustmentType,
            amount,
            reason: payload.note,
          } as const,
          eventKey: taskFlowEventKey.adminCreditAdjusted(task.id, adminId, now),
        },
        tx,
      );

      // return { task: adjustedTask, adjustment };
      return { task: adjustedTask };
    });

    return sendResponse('Credit adjustment applied successfully.', updated);
  }

  private async resolveDispute(
    taskId: string,
    adminId: string,
    payload: AdminTaskActionDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.lifecycleStatus !== 'DISPUTED') {
      throw new BadRequestException('Only disputed tasks can be resolved.');
    }
    if (!payload.disputeResolution) {
      throw new BadRequestException(
        'disputeResolution is required for RESOLVE_DISPUTE.',
      );
    }

    if (payload.disputeResolution === AdminDisputeResolutionDtoEnum.APPROVE) {
      const result = await this.forceApproveTask(
        taskId,
        adminId,
        payload.reason,
      );
      await this.closeDisputeForTask(
        adminId,
        taskId,
        DisputeDecisionDtoEnum.RESOLVE_IN_FAVOR_OF_PROVIDER,
        payload.reason,
      );
      return result;
    }

    if (payload.disputeResolution === AdminDisputeResolutionDtoEnum.REJECT) {
      const result = await this.forceRejectTask(
        taskId,
        adminId,
        payload.reason,
        'DISPUTE',
      );
      await this.closeDisputeForTask(
        adminId,
        taskId,
        DisputeDecisionDtoEnum.REJECT,
        payload.reason,
      );
      return result;
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'REVISION_REQUESTED',
          submissionStatus: 'REVISION_REQUESTED',
        },
      });

      if (task.selectedProviderId) {
        await tx.placementApplication.updateMany({
          where: {
            providerId: task.selectedProviderId,
            placementTaskId: taskId,
          },
          data: { status: 'REVISION_REQUESTED' },
        });
      }

      if (task.selectedProviderId && nextTask.assignedProviderWebsiteId) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId: task.requesterId,
            providerId: task.selectedProviderId,
            actorId: adminId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: nextTask.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.REVISION_REQUESTED,
            actorRole: TaskFlowActorRole.ADMIN,
            fromStatus: task.lifecycleStatus,
            toStatus: TaskStatus.REVISION_REQUESTED,
            note: payload.reason,
            eventKey: taskFlowEventKey.revisionRequested(taskId, new Date()),
          },
          tx,
        );
      }

      return nextTask;
    });

    // Sending the disputed task back for revision is not a final resolution;
    // keep the dispute open but flag it for continued review.
    await this.closeDisputeForTask(
      adminId,
      taskId,
      DisputeDecisionDtoEnum.MARK_UNDER_REVIEW,
      payload.reason,
    );

    return sendResponse('Dispute resolved with revision request.', updatedTask);
  }

  /**
   * Close the active Dispute row tied to a task via the canonical
   * DisputeService (spec §25), so task resolution and the Dispute record stay
   * in sync. Best-effort: a missing/already-resolved dispute is not fatal.
   */
  private async closeDisputeForTask(
    adminId: string,
    taskId: string,
    decision: DisputeDecisionDtoEnum,
    reason?: string,
  ) {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        taskId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] as any },
      },
      select: { id: true },
    });
    if (!dispute) return;

    try {
      await this.disputeService.resolveDispute(adminId, dispute.id, {
        decision,
        creditAdjustment: { type: 'NONE' as any },
        ...(reason ? { note: reason } : {}),
      });
    } catch (err) {
      this.logger.warn(
        `Failed to close Dispute for task ${taskId} (dispute ${dispute.id}): ${err?.message ?? err}`,
      );
    }
  }

  private async flagAbusePattern(
    taskId: string,
    adminId: string,
    note: string,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (['COMPLETED', 'CANCELLED'].includes(task.lifecycleStatus)) {
      throw new BadRequestException(
        'Completed or cancelled task cannot be flagged for abuse.',
      );
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const flaggedAt = new Date();
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'FROZEN',
          frozenAt: task.frozenAt ?? flaggedAt,
        },
      });

      if (task.selectedProviderId) {
        await tx.placementApplication.updateMany({
          where: {
            providerId: task.selectedProviderId,
            placementTaskId: taskId,
          },
          data: { status: 'FROZEN' },
        });
      }

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId: task.selectedProviderId,
          actorId: adminId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.ADMIN_ABUSE_PATTERN_FLAGGED,
          actorRole: TaskFlowActorRole.ADMIN,
          fromStatus: task.lifecycleStatus,
          toStatus: TaskStatus.FROZEN,
          note,
          metadata: {
            reason: note,
          } as const,
          eventKey: taskFlowEventKey.adminAbusePatternFlagged(
            task.id,
            adminId,
            flaggedAt,
          ),
        },
        tx,
      );

      return nextTask;
    });

    // Escalate risk for the provider website tied to the flagged task (spec §15).
    if (task.assignedProviderWebsiteId) {
      await this.scoringService
        .scheduleOrRunUpdateScores(
          task.assignedProviderWebsiteId,
          false,
          undefined,
          'ABUSE',
        )
        .catch(() => {
          /* risk update must never block the abuse flag */
        });
    }

    return sendResponse('Task flagged for abuse review.', updatedTask);
  }
}
