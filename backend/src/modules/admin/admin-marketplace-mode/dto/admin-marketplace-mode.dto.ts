import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional } from 'class-validator';

/**
 * Admin-settable marketplace mode (spec §28).
 * EARLY_STAGE = conservative relaxation; SCALING = apply the
 * `preset` overrides (relaxed minViableMatches / maxRelaxationLevel, velocity caps).
 */
export type MarketplaceModeValue = 'EARLY_STAGE' | 'SCALING';

export const MARKETPLACE_MODE_VALUES: MarketplaceModeValue[] = [
  'EARLY_STAGE',
  'SCALING',
];

/**
 * Body for PUT /admin/marketplace-mode.
 * `preset` is a free-form JSON bag of overrides (per spec §28) such as
 * relaxed `minViableMatches`, `maxRelaxationLevel`, and velocity caps.
 * Only `minViableMatches` / `maxRelaxationLevel` are consumed by the
 * MatchingEngine today; the rest are retained for future use without a
 * schema change.
 */
export class SetMarketplaceModeDto {
  @IsIn(MARKETPLACE_MODE_VALUES)
  mode: MarketplaceModeValue;

  @IsOptional()
  @IsObject()
  @Type(() => Object)
  preset?: Record<string, unknown>;
}
