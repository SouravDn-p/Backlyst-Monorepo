import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ValidationEngine } from 'src/modules/task/market-algoritm/validation.engine';

/**
 * Task-status values that represent an "open" marketplace demand signal
 * (spec §19). These are `TaskStatus` enum members.
 */
const OPEN_TASK_STATUSES = ['OPEN', 'WAITING_FOR_APPLICANTS'] as const;

/** Fallback used when the singleton scoring config row is missing. */
const DEFAULT_MIN_VIABLE_MATCHES = 10;

export interface MarketplaceLiquiditySnapshot {
  demand: number;
  supply: number;
  supplyDemandRatio: number;
  providerRequesterRatio: number;
  flags: { LOW_SUPPLY: boolean; LOW_DEMAND: boolean };
  minViableMatches: number;
  generatedAt: string;
}

/**
 * LiquidityService (T10 — "Supply vs Demand monitor", spec §19).
 *
 * Produces a live snapshot of marketplace liquidity:
 *  - Supply = eligible provider websites (reuses `ValidationEngine`
 *    eligibility; never re-implemented here).
 *  - Demand = count of open marketplace tasks.
 *  - Flags LOW_SUPPLY / LOW_DEMAND relative to the configured
 *    `minViableMatches` reference.
 *
 * Read-only: no writes, no new Prisma models.
 */
@Injectable()
export class LiquidityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationEngine: ValidationEngine,
  ) {}

  async getLiquiditySnapshot(): Promise<MarketplaceLiquiditySnapshot> {
    // Two independent reads run in parallel.
    const [eligibleWebsiteIds, demand] = await Promise.all([
      this.validationEngine.getEligibleMarketplaceWebsiteIds(),
      this.prisma.placementTask.count({
        where: { lifecycleStatus: { in: [...OPEN_TASK_STATUSES] } },
      }),
    ]);

    const supply = eligibleWebsiteIds.length;

    const config = (await this.prisma.marketplaceScoringConfig.findFirst()) ?? {
      minViableMatches: DEFAULT_MIN_VIABLE_MATCHES,
    };
    const minViableMatches = config.minViableMatches;

    const supplyDemandRatio = this.roundTo2(demand / Math.max(supply, 1));
    const providerRequesterRatio = this.roundTo2(supply / Math.max(demand, 1));

    const flags = {
      LOW_SUPPLY: supply < minViableMatches && demand > 0,
      LOW_DEMAND: demand < minViableMatches && supply > 0,
    };

    return {
      demand,
      supply,
      supplyDemandRatio,
      providerRequesterRatio,
      flags,
      minViableMatches,
      generatedAt: new Date().toISOString(),
    };
  }

  private roundTo2(value: number): number {
    return Number(value.toFixed(2));
  }
}
