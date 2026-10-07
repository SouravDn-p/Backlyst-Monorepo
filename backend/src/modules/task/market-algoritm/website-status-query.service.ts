import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketplaceConfigService } from './marketplace-config.service';

/**
 * WebsiteStatusQueryService — centralized status-read / status-validation facade
 * (spec §7; audit §10 / architectural issue #4).
 *
 * Before this service existed, the six marketplace statuses were *consumed*
 * independently in at least four places (ValidationEngine eligibility +
 * selection, RankingService LOW_PRIORITY factor + LIMITED_ACCESS cap,
 * VisibilityControlService RESTRICTED/UNDER_REVIEW factors + RESTRICTED cap, and
 * QualityStatusEngine automatic transitions). That decentralization risks drift
 * as new statuses / behaviours are added.
 *
 * This service is the single source of truth for:
 *   1. `isBrowsableStatus` / `isSelectableStatus` — the canonical eligibility
 *      rules (SUSPENDED is the only non-browsable, non-selectable status;
 *      UNDER_REVIEW remains selectable per audit §2 / §15 violation a).
 *   2. `getStatusTreatment` — the derived per-status marketplace behaviour
 *      (visibility factor, daily-cap reduction, boost-disabled, monitored flag)
 *      so ranking/visibility never re-derive these inline.
 *   3. `getEligibleMarketplaceWebsiteIds` / `getEligibleProviderWebsites` —
 *      the DB-side SUSPENDED exclusion (audit §12 / violation c) lives here and
 *      is reused by the matching engine.
 *
 * It MUST NOT own writes (status transitions are owned by QualityStatusEngine +
 * the admin WebsiteStatusService) — it is a read/derive facade only.
 */
@Injectable()
export class WebsiteStatusQueryService {
  private readonly logger = new Logger(WebsiteStatusQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: MarketplaceConfigService,
  ) {}

  /**
   * Only SUSPENDED is ineligible for browsing + selection. Every other status
   * (ACTIVE / LOW_PRIORITY / LIMITED_ACCESS / UNDER_REVIEW / RESTRICTED) is
   * browsable and therefore reaches ranking/visibility treatment.
   */
  isBrowsableStatus(status: string | undefined | null): boolean {
    return status !== 'SUSPENDED';
  }

  /**
   * Per spec §7, every non-SUSPENDED status continues marketplace participation,
   * so UNDER_REVIEW is selectable (audit §2 / §15 violation a fix). SUSPENDED is
   * the only non-selectable status.
   */
  isSelectableStatus(status: string | undefined | null): boolean {
    return (
      status === 'ACTIVE' ||
      status === 'LOW_PRIORITY' ||
      status === 'LIMITED_ACCESS' ||
      status === 'UNDER_REVIEW' ||
      status === 'RESTRICTED'
    );
  }

  /**
   * The single, auditable derivation of how a status changes marketplace
   * behaviour. Ranking / Visibility Control / selection gates should call this
   * instead of re-implementing per-status logic. Values come from the merged
   * MarketplaceScoringConfig so they are admin-tunable.
   */
  async getStatusTreatment(
    status: string | undefined | null,
    profileDailyCap?: number | null,
  ): Promise<{
    browsable: boolean;
    selectable: boolean;
    visibilityFactor: number;
    boostDisabled: boolean;
    monitored: boolean;
    reducedDailyCap: number | null;
  }> {
    const cfg = await this.configService.getMergedConfig();
    const safeStatus = status ?? 'ACTIVE';

    const browsable = this.isBrowsableStatus(safeStatus);
    const selectable = this.isSelectableStatus(safeStatus);

    let visibilityFactor = 1;
    if (safeStatus === 'RESTRICTED') {
      visibilityFactor = cfg.restrictedVisibilityFactor ?? 0.4;
    } else if (safeStatus === 'UNDER_REVIEW') {
      visibilityFactor = cfg.underReviewVisibilityFactor ?? 0.7;
    }

    const boostDisabled = safeStatus === 'RESTRICTED';
    const monitored = safeStatus === 'UNDER_REVIEW';

    // Daily-cap reduction: LIMITED_ACCESS uses its per-profile cap (or the
    // config-limited value); RESTRICTED uses its per-profile cap (or the
    // restrictedDailyCapFactor-derived fraction). Other statuses => null
    // (global cap applies).
    let reducedDailyCap: number | null = null;
    if (safeStatus === 'LIMITED_ACCESS') {
      reducedDailyCap =
        typeof profileDailyCap === 'number' && profileDailyCap > 0
          ? Math.min(profileDailyCap, cfg.maxProviderMatchesPerDay ?? 3)
          : Math.min(
              cfg.limitedAccessDailyCap ?? 1,
              cfg.maxProviderMatchesPerDay ?? 3,
            );
    } else if (safeStatus === 'RESTRICTED') {
      const fraction = cfg.restrictedDailyCapFactor ?? 0.34;
      const derived = Math.max(
        1,
        Math.floor((cfg.maxProviderMatchesPerDay ?? 3) * fraction),
      );
      reducedDailyCap =
        typeof profileDailyCap === 'number' && profileDailyCap > 0
          ? Math.min(profileDailyCap, derived)
          : derived;
    }

    return {
      browsable,
      selectable,
      visibilityFactor,
      boostDisabled,
      monitored,
      reducedDailyCap,
    };
  }

  /**
   * Eligible marketplace (requester) website ids for matching — SUSPENDED sites
   * are excluded at the DB level (audit §12 / violation c) so we never load
   * every profile into memory and filter application-side.
   */
  async getEligibleMarketplaceWebsiteIds(): Promise<string[]> {
    const websites = await this.prisma.website.findMany({
      where: {
        isDeleted: false,
        verificationStatus: 'VERIFIED',
        marketplaceVisibilityStatus: 'VISIBLE',
        isFlag: false,
        isWalletLock: false,
        matchingProfile: { is: { marketplaceStatus: { not: 'SUSPENDED' } } },
      },
      select: {
        id: true,
        matchingProfile: { select: { marketplaceStatus: true } },
      },
      // The @@index([marketplaceStatus]) keeps this an indexed scan.
    });

    return websites
      .filter((w) =>
        this.isBrowsableStatus(w.matchingProfile?.marketplaceStatus),
      )
      .map((w) => w.id);
  }

  /**
   * Eligible provider websites for a user — same DB-side SUSPENDED exclusion
   * as above, returning id + normalized root domain for the matching engine.
   */
  async getEligibleProviderWebsites(
    userId: string,
  ): Promise<Array<{ id: string; rootDomain: string }>> {
    const websites = await this.prisma.website.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
        verificationStatus: 'VERIFIED',
        marketplaceVisibilityStatus: 'VISIBLE',
        isFlag: false,
        isWalletLock: false,
        matchingProfile: { is: { marketplaceStatus: { not: 'SUSPENDED' } } },
      },
      select: {
        id: true,
        rootDomain: true,
        websiteUrl: true,
        matchingProfile: { select: { marketplaceStatus: true } },
      },
    });

    return websites
      .filter((w) =>
        this.isBrowsableStatus(w.matchingProfile?.marketplaceStatus),
      )
      .map((w) => ({
        id: w.id,
        rootDomain: this.normalizeRootDomain(w.rootDomain || w.websiteUrl),
      }))
      .filter((w) => w.rootDomain.length > 0);
  }

  /**
   * Spec §7 (audit §2 / §15, missing requirement #3): behavioural-monitoring
   * hook for UNDER_REVIEW. Under-review sites are not hard-blocked — they
   * continue participation but receive a distinct, *monitored* visibility
   * treatment. This method is the explicit monitoring signal: callers (e.g.
   * Visibility Control) invoke it when an UNDER_REVIEW candidate is surfaced so
   * the monitored-visibility event is recorded for auditability rather than
   * being an implicit side effect of a factor multiplication.
   *
   * Best-effort: a failure must never block the opportunity response.
   */
  async recordUnderReviewMonitoring(params: {
    websiteId: string;
    providerId?: string;
    taskId?: string;
    rankingRunLogId?: string;
  }): Promise<void> {
    try {
      const profile = await this.prisma.websiteMatchingProfile.findUnique({
        where: { websiteId: params.websiteId },
        select: { marketplaceStatus: true },
      });
      if (profile?.marketplaceStatus !== 'UNDER_REVIEW') return;

      // Reuse the existing VisibilityAdjustmentLog as the monitoring ledger:
      // it already captures status-driven, non-leaking visibility adjustments.
      await this.prisma.visibilityAdjustmentLog.create({
        data: {
          rankingRunLogId: params.rankingRunLogId ?? null,
          providerId: params.providerId ?? '',
          taskId: params.taskId ?? '',
          websiteId: params.websiteId,
          adjustmentType: 'MONITORED_VISIBILITY',
          beforeScore: 0,
          afterScore: 0,
          factor: null,
          marketplaceStatus: 'UNDER_REVIEW',
          reasonCode: 'UNDER_REVIEW_MONITORED',
          marketplaceMode: 'NORMAL',
        },
      });
    } catch (error) {
      this.logger.warn(
        `recordUnderReviewMonitoring failed for website ${params.websiteId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private normalizeRootDomain(value: string): string {
    const rawValue = value.trim().toLowerCase();
    if (!rawValue) return '';
    let hostname = rawValue;
    try {
      const normalizedUrl = /^https?:\/\//i.test(rawValue)
        ? rawValue
        : `https://${rawValue}`;
      hostname = new URL(normalizedUrl).hostname.toLowerCase();
    } catch {
      hostname = rawValue
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .split('?')[0]
        .split('#')[0]
        .toLowerCase();
    }
    hostname = hostname.replace(/^www\./, '').replace(/\.$/, '');
    const labels = hostname.split('.').filter(Boolean);
    if (labels.length <= 2) return labels.join('.');
    const twoPartPublicSuffixes = new Set([
      'ac.uk',
      'co.bd',
      'co.in',
      'co.jp',
      'co.nz',
      'co.uk',
      'com.au',
      'com.bd',
      'com.br',
      'com.cn',
      'com.sg',
      'gov.uk',
      'net.au',
      'org.uk',
    ]);
    const suffix = labels.slice(-2).join('.');
    if (twoPartPublicSuffixes.has(suffix) && labels.length >= 3) {
      return labels.slice(-3).join('.');
    }
    return labels.slice(-2).join('.');
  }
}
