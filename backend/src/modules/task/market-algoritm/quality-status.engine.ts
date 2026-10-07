import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketplaceConfigService } from './marketplace-config.service';

/**
 * Website Quality Engine — automatic status layer (spec §6/§7/§9/§13/§16).
 *
 * This engine is the single owner of *automatic* WebsiteMarketplaceStatus
 * transitions driven by the internal, hidden `qualityScore` (0..100) and
 * `riskScore`. It does NOT approve/reject websites — it only widens or narrows
 * marketplace exposure by moving a site between quality bands (spec §1).
 *
 * Design rules honoured here:
 *  - §4  Runs automatically, silently, weighting rather than hard-blocking.
 *  - §9  Penalties are gradual: at most one band per recompute (configurable).
 *  - §11 Never overrides mandatory validation — it only sets a status the
 *        ValidationEngine / RankingService already consume. SUSPENDED is never
 *        set automatically (admin-only, §6).
 *  - §15 Admin locks (SUSPENDED, UNDER_REVIEW) are never auto-cleared here.
 *  - §16 Every status/score change is appended to WebsiteQualityStatusLog.
 */

// Ordered from best (highest exposure) to worst. The index acts as the band
// rank used for gradual (one-step) transitions.
const AUTO_STATUS_LADDER = [
  'ACTIVE',
  'LOW_PRIORITY',
  'LIMITED_ACCESS',
  'RESTRICTED',
] as const;

type AutoStatus = (typeof AUTO_STATUS_LADDER)[number];

// Statuses that are exclusively admin/behaviour controlled. The automatic
// engine must never overwrite these — a human (or the risk path) put the site
// there deliberately.
const ADMIN_LOCKED_STATUSES = new Set<string>(['SUSPENDED']);

export type QualityStatusTriggerValue =
  | 'TASK_COMPLETED'
  | 'TASK_REJECTED'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED'
  | 'DISPUTE_RESOLVED'
  | 'INTERACTION_COMPLETED'
  | 'SCHEDULED_RECALC'
  | 'ADMIN_OVERRIDE'
  | 'ADMIN_RESET'
  | 'RISK_EVENT';

export type QualityStatusInputs = {
  qualityScore: number;
  riskScore: number;
  completedInteractions: number;
  currentStatus: string;
};

@Injectable()
export class QualityStatusEngine {
  private readonly logger = new Logger(QualityStatusEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: MarketplaceConfigService,
  ) {}

  /**
   * Maps a qualityScore (+ risk) to the *target* automatic status band, ignoring
   * gradual-transition smoothing. Pure function of the inputs + config so it is
   * easily unit-tested. Admin-locked statuses short-circuit to themselves.
   */
  resolveTargetStatus(
    inputs: QualityStatusInputs,
    config: {
      qualityActiveThreshold: number;
      qualityLowPriorityThreshold: number;
      qualityLimitedAccessThreshold: number;
      qualityMinInteractionsForStatus: number;
      qualityUnderReviewRiskThreshold: number;
    },
  ): string {
    // §15: admin SUSPENDED is untouchable by the automatic engine.
    if (ADMIN_LOCKED_STATUSES.has(inputs.currentStatus)) {
      return inputs.currentStatus;
    }

    // §9: high risk forces UNDER_REVIEW (monitoring, no hard restriction) and is
    // sticky — the automatic engine won't pull a site out of review; that's an
    // admin / risk-decay decision.
    if (
      config.qualityUnderReviewRiskThreshold > 0 &&
      inputs.riskScore >= config.qualityUnderReviewRiskThreshold
    ) {
      return 'UNDER_REVIEW';
    }
    if (inputs.currentStatus === 'UNDER_REVIEW') {
      return 'UNDER_REVIEW';
    }

    // §7: brand-new sites with too little history are left ACTIVE — a couple of
    // early failures should not immediately degrade them.
    if (
      inputs.completedInteractions < config.qualityMinInteractionsForStatus &&
      this.rankOf(inputs.currentStatus) <= this.rankOf('ACTIVE')
    ) {
      return 'ACTIVE';
    }

    const score = inputs.qualityScore;
    if (score >= config.qualityActiveThreshold) return 'ACTIVE';
    if (score >= config.qualityLowPriorityThreshold) return 'LOW_PRIORITY';
    if (score >= config.qualityLimitedAccessThreshold) return 'LIMITED_ACCESS';
    return 'RESTRICTED';
  }

  /**
   * Applies gradual smoothing (spec §9): moves the current status at most one
   * band toward the target per recompute. Recovery (moving up) is likewise
   * limited to one band so quality "gradually recovers" (spec §8).
   */
  applyGradualTransition(
    currentStatus: string,
    targetStatus: string,
    gradual: boolean,
  ): string {
    if (currentStatus === targetStatus) return targetStatus;

    // Non-ladder statuses (UNDER_REVIEW) are transitioned directly — there is no
    // meaningful "band distance" for them.
    const currentRank = this.rankOf(currentStatus);
    const targetRank = this.rankOf(targetStatus);
    if (currentRank < 0 || targetRank < 0) return targetStatus;

    if (!gradual) return targetStatus;

    const step = targetRank > currentRank ? 1 : -1;
    return AUTO_STATUS_LADDER[currentRank + step];
  }

  private rankOf(status: string): number {
    return AUTO_STATUS_LADDER.indexOf(status as AutoStatus);
  }

  /**
   * Spec §7 (audit 2026-07-18, violation b): the per-profile daily match cap the
   * automatic engine applies when a site is degraded to LIMITED_ACCESS. The value
   * is derived from the admin-configurable `limitedAccessDailyCap` (default 1)
   * so the "reduced" exposure is tunable rather than a near-total, hard-coded
   * participation cut. The global `maxProviderMatchesPerDay` remains the ceiling;
   * a value of 0 / unset falls back to a sensible default derived from the global
   * cap so LIMITED_ACCESS is always a *soft* throttle, never a full block.
   */
  private resolveLimitedAccessDailyCap(config: {
    limitedAccessDailyCap?: number;
    maxProviderMatchesPerDay?: number;
  }): number {
    const configured = config.limitedAccessDailyCap;
    const globalCap = config.maxProviderMatchesPerDay ?? 3;

    // A configured value of 0 means "use default"; otherwise honour the admin
    // setting directly. Always clamp to at least 1 (a soft throttle) and never
    // exceed the global cap.
    const raw =
      typeof configured === 'number' && configured > 0
        ? configured
        : Math.max(1, Math.floor(globalCap * 0.34));

    return Math.min(Math.max(1, Math.floor(raw)), globalCap);
  }

  /**
   * Core entry point used by the ScoringService / background jobs. Reads the
   * merged config, resolves the target band, applies gradual smoothing and — if
   * the status actually changes — persists it and appends an audit row (§16).
   * Idempotent when nothing changes (no write, no log). Best-effort: any error
   * is swallowed so scoring is never blocked (§4/§17).
   *
   * The caller is expected to have *already* persisted the new qualityScore on
   * the profile; this method only owns the derived `marketplaceStatus`.
   */
  async reconcileStatus(params: {
    websiteId: string;
    inputs: QualityStatusInputs;
    trigger: QualityStatusTriggerValue;
  }): Promise<{ changed: boolean; newStatus: string }> {
    try {
      const config = await this.configService.getMergedConfig();

      const target = this.resolveTargetStatus(params.inputs, config);
      const next = this.applyGradualTransition(
        params.inputs.currentStatus,
        target,
        config.qualityGradualTransitions,
      );

      if (next === params.inputs.currentStatus) {
        return { changed: false, newStatus: params.inputs.currentStatus };
      }

      // LIMITED_ACCESS carries a reduced per-profile daily cap so the throttle in
      // RankingService actually bites. The cap is admin-configurable via
      // `limitedAccessDailyCap` (audit violation b fix). Leaving the ladder
      // clears the cap so the global config cap applies again.
      const marketplaceStatusDailyCap =
        next === 'LIMITED_ACCESS'
          ? this.resolveLimitedAccessDailyCap({
              limitedAccessDailyCap: (config as any).limitedAccessDailyCap,
              maxProviderMatchesPerDay: config.maxProviderMatchesPerDay,
            })
          : null;

      await this.prisma.$transaction([
        this.prisma.websiteMatchingProfile.update({
          where: { websiteId: params.websiteId },
          data: {
            marketplaceStatus: next as any,
            marketplaceStatusDailyCap,
          },
        }),
        this.prisma.websiteQualityStatusLog.create({
          data: {
            websiteId: params.websiteId,
            previousStatus: params.inputs.currentStatus as any,
            newStatus: next as any,
            previousScore: params.inputs.qualityScore,
            newScore: params.inputs.qualityScore,
            trigger: params.trigger as any,
          },
        }),
      ]);

      this.logger.log(
        `Website ${params.websiteId} auto status ${params.inputs.currentStatus} -> ${next} (score=${params.inputs.qualityScore.toFixed(1)}, risk=${params.inputs.riskScore.toFixed(1)}, trigger=${params.trigger})`,
      );

      return { changed: true, newStatus: next };
    } catch (error) {
      this.logger.warn(
        `reconcileStatus failed for website ${params.websiteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { changed: false, newStatus: params.inputs.currentStatus };
    }
  }
}
