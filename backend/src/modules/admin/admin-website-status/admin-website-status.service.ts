import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { WebsiteMarketplaceStatusValue } from './dto/admin-website-status.dto';
import { ScoringService } from 'src/modules/task/market-algoritm/scoring.service';

/**
 * Spec §7: admin-managed transitions of a website's marketplace status
 * (ACTIVE / LOW_PRIORITY / LIMITED_ACCESS / UNDER_REVIEW / RESTRICTED /
 * SUSPENDED). Exposed behind the existing AdminGuard so only admins can set
 * these. The status is persisted on the website's WebsiteMatchingProfile and is
 * consumed at runtime by the ValidationEngine (eligibility / selection) and
 * RankingService (priority / exposure / boost). The ACTIVE path is left
 * untouched — setting a site back to ACTIVE restores default behaviour.
 */
@Injectable()
export class WebsiteStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  async setStatus(
    adminId: string,
    dto: {
      websiteId: string;
      status: WebsiteMarketplaceStatusValue;
      dailyCap?: number;
      reasonCode: string;
      note?: string;
    },
  ) {
    const website = await this.prisma.website.findUnique({
      where: { id: dto.websiteId },
      select: { id: true, authorId: true },
    });
    if (!website) throw new NotFoundException('Website not found.');

    // LIMITED_ACCESS may optionally carry a reduced per-profile daily cap.
    // All other statuses clear any previously-set cap so the global config
    // (default for ACTIVE) takes over again.
    const marketplaceStatusDailyCap =
      (dto.status === 'LIMITED_ACCESS' || dto.status === 'RESTRICTED') &&
      typeof dto.dailyCap === 'number'
        ? dto.dailyCap
        : null;

    // Capture the pre-change state for the audit row (spec §16).
    const existing = await this.prisma.websiteMatchingProfile.findUnique({
      where: { websiteId: dto.websiteId },
      select: { marketplaceStatus: true, qualityScore: true },
    });
    const previousStatus = existing?.marketplaceStatus ?? 'ACTIVE';
    const previousScore = existing?.qualityScore ?? 50;

    const profile = await this.prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.websiteMatchingProfile.upsert({
        where: { websiteId: dto.websiteId },
        create: {
          websiteId: dto.websiteId,
          userId: website.authorId,
          visibilityScore: 50,
          opportunityScore: 50,
          reputationScore: 50,
          boostFactor: 2.5,
          marketplaceStatus: dto.status,
          riskScore: 0,
          diversityScore: 50,
          reliabilityScore: 50,
          internalPriorityScore: 50,
          marketplaceStatusDailyCap,
        },
        update: {
          marketplaceStatus: dto.status,
          marketplaceStatusDailyCap,
        },
      });

      if (previousStatus !== dto.status) {
        await tx.websiteQualityStatusLog.create({
          data: {
            websiteId: dto.websiteId,
            previousStatus,
            newStatus: dto.status,
            previousScore,
            newScore: previousScore,
            trigger: 'ADMIN_OVERRIDE',
            adminId,
            reasonCode: dto.reasonCode,
            note: dto.note ?? null,
          },
        });
      }

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'WEBSITE_STATUS_UPDATED',
          targetType: 'WEBSITE',
          targetId: dto.websiteId,
          previousValue: { marketplaceStatus: previousStatus },
          newValue: {
            marketplaceStatus: dto.status,
            marketplaceStatusDailyCap,
          },
          reasonCode: dto.reasonCode,
          explanation: dto.note,
        },
      });

      return updatedProfile;
    });

    return sendResponse('Website marketplace status updated successfully.', {
      websiteId: dto.websiteId,
      marketplaceStatus: profile.marketplaceStatus,
      marketplaceStatusDailyCap: profile.marketplaceStatusDailyCap,
      updatedBy: adminId,
      reasonCode: dto.reasonCode,
      note: dto.note ?? null,
    });
  }

  /**
   * Spec §15: read a website's internal quality metrics for admin review. This
   * is admin-only surface — users never see these values (§18).
   */
  async getQualityMetrics(websiteId: string) {
    const profile = await this.prisma.websiteMatchingProfile.findUnique({
      where: { websiteId },
      select: {
        websiteId: true,
        marketplaceStatus: true,
        qualityScore: true,
        lastQualityScoreUpdateAt: true,
        completionRate: true,
        reliabilityScore: true,
        completedInteractions: true,
        failedInteractions: true,
        totalInteractions: true,
        successfulInteractions: true,
        riskScore: true,
        diversityScore: true,
        behaviourScore: true,
        avgQualityRating: true,
        lastMatchedAt: true,
        lastCompletedAt: true,
        marketplaceStatusDailyCap: true,
      },
    });
    if (!profile)
      throw new NotFoundException('Website quality profile not found.');

    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        marketplaceCategories: {
          select: { role: true, category: { select: { slug: true } } },
        },
      },
    });

    return sendResponse('Website quality metrics fetched successfully.', {
      ...profile,
      primaryNiche:
        website?.marketplaceCategories?.find((c) => c.role === 'PRIMARY')
          ?.category?.slug ?? null,
      secondaryNiche:
        website?.marketplaceCategories?.find((c) => c.role === 'SECONDARY')
          ?.category?.slug ?? null,
    });
  }

  /**
   * Spec §15/§16: paginated quality status-change history for a website. Includes
   * both automatic (score-driven / scheduled) and manual (admin) transitions.
   */
  async getQualityHistory(websiteId: string, limit = 50) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const history = await this.prisma.websiteQualityStatusLog.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return sendResponse(
      'Website quality status history fetched successfully.',
      {
        websiteId,
        count: history.length,
        history,
      },
    );
  }

  /**
   * Spec §15/§16: admin reset of a website's internal quality score (e.g. after
   * a false-positive penalty). Records an ADMIN_RESET audit row. Does not change
   * the marketplace status directly — the next automatic recompute will reconcile
   * the band from the reset score.
   */
  async resetQualityScore(
    adminId: string,
    websiteId: string,
    dto: { score?: number; reasonCode: string; note?: string },
  ) {
    const existing = await this.prisma.websiteMatchingProfile.findUnique({
      where: { websiteId },
      select: { marketplaceStatus: true, qualityScore: true },
    });
    if (!existing)
      throw new NotFoundException('Website quality profile not found.');

    const newScore =
      typeof dto.score === 'number'
        ? Math.min(100, Math.max(0, dto.score))
        : 50;

    await this.prisma.$transaction(async (tx) => {
      await tx.websiteMatchingProfile.update({
        where: { websiteId },
        data: { qualityScore: newScore, lastQualityScoreUpdateAt: new Date() },
      });
      await tx.websiteQualityStatusLog.create({
        data: {
          websiteId,
          previousStatus: existing.marketplaceStatus,
          newStatus: existing.marketplaceStatus,
          previousScore: existing.qualityScore,
          newScore,
          trigger: 'ADMIN_RESET',
          adminId,
          reasonCode: dto.reasonCode,
          note: dto.note ?? null,
        },
      });
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'WEBSITE_QUALITY_SCORE_RESET',
          targetType: 'WEBSITE',
          targetId: websiteId,
          previousValue: { qualityScore: existing.qualityScore },
          newValue: { qualityScore: newScore },
          reasonCode: dto.reasonCode,
          explanation: dto.note,
        },
      });
    });

    return sendResponse('Website quality score reset successfully.', {
      websiteId,
      previousScore: existing.qualityScore,
      newScore,
      updatedBy: adminId,
    });
  }

  /**
   * Spec §16: per-profile tier velocity limits consumed by the TierEngine
   * (`weeklyInteractionLimit` / `tierVelocityLimit` on WebsiteMatchingProfile).
   * Upserts the matching profile for the site. Validation enforces non-negative
   * integers. Must not alter `marketplaceStatus`.
   */
  async setTierLimits(
    adminId: string,
    websiteId: string,
    dto: { weeklyInteractionLimit?: number; tierVelocityLimit?: number },
  ) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, authorId: true },
    });
    if (!website) throw new NotFoundException('Website not found.');

    const updateData: {
      weeklyInteractionLimit?: number;
      tierVelocityLimit?: number;
    } = {};
    if (typeof dto.weeklyInteractionLimit === 'number') {
      updateData.weeklyInteractionLimit = dto.weeklyInteractionLimit;
    }
    if (typeof dto.tierVelocityLimit === 'number') {
      updateData.tierVelocityLimit = dto.tierVelocityLimit;
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.websiteMatchingProfile.findUnique({
        where: { websiteId },
        select: { weeklyInteractionLimit: true, tierVelocityLimit: true },
      });

      const updated = await tx.websiteMatchingProfile.upsert({
        where: { websiteId },
        create: {
          websiteId,
          userId: website.authorId,
          visibilityScore: 50,
          opportunityScore: 50,
          reputationScore: 50,
          boostFactor: 2.5,
          riskScore: 0,
          diversityScore: 50,
          reliabilityScore: 50,
          internalPriorityScore: 50,
          ...updateData,
        },
        update: updateData,
      });

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'WEBSITE_TIER_LIMITS_UPDATED',
          targetType: 'WEBSITE',
          targetId: websiteId,
          previousValue: existing as any,
          newValue: updateData as any,
          reasonCode: 'TIER_LIMIT_UPDATE',
        },
      });

      return updated;
    });

    return sendResponse('Tier velocity limits updated successfully.', {
      websiteId,
      weeklyInteractionLimit: profile.weeklyInteractionLimit,
      tierVelocityLimit: profile.tierVelocityLimit,
      updatedBy: adminId,
    });
  }

  /**
   * Spec §6 (audit 2026-07-18): admin-triggered full quality recompute for a
   * single website. Re-runs the composite (incl. diversity/behaviour + activity
   * recency decay) WITHOUT recording a new interaction, reconciles the automatic
   * status band, refreshes premium-access eligibility and appends a history
   * snapshot. Complements the scheduled SCHEDULED_RECALC sweep for on-demand
   * correction (e.g. after tuning thresholds). Delegated to ScoringService so
   * the recompute logic lives in one place.
   */
  async recomputeQuality(adminId: string, websiteId: string) {
    const result = await this.scoringService.recomputeQualityForWebsite(
      websiteId,
      'SCHEDULED_RECALC',
    );
    if (!result)
      throw new NotFoundException('Website quality profile not found.');

    return sendResponse('Website quality recomputed successfully.', {
      websiteId,
      qualityScore: result.qualityScore,
      statusChanged: result.changed,
      recomputedBy: adminId,
    });
  }

  /**
   * Spec §6 (audit 2026-07-18): quality-score time-series for a website. Reads
   * the QualityScoreHistory table (composite + sub-signal snapshots) so admins
   * can chart quality trends and drift over time. Admin-only (§18).
   */
  async getQualityTrend(websiteId: string, limit = 100) {
    const take = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const trend = await this.prisma.qualityScoreHistory.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return sendResponse('Website quality trend fetched successfully.', {
      websiteId,
      count: trend.length,
      trend,
    });
  }
}
