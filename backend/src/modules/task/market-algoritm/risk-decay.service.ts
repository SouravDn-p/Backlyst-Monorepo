import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class RiskDecayService {
  private readonly logger = new Logger(RiskDecayService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleRiskDecay() {
    this.logger.log('Running risk score decay cron...');
    try {
      const profiles = await this.prisma.websiteMatchingProfile.findMany({
        where: { riskScore: { gt: 0 } },
        select: {
          id: true,
          websiteId: true,
          riskScore: true,
          lastRiskEventAt: true,
        },
      });

      const now = new Date();
      let updatedCount = 0;

      const updates: Promise<any>[] = [];

      for (const profile of profiles) {
        if (!profile.lastRiskEventAt) continue;

        const daysSinceLastEvent = Math.floor(
          (now.getTime() - profile.lastRiskEventAt.getTime()) / MS_PER_DAY,
        );

        let decayRate = 0;
        if (daysSinceLastEvent > 180) decayRate = 0.2;
        else if (daysSinceLastEvent > 90) decayRate = 0.1;
        else if (daysSinceLastEvent > 30) decayRate = 0.05;
        else continue;

        const newRiskScore = Math.max(
          0,
          Math.round(profile.riskScore * (1 - decayRate)),
        );

        if (newRiskScore !== profile.riskScore) {
          updatedCount++;
          updates.push(
            this.prisma.websiteMatchingProfile.update({
              where: { id: profile.id },
              data: { riskScore: newRiskScore },
            }),
          );
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      this.logger.log(
        `Risk decay: ${profiles.length} profile(s) evaluated, ${updatedCount} updated.`,
      );
    } catch (err) {
      this.logger.error(
        `Risk decay cron failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
