import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Mirrors the Prisma enum WebsiteMarketplaceStatus (spec §7).
export type WebsiteMarketplaceStatusValue =
  | 'ACTIVE'
  | 'LOW_PRIORITY'
  | 'LIMITED_ACCESS'
  | 'UNDER_REVIEW'
  | 'RESTRICTED'
  | 'SUSPENDED';

export class SetWebsiteStatusDto {
  @IsString()
  websiteId!: string;

  @IsEnum([
    'ACTIVE',
    'LOW_PRIORITY',
    'LIMITED_ACCESS',
    'UNDER_REVIEW',
    'RESTRICTED',
    'SUSPENDED',
  ])
  status!: WebsiteMarketplaceStatusValue;

  /**
   * For LIMITED_ACCESS, the per-profile daily match cap that overrides the
   * global MarketplaceScoringConfig.maxProviderMatchesPerDay (e.g. 1).
   * Ignored for every other status. Optional.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  dailyCap?: number;

  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

// Spec §15: admin reset of a website's internal quality score. Optional target
// score (defaults to the neutral 50 baseline). reasonCode is required for audit.
export class ResetQualityScoreDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

// Spec §16: per-profile tier velocity limits consumed by TierEngine
// (weeklyInteractionLimit / tierVelocityLimit on WebsiteMatchingProfile).
export class SetTierLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  weeklyInteractionLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  tierVelocityLimit?: number;
}
