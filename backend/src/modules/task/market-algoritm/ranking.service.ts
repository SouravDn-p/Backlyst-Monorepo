import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheUtil } from 'src/cache/redis-cache.util';
import { MatchCandidate, RankedMatchCandidate } from './matching.types';
import { MarketplaceOverrideService } from './marketplace-override.service';
import { TierEngine } from './tier-engine.service';
import { MarketplaceConfigService } from './marketplace-config.service';
import { RiskEngine } from './risk.engine';

/**
 * Low-pool axis surfaced by the MatchingEngine (spec §7 / §10). Passed into the
 * RankingService as a validated input so ranking can apply low-pool fallback
 * prioritization WITHOUT relaxing any hard constraint.
 */
export type RankingMarketplaceMode = 'NORMAL' | 'LOW_POOL';

/**
 * Explicit input contract for ranking (spec §4 / §7 Input Validation).
 *
 * The MatchingEngine / orchestrator resolve these BEFORE ranking so the engine
 * does not have to re-fetch marketplace mode or low-pool status itself.
 */
export type RankingInput = {
  candidates: MatchCandidate[];
  /** Actor the ranking run is for (used for the RankingRunLog observability). */
  providerId?: string;
  /** Low-pool axis from MatchingEngine metadata. Defaults to NORMAL. */
  marketplaceMode?: RankingMarketplaceMode;
  /**
   * Optional precomputed daily provider-website match counts keyed by website id
   * (today's assigned matches). When supplied, ranking reuses them instead of
   * re-scanning placementTask, so the same counts can be shared with the
   * downstream Visibility Control stage (avoids a duplicate per-request scan).
   */
  dailyProviderWebsiteCounts?: Map<string, number>;
  /**
   * Optional precomputed admin override map keyed by provider-website id. When
   * supplied, ranking reuses it instead of calling the override service per
   * candidate (de-duplicated batching already collapses per-id work, but an
   * external caller may pass a cached map).
   */
  overridesByWebsite?: Map<string, any>;
};

/**
 * Explicit tier priority ladder (spec §16). Higher number = higher marketplace
 * priority. This is used as a STABLE, PRIMARY ordering key so a higher tier is
 * *guaranteed* to rank above a lower tier before the weighted score is used as
 * the tie-breaker. This replaces the previous weak multiplicative factor that
 * a high-scoring FREE site could easily overcome.
 *
 * NOTE: this ladder ONLY affects ordering. It never bypasses cooldown,
 * validation, weekly limits, suppression, or any other hard constraint.
 */
const TIER_PRIORITY_ORDER: Record<string, number> = {
  ENTERPRISE: 5,
  PLATINUM: 4,
  GOLD: 3,
  SILVER: 2,
  FREE: 1,
};

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly overrideService: MarketplaceOverrideService,
    private readonly tierEngine: TierEngine,
    private readonly configService: MarketplaceConfigService,
    private readonly riskEngine: RiskEngine,
  ) {}

  /**
   * Rank and order candidates.
   *
   * Accepts either the legacy `MatchCandidate[]` form (kept for backwards
   * compatibility) or the richer `RankingInput` contract that carries the
   * marketplace mode / low-pool axis and the provider id for observability.
   *
   * Responsibilities (spec §5 / §6 / §9 / §12):
   *   - Compute a weighted visibility/quality/opportunity/liquidity score.
   *   - Apply an EXPLICIT tier-ordered ladder as the primary ordering key
   *     (Enterprise > Platinum > Gold > Silver > Free).
   *   - Apply LOW_POOL fallback prioritization (surface thin supply) without
   *     relaxing any hard constraint.
   *   - De-duplicate to the best candidate per task and assign a final rank.
   *   - Emit a RankingRunLog observability record (best-effort).
   *
   * It MUST NOT write impressions / mutate exposure counters — that is the
   * ImpressionService's responsibility, invoked by the orchestrator.
   */
  async rankAndFilter(
    input: MatchCandidate[] | RankingInput,
  ): Promise<RankedMatchCandidate[]> {
    const startedAt = Date.now();
    const normalized: RankingInput = Array.isArray(input)
      ? { candidates: input }
      : input;
    const candidates = normalized.candidates ?? [];
    const marketplaceMode: RankingMarketplaceMode =
      normalized.marketplaceMode ?? 'NORMAL';
    const lowPool = marketplaceMode === 'LOW_POOL';

    if (candidates.length === 0) return [];

    const config = await this.getConfig();
    const dailyCounts =
      normalized.dailyProviderWebsiteCounts ??
      (await this.getDailyProviderWebsiteCounts(
        candidates.map((candidate) => candidate.providerWebsite.id),
      ));

    // Resolve today's requester-website exposure counts (spec §5) so we can
    // enforce maxRequesterExposurePerDay before scoring each candidate.
    const requesterWebsiteIds = [
      ...new Set(
        candidates.map((candidate) => candidate.task.requesterWebsiteId),
      ),
    ];
    const dailyRequesterCounts =
      await this.getDailyRequesterWebsiteCounts(requesterWebsiteIds);

    // Resolve active admin overrides per provider website (spec §27).
    const overrideMap = new Map<string, any>();
    // Spec §16: resolve tier priority per provider-website owner up front so the
    // scoring loop stays synchronous. We resolve BOTH:
    //   - `tierPriority` (explicit ordered ladder rank, primary sort key)
    //   - `tierVelocity` (legacy velocity multiplier, retained as a mild score
    //     nudge so the numeric score still trends with tier as a tie-breaker).
    const tierPriorityMap = new Map<string, number>();
    const tierVelocityMap = new Map<string, number>();
    await Promise.all(
      candidates.map(async (candidate) => {
        const id = candidate.providerWebsite.id;
        const authorId = candidate.providerWebsite.authorId;
        if (!overrideMap.has(id)) {
          overrideMap.set(id, await this.overrideService.resolveForWebsite(id));
        }
        if (!tierPriorityMap.has(authorId)) {
          const limits = await this.tierEngine
            .resolveTierLimits(authorId)
            .catch(() => ({ tier: 'FREE', tierVelocityLimit: 1 }));
          const tierName = String((limits as any).tier ?? 'FREE').toUpperCase();
          tierPriorityMap.set(
            authorId,
            TIER_PRIORITY_ORDER[tierName] ?? TIER_PRIORITY_ORDER.FREE,
          );
          tierVelocityMap.set(
            authorId,
            Number((limits as any).tierVelocityLimit) || 1,
          );
        }
      }),
    );

    const ranked = candidates
      .map((candidate) => {
        const profile = candidate.providerWebsite.matchingProfile;
        const override = overrideMap.get(candidate.providerWebsite.id);

        // Admin SUPPRESS/PENALTY override takes precedence over the profile flag.
        const suppressed =
          (profile?.isSuppressed &&
            (!profile.suppressedUntil ||
              profile.suppressedUntil > new Date())) ||
          override?.suppressed === true;
        if (suppressed) {
          return null;
        }

        const dailyMatches = dailyCounts.get(candidate.providerWebsite.id) ?? 0;
        // Spec §7: LIMITED_ACCESS sites have their daily match cap reduced to a
        // per-profile value (e.g. 1). Other statuses fall back to the global
        // config cap. ACTIVE is therefore completely unaffected.
        const effectiveDailyCap =
          profile?.marketplaceStatus === 'LIMITED_ACCESS' &&
          typeof profile.marketplaceStatusDailyCap === 'number'
            ? Math.min(
                config.maxProviderMatchesPerDay,
                profile.marketplaceStatusDailyCap,
              )
            : config.maxProviderMatchesPerDay;
        if (dailyMatches >= effectiveDailyCap) {
          return null;
        }

        // Requester daily exposure cap (spec §5): if this requester website has
        // already been shown to providers >= maxRequesterExposurePerDay times
        // today, drop the candidate. Enforcement is best-effort and never blocks
        // the marketplace (the count query is wrapped in try/catch upstream).
        //
        // In LOW_POOL mode the exposure cap is RELAXED (not removed) so thin
        // supply is still surfaced — this is a soft/governance signal, NOT a
        // hard constraint, so relaxing it during low pool is spec-compliant.
        const effectiveRequesterCap = lowPool
          ? Number(config.maxRequesterExposurePerDay) * 2
          : Number(config.maxRequesterExposurePerDay);
        if (
          effectiveRequesterCap > 0 &&
          (dailyRequesterCounts.get(candidate.task.requesterWebsiteId) ?? 0) >=
            effectiveRequesterCap
        ) {
          return null;
        }

        // Score/boost overrides (SCORE_OVERRIDE / BOOST) replace profile values.
        const opportunityScore =
          override?.opportunityScore ?? profile?.opportunityScore ?? 50;
        const visibilityScore =
          override?.visibilityScore ?? profile?.visibilityScore ?? 50;
        const reputationScore =
          override?.reputationScore ?? profile?.reputationScore ?? 50;
        // Spec §7: RESTRICTED sites have boost disabled — treat boostFactor as 1
        // (admin override & profile boost both ignored). Every other status
        // (incl. ACTIVE) keeps the existing override/profile fallback.
        const boostFactor =
          profile?.marketplaceStatus === 'RESTRICTED'
            ? 1
            : (override?.boostValue ?? profile?.boostFactor ?? 1);
        // New-user / first-success boost (spec §20): websites still in their
        // first-success window get an extra multiplicative boost from config.
        const newWebsiteBoost =
          profile?.firstSuccessBoostActive === true
            ? config.newWebsiteBoostFactor
            : 0;
        const boostScore = (boostFactor + newWebsiteBoost) * 20;
        // Spec §9 low-pool: relax the exposure penalty so recently-shown sites
        // are not buried when supply is thin. Never applied in NORMAL mode.
        const exposurePenaltyWeight = lowPool
          ? config.exposurePenaltyPerTaskView * 0.5
          : config.exposurePenaltyPerTaskView;
        const exposurePenalty =
          (profile?.exposureCount7d ?? 0) * exposurePenaltyWeight;
        // Spec §15: apply the dispute-specific risk penalty when the last risk
        // event was a dispute, otherwise the rejection-weight penalty.
        const riskWeight =
          profile?.lastRiskReason === 'DISPUTE'
            ? config.riskPenaltyDisputeWeight
            : config.riskPenaltyRejectionWeight;
        const riskProfile = profile
          ? {
              riskScore: profile.riskScore,
              diversityScore: profile.diversityScore ?? undefined,
              behaviourScore: profile.behaviourScore ?? undefined,
            }
          : { riskScore: 0 };
        const riskPenalty =
          (this.riskEngine.calculateEffectiveRisk(
            riskProfile,
            candidate.nicheConcentration,
          ) /
            100) *
          riskWeight;
        const forceMatchBonus =
          profile?.forceMatchNext || override?.forceMatchNext
            ? config.forceMatchBonus
            : 0;
        const authorityPenalty =
          candidate.matchingAttributes.authority === 'BELOW' ? 10 : 0;

        // Spec §16: legacy velocity multiplier (default 1) kept as a mild score
        // nudge. The AUTHORITATIVE tier priority is the ordered ladder applied
        // as the primary sort key below.
        const tierVelocity =
          tierVelocityMap.get(candidate.providerWebsite.authorId) ?? 1;

        // Spec P5b (T3): consume the already-computed behaviourScore as a
        // ranking signal. Higher behaviourScore => higher final rank, scaled by
        // the small behaviourWeight so existing ordering is only mildly affected.
        const behaviourScore = profile?.behaviourScore ?? 50;
        const behaviourBoost = behaviourScore * config.behaviourWeight;

        // Spec §7/§10: the internal (hidden) qualityScore contributes positively
        // to the final ranking. Small weight so it nudges ordering rather than
        // dominating compatibility. Neutral 50 default when no profile exists.
        const qualityScore = profile?.qualityScore ?? 50;
        // NOTE: field name is `qualityWeight` (matches MarketplaceScoringConfig /
        // MergedMarketplaceConfig). Previously a typo (`qualityWeight`) caused
        // `qualityScore * undefined === NaN`, poisoning every ranking score.
        const qualityBoost = qualityScore * config.qualityWeight;

        // Spec §4: secondary-niche compatibility signal. When the provider and
        // requester share a secondary niche (or the provider's secondary matches
        // the requester's primary), give a small ordering nudge. Never used for
        // eligibility.
        const secondaryNicheBoost = this.secondaryNicheBoost(candidate);

        // Spec §8 liquidity protection (low pool): amplify the opportunity /
        // liquidity signal so under-served (high-opportunity) tasks surface
        // first when supply is thin. This is an ordering nudge only.
        const opportunityWeight = lowPool
          ? config.opportunityWeight * 1.5
          : config.opportunityWeight;

        const weightedScore =
          candidate.compatibilityScore * config.compatibilityWeight +
          opportunityScore * opportunityWeight +
          visibilityScore * config.visibilityWeight +
          reputationScore * config.reputationWeight +
          boostScore * config.boostWeight +
          behaviourBoost +
          qualityBoost +
          secondaryNicheBoost;

        const score =
          weightedScore * tierVelocity -
          exposurePenalty -
          riskPenalty -
          authorityPenalty +
          forceMatchBonus +
          (profile?.internalPriorityScore ?? 50) *
            config.internalPriorityWeight +
          (profile?.diversityScore ?? 50) * config.diversityWeight;

        // Spec §7: LOW_PRIORITY sites have their final score reduced by the
        // lowPriorityFactor (e.g. 0.7). Every other status uses 1.0 (identity),
        // so ACTIVE ranking is completely unaffected.
        const priorityFactor =
          profile?.marketplaceStatus === 'LOW_PRIORITY'
            ? lowPool
              ? 1
              : config.lowPriorityFactor
            : 1;

        // Distribution Rules: Unique Domain Prioritization Ladder
        let distributionMultiplier = 1.0;
        if (candidate.priorityBucket === 'NEVER_INTERACTED') {
          distributionMultiplier = 1.2;
        } else if (candidate.priorityBucket === 'RARELY_USED') {
          distributionMultiplier = 1.1;
        }

        // Distribution Rules: Niche Concentration Progressive Penalty
        let nicheConcentrationMultiplier = 1.0;
        if (candidate.nicheConcentration === 'CAPPED') {
          nicheConcentrationMultiplier = 0.3;
        } else if (candidate.nicheConcentration === 'HIGH') {
          nicheConcentrationMultiplier = 0.7;
        } else if (candidate.nicheConcentration === 'MODERATE') {
          nicheConcentrationMultiplier = 0.9;
        }

        const finalScore =
          score *
          priorityFactor *
          distributionMultiplier *
          nicheConcentrationMultiplier;

        const tierPriority =
          tierPriorityMap.get(candidate.providerWebsite.authorId) ??
          TIER_PRIORITY_ORDER.FREE;

        return {
          ...candidate,
          score: Math.round(finalScore * 100) / 100,
          // Internal-only ordering key (not persisted on RankedMatchCandidate).
          _tierPriority: tierPriority,
          rank: 0,
        };
      })
      .filter(
        (
          candidate,
        ): candidate is RankedMatchCandidate & {
          _tierPriority: number;
        } => Boolean(candidate),
      )
      // Spec §16: EXPLICIT tier ladder is the PRIMARY sort key. A higher tier is
      // guaranteed to rank above a lower tier; the weighted score is the
      // tie-breaker within the same tier.
      .sort((a, b) => {
        if (b._tierPriority !== a._tierPriority) {
          return b._tierPriority - a._tierPriority;
        }
        return b.score - a.score;
      });

    const bestByTask = new Map<string, RankedMatchCandidate>();
    for (const candidate of ranked) {
      if (!bestByTask.has(candidate.task.id)) {
        // Strip the internal ordering key before exposing the candidate.
        const { _tierPriority, ...clean } = candidate as any;
        bestByTask.set(candidate.task.id, clean);
      }
    }

    const result = [...bestByTask.values()].map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));

    // Spec §12/§15: ranking-specific observability (best-effort, never blocks).
    await this.logRankingRun({
      providerId: normalized.providerId,
      candidatesIn: candidates.length,
      candidatesOut: result.length,
      marketplaceMode,
      lowPool,
      processingTimeMs: Date.now() - startedAt,
      result,
    });

    return result;
  }

  /**
   * Spec §4: small secondary-niche compatibility nudge. Returns a bounded boost
   * (0..~10) when provider/requester secondary niches align. Ordering only.
   */
  private secondaryNicheBoost(candidate: MatchCandidate): number {
    const providerSecondary =
      candidate.providerWebsite.marketplaceCategories?.find(
        (c) => c.role === 'SECONDARY',
      )?.slug;
    if (!providerSecondary) return 0;
    const requesterPrimary =
      candidate.requesterWebsite.marketplaceCategories?.find(
        (c) => c.role === 'PRIMARY',
      )?.slug;

    if (providerSecondary && providerSecondary === requesterPrimary) {
      return 10;
    }
    return 0;
  }

  /**
   * Best-effort ranking observability. Writes a compact RankingRunLog row with
   * candidate counts, marketplace mode, low-pool activation, processing time,
   * and a small sample of the top ranked scores. Failures are swallowed so
   * observability never breaks the opportunity response (spec §17).
   */
  private async logRankingRun(entry: {
    providerId?: string;
    candidatesIn: number;
    candidatesOut: number;
    marketplaceMode: RankingMarketplaceMode;
    lowPool: boolean;
    processingTimeMs: number;
    result: RankedMatchCandidate[];
  }): Promise<void> {
    if (!entry.providerId) {
      // Without an actor id there is no meaningful ranking-run row to persist
      // (e.g. unit tests calling with the legacy array form). Still emit a
      // lightweight debug log line for local observability.
      this.logger.debug(
        `Ranking run: in=${entry.candidatesIn} out=${entry.candidatesOut} mode=${entry.marketplaceMode} ms=${entry.processingTimeMs}`,
      );
      return;
    }

    const topScores = entry.result.slice(0, 10).map((candidate) => ({
      rank: candidate.rank,
      websiteId: candidate.providerWebsite.id,
      taskId: candidate.task.id,
      score: candidate.score,
    }));

    try {
      await this.prisma.rankingRunLog.create({
        data: {
          providerId: entry.providerId,
          candidatesIn: entry.candidatesIn,
          candidatesOut: entry.candidatesOut,
          marketplaceMode: entry.marketplaceMode,
          lowPoolActive: entry.lowPool,
          processingTimeMs: entry.processingTimeMs,
          topScores: topScores as any,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist RankingRunLog: ${(error as Error)?.message ?? error}`,
      );
    }
  }

  private async getConfig() {
    return this.configService.getMergedConfig();
  }

  private async getDailyRequesterWebsiteCounts(requesterWebsiteIds: string[]) {
    try {
      const uniqueRequesterWebsiteIds = [...new Set(requesterWebsiteIds)];
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const impressions = await this.prisma.opportunityImpression.findMany({
        where: {
          requesterWebsiteId: { in: uniqueRequesterWebsiteIds },
          shownAt: { gte: startOfDay },
        },
        select: { requesterWebsiteId: true },
      });
      const counts = new Map<string, number>();
      for (const impression of impressions) {
        if (!impression.requesterWebsiteId) continue;
        counts.set(
          impression.requesterWebsiteId,
          (counts.get(impression.requesterWebsiteId) ?? 0) + 1,
        );
      }

      return counts;
    } catch {
      // Best-effort only: on any failure, return an empty map so the
      // requester exposure cap never blocks the marketplace.
      return new Map<string, number>();
    }
  }

  async getDailyProviderWebsiteCounts(websiteIds: string[]) {
    const uniqueWebsiteIds = [...new Set(websiteIds)];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const tasks = await this.prisma.placementTask.findMany({
      where: {
        assignedProviderWebsiteId: { in: uniqueWebsiteIds },
        assignedAt: { gte: startOfDay },
      },
      select: { assignedProviderWebsiteId: true },
    });
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (!task.assignedProviderWebsiteId) continue;
      counts.set(
        task.assignedProviderWebsiteId,
        (counts.get(task.assignedProviderWebsiteId) ?? 0) + 1,
      );
    }

    return counts;
  }
}
