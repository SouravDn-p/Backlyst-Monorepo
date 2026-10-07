import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { clampScore } from './scoring.utils';

@Injectable()
export class LiquidityEngine {
  private readonly logger = new Logger(LiquidityEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute an opportunity score (0-100) for a provider website.
   *
   * Higher scores indicate more untapped demand relative to local supply,
   * rewarding providers who have been overlooked or operate in niches where
   * requesters are actively seeking placements.
   *
   * Three weighted components:
   *   40 % – demand ratio   (open tasks / active providers in category)
   *   30 % – inactivity     (log-time since last match)
   *   30 % – supply scarcity (inverse of provider density)
   */
  async calculateOpportunityScore(websiteId: string): Promise<number> {
    try {
      const profile = await this.prisma.websiteMatchingProfile.findUnique({
        where: { websiteId },
        select: {
          lastMatchedAt: true,
          totalInteractions: true,
        },
      });

      const website = await this.prisma.website.findUnique({
        where: { id: websiteId },
        select: {
          marketplaceCategories: {
            select: { role: true, category: { select: { slug: true } } },
          },
        },
      });

      if (!profile || !website) {
        return 50;
      }

      const category =
        website.marketplaceCategories?.find((c) => c.role === 'PRIMARY')
          ?.category?.slug ?? null;

      let demandScore = 0;
      let supplyScore = 0;

      if (category) {
        const categoryWebsites =
          await this.prisma.websiteMarketplaceCategory.findMany({
            where: { categoryId: category, website: { isDeleted: false } },
            select: { websiteId: true },
          });
        const websiteIds = categoryWebsites.map((w) => w.websiteId);

        const [openTaskCount, activeProviderCount] = await Promise.all([
          this.prisma.placementTask.count({
            where: {
              lifecycleStatus: { in: ['OPEN', 'WAITING_FOR_APPLICANTS'] },
              requesterWebsiteId: { in: websiteIds },
            },
          }),
          this.prisma.websiteMatchingProfile.count({
            where: {
              websiteId: { in: websiteIds },
            },
          }),
        ]);

        const demandRatio =
          activeProviderCount > 0
            ? openTaskCount / activeProviderCount
            : openTaskCount;

        demandScore = clampScore(demandRatio * 20, 0, 100);

        supplyScore = clampScore(
          (1 - Math.min(activeProviderCount / 100, 1)) * 100,
          0,
        );
      }

      const inactiveDays = profile.lastMatchedAt
        ? Math.max(
            0,
            (Date.now() - profile.lastMatchedAt.getTime()) / 86_400_000,
          )
        : 90;

      const inactivityScore = clampScore(Math.log1p(inactiveDays) * 15, 0, 100);

      const raw = demandScore * 0.4 + inactivityScore * 0.3 + supplyScore * 0.3;

      return clampScore(Math.round(raw));
    } catch (error) {
      this.logger.error(
        `Failed to compute opportunity score for ${websiteId}`,
        error,
      );
      return 50;
    }
  }
}
