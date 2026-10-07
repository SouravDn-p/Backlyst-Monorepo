import { Injectable, Logger } from '@nestjs/common';
import { RankingService, RankingMarketplaceMode } from './ranking.service';
import { VisibilityControlService } from './visibility-control.service';
import { MarketplaceConfigService } from './marketplace-config.service';
import { MarketplaceOverrideService } from './marketplace-override.service';
import { ImpressionService } from './impression.service';
import { MatchCandidate, RankedMatchCandidate } from './matching.types';

export type RecommendationInput = {
  providerId: string;
  candidates: MatchCandidate[];
  marketplaceMode?: RankingMarketplaceMode;
};

export type RecommendationResult = {
  /** All ranked + visibility-adjusted candidates (best-per-task, ordered). */
  ranked: RankedMatchCandidate[];
  /** True when ranking itself threw and was safely isolated. */
  degraded: boolean;
};

/**
 * RecommendationService (spec flow: Ranking Engine → Recommendation Service →
 * Opportunity Presentation).
 *
 * This is the dedicated component the spec requires between the pure Ranking
 * Engine and the presentation layer. It:
 *   1. Invokes the RankingService (pure ordering, no writes) with the full
 *      RankingInput contract (candidates + marketplace mode + provider id).
 *   2. Provides FAILURE ISOLATION — a ranking exception is caught and turned
 *      into a safe empty result so a technical failure never leaks as a raw 500
 *      "Internal Marketplace Error" to the client (spec §14 / §17).
 *   3. Records opportunity impressions for the PAGE actually shown, delegating
 *      the state-mutating analytics write to the ImpressionService (kept OUT of
 *      the Ranking Engine) as a best-effort fire-and-forget so it never blocks
 *      or breaks the read path (spec §13 performance / §15 architecture).
 *
 * The presentation concerns (trust enrichment, S3 resolution, pagination) stay
 * in the caller (ProviderTaskService); this service owns the ranking→exposure
 * orchestration boundary.
 */
@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly rankingService: RankingService,
    private readonly visibilityControlService: VisibilityControlService,
    private readonly configService: MarketplaceConfigService,
    private readonly overrideService: MarketplaceOverrideService,
    private readonly impressionService: ImpressionService,
  ) {}

  /**
   * Rank candidates with failure isolation, then apply the Visibility Control
   * stage (spec flow: Ranking Engine → Visibility Control → Recommendation).
   *
   * Never throws — on any ranking error it returns an empty, degraded result so
   * the orchestrator can surface the safe "no opportunities available" message
   * instead of a 500. A Visibility Control failure is also isolated: if it
   * throws we fall back to the already-ranked candidates so exposure is never
   * blocked by an observability/adjustment error (spec §17 failure handling).
   */
  async recommend(input: RecommendationInput): Promise<RecommendationResult> {
    let ranked: RankedMatchCandidate[];
    try {
      ranked = await this.rankingService.rankAndFilter({
        candidates: input.candidates,
        providerId: input.providerId,
        marketplaceMode: input.marketplaceMode,
      });
    } catch (error) {
      // Failure isolation: technical failures must remain hidden (spec §17).
      this.logger.error(
        `Ranking failed for provider ${input.providerId}; returning safe empty result: ${
          (error as Error)?.message ?? error
        }`,
      );
      return { ranked: [], degraded: true };
    }

    // --- Visibility Control stage (post-ranking) ---------------------------
    try {
      const config = await this.configService.getMergedConfig();

      // Reuse a single daily-count snapshot + override resolution for both the
      // ranking governance drops and the visibility-control status treatment,
      // so the per-request placementTask / override scans run once, not twice.
      const websiteIds = input.candidates.map((c) => c.providerWebsite.id);
      const dailyProviderWebsiteCounts =
        await this.rankingService.getDailyProviderWebsiteCounts(websiteIds);

      const overridesByWebsite = new Map<string, any>();
      await Promise.all(
        [...new Set(websiteIds)].map(async (id) => {
          overridesByWebsite.set(
            id,
            await this.overrideService.resolveForWebsite(id),
          );
        }),
      );

      const visible = await this.visibilityControlService.apply(
        ranked,
        config,
        {
          providerId: input.providerId,
          marketplaceMode: input.marketplaceMode,
          dailyProviderWebsiteCounts,
          overridesByWebsite,
        },
      );
      return { ranked: visible, degraded: false };
    } catch (error) {
      // Visibility Control is best-effort observability + status treatment. A
      // failure here must NOT block the opportunity response — fall back to the
      // already-ranked candidates (spec §17).
      this.logger.warn(
        `Visibility Control failed for provider ${input.providerId}; falling back to ranked output: ${
          (error as Error)?.message ?? error
        }`,
      );
      return { ranked, degraded: false };
    }
  }

  /**
   * Record impressions for the page of candidates actually shown. Fire-and-
   * forget: the ImpressionService itself swallows and logs its own errors, and
   * this method never throws.
   */
  recordShownPage(
    providerId: string,
    pageCandidates: RankedMatchCandidate[],
  ): void {
    void this.impressionService
      .recordOpportunityImpressions(providerId, pageCandidates)
      .catch((error) => {
        this.logger.warn(
          `recordShownPage failed for provider ${providerId}: ${
            (error as Error)?.message ?? error
          }`,
        );
      });
  }
}
