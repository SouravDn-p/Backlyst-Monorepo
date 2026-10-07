import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type PenaltyResult = {
  riskScoreIncrease: number;
  boostMultiplier: number;
  suppressionThreshold: number;
  message: string;
};

const OFFENSE_WINDOW_DAYS = 90;
const SUPPRESSION_THRESHOLD = 70;

@Injectable()
export class GraduatedPenaltyService {
  private readonly logger = new Logger(GraduatedPenaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computePenalty(
    providerId: string,
    riskEventType: 'DISPUTE' | 'REJECTION' | 'FAILURE' | 'ABUSE',
  ): Promise<PenaltyResult> {
    const since = new Date(
      Date.now() - OFFENSE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const offenseCount = await this.prisma.riskEvent.count({
      where: {
        website: {
          authorId: providerId,
        },
        type: { not: 'SUCCESS' },
        createdAt: { gte: since },
      },
    });

    return this.buildPenalty(offenseCount, riskEventType);
  }

  private buildPenalty(
    priorOffenses: number,
    riskEventType: string,
  ): PenaltyResult {
    if (priorOffenses === 0) {
      return {
        riskScoreIncrease: 10,
        boostMultiplier: 1.0,
        suppressionThreshold: SUPPRESSION_THRESHOLD,
        message: `First ${riskEventType} offense: base penalty applied.`,
      };
    }

    if (priorOffenses === 1) {
      return {
        riskScoreIncrease: 15,
        boostMultiplier: 0.9,
        suppressionThreshold: SUPPRESSION_THRESHOLD,
        message: `Second ${riskEventType} offense (1 prior in ${OFFENSE_WINDOW_DAYS}d): 1.5x penalty.`,
      };
    }

    if (priorOffenses === 2) {
      return {
        riskScoreIncrease: 20,
        boostMultiplier: 0.75,
        suppressionThreshold: SUPPRESSION_THRESHOLD,
        message: `Third ${riskEventType} offense (2 priors in ${OFFENSE_WINDOW_DAYS}d): 2x penalty.`,
      };
    }

    return {
      riskScoreIncrease: 30,
      boostMultiplier: 0.5,
      suppressionThreshold: SUPPRESSION_THRESHOLD,
      message: `${priorOffenses + 1}th ${riskEventType} offense (3+ priors in ${OFFENSE_WINDOW_DAYS}d): 3x penalty with auto-suppression.`,
    };
  }
}
