import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RankedMatchCandidate } from './matching.types';

/**
 * ImpressionService (spec §9 / §12.1 / Architectural §15).
 *
 * Owns the *analytics / state-mutating write* side of opportunity exposure that
 * was previously (incorrectly) performed inside RankingService.rankAndFilter.
 *
 * Responsibilities:
 *   1. Persist `OpportunityImpression` rows for the candidates actually shown to
 *      a provider on a given page (ranking output storage + analytics).
 *   2. Increment the per-website `exposureCount7d` / `lastShownAt` frequency
 *      counters used by the ranking exposure penalty.
 *
 * This service MUST NOT perform ranking / ordering / eligibility work — it only
 * records that already-ranked candidates were exposed. It is invoked by the
 * orchestrator (RecommendationService) as a best-effort, fire-and-forget write
 * so it never blocks or breaks the read-path opportunity listing (spec §13 /
 * §16 performance requirements: no synchronous contention on the GET path).
 */
@Injectable()
export class ImpressionService {
  private readonly logger = new Logger(ImpressionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record impressions for the given (already ranked + paginated) candidates.
   *
   * Failures are swallowed and logged: analytics writes must never surface as a
   * 500 on the opportunity-listing endpoint (spec §17 failure handling).
   */
  async recordOpportunityImpressions(
    providerId: string,
    candidates: RankedMatchCandidate[],
  ): Promise<void> {
    if (candidates.length === 0) return;

    try {
      await this.prisma.opportunityImpression.createMany({
        data: candidates.map((candidate) => ({
          providerId,
          providerWebsiteId: candidate.providerWebsite.id,
          taskId: candidate.task.id,
          requesterId: candidate.task.requesterId,
          requesterWebsiteId: candidate.task.requesterWebsiteId,
          score: candidate.score,
          rank: candidate.rank,
          relaxationLevel: candidate.relaxationLevel,
          reasons: {
            values: candidate.reasons,
            matchingAttributes: candidate.matchingAttributes,
            compatibilityScore: candidate.compatibilityScore,
          },
        })),
      });

      const providerWebsiteIds = [
        ...new Set(candidates.map((candidate) => candidate.providerWebsite.id)),
      ];
      await Promise.all(
        providerWebsiteIds.map((websiteId) =>
          this.prisma.websiteMatchingProfile.updateMany({
            where: { websiteId },
            data: {
              lastShownAt: new Date(),
              exposureCount7d: { increment: 1 },
            },
          }),
        ),
      );
    } catch (error) {
      // Best-effort only: never break the opportunity response on an analytics
      // write failure.
      this.logger.warn(
        `Failed to record opportunity impressions for provider ${providerId}: ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }
}
