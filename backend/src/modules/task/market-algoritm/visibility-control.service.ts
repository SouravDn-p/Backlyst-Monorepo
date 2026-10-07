import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MatchCandidate, RankedMatchCandidate } from './matching.types';
import { RankingMarketplaceMode } from './ranking.service';
import { MergedMarketplaceConfig } from './marketplace-config.service';
import { WebsiteStatusQueryService } from './website-status-query.service';

/**
 * VisibilityControlService (spec flow: Ranking Engine → Visibility Control →
 * Recommendation Service).
 *
 * This is the dedicated, SEPARATE stage the Visibility Control audit
 * (2026-07-18) required to be extracted from the Ranking Engine. The Ranking
 * Engine (`RankingService`) is now a PURE ranking/ordering component — it only
 * computes and orders scores. All *exposure / visibility treatment / status
 * weighting / frequency-cap reduction / priority adjustment / logging* happens
 * HERE, as an explicit post-ranking stage.
 *
 * Responsibilities (spec §5 / audit §4 / §21-R1):
 *   1. Apply a status-driven visibility factor to each ranked candidate
 *      (RESTRICTED => significant visibility reduction; UNDER_REVIEW => monitored
 *      visibility; LOW_PRIORITY => reduced; ACTIVE/etc => identity).
 *   2. Reduce the daily participation cap for RESTRICTED sites (restricted
 *      participation) — surfaced to the orchestrator so the candidate is dropped
 *      if already at/over the reduced cap. This is the *only* place frequency-cap
 *      reduction for status is decided; the Ranking Engine no longer drops
 *      governance-capped candidates itself (architectural separation).
 *   3. Emit an UNDER_REVIEW "monitored visibility" signal — under review sites
 *      are browsable/ranked but flagged for monitoring (never a hard constraint).
 *      The behavioural-monitoring record (audit §2 / §15, missing requirement #3)
 *      is delegated to WebsiteStatusQueryService.recordUnderReviewMonitoring so
 *      the UNDER_REVIEW monitoring is centralized and auditable.
 *   4. Log every visibility adjustment (status factor, frequency-cap, override
 *      application, fairness floor) to `VisibilityAdjustmentLog` for auditability
 *      (replaces the previously-missing visibility-adjustment + override-event
 *      observability gaps — audit §17 / §21-R9).
 *
 * It MUST NOT perform eligibility / validation / matching / risk / credit / auth.
 * It only post-processes already-ranked candidates and mutates their exposure
 * metadata (never their hard eligibility). All writes are best-effort and never
 * block the opportunity response (spec §17 failure handling).
 */
@Injectable()
export class VisibilityControlService {
  private readonly logger = new Logger(VisibilityControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websiteStatusQuery: WebsiteStatusQueryService,
  ) {}

  /**
   * Apply visibility treatment to a list of ranked candidates.
   *
   * @param ranked        Already-ranked candidates (output of RankingService).
   * @param config        The merged marketplace config (carries the new status
   *                       visibility factors + RESTRICTED cap fraction).
   * @param ctx           Run context: provider id, marketplace mode, and the
   *                       daily provider-match counts keyed by website id (so we
   *                       can decide RESTRICTED cap drops without re-querying).
   * @param rankingRunLogId Optional correlation id to the RankingRunLog row.
   */
  async apply(
    ranked: RankedMatchCandidate[],
    config: MergedMarketplaceConfig,
    ctx: {
      providerId?: string;
      marketplaceMode?: RankingMarketplaceMode;
      dailyProviderWebsiteCounts: Map<string, number>;
      overridesByWebsite: Map<string, any>;
    },
    rankingRunLogId?: string,
  ): Promise<RankedMatchCandidate[]> {
    const marketplaceMode = ctx.marketplaceMode ?? 'NORMAL';

    const adjustments: Array<{
      providerId: string;
      taskId: string;
      websiteId: string;
      adjustmentType: string;
      beforeScore: number;
      afterScore: number;
      factor: number | null;
      marketplaceStatus: string | null;
      reasonCode: string;
      marketplaceMode: string;
    }> = [];

    const result: RankedMatchCandidate[] = [];

    for (const candidate of ranked) {
      const profile = candidate.providerWebsite.matchingProfile;
      const status = profile?.marketplaceStatus ?? 'ACTIVE';
      const websiteId = candidate.providerWebsite.id;
      const beforeScore = candidate.score;

      // --- 1. Status-driven visibility factor ------------------------------
      const statusFactor = this.resolveVisibilityFactor(status, config);
      const afterScore = beforeScore * statusFactor;
      const appliedFactor = statusFactor;
      let reasonCode = 'STATUS_FACTOR';

      // --- 2. RESTRICTED daily participation cap reduction -------------------
      // RESTRICTED sites have a reduced daily match cap (restricted
      // participation). The Ranking Engine no longer drops these itself; the
      // Visibility Control stage decides inclusion based on the reduced cap.
      if (status === 'RESTRICTED') {
        // Prefer an admin-configured per-profile cap (set via setStatus) when
        // present; otherwise derive one from restrictedDailyCapFactor.
        const profileCap =
          typeof profile?.marketplaceStatusDailyCap === 'number'
            ? profile.marketplaceStatusDailyCap
            : null;
        const reducedCap = this.resolveRestrictedDailyCap(config, profileCap);
        const used = ctx.dailyProviderWebsiteCounts.get(websiteId) ?? 0;
        if (used >= reducedCap) {
          // Drop from exposure (frequency control), but still log the decision.
          adjustments.push({
            providerId: ctx.providerId ?? '',
            taskId: candidate.task.id,
            websiteId,
            adjustmentType: 'FREQUENCY_CAP',
            beforeScore,
            afterScore: beforeScore,
            factor: reducedCap,
            marketplaceStatus: status,
            reasonCode: 'RESTRICTED_DAILY_CAP',
            marketplaceMode,
          });
          continue; // excluded from the visible result set
        }
        reasonCode = 'RESTRICTED_VISIBILITY';
      }

      // --- 3. UNDER_REVIEW monitored-visibility signal ----------------------
      // Under-review sites keep participating (no hard cap change) but receive a
      // distinct, reduced visibility factor and an explicit monitored signal so
      // they are never ranked identically to fully-ACTIVE sites (audit §5). The
      // behavioural-monitoring record (audit §2 / §15 missing requirement #3) is
      // emitted via the centralized status facade (best-effort, never blocks).
      if (status === 'UNDER_REVIEW') {
        reasonCode = 'UNDER_REVIEW_MONITORED';
        void this.websiteStatusQuery
          .recordUnderReviewMonitoring({
            websiteId,
            providerId: ctx.providerId,
            taskId: candidate.task.id,
            rankingRunLogId,
          })
          .catch(() => undefined);
      }

      // --- 4. Admin override application log (visibility override) ----------
      const override = ctx.overridesByWebsite.get(websiteId);
      if (
        override &&
        (override.visibilityScore != null ||
          override.boostValue != null ||
          override.opportunityScore != null ||
          override.reputationScore != null ||
          override.suppressed === true ||
          override.forceMatchNext === true)
      ) {
        adjustments.push({
          providerId: ctx.providerId ?? '',
          taskId: candidate.task.id,
          websiteId,
          adjustmentType: 'OVERRIDE_APPLIED',
          beforeScore,
          afterScore,
          factor: null,
          marketplaceStatus: status,
          reasonCode: 'ADMIN_OVERRIDE',
          marketplaceMode,
        });
      }

      // Record the status-factor adjustment (skip if identity / no change).
      if (appliedFactor !== 1 || reasonCode === 'UNDER_REVIEW_MONITORED') {
        adjustments.push({
          providerId: ctx.providerId ?? '',
          taskId: candidate.task.id,
          websiteId,
          adjustmentType: 'STATUS_FACTOR',
          beforeScore,
          afterScore: Math.round(afterScore * 100) / 100,
          factor: appliedFactor,
          marketplaceStatus: status,
          reasonCode,
          marketplaceMode,
        });
      }

      result.push({
        ...candidate,
        score: Math.round(afterScore * 100) / 100,
        // Surface the monitored-visibility signal for UNDER_REVIEW (read-only
        // metadata; never a hard constraint, never exposed to end users raw).
        visibilityMonitored: status === 'UNDER_REVIEW',
      } as RankedMatchCandidate & { visibilityMonitored?: boolean });
    }

    // Re-rank by the adjusted score (visibility changes ordering at the
    // presentation boundary, not the ranking engine's weighted tier order which
    // already ran). Tie-break keeps the prior rank.
    result.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.rank - b.rank;
    });
    result.forEach((c, i) => (c.rank = i + 1));

    // Best-effort observability write (never blocks the response).
    if (adjustments.length > 0 && ctx.providerId) {
      await this.persistAdjustments(adjustments, rankingRunLogId).catch(
        (error) => {
          this.logger.warn(
            `Failed to persist VisibilityAdjustmentLog entries: ${
              (error as Error)?.message ?? error
            }`,
          );
        },
      );
    }

    return result;
  }

  /**
   * Resolve the visibility factor for a given marketplace status.
   *
   * Only the status treatments the audit flagged as MISSING are applied here:
   *   - RESTRICTED => significant visibility reduction (restrictedVisibilityFactor)
   *   - UNDER_REVIEW => monitored (reduced) visibility (underReviewVisibilityFactor)
   *
   * LOW_PRIORITY is intentionally NOT re-applied here: the Ranking Engine already
   * multiplies LOW_PRIORITY by lowPriorityFactor (and is unit-tested for it), so
   * applying it again would double-count. ACTIVE / LIMITED_ACCESS / SUSPENDED
   * return identity (1.0); SUSPENDED is removed upstream and never reaches here.
   */
  private resolveVisibilityFactor(
    status: string,
    config: MergedMarketplaceConfig,
  ): number {
    switch (status) {
      case 'RESTRICTED':
        return config.restrictedVisibilityFactor ?? 0.4;
      case 'UNDER_REVIEW':
        return config.underReviewVisibilityFactor ?? 0.7;
      default:
        return 1;
    }
  }

  /**
   * Resolve the reduced daily participation cap for RESTRICTED sites.
   *
   * When an admin has explicitly set a per-profile `marketplaceStatusDailyCap`
   * (via setStatus for RESTRICTED), that value is used directly. Otherwise the
   * cap is derived as a fraction (restrictedDailyCapFactor) of the global
   * maxProviderMatchesPerDay, rounded down with a floor of 1 so restricted sites
   * still get *some* (throttled) participation rather than none (SUSPENDED
   * handles full removal upstream).
   */
  private resolveRestrictedDailyCap(
    config: MergedMarketplaceConfig,
    profileCap?: number | null,
  ): number {
    if (typeof profileCap === 'number' && profileCap > 0) {
      return Math.max(1, Math.floor(profileCap));
    }
    const fraction = config.restrictedDailyCapFactor ?? 0.34;
    const globalCap = config.maxProviderMatchesPerDay ?? 3;
    return Math.max(1, Math.floor(globalCap * fraction));
  }

  private async persistAdjustments(
    adjustments: Array<{
      providerId: string;
      taskId: string;
      websiteId: string;
      adjustmentType: string;
      beforeScore: number;
      afterScore: number;
      factor: number | null;
      marketplaceStatus: string | null;
      reasonCode: string;
      marketplaceMode: string;
    }>,
    rankingRunLogId?: string,
  ): Promise<void> {
    await this.prisma.visibilityAdjustmentLog.createMany({
      data: adjustments.map((a) => ({
        rankingRunLogId: rankingRunLogId ?? null,
        providerId: a.providerId,
        taskId: a.taskId,
        websiteId: a.websiteId,
        adjustmentType: a.adjustmentType,
        beforeScore: a.beforeScore,
        afterScore: a.afterScore,
        factor: a.factor,
        marketplaceStatus: a.marketplaceStatus,
        reasonCode: a.reasonCode,
        marketplaceMode: a.marketplaceMode,
      })),
    });
  }
}
