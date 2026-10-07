import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TaskFlowActorRole,
  TaskFlowEventType,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  CreateTaskDto,
  PlacementTypeDtoEnum,
  REQUESTED_DEADLINE_DAYS_ENUM,
} from './dto/create-task.dto';
import { SelectProviderDto } from './dto/select-provider.dto';
import { ReviewTaskDto, TaskReviewActionDtoEnum } from './dto/review-task.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import {
  DEADLINE_EXTENSION_DAYS_ENUM,
  ExtendDeadlineDto,
} from './dto/extend-deadline.dto';
import { RespondDeadlineExtensionDto } from './dto/respond-deadline-extension.dto';
import { getPagination } from 'src/common/utils/pagination';
import { CreditTaskService } from 'src/modules/credit/credit-task/credit-task.service';
import { CreditWalletTypeDtoEnum } from 'src/modules/credit/credit-task/dto/task-credit.dto';
import { WeeklyContributionService } from 'src/modules/credit/referrer/weekly-contribution.service';
import { getMozDomainStats } from 'src/common/utils/moz-domain-stats.util';
import { TaskFlowService } from '../task-flow/task-flow.service';
import { taskFlowEventKey } from '../task-flow/task-flow-event-key.util';
import { TaskNotificationService } from 'src/modules/task-notification/task-notification.service';
import { TaskNotificationTrigger } from 'src/modules/task-notification/enums/task-notification-trigger.enum';
import { DisputeService } from '../dispute/dispute.service';
import { OpenDisputeDto } from '../dispute/dto/open-dispute.dto';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { ValidationEngine } from '../market-algoritm/validation.engine';
import { DomainInteractionRecorderService } from '../market-algoritm/domain-interaction-recorder.service';
import {
  acquirePairLock,
  acquireDomainLock,
} from '../market-algoritm/concurrency.util';
import { ScoringService } from '../market-algoritm/scoring.service';
import { RiskEngine } from '../market-algoritm/risk.engine';
import { OpportunityAlertService } from '../market-algoritm/opportunity-alert.service';
import { GraduatedPenaltyService } from '../market-algoritm/graduated-penalty.service';
import { TrustIndicatorService } from '../market-algoritm/trust-indicator.service';
import {
  QualityRubricDto,
  computeCompositeScore,
} from '../dto/quality-rubric.dto';
import { RewardOutboxService } from 'src/modules/rewards/services/reward-outbox.service';

type CreateTaskPersistencePayload = CreateTaskDto & {
  supportDocuments: string[];
};

@Injectable()
export class TaskRequesterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditTaskService: CreditTaskService,
    private readonly taskFlowService: TaskFlowService,
    private readonly weeklyContributionService: WeeklyContributionService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly disputeService: DisputeService,
    private readonly s3: AwsS3Service,
    private readonly validationEngine: ValidationEngine,
    private readonly scoringService: ScoringService,
    private readonly riskEngine: RiskEngine,
    private readonly domainInteractionRecorder: DomainInteractionRecorderService,
    private readonly opportunityAlertService: OpportunityAlertService,
    private readonly graduatedPenaltyService: GraduatedPenaltyService,
    private readonly trustIndicatorService: TrustIndicatorService,
    private readonly rewardOutboxService: RewardOutboxService,
  ) {}

  private async mapUserWithSignedImage<
    T extends { imageKey?: string | null } | null,
  >(user: T) {
    if (!user) {
      return user;
    }

    return {
      ...user,
      imageUrl: await this.s3.resolveFileUrl(user.imageKey ?? null),
    };
  }

  private async mapTaskWithResolvedFiles<T extends Record<string, any>>(
    task: T,
  ) {
    const supportDocumentKeys = Array.isArray(task.supportDocuments)
      ? task.supportDocuments.filter(
          (value: unknown): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
      : [];
    const providerProofDocumentKeys = Array.isArray(task.providerProofDocuments)
      ? task.providerProofDocuments.filter(
          (value: unknown): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
      : [];

    const [
      supportDocumentUrls,
      providerProofDocumentUrls,
      requester,
      selectedProvider,
      placementApplications,
    ] = await Promise.all([
      this.s3.resolveFileUrls(supportDocumentKeys),
      this.s3.resolveFileUrls(providerProofDocumentKeys),
      this.mapUserWithSignedImage(task.requester ?? null),
      this.mapUserWithSignedImage(task.selectedProvider ?? null),
      Array.isArray(task.placementApplications)
        ? Promise.all(
            task.placementApplications.map(
              async (application: Record<string, any>) => ({
                ...application,
                provider: await this.mapUserWithSignedImage(
                  application.provider ?? null,
                ),
              }),
            ),
          )
        : Promise.resolve(task.placementApplications),
    ]);

    return {
      ...task,
      requester,
      selectedProvider,
      placementApplications,
      supportDocumentKeys,
      supportDocuments: supportDocumentUrls,
      supportDocumentUrls,
      providerProofDocumentKeys,
      providerProofDocuments: providerProofDocumentUrls,
      providerProofDocumentUrls,
    };
  }
  private mapTimelineAction(actionTaken?: string | null): string {
    if (actionTaken === 'TASK_CREATED') return 'ORDER_CREATED';
    if (actionTaken === 'PROVIDER_SELECTED') return 'PROVIDER_ASSIGNED';
    if (!actionTaken) return 'TASK_UPDATED';
    return actionTaken;
  }

  private getCreditCost(placementType: PlacementTypeDtoEnum): number {
    if (placementType === PlacementTypeDtoEnum.BACKLINK_INSERTION) return 1;
    return 2;
  }

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

  private buildMozSections(metrics: Record<string, unknown>) {
    const toNumber = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) ? value : null;
    const toString = (value: unknown): string | null =>
      typeof value === 'string' && value.trim().length > 0 ? value : null;
    const pick = (key: string) => metrics[key] ?? null;

    const domainAuthority = toNumber(metrics.domain_authority);
    const pageAuthority = toNumber(metrics.page_authority);
    const spamScore = toNumber(metrics.spam_score);
    const linkingRootDomains = toNumber(metrics.root_domains_to_root_domain);
    const totalBacklinks = toNumber(metrics.pages_to_root_domain);
    const externalBacklinks = toNumber(metrics.external_pages_to_root_domain);

    const totalRefDomains = linkingRootDomains ?? 0;
    const nofollowRefDomains =
      toNumber(metrics.nofollow_root_domains_to_root_domain) ?? 0;
    const dofollowRefDomains = Math.max(
      totalRefDomains - nofollowRefDomains,
      0,
    );

    let estimatedSuitability: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (
      domainAuthority !== null &&
      spamScore !== null &&
      domainAuthority >= 40 &&
      spamScore <= 4
    ) {
      estimatedSuitability = 'HIGH';
    } else if (
      domainAuthority !== null &&
      spamScore !== null &&
      domainAuthority >= 25 &&
      spamScore <= 8
    ) {
      estimatedSuitability = 'MEDIUM';
    }

    const frontendMetrics = {
      page: toString(metrics.page),
      title: toString(metrics.title),
      httpCode: toNumber(metrics.http_code),
      lastCrawled: toString(metrics.last_crawled),
      domainAuthority,
      pageAuthority,
      spamScore,
      linkingRootDomains,
      totalBacklinks,
      externalBacklinks,
    };

    const dofollowNofollow = {
      dofollowRefDomains,
      nofollowRefDomains,
      dofollowRefDomainRatio:
        totalRefDomains > 0
          ? Number((dofollowRefDomains / totalRefDomains).toFixed(4))
          : null,
      nofollowRefDomainRatio:
        totalRefDomains > 0
          ? Number((nofollowRefDomains / totalRefDomains).toFixed(4))
          : null,
    };

    const guestPost = {
      domainAuthority,
      pageAuthority,
      spamScore,
      estimatedSuitability,
    };

    const rawPreview = {
      subdomain: pick('subdomain'),
      rootDomain: pick('root_domain'),
      linkPropensity: pick('link_propensity'),
      pagesFromRootDomain: pick('pages_from_root_domain'),
      rootDomainsFromRootDomain: pick('root_domains_from_root_domain'),
      nofollowRootDomainsToRootDomain: pick(
        'nofollow_root_domains_to_root_domain',
      ),
      deletedRootDomainsToRootDomain: pick(
        'deleted_root_domains_to_root_domain',
      ),
    };

    return { frontendMetrics, dofollowNofollow, guestPost, rawPreview };
  }

  async getDomainMozStats(domain: string) {
    const stats = await getMozDomainStats(domain);
    const { frontendMetrics, dofollowNofollow, guestPost, rawPreview } =
      this.buildMozSections(stats.metrics);

    return sendResponse('MOZ domain stats fetched successfully.', {
      domain: stats.domain,
      normalizedDomain: stats.normalizedDomain,
      metrics: frontendMetrics,
      backlink: {
        totalBacklinks: frontendMetrics.totalBacklinks,
        externalBacklinks: frontendMetrics.externalBacklinks,
        linkingRootDomains: frontendMetrics.linkingRootDomains,
      },
      dofollowNofollow,
      guestPost,
      rawPreview,
    });
  }

  /**
   * Derive the refund wallet type directly from a task's stored `walletType`
   * (spec §24: "derive from task.walletType via existing resolver"). Mirrors
   * `resolveStoredWalletType` used by the cancellation-refund path so rejected
   * submissions refund to the same bucket the requester originally spent from.
   */
  private resolveStoredWalletType(
    walletType?: string | null,
  ): CreditWalletTypeDtoEnum {
    if (walletType && walletType in CreditWalletTypeDtoEnum) {
      return CreditWalletTypeDtoEnum[walletType];
    }
    return CreditWalletTypeDtoEnum.SUBSCRIPTION;
  }

  private ensureRequestedDeadlineDays(days: number) {
    if (!REQUESTED_DEADLINE_DAYS_ENUM.includes(days as never)) {
      throw new BadRequestException(
        `requestedDeadlineDays must be one of: ${REQUESTED_DEADLINE_DAYS_ENUM.join(', ')}`,
      );
    }
  }

  private async ensureRequesterWebsiteOwnership(
    requesterId: string,
    requesterWebsiteId: string,
  ) {
    const isUserActive = await this.validationEngine.isUserActive(requesterId);
    if (!isUserActive) {
      throw new ForbiddenException('Requester account is not active.');
    }

    // const isEligible = await this.validationEngine.isWebsiteEligible(
    //   requesterWebsiteId,
    //   requesterId,
    // );
    // if (!isEligible) {
    //   throw new BadRequestException(
    //     'requesterWebsiteId is invalid, not verified, flag active, wallet-locked, or hidden.',
    //   );
    // }
  }

  async createTask(requesterId: string, payload: CreateTaskPersistencePayload) {
    this.ensureRequestedDeadlineDays(payload.requestedDeadlineDays);
    await this.ensureRequesterWebsiteOwnership(
      requesterId,
      payload.requesterWebsiteId,
    );

    const secondaryIds = payload.secondaryTargetMarketplaceCategoryIds || [];
    const uniqueSecondaryIds = [...new Set(secondaryIds)];
    if (
      payload.targetMarketplaceCategoryId &&
      uniqueSecondaryIds.includes(payload.targetMarketplaceCategoryId)
    ) {
      throw new BadRequestException(
        'A category cannot be both PRIMARY and SECONDARY.',
      );
    }

    const allCatIds = payload.targetMarketplaceCategoryId
      ? [payload.targetMarketplaceCategoryId, ...uniqueSecondaryIds]
      : [...uniqueSecondaryIds];
    if (allCatIds.length > 0) {
      const cats = await this.prisma.marketplaceCategory.findMany({
        where: { id: { in: allCatIds }, enabled: true },
      });
      if (cats.length !== allCatIds.length) {
        throw new BadRequestException(
          'One or more Target Marketplace Categories are not found or disabled',
        );
      }
    }

    const newMarketplaceTagIds = [...new Set(payload.marketplaceTagIds ?? [])];
    if (newMarketplaceTagIds.length > 0) {
      const tags = await this.prisma.marketplaceTag.findMany({
        where: { id: { in: newMarketplaceTagIds }, enabled: true },
      });
      if (tags.length !== newMarketplaceTagIds.length) {
        throw new BadRequestException(
          'One or more Marketplace Tags are invalid or disabled',
        );
      }
    }

    const creditCost = this.getCreditCost(payload.placementType);

    const reservedCreditAmount =
      payload.placementType === PlacementTypeDtoEnum.FLEXIBLE ? 2 : creditCost;
    const createdTask = await this.prisma.$transaction(async (tx) => {
      const task = await tx.placementTask.create({
        data: {
          requesterId,
          requesterWebsiteId: payload.requesterWebsiteId,
          projectTitle: payload.projectTitle,
          targetUrl: payload.targetUrl,
          anchorText: payload.anchorText,
          placementGuidelines: payload.placementGuidelines ?? null,
          requiredDomainRating: payload.requiredDomainRating ?? null,
          country: payload.country?.trim().toUpperCase() || null,
          language: payload.language?.trim().toLowerCase() || null,
          placementType: payload.placementType,
          linkAttribute: payload.linkAttribute,
          requestedDeadlineDays: payload.requestedDeadlineDays,
          deliveryDeadline: null,
          lifecycleStatus: 'OPEN',
          submissionStatus: 'NOT_SUBMITTED',
          creditCost,
          reservedCreditAmount,
          walletType: payload.walletType,
          supportDocuments: payload.supportDocuments ?? [],
          ...(allCatIds.length > 0 && {
            marketplaceCategories: {
              create: [
                ...(payload.targetMarketplaceCategoryId
                  ? [
                      {
                        categoryId: payload.targetMarketplaceCategoryId,
                        role: 'PRIMARY' as any,
                      },
                    ]
                  : []),
                ...uniqueSecondaryIds.map((id) => ({
                  categoryId: id,
                  role: 'SECONDARY' as any,
                })),
              ],
            },
          }),
          ...(newMarketplaceTagIds.length > 0 && {
            marketplaceTags: {
              create: newMarketplaceTagIds.map((id) => ({ tagId: id })),
            },
          }),
          publishedAt: new Date(),
        } as any,
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: task.id,
          requesterId,
          providerId: null,
          actorId: requesterId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: null,
          eventType: TaskFlowEventType.TASK_CREATED,
          actorRole: TaskFlowActorRole.REQUESTER,
          fromStatus: null,
          toStatus: task.lifecycleStatus,
          note: 'Task created and published by requester.',
          metadata: {
            placementType: task.placementType,
            creditCost: task.creditCost,
            walletType: task.walletType,
          } as const,
          eventKey: taskFlowEventKey.taskCreated(task.id),
        },
        tx,
      );

      if (
        task.lifecycleStatus === 'OPEN' ||
        task.lifecycleStatus === 'WAITING_FOR_APPLICANTS'
      ) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: task.id,
            requesterId,
            providerId: null,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: null,
            eventType: TaskFlowEventType.TASK_PUBLISHED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: TaskStatus.DRAFT,
            toStatus: task.lifecycleStatus,
            metadata: {
              publishedAt: task.publishedAt?.toISOString() ?? null,
            } as const,
            eventKey: taskFlowEventKey.taskPublished(task.id),
          },
          tx,
        );
      }

      return task;
    });

    try {
      await this.creditTaskService.deductTaskCredit(requesterId, {
        taskId: createdTask.id,
        requesterWebsiteId: payload.requesterWebsiteId,
        userId: requesterId,
        creditAmount: reservedCreditAmount,
        walletType: payload.walletType,
        note: `Requester spent ${reservedCreditAmount} task credit(s) for this task.`,
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await tx.taskFlow.deleteMany({
          where: { placementTaskId: createdTask.id },
        });
        await tx.placementTask.delete({
          where: { id: createdTask.id },
        });
      });
      throw error;
    }

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_CREATED,
      task: createdTask,
      requesterId,
      actorId: requesterId,
    });

    this.opportunityAlertService
      .scheduleOrRunAlertMatchingProviders(createdTask.id)
      .catch(() => {
        /* fire-and-forget */
      });

    return sendResponse('Task created successfully.', createdTask);
  }

  async getMyTasks(
    requesterId: string,
    filters?: {
      status?: string;
      deadlineStatus?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = { requesterId };
    if (filters?.status) {
      where.lifecycleStatus = filters.status;
    }
    if (filters?.deadlineStatus === 'LATE') {
      where.isLate = true;
    } else if (filters?.deadlineStatus === 'ONTIME') {
      where.isLate = false;
    }

    const totalItems = await this.prisma.placementTask.count({ where });
    const { skip, take, meta } = getPagination(
      filters?.page,
      filters?.limit,
      totalItems,
    );

    const tasks = await this.prisma.placementTask.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        selectedProvider: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        _count: { select: { placementApplications: true, taskFlows: true } },
      },
    });

    const items = await Promise.all(
      tasks.map((task) => this.mapTaskWithResolvedFiles(task)),
    );

    return sendResponse('Requester tasks retrieved successfully.', {
      items,
      meta,
    });
  }

  async getMyTaskApplicants(
    requesterId: string,
    taskId: string,
    pagination?: { page?: number; limit?: number },
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId) {
      throw new ForbiddenException(
        'You do not have permission to view applicants for this task.',
      );
    }

    const where = { placementTaskId: taskId };
    const totalItems = await this.prisma.placementApplication.count({ where });
    const { skip, take, meta } = getPagination(
      pagination?.page,
      pagination?.limit,
      totalItems,
    );

    const applicants = await this.prisma.placementApplication.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            imageKey: true,
            role: true,
            country: true,
            companyName: true,
            businessType: true,
          },
        },
      },
    });

    const items = await Promise.all(
      applicants.map(async (application) => ({
        ...application,
        provider: await this.mapUserWithSignedImage(application.provider),
      })),
    );

    return sendResponse('Task applicants retrieved successfully.', {
      items,
      meta,
    });
  }

  async selectProvider(
    taskId: string,
    requesterId: string,
    payload: SelectProviderDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId)
      throw new ForbiddenException('No permission.');
    if (!['OPEN', 'WAITING_FOR_APPLICANTS'].includes(task.lifecycleStatus)) {
      throw new BadRequestException(
        'Task must be OPEN or WAITING_FOR_APPLICANTS.',
      );
    }

    const application = await this.prisma.placementApplication.findFirst({
      where: {
        id: payload.applicationId,
        placementTaskId: taskId,
        status: 'APPLIED',
      },
    });
    if (!application) {
      throw new BadRequestException(
        'Application must belong to task and be APPLIED.',
      );
    }

    // Stage 4 re-validation (spec §5): provider/task may have changed since apply
    const providerWebsite = await this.prisma.website.findUnique({
      where: { id: application.providerWebsiteId },
      select: { rootDomain: true },
    });
    const requesterWebsite = await this.prisma.website.findUnique({
      where: { id: task.requesterWebsiteId },
      select: { rootDomain: true },
    });
    const now = new Date();
    const deliveryDeadline = new Date(
      now.getTime() + task.requestedDeadlineDays * 24 * 60 * 60 * 1000,
    );

    const selectionResult = await this.prisma.$transaction(async (tx) => {
      // 1. Acquire concurrency locks
      if (providerWebsite?.rootDomain && requesterWebsite?.rootDomain) {
        await acquirePairLock(
          tx,
          providerWebsite.rootDomain,
          requesterWebsite.rootDomain,
        );
      } else if (providerWebsite?.rootDomain) {
        await acquireDomainLock(tx, providerWebsite.rootDomain);
      } else if (requesterWebsite?.rootDomain) {
        await acquireDomainLock(tx, requesterWebsite.rootDomain);
      }



      const selectedApplication = await tx.placementApplication.updateMany({
        where: {
          id: application.id,
          placementTaskId: task.id,
          status: 'APPLIED',
        },
        data: {
          status: 'SELECTED',
        },
      });

      if (selectedApplication.count !== 1) {
        throw new BadRequestException(
          'Application must belong to task and still be APPLIED.',
        );
      }

      const updated = await tx.placementTask.updateMany({
        where: {
          id: task.id,
          requesterId,
          selectedProviderId: null,
          lifecycleStatus: {
            in: ['OPEN', 'WAITING_FOR_APPLICANTS'],
          },
        },
        data: {
          selectedProviderId: application.providerId,
          selectedApplicationId: application.id,
          assignedProviderWebsiteId: application.providerWebsiteId,
          assignedAt: now,
          deliveryDeadline,
          lifecycleStatus: 'ASSIGNED',
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException(
          'Provider was already selected for this task.',
        );
      }

      const rejectedApplications = await tx.placementApplication.findMany({
        where: {
          placementTaskId: task.id,
          id: { not: application.id },
          status: 'APPLIED',
        },
        select: {
          id: true,
          providerId: true,
          providerWebsiteId: true,
        },
      });

      await tx.placementApplication.updateMany({
        where: {
          placementTaskId: task.id,
          id: { not: application.id },
          status: 'APPLIED',
        },
        data: { status: 'REJECTED' },
      });

      const nextTask = await tx.placementTask.findUnique({
        where: { id: task.id },
      });

      if (!nextTask) {
        throw new NotFoundException('Task not found after provider selection.');
      }

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: task.id,
          requesterId,
          providerId: application.providerId,
          actorId: requesterId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: application.providerWebsiteId,
          eventType: TaskFlowEventType.PROVIDER_SELECTED,
          actorRole: TaskFlowActorRole.REQUESTER,
          fromStatus: task.lifecycleStatus,
          toStatus: TaskStatus.ASSIGNED,
          note: 'Requester selected provider.',
          metadata: {
            applicationId: application.id,
            deliveryDeadline: deliveryDeadline.toISOString(),
          } as const,
          eventKey: taskFlowEventKey.providerSelected(
            task.id,
            application.providerId,
          ),
        },
        tx,
      );

      for (const rejectedApplication of rejectedApplications) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: task.id,
            requesterId,
            providerId: rejectedApplication.providerId,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: rejectedApplication.providerWebsiteId,
            eventType: TaskFlowEventType.APPLICATION_REJECTED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: TaskStatus.APPLIED,
            toStatus: TaskStatus.REJECTED,
            metadata: {
              applicationId: rejectedApplication.id,
              selectedProviderId: application.providerId,
            } as const,
            eventKey: taskFlowEventKey.applicationRejected(
              task.id,
              rejectedApplication.providerId,
            ),
          },
          tx,
        );
      }

      return { updatedTask: nextTask, rejectedApplications };
    });

    const { updatedTask, rejectedApplications } = selectionResult;

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_PROVIDER_SELECTED,
      task: updatedTask,
      requesterId,
      providerId: application.providerId,
      providerWebsiteId: application.providerWebsiteId,
      actorId: requesterId,
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_ASSIGNED,
      task: updatedTask,
      requesterId,
      providerId: application.providerId,
      providerWebsiteId: application.providerWebsiteId,
      actorId: requesterId,
    });

    for (const rejectedApplication of rejectedApplications) {
      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.PROVIDER_APPLICATION_REJECTED,
        task: updatedTask,
        requesterId,
        providerId: rejectedApplication.providerId,
        providerWebsiteId: rejectedApplication.providerWebsiteId,
        actorId: requesterId,
        extraData: { applicationId: rejectedApplication.id },
      });
    }

    return sendResponse('Provider selected successfully.', updatedTask);
  }

  async cancelTask(taskId: string, requesterId: string, note?: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId)
      throw new ForbiddenException('No permission.');
    if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task.lifecycleStatus)) {
      throw new BadRequestException(
        'Task cannot be cancelled in current state.',
      );
    }
    if (task.selectedProviderId) {
      if (task.cancellationRequestStatus === 'PENDING') {
        throw new BadRequestException(
          'Cancellation request already pending provider response.',
        );
      }

      const requested = await this.prisma.$transaction(async (tx) => {
        const requestedAt = new Date();
        const nextTask = await tx.placementTask.update({
          where: { id: taskId },
          data: {
            cancellationRequestStatus: 'PENDING',
            cancellationRequestedById: requesterId,
            cancellationRequestedAt: requestedAt,
            cancellationRespondedAt: null,
          },
        });

        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId,
            providerId: task.selectedProviderId,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: task.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.CANCELLATION_REQUESTED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: task.lifecycleStatus,
            toStatus: task.lifecycleStatus,
            note:
              note ?? 'Requester requested task cancellation from provider.',
            metadata: {
              reason: note ?? null,
            } as const,
            eventKey: taskFlowEventKey.cancellationRequested(
              task.id,
              requesterId,
              requestedAt,
            ),
          },
          tx,
        );

        return nextTask;
      });

      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.PROVIDER_CANCELLATION_REQUESTED,
        task: requested,
        requesterId,
        providerId: task.selectedProviderId,
        providerWebsiteId: task.assignedProviderWebsiteId,
        actorId: requesterId,
        extraData: { reason: note ?? null },
        idempotencyKey: [
          'task-notification-cancel-requested',
          task.id,
          requesterId,
          requested.cancellationRequestedAt?.toISOString() ?? 'pending',
        ].join('-'),
      });

      return sendResponse(
        'Cancellation request sent to provider. Task will cancel only if provider accepts.',
        requested,
      );
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: { lifecycleStatus: 'CANCELLED', cancelledAt: new Date() },
      });

      await tx.placementApplication.updateMany({
        where: { placementTaskId: taskId, status: { not: 'REJECTED' } },
        data: { status: 'CANCELLED' },
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId,
          providerId: task.selectedProviderId,
          actorId: requesterId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.TASK_CANCELLED,
          actorRole: TaskFlowActorRole.REQUESTER,
          fromStatus: task.lifecycleStatus,
          toStatus: TaskStatus.CANCELLED,
          note: note ?? 'Requester cancelled task.',
          metadata: {
            reason: note ?? null,
          } as const,
          eventKey: taskFlowEventKey.cancelled(task.id),
        },
        tx,
      );

      return nextTask;
    });

    const walletType = this.resolveStoredWalletType(task.walletType);
    await this.creditTaskService.refundTaskCredit(requesterId, {
      taskId,
      requesterWebsiteId: task.requesterWebsiteId,
      userId: requesterId,
      creditAmount: task.reservedCreditAmount,
      walletType,
      note: note ?? 'Task cancelled, credits refunded to requester wallet.',
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_CANCELLED,
      task: updatedTask,
      requesterId,
      actorId: requesterId,
      extraData: { reason: note ?? null },
    });

    return sendResponse('Task cancelled successfully.', updatedTask);
  }

  /**
   * Build a QualityRubric payload from a task + review DTO (spec §21).
   *
   * When the requester supplies the four rubric dimensions (1-5) on approval,
   * we build all five dimensions + a weighted composite via `computeCompositeScore`.
   * When the rubric dimensions are absent, we derive `overallSatisfaction` from
   * the legacy approval rating (5 = approved submission) and compute the
   * composite from that single dimension so the row is still scored.
   *
   * Idempotent by taskId (the QualityRubric model enforces `taskId @unique`),
   * so callers should upsert rather than create.
   */
  private buildQualityRubric(
    task: {
      id: string;
      assignedProviderWebsiteId: string | null;
      requesterWebsiteId: string;
    },
    payload: ReviewTaskDto,
  ) {
    const approvedRating = 5; // approved submission => full satisfaction

    const hasRubricDimensions =
      typeof payload.contentRelevance === 'number' &&
      typeof payload.technicalQuality === 'number' &&
      typeof payload.communication === 'number' &&
      typeof payload.timeliness === 'number';

    if (hasRubricDimensions) {
      const rubric = {
        contentRelevance: payload.contentRelevance as number,
        technicalQuality: payload.technicalQuality as number,
        communication: payload.communication as number,
        timeliness: payload.timeliness as number,
        overallSatisfaction: approvedRating,
      };
      return {
        taskId: task.id,
        providerWebsiteId: task.assignedProviderWebsiteId as string,
        requesterWebsiteId: task.requesterWebsiteId,
        ...rubric,
        compositeScore: computeCompositeScore(rubric),
        comments: payload.comments ?? null,
      };
    }

    // Fallback: legacy approval rating only (overallSatisfaction = approvedRating).
    return {
      taskId: task.id,
      providerWebsiteId: task.assignedProviderWebsiteId as string,
      requesterWebsiteId: task.requesterWebsiteId,
      contentRelevance: approvedRating,
      technicalQuality: approvedRating,
      communication: approvedRating,
      timeliness: approvedRating,
      overallSatisfaction: approvedRating,
      compositeScore: Number(approvedRating.toFixed(2)),
      comments: payload.comments ?? null,
    };
  }

  async reviewTask(
    taskId: string,
    requesterId: string,
    payload: ReviewTaskDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId)
      throw new ForbiddenException('No permission.');
    if (task.submissionStatus !== 'SUBMITTED') {
      throw new BadRequestException('Submission status must be SUBMITTED.');
    }
    if (!task.selectedProviderId)
      throw new BadRequestException('No selected provider.');

    let nextLifecycleStatus:
      'APPROVED' | 'COMPLETED' | 'DISPUTED' | 'REVISION_REQUESTED';
    let nextSubmissionStatus: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
    let actionTaken = '';

    if (payload.action === TaskReviewActionDtoEnum.APPROVE) {
      nextLifecycleStatus = 'COMPLETED';
      nextSubmissionStatus = 'APPROVED';
      actionTaken = 'SUBMISSION_APPROVED';
    } else if (payload.action === TaskReviewActionDtoEnum.REQUEST_REVISION) {
      nextLifecycleStatus = 'REVISION_REQUESTED';
      nextSubmissionStatus = 'REVISION_REQUESTED';
      actionTaken = 'REVISION_REQUESTED';
    } else {
      nextLifecycleStatus = 'DISPUTED';
      nextSubmissionStatus = 'REJECTED';
      actionTaken = 'SUBMISSION_REJECTED';
    }

    if (
      payload.action === TaskReviewActionDtoEnum.APPROVE &&
      !task.selectedProviderId
    ) {
      throw new BadRequestException(
        'Selected provider is required before approving a task.',
      );
    }

    if (
      payload.action === TaskReviewActionDtoEnum.APPROVE &&
      !task.assignedProviderWebsiteId
    ) {
      throw new BadRequestException(
        'Assigned provider website is required before rewarding the provider.',
      );
    }

    // We now defer Stage 5 re-validation (spec §5) to be inside the transaction
    // using domainInteractionRecorder.validateAndRecord to ensure atomicity.
    let providerSite: { rootDomain: string | null } | null = null;
    let requesterSite: { rootDomain: string | null } | null = null;
    if (payload.action === TaskReviewActionDtoEnum.APPROVE) {
      providerSite = await this.prisma.website.findUnique({
        where: { id: task.assignedProviderWebsiteId! },
        select: { rootDomain: true },
      });
      requesterSite = await this.prisma.website.findUnique({
        where: { id: task.requesterWebsiteId },
        select: { rootDomain: true },
      });
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const nextTask = await tx.placementTask.update({
        where: { id: task.id },
        data: {
          lifecycleStatus: nextLifecycleStatus as any,
          submissionStatus: nextSubmissionStatus,
          approvedAt: nextSubmissionStatus === 'APPROVED' ? now : null,
          completedAt: nextLifecycleStatus === 'COMPLETED' ? now : null,
          providerRewardCredits:
            nextSubmissionStatus === 'APPROVED'
              ? (task.finalCreditCost ?? task.creditCost)
              : task.providerRewardCredits,
        },
      });

      await tx.placementApplication.updateMany({
        where: {
          placementTaskId: task.id,
          providerId: task.selectedProviderId!,
        },
        data: { status: nextLifecycleStatus as any },
      });

      if (payload.action === TaskReviewActionDtoEnum.REQUEST_REVISION) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: task.id,
            requesterId,
            providerId: task.selectedProviderId,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: task.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.REVISION_REQUESTED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: TaskStatus.SUBMITTED,
            toStatus: TaskStatus.REVISION_REQUESTED,
            note: payload.note,
            eventKey: taskFlowEventKey.revisionRequested(task.id, now),
          },
          tx,
        );
      } else if (payload.action === TaskReviewActionDtoEnum.APPROVE) {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: task.id,
            requesterId,
            providerId: task.selectedProviderId,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: task.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.TASK_APPROVED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: TaskStatus.SUBMITTED,
            toStatus: nextTask.lifecycleStatus,
            note: payload.note ?? actionTaken,
            eventKey: taskFlowEventKey.approved(task.id),
          },
          tx,
        );

        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: task.id,
            requesterId,
            providerId: task.selectedProviderId,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: task.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.TASK_COMPLETED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: TaskStatus.SUBMITTED,
            toStatus: TaskStatus.COMPLETED,
            note: payload.note ?? actionTaken,
            metadata: {
              providerRewardCredits: nextTask.providerRewardCredits,
            } as const,
            eventKey: taskFlowEventKey.completed(task.id),
          },
          tx,
        );
      } else {
        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: task.id,
            requesterId,
            providerId: task.selectedProviderId,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: task.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.TASK_REJECTED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: TaskStatus.SUBMITTED,
            toStatus: nextTask.lifecycleStatus,
            note: payload.note ?? actionTaken,
            eventKey: taskFlowEventKey.rejected(task.id),
          },
          tx,
        );
      }

      if (
        nextSubmissionStatus === 'APPROVED' &&
        nextLifecycleStatus === 'COMPLETED' &&
        task.selectedProviderId &&
        nextTask.assignedProviderWebsiteId
      ) {
        const rewardLock = await tx.placementTask.updateMany({
          where: { id: task.id, completionRewardedAt: null },
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
            requesterId,
            {
              taskId: task.id,
              providerId: task.selectedProviderId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              creditAmount: nextTask.providerRewardCredits ?? task.creditCost,
              note: 'Provider earned task credit after successful completion.',
            },
            tx,
          );

          await this.weeklyContributionService.processApprovedVerifiedPlacement(
            {
              taskId: task.id,
              providerId: task.selectedProviderId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              finalTaskType: resolvedFinalTaskType,
              verifiedAt: now,
            },
            tx,
          );

          await this.domainInteractionRecorder.validateAndRecord(
            tx,
            {
              taskId: task.id,
              requesterWebsiteId: task.requesterWebsiteId,
              providerWebsiteId: nextTask.assignedProviderWebsiteId,
              completedAt: now,
            },
            {
              stage: 'APPROVE',
              actorUserId: requesterId,
              providerDomain: providerSite?.rootDomain ?? undefined,
              requesterDomain: requesterSite?.rootDomain ?? undefined,
              task: {
                lifecycleStatus: task.lifecycleStatus,
                requesterId: task.requesterId,
                selectedProviderId: task.selectedProviderId,
              },
            },
          );

          // Spec §21: persist a QualityRubric row so the requester's quality
          // rating is auditable and feeds the provider's WebsiteMatchingProfile.
          // Idempotent upsert by taskId (unique) guards against duplicate rows
          // on re-review. When the rubric dimensions are absent, derive
          // overallSatisfaction from the legacy approval rating (5 = approved).
          const rubric = this.buildQualityRubric(task, payload);
          await tx.qualityRubric.upsert({
            where: { taskId: rubric.taskId },
            create: rubric,
            update: {
              providerWebsiteId: rubric.providerWebsiteId,
              requesterWebsiteId: rubric.requesterWebsiteId,
              contentRelevance: rubric.contentRelevance,
              technicalQuality: rubric.technicalQuality,
              communication: rubric.communication,
              timeliness: rubric.timeliness,
              overallSatisfaction: rubric.overallSatisfaction,
              compositeScore: rubric.compositeScore,
              comments: rubric.comments,
            },
          });
        }

        await this.rewardOutboxService.enqueueApprovedTask({
          taskId: nextTask.id,
          tx,
          source: 'REQUESTER_APPROVAL',
        });
      }

      return nextTask;
    });

    if (
      task.assignedProviderWebsiteId &&
      payload.action === TaskReviewActionDtoEnum.APPROVE
    ) {
      // Feed the rubric's composite score into the provider's quality ratings
      // (spec §21): the QualityRubric row is the source of truth, and its
      // compositeScore is what avgQualityRating/qualityRatingSum are derived
      // from so historical quality actually feeds the matching profile.
      const rubric = this.buildQualityRubric(task, payload);
      await this.scoringService.scheduleOrRunUpdateScores(
        task.assignedProviderWebsiteId,
        true,
        rubric.compositeScore,
      );
    } else if (
      task.assignedProviderWebsiteId &&
      payload.action === TaskReviewActionDtoEnum.REJECT
    ) {
      await this.scoringService.scheduleOrRunUpdateScores(
        task.assignedProviderWebsiteId,
        false,
      );

      // Apply graduated penalty for provider-at-fault rejection.
      try {
        const providerWebsite = await this.prisma.website.findUnique({
          where: { id: task.assignedProviderWebsiteId },
          select: { authorId: true },
        });
        if (providerWebsite) {
          const penalty = await this.graduatedPenaltyService.computePenalty(
            providerWebsite.authorId,
            'REJECTION',
          );
          if (penalty.boostMultiplier < 1.0 || penalty.riskScoreIncrease > 10) {
            const profile = await this.prisma.websiteMatchingProfile.findUnique(
              {
                where: { websiteId: task.assignedProviderWebsiteId },
                select: {
                  riskScore: true,
                  boostFactor: true,
                  lastRiskEventAt: true,
                },
              },
            );
            if (profile) {
              // Boost / suppression decisions still come from
              // GraduatedPenaltyService (it owns the boost math), but the RISK
              // effect is routed through RiskEngine so the RiskEvent ledger +
              // decay stay consistent with every other risk mutation in the
              // system (single writer of riskScore). The previous inline
              // `Math.min(100, riskScore + riskScoreIncrease)` now lives in
              // RiskEngine.processRiskEvent('REJECTION', …).
              const newBoost = Math.max(
                1.0,
                profile.boostFactor * penalty.boostMultiplier,
              );
              await this.riskEngine.processRiskEvent(
                task.assignedProviderWebsiteId,
                'REJECTION',
                profile,
              );
              await this.prisma.websiteMatchingProfile.update({
                where: { websiteId: task.assignedProviderWebsiteId },
                data: {
                  boostFactor: newBoost,
                },
              });
            }
          }
        }
      } catch (err) {
        // Penalty failure must not block the rejection flow.
      }
    }

    // Spec §24: when a submission is REJECTED but the task is NOT escalated to a
    // DISPUTE, the requester's originally-deducted credit must be returned. The
    // DISPUTED branch below routes through DisputeService, which owns any credit
    // adjustment, so we must not refund there (double-refund guard).
    //
    // Wallet-type resolution follows the same "derive from task.walletType via the
    // existing resolver" approach used by the cancellation-refund path
    // (provider-task.service.ts resolveStoredWalletType), and mirrors the
    // dispute.service.ts applyCreditAdjustment refund shape.
    if (
      payload.action === TaskReviewActionDtoEnum.REJECT &&
      updatedTask.lifecycleStatus !== 'DISPUTED'
    ) {
      // Spec §24: route the requester refund through the dedicated rejected-task
      // credit reconciliation so it is auditable under the REJECTED_TASK reason
      // (distinct from a generic cancel refund) and idempotent on re-review.
      await this.creditTaskService.handleRejectedTaskCredit(
        requesterId,
        task.assignedProviderWebsiteId,
        task.id,
      );
    }

    // Spec §25: when a submission is rejected and the task escalates to DISPUTED,
    // route through DisputeService so a Dispute row is actually written (single
    // source of truth for the task->DISPUTED flip, task-flow event, and party
    // notifications).
    if (
      payload.action === TaskReviewActionDtoEnum.REJECT &&
      updatedTask.lifecycleStatus === 'DISPUTED'
    ) {
      const openDisputePayload: OpenDisputeDto = {
        reason:
          payload.note && payload.note.length >= 3
            ? payload.note
            : 'Submission rejected by requester; dispute opened automatically.',
      };
      await this.disputeService.openDispute(
        requesterId,
        task.id,
        openDisputePayload,
      );
    }

    if (payload.action === TaskReviewActionDtoEnum.APPROVE) {
      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.REQUESTER_TASK_COMPLETED,
        task: updatedTask,
        requesterId,
        providerId: task.selectedProviderId,
        providerWebsiteId: task.assignedProviderWebsiteId,
        actorId: requesterId,
      });

      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.PROVIDER_TASK_APPROVED,
        task: updatedTask,
        requesterId,
        providerId: task.selectedProviderId,
        providerWebsiteId: task.assignedProviderWebsiteId,
        actorId: requesterId,
      });
    } else if (payload.action === TaskReviewActionDtoEnum.REQUEST_REVISION) {
      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.PROVIDER_REVISION_REQUESTED,
        task: updatedTask,
        requesterId,
        providerId: task.selectedProviderId,
        providerWebsiteId: task.assignedProviderWebsiteId,
        actorId: requesterId,
        extraData: { note: payload.note ?? null },
      });
    } else {
      // Dispute opened via DisputeService.openDispute (above) already notifies
      // both parties with REQUESTER_TASK_DISPUTED / PROVIDER_TASK_DISPUTED.
      // Send the rejection-specific notification to the provider as well.
      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.PROVIDER_TASK_REJECTED,
        task: updatedTask,
        requesterId,
        providerId: task.selectedProviderId,
        providerWebsiteId: task.assignedProviderWebsiteId,
        actorId: requesterId,
        extraData: { note: payload.note ?? null },
      });
    }

    return sendResponse('Task review completed successfully.', updatedTask);
  }

  async getTaskByIdRequester(taskId: string, requesterId: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
      include: {
        mozAnalyticsHistories: {
          orderBy: { date: 'asc' },
        },
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
      },
    });

    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId)
      throw new ForbiddenException('No permission.');

    const taskWithResolvedFiles = await this.mapTaskWithResolvedFiles(task);

    return sendResponse(
      'Task details retrieved successfully.',
      taskWithResolvedFiles,
    );
  }

  async getTaskTimeline(taskId: string, userId: string, role: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        requesterId: true,
        selectedProviderId: true,
        lifecycleStatus: true,
        submissionStatus: true,
        assignedAt: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found.');

    const isAdmin = role === 'ADMIN';
    const isOwner = task.requesterId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'Only task requester or admin can view timeline.',
      );
    }

    const flows = await this.prisma.taskFlow.findMany({
      where: { placementTaskId: taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    type TimelineEvent = {
      id: string;
      actorType: 'REQUESTER' | 'PROVIDER' | 'ADMIN' | 'SYSTEM';
      actor: { id: string; name: string; email: string; role: string } | null;
      fromStatus: string | null;
      toStatus: string;
      actionTaken: string | null;
      uiAction: string;
      note: string | null;
      createdAt: Date;
      updatedAt: Date;
    };

    const timeline: TimelineEvent[] = flows.map((item) => ({
      id: item.id,
      actorType:
        item.actorId === task.requesterId
          ? 'REQUESTER'
          : item.providerId && item.actorId === item.providerId
            ? 'PROVIDER'
            : 'ADMIN',
      actor: item.actor,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      actionTaken: item.actionTaken,
      uiAction: this.mapTimelineAction(item.actionTaken),
      note: item.note,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const shouldShowAwaitingDelivery =
      Boolean(task.selectedProviderId) &&
      ['ASSIGNED', 'IN_PROGRESS'].includes(task.lifecycleStatus) &&
      task.submissionStatus !== 'SUBMITTED';

    if (shouldShowAwaitingDelivery) {
      timeline.push({
        id: 'virtual-awaiting-delivery-submission',
        actorType: 'SYSTEM',
        actor: null,
        fromStatus: task.lifecycleStatus,
        toStatus: task.lifecycleStatus,
        actionTaken: 'AWAITING_DELIVERY_SUBMISSION',
        uiAction: 'AWAITING_DELIVERY_SUBMISSION',
        note: 'Awaiting delivery submission from selected provider.',
        createdAt: task.assignedAt ?? new Date(),
        updatedAt: task.assignedAt ?? new Date(),
      });
    }

    timeline.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

    return sendResponse('Task timeline retrieved successfully.', {
      taskId: task.id,
      currentStatus: task.lifecycleStatus,
      submissionStatus: task.submissionStatus,
      timeline,
    });
  }

  async updateTaskDeadline(
    taskId: string,
    requesterId: string,
    payload: UpdateDeadlineDto,
  ) {
    this.ensureRequestedDeadlineDays(payload.requestedDeadlineDays);
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId)
      throw new ForbiddenException('No permission.');
    if (task.selectedProviderId) {
      throw new BadRequestException(
        'Deadline days can be changed only before provider is selected.',
      );
    }
    if (
      !['DRAFT', 'OPEN', 'WAITING_FOR_APPLICANTS'].includes(
        task.lifecycleStatus,
      )
    ) {
      throw new BadRequestException(
        'Task must be DRAFT/OPEN/WAITING_FOR_APPLICANTS.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedAt = new Date();
      const next = await tx.placementTask.update({
        where: { id: taskId },
        data: { requestedDeadlineDays: payload.requestedDeadlineDays },
      });
      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId,
          providerId: task.selectedProviderId,
          actorId: requesterId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.REQUESTED_DEADLINE_UPDATED,
          actorRole: TaskFlowActorRole.REQUESTER,
          fromStatus: task.lifecycleStatus,
          toStatus: task.lifecycleStatus,
          note: `Requested deadline set to ${payload.requestedDeadlineDays} days.`,
          metadata: {
            requestedDeadlineDays: payload.requestedDeadlineDays,
          } as const,
          eventKey: taskFlowEventKey.requestedDeadlineUpdated(
            task.id,
            requesterId,
            updatedAt,
          ),
        },
        tx,
      );
      return next;
    });

    return sendResponse('Requested deadline updated successfully.', updated);
  }

  async extendDeadline(
    taskId: string,
    requesterId: string,
    payload: ExtendDeadlineDto,
  ) {
    if (!DEADLINE_EXTENSION_DAYS_ENUM.includes(payload.extendDays as never)) {
      throw new BadRequestException(
        `extendDays must be one of: ${DEADLINE_EXTENSION_DAYS_ENUM.join(', ')}`,
      );
    }

    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId)
      throw new ForbiddenException('No permission.');
    if (!task.selectedProviderId) {
      throw new BadRequestException('Task must have selected provider.');
    }
    if (
      !['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED'].includes(
        task.lifecycleStatus,
      )
    ) {
      throw new BadRequestException('Task state does not allow extension.');
    }
    if (task.deadlineExtensionCount >= 3) {
      throw new BadRequestException('Max 3 deadline extensions allowed.');
    }

    if (task.deadlineExtendedDaysTotal + payload.extendDays > 30) {
      throw new BadRequestException('Total extension days cannot exceed 30.');
    }

    const previousDeadline = task.deliveryDeadline;
    const baseDeadline = previousDeadline ?? new Date();
    const newDeadline = new Date(
      baseDeadline.getTime() + payload.extendDays * 24 * 60 * 60 * 1000,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          deliveryDeadline: newDeadline,
          deadlineExtensionCount: { increment: 1 },
          deadlineExtendedDaysTotal: { increment: payload.extendDays },
          deadlineLastExtendedAt: new Date(),
        },
      });

      const extension = await tx.taskDeadlineExtension.create({
        data: {
          placementTaskId: taskId,
          requestedById: requesterId,
          previousDeadline,
          newDeadline,
          extendDays: payload.extendDays,
          reason: payload.reason ?? null,
        },
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId,
          providerId: task.selectedProviderId,
          actorId: requesterId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.DEADLINE_EXTENDED,
          actorRole: TaskFlowActorRole.REQUESTER,
          fromStatus: task.lifecycleStatus,
          toStatus: task.lifecycleStatus,
          note:
            payload.reason ??
            `Requester extended deadline by ${payload.extendDays} day(s).`,
          metadata: {
            previousDeadline: previousDeadline?.toISOString() ?? null,
            newDeadline: newDeadline.toISOString(),
            extendDays: payload.extendDays,
            reason: payload.reason ?? null,
          } as const,
          eventKey: taskFlowEventKey.deadlineExtended(task.id, extension.id),
        },
        tx,
      );

      return next;
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_DEADLINE_EXTENDED,
      task: updated,
      requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: requesterId,
      extraData: {
        previousDeadline: previousDeadline?.toISOString() ?? null,
        newDeadline: newDeadline.toISOString(),
        extendDays: payload.extendDays,
        reason: payload.reason ?? null,
      },
      idempotencyKey: [
        'task-notification-deadline-extended',
        task.id,
        requesterId,
        newDeadline.toISOString(),
      ].join('-'),
    });

    return sendResponse('Deadline extended successfully.', updated);
  }

  async respondDeadlineExtensionRequest(
    taskId: string,
    requestId: string,
    requesterId: string,
    payload: RespondDeadlineExtensionDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId) {
      throw new ForbiddenException('No permission.');
    }

    const request = await this.prisma.taskDeadlineExtension.findFirst({
      where: {
        id: requestId,
        placementTaskId: taskId,
      } as any,
    });
    if (!request) {
      throw new NotFoundException('Deadline extension request not found.');
    }
    if ((request as any).status !== 'PENDING') {
      throw new BadRequestException(
        'Deadline extension request is already resolved.',
      );
    }
    if (
      !task.selectedProviderId ||
      request.requestedById !== task.selectedProviderId
    ) {
      throw new BadRequestException(
        'Only the selected provider deadline request can be resolved.',
      );
    }

    const status = payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.taskDeadlineExtension.update({
        where: { id: requestId },
        data: {
          status,
          responseNote: payload.note ?? null,
          respondedById: requesterId,
          respondedAt: now,
        } as any,
      });

      let updatedTask = task;
      if (payload.action === 'APPROVE') {
        updatedTask = await tx.placementTask.update({
          where: { id: taskId },
          data: {
            deliveryDeadline: request.newDeadline,
            deadlineExtensionCount: { increment: 1 },
            deadlineExtendedDaysTotal: { increment: request.extendDays },
            deadlineLastExtendedAt: now,
            isLate: request.newDeadline < now,
            lateAt: request.newDeadline < now ? now : null,
          },
        });

        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId,
            providerId: task.selectedProviderId,
            actorId: requesterId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: task.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.DEADLINE_EXTENDED,
            actorRole: TaskFlowActorRole.REQUESTER,
            fromStatus: task.lifecycleStatus,
            toStatus: task.lifecycleStatus,
            note:
              payload.note ??
              `Requester approved deadline extension by ${request.extendDays} day(s).`,
            metadata: {
              requestId,
              previousDeadline: request.previousDeadline?.toISOString() ?? null,
              newDeadline: request.newDeadline.toISOString(),
              extendDays: request.extendDays,
              reason: request.reason,
            } as const,
            eventKey: taskFlowEventKey.deadlineExtended(task.id, request.id),
          },
          tx,
        );
      }

      return { updatedTask, updatedRequest };
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger:
        payload.action === 'APPROVE'
          ? TaskNotificationTrigger.PROVIDER_DEADLINE_EXTENDED
          : TaskNotificationTrigger.PROVIDER_DEADLINE_EXTENSION_REJECTED,
      task: result.updatedTask,
      requesterId,
      providerId: task.selectedProviderId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: requesterId,
      extraData: {
        requestId,
        extendDays: request.extendDays,
        previousDeadline: request.previousDeadline?.toISOString() ?? null,
        newDeadline: request.newDeadline.toISOString(),
        reason: request.reason ?? null,
        responseNote: payload.note ?? null,
      },
      idempotencyKey: [
        'task-notification-deadline-response',
        task.id,
        request.id,
        status.toLowerCase(),
      ].join('-'),
    });

    return sendResponse(
      payload.action === 'APPROVE'
        ? 'Deadline extension request approved successfully.'
        : 'Deadline extension request rejected successfully.',
      result,
    );
  }

  async getProviderTrustIndicators(
    requesterId: string,
    providerWebsiteId: string,
  ) {
    const providerWebsite = await this.prisma.website.findUnique({
      where: { id: providerWebsiteId, isDeleted: false },
      select: { id: true, name: true, rootDomain: true, websiteUrl: true },
    });
    if (!providerWebsite)
      throw new NotFoundException('Provider website not found.');

    const indicators =
      await this.trustIndicatorService.getIndicators(providerWebsiteId);

    return sendResponse('Provider trust indicators retrieved successfully.', {
      website: providerWebsite,
      trustIndicators: indicators,
    });
  }

  async submitQualityRubric(
    taskId: string,
    requesterId: string,
    payload: QualityRubricDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId !== requesterId)
      throw new ForbiddenException('No permission.');
    if (task.lifecycleStatus !== 'COMPLETED') {
      throw new BadRequestException(
        'Task must be COMPLETED to submit a quality rubric.',
      );
    }
    if (!task.selectedProviderId || !task.assignedProviderWebsiteId) {
      throw new BadRequestException('Task must have a selected provider.');
    }

    const existingRubric = await (this.prisma as any).qualityRubric.findFirst({
      where: { taskId },
    });
    if (existingRubric) {
      throw new BadRequestException(
        'Quality rubric already submitted for this task.',
      );
    }

    const compositeScore = computeCompositeScore(payload);

    const rubric = await (this.prisma as any).$transaction(async (tx: any) => {
      const created = await tx.qualityRubric.create({
        data: {
          taskId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          requesterWebsiteId: task.requesterWebsiteId,
          contentRelevance: payload.contentRelevance,
          technicalQuality: payload.technicalQuality,
          communication: payload.communication,
          timeliness: payload.timeliness,
          overallSatisfaction: payload.overallSatisfaction,
          compositeScore,
          comments: payload.comments ?? null,
        },
      });

      const profile = await tx.websiteMatchingProfile.findUnique({
        where: { websiteId: task.assignedProviderWebsiteId },
      });

      if (profile) {
        const newQualityRatingSum = profile.qualityRatingSum + compositeScore;
        const ratedCount = profile.completedInteractions || 1;
        const newAvgQualityRating = newQualityRatingSum / ratedCount;

        await tx.websiteMatchingProfile.update({
          where: { websiteId: task.assignedProviderWebsiteId },
          data: {
            qualityRatingSum: newQualityRatingSum,
            avgQualityRating: newAvgQualityRating,
          },
        });
      }

      return created;
    });

    return sendResponse('Quality rubric submitted successfully.', rubric);
  }
}
