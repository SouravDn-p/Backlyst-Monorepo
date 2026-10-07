import { Injectable } from '@nestjs/common';
import {
  BadgeDefinition,
  BadgeRoleScope,
  Prisma,
  RewardAuditActorType,
  RewardLedgerType,
  UserBadge,
  UserBadgeStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  REWARD_AUDIT_ACTIONS,
  REWARD_AUDIT_SOURCES,
} from '../enums';
import { BadgeRuleEvaluatorService } from './badge-rule-evaluator.service';
import { BadgeRewardImpactService } from './badge-reward-impact.service';
import {
  RewardAuditRecordInput,
  RewardAuditService,
} from './reward-audit.service';
import { RewardLedgerService } from './reward-ledger.service';
import { RewardNotificationService } from './reward-notification.service';
import { UserRewardProfileService } from './user-reward-profile.service';

type EvaluateUserBadgesInput = {
  userId: string;
  roleContext?: 'REQUESTER' | 'PROVIDER' | 'ANY';
  taskId?: string;
  actorId?: string;
};

@Injectable()
export class BadgeEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeRuleEvaluatorService: BadgeRuleEvaluatorService,
    private readonly badgeRewardImpactService: BadgeRewardImpactService,
    private readonly rewardLedgerService: RewardLedgerService,
    private readonly userRewardProfileService: UserRewardProfileService,
    private readonly rewardAuditService: RewardAuditService,
    private readonly rewardNotificationService: RewardNotificationService,
  ) {}

  async evaluateUserBadges(input: EvaluateUserBadgesInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, isVerified: true },
    });

    if (!user) {
      return { evaluated: 0, changed: 0 };
    }

    const roleScopes = this.getRoleScopes(input.roleContext);
    const definitions = await this.prisma.badgeDefinition.findMany({
      where: {
        isActive: true,
        roleScope: {
          in: roleScopes,
        },
      },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    if (definitions.length === 0) {
      return { evaluated: 0, changed: 0 };
    }

    const profile = await this.userRewardProfileService.getOrCreateProfile(
      input.userId,
    );

    let changed = 0;
    const auditBuffer: RewardAuditRecordInput[] = [];

    await this.prisma.$transaction(async (tx) => {
      const currentBadges = await tx.userBadge.findMany({
        where: {
          userId: input.userId,
          badgeId: { in: definitions.map((definition) => definition.id) },
        },
      });

      const badgeMap = new Map(
        currentBadges.map((badge) => [badge.badgeId, badge]),
      );

      for (const definition of definitions) {
        const existing = badgeMap.get(definition.id);
        const evaluation = this.badgeRuleEvaluatorService.evaluate(
          definition,
          profile,
          {
            userIsVerified: user.isVerified,
            currentStatus: existing?.status,
          },
        );

        const nextState = this.determineNextBadgeState(
          definition,
          existing,
          evaluation,
        );
        const now = new Date();
        const timing = this.buildTiming(definition, now);
        const badgeMetadata = this.buildBadgeMetadata(existing, evaluation, now);

        const userBadge = await tx.userBadge.upsert({
          where: {
            userId_badgeId: {
              userId: input.userId,
              badgeId: definition.id,
            },
          },
          create: {
            userId: input.userId,
            badgeId: definition.id,
            status: nextState.status,
            earnedAt: nextState.status === UserBadgeStatus.EARNED ? now : null,
            activatedAt:
              nextState.status === UserBadgeStatus.ACTIVE ? now : null,
            deactivatedAt:
              nextState.status === UserBadgeStatus.INACTIVE ? now : null,
            lastQualifiedAt: evaluation.qualifies ? now : null,
            lastEvaluatedAt: now,
            nextEvaluationAt: timing.nextEvaluationAt,
            expiresAt: timing.expiresAt,
            triggerTaskId: input.taskId ?? null,
            metadata: badgeMetadata,
          },
          update: {
            status: nextState.status,
            earnedAt:
              nextState.status === UserBadgeStatus.EARNED
                ? existing?.earnedAt ?? now
                : existing?.earnedAt ?? null,
            activatedAt:
              nextState.status === UserBadgeStatus.ACTIVE
                ? existing?.activatedAt ?? now
                : existing?.activatedAt ?? null,
            deactivatedAt:
              nextState.status === UserBadgeStatus.INACTIVE
                ? now
                : nextState.status === UserBadgeStatus.ACTIVE
                  ? null
                  : existing?.deactivatedAt ?? null,
            revokedAt:
              nextState.status === UserBadgeStatus.REVOKED
                ? existing?.revokedAt ?? now
                : existing?.revokedAt ?? null,
            lastQualifiedAt:
              evaluation.qualifies ? now : existing?.lastQualifiedAt ?? null,
            lastEvaluatedAt: now,
            nextEvaluationAt: timing.nextEvaluationAt,
            expiresAt: timing.expiresAt,
            triggerTaskId: evaluation.qualifies
              ? input.taskId ?? existing?.triggerTaskId ?? null
              : existing?.triggerTaskId ?? null,
            metadata:
              existing?.status === UserBadgeStatus.REVOKED
                ? ((existing?.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue)
                : badgeMetadata,
          },
        });

        const previousStatus = existing?.status;
        const statusChanged = previousStatus !== nextState.status;
        const createdNewBadge = !existing;

        if (statusChanged) {
          changed += 1;
        }

        await this.handleSideEffects({
          tx,
          userId: input.userId,
          taskId: input.taskId,
          badge: definition,
          userBadge,
          previousStatus,
          statusChanged,
          auditBuffer,
        });

        if (createdNewBadge || statusChanged) {
          auditBuffer.push({
            action:
              userBadge.status === UserBadgeStatus.EARNED &&
              previousStatus !== UserBadgeStatus.EARNED
                ? REWARD_AUDIT_ACTIONS.BADGE_AUTOMATICALLY_EARNED
                : REWARD_AUDIT_ACTIONS.BADGE_STATUS_CHANGED,
            actorType: RewardAuditActorType.SYSTEM,
            targetUserId: input.userId,
            badgeDefinitionId: definition.id,
            userBadgeId: userBadge.id,
            source: REWARD_AUDIT_SOURCES.BADGE_ENGINE,
            reason: evaluation.reason,
            oldValue: this.toAuditUserBadgeSnapshot(existing),
            newValue: this.toAuditUserBadgeSnapshot(userBadge),
            metadata: {
              badgeCode: definition.code,
              badgeCategory: definition.category,
              roleContext: input.roleContext ?? 'ANY',
              qualifies: evaluation.qualifies,
              eligible: evaluation.eligible,
              progress: evaluation.progress,
              rewardMetadata: evaluation.rewardMetadata ?? null,
            },
          });
        }
      }

      await this.userRewardProfileService.syncBadgeAndRewardCounts(
        input.userId,
        tx,
      );
    });

    for (const audit of auditBuffer) {
      await this.rewardAuditService.recordSuccess(audit);
    }

    return {
      evaluated: definitions.length,
      changed,
    };
  }

  private getRoleScopes(roleContext?: 'REQUESTER' | 'PROVIDER' | 'ANY') {
    if (!roleContext || roleContext === 'ANY') {
      return [
        BadgeRoleScope.ANY,
        BadgeRoleScope.REQUESTER,
        BadgeRoleScope.PROVIDER,
      ];
    }

    return [BadgeRoleScope.ANY, roleContext];
  }

  private determineNextBadgeState(
    definition: BadgeDefinition,
    existing: UserBadge | undefined,
    evaluation: ReturnType<BadgeRuleEvaluatorService['evaluate']>,
  ) {
    if (existing?.status === UserBadgeStatus.REVOKED) {
      return { status: UserBadgeStatus.REVOKED };
    }

    if (definition.isPersistent) {
      if (existing?.status === UserBadgeStatus.EARNED) {
        return { status: UserBadgeStatus.EARNED };
      }

      if (evaluation.qualifies) {
        return { status: UserBadgeStatus.EARNED };
      }

      return {
        status:
          evaluation.status === 'ELIGIBLE'
            ? UserBadgeStatus.ELIGIBLE
            : UserBadgeStatus.LOCKED,
      };
    }

    if (evaluation.qualifies) {
      return { status: UserBadgeStatus.ACTIVE };
    }

    if (
      existing?.status === UserBadgeStatus.ACTIVE &&
      evaluation.status === 'INACTIVE'
    ) {
      return { status: UserBadgeStatus.INACTIVE };
    }

    if (evaluation.status === 'ELIGIBLE') {
      return { status: UserBadgeStatus.ELIGIBLE };
    }

    if (evaluation.status === 'INACTIVE') {
      return {
        status:
          existing?.status === UserBadgeStatus.ACTIVE
            ? UserBadgeStatus.INACTIVE
            : UserBadgeStatus.ELIGIBLE,
      };
    }

    return { status: UserBadgeStatus.LOCKED };
  }

  private buildTiming(definition: BadgeDefinition, now: Date) {
    if (definition.isPersistent) {
      return {
        nextEvaluationAt: null,
        expiresAt: null,
      };
    }

    const nextEvaluationAt = new Date(now);
    nextEvaluationAt.setUTCDate(
      nextEvaluationAt.getUTCDate() + (definition.refreshWindowDays ?? 7),
    );

    const expiresAt = new Date(now);
    expiresAt.setUTCDate(
      expiresAt.getUTCDate() + (definition.validityDays ?? 90),
    );

    return { nextEvaluationAt, expiresAt };
  }

  private buildBadgeMetadata(
    existing: UserBadge | undefined,
    evaluation: ReturnType<BadgeRuleEvaluatorService['evaluate']>,
    now: Date,
  ): Prisma.InputJsonValue {
    if (existing?.status === UserBadgeStatus.REVOKED) {
      return (existing.metadata ?? null) as Prisma.InputJsonValue;
    }

    const existingMetadata =
      existing?.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {};

    return {
      ...existingMetadata,
      evaluation: {
        progress: evaluation.progress,
        reason: evaluation.reason,
        rewardMetadata: evaluation.rewardMetadata ?? null,
        lastEvaluatedAt: now.toISOString(),
      },
    } as Prisma.InputJsonValue;
  }

  private async handleSideEffects(input: {
    tx: Prisma.TransactionClient;
    userId: string;
    taskId?: string;
    badge: BadgeDefinition;
    userBadge: UserBadge;
    previousStatus?: UserBadgeStatus;
    statusChanged: boolean;
    auditBuffer: RewardAuditRecordInput[];
  }) {
    const {
      tx,
      userId,
      taskId,
      badge,
      userBadge,
      previousStatus,
      statusChanged,
      auditBuffer,
    } = input;
    const today = new Date().toISOString().slice(0, 10);

    if (userBadge.status === UserBadgeStatus.EARNED) {
      await this.rewardLedgerService.writeBadgeEvent(
        {
          userId,
          taskId: taskId ?? null,
          badgeId: badge.id,
          rewardType: RewardLedgerType.BADGE_EARNED,
          rewardCode: badge.code,
          eventKey: `badge-earned-${userId}-${badge.code}`,
          reason: 'Permanent badge earned.',
        },
        tx,
      );

      await this.badgeRewardImpactService.syncBadgeRewardBenefit({
        userId,
        badge,
        userBadge,
        taskId,
        tx,
        auditBuffer,
      });

      await this.rewardNotificationService.notifyBadgeUnlocked(tx, {
        userId,
        badge,
        taskId: taskId ?? null,
        source: 'AUTO',
      });
      return;
    }

    if (
      userBadge.status === UserBadgeStatus.ACTIVE &&
      previousStatus !== UserBadgeStatus.ACTIVE
    ) {
      await this.rewardLedgerService.writeBadgeEvent(
        {
          userId,
          taskId: taskId ?? null,
          badgeId: badge.id,
          rewardType: RewardLedgerType.BADGE_ACTIVATED,
          rewardCode: badge.code,
          eventKey: `badge-activated-${userId}-${badge.code}`,
          reason: 'Dynamic badge activated.',
        },
        tx,
      );

      await this.badgeRewardImpactService.syncBadgeRewardBenefit({
        userId,
        badge,
        userBadge,
        taskId,
        tx,
        auditBuffer,
      });

      await this.rewardNotificationService.notifyBadgeActivated(tx, {
        userId,
        badge,
        taskId: taskId ?? null,
        source: 'AUTO',
      });
      return;
    }

    if (
      userBadge.status === UserBadgeStatus.ACTIVE &&
      previousStatus === UserBadgeStatus.ACTIVE
    ) {
      await this.rewardLedgerService.writeBadgeEvent(
        {
          userId,
          taskId: taskId ?? null,
          badgeId: badge.id,
          rewardType: RewardLedgerType.BADGE_RENEWED,
          rewardCode: badge.code,
          eventKey: `badge-renewed-${userId}-${badge.code}-${today}`,
          reason: 'Dynamic badge renewed.',
        },
        tx,
      );

      await this.badgeRewardImpactService.syncBadgeRewardBenefit({
        userId,
        badge,
        userBadge,
        taskId,
        tx,
        auditBuffer,
      });
      return;
    }

    if (
      statusChanged &&
      userBadge.status === UserBadgeStatus.INACTIVE &&
      previousStatus === UserBadgeStatus.ACTIVE
    ) {
      await this.rewardLedgerService.writeBadgeEvent(
        {
          userId,
          taskId: taskId ?? null,
          badgeId: badge.id,
          rewardType: RewardLedgerType.BADGE_DEACTIVATED,
          rewardCode: badge.code,
          eventKey: `badge-deactivated-${userId}-${badge.code}-${today}`,
          reason:
            'Dynamic badge deactivated due to falling below quality thresholds.',
        },
        tx,
      );

      await this.badgeRewardImpactService.deactivateBadgeRewardBenefit(
        userId,
        badge,
        'Badge deactivated.',
        tx,
        auditBuffer,
      );
    }
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
          expiresAt: Date | null;
          nextEvaluationAt: Date | null;
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
      expiresAt: userBadge.expiresAt?.toISOString() ?? null,
      nextEvaluationAt: userBadge.nextEvaluationAt?.toISOString() ?? null,
    };
  }
}
