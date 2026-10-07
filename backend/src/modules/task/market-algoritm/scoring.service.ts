import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SCORING_CONSTANTS,
  calculateScores,
  calculateRiskScore,
  clampScore,
  RISK_DELTA_BY_EVENT,
  type RiskEventType,
} from './scoring.utils';
import { DistributionEngine } from './distribution-engine.service';
import { buildDefaultMatchingProfileCreate } from './matching-profile.defaults';
import { QualityEngine } from './quality.engine';
import {
  QualityStatusEngine,
  type QualityStatusTriggerValue,
} from './quality-status.engine';
import { RiskEngine } from './risk.engine';

import { LiquidityEngine } from './liquidity.engine';
import { BehaviourPatternService } from './behaviour-pattern.service';
import { BoostService } from './boost.service';
import { MarketplaceScoringProducer } from './marketplace-scoring.producer';
import { isScoringAsync } from './marketplace-queue-flags';
import { MarketplaceConfigService } from './marketplace-config.service';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly distributionEngine: DistributionEngine,
    private readonly qualityEngine: QualityEngine,
    private readonly qualityStatusEngine: QualityStatusEngine,
    private readonly riskEngine: RiskEngine,

    private readonly liquidityEngine: LiquidityEngine,
    private readonly behaviourPatternService: BehaviourPatternService,
    private readonly boostService: BoostService,
    private readonly configService: ConfigService,
    private readonly scoringProducer: MarketplaceScoringProducer,
    private readonly marketplaceConfigService: MarketplaceConfigService,
  ) {}

  /**
   * Hot-path entry point for scoring updates. When the async queue flag is on
   * (default) the work is enqueued for the BullMQ worker; otherwise it runs
   * synchronously inline. Both paths invoke the same `updateScoresAfterTask`
   * engine method, so the resulting side-effects are identical.
   */
  async scheduleOrRunUpdateScores(
    websiteId: string,
    wasSuccessful: boolean,
    qualityRating?: number,
    riskEventType?: RiskEventType,
  ): Promise<void> {
    if (isScoringAsync(this.configService)) {
      await this.scoringProducer.enqueueUpdateScores({
        websiteId,
        wasSuccessful,
        qualityRating,
        riskEventType,
      });
      return;
    }

    await this.updateScoresAfterTask(
      websiteId,
      wasSuccessful,
      qualityRating,
      riskEventType,
    );
  }

  async updateScoresAfterTask(
    websiteId: string,
    wasSuccessful: boolean,
    qualityRating?: number,
    riskEventType?: RiskEventType,
  ) {
    if (qualityRating !== undefined) {
      if (qualityRating < 1 || qualityRating > 5) {
        throw new Error(`qualityRating must be between 1 and 5. Received: ${qualityRating}`);
      }
      qualityRating = Math.round(qualityRating);
    }

    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, authorId: true, rootDomain: true },
    });
    if (!website) {
      throw new NotFoundException('Website not found for marketplace scoring.');
    }

    const profile = await this.prisma.websiteMatchingProfile.upsert({
      where: { websiteId },
      update: {},
      create: buildDefaultMatchingProfileCreate({
        websiteId,
        userId: website.authorId,
      }),
    });

    // Domain diversity is recomputed after every completed interaction (spec §11).
    const diversityScore = await this.distributionEngine
      .computeDiversityScore(website.rootDomain)
      .catch(() => profile.diversityScore);

    // Spec §6: the quality composite is now a weighted blend of configurable
    // sub-signals (incl. diversity + behaviour). Read the merged config so the
    // weights + premium-access threshold are admin-tunable at runtime.
    const config = await this.marketplaceConfigService
      .getMergedConfig()
      .catch(() => null);

    const qualityMetrics = this.qualityEngine.computeMetrics(
      profile,
      wasSuccessful,
      qualityRating,
      {
        lastMatchedAt: profile.lastMatchedAt ?? null,
        // Fold the freshly-computed diversity + the profile's behaviour signal
        // into the composite (spec §6 responsibility list).
        diversityScore,
        behaviourScore: profile.behaviourScore ?? 50,
        weights: config
          ? {
              qualityCompletionWeight: config.qualityCompletionWeight,
              qualityReliabilityWeight: config.qualityReliabilityWeight,
              qualityRatingWeight: config.qualityRatingWeight,
              qualityActivityWeight: config.qualityActivityWeight,
              qualityConsistencyWeight: config.qualityConsistencyWeight,
              qualityDiversityWeight: config.qualityDiversityWeight,
              qualityBehaviourWeight: config.qualityBehaviourWeight,
            }
          : undefined,
      },
    );

    const scores = calculateScores(
      {
        reputationScore: profile.reputationScore,
        boostFactor: profile.boostFactor,
        boostDecayCount: profile.boostDecayCount,
        completedInteractions: qualityMetrics.completedInteractions,
      },
      wasSuccessful,
      qualityMetrics.completionRate,
      qualityMetrics.avgQualityRating,
      qualityRating,
    );

    // Route the risk mutation through RiskEngine (the single writer of
    // riskScore + RiskEvent). The engine recomputes the time-decayed delta and
    // persists the immutable RiskEvent ledger row. We pass the freshly-read
    // profile to avoid a redundant lookup.
    const risk = await this.riskEngine.processRiskEvent(
      websiteId,
      riskEventType ?? (wasSuccessful ? 'SUCCESS' : 'FAILURE'),
      profile,
    );

    const opportunityScore =
      await this.liquidityEngine.calculateOpportunityScore(websiteId);

    // Spec P5b: feed behaviour signals into the profile. The BehaviourPatternService
    // scans recent DomainInteraction cadence and writes behaviourScore itself, so
    // we just trigger it best-effort (a failure must not abort scoring).
    await this.behaviourPatternService
      .scanWebsite(websiteId)
      .catch(() => undefined);

    const now = new Date();
    const shouldSuppress =
      qualityMetrics.totalInteractions >= 10 &&
      qualityMetrics.completionRate < 0.4;

    // Spec §6: derive premium-opportunity-access eligibility from the new quality
    // band. Uses the current status as the proxy for ACTIVE (the reconcile step
    // below may move the band, but premium access is only granted to ACTIVE sites
    // so a non-ACTIVE site is never premium-eligible regardless).
    const premiumQualityAccessEligible =
      this.qualityEngine.isPremiumAccessEligible(
        qualityMetrics.compositeQualityScore,
        profile.marketplaceStatus,
        config?.qualityPremiumAccessThreshold ?? 75,
      );

    const updated = await this.prisma.websiteMatchingProfile.update({
      where: { websiteId },
      data: {
        visibilityScore: scores.vs,
        reputationScore: scores.rs,
        boostFactor: scores.bf,
        boostDecayCount: scores.decayCount,
        diversityScore,
        // Spec §7: persist the single internal, hidden quality score aggregated
        // by the QualityEngine (0..100). This is the value that drives automatic
        // status transitions (below) and is consumed as a ranking signal.
        qualityScore: qualityMetrics.compositeQualityScore,
        lastQualityScoreUpdateAt: now,
        premiumQualityAccessEligible,

        completedInteractions: qualityMetrics.completedInteractions,
        failedInteractions: qualityMetrics.failedInteractions,
        totalInteractions: qualityMetrics.totalInteractions,
        completionRate: qualityMetrics.completionRate,
        reliabilityScore: qualityMetrics.reliabilityScore,
        qualityRatingSum: qualityMetrics.qualityRatingSum,
        avgQualityRating: qualityMetrics.avgQualityRating,
        riskScore: risk.riskScore,
        lastRiskEventAt: now,
        lastRiskReason: risk.reason,
        opportunityScore,
        forceMatchNext: false,

        // First-success boost is owned by BoostService. On a successful
        // completion the one-time new-user benefit is consumed
        // (firstSuccessBoostActive cleared, firstSuccessAt stamped once).
        // boostFactor itself is driven by the scoring formula (scores.bf);
        // the boost service only owns firstSuccessAt / firstSuccessBoostActive.
        ...(() => {
          const { boostFactor: _bf, ...rest } =
            this.boostService.applyNewUserBoost(
              {
                boostFactor: profile.boostFactor,
                firstSuccessAt: profile.firstSuccessAt,
                firstSuccessBoostActive: profile.firstSuccessBoostActive,
              },
              { wasSuccessful, now },
            );
          return rest;
        })(),
        successfulInteractions: {
          increment: wasSuccessful ? 1 : 0,
        },
        lastCompletedAt: wasSuccessful ? now : profile.lastCompletedAt,
        isSuppressed: shouldSuppress,
        suppressedUntil: shouldSuppress
          ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          : profile.suppressedUntil,
      },
    });

    // Spec §6/§9/§14: after the quality score is persisted, reconcile the
    // automatic marketplace status band. This is a best-effort, self-auditing
    // step owned by the QualityStatusEngine; a failure here must never fail the
    // scoring update (the engine swallows its own errors).
    const trigger = this.mapRiskEventToTrigger(riskEventType, wasSuccessful);
    const reconciled = await this.qualityStatusEngine.reconcileStatus({
      websiteId,
      inputs: {
        qualityScore: updated.qualityScore,
        riskScore: updated.riskScore,
        completedInteractions: updated.completedInteractions,
        currentStatus: updated.marketplaceStatus,
      },
      trigger,
    });

    // Spec §6: append a composite + sub-signal snapshot to the quality-score
    // time-series so quality trends/drift are analyzable (this complements the
    // event-only WebsiteQualityStatusLog). Best-effort; never blocks scoring.
    await this.recordQualityHistory({
      websiteId,
      metrics: qualityMetrics,
      riskScore: updated.riskScore,
      marketplaceStatus: reconciled.newStatus,
      trigger,
    });

    return updated;
  }

  /**
   * Spec §6: full quality recompute for a single website WITHOUT recording a new
   * interaction. Used by the scheduled sweep (SCHEDULED_RECALC) and the admin
   * "recompute" endpoint so a site's quality/status/premium-access can self-
   * correct even while dormant (e.g. activity recency decay). Re-runs the
   * composite from the persisted counters (no increment), reconciles the status
   * band, updates premium-access + lastQualityRecomputeAt, and snapshots history.
   * Best-effort per site; caller controls batching.
   */
  async recomputeQualityForWebsite(
    websiteId: string,
    trigger: QualityStatusTriggerValue = 'SCHEDULED_RECALC',
  ): Promise<{
    websiteId: string;
    changed: boolean;
    qualityScore: number;
  } | null> {
    const profile = await this.prisma.websiteMatchingProfile.findUnique({
      where: { websiteId },
    });
    if (!profile) return null;

    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: { rootDomain: true },
    });

    const diversityScore = await this.distributionEngine
      .computeDiversityScore(website?.rootDomain ?? null)
      .catch(() => profile.diversityScore);

    const config = await this.marketplaceConfigService
      .getMergedConfig()
      .catch(() => null);

    // Recompute the composite from the CURRENT counters. We synthesize a
    // "no new interaction" call by decrementing the profile's counters by the
    // amount computeMetrics adds (+1 total). Instead of mutating counters, we
    // pass a shallow copy with counters reduced by one so the resulting totals
    // equal the persisted values.
    const stableProfile = {
      ...profile,
      completedInteractions: Math.max(0, profile.completedInteractions - 0),
      failedInteractions: Math.max(0, profile.failedInteractions - 0),
      totalInteractions: Math.max(0, profile.totalInteractions - 1),
      successfulInteractions: Math.max(0, profile.successfulInteractions - 0),
    };

    const qualityMetrics = this.qualityEngine.computeMetrics(
      // computeMetrics adds +1 total and (wasSuccessful?+1:0) to completed; with
      // wasSuccessful=true and the -1 total above the totals round-trip to the
      // persisted values, while completed/successful are preserved.
      {
        ...stableProfile,
        completedInteractions: Math.max(0, profile.completedInteractions - 1),
        successfulInteractions: Math.max(0, profile.successfulInteractions - 1),
      },
      true,
      undefined,
      {
        lastMatchedAt: profile.lastMatchedAt ?? null,
        diversityScore,
        behaviourScore: profile.behaviourScore ?? 50,
        weights: config
          ? {
              qualityCompletionWeight: config.qualityCompletionWeight,
              qualityReliabilityWeight: config.qualityReliabilityWeight,
              qualityRatingWeight: config.qualityRatingWeight,
              qualityActivityWeight: config.qualityActivityWeight,
              qualityConsistencyWeight: config.qualityConsistencyWeight,
              qualityDiversityWeight: config.qualityDiversityWeight,
              qualityBehaviourWeight: config.qualityBehaviourWeight,
            }
          : undefined,
      },
    );

    const now = new Date();
    const premiumQualityAccessEligible =
      this.qualityEngine.isPremiumAccessEligible(
        qualityMetrics.compositeQualityScore,
        profile.marketplaceStatus,
        config?.qualityPremiumAccessThreshold ?? 75,
      );

    const updated = await this.prisma.websiteMatchingProfile.update({
      where: { websiteId },
      data: {
        qualityScore: qualityMetrics.compositeQualityScore,
        reliabilityScore: qualityMetrics.reliabilityScore,
        diversityScore,
        premiumQualityAccessEligible,
        lastQualityScoreUpdateAt: now,
        lastQualityRecomputeAt: now,
      },
    });

    const reconciled = await this.qualityStatusEngine.reconcileStatus({
      websiteId,
      inputs: {
        qualityScore: updated.qualityScore,
        riskScore: updated.riskScore,
        completedInteractions: updated.completedInteractions,
        currentStatus: updated.marketplaceStatus,
      },
      trigger,
    });

    await this.recordQualityHistory({
      websiteId,
      metrics: qualityMetrics,
      riskScore: updated.riskScore,
      marketplaceStatus: reconciled.newStatus,
      trigger,
    });

    return {
      websiteId,
      changed: reconciled.changed,
      qualityScore: updated.qualityScore,
    };
  }

  /**
   * Spec §6: scheduled full-recompute sweep (SCHEDULED_RECALC). Iterates every
   * marketplace profile in stable, bounded batches (oldest recompute first so
   * the stalest / most dormant sites are refreshed) and re-runs
   * `recomputeQualityForWebsite` for each. Each site is best-effort so one
   * failure never aborts the sweep. Returns aggregate counts for observability.
   */
  async recomputeAllQuality(options?: {
    batchSize?: number;
  }): Promise<{ scanned: number; changed: number; failed: number }> {
    const batchSize = Math.min(Math.max(options?.batchSize ?? 200, 1), 1000);
    let scanned = 0;
    let changed = 0;
    let failed = 0;
    let cursor: string | undefined;

     
    while (true) {
      const profiles = await this.prisma.websiteMatchingProfile.findMany({
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: { id: true, websiteId: true },
      });
      if (profiles.length === 0) break;

      for (const profile of profiles) {
        scanned++;
        try {
          const result = await this.recomputeQualityForWebsite(
            profile.websiteId,
            'SCHEDULED_RECALC',
          );
          if (result?.changed) changed++;
        } catch {
          failed++;
        }
      }

      cursor = profiles[profiles.length - 1].id;
      if (profiles.length < batchSize) break;
    }

    return { scanned, changed, failed };
  }

  /**
   * Spec §6: best-effort append of a quality-score time-series snapshot. Records

   * the composite AND each sub-signal so trends are chartable. Never throws.
   */
  private async recordQualityHistory(params: {
    websiteId: string;
    metrics: {
      compositeQualityScore: number;
      completionScore: number;
      reliabilityScore: number;
      ratingScore: number;
      activityScore: number;
      consistencyScore: number;
      diversityScore: number;
      behaviourScore: number;
    };
    riskScore: number;
    marketplaceStatus: string;
    trigger: QualityStatusTriggerValue;
  }): Promise<void> {
    try {
      await this.prisma.qualityScoreHistory.create({
        data: {
          websiteId: params.websiteId,
          qualityScore: params.metrics.compositeQualityScore,
          completionScore: params.metrics.completionScore,
          reliabilityScore: params.metrics.reliabilityScore,
          ratingScore: params.metrics.ratingScore,
          activityScore: params.metrics.activityScore,
          consistencyScore: params.metrics.consistencyScore,
          diversityScore: params.metrics.diversityScore,
          behaviourScore: params.metrics.behaviourScore,
          riskScore: params.riskScore,
          marketplaceStatus: params.marketplaceStatus as any,
          trigger: params.trigger as any,
        },
      });
    } catch {
      // Snapshot is analytics-only; a failure must never affect scoring.
    }
  }

  /**
   * Maps the incoming scoring event to the audit trigger recorded on
   * WebsiteQualityStatusLog (spec §14/§16). Defaults to TASK_COMPLETED /
   * TASK_FAILED based on the success flag when no explicit risk event is given.
   */
  private mapRiskEventToTrigger(
    riskEventType: RiskEventType | undefined,
    wasSuccessful: boolean,
  ): QualityStatusTriggerValue {
    switch (riskEventType) {
      case 'DISPUTE':
        return 'DISPUTE_RESOLVED';
      case 'REJECTION':
        return 'TASK_REJECTED';
      case 'FAILURE':
        return 'TASK_FAILED';
      case 'ABUSE':
        return 'RISK_EVENT';
      case 'SUCCESS':
        return 'TASK_COMPLETED';
      default:
        return wasSuccessful ? 'TASK_COMPLETED' : 'TASK_FAILED';
    }
  }
}
