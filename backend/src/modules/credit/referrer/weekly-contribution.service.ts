import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlacementFinalTaskType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreditTaskService } from '../credit-task/credit-task.service';
import { ReferrerService } from './referrer.service';
import { getPreviousUtcWeekStart, getUtcWeekRange } from './utils/week.util';
import { RewardNotificationService } from 'src/modules/rewards/services/reward-notification.service';

type DbClient = PrismaService | Prisma.TransactionClient;

type ProcessApprovedVerifiedPlacementInput = {
  taskId: string;
  providerId: string;
  providerWebsiteId: string;
  finalTaskType: PlacementFinalTaskType;
  verifiedAt?: Date;
};

type UpdateStreakForActiveWeekInput = {
  websiteId: string;
  userId: string;
  weekStartAt: Date;
  weekEndAt: Date;
  verifiedAt: Date;
};

@Injectable()
export class WeeklyContributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditTaskService: CreditTaskService,
    private readonly referrerService: ReferrerService,
    private readonly rewardNotificationService: RewardNotificationService,
  ) {}

  async processApprovedVerifiedPlacement(
    input: ProcessApprovedVerifiedPlacementInput,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (db: Prisma.TransactionClient) => {
      const verifiedAt = input.verifiedAt ?? new Date();
      const task = await db.placementTask.findUnique({
        where: { id: input.taskId },
        select: {
          id: true,
          lifecycleStatus: true,
          submissionStatus: true,
          selectedProviderId: true,
          assignedProviderWebsiteId: true,
          finalTaskType: true,
          placementType: true,
        },
      });

      if (!task) {
        throw new NotFoundException('Task not found.');
      }

      if (
        task.lifecycleStatus !== 'COMPLETED' ||
        task.submissionStatus !== 'APPROVED'
      ) {
        return { rewarded: false, reason: 'NOT_ELIGIBLE' as const };
      }

      if (task.selectedProviderId !== input.providerId) {
        throw new ForbiddenException(
          'Selected provider does not match the verified placement provider.',
        );
      }

      if (task.assignedProviderWebsiteId !== input.providerWebsiteId) {
        throw new ForbiddenException(
          'Assigned provider website does not match the verified placement website.',
        );
      }

      if (
        input.finalTaskType !== 'BACKLINK' &&
        input.finalTaskType !== 'GUEST_POST'
      ) {
        throw new BadRequestException(
          'finalTaskType must be BACKLINK or GUEST_POST.',
        );
      }

      await this.ensureProviderWebsiteOwnedByUser(
        db,
        input.providerId,
        input.providerWebsiteId,
      );

      try {
        await db.websiteVerifiedPlacement.create({
          data: {
            userId: input.providerId,
            websiteId: input.providerWebsiteId,
            taskId: input.taskId,
            finalTaskType: input.finalTaskType,
            status: 'VERIFIED',
            verifiedAt,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return {
            rewarded: false,
            alreadyProcessed: true,
            reason: 'ALREADY_PROCESSED' as const,
          };
        }

        throw error;
      }

      if (input.finalTaskType === 'BACKLINK') {
        // Referral credit purpose: first verified backlink unlocks Stage 2 referral rewards.
        await this.referrerService.unlockFirstBacklinkAcceptedStage(
          input.providerId,
          input.providerWebsiteId,
          input.taskId,
          db,
        );
      }

      const milestone = await db.websiteMilestoneProgress.upsert({
        where: { websiteId: input.providerWebsiteId },
        create: {
          websiteId: input.providerWebsiteId,
          totalVerifiedPlacements: 1,
          lastVerifiedPlacementAt: verifiedAt,
        },
        update: {
          totalVerifiedPlacements: { increment: 1 },
          lastVerifiedPlacementAt: verifiedAt,
        },
        select: {
          totalVerifiedPlacements: true,
          lastMilestoneAtCount: true,
        },
      });

      let milestoneBonusTriggered = false;
      if (
        milestone.totalVerifiedPlacements % 10 === 0 &&
        milestone.totalVerifiedPlacements > milestone.lastMilestoneAtCount
      ) {
        await this.creditTaskService.addEarnedTaskCredit(
          {
            userId: input.providerId,
            amount: 1,
            reason: 'MILESTONE_VERIFIED_PLACEMENT',
            websiteId: input.providerWebsiteId,
            taskId: input.taskId,
            note: 'Milestone reward for every 10 verified placements.',
          },
          db,
        );

        await db.websiteMilestoneProgress.update({
          where: { websiteId: input.providerWebsiteId },
          data: {
            lastMilestoneAtCount: milestone.totalVerifiedPlacements,
          },
        });

        await this.rewardNotificationService.notifyMilestoneReached(db, {
          userId: input.providerId,
          websiteId: input.providerWebsiteId,
          taskId: input.taskId,
          totalVerifiedPlacements: milestone.totalVerifiedPlacements,
          rewardCredits: 1,
        });

        milestoneBonusTriggered = true;
      }

      const { weekStart, weekEnd } = getUtcWeekRange(verifiedAt);

      let weeklyRewardGranted = false;
      
      const weeklyContribution = await db.websiteWeeklyContribution.upsert({
        where: {
          websiteId_weekStartAt: {
            websiteId: input.providerWebsiteId,
            weekStartAt: weekStart,
          },
        },
        update: {
          verifiedPlacementCount: {
            increment: 1,
          },
        },
        create: {
          userId: input.providerId,
          websiteId: input.providerWebsiteId,
          triggerTaskId: input.taskId,
          weekStartAt: weekStart,
          weekEndAt: weekEnd,
          verifiedPlacementCount: 1,
          rewardCredits: 1,
          status: 'VERIFIED',
          rewardedAt: verifiedAt,
        },
      });

      if (weeklyContribution.verifiedPlacementCount === 1) {
        weeklyRewardGranted = true;
      }

      if (weeklyRewardGranted) {
        await this.creditTaskService.addEarnedTaskCredit(
          {
            userId: input.providerId,
            amount: 1,
            reason: 'WEEKLY_CONTRIBUTION_REWARD',
            websiteId: input.providerWebsiteId,
            taskId: input.taskId,
            note: 'Weekly contribution reward for the first verified placement of the week.',
          },
          db,
        );

        await this.rewardNotificationService.notifyWeeklyContributionRewarded(
          db,
          {
            userId: input.providerId,
            websiteId: input.providerWebsiteId,
            taskId: input.taskId,
            weekStartAt: weekStart,
            weekEndAt: weekEnd,
            rewardCredits: 1,
          },
        );

        const streak = await this.updateStreakForActiveWeek(
          {
            websiteId: input.providerWebsiteId,
            userId: input.providerId,
            weekStartAt: weekStart,
            weekEndAt: weekEnd,
            verifiedAt,
          },
          db,
        );

        if (streak) {
          await this.rewardNotificationService.notifyStreakUpdated(db, {
            userId: input.providerId,
            websiteId: input.providerWebsiteId,
            currentStreakWeeks: streak.currentStreakWeeks,
            longestStreakWeeks: streak.longestStreakWeeks,
            weekStartAt: weekStart,
          });
        }
      }

      return {
        rewarded: true,
        alreadyProcessed: false,
        weeklyRewardGranted,
        milestoneBonusTriggered,
        totalVerifiedPlacements: milestone.totalVerifiedPlacements,
        weeklyContributionId: weeklyContribution?.id ?? null,
      };
    };

    return tx
      ? execute(tx)
      : this.prisma.$transaction(execute, {
          maxWait: 10000,
          timeout: 20000,
        });
  }

  async getWebsiteStreak(
    websiteId: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        isDeleted: false,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found.');
    }

    if (
      currentUserRole !== UserRole.ADMIN &&
      website.authorId !== currentUserId
    ) {
      throw new ForbiddenException('Access denied.');
    }

    const { weekStart } = getUtcWeekRange(new Date());
    const [streak, placementsThisWeek] = await Promise.all([
      this.ensureWebsiteStreakSnapshot(websiteId, website.authorId),
      this.prisma.websiteWeeklyContribution.findUnique({
        where: {
          websiteId_weekStartAt: {
            websiteId,
            weekStartAt: weekStart,
          },
        },
        select: {
          verifiedPlacementCount: true,
        },
      }),
    ]);

    return sendResponse('Website streak fetched successfully.', {
      websiteId,
      currentStreakWeeks: streak?.currentStreakWeeks ?? 0,
      longestStreakWeeks: streak?.longestStreakWeeks ?? 0,
      status: streak?.status ?? 'BROKEN',
      lastActiveWeekStart: streak?.lastActiveWeekStart ?? null,
      lastActiveWeekEnd: streak?.lastActiveWeekEnd ?? null,
      lastVerifiedPlacementAt: streak?.lastVerifiedPlacementAt ?? null,
      placementsThisWeek: placementsThisWeek?.verifiedPlacementCount ?? 0,
      needsActivityThisWeek: !placementsThisWeek,
    });
  }

  async checkStreaks(now = new Date()) {
    await this.bootstrapMissingWebsiteStreaks();

    const { weekStart: currentWeekStart } = getUtcWeekRange(now);
    const previousWeekStart = getPreviousUtcWeekStart(currentWeekStart);

    let active = 0;
    let atRisk = 0;
    let broken = 0;
    let checked = 0;
    let cursorId: string | undefined;
    const batchSize = 500;

    while (true) {
      const streaks = await this.prisma.websiteActivityStreak.findMany({
        take: batchSize,
        ...(cursorId
          ? {
              cursor: { id: cursorId },
              skip: 1,
            }
          : {}),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          websiteId: true,
          currentStreakWeeks: true,
          lastActiveWeekStart: true,
          status: true,
          brokenAt: true,
        },
      });

      if (streaks.length === 0) {
        break;
      }

      for (const streak of streaks) {
        const lastActiveWeekStart = streak.lastActiveWeekStart;
        if (!lastActiveWeekStart) {
          await this.prisma.websiteActivityStreak.update({
            where: { id: streak.id },
            data: {
              status: 'BROKEN',
              currentStreakWeeks: 0,
              brokenAt: streak.brokenAt ?? now,
              lastCheckedAt: now,
            },
          });
          broken += 1;
          checked += 1;
          continue;
        }

        if (lastActiveWeekStart.getTime() === currentWeekStart.getTime()) {
          await this.prisma.websiteActivityStreak.update({
            where: { id: streak.id },
            data: {
              status: 'ACTIVE',
              brokenAt: null,
              lastCheckedAt: now,
            },
          });
          active += 1;
          checked += 1;
          continue;
        }

        if (lastActiveWeekStart.getTime() === previousWeekStart.getTime()) {
          await this.prisma.websiteActivityStreak.update({
            where: { id: streak.id },
            data: {
              status: 'AT_RISK',
              lastCheckedAt: now,
            },
          });
          atRisk += 1;
          checked += 1;
          continue;
        }

        await this.prisma.websiteActivityStreak.update({
          where: { id: streak.id },
          data: {
            status: 'BROKEN',
            currentStreakWeeks: 0,
            brokenAt: streak.brokenAt ?? now,
            lastCheckedAt: now,
          },
        });
        broken += 1;
        checked += 1;
      }

      cursorId = streaks[streaks.length - 1]?.id;
    }

    return {
      checked,
      active,
      atRisk,
      broken,
    };
  }

  // TODO: Future revocation flow should mark the verified placement as REVOKED,
  // reevaluate milestone eligibility, weekly reward eligibility, and streak state.
  revokeVerifiedPlacement(_taskId: string, _reason: string) {
    throw new BadRequestException(
      'revokeVerifiedPlacement is not implemented yet.',
    );
  }

  private async updateStreakForActiveWeek(
    input: UpdateStreakForActiveWeekInput,
    tx: Prisma.TransactionClient,
  ) {
    const now = new Date();
    const existing = await tx.websiteActivityStreak.findUnique({
      where: { websiteId: input.websiteId },
      select: {
        id: true,
        currentStreakWeeks: true,
        longestStreakWeeks: true,
        streakStartedWeekStart: true,
        lastActiveWeekStart: true,
      },
    });

    if (!existing) {
      return tx.websiteActivityStreak.create({
        data: {
          websiteId: input.websiteId,
          userId: input.userId,
          currentStreakWeeks: 1,
          longestStreakWeeks: 1,
          status: 'ACTIVE',
          streakStartedWeekStart: input.weekStartAt,
          lastActiveWeekStart: input.weekStartAt,
          lastActiveWeekEnd: input.weekEndAt,
          lastVerifiedPlacementAt: input.verifiedAt,
          brokenAt: null,
          lastCheckedAt: now,
        },
      });
    }

    if (
      existing.lastActiveWeekStart &&
      existing.lastActiveWeekStart.getTime() === input.weekStartAt.getTime()
    ) {
      return tx.websiteActivityStreak.update({
        where: { websiteId: input.websiteId },
        data: {
          status: 'ACTIVE',
          lastVerifiedPlacementAt: input.verifiedAt,
          lastCheckedAt: now,
          brokenAt: null,
        },
      });
    }

    const previousWeekStart = getPreviousUtcWeekStart(input.weekStartAt);
    const isConsecutive =
      existing.lastActiveWeekStart &&
      existing.lastActiveWeekStart.getTime() === previousWeekStart.getTime();

    const nextCurrentStreakWeeks = isConsecutive
      ? existing.currentStreakWeeks + 1
      : 1;
    const nextLongestStreakWeeks = Math.max(
      existing.longestStreakWeeks,
      nextCurrentStreakWeeks,
    );

    return tx.websiteActivityStreak.update({
      where: { websiteId: input.websiteId },
      data: {
        currentStreakWeeks: nextCurrentStreakWeeks,
        longestStreakWeeks: nextLongestStreakWeeks,
        status: 'ACTIVE',
        streakStartedWeekStart: isConsecutive
          ? (existing.streakStartedWeekStart ?? input.weekStartAt)
          : input.weekStartAt,
        lastActiveWeekStart: input.weekStartAt,
        lastActiveWeekEnd: input.weekEndAt,
        lastVerifiedPlacementAt: input.verifiedAt,
        brokenAt: null,
        lastCheckedAt: now,
      },
    });
  }

  private async bootstrapMissingWebsiteStreaks() {
    const [existingStreaks, contributingWebsites] = await Promise.all([
      this.prisma.websiteActivityStreak.findMany({
        select: { websiteId: true },
      }),
      this.prisma.websiteWeeklyContribution.findMany({
        where: { status: 'VERIFIED' },
        distinct: ['websiteId'],
        select: {
          websiteId: true,
          userId: true,
        },
      }),
    ]);

    const existingWebsiteIds = new Set(
      existingStreaks.map((item) => item.websiteId),
    );

    for (const website of contributingWebsites) {
      if (!existingWebsiteIds.has(website.websiteId)) {
        await this.ensureWebsiteStreakSnapshot(
          website.websiteId,
          website.userId,
        );
      }
    }
  }

  private async ensureWebsiteStreakSnapshot(websiteId: string, userId: string) {
    const existing = await this.prisma.websiteActivityStreak.findUnique({
      where: { websiteId },
      select: {
        websiteId: true,
        currentStreakWeeks: true,
        longestStreakWeeks: true,
        status: true,
        lastActiveWeekStart: true,
        lastActiveWeekEnd: true,
        lastVerifiedPlacementAt: true,
      },
    });

    if (existing) {
      return existing;
    }

    const weeklyRows = await this.prisma.websiteWeeklyContribution.findMany({
      where: {
        websiteId,
        status: 'VERIFIED',
      },
      orderBy: {
        weekStartAt: 'asc',
      },
      select: {
        weekStartAt: true,
        weekEndAt: true,
        rewardedAt: true,
      },
    });

    if (weeklyRows.length === 0) {
      return null;
    }

    let longestStreakWeeks = 0;
    let latestChainLength = 0;
    let chainLength = 0;
    let previousWeekStart: Date | null = null;
    let currentChainStart: Date | null = null;
    let latestChainStart: Date | null = null;

    for (const row of weeklyRows) {
      const isConsecutive =
        previousWeekStart &&
        row.weekStartAt.getTime() ===
          new Date(
            previousWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).getTime();

      if (isConsecutive) {
        chainLength += 1;
      } else {
        chainLength = 1;
        currentChainStart = row.weekStartAt;
      }

      if (chainLength > longestStreakWeeks) {
        longestStreakWeeks = chainLength;
      }

      latestChainLength = chainLength;
      latestChainStart = currentChainStart ?? row.weekStartAt;
      previousWeekStart = row.weekStartAt;
    }

    const lastRow = weeklyRows[weeklyRows.length - 1];
    const now = new Date();
    const { weekStart: currentWeekStart } = getUtcWeekRange(now);
    const previousActiveWeekStart = getPreviousUtcWeekStart(currentWeekStart);

    let status: 'ACTIVE' | 'AT_RISK' | 'BROKEN' = 'BROKEN';
    let currentStreakWeeks = 0;
    let streakStartedWeekStart: Date | null = null;
    let brokenAt: Date | null = now;

    if (lastRow.weekStartAt.getTime() === currentWeekStart.getTime()) {
      status = 'ACTIVE';
      currentStreakWeeks = latestChainLength;
      streakStartedWeekStart = latestChainStart;
      brokenAt = null;
    } else if (
      lastRow.weekStartAt.getTime() === previousActiveWeekStart.getTime()
    ) {
      status = 'AT_RISK';
      currentStreakWeeks = latestChainLength;
      streakStartedWeekStart = latestChainStart;
      brokenAt = null;
    }

    try {
      const created = await this.prisma.websiteActivityStreak.create({
        data: {
          websiteId,
          userId,
          currentStreakWeeks,
          longestStreakWeeks,
          status,
          streakStartedWeekStart,
          lastActiveWeekStart: lastRow.weekStartAt,
          lastActiveWeekEnd: lastRow.weekEndAt,
          lastVerifiedPlacementAt: lastRow.rewardedAt,
          brokenAt,
          lastCheckedAt: now,
        },
        select: {
          websiteId: true,
          currentStreakWeeks: true,
          longestStreakWeeks: true,
          status: true,
          lastActiveWeekStart: true,
          lastActiveWeekEnd: true,
          lastVerifiedPlacementAt: true,
        },
      });

      return created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.websiteActivityStreak.findUnique({
          where: { websiteId },
          select: {
            websiteId: true,
            currentStreakWeeks: true,
            longestStreakWeeks: true,
            status: true,
            lastActiveWeekStart: true,
            lastActiveWeekEnd: true,
            lastVerifiedPlacementAt: true,
          },
        });
      }

      throw error;
    }
  }

  private async ensureProviderWebsiteOwnedByUser(
    db: DbClient,
    userId: string,
    websiteId: string,
  ) {
    const website = await db.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Provider website not found.');
    }

    if (website.authorId !== userId) {
      throw new ForbiddenException(
        'Provider website does not belong to the selected provider.',
      );
    }

    return website;
  }
}
