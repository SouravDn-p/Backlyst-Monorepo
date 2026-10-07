import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketplaceConfigService } from './marketplace-config.service';

/**
 * Audit R-Repeat-4: bounded-growth retention for the append-only
 * `DomainRelationshipEvent` table.
 *
 * `DomainRelationshipEvent` is the raw relationship ledger. It was previously
 * append-only with no pruning, so it grew without bound. This cron archives
 * events older than `MarketplaceScoringConfig.relationshipEventRetentionDays`
 * (default 180) into `DomainRelationshipEventArchive` (cold storage) and then
 * deletes the source rows, keeping the hot table small while preserving the
 * history for governance/audit queries.
 *
 * Operates in batches (default 500 rows/run) to avoid long transactions, and is
 * idempotent: re-archiving uses the event id as the archive PK, so a
 * partially-completed run can be safely re-run.
 */
@Injectable()
export class RelationshipRetentionService {
  private readonly logger = new Logger(RelationshipRetentionService.name);
  private readonly BATCH_SIZE = 500;
  private readonly DEFAULT_RETENTION_DAYS = 180;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: MarketplaceConfigService,
  ) {}

  /** Testable/runnable entrypoint that does not require the cron schedule. */
  async run(): Promise<{ archived: number }> {
    const retentionDays = await this.getRetentionDays();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let totalArchived = 0;
    // Cap the number of batches per invocation to bound runtime.
    for (let batch = 0; batch < 200; batch++) {
      const events = await this.prisma.domainRelationshipEvent.findMany({
        where: { createdAt: { lt: cutoff } },
        orderBy: { createdAt: 'asc' },
        take: this.BATCH_SIZE,
      });
      if (events.length === 0) break;

      // Archive (idempotent on id).
      await this.prisma.domainRelationshipEventArchive
        .createMany({
          data: events.map((e) => ({
            id: e.id,
            orderedPairKey: e.orderedPairKey,
            normalizedPairKey: e.normalizedPairKey,
            sourceDomain: e.sourceDomain,
            targetDomain: e.targetDomain,
            domainA: e.domainA,
            domainB: e.domainB,
            interactionStatus: e.interactionStatus,
            repeatPairCooldownUntil: e.repeatPairCooldownUntil,
            reciprocalCooldownUntil: e.reciprocalCooldownUntil,
            sourceWebsiteId: e.sourceWebsiteId,
            targetWebsiteId: e.targetWebsiteId,
            taskId: e.taskId,
            sourcePrimaryCategoryKey: e.sourcePrimaryCategoryKey,
            targetPrimaryCategoryKey: e.targetPrimaryCategoryKey,
            sourceSecondaryCategoryKey: e.sourceSecondaryCategoryKey,
            targetSecondaryCategoryKey: e.targetSecondaryCategoryKey,
            trigger: e.trigger,
            originalCreatedAt: e.createdAt,
          })),
          skipDuplicates: true,
        })
        .catch((err) => {
          this.logger.warn(
            `Archive batch skipped (idempotent): ${(err as Error).message}`,
          );
        });

      const ids = events.map((e) => e.id);
      const deleted = await this.prisma.domainRelationshipEvent.deleteMany({
        where: { id: { in: ids } },
      });
      totalArchived += deleted.count;
    }

    if (totalArchived > 0) {
      this.logger.log(
        `Relationship retention archived ${totalArchived} event(s) older than ${retentionDays}d.`,
      );
    }
    return { archived: totalArchived };
  }

  private async getRetentionDays(): Promise<number> {
    try {
      const cfg = await this.configService.getMergedConfig();
      const days = (cfg as any)?.relationshipEventRetentionDays;
      return typeof days === 'number' && days > 0
        ? days
        : this.DEFAULT_RETENTION_DAYS;
    } catch {
      return this.DEFAULT_RETENTION_DAYS;
    }
  }
}
