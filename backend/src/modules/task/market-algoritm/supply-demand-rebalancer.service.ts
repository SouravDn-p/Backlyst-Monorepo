import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketplaceOverrideService } from './marketplace-override.service';

@Injectable()
export class SupplyDemandRebalancerService {
  private readonly logger = new Logger(SupplyDemandRebalancerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly overrideService: MarketplaceOverrideService,
  ) {}

  /**
   * Called when demand drastically exceeds supply (ratio < 0.2).
   * E.g., <1 provider per 5 tasks.
   * Actions:
   * - Temporarily increase maxRelaxationLevel by 1 in mode preset
   * - Apply BOOST to active providers
   */
  async handleDemandSurplus() {
    this.logger.log('Executing auto-rebalance for Demand Surplus');
    const adminUser = await this.prisma.user.findFirst({
      where: { role: 'ADMIN', status: 'ACTIVE', isDeleted: false },
    });
    const adminId = adminUser?.id || 'system';

    // 1. Temporarily increase maxRelaxationLevel in MarketPlaceModeConfig preset
    await this.relaxMatchingConstraints();

    // 2. Apply BOOST override (+0.5) to all ACTIVE providers for 24h
    await this.boostActiveProviders(adminId);
  }

  /**
   * Called when supply drastically exceeds demand (ratio > 5).
   * E.g., >5 providers per 1 task.
   * Actions:
   * - Increase NicheDistributionCap maxPerWindow by 20%
   * - Apply SUPPRESS override to low-reputation providers
   */
  async handleSupplySurplus() {
    this.logger.log('Executing auto-rebalance for Supply Surplus');
    const adminUser = await this.prisma.user.findFirst({
      where: { role: 'ADMIN', status: 'ACTIVE', isDeleted: false },
    });
    const adminId = adminUser?.id || 'system';

    // 1. Increase niche caps by 20%
    await this.increaseNicheCaps();

    // 2. Suppress low-reputation providers
    await this.suppressLowReputationProviders(adminId);
  }

  private async relaxMatchingConstraints() {
    // Only modify mode preset if it exists, otherwise do nothing
    const config = await this.prisma.marketplaceModeConfig.findUnique({
      where: { id: 'MARKETPLACE_MODE_CONFIG' },
    });

    if (config) {
      const preset = (config.preset as Record<string, unknown>) || {};
      const currentLevel =
        typeof preset.maxRelaxationLevel === 'number'
          ? preset.maxRelaxationLevel
          : 4;

      const newPreset = { ...preset, maxRelaxationLevel: currentLevel + 1 };

      await this.prisma.marketplaceModeConfig.update({
        where: { id: 'MARKETPLACE_MODE_CONFIG' },
        data: { preset: newPreset },
      });

      this.logger.log(
        `Relaxed matching constraints (maxRelaxationLevel: ${currentLevel} -> ${currentLevel + 1})`,
      );
    }
  }

  private async boostActiveProviders(adminId: string) {
    const activeProviders = await this.prisma.websiteMatchingProfile.findMany({
      where: { marketplaceStatus: 'ACTIVE' },
      select: { websiteId: true },
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    let boosted = 0;
    for (const provider of activeProviders) {
      // Check if already boosted to make it idempotent
      const existing = await this.prisma.marketplaceOverride.findFirst({
        where: {
          websiteId: provider.websiteId,
          type: 'BOOST',
          status: 'ACTIVE',
          reasonCode: 'AUTO_REBALANCE_DEMAND_SURPLUS',
        },
      });

      if (!existing) {
        await this.prisma.marketplaceOverride.create({
          data: {
            websiteId: provider.websiteId,
            adminId,
            type: 'BOOST',
            status: 'ACTIVE',
            boostValue: 0.5,
            reasonCode: 'AUTO_REBALANCE_DEMAND_SURPLUS',
            note: 'Auto-rebalancing due to high demand',
            activeFrom: now,
            activeUntil: expiresAt,
          },
        });
        boosted++;
      }
    }

    this.logger.log(`Applied BOOST override to ${boosted} active providers`);
  }

  private async increaseNicheCaps() {
    const caps = await this.prisma.nicheDistributionCap.findMany({
      where: { isActive: true },
    });

    let updated = 0;
    for (const cap of caps) {
      const newMax = Math.ceil(cap.maxPerWindow * 1.2);
      if (newMax > cap.maxPerWindow) {
        await this.prisma.nicheDistributionCap.update({
          where: { id: cap.id },
          data: { maxPerWindow: newMax },
        });
        updated++;
      }
    }

    this.logger.log(
      `Increased NicheDistributionCap maxPerWindow by 20% for ${updated} categories`,
    );
  }

  private async suppressLowReputationProviders(adminId: string) {
    // Risk > 50 OR Quality < 40
    const lowRepProviders = await this.prisma.websiteMatchingProfile.findMany({
      where: {
        marketplaceStatus: 'ACTIVE',
        OR: [{ riskScore: { gt: 50 } }, { avgQualityRating: { lt: 40 } }],
      },
      select: { websiteId: true },
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    let suppressed = 0;
    for (const provider of lowRepProviders) {
      const existing = await this.prisma.marketplaceOverride.findFirst({
        where: {
          websiteId: provider.websiteId,
          type: 'SCORE_OVERRIDE',
          status: 'ACTIVE',
          reasonCode: 'AUTO_REBALANCE_SUPPLY_SURPLUS',
        },
      });

      if (!existing) {
        await this.prisma.marketplaceOverride.create({
          data: {
            websiteId: provider.websiteId,
            adminId,
            type: 'SCORE_OVERRIDE',
            status: 'ACTIVE',
            suppressUntil: expiresAt,
            reasonCode: 'AUTO_REBALANCE_SUPPLY_SURPLUS',
            note: 'Auto-rebalancing due to high supply - suppressing low rep provider',
            activeFrom: now,
            activeUntil: expiresAt,
          },
        });
        suppressed++;
      }
    }

    this.logger.log(
      `Applied suppression override to ${suppressed} low-reputation providers`,
    );
  }
}
