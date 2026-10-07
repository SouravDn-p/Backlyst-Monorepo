import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BadgeCategory,
  BadgeDefinition,
  BadgeRewardType,
  BadgeRoleScope,
  BadgeScope,
  BadgeTriggerType,
  Prisma,
  RewardAuditActorType,
  UserBadgeStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  AdminBadgeListQueryDto,
  CreateBadgeDefinitionDto,
  RewardBadgeQueryDto,
  UpdateBadgeDefinitionDto,
} from '../dto';
import {
  REWARD_AUDIT_ACTIONS,
  REWARD_AUDIT_SOURCES,
} from '../enums';
import { BadgeRuleEvaluatorService } from './badge-rule-evaluator.service';
import {
  RewardAuditRequestContext,
  RewardAuditService,
} from './reward-audit.service';
import { UserRewardProfileService } from './user-reward-profile.service';

const SUPPORTED_REWARD_TYPES = new Set<BadgeRewardType>([
  BadgeRewardType.RECOGNITION_ONLY,
  BadgeRewardType.TASK_CREDIT,
  BadgeRewardType.VISIBILITY_BOOST,
  BadgeRewardType.PRIORITY_BOOST,
  BadgeRewardType.SUPPORT_PRIORITY,
]);

type DefaultBadgeSeed = Omit<Prisma.BadgeDefinitionUncheckedCreateInput, 'id'>;

const DEFAULT_BADGES: DefaultBadgeSeed[] = [
  {
    code: 'VERIFIED',
    name: 'Verified',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.ACCOUNT_VERIFIED,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    requirementText: 'Complete account or domain verification',
    rewardImpactText: 'Trust badge display',
  },
  {
    code: 'FIRST_SUCCESS',
    name: 'First Success',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.FIRST_SUCCESS,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    threshold: 1,
    requirementText: 'Complete the first approved marketplace task',
    rewardImpactText: 'Permanent achievement badge',
  },
  {
    code: 'FAST_RESPONDER',
    name: 'Fast Responder',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.PROVIDER,
    badgeScope: BadgeScope.PROVIDER_PROFILE,
    triggerType: BadgeTriggerType.RESPONSE_TIME,
    isPersistent: false,
    rewardType: BadgeRewardType.PRIORITY_BOOST,
    threshold: 80,
    secondaryThreshold: 5,
    validityDays: 90,
    refreshWindowDays: 7,
    gracePeriodDays: 14,
    requirementText:
      'Respond to 80%+ provider opportunities within 24 hours, minimum 5 opportunities',
    rewardImpactText: 'Ranking priority boost',
  },
  {
    code: 'HIGH_APPROVAL',
    name: 'High Approval',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.PROVIDER,
    badgeScope: BadgeScope.PROVIDER_PROFILE,
    triggerType: BadgeTriggerType.APPROVAL_RATE,
    isPersistent: false,
    rewardType: BadgeRewardType.VISIBILITY_BOOST,
    threshold: 90,
    secondaryThreshold: 10,
    validityDays: 90,
    refreshWindowDays: 7,
    gracePeriodDays: 14,
    requirementText: 'Maintain 90%+ approval rate over at least 10 reviewed provider tasks',
    rewardImpactText: 'Visibility boost',
  },
  {
    code: 'TOP_CONTRIBUTOR',
    name: 'Top Contributor',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.PROVIDER,
    badgeScope: BadgeScope.PROVIDER_PROFILE,
    triggerType: BadgeTriggerType.VERIFIED_TASK_COUNT,
    isPersistent: false,
    rewardType: BadgeRewardType.PRIORITY_BOOST,
    threshold: 20,
    secondaryThreshold: 90,
    validityDays: 90,
    refreshWindowDays: 7,
    gracePeriodDays: 14,
    requirementText:
      '20+ approved provider tasks, 90%+ approval, dispute rate <= 5%, and 5+ unique requesters or domains',
    rewardImpactText: 'Priority visibility',
  },
  {
    code: 'TRUSTED_PARTNER',
    name: 'Trusted Partner',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.PROVIDER,
    badgeScope: BadgeScope.PROVIDER_PROFILE,
    triggerType: BadgeTriggerType.LOW_DISPUTE,
    isPersistent: false,
    rewardType: BadgeRewardType.SUPPORT_PRIORITY,
    threshold: 50,
    secondaryThreshold: 95,
    validityDays: 120,
    refreshWindowDays: 14,
    gracePeriodDays: 14,
    requirementText:
      '50+ approved provider tasks, 95%+ approval, dispute rate <= 2%, revision rate <= 15%, and no serious active disputes',
    rewardImpactText: 'Priority support handling',
  },
  {
    code: 'CONSISTENT_CONTRIBUTOR',
    name: 'Consistent Contributor',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.PROVIDER,
    badgeScope: BadgeScope.PROVIDER_PROFILE,
    triggerType: BadgeTriggerType.STREAK,
    isPersistent: false,
    rewardType: BadgeRewardType.VISIBILITY_BOOST,
    threshold: 3,
    secondaryThreshold: 6,
    validityDays: 90,
    refreshWindowDays: 7,
    gracePeriodDays: 14,
    requirementText: 'Approved activity in 3 different weeks within the last 6 weeks',
    rewardImpactText: 'Consistency visibility boost',
  },
  {
    code: 'LOW_DISPUTE_PROVIDER',
    name: 'Low Dispute Provider',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.PROVIDER,
    badgeScope: BadgeScope.PROVIDER_PROFILE,
    triggerType: BadgeTriggerType.DISPUTE_RATE,
    isPersistent: false,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    threshold: 10,
    secondaryThreshold: 5,
    validityDays: 90,
    refreshWindowDays: 7,
    gracePeriodDays: 14,
    requirementText: '10+ approved provider tasks with dispute rate <= 5% and no unresolved serious disputes',
    rewardImpactText: 'Trust badge display',
  },
  {
    code: 'RELIABLE_REQUESTER',
    name: 'Reliable Requester',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.REQUESTER,
    badgeScope: BadgeScope.REQUESTER_PROFILE,
    triggerType: BadgeTriggerType.REVIEW_TIME,
    isPersistent: false,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    threshold: 10,
    secondaryThreshold: 85,
    validityDays: 90,
    refreshWindowDays: 7,
    gracePeriodDays: 14,
    requirementText:
      '10+ completed requester tasks, 85%+ completion quality, low disputes, and timely reviews',
    rewardImpactText: 'Requester trust badge',
  },
  {
    code: 'FAST_REVIEWER',
    name: 'Fast Reviewer',
    category: BadgeCategory.MARKETPLACE,
    roleScope: BadgeRoleScope.REQUESTER,
    badgeScope: BadgeScope.REQUESTER_PROFILE,
    triggerType: BadgeTriggerType.REVIEW_TIME,
    isPersistent: false,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    threshold: 80,
    secondaryThreshold: 5,
    validityDays: 90,
    refreshWindowDays: 7,
    gracePeriodDays: 14,
    requirementText: 'Complete 80%+ reviews within 72 hours, minimum 5 review opportunities',
    rewardImpactText: 'Requester responsiveness badge',
  },
  {
    code: 'FOUNDING_MEMBER',
    name: 'Founding Member',
    category: BadgeCategory.KICKSTARTER,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.KICKSTARTER_TIER,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    requirementText: 'Kickstarter founding member recognition',
    rewardImpactText: 'Permanent founding badge',
  },
  {
    code: 'FOUNDING_PLUS',
    name: 'Founding Plus',
    category: BadgeCategory.KICKSTARTER,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.KICKSTARTER_TIER,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
  },
  {
    code: 'FOUNDING_BUSINESS',
    name: 'Founding Business',
    category: BadgeCategory.KICKSTARTER,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.KICKSTARTER_TIER,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
  },
  {
    code: 'FOUNDING_PARTNER',
    name: 'Founding Partner',
    category: BadgeCategory.KICKSTARTER,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.KICKSTARTER_TIER,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
  },
  {
    code: 'FOUNDING_AMBASSADOR',
    name: 'Founding Ambassador',
    category: BadgeCategory.KICKSTARTER,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.KICKSTARTER_TIER,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
  },
  {
    code: 'APPROVED_TASKS_100',
    name: '100 Approved Tasks',
    category: BadgeCategory.HALL_OF_FAME,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.HALL_OF_FAME,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    threshold: 100,
    requirementText: 'Reach 100 approved completed tasks',
    rewardImpactText: 'Permanent Hall of Fame achievement',
  },
  {
    code: 'APPROVED_TASKS_500',
    name: '500 Approved Tasks',
    category: BadgeCategory.HALL_OF_FAME,
    roleScope: BadgeRoleScope.ANY,
    badgeScope: BadgeScope.USER_PROFILE,
    triggerType: BadgeTriggerType.HALL_OF_FAME,
    isPersistent: true,
    rewardType: BadgeRewardType.RECOGNITION_ONLY,
    threshold: 500,
    requirementText: 'Reach 500 approved completed tasks',
    rewardImpactText: 'Permanent Hall of Fame achievement',
  },
];

@Injectable()
export class BadgeDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRewardProfileService: UserRewardProfileService,
    private readonly badgeRuleEvaluatorService: BadgeRuleEvaluatorService,
    private readonly rewardAuditService: RewardAuditService,
  ) {}

  async getAdminBadges(query: AdminBadgeListQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BadgeDefinitionWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.roleScope ? { roleScope: query.roleScope } : {}),
      ...(query.rewardType ? { rewardType: query.rewardType } : {}),
      ...(query.triggerType ? { triggerType: query.triggerType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [badges, total] = await Promise.all([
      this.prisma.badgeDefinition.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.badgeDefinition.count({ where }),
    ]);

    const data = await Promise.all(
      badges.map(async (badge) => {
        const [earnedCount, activeCount] = await Promise.all([
          this.prisma.userBadge.count({
            where: {
              badgeId: badge.id,
              status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
            },
          }),
          this.prisma.userBadge.count({
            where: {
              badgeId: badge.id,
              status: UserBadgeStatus.ACTIVE,
            },
          }),
        ]);

        return {
          id: badge.id,
          code: badge.code,
          name: badge.name,
          category: badge.category,
          roleScope: badge.roleScope,
          triggerType: badge.triggerType,
          rewardType: badge.rewardType,
          isActive: badge.isActive,
          isPermanent: badge.isPersistent,
          validityDays: badge.validityDays ?? null,
          earnedCount,
          activeCount,
          createdAt: badge.createdAt,
          updatedAt: badge.updatedAt,
        };
      }),
    );

    return sendResponse('Reward badge definitions fetched successfully.', {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  }

  async getAdminBadgeById(id: string) {
    const badge = await this.prisma.badgeDefinition.findUnique({
      where: { id },
    });

    if (!badge) {
      throw new NotFoundException('Badge definition not found.');
    }

    return sendResponse('Reward badge definition fetched successfully.', badge);
  }

  async createAdminBadge(
    dto: CreateBadgeDefinitionDto,
    adminId?: string,
    requestContext?: RewardAuditRequestContext,
  ) {
    this.assertSupportedRewardType(dto.rewardType);

    const code = dto.code.trim().toUpperCase();
    const exists = await this.prisma.badgeDefinition.findUnique({
      where: { code },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('Badge code already exists.');
    }

    const badge = await this.prisma.badgeDefinition.create({
      data: this.toCreateInput({ ...dto, code }),
    });

    await this.rewardAuditService.recordSuccess({
      action: REWARD_AUDIT_ACTIONS.BADGE_DEFINITION_CREATED,
      actorType: RewardAuditActorType.ADMIN,
      actorId: adminId ?? null,
      badgeDefinitionId: badge.id,
      source: REWARD_AUDIT_SOURCES.ADMIN_PANEL,
      reason: 'Badge definition created.',
      newValue: this.toAuditBadgeSnapshot(badge),
      requestContext,
    });

    return sendResponse('Reward badge definition created successfully.', badge);
  }

  async updateAdminBadge(
    id: string,
    dto: UpdateBadgeDefinitionDto,
    adminId?: string,
    requestContext?: RewardAuditRequestContext,
  ) {
    const existing = await this.ensureBadgeExists(id);

    this.assertSupportedRewardType(dto.rewardType);

    const safeData: Prisma.BadgeDefinitionUncheckedUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.requirementText !== undefined
        ? { requirementText: dto.requirementText }
        : {}),
      ...(dto.rewardImpactText !== undefined
        ? { rewardImpactText: dto.rewardImpactText }
        : {}),
      ...(dto.threshold !== undefined ? { threshold: dto.threshold } : {}),
      ...(dto.secondaryThreshold !== undefined
        ? { secondaryThreshold: dto.secondaryThreshold }
        : {}),
      ...(dto.isPersistent !== undefined
        ? { isPersistent: dto.isPersistent }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.rewardType !== undefined ? { rewardType: dto.rewardType } : {}),
      ...(dto.rewardValue !== undefined ? { rewardValue: dto.rewardValue } : {}),
      ...(dto.rewardMeta !== undefined
        ? { rewardMeta: dto.rewardMeta as Prisma.InputJsonValue }
        : {}),
      ...(dto.validityDays !== undefined
        ? { validityDays: dto.validityDays }
        : {}),
      ...(dto.refreshWindowDays !== undefined
        ? { refreshWindowDays: dto.refreshWindowDays }
        : {}),
      ...(dto.gracePeriodDays !== undefined
        ? { gracePeriodDays: dto.gracePeriodDays }
        : {}),
    };

    const badge = await this.prisma.badgeDefinition.update({
      where: { id },
      data: safeData,
    });

    await this.rewardAuditService.recordSuccess({
      action: REWARD_AUDIT_ACTIONS.BADGE_DEFINITION_UPDATED,
      actorType: RewardAuditActorType.ADMIN,
      actorId: adminId ?? null,
      badgeDefinitionId: badge.id,
      source: REWARD_AUDIT_SOURCES.ADMIN_PANEL,
      reason: 'Badge definition updated.',
      oldValue: this.toAuditBadgeSnapshot(existing),
      newValue: this.toAuditBadgeSnapshot(badge),
      requestContext,
    });

    return sendResponse('Reward badge definition updated successfully.', badge);
  }

  async softDeleteAdminBadge(
    id: string,
    adminId?: string,
    requestContext?: RewardAuditRequestContext,
  ) {
    const existing = await this.ensureBadgeExists(id);

    const badge = await this.prisma.badgeDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    await this.rewardAuditService.recordSuccess({
      action: REWARD_AUDIT_ACTIONS.BADGE_DEFINITION_DISABLED,
      actorType: RewardAuditActorType.ADMIN,
      actorId: adminId ?? null,
      badgeDefinitionId: badge.id,
      source: REWARD_AUDIT_SOURCES.ADMIN_PANEL,
      reason: 'Badge definition disabled.',
      oldValue: this.toAuditBadgeSnapshot(existing),
      newValue: this.toAuditBadgeSnapshot(badge),
      requestContext,
    });

    return sendResponse('Reward badge definition disabled successfully.', badge);
  }

  async ensureDefaultBadges(
    adminId?: string,
    requestContext?: RewardAuditRequestContext,
  ) {
    let created = 0;
    const updated = 0;
    let skipped = 0;

    for (const definition of DEFAULT_BADGES) {
      const existing = await this.prisma.badgeDefinition.findUnique({
        where: { code: definition.code },
      });

      if (!existing) {
        await this.prisma.badgeDefinition.create({
          data: definition,
        });
        created += 1;
        continue;
      }

      skipped += 1;
    }

    const result = { created, updated, skipped };

    await this.rewardAuditService.recordSuccess({
      action: REWARD_AUDIT_ACTIONS.BADGE_DEFAULTS_SEEDED,
      actorType: RewardAuditActorType.ADMIN,
      actorId: adminId ?? null,
      source: REWARD_AUDIT_SOURCES.ADMIN_PANEL,
      reason: 'Default badge definitions seeded.',
      metadata: result,
      requestContext,
    });

    return result;
  }

  async getMyBadges(userId: string, query?: RewardBadgeQueryDto) {
    return sendResponse(
      'Reward badges fetched successfully.',
      await this.getMyBadgesData(userId, query),
    );
  }

  async getMyBadgesData(userId: string, query?: RewardBadgeQueryDto) {
    const [profile, user, definitions, userBadges] = await Promise.all([
      this.userRewardProfileService.getOrCreateProfile(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isVerified: true },
      }),
      this.prisma.badgeDefinition.findMany({
        where: {
          OR: [{ isActive: true }, { userBadges: { some: { userId } } }],
        },
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.userBadge.findMany({
        where: { userId },
      }),
    ]);

    const badgeMap = new Map(userBadges.map((badge) => [badge.badgeId, badge]));
    const groups = {
      all: [] as Record<string, unknown>[],
      items: [] as Record<string, unknown>[],
      earned: [] as Record<string, unknown>[],
      active: [] as Record<string, unknown>[],
      eligible: [] as Record<string, unknown>[],
      locked: [] as Record<string, unknown>[],
      inactive: [] as Record<string, unknown>[],
      kickstarter: [] as Record<string, unknown>[],
      hallOfFame: [] as Record<string, unknown>[],
      revoked: [] as Record<string, unknown>[],
    };

    for (const definition of definitions) {
      const current = badgeMap.get(definition.id);
      const evaluation = this.badgeRuleEvaluatorService.evaluate(
        definition,
        profile,
        {
          userIsVerified: user?.isVerified ?? false,
          currentStatus: current?.status,
        },
      );

      const item = this.toBadgeCard(definition, current, evaluation);
      groups.all.push(item);

      if (item.status === UserBadgeStatus.REVOKED) {
        groups.revoked.push(item);
      }

      if (definition.category === BadgeCategory.KICKSTARTER) {
        groups.kickstarter.push(item);
        continue;
      }

      if (definition.category === BadgeCategory.HALL_OF_FAME) {
        groups.hallOfFame.push(item);
        continue;
      }

      if (item.status === UserBadgeStatus.EARNED) {
        groups.earned.push(item);
      } else if (item.status === UserBadgeStatus.ACTIVE) {
        groups.active.push(item);
      } else if (item.status === UserBadgeStatus.ELIGIBLE) {
        groups.eligible.push(item);
      } else if (item.status === UserBadgeStatus.INACTIVE) {
        groups.inactive.push(item);
      } else if (item.status !== UserBadgeStatus.REVOKED) {
        groups.locked.push(item);
      }
    }

    const filtered = groups.all.filter((item) => {
      const matchesStatus = query?.status ? item.status === query.status : true;
      const matchesCategory = query?.category ? item.category === query.category : true;
      return matchesStatus && matchesCategory;
    });

    groups.items = filtered;
    groups.all = filtered;

    return groups;
  }

  private toBadgeCard(
    definition: BadgeDefinition,
    current:
      | {
          badgeId: string;
          status: UserBadgeStatus;
          metadata: Prisma.JsonValue;
          earnedAt: Date | null;
          activatedAt: Date | null;
          expiresAt: Date | null;
          revokedAt: Date | null;
          lastEvaluatedAt?: Date | null;
        }
      | undefined,
    evaluation: { progress: Record<string, unknown>; status: string },
  ) {
    const status = current?.status ?? (evaluation.status as UserBadgeStatus);
    const rawProgress =
      current?.metadata && typeof current.metadata === 'object'
        ? ((current.metadata as Record<string, unknown>).progress ?? evaluation.progress)
        : evaluation.progress;
    const progress = this.normalizeBadgeProgress(
      rawProgress,
      definition.requirementText ?? null,
    );

    return {
      badgeId: definition.id,
      code: definition.code,
      name: definition.name,
      description: definition.description ?? null,
      category: definition.category,
      roleScope: definition.roleScope,
      status,
      isPermanent: definition.isPersistent,
      isDynamic: !definition.isPersistent,
      iconKey: null,
      iconUrl: null,
      requirementText: definition.requirementText ?? null,
      rewardType: definition.rewardType,
      rewardValue: definition.rewardValue ?? null,
      benefitText: definition.rewardImpactText ?? null,
      progress,
      progressLabel: progress?.label ?? null,
      earnedAt: current?.earnedAt ?? null,
      activatedAt: current?.activatedAt ?? null,
      expiresAt: current?.expiresAt ?? null,
      lastEvaluatedAt: current?.lastEvaluatedAt ?? null,
      revokedAt: current?.revokedAt ?? null,
      triggerType: definition.triggerType,
      badgeScope: definition.badgeScope,
    };
  }

  private normalizeBadgeProgress(
    rawProgress: unknown,
    requirementText: string | null,
  ) {
    if (!rawProgress || typeof rawProgress !== 'object') {
      return null;
    }

    const progress = rawProgress as Record<string, unknown>;
    const current = typeof progress.current === 'number'
      ? progress.current
      : typeof progress.approvedTasks === 'number'
        ? progress.approvedTasks
        : typeof progress.reviewed === 'number'
          ? progress.reviewed
          : typeof progress.currentStreak === 'number'
            ? progress.currentStreak
            : null;
    const target = typeof progress.target === 'number'
      ? progress.target
      : typeof progress.threshold === 'number'
        ? progress.threshold
        : typeof progress.minReviewed === 'number'
          ? progress.minReviewed
          : typeof progress.minApproved === 'number'
            ? progress.minApproved
            : null;
    const percentage = current !== null && target && target > 0
      ? Math.min(100, Math.round((current / target) * 100))
      : null;
    const label = current !== null && target !== null
      ? [String(current), '/', String(target), requirementText ?? ''].join(' ').trim()
      : requirementText;

    return {
      current,
      target,
      percentage,
      label,
      details: progress,
    };
  }

  private assertSupportedRewardType(rewardType?: BadgeRewardType) {
    if (rewardType && !SUPPORTED_REWARD_TYPES.has(rewardType)) {
      throw new BadRequestException('Unsupported badge reward type.');
    }
  }

  private async ensureBadgeExists(id: string) {
    const exists = await this.prisma.badgeDefinition.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException('Badge definition not found.');
    }

    return exists;
  }

  private toAuditBadgeSnapshot(badge: Partial<BadgeDefinition> | null | undefined) {
    if (!badge) {
      return null;
    }

    return {
      id: badge.id ?? null,
      code: badge.code ?? null,
      name: badge.name ?? null,
      description: badge.description ?? null,
      category: badge.category ?? null,
      triggerType: badge.triggerType ?? null,
      rewardType: badge.rewardType ?? null,
      rewardValue: badge.rewardValue ?? null,
      threshold: badge.threshold ?? null,
      secondaryThreshold: badge.secondaryThreshold ?? null,
      isPersistent: badge.isPersistent ?? null,
      isActive: badge.isActive ?? null,
      validityDays: badge.validityDays ?? null,
      refreshWindowDays: badge.refreshWindowDays ?? null,
      gracePeriodDays: badge.gracePeriodDays ?? null,
      roleScope: badge.roleScope ?? null,
      badgeScope: badge.badgeScope ?? null,
    };
  }

  private toCreateInput(
    dto: CreateBadgeDefinitionDto,
  ): Prisma.BadgeDefinitionUncheckedCreateInput {
    return {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      category: dto.category ?? BadgeCategory.MARKETPLACE,
      requirementText: dto.requirementText,
      rewardImpactText: dto.rewardImpactText,
      badgeScope: dto.badgeScope ?? BadgeScope.USER_PROFILE,
      roleScope: dto.roleScope ?? BadgeRoleScope.ANY,
      triggerType: dto.triggerType,
      threshold: dto.threshold,
      secondaryThreshold: dto.secondaryThreshold,
      isPersistent: dto.isPersistent ?? true,
      isActive: dto.isActive ?? true,
      rewardType: dto.rewardType ?? BadgeRewardType.RECOGNITION_ONLY,
      rewardValue: dto.rewardValue,
      rewardMeta: dto.rewardMeta as Prisma.InputJsonValue | undefined,
      validityDays: dto.validityDays,
      refreshWindowDays: dto.refreshWindowDays,
      gracePeriodDays: dto.gracePeriodDays,
    };
  }
}
