import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
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
import { BadgeEngineService } from './badge-engine.service';
import {
  RewardAuditRequestContext,
  RewardAuditService,
} from './reward-audit.service';
import { RewardLedgerService } from './reward-ledger.service';

type RewardMaintenanceAuditContext = {
  actorType?: RewardAuditActorType;
  actorId?: string | null;
  source?: string | null;
  requestContext?: RewardAuditRequestContext;
  triggeredBy?: 'ADMIN' | 'CRON' | 'SYSTEM';
};

@Injectable()
export class DynamicBadgeRefreshService {
  private readonly logger = new Logger(DynamicBadgeRefreshService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeEngineService: BadgeEngineService,
    private readonly rewardLedgerService: RewardLedgerService,
    private readonly rewardAuditService: RewardAuditService,
  ) {}

  @Cron('15 3 * * *')
  async runDailyMaintenance() {
    const cronContext: RewardMaintenanceAuditContext = {
      actorType: RewardAuditActorType.SYSTEM,
      source: REWARD_AUDIT_SOURCES.CRON,
      triggeredBy: 'CRON',
    };

    try {
      const refreshResult = await this.refreshDueBadges({ limit: 100 }, cronContext);
      const expiryResult = await this.expireStaleBenefits({ limit: 200 }, cronContext);
      this.logger.log(
        `Reward maintenance completed. Refreshed badges: ${JSON.stringify(refreshResult.data)}. Expired benefits: ${JSON.stringify(expiryResult.data)}.`,
      );
    } catch (error) {
      this.logger.error(
        'Reward maintenance cron failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async refreshDueBadges(
    input?: { limit?: number },
    context?: RewardMaintenanceAuditContext,
  ) {
    const limit = Math.max(1, Math.min(500, input?.limit ?? 50));
    const now = new Date();

    await this.rewardAuditService.recordSuccess({
      action: REWARD_AUDIT_ACTIONS.DYNAMIC_REFRESH_STARTED,
      actorType: this.normalizeActorType(context),
      actorId: context?.actorId ?? null,
      source: this.normalizeSource(context),
      reason: 'Dynamic badge refresh started.',
      metadata: {
        limit,
        triggeredBy: context?.triggeredBy ?? 'SYSTEM',
      },
      requestContext: context?.requestContext,
    });

    try {
      const dueBadges = await this.prisma.userBadge.findMany({
        where: {
          status: UserBadgeStatus.ACTIVE,
          badge: {
            isPersistent: false,
          },
          OR: [{ nextEvaluationAt: { lte: now } }, { expiresAt: { lte: now } }],
        },
        select: {
          userId: true,
        },
        orderBy: [{ nextEvaluationAt: 'asc' }, { expiresAt: 'asc' }],
        take: limit,
      });

      const userIds = [...new Set(dueBadges.map((item) => item.userId))];
      let evaluated = 0;
      let activated = 0;
      let deactivated = 0;
      let skipped = 0;
      let failed = 0;

      for (const userId of userIds) {
        try {
          const before = await this.prisma.userBadge.findMany({
            where: { userId },
            select: { badgeId: true, status: true },
          });
          const beforeMap = new Map(
            before.map((item) => [item.badgeId, item.status]),
          );

          const result = await this.badgeEngineService.evaluateUserBadges({
            userId,
            roleContext: 'ANY',
          });
          evaluated += result.evaluated;

          const after = await this.prisma.userBadge.findMany({
            where: { userId },
            select: { badgeId: true, status: true },
          });

          for (const item of after) {
            const previous = beforeMap.get(item.badgeId);
            if (
              previous !== UserBadgeStatus.ACTIVE &&
              item.status === UserBadgeStatus.ACTIVE
            ) {
              activated += 1;
            }
            if (
              previous === UserBadgeStatus.ACTIVE &&
              item.status === UserBadgeStatus.INACTIVE
            ) {
              deactivated += 1;
            }
          }

          if (result.evaluated === 0) {
            skipped += 1;
          }
        } catch (error) {
          failed += 1;
          this.logger.error(
            `Dynamic badge refresh failed for user ${userId}.`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      const payload = {
        evaluated,
        activated,
        deactivated,
        skipped,
        failed,
      };

      await this.rewardAuditService.record({
        action:
          failed > 0
            ? REWARD_AUDIT_ACTIONS.DYNAMIC_REFRESH_FAILED
            : REWARD_AUDIT_ACTIONS.DYNAMIC_REFRESH_COMPLETED,
        actorType: this.normalizeActorType(context),
        actorId: context?.actorId ?? null,
        source: this.normalizeSource(context),
        status: failed > 0 ? undefined : undefined,
        reason:
          failed > 0
            ? 'Dynamic badge refresh completed with failures.'
            : 'Dynamic badge refresh completed successfully.',
        metadata: {
          processedUsers: userIds.length,
          ...payload,
          expired: 0,
          triggeredBy: context?.triggeredBy ?? 'SYSTEM',
          limit,
        },
        requestContext: context?.requestContext,
      });

      return sendResponse('Dynamic badge refresh completed successfully.', payload);
    } catch (error) {
      await this.rewardAuditService.recordFailure({
        action: REWARD_AUDIT_ACTIONS.DYNAMIC_REFRESH_FAILED,
        actorType: this.normalizeActorType(context),
        actorId: context?.actorId ?? null,
        source: this.normalizeSource(context),
        reason: 'Dynamic badge refresh failed.',
        errorMessage:
          error instanceof Error ? error.message : String(error ?? 'Unknown error'),
        metadata: {
          limit,
          triggeredBy: context?.triggeredBy ?? 'SYSTEM',
        },
        requestContext: context?.requestContext,
      });
      throw error;
    }
  }

  async expireStaleBenefits(
    input?: { limit?: number },
    context?: RewardMaintenanceAuditContext,
  ) {
    const limit = Math.max(1, Math.min(500, input?.limit ?? 50));
    const now = new Date();
    const staleBenefits = await this.prisma.userRewardBenefit.findMany({
      where: {
        status: RewardBenefitStatus.ACTIVE,
        expiresAt: { not: null, lte: now },
      },
      orderBy: { expiresAt: 'asc' },
      take: limit,
    });

    let expired = 0;
    let skipped = 0;
    let failed = 0;
    const dateKey = now.toISOString().slice(0, 10);

    for (const benefit of staleBenefits) {
      try {
        const updated = await this.prisma.userRewardBenefit.updateMany({
          where: {
            id: benefit.id,
            status: RewardBenefitStatus.ACTIVE,
          },
          data: {
            status: RewardBenefitStatus.EXPIRED,
            deactivatedAt: now,
          },
        });

        if (updated.count !== 1) {
          skipped += 1;
          continue;
        }

        const ledgerResult = await this.rewardLedgerService.writeRewardBenefitEvent({
          userId: benefit.userId,
          badgeId: benefit.sourceBadgeId ?? null,
          taskId: benefit.sourceTaskId ?? null,
          rewardType: RewardLedgerType.BADGE_EXPIRED,
          rewardCode: benefit.rewardCode,
          rewardValue: benefit.value ?? null,
          eventKey: `benefit-expired-${benefit.id}-${dateKey}`,
          reason: 'Reward benefit expired due to stale validity window.',
          metadata: {
            actionSource: 'DYNAMIC_REFRESH',
            benefitId: benefit.id,
            expiredAt: now.toISOString(),
          },
        });

        await this.rewardAuditService.recordSuccess({
          action: REWARD_AUDIT_ACTIONS.REWARD_BENEFIT_EXPIRED,
          actorType: this.normalizeActorType(context),
          actorId: context?.actorId ?? null,
          targetUserId: benefit.userId,
          rewardBenefitId: benefit.id,
          rewardLedgerId: ledgerResult.entry?.id ?? null,
          badgeDefinitionId: benefit.sourceBadgeId ?? null,
          source: this.normalizeSource(context),
          reason: 'Reward benefit expired due to stale validity window.',
          oldValue: {
            status: RewardBenefitStatus.ACTIVE,
            expiresAt: benefit.expiresAt?.toISOString() ?? null,
          },
          newValue: {
            status: RewardBenefitStatus.EXPIRED,
            deactivatedAt: now.toISOString(),
          },
          metadata: {
            rewardCode: benefit.rewardCode,
            rewardType: benefit.rewardType,
            triggeredBy: context?.triggeredBy ?? 'SYSTEM',
          },
          requestContext: context?.requestContext,
        });

        expired += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Reward benefit expiry failed for benefit ${benefit.id}.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return sendResponse('Reward benefit expiry completed successfully.', {
      expired,
      skipped,
      failed,
    });
  }

  private normalizeActorType(context?: RewardMaintenanceAuditContext) {
    return context?.actorType === RewardAuditActorType.ADMIN
      ? RewardAuditActorType.ADMIN
      : RewardAuditActorType.SYSTEM;
  }

  private normalizeSource(context?: RewardMaintenanceAuditContext) {
    return context?.source ?? REWARD_AUDIT_SOURCES.DYNAMIC_REFRESH;
  }
}



