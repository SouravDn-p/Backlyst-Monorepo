import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BadgeCategory,
  BadgeDefinition,
  BadgeTriggerType,
  Prisma,
  RewardAuditActorType,
  RewardBenefitStatus,
  RewardLedgerType,
  UserBadgeStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  REWARD_AUDIT_ACTIONS,
  REWARD_AUDIT_SOURCES,
} from '../enums';
import { BadgeRuleEvaluatorService } from './badge-rule-evaluator.service';
import { BadgeRewardImpactService } from './badge-reward-impact.service';
import { RewardAuditRecordInput, RewardAuditRequestContext, RewardAuditService } from './reward-audit.service';
import { RewardLedgerService } from './reward-ledger.service';
import { RewardNotificationService } from './reward-notification.service';
import { UserRewardProfileService } from './user-reward-profile.service';

type AssignBadgeInput = {
  userId: string;
  badgeId?: string;
  badgeCode?: string;
  adminId?: string;
  reason: string;
  metadata?: Record<string, any>;
  overridePerformanceBadge?: boolean;
  requestContext?: RewardAuditRequestContext;
};

type RevokeBadgeInput = {
  userId: string;
  badgeId?: string;
  badgeCode?: string;
  adminId?: string;
  reason: string;
  metadata?: Record<string, any>;
  requestContext?: RewardAuditRequestContext;
};

@Injectable()
export class AdminBadgeAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeRuleEvaluatorService: BadgeRuleEvaluatorService,
    private readonly badgeRewardImpactService: BadgeRewardImpactService,
    private readonly rewardLedgerService: RewardLedgerService,
    private readonly userRewardProfileService: UserRewardProfileService,
    private readonly rewardAuditService: RewardAuditService,
    private readonly rewardNotificationService: RewardNotificationService,
  ) {}

  async getAdminUserRewardDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const profile = await this.userRewardProfileService.getOrCreateProfile(userId);
    const [userBadges, benefits, recentLedger, ledgerSummary, definitions, recentAuditLogs] =
      await Promise.all([
        this.prisma.userBadge.findMany({
          where: { userId },
          include: { badge: true },
          orderBy: [{ updatedAt: 'desc' }],
        }),
        this.prisma.userRewardBenefit.findMany({
          where: { userId },
          include: {
            sourceBadge: {
              select: { id: true, code: true, name: true },
            },
          },
          orderBy: [{ updatedAt: 'desc' }],
        }),
        this.prisma.rewardLedger.findMany({
          where: { userId },
          include: {
            badge: { select: { id: true, code: true, name: true } },
            task: { select: { id: true, projectTitle: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.rewardLedgerService.getUserLedgerSummaryData(userId),
        this.prisma.badgeDefinition.findMany({
          where: {
            OR: [{ isActive: true }, { userBadges: { some: { userId } } }],
          },
          orderBy: [{ category: 'asc' }, { code: 'asc' }],
        }),
        this.prisma.rewardAuditLog.findMany({
          where: { targetUserId: userId },
          include: {
            actor: { select: { id: true, name: true } },
            badgeDefinition: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const badgeMap = new Map(userBadges.map((item) => [item.badgeId, item]));
    const groupedBadges = {
      earned: [] as any[],
      active: [] as any[],
      eligible: [] as any[],
      locked: [] as any[],
      inactive: [] as any[],
      kickstarter: [] as any[],
      hallOfFame: [] as any[],
      revoked: [] as any[],
    };

    for (const definition of definitions) {
      const current = badgeMap.get(definition.id);
      const evaluation = this.badgeRuleEvaluatorService.evaluate(definition, profile, {
        userIsVerified: user.isVerified,
        currentStatus: current?.status,
      });

      const status = current?.status ?? evaluation.status;
      const item = {
        badgeId: definition.id,
        code: definition.code,
        name: definition.name,
        description: definition.description ?? null,
        category: definition.category,
        status,
        roleScope: definition.roleScope,
        triggerType: definition.triggerType,
        isPermanent: definition.isPersistent,
        isDynamic: !definition.isPersistent,
        requirementText: definition.requirementText ?? null,
        rewardType: definition.rewardType,
        rewardValue: definition.rewardValue ?? null,
        benefitText: definition.rewardImpactText ?? null,
        progress:
          current?.metadata && typeof current.metadata === 'object'
            ? ((current.metadata as Record<string, unknown>).progress ?? evaluation.progress)
            : evaluation.progress,
        earnedAt: current?.earnedAt ?? null,
        activatedAt: current?.activatedAt ?? null,
        deactivatedAt: current?.deactivatedAt ?? null,
        revokedAt: current?.revokedAt ?? null,
        expiresAt: current?.expiresAt ?? null,
        lastEvaluatedAt: current?.lastEvaluatedAt ?? null,
        metadata: current?.metadata ?? null,
      };

      if (status === UserBadgeStatus.REVOKED) {
        groupedBadges.revoked.push(item);
      }

      if (definition.category === BadgeCategory.KICKSTARTER) {
        groupedBadges.kickstarter.push(item);
        continue;
      }

      if (definition.category === BadgeCategory.HALL_OF_FAME) {
        groupedBadges.hallOfFame.push(item);
        continue;
      }

      if (status === UserBadgeStatus.EARNED) {
        groupedBadges.earned.push(item);
      } else if (status === UserBadgeStatus.ACTIVE) {
        groupedBadges.active.push(item);
      } else if (status === UserBadgeStatus.ELIGIBLE) {
        groupedBadges.eligible.push(item);
      } else if (status === UserBadgeStatus.INACTIVE) {
        groupedBadges.inactive.push(item);
      } else if (status !== UserBadgeStatus.REVOKED) {
        groupedBadges.locked.push(item);
      }
    }

    const activeBenefits = benefits.filter(
      (benefit) => benefit.status === RewardBenefitStatus.ACTIVE,
    );
    const inactiveBenefits = benefits.filter(
      (benefit) => benefit.status === RewardBenefitStatus.INACTIVE,
    );
    const expiredBenefits = benefits.filter(
      (benefit) => benefit.status === RewardBenefitStatus.EXPIRED,
    );
    const revokedBenefits = benefits.filter(
      (benefit) => benefit.status === RewardBenefitStatus.REVOKED,
    );
    const earnedOrActiveBadges = userBadges.filter(
      (badge) =>
        badge.status === UserBadgeStatus.EARNED ||
        badge.status === UserBadgeStatus.ACTIVE,
    );
    const kickstarterAssignedBadges = earnedOrActiveBadges.filter(
      (badge) => badge.badge.category === BadgeCategory.KICKSTARTER,
    );
    const hallOfFameAssignedBadges = earnedOrActiveBadges.filter(
      (badge) => badge.badge.category === BadgeCategory.HALL_OF_FAME,
    );
    const activeBadgeCount = userBadges.filter(
      (badge) => badge.status === UserBadgeStatus.ACTIVE,
    ).length;
    const inactiveBadgeCount = userBadges.filter(
      (badge) => badge.status === UserBadgeStatus.INACTIVE,
    ).length;
    const revokedBadgeCount = userBadges.filter(
      (badge) => badge.status === UserBadgeStatus.REVOKED,
    ).length;

    const availableManualBadges = definitions.filter(
      (badge) => badge.isActive && badge.category === BadgeCategory.MARKETPLACE,
    );
    const availableKickstarterBadges = definitions.filter(
      (badge) => badge.isActive && badge.category === BadgeCategory.KICKSTARTER,
    );
    const availableHallOfFameBadges = definitions.filter(
      (badge) => badge.isActive && badge.category === BadgeCategory.HALL_OF_FAME,
    );

    return sendResponse('Admin user reward state fetched successfully.', {
      user,
      profile,
      badges: groupedBadges,
      benefits: {
        active: activeBenefits,
        inactive: inactiveBenefits,
        expired: expiredBenefits,
        revoked: revokedBenefits,
      },
      recentLedger,
      recentAuditLogs,
      ledgerSummary,
      availableManualBadges,
      availableKickstarterBadges,
      availableHallOfFameBadges,
      assignmentSummary: {
        manualAssignableCount: availableManualBadges.length,
        kickstarterAssignableCount: availableKickstarterBadges.length,
        hallOfFameAssignableCount: availableHallOfFameBadges.length,
      },
      summary: {
        earnedBadgeCount: earnedOrActiveBadges.length,
        activeBadgeCount,
        inactiveBadgeCount,
        revokedBadgeCount,
        kickstarterBadgeCount: kickstarterAssignedBadges.length,
        hallOfFameBadgeCount: hallOfFameAssignedBadges.length,
        activeRewardCount: activeBenefits.length,
      },
    });
  }

  async assignBadgeToUser(input: AssignBadgeInput) {
    this.assertBadgeTargetInput(input.badgeId, input.badgeCode);
    if (!input.reason || input.reason.trim().length < 3) {
      throw new BadRequestException('reason is required.');
    }

    const [user, badge] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, name: true, email: true },
      }),
      this.resolveBadge(input.badgeId, input.badgeCode),
    ]);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!badge.isActive) {
      throw new BadRequestException('Badge definition is inactive.');
    }

    this.assertManualAssignmentAllowed(
      badge,
      input.overridePerformanceBadge,
      input.reason,
    );

    const auditBuffer: RewardAuditRecordInput[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId: input.userId,
            badgeId: badge.id,
          },
        },
      });

      if (
        existing &&
        (existing.status === UserBadgeStatus.EARNED ||
          existing.status === UserBadgeStatus.ACTIVE)
      ) {
        return {
          alreadyAssigned: true,
          userBadge: existing,
          previousStatus: existing.status,
        };
      }

      const now = new Date();
      const manualStatus = this.getManualAssignmentStatus(badge);
      const timing = this.getTiming(badge, now);
      const previousStatus = existing?.status ?? null;
      const metadata = {
        ...(existing?.metadata && typeof existing.metadata === 'object'
          ? (existing.metadata)
          : {}),
        extra: input.metadata ?? {},
        assignedByAdminId: input.adminId ?? null,
        assignmentSource: 'ADMIN_MANUAL',
        reason: input.reason,
        previousStatus,
        assignedAt: now.toISOString(),
        overridePerformanceBadge: input.overridePerformanceBadge ?? false,
        ...(existing?.status === UserBadgeStatus.REVOKED
          ? { reassignedAt: now.toISOString() }
          : {}),
      } as Prisma.InputJsonValue;

      const userBadge = await tx.userBadge.upsert({
        where: {
          userId_badgeId: {
            userId: input.userId,
            badgeId: badge.id,
          },
        },
        create: {
          userId: input.userId,
          badgeId: badge.id,
          status: manualStatus,
          earnedAt: manualStatus === UserBadgeStatus.EARNED ? now : null,
          activatedAt: manualStatus === UserBadgeStatus.ACTIVE ? now : null,
          lastQualifiedAt: manualStatus === UserBadgeStatus.ACTIVE ? now : null,
          lastEvaluatedAt: manualStatus === UserBadgeStatus.ACTIVE ? now : null,
          nextEvaluationAt: timing.nextEvaluationAt,
          expiresAt: timing.expiresAt,
          metadata,
        },
        update: {
          status: manualStatus,
          earnedAt:
            manualStatus === UserBadgeStatus.EARNED
              ? existing?.earnedAt ?? now
              : existing?.earnedAt ?? null,
          activatedAt:
            manualStatus === UserBadgeStatus.ACTIVE
              ? existing?.activatedAt ?? now
              : existing?.activatedAt ?? null,
          lastQualifiedAt:
            manualStatus === UserBadgeStatus.ACTIVE
              ? now
              : existing?.lastQualifiedAt ?? null,
          lastEvaluatedAt:
            manualStatus === UserBadgeStatus.ACTIVE
              ? now
              : existing?.lastEvaluatedAt ?? null,
          nextEvaluationAt: timing.nextEvaluationAt,
          expiresAt: timing.expiresAt,
          revokedAt: null,
          deactivatedAt: null,
          metadata,
        },
      });

      const eventKey =
        existing?.status === UserBadgeStatus.REVOKED
          ? `admin-badge-reassigned-${input.userId}-${badge.code}-${now.toISOString()}`
          : `admin-badge-assigned-${input.userId}-${badge.code}`;

      await this.rewardLedgerService.writeBadgeEvent(
        {
          userId: input.userId,
          badgeId: badge.id,
          rewardType:
            manualStatus === UserBadgeStatus.EARNED
              ? RewardLedgerType.BADGE_EARNED
              : RewardLedgerType.BADGE_ACTIVATED,
          rewardCode: badge.code,
          eventKey,
          reason: input.reason,
          metadata: {
            adminId: input.adminId ?? null,
            previousStatus,
            actionSource: 'ADMIN_MANUAL',
            overridePerformanceBadge: input.overridePerformanceBadge ?? false,
            ...(input.metadata ?? {}),
          },
        },
        tx,
      );

      await this.badgeRewardImpactService.syncBadgeRewardBenefit({
        userId: input.userId,
        badge,
        userBadge,
        tx,
        auditBuffer,
      });

      await this.userRewardProfileService.syncBadgeAndRewardCounts(input.userId, tx);

      if (manualStatus === UserBadgeStatus.EARNED) {
        await this.rewardNotificationService.notifyBadgeUnlocked(tx, {
          userId: input.userId,
          actorId: input.adminId ?? null,
          badge,
          source: 'ADMIN',
        });
      } else {
        await this.rewardNotificationService.notifyBadgeActivated(tx, {
          userId: input.userId,
          actorId: input.adminId ?? null,
          badge,
          source: 'ADMIN',
        });
      }

      return {
        alreadyAssigned: false,
        userBadge,
        previousStatus,
      };
    });

    if (!result.alreadyAssigned) {
      await this.rewardAuditService.recordSuccess({
        action: this.getAssignmentAuditAction(badge.category, result.previousStatus),
        actorType: RewardAuditActorType.ADMIN,
        actorId: input.adminId ?? null,
        targetUserId: input.userId,
        badgeDefinitionId: badge.id,
        userBadgeId: result.userBadge.id,
        source: REWARD_AUDIT_SOURCES.ADMIN_PANEL,
        reason: input.reason,
        oldValue: this.toAuditUserBadgeSnapshot({ status: result.previousStatus ?? null }),
        newValue: this.toAuditUserBadgeSnapshot(result.userBadge),
        metadata: {
          badgeCode: badge.code,
          badgeCategory: badge.category,
          overridePerformanceBadge: input.overridePerformanceBadge ?? false,
          ...(input.metadata ?? {}),
        },
        requestContext: input.requestContext,
      });

      await this.flushAuditBuffer(auditBuffer, input.requestContext);
    }

    const [activeBenefit, latestAuditLog] = await Promise.all([
      this.prisma.userRewardBenefit.findFirst({
        where: {
          userId: input.userId,
          sourceBadgeId: badge.id,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      result.alreadyAssigned
        ? Promise.resolve(null)
        : this.prisma.rewardAuditLog.findFirst({
            where: {
              targetUserId: input.userId,
              badgeDefinitionId: badge.id,
              userBadgeId: result.userBadge.id,
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          }),
    ]);

    return sendResponse(
      result.alreadyAssigned
        ? 'Badge already assigned to user.'
        : 'Badge assigned successfully.',
      {
        userId: input.userId,
        badgeCode: badge.code,
        alreadyAssigned: result.alreadyAssigned,
        userBadge: result.userBadge,
        badgeDefinition: {
          id: badge.id,
          code: badge.code,
          name: badge.name,
          category: badge.category,
        },
        activeBenefit,
        auditLogId: latestAuditLog?.id ?? null,
      },
    );
  }

  async revokeBadgeFromUser(input: RevokeBadgeInput) {
    this.assertBadgeTargetInput(input.badgeId, input.badgeCode);
    if (!input.reason || input.reason.trim().length < 3) {
      throw new BadRequestException('reason is required.');
    }

    const badge = await this.resolveBadge(input.badgeId, input.badgeCode);
    const auditBuffer: RewardAuditRecordInput[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const userBadge = await tx.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId: input.userId,
            badgeId: badge.id,
          },
        },
      });

      if (!userBadge) {
        throw new NotFoundException('User badge not found.');
      }

      if (userBadge.status === UserBadgeStatus.REVOKED) {
        return {
          alreadyRevoked: true,
          userBadge,
          previousStatus: userBadge.status,
        };
      }

      const now = new Date();
      const previousStatus = userBadge.status;
      const metadata = {
        ...(userBadge.metadata && typeof userBadge.metadata === 'object'
          ? (userBadge.metadata)
          : {}),
        extra: input.metadata ?? {},
        revokedByAdminId: input.adminId ?? null,
        revokeReason: input.reason,
        previousStatus,
        revokedAt: now.toISOString(),
        actionSource: 'ADMIN_MANUAL',
      } as Prisma.InputJsonValue;

      const updated = await tx.userBadge.update({
        where: { id: userBadge.id },
        data: {
          status: UserBadgeStatus.REVOKED,
          revokedAt: now,
          deactivatedAt:
            previousStatus === UserBadgeStatus.ACTIVE
              ? now
              : userBadge.deactivatedAt,
          metadata,
        },
      });

      await this.badgeRewardImpactService.deactivateBadgeRewardBenefit(
        input.userId,
        badge,
        input.reason,
        tx,
        auditBuffer,
      );

      await this.rewardLedgerService.writeBadgeEvent(
        {
          userId: input.userId,
          badgeId: badge.id,
          rewardType: RewardLedgerType.BADGE_REVOKED,
          rewardCode: badge.code,
          eventKey: `admin-badge-revoked-${input.userId}-${badge.code}-${now.toISOString()}`,
          reason: input.reason,
          metadata: {
            adminId: input.adminId ?? null,
            previousStatus,
            actionSource: 'ADMIN_MANUAL',
            ...(input.metadata ?? {}),
          },
        },
        tx,
      );

      await this.userRewardProfileService.syncBadgeAndRewardCounts(input.userId, tx);

      return {
        alreadyRevoked: false,
        userBadge: updated,
        previousStatus,
      };
    });

    if (!result.alreadyRevoked) {
      await this.rewardAuditService.recordSuccess({
        action: REWARD_AUDIT_ACTIONS.BADGE_MANUALLY_REVOKED,
        actorType: RewardAuditActorType.ADMIN,
        actorId: input.adminId ?? null,
        targetUserId: input.userId,
        badgeDefinitionId: badge.id,
        userBadgeId: result.userBadge.id,
        source: REWARD_AUDIT_SOURCES.ADMIN_PANEL,
        reason: input.reason,
        oldValue: this.toAuditUserBadgeSnapshot({ status: result.previousStatus ?? null }),
        newValue: this.toAuditUserBadgeSnapshot(result.userBadge),
        metadata: {
          badgeCode: badge.code,
          badgeCategory: badge.category,
          ...(input.metadata ?? {}),
        },
        requestContext: input.requestContext,
      });

      await this.flushAuditBuffer(auditBuffer, input.requestContext);
    }

    const [affectedBenefit, latestAuditLog] = await Promise.all([
      this.prisma.userRewardBenefit.findFirst({
        where: {
          userId: input.userId,
          sourceBadgeId: badge.id,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      result.alreadyRevoked
        ? Promise.resolve(null)
        : this.prisma.rewardAuditLog.findFirst({
            where: {
              targetUserId: input.userId,
              badgeDefinitionId: badge.id,
              userBadgeId: result.userBadge.id,
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          }),
    ]);

    return sendResponse(
      result.alreadyRevoked
        ? 'Badge already revoked from user.'
        : 'Badge revoked successfully.',
      {
        userId: input.userId,
        badgeCode: badge.code,
        alreadyRevoked: result.alreadyRevoked,
        userBadge: result.userBadge,
        badgeDefinition: {
          id: badge.id,
          code: badge.code,
          name: badge.name,
          category: badge.category,
        },
        affectedBenefit,
        auditLogId: latestAuditLog?.id ?? null,
      },
    );
  }

  private assertBadgeTargetInput(badgeId?: string, badgeCode?: string) {
    if (!badgeId && !badgeCode) {
      throw new BadRequestException('badgeId or badgeCode is required.');
    }
  }

  private async resolveBadge(badgeId?: string, badgeCode?: string) {
    const normalizedCode = badgeCode?.trim().toUpperCase();
    const [byId, byCode] = await Promise.all([
      badgeId
        ? this.prisma.badgeDefinition.findUnique({ where: { id: badgeId } })
        : Promise.resolve(null),
      normalizedCode
        ? this.prisma.badgeDefinition.findUnique({
            where: { code: normalizedCode },
          })
        : Promise.resolve(null),
    ]);

    if (badgeId && normalizedCode) {
      if (!byId || !byCode || byId.id !== byCode.id) {
        throw new BadRequestException(
          'badgeId and badgeCode do not resolve to the same badge.',
        );
      }
    }

    const badge = byId ?? byCode;
    if (!badge) {
      throw new NotFoundException('Badge definition not found.');
    }

    return badge;
  }

  private assertManualAssignmentAllowed(
    badge: BadgeDefinition,
    overridePerformanceBadge?: boolean,
    reason?: string,
  ) {
    if (badge.category === BadgeCategory.KICKSTARTER) {
      return;
    }

    if (badge.category === BadgeCategory.HALL_OF_FAME && badge.isPersistent) {
      return;
    }

    if (badge.category === BadgeCategory.ADMIN_FEATURED) {
      return;
    }

    if (badge.category === BadgeCategory.MARKETPLACE) {
      if (badge.triggerType === BadgeTriggerType.MANUAL) {
        return;
      }

      if (overridePerformanceBadge && reason) {
        return;
      }
    }

    throw new BadRequestException(
      'Manual assignment is not allowed for this badge without explicit override.',
    );
  }

  private async flushAuditBuffer(
    audits: RewardAuditRecordInput[],
    requestContext?: RewardAuditRequestContext,
  ) {
    for (const audit of audits) {
      await this.rewardAuditService.recordSuccess({
        ...audit,
        requestContext: audit.requestContext ?? requestContext,
      });
    }
  }

  private getManualAssignmentStatus(badge: BadgeDefinition) {
    return badge.isPersistent ? UserBadgeStatus.EARNED : UserBadgeStatus.ACTIVE;
  }

  private getAssignmentAuditAction(
    category: BadgeCategory,
    previousStatus?: UserBadgeStatus | null,
  ) {
    if (previousStatus === UserBadgeStatus.REVOKED) {
      return REWARD_AUDIT_ACTIONS.BADGE_REASSIGNED;
    }

    if (category === BadgeCategory.KICKSTARTER) {
      return REWARD_AUDIT_ACTIONS.KICKSTARTER_BADGE_ASSIGNED;
    }

    if (category === BadgeCategory.HALL_OF_FAME) {
      return REWARD_AUDIT_ACTIONS.HALL_OF_FAME_BADGE_ASSIGNED;
    }

    return REWARD_AUDIT_ACTIONS.BADGE_MANUALLY_ASSIGNED;
  }

  private toAuditUserBadgeSnapshot(
    userBadge:
      | Partial<{
          id: string;
          status: UserBadgeStatus | null;
          earnedAt: Date | null;
          activatedAt: Date | null;
          deactivatedAt: Date | null;
          revokedAt: Date | null;
        }>
      | null
      | undefined,
  ) {
    if (!userBadge) {
      return null;
    }

    return {
      id: userBadge.id ?? null,
      status: userBadge.status ?? null,
      earnedAt: userBadge.earnedAt?.toISOString() ?? null,
      activatedAt: userBadge.activatedAt?.toISOString() ?? null,
      deactivatedAt: userBadge.deactivatedAt?.toISOString() ?? null,
      revokedAt: userBadge.revokedAt?.toISOString() ?? null,
    };
  }

  private getTiming(badge: BadgeDefinition, now: Date) {
    if (badge.isPersistent) {
      return { nextEvaluationAt: null, expiresAt: null };
    }

    const nextEvaluationAt = new Date(now);
    nextEvaluationAt.setUTCDate(
      nextEvaluationAt.getUTCDate() + (badge.refreshWindowDays ?? 7),
    );

    const expiresAt = new Date(now);
    expiresAt.setUTCDate(
      expiresAt.getUTCDate() + (badge.validityDays ?? 90),
    );

    return { nextEvaluationAt, expiresAt };
  }
}
