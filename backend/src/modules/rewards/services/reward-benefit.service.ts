import { Injectable } from '@nestjs/common';
import {
  BadgeRewardType,
  Prisma,
  RewardBenefitStatus,
  UserRewardBenefit,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type UpsertRewardBenefitInput = {
  userId: string;
  rewardCode: string;
  rewardType: BadgeRewardType;
  value?: number | null;
  metadata?: Prisma.InputJsonValue;
  sourceBadgeId?: string | null;
  sourceTaskId?: string | null;
  status?: RewardBenefitStatus;
  activatedAt?: Date | null;
  expiresAt?: Date | null;
};

export type UpsertRewardBenefitResult = {
  benefit: UserRewardBenefit;
  created: boolean;
  previousStatus: RewardBenefitStatus | null;
  selfHealedDuplicateIds: string[];
};

@Injectable()
export class RewardBenefitService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBenefit(
    input: UpsertRewardBenefitInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UpsertRewardBenefitResult> {
    const db = tx ?? this.prisma;
    const matches = await db.userRewardBenefit.findMany({
      where: {
        userId: input.userId,
        rewardCode: input.rewardCode,
        sourceBadgeId: input.sourceBadgeId ?? null,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const existing = matches[0];
    const duplicateIds = matches.slice(1).map((benefit) => benefit.id);
    const nextStatus = input.status ?? RewardBenefitStatus.ACTIVE;

    if (existing) {
      const updated = await db.userRewardBenefit.update({
        where: { id: existing.id },
        data: {
          rewardType: input.rewardType,
          value: input.value ?? null,
          metadata: input.metadata,
          sourceTaskId: input.sourceTaskId ?? null,
          status: nextStatus,
          activatedAt: input.activatedAt ?? existing.activatedAt ?? new Date(),
          expiresAt: input.expiresAt ?? null,
          deactivatedAt: nextStatus === RewardBenefitStatus.ACTIVE ? null : existing.deactivatedAt,
        },
      });

      if (duplicateIds.length > 0) {
        await db.userRewardBenefit.updateMany({
          where: {
            id: { in: duplicateIds },
            status: RewardBenefitStatus.ACTIVE,
          },
          data: {
            status: RewardBenefitStatus.INACTIVE,
            deactivatedAt: new Date(),
          },
        });
      }

      return {
        benefit: updated,
        created: false,
        previousStatus: existing.status,
        selfHealedDuplicateIds: duplicateIds,
      };
    }

    const created = await db.userRewardBenefit.create({
      data: {
        userId: input.userId,
        rewardCode: input.rewardCode,
        rewardType: input.rewardType,
        value: input.value ?? null,
        metadata: input.metadata,
        sourceBadgeId: input.sourceBadgeId ?? null,
        sourceTaskId: input.sourceTaskId ?? null,
        status: nextStatus,
        activatedAt: input.activatedAt ?? new Date(),
        expiresAt: input.expiresAt ?? null,
      },
    });

    return {
      benefit: created,
      created: true,
      previousStatus: null,
      selfHealedDuplicateIds: [],
    };
  }

  async deactivateBenefitsForBadge(
    userId: string,
    badgeId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const activeBenefits = await db.userRewardBenefit.findMany({
      where: {
        userId,
        sourceBadgeId: badgeId,
        status: RewardBenefitStatus.ACTIVE,
      },
    });

    if (activeBenefits.length === 0) {
      return [];
    }

    const now = new Date();
    await db.userRewardBenefit.updateMany({
      where: {
        id: { in: activeBenefits.map((benefit) => benefit.id) },
      },
      data: {
        status: RewardBenefitStatus.INACTIVE,
        deactivatedAt: now,
      },
    });

    return activeBenefits.map((benefit) => ({
      ...benefit,
      status: RewardBenefitStatus.INACTIVE,
      deactivatedAt: now,
    }));
  }

  async expireBenefits(
    benefitIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (benefitIds.length === 0) {
      return 0;
    }

    const db = tx ?? this.prisma;
    const result = await db.userRewardBenefit.updateMany({
      where: {
        id: { in: benefitIds },
        status: RewardBenefitStatus.ACTIVE,
      },
      data: {
        status: RewardBenefitStatus.EXPIRED,
        deactivatedAt: new Date(),
      },
    });

    return result.count;
  }
}
