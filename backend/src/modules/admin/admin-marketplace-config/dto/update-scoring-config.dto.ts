import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsString,
} from 'class-validator';

/**
 * Admin-updatable subset of MarketplaceScoringConfig.
 * Only the fields operators need to tune at runtime are exposed; the row is a
 * singleton keyed by a fixed id, so this is an upsert-by-id, not create.
 */
export class UpdateScoringConfigDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  compatibilityWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  opportunityWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  visibilityWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  reputationWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  boostWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  minViableMatches?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  maxRelaxationLevel?: number;

  // Cooldown windows (spec §9 / §10). Drives repeat-pair and reciprocal checks.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  repeatPairCooldownDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  reciprocalCooldownDays?: number;

  // Network-concentration cap (spec §11): max matches a single root domain may
  // absorb within networkConcentrationWindowDays.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  maxNetworkConcentrationPerWindow?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  networkConcentrationWindowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxProviderMatchesPerDay?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // --- Fields actually consumed by the ranking/opportunity engines (spec §4/§20) ---

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  newWebsiteBoostFactor?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  riskPenaltyDisputeWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24 * 365)
  neglectedAfterHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24 * 365)
  forceMatchAfterHours?: number;

  // Spec §7: final-score multiplier for LOW_PRIORITY profiles. Identity (1.0)
  // for every other status, so ACTIVE ranking is unaffected.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  lowPriorityFactor?: number;

  // ---- Spec §6: Website Quality Engine tunables (previously deploy-only) ----
  // Ranking weight for the internal qualityScore signal.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityWeight?: number;

  // Visibility Control status factors + RESTRICTED daily-cap fraction.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  restrictedVisibilityFactor?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  underReviewVisibilityFactor?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  restrictedDailyCapFactor?: number;

  // Automatic status-band thresholds (0..100). Higher = better.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  qualityActiveThreshold?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  qualityLowPriorityThreshold?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  qualityLimitedAccessThreshold?: number;

  @IsOptional()
  @IsBoolean()
  qualityGradualTransitions?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  qualityMinInteractionsForStatus?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  qualityUnderReviewRiskThreshold?: number;

  // Quality-composite sub-signal weights (spec §6). Normalized at compute time.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityCompletionWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityReliabilityWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityRatingWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityActivityWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityConsistencyWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityDiversityWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  qualityBehaviourWeight?: number;

  // Spec §6: premium-opportunity-access quality threshold (0 disables gating).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  qualityPremiumAccessThreshold?: number;

  @IsString()
  reasonCode!: string;
}
