import { Injectable } from '@nestjs/common';
import {
  BadgeDefinition,
  BadgeRewardType,
  Prisma,
  RewardAuditActorType,
  RewardLedgerType,
  UserBadge,
} from '@prisma/client';
import {
  REWARD_AUDIT_ACTIONS,
  REWARD_AUDIT_SOURCES,
} from '../enums';
import { RewardBenefitService } from './reward-benefit.service';
import { RewardLedgerService } from './reward-ledger.service';
import { RewardAuditRecordInput } from './reward-audit.service';

@Injectable()
export class BadgeRewardImpactService {
  constructor(
    private readonly rewardBenefitService: RewardBenefitService,
    private readonly rewardLedgerService: RewardLedgerService,
  ) {}

  async syncBadgeRewardBenefit(
    input: {
      userId: string;
      badge: BadgeDefinition;
      userBadge: UserBadge;
      taskId?: string;
      tx?: Prisma.TransactionClient;
      auditBuffer?: RewardAuditRecordInput[];
    },
  ): Promise<void> {
    const { badge, userBadge, userId, taskId, tx, auditBuffer } = input;

    if (badge.rewardType === BadgeRewardType.RECOGNITION_ONLY) {
      return;
    }

    const metadata = this.buildDefaultMetadata(badge);
    const result = await this.rewardBenefitService.upsertBenefit(
      {
        userId,
        rewardCode: badge.code,
        rewardType: badge.rewardType,
        value: badge.rewardValue ?? null,
        metadata,
        sourceBadgeId: badge.id,
        sourceTaskId: taskId ?? null,
        activatedAt: userBadge.activatedAt ?? userBadge.earnedAt ?? new Date(),
        expiresAt: userBadge.expiresAt ?? null,
      },
      tx,
    );

    await this.rewardLedgerService.writeRewardBenefitEvent(
      {
        userId,
        taskId: taskId ?? null,
        badgeId: badge.id,
        rewardType: RewardLedgerType.BADGE_REWARD_GRANTED,
        rewardCode: badge.code,
        rewardValue: result.benefit.value ?? null,
        eventKey: `badge-reward-granted-${userId}-${badge.code}`,
        reason:
          badge.rewardType === BadgeRewardType.TASK_CREDIT
            ? 'Reward benefit recorded. Wallet payout remains deferred in Phase 3.'
            : 'Reward benefit activated from earned badge.',
        metadata,
      },
      tx,
    );

    if (!auditBuffer) {
      return;
    }

    if (result.created) {
      auditBuffer.push({
        action: REWARD_AUDIT_ACTIONS.REWARD_BENEFIT_GRANTED,
        actorType: RewardAuditActorType.SYSTEM,
        targetUserId: userId,
        badgeDefinitionId: badge.id,
        rewardBenefitId: result.benefit.id,
        source: REWARD_AUDIT_SOURCES.BADGE_REWARD_IMPACT,
        reason: 'Reward benefit granted from badge.',
        newValue: this.toBenefitSnapshot(result.benefit),
        metadata,
      });
    }

    if (result.created || result.previousStatus !== result.benefit.status) {
      auditBuffer.push({
        action: REWARD_AUDIT_ACTIONS.REWARD_BENEFIT_ACTIVATED,
        actorType: RewardAuditActorType.SYSTEM,
        targetUserId: userId,
        badgeDefinitionId: badge.id,
        rewardBenefitId: result.benefit.id,
        source: REWARD_AUDIT_SOURCES.BADGE_REWARD_IMPACT,
        reason: 'Reward benefit activated.',
        oldValue: this.toBenefitSnapshot({ status: result.previousStatus }),
        newValue: this.toBenefitSnapshot(result.benefit),
        metadata,
      });
    }

    if (result.selfHealedDuplicateIds.length > 0) {
      auditBuffer.push({
        action: REWARD_AUDIT_ACTIONS.REWARD_BENEFIT_SELF_HEALED,
        actorType: RewardAuditActorType.SYSTEM,
        targetUserId: userId,
        badgeDefinitionId: badge.id,
        rewardBenefitId: result.benefit.id,
        source: REWARD_AUDIT_SOURCES.BADGE_REWARD_IMPACT,
        reason: 'Duplicate reward benefits were self-healed.',
        metadata: {
          rewardCode: badge.code,
          selfHealedDuplicateIds: result.selfHealedDuplicateIds,
        },
      });
    }
  }

  async deactivateBadgeRewardBenefit(
    userId: string,
    badge: BadgeDefinition,
    reason: string,
    tx?: Prisma.TransactionClient,
    auditBuffer?: RewardAuditRecordInput[],
  ) {
    const deactivated = await this.rewardBenefitService.deactivateBenefitsForBadge(
      userId,
      badge.id,
      tx,
    );

    const dateKey = new Date().toISOString().slice(0, 10);
    for (const benefit of deactivated) {
      await this.rewardLedgerService.writeRewardBenefitEvent(
        {
          userId,
          badgeId: badge.id,
          rewardType: RewardLedgerType.BADGE_REWARD_REMOVED,
          rewardCode: benefit.rewardCode,
          rewardValue: benefit.value ?? null,
          eventKey: `badge-reward-removed-${userId}-${badge.code}-${dateKey}`,
          reason,
          metadata: {
            sourceBadge: badge.code,
          },
        },
        tx,
      );

      auditBuffer?.push({
        action: REWARD_AUDIT_ACTIONS.REWARD_BENEFIT_DEACTIVATED,
        actorType: RewardAuditActorType.SYSTEM,
        targetUserId: userId,
        badgeDefinitionId: badge.id,
        rewardBenefitId: benefit.id,
        source: REWARD_AUDIT_SOURCES.BADGE_REWARD_IMPACT,
        reason,
        oldValue: this.toBenefitSnapshot({ ...benefit, status: 'ACTIVE' }),
        newValue: this.toBenefitSnapshot(benefit),
        metadata: {
          rewardCode: benefit.rewardCode,
        },
      });
    }
  }

  private buildDefaultMetadata(
    badge: BadgeDefinition,
  ): Prisma.InputJsonValue | undefined {
    const defaultMetadata: Record<string, unknown> = (() => {
      switch (badge.code) {
        case 'FAST_RESPONDER':
          return {
            effectKey: 'PRIORITY_POINTS',
            priorityPoints: 10,
            sourceBadge: badge.code,
            consumer: 'MARKETPLACE_MATCHING',
          };
        case 'HIGH_APPROVAL':
          return {
            effectKey: 'VISIBILITY_MULTIPLIER',
            multiplier: 1.2,
            sourceBadge: badge.code,
            consumer: 'MARKETPLACE_VISIBILITY',
          };
        case 'TOP_CONTRIBUTOR':
          return {
            effectKey: 'PRIORITY_POINTS',
            priorityPoints: 20,
            sourceBadge: badge.code,
            consumer: 'MARKETPLACE_MATCHING',
          };
        case 'TRUSTED_PARTNER':
          return {
            effectKey: 'SUPPORT_PRIORITY',
            supportLevel: 2,
            sourceBadge: badge.code,
            consumer: 'SUPPORT_ADMIN',
          };
        case 'CONSISTENT_CONTRIBUTOR':
          return {
            effectKey: 'VISIBILITY_MULTIPLIER',
            multiplier: 1.1,
            sourceBadge: badge.code,
            consumer: 'MARKETPLACE_VISIBILITY',
          };
        case 'LOW_DISPUTE_PROVIDER':
          return {
            effectKey: 'VISIBILITY_MULTIPLIER',
            multiplier: 1.1,
            sourceBadge: badge.code,
            consumer: 'MARKETPLACE_VISIBILITY',
          };
        default:
          return {};
      }
    })();

    if (badge.rewardType === BadgeRewardType.TASK_CREDIT) {
      defaultMetadata.payoutStatus = 'PENDING_WALLET_PAYOUT';
      defaultMetadata.todo = 'Phase 4 wallet payout wiring';
    }

    if (badge.rewardMeta && typeof badge.rewardMeta === 'object') {
      return {
        ...defaultMetadata,
        ...(badge.rewardMeta as Record<string, unknown>),
      } as Prisma.InputJsonValue;
    }

    return defaultMetadata as Prisma.InputJsonValue;
  }

  private toBenefitSnapshot(
    benefit:
      | Partial<{
          id: string;
          rewardCode: string;
          rewardType: BadgeRewardType;
          status: unknown;
          value: number | null;
          activatedAt: Date | null;
          expiresAt: Date | null;
          deactivatedAt: Date | null;
        }>
      | null
      | undefined,
  ) {
    if (!benefit) {
      return null;
    }

    return {
      id: benefit.id ?? null,
      rewardCode: benefit.rewardCode ?? null,
      rewardType: benefit.rewardType ?? null,
      status: benefit.status ?? null,
      value: benefit.value ?? null,
      activatedAt: benefit.activatedAt?.toISOString() ?? null,
      expiresAt: benefit.expiresAt?.toISOString() ?? null,
      deactivatedAt: benefit.deactivatedAt?.toISOString() ?? null,
    };
  }
}

