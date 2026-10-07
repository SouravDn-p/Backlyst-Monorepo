import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Background cleanup (spec §0 / maintenance): `OpportunityImpression` rows are
 * write-heavy and only consumed within a short lookback window
 * (`MarketplaceScoringConfig.impressionLookbackDays`). This job purges rows
 * older than `impressionRetentionDays` (default 30) to keep the table bounded.
 *
 * Runs daily at 04:30 (offset from the 02:00 / 03:00 marketplace crons).
 * Deletes are batched via a bounded id loop to avoid long-held locks on
 * large tables.
 */
@Injectable()
export class ImpressionCleanupService {
  private readonly logger = new Logger(ImpressionCleanupService.name);

  /** Max ids deleted per iteration; loop until the table is clean. */
  private static readonly BATCH_SIZE = 5_000;

  constructor(private readonly prisma: PrismaService) {}

  async purgeStaleImpressions() {
    try {
      const config = await this.prisma.marketplaceScoringConfig.findFirst();
      const retentionDays = config?.impressionRetentionDays ?? 30;
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      let totalDeleted = 0;
      for (;;) {
        const batch = await this.prisma.opportunityImpression.findMany({
          where: { shownAt: { lt: cutoff } },
          select: { id: true },
          take: ImpressionCleanupService.BATCH_SIZE,
        });
        if (batch.length === 0) break;

        const { count } = await this.prisma.opportunityImpression.deleteMany({
          where: { id: { in: batch.map((r) => r.id) } },
        });
        totalDeleted += count;

        if (batch.length < ImpressionCleanupService.BATCH_SIZE) break;
      }

      this.logger.log(
        `Impression cleanup complete: purged ${totalDeleted} row(s) older than ${retentionDays}d (before ${cutoff.toISOString()}).`,
      );
    } catch (err) {
      this.logger.error(
        `Impression cleanup failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
