import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  TaskFlowActorRole,
  TaskFlowEventType,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { ApplyTaskDto } from './dto/apply-task.dto';
import {
  acquireDomainLock,
  acquirePairLock,
} from '../market-algoritm/concurrency.util';
import { FinalTaskTypeDtoEnum, SubmitTaskDto } from './dto/submit-task.dto';
import { UploadProofDto } from './dto/upload-proof.dto';
import {
  DEADLINE_EXTENSION_DAYS_ENUM,
  ExtendDeadlineDto,
} from '../task-requester/dto/extend-deadline.dto';
import { getPagination } from 'src/common/utils/pagination';
import { CreditTaskService } from 'src/modules/credit/credit-task/credit-task.service';
import { CreditWalletTypeDtoEnum } from 'src/modules/credit/credit-task/dto/task-credit.dto';
import { getMozDomainStats } from 'src/common/utils/moz-domain-stats.util';
import {
  CancelRequestActionDtoEnum,
  RespondCancelRequestDto,
} from './dto/respond-cancel-request.dto';
import { TaskFlowService } from '../task-flow/task-flow.service';
import { taskFlowEventKey } from '../task-flow/task-flow-event-key.util';
import { TaskNotificationService } from 'src/modules/task-notification/task-notification.service';
import { TaskNotificationTrigger } from 'src/modules/task-notification/enums/task-notification-trigger.enum';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';

import { ValidationEngine } from '../market-algoritm/validation.engine';
import {
  MatchingEngine,
  MatchingContext,
  MatchResult,
} from '../market-algoritm/matching.engine';
import { DistributionEngine } from '../market-algoritm/distribution-engine.service';
import { RankingService } from '../market-algoritm/ranking.service';
import { RecommendationService } from '../market-algoritm/recommendation.service';
import { GraduatedPenaltyService } from '../market-algoritm/graduated-penalty.service';
import { TrustIndicatorService } from '../market-algoritm/trust-indicator.service';
import { MarketplaceConfigService } from '../market-algoritm/marketplace-config.service';
import { TierEngine } from '../market-algoritm/tier-engine.service';
import { calculateOpportunityScore } from './utils/scoring-engine.util';
import { MatchingMetadata } from './interfaces/matching-metadata.interface';


@Injectable()
export class ProviderTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditTaskService: CreditTaskService,
    private readonly taskFlowService: TaskFlowService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly s3: AwsS3Service,
    private readonly validationEngine: ValidationEngine,
    private readonly matchingEngine: MatchingEngine,
    private readonly rankingService: RankingService,
    private readonly recommendationService: RecommendationService,
    private readonly graduatedPenaltyService: GraduatedPenaltyService,
    private readonly trustIndicatorService: TrustIndicatorService,
    private readonly marketplaceConfigService: MarketplaceConfigService,
    private readonly distributionEngine: DistributionEngine,
    private readonly tierEngine: TierEngine,
  ) {}

  private readonly activeLifecycleStatuses = [
    'ASSIGNED',
    'IN_PROGRESS',
    'SUBMITTED',
    'REVISION_REQUESTED',
  ];
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
  private resolveStoredWalletType(
    walletType?: string | null,
  ): CreditWalletTypeDtoEnum {
    if (walletType && walletType in CreditWalletTypeDtoEnum) {
      return CreditWalletTypeDtoEnum[walletType];
    }

    return CreditWalletTypeDtoEnum.SUBSCRIPTION;
  }

  /**
   * Coerce an unknown preset value into a non-negative integer, falling back
   * to `fallback` when missing / non-numeric / negative. Guards against bad
   * JSON in the MarketplaceModeConfig preset.
   */
  private safeInt(value: unknown, fallback: number): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.floor(n);
  }

  /**
   * Matching audit logging.
   *
   * This was previously performed *inside* the MatchingEngine. It is relocated
   * here (the orchestrating caller) so the MatchingEngine stays free of
   * analytics responsibilities (spec §1 / Output Validation §10). The engine
   * only produces the data; the caller persists it. Failures are swallowed so
   * analytics never breaks the opportunity response.
   */
  private async writeMatchingAudit(
    providerId: string,
    result: MatchResult,
  ): Promise<void> {
    const { metadata, providerId: pid, websiteId } = result;
    await this.prisma.matchingAuditLog.create({
      data: {
        userId: pid ?? providerId,
        websiteId: websiteId ?? '',
        candidatesEval: metadata.taskCount,
        eligibleMatches: metadata.hardRuleCandidateCount,
        relaxationLevel: metadata.relaxationLevel,
        marketplaceMode: metadata.marketplaceMode,
        processingTimeMs: metadata.processingTimeMs,
        metadata: {
          providerWebsiteCount: metadata.providerWebsiteCount,
          hardRuleCandidateCount: metadata.hardRuleCandidateCount,
        } as any,
      },
    });
  }

  async getProviderOpportunities(
    providerId: string,
    filters: {
      providerWebsiteId?: string;
      placementType?: string;
      linkAttribute?: string;
      status?: string;
      country?: string;
      industry?: string;
      page?: number;
      limit?: number;
      domainPool?: 'LIMITED' | 'IMPROVED' | 'PREMIUM';
      includeOwnTasks?: boolean;
    },
  ) {
    // 1. Resolve provider context (tier, websites, root domains, verification status)
    let tier: 'LIMITED' | 'IMPROVED' | 'PREMIUM' = 'LIMITED';
    try {
      const resolved = await this.tierEngine.resolveTier(providerId);
      if (resolved === 'IMPROVED' || resolved === 'PREMIUM') {
        tier = resolved;
      }
    } catch {
      tier = 'LIMITED';
    }

    const providerWebsites = await this.prisma.website.findMany({
      where: { authorId: providerId, isDeleted: false },
      select: { id: true, rootDomain: true, verificationStatus: true },
    });

    const rootDomains = providerWebsites
      .map((w) => w.rootDomain)
      .filter((d): d is string => Boolean(d));

    const isVerified = providerWebsites.some(
      (w) => w.verificationStatus === 'VERIFIED',
    );

    const provider = {
      id: providerId,
      tier,
      isVerified,
      rootDomains,
    };

    // 2. Query broad candidate pool (minimal DB hard exclusions)

    const where: Prisma.PlacementTaskWhereInput = {
      lifecycleStatus: filters.status
        ? (filters.status as any)
        : { in: ['OPEN', 'WAITING_FOR_APPLICANTS'] as any },
      selectedProviderId: null,
    };

    if (filters.placementType) where.placementType = filters.placementType as any;
    if (filters.linkAttribute) where.linkAttribute = filters.linkAttribute as any;

    if (!filters.includeOwnTasks) {
      where.requesterId = { not: providerId };
    }

    const candidateTasks = await this.prisma.placementTask.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true, imageKey: true } },
      },
    });

    const requesterWebsiteIds = [
      ...new Set(candidateTasks.map((t) => t.requesterWebsiteId).filter(Boolean)),
    ];

    const websiteRows =
      requesterWebsiteIds.length > 0
        ? await this.prisma.website.findMany({
            where: { id: { in: requesterWebsiteIds } },
          })
        : [];
    const websiteMap = new Map(websiteRows.map((w) => [w.id, w]));

    const enrichedCandidateTasks = candidateTasks.map((task) => ({
      ...task,
      requesterWebsite: websiteMap.get(task.requesterWebsiteId) ?? null,
    }));

    const requesterDomains = enrichedCandidateTasks
      .map((t) => t.requesterWebsite?.rootDomain)
      .filter((d): d is string => Boolean(d));

    const cooldownPairs = await this.validationEngine.getCooldownBlockedPairKeys(
      rootDomains,
      requesterDomains,
    );

    // 3. Score every candidate using composite scoring engine
    const scoredCandidates = enrichedCandidateTasks.map((task) => {
      const { score, metadata } = calculateOpportunityScore(
        provider,
        task,
        cooldownPairs,
      );
      return { task, score, metadata };
    });

    // 4. Sort all candidate tasks by composite fit score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 5. Paginate after sorting
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 10);
    const totalItems = scoredCandidates.length;
    const { skip, take, meta } = getPagination(page, limit, totalItems);
    const paginated = scoredCandidates.slice(skip, skip + take);

    // 6. Enrich tasks with trust indicators, file resolutions, and matching metadata
    const tasksWithMeta = paginated.map(({ task, metadata }) => ({
      ...task,
      matchingMetadata: metadata,
    }));

    const pageRequesterWebsiteIds = [
      ...new Set(tasksWithMeta.map((t: any) => t.requesterWebsiteId).filter(Boolean)),
    ];

    let trustIndicatorMap = new Map<string, any>();
    if (this.trustIndicatorService?.getIndicatorsBatch) {
      try {
        trustIndicatorMap =
          await this.trustIndicatorService.getIndicatorsBatch(pageRequesterWebsiteIds);
      } catch {
        /* fallback to empty map on error */
      }
    }

    const items = await Promise.all(
      tasksWithMeta.map(async (taskItem) => {
        const { matchingMetadata, ...taskToMap } = taskItem;
        const trustIndicators =
          trustIndicatorMap.get(taskToMap.requesterWebsiteId) ?? null;
        if (trustIndicators && taskToMap.requesterWebsite) {
          taskToMap.requesterWebsite = {
            ...taskToMap.requesterWebsite,
            trustIndicators,
          } as any;
        }

        const mapped = await this.mapTaskWithResolvedFiles(taskToMap);
        return {
          ...mapped,
          matchingMetadata,
        };
      }),
    );


    return sendResponse('Provider opportunities retrieved successfully.', {
      items,
      meta,
    });
  }

  async getMyApplications(
    providerId: string,
    pagination?: { page?: number; limit?: number },
    filters?: {
      applicationStatus?: string;
      view?: 'ALL' | 'ACTIVE' | 'HISTORY';
    },
  ) {
    const activeStatuses = [
      'APPLIED',
      'SELECTED',
      'ASSIGNED',
      'IN_PROGRESS',
      'SUBMITTED',
      'REVISION_REQUESTED',
    ];
    const historyStatuses = [
      'REJECTED',
      'APPROVED',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
      'FROZEN',
      'DISPUTED',
    ];

    const where: Prisma.PlacementApplicationWhereInput = { providerId };
    if (filters?.applicationStatus) {
      where.status = filters.applicationStatus as any;
    } else if (filters?.view === 'ACTIVE') {
      where.status = { in: activeStatuses as any };
    } else if (filters?.view === 'HISTORY') {
      where.status = { in: historyStatuses as any };
    }

    const totalItems = await this.prisma.placementApplication.count({ where });
    const { skip, take, meta } = getPagination(
      pagination?.page,
      pagination?.limit,
      totalItems,
    );

    const applications = await this.prisma.placementApplication.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        placementTask: {
          include: {
            requester: {
              select: { id: true, name: true, email: true, imageKey: true },
            },
            selectedProvider: {
              select: { id: true, name: true, email: true, imageKey: true },
            },
          },
        },
      },
    });
    const items = await Promise.all(
      applications.map(async (application) => ({
        ...application,
        placementTask: await this.mapTaskWithResolvedFiles(
          application.placementTask,
        ),
      })),
    );

    return sendResponse('Provider applications retrieved successfully.', {
      items,
      meta,
    });
  }

  async getMySelectedTasks(providerId: string) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        selectedProviderId: providerId,
        lifecycleStatus: {
          in: [
            'ASSIGNED',
            'IN_PROGRESS',
            'SUBMITTED',
            'REVISION_REQUESTED',
          ] as any,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
      },
    });
    const items = await Promise.all(
      tasks.map((task) => this.mapTaskWithResolvedFiles(task)),
    );
    return sendResponse(
      'Selected provider tasks retrieved successfully.',
      items,
    );
  }

  async getProviderTaskById(taskId: string, providerId: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');

    const hasApplied = await this.prisma.placementApplication.findFirst({
      where: { placementTaskId: taskId, providerId },
      select: { id: true },
    });
    const isOpenOpportunity = ['OPEN', 'WAITING_FOR_APPLICANTS'].includes(
      task.lifecycleStatus,
    );
    const canAccess =
      isOpenOpportunity ||
      task.selectedProviderId === providerId ||
      Boolean(hasApplied);
    if (!canAccess) {
      throw new ForbiddenException(
        'Provider must be selected provider or applicant for non-open tasks.',
      );
    }

    const detailedTask = await this.prisma.placementTask.findUnique({
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
        mozAnalyticsHistories: {
          orderBy: { date: 'asc' },
        },
        placementApplications: {
          where: { providerId },
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
          where: { OR: [{ providerId }, { actorId: providerId }] },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const taskWithResolvedFiles = detailedTask
      ? await this.mapTaskWithResolvedFiles(detailedTask)
      : detailedTask;

    return sendResponse(
      'Provider task details retrieved successfully.',
      taskWithResolvedFiles,
    );
  }

  async applyToTask(taskId: string, providerId: string, payload: ApplyTaskDto) {
    if (!providerId) {
      throw new UnauthorizedException(
        'Missing authenticated provider context. Please login and include a valid Bearer token.',
      );
    }

    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.requesterId === providerId)
      throw new BadRequestException('Provider must not be requester.');
    if (!['OPEN', 'WAITING_FOR_APPLICANTS'].includes(task.lifecycleStatus)) {
      throw new BadRequestException('Task must be open for applications.');
    }

    const providerWebsite = await this.prisma.website.findFirst({
      where: {
        id: payload.providerWebsiteId,
        authorId: providerId,
        isDeleted: false,
      },
      select: { id: true, rootDomain: true, websiteUrl: true },
    });
    if (!providerWebsite) {
      throw new BadRequestException(
        'providerWebsiteId is invalid, deleted, or not owned by provider.',
      );
    }

    const taskRequesterWebsite = await this.prisma.website.findUnique({
      where: { id: task.requesterWebsiteId },
    });
    if (!taskRequesterWebsite) {
      throw new BadRequestException(
        'Requester website not found for this task.',
      );
    }

    if (task.requiredDomainRating) {
      try {
        const targetDomain =
          providerWebsite.rootDomain || providerWebsite.websiteUrl;
        const stats = await getMozDomainStats(targetDomain);
        const domainAuthority = stats.metrics.domain_authority as number;
        if (domainAuthority < task.requiredDomainRating) {
          throw new BadRequestException(
            `Your Domain Rating (${domainAuthority}) does not meet the task's requirement of ${task.requiredDomainRating}.`,
          );
        }
      } catch (error: any) {
        Logger.warn(
          `Failed to verify Moz domain stats for provider website fit. Target: ${providerWebsite.rootDomain || providerWebsite.websiteUrl}. Error: ${error.message}`,
        );
      }
    }

    const existing = await this.prisma.placementApplication.findFirst({
      where: { placementTaskId: taskId, providerId },
    });
    if (existing)
      throw new BadRequestException('You have already applied to this task.');

    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const pDomain =
          providerWebsite.rootDomain || providerWebsite.websiteUrl;
        const rDomain =
          taskRequesterWebsite.rootDomain || taskRequesterWebsite.websiteUrl;
        if (providerWebsite.rootDomain && taskRequesterWebsite.rootDomain) {
          await acquirePairLock(
            tx,
            providerWebsite.rootDomain,
            taskRequesterWebsite.rootDomain,
          );
        } else if (providerWebsite.rootDomain) {
          await acquireDomainLock(tx, providerWebsite.rootDomain);
        } else if (taskRequesterWebsite.rootDomain) {
          await acquireDomainLock(tx, taskRequesterWebsite.rootDomain);
        }

        const validation = await this.validationEngine.validateTransition(
          {
            stage: 'APPLY',
            actorUserId: providerId,
            providerWebsiteId: payload.providerWebsiteId,
            requesterWebsiteId: task.requesterWebsiteId,
            taskId: taskId,
            providerDomain: pDomain,
            requesterDomain: rDomain,
            task: {
              lifecycleStatus: task.lifecycleStatus,
              requesterId: task.requesterId,
              selectedProviderId: task.selectedProviderId,
            },
          },
          tx,
        );
        if (validation.decision === 'REJECTED') {
          throw new ForbiddenException(validation.publicMessage);
        }

        const created = await tx.placementApplication.create({
          data: {
            providerId,
            providerWebsiteId: payload.providerWebsiteId,
            placementTaskId: taskId,
            status: 'APPLIED',
          },
        });

        if (task.lifecycleStatus === 'OPEN') {
          await tx.placementTask.update({
            where: { id: taskId },
            data: { lifecycleStatus: 'WAITING_FOR_APPLICANTS' },
          });
        }

        // Spec T6: record the timestamp of this successful application so the
        // inter-match spacing check (ValidationEngine MATCH_SPACING) can block the
        // next application within minHoursBetweenMatches. A no-op when the profile
        // does not exist (the upsert in isWebsiteRowMarketplaceEligible creates it).
        await tx.websiteMatchingProfile
          .update({
            where: { websiteId: payload.providerWebsiteId },
            data: { lastApplicationAt: new Date() },
          })
          .catch(() => {});

        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId: task.requesterId,
            providerId,
            actorId: providerId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: payload.providerWebsiteId,
            eventType: TaskFlowEventType.PROVIDER_APPLIED,
            actorRole: TaskFlowActorRole.PROVIDER,
            fromStatus: task.lifecycleStatus,
            toStatus: created.status,
            note: payload.note ?? 'Provider applied to task.',
            metadata: {
              applicationId: created.id,
            } as const,
            eventKey: taskFlowEventKey.providerApplied(task.id, providerId),
          },
          tx,
        );
        return created;
      });
      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.PROVIDER_APPLICATION_SUBMITTED,
        task,
        requesterId: task.requesterId,
        providerId,
        providerWebsiteId: payload.providerWebsiteId,
        actorId: providerId,
        extraData: { applicationId: application.id },
      });

      await this.taskNotificationService.sendTaskNotification({
        trigger: TaskNotificationTrigger.REQUESTER_APPLICATION_RECEIVED,
        task,
        requesterId: task.requesterId,
        providerId,
        providerWebsiteId: payload.providerWebsiteId,
        actorId: providerId,
        extraData: { applicationId: application.id },
      });

      return sendResponse('Applied to the task successfully.', application);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('You have already applied to this task.');
      }

      throw error;
    }
  }

  async requestDeadlineExtension(
    taskId: string,
    providerId: string,
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
    if (task.selectedProviderId !== providerId) {
      throw new ForbiddenException(
        'Only selected provider can request deadline extension.',
      );
    }
    if (!task.deliveryDeadline) {
      throw new BadRequestException(
        'Task does not have a delivery deadline yet.',
      );
    }
    if (
      !['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED'].includes(
        task.lifecycleStatus,
      )
    ) {
      throw new BadRequestException(
        'Task state does not allow deadline extension request.',
      );
    }
    if (task.deadlineExtensionCount >= 3) {
      throw new BadRequestException(
        'Max 3 approved deadline extensions allowed.',
      );
    }
    if (task.deadlineExtendedDaysTotal + payload.extendDays > 30) {
      throw new BadRequestException(
        'Total approved extension days cannot exceed 30.',
      );
    }

    const pendingRequest = await this.prisma.taskDeadlineExtension.findFirst({
      where: {
        placementTaskId: taskId,
        requestedById: providerId,
        status: 'PENDING',
      } as any,
      select: { id: true },
    });
    if (pendingRequest) {
      throw new BadRequestException(
        'You already have a pending deadline extension request.',
      );
    }

    const previousDeadline = task.deliveryDeadline;
    const newDeadline = new Date(
      previousDeadline.getTime() + payload.extendDays * 24 * 60 * 60 * 1000,
    );

    const request = await this.prisma.taskDeadlineExtension.create({
      data: {
        placementTaskId: taskId,
        requestedById: providerId,
        previousDeadline,
        newDeadline,
        extendDays: payload.extendDays,
        reason: payload.reason ?? null,
        status: 'PENDING',
      } as any,
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_DEADLINE_EXTENSION_REQUESTED,
      task,
      requesterId: task.requesterId,
      providerId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: providerId,
      extraData: {
        requestId: request.id,
        previousDeadline: previousDeadline.toISOString(),
        newDeadline: newDeadline.toISOString(),
        extendDays: payload.extendDays,
        reason: payload.reason ?? null,
      },
      idempotencyKey: [
        'task-notification-deadline-request',
        task.id,
        request.id,
      ].join('-'),
    });

    return sendResponse(
      'Deadline extension request submitted successfully.',
      request,
    );
  }

  async submitTask(
    taskId: string,
    providerId: string,
    payload: SubmitTaskDto,
    isResubmission: boolean,
    files?: Express.Multer.File[],
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.selectedProviderId !== providerId) {
      throw new ForbiddenException('Only selected provider can submit.');
    }

    if (
      !isResubmission &&
      !['ASSIGNED', 'IN_PROGRESS'].includes(task.lifecycleStatus)
    ) {
      throw new BadRequestException(
        'Task status must be ASSIGNED or IN_PROGRESS for submit.',
      );
    }
    if (isResubmission && task.lifecycleStatus !== 'REVISION_REQUESTED') {
      throw new BadRequestException(
        'Task status must be REVISION_REQUESTED for resubmit.',
      );
    }
    if (task.placementType !== 'FLEXIBLE' && payload.finalTaskType) {
      throw new BadRequestException(
        'finalTaskType is allowed only for FLEXIBLE task.',
      );
    }
    if (task.placementType === 'FLEXIBLE' && !payload.finalTaskType) {
      throw new BadRequestException(
        'finalTaskType is required for FLEXIBLE task.',
      );
    }

    const allowedProofMime =
      /^(image\/|application\/pdf$|application\/msword$|application\/vnd\.openxmlformats-officedocument|text\/plain$)/i;
    for (const file of files ?? []) {
      if (!allowedProofMime.test(file.mimetype)) {
        throw new BadRequestException(
          'Invalid proof file type. Allowed: image, PDF, DOC, DOCX, TXT.',
        );
      }
    }

    const uploadedProofUrls = await Promise.all(
      (files ?? []).map(async (file) => {
        const uploaded = await this.s3.uploadFileToS3(file, 'task-proof');
        return uploaded.key;
      }),
    );

    const proofLinks = [
      ...uploadedProofUrls,
      ...(payload.proofUrl ? [payload.proofUrl] : []),
    ];

    const now = new Date();
    const isLate = Boolean(
      task.deliveryDeadline && now > task.deliveryDeadline,
    );
    let finalCreditCost = task.placementType === 'GUEST_POST' ? 2 : 1;
    let finalTaskType: 'BACKLINK' | 'GUEST_POST' =
      task.placementType === 'GUEST_POST' ? 'GUEST_POST' : 'BACKLINK';
    if (task.placementType === 'FLEXIBLE') {
      finalCreditCost =
        payload.finalTaskType === FinalTaskTypeDtoEnum.BACKLINK ? 1 : 2;
      finalTaskType =
        payload.finalTaskType === FinalTaskTypeDtoEnum.BACKLINK
          ? 'BACKLINK'
          : 'GUEST_POST';
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'SUBMITTED',
          submissionStatus: 'SUBMITTED',
          submittedAt: now,
          isLate,
          lateAt: isLate ? now : null,
          finalTaskType,
          finalCreditCost,
          providerRewardCredits: finalCreditCost,
          ...(proofLinks.length
            ? { providerProofDocuments: { push: proofLinks } }
            : {}),
        },
      });

      await tx.placementApplication.updateMany({
        where: { providerId, placementTaskId: taskId },
        data: { status: 'SUBMITTED' },
      });

      const eventType = isResubmission
        ? TaskFlowEventType.WORK_RESUBMITTED
        : TaskFlowEventType.WORK_SUBMITTED;

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId,
          actorId: providerId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType,
          actorRole: TaskFlowActorRole.PROVIDER,
          fromStatus: task.lifecycleStatus,
          toStatus: TaskStatus.SUBMITTED,
          note: [
            payload.deliveryMessage,
            payload.additionalNotes
              ? `Additional notes: ${payload.additionalNotes}`
              : null,
          ]
            .filter(Boolean)
            .join(' | '),
          metadata: {
            finalTaskType,
            finalCreditCost,
            providerRewardCredits: finalCreditCost,
            isLate,
            proofCount: proofLinks.length,
          } as const,
          eventKey: isResubmission
            ? taskFlowEventKey.workResubmitted(task.id, providerId, now)
            : taskFlowEventKey.workSubmitted(task.id, providerId, now),
        },
        tx,
      );

      return nextTask;
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_PROOF_SUBMITTED,
      task: await this.mapTaskWithResolvedFiles(updatedTask),
      requesterId: task.requesterId,
      providerId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: providerId,
      extraData: { isResubmission, proofCount: proofLinks.length },
    });

    return sendResponse(
      isResubmission
        ? 'Task resubmitted successfully.'
        : 'Task submitted successfully.',
      updatedTask,
    );
  }

  async startWork(taskId: string, providerId: string) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.selectedProviderId !== providerId) {
      throw new ForbiddenException('Only selected provider can start work.');
    }
    if (task.lifecycleStatus !== 'ASSIGNED') {
      throw new BadRequestException(
        'Task status must be ASSIGNED to start work.',
      );
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: { lifecycleStatus: 'IN_PROGRESS' },
      });

      await tx.placementApplication.updateMany({
        where: { providerId, placementTaskId: taskId },
        data: { status: 'IN_PROGRESS' },
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId,
          actorId: providerId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.WORK_STARTED,
          actorRole: TaskFlowActorRole.PROVIDER,
          fromStatus: TaskStatus.ASSIGNED,
          toStatus: TaskStatus.IN_PROGRESS,
          note: 'Provider started work on assigned task.',
          eventKey: taskFlowEventKey.workStarted(task.id, providerId),
        },
        tx,
      );

      return nextTask;
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_PROVIDER_STARTED_WORK,
      task: await this.mapTaskWithResolvedFiles(updatedTask),
      requesterId: task.requesterId,
      providerId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: providerId,
    });

    return sendResponse('Task moved to in-progress successfully.', updatedTask);
  }

  async getMyRevisions(providerId: string) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        selectedProviderId: providerId,
        lifecycleStatus: 'REVISION_REQUESTED',
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
      },
    });
    const items = await Promise.all(
      tasks.map((task) => this.mapTaskWithResolvedFiles(task)),
    );
    return sendResponse('Task revisions retrieved successfully.', items);
  }

  async getInProgressSelectedTasks(providerId: string) {
    const tasks = await this.prisma.placementTask.findMany({
      where: { selectedProviderId: providerId, lifecycleStatus: 'IN_PROGRESS' },
      orderBy: { updatedAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
      },
    });
    const items = await Promise.all(
      tasks.map((task) => this.mapTaskWithResolvedFiles(task)),
    );
    return sendResponse('In-progress tasks retrieved successfully.', items);
  }

  async getCancelledTasks(providerId: string) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        lifecycleStatus: 'CANCELLED',
        OR: [
          { selectedProviderId: providerId },
          { placementApplications: { some: { providerId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
      },
    });
    const items = await Promise.all(
      tasks.map((task) => this.mapTaskWithResolvedFiles(task)),
    );
    return sendResponse('Cancelled tasks retrieved successfully.', items);
  }

  async getDeadlineStatus(providerId: string) {
    const tasks = await this.prisma.placementTask.findMany({
      where: {
        selectedProviderId: providerId,
        lifecycleStatus: { in: this.activeLifecycleStatuses as any },
        deliveryDeadline: { not: null },
      },
      orderBy: { deliveryDeadline: 'asc' },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
      },
    });

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const upcoming: typeof tasks = [];
    const dueToday: typeof tasks = [];
    const overdue: typeof tasks = [];
    const extended: typeof tasks = [];

    for (const task of tasks) {
      const deadline = task.deliveryDeadline!;
      if (task.deadlineExtensionCount > 0) {
        extended.push(task);
      }

      if (deadline < now) {
        overdue.push(task);
      } else if (deadline >= startOfDay && deadline <= endOfDay) {
        dueToday.push(task);
      } else {
        upcoming.push(task);
      }
    }

    const [
      resolvedUpcoming,
      resolvedDueToday,
      resolvedOverdue,
      resolvedExtended,
    ] = await Promise.all([
      Promise.all(upcoming.map((task) => this.mapTaskWithResolvedFiles(task))),
      Promise.all(dueToday.map((task) => this.mapTaskWithResolvedFiles(task))),
      Promise.all(overdue.map((task) => this.mapTaskWithResolvedFiles(task))),
      Promise.all(extended.map((task) => this.mapTaskWithResolvedFiles(task))),
    ]);

    return sendResponse('Provider deadline status retrieved successfully.', {
      upcoming: resolvedUpcoming,
      dueToday: resolvedDueToday,
      overdue: resolvedOverdue,
      extended: resolvedExtended,
      counts: {
        upcoming: upcoming.length,
        dueToday: dueToday.length,
        overdue: overdue.length,
        extended: extended.length,
      },
    });
  }

  async uploadProof(
    taskId: string,
    providerId: string,
    file: Express.Multer.File,
    payload?: UploadProofDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.selectedProviderId !== providerId) {
      throw new ForbiddenException('Only selected provider can upload proof.');
    }
    if (!this.activeLifecycleStatuses.includes(task.lifecycleStatus)) {
      throw new BadRequestException('Task state does not allow proof upload.');
    }
    const allowedProofMime =
      /^(image\/|application\/pdf$|application\/msword$|application\/vnd\.openxmlformats-officedocument|text\/plain$)/i;
    if (!allowedProofMime.test(file.mimetype)) {
      throw new BadRequestException(
        'Invalid proof file type. Allowed: image, PDF, DOC, DOCX, TXT.',
      );
    }

    const uploaded = await this.s3.uploadFileToS3(file, 'task-proof');
    const proofKey = uploaded.key;
    const proofUrl = uploaded.downloadUrl;
    const now = new Date();

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          providerProofDocuments: { push: proofKey },
        },
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId,
          actorId: providerId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.PROVIDER_PROOF_UPLOADED,
          actorRole: TaskFlowActorRole.PROVIDER,
          fromStatus: task.lifecycleStatus,
          toStatus: task.lifecycleStatus,
          note: payload?.note ?? 'Provider uploaded proof document.',
          metadata: {
            proofKey,
            proofUrl,
            mimeType: file.mimetype,
            originalName: file.originalname,
          } as const,
          eventKey: taskFlowEventKey.providerProofUploaded(
            task.id,
            providerId,
            now,
          ),
        },
        tx,
      );

      return nextTask;
    });

    return sendResponse('Proof uploaded successfully.', {
      proofKey,
      proofUrl,
      task: await this.mapTaskWithResolvedFiles(updatedTask),
    });
  }

  async providerGetTasks(
    providerId: string,
    lifecycleStatus?: string,
    scope: 'SELECTED' | 'APPLIED' | 'INVOLVED' = 'SELECTED',
    page?: number,
    limit?: number,
  ) {
    const validStatuses = [
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
    ];
    if (lifecycleStatus && !validStatuses.includes(lifecycleStatus)) {
      throw new BadRequestException('Invalid lifecycle status.');
    }

    const where: any = {};

    if (scope === 'SELECTED') {
      where.selectedProviderId = providerId;
    } else if (scope === 'APPLIED') {
      where.placementApplications = { some: { providerId } };
    } else {
      where.OR = [
        { selectedProviderId: providerId },
        { placementApplications: { some: { providerId } } },
      ];
    }

    if (lifecycleStatus && lifecycleStatus !== 'ALL') {
      where.lifecycleStatus = lifecycleStatus;
    }

    const totalItems = await this.prisma.placementTask.count({ where });
    const { skip, take, meta } = getPagination(page, limit, totalItems);

    const tasks = await this.prisma.placementTask.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        requester: {
          select: { id: true, name: true, email: true, imageKey: true },
        },
        taskFlows: {
          where: { OR: [{ providerId }, { actorId: providerId }] },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const items = await Promise.all(
      tasks.map((task) => this.mapTaskWithResolvedFiles(task)),
    );

    return sendResponse('Provider tasks fetched successfully.', {
      items,
      meta,
    });
  }

  async respondCancelRequest(
    taskId: string,
    providerId: string,
    payload: RespondCancelRequestDto,
  ) {
    const task = await this.prisma.placementTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.selectedProviderId !== providerId) {
      throw new ForbiddenException(
        'Only selected provider can respond to cancellation request.',
      );
    }
    if (task.cancellationRequestStatus !== 'PENDING') {
      throw new BadRequestException(
        'No pending cancellation request for this task.',
      );
    }

    if (payload.action === CancelRequestActionDtoEnum.REJECT) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const nextTask = await tx.placementTask.update({
          where: { id: taskId },
          data: {
            cancellationRequestStatus: 'REJECTED',
            cancellationRespondedAt: new Date(),
          },
        });

        await this.taskFlowService.recordTaskFlow(
          {
            placementTaskId: taskId,
            requesterId: task.requesterId,
            providerId,
            actorId: providerId,
            requesterWebsiteId: task.requesterWebsiteId,
            providerWebsiteId: task.assignedProviderWebsiteId,
            eventType: TaskFlowEventType.CANCELLATION_REJECTED,
            actorRole: TaskFlowActorRole.PROVIDER,
            fromStatus: task.lifecycleStatus,
            toStatus: task.lifecycleStatus,
            note: payload.note ?? 'Provider rejected cancellation request.',
            metadata: {
              reason: payload.note ?? null,
            } as const,
            eventKey: taskFlowEventKey.cancellationRejected(
              task.id,
              providerId,
            ),
          },
          tx,
        );

        return nextTask;
      });

      await this.taskNotificationService.sendTaskNotification({
        trigger:
          TaskNotificationTrigger.REQUESTER_CANCELLATION_REQUEST_REJECTED,
        task: updated,
        requesterId: task.requesterId,
        providerId,
        providerWebsiteId: task.assignedProviderWebsiteId,
        actorId: providerId,
        extraData: { reason: payload.note ?? null },
        idempotencyKey: [
          'task-notification-cancel-rejected',
          task.id,
          providerId,
          updated.cancellationRespondedAt?.toISOString() ?? 'rejected',
        ].join('-'),
      });

      return sendResponse('Cancellation request rejected.', updated);
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const nextTask = await tx.placementTask.update({
        where: { id: taskId },
        data: {
          lifecycleStatus: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationRequestStatus: 'ACCEPTED',
          cancellationRespondedAt: new Date(),
        },
      });

      await tx.placementApplication.updateMany({
        where: { placementTaskId: taskId, status: { not: 'REJECTED' } },
        data: { status: 'CANCELLED' },
      });

      await this.taskFlowService.recordTaskFlow(
        {
          placementTaskId: taskId,
          requesterId: task.requesterId,
          providerId,
          actorId: providerId,
          requesterWebsiteId: task.requesterWebsiteId,
          providerWebsiteId: task.assignedProviderWebsiteId,
          eventType: TaskFlowEventType.CANCELLATION_ACCEPTED,
          actorRole: TaskFlowActorRole.PROVIDER,
          fromStatus: task.lifecycleStatus,
          toStatus: TaskStatus.CANCELLED,
          note:
            payload.note ??
            'Provider accepted cancellation request. Task cancelled.',
          metadata: {
            reason: payload.note ?? null,
          } as const,
          eventKey: taskFlowEventKey.cancellationAccepted(task.id, providerId),
        },
        tx,
      );

      return nextTask;
    });

    const walletType = this.resolveStoredWalletType(task.walletType);
    await this.creditTaskService.refundTaskCredit(task.requesterId, {
      taskId,
      requesterWebsiteId: task.requesterWebsiteId,
      userId: task.requesterId,
      creditAmount: task.reservedCreditAmount,
      walletType,
      note:
        payload.note ??
        'Requester cancellation accepted by provider. Credits refunded to requester wallet.',
    });
    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.REQUESTER_TASK_CANCELLED,
      task: await this.mapTaskWithResolvedFiles(updatedTask),
      requesterId: task.requesterId,
      providerId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: providerId,
      extraData: { reason: payload.note ?? null },
    });

    await this.taskNotificationService.sendTaskNotification({
      trigger: TaskNotificationTrigger.PROVIDER_TASK_CANCELLED,
      task: await this.mapTaskWithResolvedFiles(updatedTask),
      requesterId: task.requesterId,
      providerId,
      providerWebsiteId: task.assignedProviderWebsiteId,
      actorId: providerId,
      extraData: { reason: payload.note ?? null },
    });

    return sendResponse(
      'Cancellation request accepted. Task cancelled successfully.',
      updatedTask,
    );
  }

  async getMatchHistory(
    providerId: string,
    pagination?: { page?: number; limit?: number },
    filters?: { status?: string },
  ) {
    const providerWebsiteIds = (
      await this.prisma.website.findMany({
        where: { authorId: providerId, isDeleted: false },
        select: { id: true },
      })
    ).map((w) => w.id);

    const where: any = {
      OR: [
        { selectedProviderId: providerId },
        { placementApplications: { some: { providerId } } },
      ],
    };

    if (filters?.status && filters.status !== 'ALL') {
      where.lifecycleStatus = filters.status;
    }

    const totalItems = await this.prisma.placementTask.count({ where });
    const { skip, take, meta } = getPagination(
      pagination?.page,
      pagination?.limit,
      totalItems,
    );

    const tasks = await this.prisma.placementTask.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        placementApplications: {
          where: { providerId },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const items = await Promise.all(
      tasks.map(async (task) => {
        const providerApplication = (task as any).placementApplications?.[0];
        const requesterWebsite = await this.prisma.website.findUnique({
          where: { id: task.requesterWebsiteId },
          select: { id: true, name: true, rootDomain: true, websiteUrl: true },
        });
        const status = task.lifecycleStatus;
        return {
          taskId: task.id,
          projectTitle: task.projectTitle,
          targetUrl: task.targetUrl,
          placementType: task.placementType,
          matchStatus: status,
          matchedAt: task.assignedAt,
          completedAt: task.completedAt,
          cancelledAt: task.cancelledAt,
          isLate: task.isLate,
          applicationStatus: providerApplication?.status ?? null,
          requestedAt: providerApplication?.createdAt ?? null,
          requesterWebsite,
        };
      }),
    );

    return sendResponse('Provider match history retrieved successfully.', {
      items,
      meta,
    });
  }
}
