import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { UpdateScoringConfigDto } from './dto/update-scoring-config.dto';
import { MarketplaceConfigService } from 'src/modules/task/market-algoritm/marketplace-config.service';

const CONFIG_ID = 'MARKETPLACE_SCORING_CONFIG';

@Injectable()
export class AdminMarketplaceConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketplaceConfigService: MarketplaceConfigService,
  ) {}

  async getConfig() {
    const config = await this.prisma.marketplaceScoringConfig.findUnique({
      where: { id: CONFIG_ID },
    });
    return sendResponse(
      'Marketplace scoring config fetched successfully',
      config,
    );
  }

  async updateConfig(adminId: string, dto: UpdateScoringConfigDto) {
    // Build a partial payload from only the provided (validated) fields so a
    // partial update never resets unspecified columns to defaults.
    const data: Record<string, unknown> = {};
    const keys: (keyof UpdateScoringConfigDto)[] = [
      'compatibilityWeight',
      'opportunityWeight',
      'visibilityWeight',
      'reputationWeight',
      'boostWeight',
      'minViableMatches',
      'maxRelaxationLevel',
      'repeatPairCooldownDays',
      'reciprocalCooldownDays',
      'maxNetworkConcentrationPerWindow',
      'networkConcentrationWindowDays',
      'maxProviderMatchesPerDay',
      'isActive',
      'newWebsiteBoostFactor',
      'riskPenaltyDisputeWeight',
      'neglectedAfterHours',
      'forceMatchAfterHours',
      'lowPriorityFactor',
      // Spec §6: Website Quality Engine tunables (previously deploy-only).
      'qualityWeight',
      'restrictedVisibilityFactor',
      'underReviewVisibilityFactor',
      'restrictedDailyCapFactor',
      'qualityActiveThreshold',
      'qualityLowPriorityThreshold',
      'qualityLimitedAccessThreshold',
      'qualityGradualTransitions',
      'qualityMinInteractionsForStatus',
      'qualityUnderReviewRiskThreshold',
      'qualityCompletionWeight',
      'qualityReliabilityWeight',
      'qualityRatingWeight',
      'qualityActivityWeight',
      'qualityConsistencyWeight',
      'qualityDiversityWeight',
      'qualityBehaviourWeight',
      'qualityPremiumAccessThreshold',
    ];

    for (const key of keys) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }

    const config = await this.prisma.$transaction(async (tx) => {
      const oldConfig = await tx.marketplaceScoringConfig.findUnique({
        where: { id: CONFIG_ID },
      });

      const updated = await tx.marketplaceScoringConfig.upsert({
        where: { id: CONFIG_ID },
        create: {
          id: CONFIG_ID,
          ...(data as any),
        },
        update: data as any,
      });

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'SCORING_CONFIG_UPDATED',
          targetType: 'CONFIG',
          targetId: CONFIG_ID,
          previousValue: oldConfig as any,
          newValue: data as any,
          reasonCode: dto.reasonCode,
        },
      });

      return updated;
    });

    await this.marketplaceConfigService.invalidateConfigCache().catch(() => {});

    return sendResponse(
      'Marketplace scoring config updated successfully',
      config,
    );
  }
}
