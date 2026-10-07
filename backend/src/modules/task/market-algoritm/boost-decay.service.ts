import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { MAX_BOOST_FACTOR } from './boost.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_BOOST_FACTOR = 1.0;
const FAST_DECAY_START_DAY = 31;
const FAST_DECAY_END_DAY = 60;
const FAST_DECAY_RATE = 0.05;
const SLOW_DECAY_START_DAY = 61;
const SLOW_DECAY_END_DAY = 120;
const SLOW_DECAY_RATE = 0.02;

// Re-exported for clarity: the grow/decay owners share the same ceiling so
// boost + decay can never fight over the upper bound.
const BOOST_CAP = MAX_BOOST_FACTOR;

@Injectable()
export class BoostDecayService {
  private readonly logger = new Logger(BoostDecayService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleBoostDecay() {
    this.logger.log('Running boost decay cron...');
    try {
      const profiles = await this.prisma.websiteMatchingProfile.findMany({
        where: {
          boostFactor: { gt: MIN_BOOST_FACTOR },
        },
        select: {
          id: true,
          boostFactor: true,
          firstSuccessAt: true,
          website: {
            select: { createdAt: true },
          },
        },
      });

      let updatedCount = 0;
      let reachedBaselineCount = 0;

      const now = new Date();

      const updates = profiles.map((profile) => {
        const websiteCreatedAt = profile.website.createdAt;
        const daysSinceCreation = Math.floor(
          (now.getTime() - websiteCreatedAt.getTime()) / MS_PER_DAY,
        );

        let newBoost = profile.boostFactor;
        let handledByFirstSuccess = false;

        if (profile.firstSuccessAt) {
          const daysSinceFirstSuccess = Math.floor(
            (now.getTime() - profile.firstSuccessAt.getTime()) / MS_PER_DAY,
          );
          if (daysSinceFirstSuccess <= 30) {
            newBoost = profile.boostFactor - 0.02;
            handledByFirstSuccess = true;
          }
        }

        if (!handledByFirstSuccess) {
          if (
            daysSinceCreation >= FAST_DECAY_START_DAY &&
            daysSinceCreation <= FAST_DECAY_END_DAY
          ) {
            newBoost = profile.boostFactor - FAST_DECAY_RATE;
          } else if (
            daysSinceCreation > FAST_DECAY_END_DAY &&
            daysSinceCreation <= SLOW_DECAY_END_DAY
          ) {
            newBoost = profile.boostFactor - SLOW_DECAY_RATE;
          } else if (daysSinceCreation > SLOW_DECAY_END_DAY) {
            newBoost = MIN_BOOST_FACTOR;
          }
        }

        newBoost = Math.max(
          MIN_BOOST_FACTOR,
          Math.min(newBoost, profile.boostFactor),
        );

        if (newBoost !== profile.boostFactor) {
          if (newBoost === MIN_BOOST_FACTOR) {
            reachedBaselineCount++;
          }
          updatedCount++;
          return this.prisma.websiteMatchingProfile.update({
            where: { id: profile.id },
            data: { boostFactor: newBoost },
          });
        }

        return null;
      });

      const validUpdates = updates.filter(
        (
          u,
        ): u is ReturnType<typeof this.prisma.websiteMatchingProfile.update> =>
          u !== null,
      );
      if (validUpdates.length > 0) {
        await Promise.all(validUpdates);
      }

      this.logger.log(
        `Boost decay: updated ${updatedCount} profiles, ${reachedBaselineCount} reached baseline (1.0)`,
      );
    } catch (error) {
      this.logger.error('Failed to run boost decay cron', error);
    }
  }
}
