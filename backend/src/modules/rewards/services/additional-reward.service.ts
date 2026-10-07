/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable } from '@nestjs/common';
import {
  AdditionalRewardDefinition,
  BadgeRewardType,
  BadgeRoleScope,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { UserRewardProfileService } from './user-reward-profile.service';
const DEFAULT_ADDITIONAL_REWARDS: Array<
  Omit<Prisma.AdditionalRewardDefinitionUncheckedCreateInput, 'id'>
> = [
  {
    code: 'FREE_TASK_CREDITS',
    title: 'Free Task Credits',
    rewardType: BadgeRewardType.TASK_CREDIT,
    roleScope: BadgeRoleScope.PROVIDER,
    requirementText:
      '50 approved provider tasks with 90%+ approval = +1 credit; 100 approved provider tasks with 95%+ approval = +2 credits',
    rewardValueText: '+1 / +2 task credits',
    sortOrder: 1,
    metadata: [
      { approvedTasks: 50, approvalRate: 90, credits: 1 },
      { approvedTasks: 100, approvalRate: 95, credits: 2 },
    ],
    isActive: true,
  },
  {
    code: 'PRIORITY_HANDLING',
    title: 'Priority Handling',
    rewardType: BadgeRewardType.SUPPORT_PRIORITY,
    roleScope: BadgeRoleScope.PROVIDER,
    requirementText: 'Earn and maintain Trusted Partner badge',
    rewardValueText: 'Priority support/admin handling',
    sortOrder: 2,
    isActive: true,
  },
  {
    code: 'VISIBILITY_PRIORITY_BOOST',
    title: 'Visibility & Priority Boost',
    rewardType: BadgeRewardType.PRIORITY_BOOST,
    roleScope: BadgeRoleScope.PROVIDER,
    requirementText:
      'Earn active performance badges such as High Approval, Top Contributor, Fast Responder or Consistent Contributor',
    rewardValueText: 'Active marketplace priority/visibility benefit',
    sortOrder: 3,
    isActive: true,
  },
];
@Injectable()
export class AdditionalRewardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRewardProfileService: UserRewardProfileService,
  ) {}
  async ensureDefaultAdditionalRewards() {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const definition of DEFAULT_ADDITIONAL_REWARDS) {
      const existing = await this.prisma.additionalRewardDefinition.findUnique({
        where: { code: definition.code },
      });
      if (!existing) {
        await this.prisma.additionalRewardDefinition.create({ data: definition });
        created += 1;
        continue;
      }
      skipped += 1;
    }
    return { created, updated, skipped };
  }
  async getMyAdditionalRewards(userId: string) {
    return sendResponse(
      'Additional rewards fetched successfully.',
      await this.getMyAdditionalRewardsData(userId),
    );
  }
  async getMyAdditionalRewardsData(userId: string) {
    const [profile, definitions, activeBenefits, activeBadges] = await Promise.all([
      this.userRewardProfileService.getOrCreateProfile(userId),
      this.prisma.additionalRewardDefinition.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.userRewardBenefit.findMany({
        where: { userId, status: 'ACTIVE' },
        include: {
          sourceBadge: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      this.prisma.userBadge.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          badge: {
            select: { code: true },
          },
        },
      }),
    ]);
    const activeBenefitMap = new Map(
      activeBenefits.map((benefit) => [benefit.rewardCode, benefit]),
    );
    const activeBadgeCodes = new Set(activeBadges.map((badge) => badge.badge.code));
    return definitions.map((definition) =>
      this.toRewardView(definition, profile, activeBenefitMap, activeBadgeCodes),
    );
  }
  async getMyActiveBenefitsData(userId: string) {
    const benefits = await this.prisma.userRewardBenefit.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        sourceBadge: {
          select: {
            id: true,
            code: true,
            name: true,
            rewardImpactText: true,
          },
        },
      },
      orderBy: [{ activatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return benefits.map((benefit) => this.toActiveBenefitView(benefit));
  }
  private toRewardView(
    definition: AdditionalRewardDefinition,
    profile: {
      providerApprovedTasks: number;
      providerApprovalRate: number;
    },
    activeBenefitMap: Map<
      string,
      {
        id: string;
        rewardCode: string;
        rewardType: BadgeRewardType;
        value: number | null;
        metadata: Prisma.JsonValue;
        activatedAt: Date | null;
        expiresAt: Date | null;
        sourceBadge: { id: string; code: string; name: string } | null;
      }
    >,
    activeBadgeCodes: Set<string>,
  ) {
    const activeBenefit = activeBenefitMap.get(definition.code);
    const metadata =
      definition.metadata && typeof definition.metadata === 'object'
        ? (definition.metadata as Prisma.JsonArray | Prisma.JsonObject)
        : null;
    let progress: Record<string, unknown> | null = null;
    let status: 'ACTIVE' | 'ELIGIBLE' | 'LOCKED' = activeBenefit ? 'ACTIVE' : 'LOCKED';
    if (definition.code === 'FREE_TASK_CREDITS' && Array.isArray(metadata)) {
      const tiers = metadata as Array<{
        approvedTasks?: number;
        approvalRate?: number;
        credits?: number;
      }>;
      const nextTier =
        tiers.find(
          (tier) =>
            profile.providerApprovedTasks < (tier.approvedTasks ?? Infinity) ||
            profile.providerApprovalRate < (tier.approvalRate ?? Infinity),
        ) ?? null;
      progress = {
        approvedTasks: profile.providerApprovedTasks,
        approvalRate: profile.providerApprovalRate,
        nextTier,
      };
      status = activeBenefit ? 'ACTIVE' : profile.providerApprovedTasks > 0 ? 'ELIGIBLE' : 'LOCKED';
    } else if (definition.code === 'PRIORITY_HANDLING') {
      const qualifies = activeBadgeCodes.has('TRUSTED_PARTNER');
      progress = {
        activeTrustedPartnerBadge: qualifies,
      };
      status = activeBenefit ? 'ACTIVE' : qualifies ? 'ELIGIBLE' : 'LOCKED';
    } else if (definition.code === 'VISIBILITY_PRIORITY_BOOST') {
      const qualifies =
        activeBadgeCodes.has('HIGH_APPROVAL') ||
        activeBadgeCodes.has('TOP_CONTRIBUTOR') ||
        activeBadgeCodes.has('FAST_RESPONDER') ||
        activeBadgeCodes.has('CONSISTENT_CONTRIBUTOR');
      progress = {
        performanceBadges: Array.from(activeBadgeCodes).filter((code) =>
          ['HIGH_APPROVAL', 'TOP_CONTRIBUTOR', 'FAST_RESPONDER', 'CONSISTENT_CONTRIBUTOR'].includes(code),
        ),
      };
      status = activeBenefit ? 'ACTIVE' : qualifies ? 'ELIGIBLE' : 'LOCKED';
    }
    return {
      code: definition.code,
      title: definition.title,
      description: definition.description,
      rewardType: definition.rewardType,
      roleScope: definition.roleScope,
      requirementText: definition.requirementText,
      rewardValueText: definition.rewardValueText,
      status,
      progress,
      activeBenefit: activeBenefit
        ? {
            id: activeBenefit.id,
            value: activeBenefit.value,
            metadata: activeBenefit.metadata,
            activatedAt: activeBenefit.activatedAt,
            expiresAt: activeBenefit.expiresAt,
            sourceBadge: activeBenefit.sourceBadge,
          }
        : null,
    };
  }
  private toActiveBenefitView(
    benefit: {
      id: string;
      rewardType: BadgeRewardType;
      rewardCode: string;
      status: string;
      value: number | null;
      metadata: Prisma.JsonValue;
      activatedAt: Date | null;
      expiresAt: Date | null;
      sourceBadge: {
        id: string;
        code: string;
        name: string;
        rewardImpactText: string | null;
      } | null;
    },
  ) {
    const now = Date.now();
    const remainingDays = benefit.expiresAt
      ? Math.max(0, Math.ceil((benefit.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000)))
      : null;
    return {
      id: benefit.id,
      rewardType: benefit.rewardType,
      title: this.toBenefitTitle(benefit.rewardCode),
      description: benefit.sourceBadge?.rewardImpactText ?? this.toBenefitDescription(benefit.rewardCode),
      status: benefit.status,
      sourceBadge: benefit.sourceBadge,
      startedAt: benefit.activatedAt,
      expiresAt: benefit.expiresAt,
      remainingDays,
      metadata: this.toSafeMetadata(benefit.metadata),
    };
  }
  private toBenefitTitle(rewardCode: string) {
    return rewardCode
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
  private toBenefitDescription(rewardCode: string) {
    if (rewardCode === 'PRIORITY_HANDLING') {
      return 'Priority support handling benefit.';
    }
    if (rewardCode === 'VISIBILITY_PRIORITY_BOOST') {
      return 'Marketplace visibility and priority benefit.';
    }
    if (rewardCode === 'FREE_TASK_CREDITS') {
      return 'Task credit reward benefit.';
    }
    return 'Active reward benefit.';
  }
  private toSafeMetadata(metadata: Prisma.JsonValue) {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    return metadata;
  }
}
