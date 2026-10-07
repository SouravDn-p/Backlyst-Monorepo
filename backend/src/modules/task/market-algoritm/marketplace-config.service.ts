import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheUtil } from 'src/cache/redis-cache.util';

export type MergedMarketplaceConfig = {
  compatibilityWeight: number;
  opportunityWeight: number;
  visibilityWeight: number;
  reputationWeight: number;
  boostWeight: number;
  forceMatchBonus: number;
  exposurePenaltyPerTaskView: number;
  maxProviderMatchesPerDay: number;
  maxRequesterExposurePerDay: number;
  riskPenaltyRejectionWeight: number;
  riskPenaltyDisputeWeight: number;
  newWebsiteBoostFactor: number;
  internalPriorityWeight: number;
  diversityWeight: number;
  behaviourWeight: number;
  qualityWeight: number;
  lowPriorityFactor: number;

  // Spec §7 / Visibility Control audit (2026-07-18): separate visibility
  // factors for RESTRICTED (significant reduction) and UNDER_REVIEW (monitored
  // visibility) statuses, plus the RESTRICTED daily participation-cap fraction.
  restrictedVisibilityFactor: number;
  underReviewVisibilityFactor: number;
  restrictedDailyCapFactor: number;

  // Spec §7 (audit 2026-07-18, violation b): per-profile daily match cap the
  // automatic Quality Engine applies when a site is degraded to LIMITED_ACCESS.
  // Admin-configurable so the "reduced" exposure is a soft throttle rather than
  // a near-total, hard-coded participation cut. The global
  // maxProviderMatchesPerDay remains the ceiling.
  limitedAccessDailyCap: number;

  minViableMatches: number;
  maxRelaxationLevel: number;
  repeatPairCooldownDays: number;
  reciprocalCooldownDays: number;
  maxNetworkConcentrationPerWindow: number;
  networkConcentrationWindowDays: number;
  // Spec §6/§7/§9: Website Quality Engine automatic status thresholds.
  qualityActiveThreshold: number;
  qualityLowPriorityThreshold: number;
  qualityLimitedAccessThreshold: number;
  qualityGradualTransitions: boolean;
  qualityMinInteractionsForStatus: number;
  qualityUnderReviewRiskThreshold: number;

  // Spec §6: quality-composite sub-signal weights + premium-access threshold.
  qualityCompletionWeight: number;
  qualityReliabilityWeight: number;
  qualityRatingWeight: number;
  qualityActivityWeight: number;
  qualityConsistencyWeight: number;
  qualityDiversityWeight: number;
  qualityBehaviourWeight: number;
  qualityPremiumAccessThreshold: number;

  mode: string;
};

const CONFIG_CACHE_KEY = 'marketplace:scoring-config:merged';
const CONFIG_CACHE_TTL = 60;

/**
 * Spec §9 / audit R4: automatic mode-dependent cooldown defaults applied when
 * neither the mode preset nor the active scoring config sets an explicit value.
 * EARLY_STAGE uses the tighter 90d reciprocal / 60d repeat window (spec
 * recommends 60–90d); SCALING uses 120d reciprocal / 90d repeat.
 */
const MODE_DEFAULT_COOLDOWN_DAYS: Record<
  string,
  { repeat: number; reciprocal: number }
> = {
  EARLY_STAGE: { repeat: 60, reciprocal: 90 },
  SCALING: { repeat: 90, reciprocal: 120 },
};

@Injectable()
export class MarketplaceConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheUtil: CacheUtil,
  ) {}

  async invalidateConfigCache(): Promise<void> {
    await this.cacheUtil.delete(CONFIG_CACHE_KEY);
  }

  /**
   * Returns the scoring configuration merged with the current marketplace mode preset.
   * If the mode is SCALING and a preset exists, the preset overrides take precedence.
   */
  async getMergedConfig(): Promise<MergedMarketplaceConfig> {
    return this.cacheUtil.getWithAutoRefresh(
      CONFIG_CACHE_KEY,
      () => this.fetchMergedConfig(),
      CONFIG_CACHE_TTL,
    );
  }

  private async fetchMergedConfig(): Promise<MergedMarketplaceConfig> {
    const config = await this.prisma.marketplaceScoringConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const modeConfig = await this.prisma.marketplaceModeConfig.findUnique({
      where: { id: 'MARKETPLACE_MODE_CONFIG' },
    });

    // Resolve the active mode once so the per-mode reciprocal/repeat cooldown
    // defaults below (audit R4) can be applied when no explicit value is set.
    const mode: string = modeConfig?.mode ?? 'EARLY_STAGE';

    const modePreset =
      modeConfig?.mode === 'SCALING' &&
      modeConfig.preset &&
      typeof modeConfig.preset === 'object'
        ? (modeConfig.preset as Record<string, unknown>)
        : {};

    const safeNumber = (value: unknown, fallback: number) => {
      if (value === undefined || value === null) return fallback;
      const num = Number(value);
      return isNaN(num) ? fallback : num;
    };

    return {
      compatibilityWeight: safeNumber(
        modePreset.compatibilityWeight ?? config?.compatibilityWeight,
        0.35,
      ),
      opportunityWeight: safeNumber(
        modePreset.opportunityWeight ?? config?.opportunityWeight,
        0.25,
      ),
      visibilityWeight: safeNumber(
        modePreset.visibilityWeight ?? config?.visibilityWeight,
        0.15,
      ),
      reputationWeight: safeNumber(
        modePreset.reputationWeight ?? config?.reputationWeight,
        0.15,
      ),
      boostWeight: safeNumber(
        modePreset.boostWeight ?? config?.boostWeight,
        0.1,
      ),
      forceMatchBonus: safeNumber(
        modePreset.forceMatchBonus ?? config?.forceMatchBonus,
        1000,
      ),
      exposurePenaltyPerTaskView: safeNumber(
        modePreset.exposurePenaltyPerTaskView ??
          config?.exposurePenaltyPerTaskView,
        2,
      ),
      maxProviderMatchesPerDay: safeNumber(
        modePreset.maxProviderMatchesPerDay ?? config?.maxProviderMatchesPerDay,
        3,
      ),
      maxRequesterExposurePerDay: safeNumber(
        modePreset.maxRequesterExposurePerDay ??
          config?.maxRequesterExposurePerDay,
        50,
      ),
      riskPenaltyRejectionWeight: safeNumber(
        modePreset.riskPenaltyRejectionWeight ??
          config?.riskPenaltyRejectionWeight,
        10,
      ),
      riskPenaltyDisputeWeight: safeNumber(
        modePreset.riskPenaltyDisputeWeight ?? config?.riskPenaltyDisputeWeight,
        20,
      ),
      newWebsiteBoostFactor: safeNumber(
        modePreset.newWebsiteBoostFactor ?? config?.newWebsiteBoostFactor,
        2.5,
      ),
      internalPriorityWeight: safeNumber(
        modePreset.internalPriorityWeight ?? config?.internalPriorityWeight,
        0.1,
      ),
      diversityWeight: safeNumber(
        modePreset.diversityWeight ?? config?.diversityWeight,
        0.05,
      ),
      behaviourWeight: safeNumber(
        modePreset.behaviourWeight ?? config?.behaviourWeight,
        0.05,
      ),
      qualityWeight: safeNumber(
        modePreset.qualityWeight ?? (config as any)?.qualityWeight,
        0.05,
      ),
      lowPriorityFactor: safeNumber(
        modePreset.lowPriorityFactor ?? config?.lowPriorityFactor,
        0.7,
      ),

      restrictedVisibilityFactor: safeNumber(
        modePreset.restrictedVisibilityFactor ??
          (config as any)?.restrictedVisibilityFactor,
        0.4,
      ),
      underReviewVisibilityFactor: safeNumber(
        modePreset.underReviewVisibilityFactor ??
          (config as any)?.underReviewVisibilityFactor,
        0.7,
      ),
      restrictedDailyCapFactor: safeNumber(
        modePreset.restrictedDailyCapFactor ??
          (config as any)?.restrictedDailyCapFactor,
        0.34,
      ),
      limitedAccessDailyCap: safeNumber(
        modePreset.limitedAccessDailyCap ??
          (config as any)?.limitedAccessDailyCap,
        1,
      ),

      minViableMatches: safeNumber(
        modePreset.minViableMatches ?? (config as any)?.minViableMatches,
        10,
      ),
      maxRelaxationLevel: safeNumber(
        modePreset.maxRelaxationLevel ?? (config as any)?.maxRelaxationLevel,
        4,
      ),
      // Spec §9 / audit R4: automatic mode-dependent reciprocal + repeat
      // cooldowns. When neither the mode preset nor the config explicitly sets
      // a value, fall back to the per-mode default below so EARLY_STAGE ships
      // with the tighter 90d reciprocal / 60d repeat window (spec recommends
      // 60–90d) and SCALING uses the 120d reciprocal / 90d repeat window.
      repeatPairCooldownDays: safeNumber(
        modePreset.repeatPairCooldownDays ??
          (config as any)?.repeatPairCooldownDays,
        MODE_DEFAULT_COOLDOWN_DAYS[mode].repeat,
      ),
      reciprocalCooldownDays: safeNumber(
        modePreset.reciprocalCooldownDays ??
          (config as any)?.reciprocalCooldownDays,
        MODE_DEFAULT_COOLDOWN_DAYS[mode].reciprocal,
      ),
      maxNetworkConcentrationPerWindow: safeNumber(
        modePreset.maxNetworkConcentrationPerWindow ??
          (config as any)?.maxNetworkConcentrationPerWindow,
        50,
      ),
      networkConcentrationWindowDays: safeNumber(
        modePreset.networkConcentrationWindowDays ??
          (config as any)?.networkConcentrationWindowDays,
        7,
      ),
      qualityActiveThreshold: safeNumber(
        modePreset.qualityActiveThreshold ??
          (config as any)?.qualityActiveThreshold,
        60,
      ),
      qualityLowPriorityThreshold: safeNumber(
        modePreset.qualityLowPriorityThreshold ??
          (config as any)?.qualityLowPriorityThreshold,
        40,
      ),
      qualityLimitedAccessThreshold: safeNumber(
        modePreset.qualityLimitedAccessThreshold ??
          (config as any)?.qualityLimitedAccessThreshold,
        25,
      ),
      qualityGradualTransitions:
        (modePreset.qualityGradualTransitions ??
          (config as any)?.qualityGradualTransitions ??
          true) !== false,
      qualityMinInteractionsForStatus: safeNumber(
        modePreset.qualityMinInteractionsForStatus ??
          (config as any)?.qualityMinInteractionsForStatus,
        5,
      ),
      qualityUnderReviewRiskThreshold: safeNumber(
        modePreset.qualityUnderReviewRiskThreshold ??
          (config as any)?.qualityUnderReviewRiskThreshold,
        60,
      ),

      qualityCompletionWeight: safeNumber(
        modePreset.qualityCompletionWeight ??
          (config as any)?.qualityCompletionWeight,
        0.25,
      ),
      qualityReliabilityWeight: safeNumber(
        modePreset.qualityReliabilityWeight ??
          (config as any)?.qualityReliabilityWeight,
        0.25,
      ),
      qualityRatingWeight: safeNumber(
        modePreset.qualityRatingWeight ?? (config as any)?.qualityRatingWeight,
        0.2,
      ),
      qualityActivityWeight: safeNumber(
        modePreset.qualityActivityWeight ??
          (config as any)?.qualityActivityWeight,
        0.1,
      ),
      qualityConsistencyWeight: safeNumber(
        modePreset.qualityConsistencyWeight ??
          (config as any)?.qualityConsistencyWeight,
        0.1,
      ),
      qualityDiversityWeight: safeNumber(
        modePreset.qualityDiversityWeight ??
          (config as any)?.qualityDiversityWeight,
        0.05,
      ),
      qualityBehaviourWeight: safeNumber(
        modePreset.qualityBehaviourWeight ??
          (config as any)?.qualityBehaviourWeight,
        0.05,
      ),
      qualityPremiumAccessThreshold: safeNumber(
        modePreset.qualityPremiumAccessThreshold ??
          (config as any)?.qualityPremiumAccessThreshold,
        75,
      ),

      mode: modeConfig?.mode ?? 'EARLY_STAGE',
    };
  }
}
