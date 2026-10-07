import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = PrismaClient | Prisma.TransactionClient;

/**
 * TierEngine (spec §13 / §16).
 *
 * Resolves a user's effective marketplace tier and the velocity caps that tier
 * grants. The marketplace profile may carry explicit `weeklyInteractionLimit`
 * / `tierVelocityLimit` overrides; when absent we fall back to per-`PlanTier`
 * defaults. Paid tiers therefore grant proportionally higher weekly capacity
 * and priority, which the validation engine enforces (LEVEL 3).
 */
@Injectable()
export class TierEngine {
  // Default weekly interaction ceiling per subscription tier (spec §16).
  private readonly WEEKLY_LIMIT_BY_TIER: Record<string, number> = {
    FREE: 2,
    SILVER: 3,
    GOLD: 4,
    PLATINUM: 5,
    ENTERPRISE: 5,
  };

  // Priority multiplier applied to ranking for higher tiers (spec §16).
  private readonly PRIORITY_BY_TIER: Record<string, number> = {
    FREE: 1,
    SILVER: 1.2,
    GOLD: 1.5,
    PLATINUM: 1.8,
    ENTERPRISE: 2,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the user's active subscription tier, defaulting to FREE when the
   * user has no active subscription.
   */
  async resolveTier(userId: string, tx?: TxClient): Promise<string> {
    const client = tx ?? this.prisma;
    const subscription = await client.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: { select: { tier: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return subscription?.plan?.tier ?? 'FREE';
  }

  /**
   * Resolve the domain pool access level based on the tier (spec §16).
   */
  resolveDomainPool(tier: string): 'LIMITED' | 'IMPROVED' | 'PREMIUM' {
    const normalized = tier.toUpperCase();
    if (['PLATINUM', 'ENTERPRISE'].includes(normalized)) return 'PREMIUM';
    if (normalized === 'GOLD') return 'IMPROVED';
    return 'LIMITED';
  }

  /**
   * Resolve the effective weekly interaction cap and tier-velocity priority for
   * a user, honouring any explicit profile overrides.
   */
  async resolveTierLimits(
    userId: string,
    profile?: {
      weeklyInteractionLimit?: number | null;
      tierVelocityLimit?: number | null;
    } | null,
    tx?: TxClient,
  ): Promise<{
    tier: string;
    weeklyInteractionLimit: number;
    tierVelocityLimit: number;
  }> {
    const tier = await this.resolveTier(userId, tx);
    const defaultWeekly =
      this.WEEKLY_LIMIT_BY_TIER[tier] ?? this.WEEKLY_LIMIT_BY_TIER.FREE;
    const defaultPriority =
      this.PRIORITY_BY_TIER[tier] ?? this.PRIORITY_BY_TIER.FREE;

    return {
      tier,
      weeklyInteractionLimit: profile?.weeklyInteractionLimit ?? defaultWeekly,
      tierVelocityLimit: profile?.tierVelocityLimit ?? defaultPriority,
    };
  }

  /**
   * Count the actor's completed/assigned marketplace interactions in the
   * trailing 7 days across all of their provider websites.
   */
  async countWeeklyInteractions(
    userId: string,
    tx?: TxClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const websites = await client.website.findMany({
      where: { authorId: userId, isDeleted: false },
      select: { id: true },
    });
    const websiteIds = websites.map((w) => w.id);
    if (websiteIds.length === 0) return 0;

    return client.placementTask.count({
      where: {
        assignedProviderWebsiteId: { in: websiteIds },
        completedAt: { gte: since },
      },
    });
  }

  /**
   * Count the completed/assigned marketplace interactions in the trailing 7 days
   * for a specific root domain across the entire marketplace.
   */
  async countDomainWeeklyInteractions(
    rootDomain: string,
    tx?: TxClient,
  ): Promise<number> {
    if (!rootDomain) return 0;
    const client = tx ?? this.prisma;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const websites = await client.website.findMany({
      where: {
        isDeleted: false,
        OR: [
          { rootDomain: rootDomain },
          { websiteUrl: { contains: rootDomain } },
        ],
      },
      select: { id: true },
    });

    const websiteIds = websites.map((w) => w.id);
    if (websiteIds.length === 0) return 0;

    return client.placementTask.count({
      where: {
        assignedProviderWebsiteId: { in: websiteIds },
        completedAt: { gte: since },
      },
    });
  }
}
