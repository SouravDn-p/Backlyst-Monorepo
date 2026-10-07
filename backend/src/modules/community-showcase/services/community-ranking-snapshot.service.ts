import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  RankingPeriod,
  ShowcaseEntityType,
  ShowcaseSection,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AUTO_RANKING_SECTIONS,
  COMMUNITY_SHOWCASE_SECTIONS,
  getDefaultPeriodForShowcaseSection,
  getSupportedPeriodsForShowcaseSection,
} from '../community-showcase.constants';
import { clampGenerationLimit } from '../community-showcase.utils';
import { CommunityRankingService } from './community-ranking.service';
import { UserShowcaseStatsService } from './user-showcase-stats.service';
import { WebsiteShowcaseStatsService } from './website-showcase-stats.service';

@Injectable()
export class CommunityRankingSnapshotService {
  private readonly logger = new Logger(CommunityRankingSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communityRankingService: CommunityRankingService,
    private readonly userShowcaseStatsService: UserShowcaseStatsService,
    private readonly websiteShowcaseStatsService: WebsiteShowcaseStatsService,
  ) {}

  @Cron('30 4 * * *')
  async generateDailySnapshotsCron() {
    try {
      await this.userShowcaseStatsService.refreshAllUserStats();
      await this.websiteShowcaseStatsService.refreshAllWebsiteStats();
      const result = await this.generateAllSnapshots();
      this.logger.log(
        `Community ranking snapshot cron finished. generated=${result.generated} failed=${result.failed}`,
      );
    } catch (error) {
      this.logger.error(
        'Community ranking snapshot cron failed.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async generateSnapshot(input: {
    section: ShowcaseSection;
    period: RankingPeriod;
    entityType: ShowcaseEntityType;
    limit?: number;
  }) {
    const limit = clampGenerationLimit(input.limit);
    const rankingRows = await this.communityRankingService.buildRankings({
      ...input,
      limit,
    });

    const snapshot = await this.prisma.$transaction(async (tx) => {
      const createdSnapshot = await tx.communityRankingSnapshot.create({
        data: {
          section: input.section,
          period: input.period,
          entityType: input.entityType,
          generatedAt: new Date(),
        },
      });

      if (rankingRows.length > 0) {
        await tx.communityRankingEntry.createMany({
          data: rankingRows.map((row) => ({
            snapshotId: createdSnapshot.id,
            entityType: row.entityType,
            entityId: row.entityId,
            rank: row.rank,
            score: row.score,
            metrics: row.metrics,
            displayData: row.displayData,
          })),
        });
      }

      return createdSnapshot;
    });

    return {
      snapshotId: snapshot.id,
      section: input.section,
      period: input.period,
      entityType: input.entityType,
      generatedAt: snapshot.generatedAt,
      totalEntries: rankingRows.length,
    };
  }

  async generateAllSnapshots() {
    const supportedCombos: Array<{
      section: ShowcaseSection;
      period: RankingPeriod;
      entityType: ShowcaseEntityType;
    }> = [];

    for (const config of COMMUNITY_SHOWCASE_SECTIONS) {
      if (!AUTO_RANKING_SECTIONS.has(config.key)) {
        continue;
      }

      for (const period of getSupportedPeriodsForShowcaseSection(config.key)) {
        supportedCombos.push({
          section: config.key,
          period,
          entityType: config.entityType,
        });
      }
    }

    let generated = 0;
    let failed = 0;
    const results: any[] = [];

    for (const combo of supportedCombos) {
      try {
        const result = await this.generateSnapshot({
          ...combo,
          limit: 100,
        });
        generated += 1;
        results.push(result);
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Failed to generate snapshot ${combo.section}/${combo.period}/${combo.entityType}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      generated,
      failed,
      results,
    };
  }

  async getLatestSnapshot(
    section: ShowcaseSection,
    period: RankingPeriod,
    entityType: ShowcaseEntityType,
  ) {
    return this.prisma.communityRankingSnapshot.findFirst({
      where: {
        section,
        period,
        entityType,
      },
      orderBy: {
        generatedAt: 'desc',
      },
      include: {
        entries: {
          orderBy: {
            rank: 'asc',
          },
        },
      },
    });
  }
}
