import { Injectable } from '@nestjs/common';
import { clampScore } from './scoring.utils';

export type QualityMetrics = {
  completionRate: number;
  reliabilityScore: number;
  avgQualityRating: number;
  qualityRatingSum: number;
  completedInteractions: number;
  failedInteractions: number;
  totalInteractions: number;
  successfulInteractions: number;
  activityScore: number;
  consistencyScore: number;
  // Spec §6: sub-signals now explicitly surfaced so callers can persist them to
  // the QualityScoreHistory time-series and so the composite is auditable.
  completionScore: number;
  ratingScore: number;
  diversityScore: number;
  behaviourScore: number;
  compositeQualityScore: number;
};

/**
 * Configurable sub-signal weights for the quality composite (spec §6). These
 * mirror MarketplaceScoringConfig columns and are normalized at compute time, so
 * they do not have to sum to exactly 1.0. Sensible defaults preserve the
 * historical 25/25/20/15/15 blend while additionally folding diversity +
 * behaviour into the composite (the audit's stated responsibility gap).
 */
export type QualityCompositeWeights = {
  qualityCompletionWeight: number;
  qualityReliabilityWeight: number;
  qualityRatingWeight: number;
  qualityActivityWeight: number;
  qualityConsistencyWeight: number;
  qualityDiversityWeight: number;
  qualityBehaviourWeight: number;
};

const DEFAULT_WEIGHTS: QualityCompositeWeights = {
  qualityCompletionWeight: 0.25,
  qualityReliabilityWeight: 0.25,
  qualityRatingWeight: 0.2,
  qualityActivityWeight: 0.1,
  qualityConsistencyWeight: 0.1,
  qualityDiversityWeight: 0.05,
  qualityBehaviourWeight: 0.05,
};

@Injectable()
export class QualityEngine {
  computeMetrics(
    profile: any,
    wasSuccessful: boolean,
    qualityRating?: number,
    options?: {
      lastMatchedAt?: Date | null;
      recentQualityRatings?: number[];
      rubricCompositeScore?: number | null;
      // Spec §6: fold interaction diversity + marketplace behaviour into the
      // composite. When omitted they fall back to the profile's persisted
      // values (or neutral 50) so the caller may pass a freshly-computed
      // diversityScore while letting behaviour default to the profile.
      diversityScore?: number | null;
      behaviourScore?: number | null;
      weights?: Partial<QualityCompositeWeights>;
    },
  ): QualityMetrics {
    const completedInteractions =
      profile.completedInteractions + (wasSuccessful ? 1 : 0);
    const failedInteractions =
      profile.failedInteractions + (wasSuccessful ? 0 : 1);
    const totalInteractions = profile.totalInteractions + 1;
    const successfulInteractions =
      profile.successfulInteractions + (wasSuccessful ? 1 : 0);

    const completionRate =
      totalInteractions > 0 ? completedInteractions / totalInteractions : 1;
    const reliabilityScore = Math.round(
      clampScore(
        (successfulInteractions / Math.max(1, totalInteractions)) * 100,
        0,
        100,
      ),
    );

    const effectiveRating =
      typeof options?.rubricCompositeScore === 'number'
        ? options.rubricCompositeScore
        : typeof qualityRating === 'number'
          ? clampScore(qualityRating, 0, 5)
          : undefined;

    const qualityRatingSum =
      profile.qualityRatingSum +
      (typeof effectiveRating === 'number' ? effectiveRating : 0);
    const ratedCount =
      typeof effectiveRating === 'number'
        ? Math.max(1, completedInteractions)
        : Math.max(1, profile.completedInteractions);
    const avgQualityRating =
      typeof effectiveRating === 'number'
        ? qualityRatingSum / ratedCount
        : profile.avgQualityRating;

    const activityScore = this.computeActivityScore(
      options?.lastMatchedAt ?? profile.lastMatchedAt ?? null,
      profile.totalInteractions ?? 0,
    );

    const recentRatings = options?.recentQualityRatings ?? [];
    const consistencyScore = this.computeConsistencyScore(recentRatings);

    // Sub-signals normalized to 0..100.
    const completionScore = clampScore(completionRate * 100, 0, 100);
    const ratingScore = clampScore((avgQualityRating / 5) * 100, 0, 100);
    const diversityScore = clampScore(
      typeof options?.diversityScore === 'number'
        ? options.diversityScore
        : (profile.diversityScore ?? 50),
      0,
      100,
    );
    const behaviourScore = clampScore(
      typeof options?.behaviourScore === 'number'
        ? options.behaviourScore
        : (profile.behaviourScore ?? 50),
      0,
      100,
    );

    const compositeQualityScore = this.computeComposite(
      {
        completionScore,
        reliabilityScore,
        ratingScore,
        activityScore,
        consistencyScore,
        diversityScore,
        behaviourScore,
      },
      { ...DEFAULT_WEIGHTS, ...(options?.weights ?? {}) },
    );

    return {
      completionRate,
      reliabilityScore,
      avgQualityRating,
      qualityRatingSum,
      completedInteractions,
      failedInteractions,
      totalInteractions,
      successfulInteractions,
      activityScore,
      consistencyScore,
      completionScore,
      ratingScore,
      diversityScore,
      behaviourScore,
      compositeQualityScore,
    };
  }

  /**
   * Spec §6: weighted, normalized blend of the seven quality sub-signals. The
   * weights are normalized by their sum so admins can re-balance them without the
   * composite drifting off the 0..100 scale. Diversity + behaviour are now first
   * class members of the composite (the audit's stated responsibility gap).
   */
  private computeComposite(
    signals: {
      completionScore: number;
      reliabilityScore: number;
      ratingScore: number;
      activityScore: number;
      consistencyScore: number;
      diversityScore: number;
      behaviourScore: number;
    },
    weights: QualityCompositeWeights,
  ): number {
    const pairs: [number, number][] = [
      [signals.completionScore, weights.qualityCompletionWeight],
      [signals.reliabilityScore, weights.qualityReliabilityWeight],
      [signals.ratingScore, weights.qualityRatingWeight],
      [signals.activityScore, weights.qualityActivityWeight],
      [signals.consistencyScore, weights.qualityConsistencyWeight],
      [signals.diversityScore, weights.qualityDiversityWeight],
      [signals.behaviourScore, weights.qualityBehaviourWeight],
    ];

    const totalWeight = pairs.reduce(
      (sum, [, w]) => sum + (Number.isFinite(w) && w > 0 ? w : 0),
      0,
    );

    // Guard against a degenerate all-zero weight config by falling back to a
    // simple mean of the signals.
    if (totalWeight <= 0) {
      const mean =
        pairs.reduce((sum, [value]) => sum + value, 0) / pairs.length;
      return Math.round(clampScore(mean));
    }

    const weighted = pairs.reduce(
      (sum, [value, w]) => sum + value * (Number.isFinite(w) && w > 0 ? w : 0),
      0,
    );

    return Math.round(clampScore(weighted / totalWeight));
  }

  private computeActivityScore(
    lastMatchedAt: Date | null,
    totalInteractions: number,
  ): number {
    // Recency component (0-100).
    let recencyScore = 20;
    if (lastMatchedAt) {
      const daysSince = Math.max(
        0,
        (Date.now() - lastMatchedAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (daysSince <= 7) recencyScore = 100;
      else if (daysSince <= 30) recencyScore = 80;
      else if (daysSince <= 90) recencyScore = 50;
      else recencyScore = 20;
    }

    // Frequency component: interactions per month estimate.
    // Use totalInteractions as a rough proxy; divide by account age in months.
    const interactionsPerMonth = totalInteractions;
    let frequencyScore = 0;
    if (interactionsPerMonth > 10) frequencyScore = 100;
    else if (interactionsPerMonth >= 5) frequencyScore = 70;
    else if (interactionsPerMonth >= 1) frequencyScore = 40;
    else frequencyScore = 0;

    return Math.round(clampScore(frequencyScore * 0.6 + recencyScore * 0.4));
  }

  private computeConsistencyScore(recentRatings: number[]): number {
    if (recentRatings.length < 5) return 50;

    const last20 = recentRatings.slice(-20);
    const mean = last20.reduce((a, b) => a + b, 0) / last20.length;
    const variance =
      last20.reduce((sum, r) => sum + (r - mean) ** 2, 0) / last20.length;
    const sigma = Math.sqrt(variance);

    if (sigma < 0.5) return 100;
    if (sigma < 1.0) return 80;
    if (sigma < 1.5) return 60;
    if (sigma < 2.0) return 40;
    return 20;
  }

  /**
   * Spec §6: whether a site currently qualifies for premium opportunity access,
   * derived purely from its quality band. A site is premium-eligible when its
   * composite quality score is at or above the configured threshold AND it is in
   * the ACTIVE marketplace band (degraded/monitored/restricted sites never get
   * premium access). A threshold of 0 disables gating (all sites eligible). This
   * NEVER gates eligibility/verification/ownership — it only widens access to a
   * premium opportunity pool for high-quality sites.
   */
  isPremiumAccessEligible(
    qualityScore: number,
    marketplaceStatus: string,
    premiumThreshold: number,
  ): boolean {
    if (!Number.isFinite(premiumThreshold) || premiumThreshold <= 0)
      return true;
    if (marketplaceStatus !== 'ACTIVE') return false;
    return qualityScore >= premiumThreshold;
  }
}
