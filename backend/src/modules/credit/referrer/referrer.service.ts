import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, Prisma } from '@prisma/client';
import { PlatformFeatureToggleKeyDtoEnum } from 'src/modules/admin/platform-feature-toggle/dto/update-platform-feature-toggles.dto';
import { PlatformFeatureToggleService } from 'src/modules/admin/platform-feature-toggle/platform-feature-toggle.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createReferralNotificationIfAllowed } from './referral-notification.util';

@Injectable()
export class ReferrerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly platformFeatureToggleService: PlatformFeatureToggleService,
  ) {}

  // Referral credit purpose: unlock Stage 1 rewards when a referred user's website becomes verified.
  async unlockWebsiteVerifiedStage(
    referredUserId: string,
    referredWebsiteId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (db: Prisma.TransactionClient) => {
      const referralRewardsEnabled =
        await this.platformFeatureToggleService.isEnabled(
          PlatformFeatureToggleKeyDtoEnum.REFERRAL_ENGINE_INCENTIVES,
          db,
        );

      const referral = await db.userReferral.findUnique({
        where: {
          referredUserId,
        },
        select: {
          id: true,
          referrerUserId: true,
          referredUserId: true,
        },
      });

      if (!referral) {
        return {
          rewarded: false,
          reason: 'NO_REFERRAL_FOUND',
        };
      }

      const duplicateReward = await db.referralReward.findUnique({
        where: {
          referralId_stage: {
            referralId: referral.id,
            stage: 'WEBSITE_VERIFIED',
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateReward) {
        return {
          rewarded: false,
          reason: 'WEBSITE_VERIFIED_REWARD_ALREADY_ISSUED',
        };
      }

      const referrerWebsite = await db.website.findFirst({
        where: {
          authorId: referral.referrerUserId,
          verificationStatus: 'VERIFIED',
          isDeleted: false,
        },
        orderBy: {
          verifiedAt: 'asc',
        },
        select: {
          id: true,
        },
      });

      await db.userReferral.update({
        where: {
          id: referral.id,
        },
        data: {
          currentStage: 'WEBSITE_VERIFIED',
          referredWebsiteId,
          websiteVerifiedAt: new Date(),
        },
      });

      const referrerTaskCredits =
        referralRewardsEnabled && referrerWebsite ? 1 : 0;
      const referredTaskCredits = referralRewardsEnabled ? 1 : 0;

      await db.referralReward.create({
        data: {
          referralId: referral.id,
          stage: 'WEBSITE_VERIFIED',
          referrerTaskCredits,
          referrerVisibilityCredits: 0,
          referredTaskCredits,
          referredVisibilityCredits: 0,
        },
      });

      if (referredTaskCredits > 0) {
        await this.addReferralTaskCreditToWebsite(db, {
          userId: referral.referredUserId,
          websiteId: referredWebsiteId,
          referralId: referral.id,
          amount: referredTaskCredits,
          reason: 'REFERRAL_WEBSITE_VERIFIED',
          note: 'Stage 1 referral reward: referred user verified a website.',
        });
      }

      if (referrerTaskCredits > 0 && referrerWebsite) {
        await this.addReferralTaskCreditToWebsite(db, {
          userId: referral.referrerUserId,
          websiteId: referrerWebsite.id,
          referralId: referral.id,
          amount: referrerTaskCredits,
          reason: 'REFERRAL_WEBSITE_VERIFIED',
          note: 'Stage 1 referral reward: invited user verified a website.',
        });
      }

      await this.createReferralStageNotifications(db, {
        referralId: referral.id,
        stage: 'WEBSITE_VERIFIED',
        stageLabel: 'Website verified',
        referredUserId: referral.referredUserId,
        referrerUserId: referral.referrerUserId,
        referredWebsiteId,
        referrerWebsiteId: referrerWebsite?.id ?? null,
        referredTaskCredits,
        referrerTaskCredits,
        referredVisibilityCredits: 0,
        referrerVisibilityCredits: 0,
        rewardsSuppressed: !referralRewardsEnabled,
      });

      return {
        rewarded: referralRewardsEnabled,
        rewardsSuppressed: !referralRewardsEnabled,
        referralId: referral.id,
        stage: 'WEBSITE_VERIFIED',
        referredUserReward: {
          taskCredits: referredTaskCredits,
          websiteId: referredWebsiteId,
        },
        referrerReward: {
          taskCredits: referrerTaskCredits,
          websiteId: referrerWebsite?.id ?? null,
          note: referrerWebsite
            ? referralRewardsEnabled
              ? 'Reward added to referrer verified website.'
              : 'Referral incentives are disabled, so no credit was issued.'
            : 'Referrer has no verified website, so website wallet reward was not issued.',
        },
      };
    };

    return tx
      ? execute(tx)
      : this.prisma.$transaction(execute, {
          maxWait: 10000,
          timeout: 20000,
        });
  }

  // Referral credit purpose: unlock Stage 2 rewards when the referred user completes the first verified backlink.
  async unlockFirstBacklinkAcceptedStage(
    referredUserId: string,
    providerWebsiteId: string,
    taskId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (db: Prisma.TransactionClient) => {
      const referralRewardsEnabled =
        await this.platformFeatureToggleService.isEnabled(
          PlatformFeatureToggleKeyDtoEnum.REFERRAL_ENGINE_INCENTIVES,
          db,
        );

      const referral = await db.userReferral.findUnique({
        where: {
          referredUserId,
        },
        select: {
          id: true,
          referrerUserId: true,
          referredUserId: true,
          websiteVerifiedAt: true,
        },
      });

      if (!referral) {
        return {
          rewarded: false,
          reason: 'NO_REFERRAL_FOUND',
        };
      }

      if (!referral.websiteVerifiedAt) {
        return {
          rewarded: false,
          reason: 'WEBSITE_VERIFIED_STAGE_REQUIRED',
        };
      }

      const duplicateReward = await db.referralReward.findUnique({
        where: {
          referralId_stage: {
            referralId: referral.id,
            stage: 'FIRST_BACKLINK_ACCEPTED',
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateReward) {
        return {
          rewarded: false,
          reason: 'FIRST_BACKLINK_REWARD_ALREADY_ISSUED',
        };
      }

      await db.userReferral.update({
        where: {
          id: referral.id,
        },
        data: {
          currentStage: 'FIRST_BACKLINK_ACCEPTED',
          firstBacklinkAt: new Date(),
        },
      });

      const taskCredits = referralRewardsEnabled ? 2 : 0;

      await db.referralReward.create({
        data: {
          referralId: referral.id,
          stage: 'FIRST_BACKLINK_ACCEPTED',
          referrerTaskCredits: taskCredits,
          referrerVisibilityCredits: 0,
          referredTaskCredits: taskCredits,
          referredVisibilityCredits: 0,
        },
      });

      if (taskCredits > 0) {
        await this.addReferralTaskCreditToWebsite(db, {
          userId: referral.referredUserId,
          websiteId: providerWebsiteId,
          referralId: referral.id,
          amount: taskCredits,
          reason: 'REFERRAL_FIRST_BACKLINK',
          note: 'Stage 2 referral reward: referred user completed first verified backlink.',
        });

        await this.addReferralTaskCreditToMaster(db, {
          userId: referral.referrerUserId,
          referralId: referral.id,
          taskId,
          amount: taskCredits,
          reason: 'REFERRAL_FIRST_BACKLINK',
          note: 'Stage 2 referral reward: invited user completed first verified backlink.',
        });
      }

      await this.createReferralStageNotifications(db, {
        referralId: referral.id,
        stage: 'FIRST_BACKLINK_ACCEPTED',
        stageLabel: 'First backlink accepted',
        referredUserId: referral.referredUserId,
        referrerUserId: referral.referrerUserId,
        referredWebsiteId: providerWebsiteId,
        referrerWebsiteId: null,
        referredTaskCredits: taskCredits,
        referrerTaskCredits: taskCredits,
        referredVisibilityCredits: 0,
        referrerVisibilityCredits: 0,
        taskId,
        rewardsSuppressed: !referralRewardsEnabled,
      });

      return {
        rewarded: referralRewardsEnabled,
        rewardsSuppressed: !referralRewardsEnabled,
        referralId: referral.id,
        stage: 'FIRST_BACKLINK_ACCEPTED',
        referredUserReward: {
          taskCredits,
          websiteId: providerWebsiteId,
        },
        referrerReward: {
          taskCredits,
          walletScope: 'MASTER_REFERRAL_TASK_CREDITS',
          note: referralRewardsEnabled
            ? 'Referrer can allocate these referral credits to a verified website later.'
            : 'Referral incentives are disabled, so no credit was issued.',
        },
      };
    };

    return tx
      ? execute(tx)
      : this.prisma.$transaction(execute, {
          maxWait: 10000,
          timeout: 20000,
        });
  }

  // Referral credit purpose: unlock Stage 3 rewards when the referred user subscribes to a paid tier.
  async unlockPaidSubscriptionStage(
    referredUserId: string,
    subscriptionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const execute = async (db: Prisma.TransactionClient) => {
      const referralRewardsEnabled =
        await this.platformFeatureToggleService.isEnabled(
          PlatformFeatureToggleKeyDtoEnum.REFERRAL_ENGINE_INCENTIVES,
          db,
        );
      const visibilityRewardsEnabled =
        referralRewardsEnabled &&
        (await this.platformFeatureToggleService.isEnabled(
          PlatformFeatureToggleKeyDtoEnum.VISIBILITY_DISCOVERY_REWARDS,
          db,
        ));

      const referral = await db.userReferral.findUnique({
        where: {
          referredUserId,
        },
        select: {
          id: true,
          referrerUserId: true,
          referredUserId: true,
          referredWebsiteId: true,
          firstBacklinkAt: true,
        },
      });

      if (!referral) {
        return {
          rewarded: false,
          reason: 'NO_REFERRAL_FOUND',
        };
      }

      if (!referral.firstBacklinkAt) {
        return {
          rewarded: false,
          reason: 'FIRST_BACKLINK_STAGE_REQUIRED',
        };
      }

      if (!referral.referredWebsiteId) {
        return {
          rewarded: false,
          reason: 'REFERRED_WEBSITE_REQUIRED',
        };
      }

      const duplicateReward = await db.referralReward.findUnique({
        where: {
          referralId_stage: {
            referralId: referral.id,
            stage: 'PAID_SUBSCRIPTION',
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicateReward) {
        return {
          rewarded: false,
          reason: 'PAID_SUBSCRIPTION_REWARD_ALREADY_ISSUED',
        };
      }

      await db.userReferral.update({
        where: {
          id: referral.id,
        },
        data: {
          currentStage: 'PAID_SUBSCRIPTION',
          subscriptionId,
          paidSubscriptionAt: new Date(),
        },
      });

      const taskCredits = referralRewardsEnabled ? 3 : 0;
      const visibilityCredits = visibilityRewardsEnabled ? 1 : 0;

      await db.referralReward.create({
        data: {
          referralId: referral.id,
          stage: 'PAID_SUBSCRIPTION',
          referrerTaskCredits: taskCredits,
          referrerVisibilityCredits: visibilityCredits,
          referredTaskCredits: taskCredits,
          referredVisibilityCredits: visibilityCredits,
        },
      });

      if (taskCredits > 0) {
        await this.addReferralTaskCreditToWebsite(db, {
          userId: referral.referredUserId,
          websiteId: referral.referredWebsiteId,
          referralId: referral.id,
          amount: taskCredits,
          reason: 'REFERRAL_PAID_SUBSCRIPTION',
          note: 'Stage 3 referral reward: referred user subscribed to a paid tier.',
        });

        await this.addReferralTaskCreditToMaster(db, {
          userId: referral.referrerUserId,
          referralId: referral.id,
          subscriptionId,
          amount: taskCredits,
          reason: 'REFERRAL_PAID_SUBSCRIPTION',
          note: 'Stage 3 referral reward: invited user subscribed to a paid tier.',
        });
      }

      if (visibilityCredits > 0) {
        await this.addReferralVisibilityCreditToWebsite(db, {
          userId: referral.referredUserId,
          websiteId: referral.referredWebsiteId,
          referralId: referral.id,
          amount: visibilityCredits,
          note: 'Stage 3 referral visibility reward: referred user subscribed to a paid tier.',
        });

        await this.addReferralVisibilityCreditToMaster(db, {
          userId: referral.referrerUserId,
          referralId: referral.id,
          subscriptionId,
          amount: visibilityCredits,
          note: 'Stage 3 referral visibility reward: invited user subscribed to a paid tier.',
        });
      }

      await this.createReferralStageNotifications(db, {
        referralId: referral.id,
        stage: 'PAID_SUBSCRIPTION',
        stageLabel: 'Paid subscription',
        referredUserId: referral.referredUserId,
        referrerUserId: referral.referrerUserId,
        referredWebsiteId: referral.referredWebsiteId,
        referrerWebsiteId: null,
        referredTaskCredits: taskCredits,
        referrerTaskCredits: taskCredits,
        referredVisibilityCredits: visibilityCredits,
        referrerVisibilityCredits: visibilityCredits,
        subscriptionId,
        rewardsSuppressed: !referralRewardsEnabled,
        visibilityRewardsSuppressed:
          referralRewardsEnabled && !visibilityRewardsEnabled,
      });

      return {
        rewarded: referralRewardsEnabled,
        rewardsSuppressed: !referralRewardsEnabled,
        visibilityRewardsSuppressed:
          referralRewardsEnabled && !visibilityRewardsEnabled,
        referralId: referral.id,
        stage: 'PAID_SUBSCRIPTION',
        referredUserReward: {
          taskCredits,
          visibilityCredits,
          visibilityDays: visibilityCredits * 7,
          websiteId: referral.referredWebsiteId,
        },
        referrerReward: {
          taskCredits,
          visibilityCredits,
          walletScope: 'MASTER_WALLET',
          note:
            referralRewardsEnabled && visibilityRewardsEnabled
              ? 'Referrer can allocate these referral and visibility credits to a verified website later.'
              : 'One or more platform reward toggles are disabled, so suppressed credits were not issued.',
        },
      };
    };

    return tx
      ? execute(tx)
      : this.prisma.$transaction(execute, {
          maxWait: 10000,
          timeout: 20000,
        });
  }

  // Referral credit purpose: add referral task credits directly to a website wallet and write ledger history.
  private async addReferralTaskCreditToWebsite(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      websiteId: string;
      referralId: string;
      amount: number;
      reason:
        | 'REFERRAL_WEBSITE_VERIFIED'
        | 'REFERRAL_FIRST_BACKLINK'
        | 'REFERRAL_PAID_SUBSCRIPTION';
      note: string;
    },
  ) {
    const masterWallet = await tx.userCreditWallet.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        purchasedTaskCredits: 0,
        referralTaskCredits: 0,
        visibilityCredits: 0,
      },
      update: {},
    });

    const websiteWallet = await tx.websiteCreditWallet.upsert({
      where: {
        websiteId: input.websiteId,
      },
      create: {
        websiteId: input.websiteId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        allocatedPurchasedCredits: 0,
        allocatedReferralCredits: 0,
        visibilityCredits: 0,
      },
      update: {},
    });

    const updatedWebsiteWallet = await tx.websiteCreditWallet.update({
      where: {
        websiteId: input.websiteId,
      },
      data: {
        allocatedReferralCredits: {
          increment: input.amount,
        },
      },
    });

    await tx.creditLog.create({
      data: {
        walletId: masterWallet.id,
        userId: input.userId,
        websiteId: input.websiteId,
        referralId: input.referralId,
        creditType: 'EARNED_TASK',
        action: 'ADD',
        reason: input.reason,
        amount: input.amount,
        balanceBefore: websiteWallet.allocatedReferralCredits,
        balanceAfter: updatedWebsiteWallet.allocatedReferralCredits,
        note: input.note,
      },
    });
  }

  // Referral credit purpose: store referrer rewards in the master referral wallet until the user allocates them to a website.
  private async addReferralTaskCreditToMaster(
    tx: Prisma.TransactionClient,
    input:
      | {
          userId: string;
          referralId: string;
          taskId: string;
          subscriptionId?: never;
          amount: number;
          reason: 'REFERRAL_FIRST_BACKLINK';
          note: string;
        }
      | {
          userId: string;
          referralId: string;
          taskId?: never;
          subscriptionId: string;
          amount: number;
          reason: 'REFERRAL_PAID_SUBSCRIPTION';
          note: string;
        },
  ) {
    const wallet = await tx.userCreditWallet.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        purchasedTaskCredits: 0,
        referralTaskCredits: 0,
        visibilityCredits: 0,
      },
      update: {},
    });

    const updatedWallet = await tx.userCreditWallet.update({
      where: {
        userId: input.userId,
      },
      data: {
        referralTaskCredits: {
          increment: input.amount,
        },
      },
    });

    await tx.creditLog.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        taskId: input.taskId,
        subscriptionId: input.subscriptionId,
        referralId: input.referralId,
        creditType: 'EARNED_TASK',
        action: 'ADD',
        reason: input.reason,
        amount: input.amount,
        balanceBefore: wallet.referralTaskCredits,
        balanceAfter: updatedWallet.referralTaskCredits,
        note: input.note,
      },
    });
  }

  // Referral credit purpose: add visibility credits to the referred user's selected website and extend visibility days.
  private async addReferralVisibilityCreditToWebsite(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      websiteId: string;
      referralId: string;
      amount: number;
      note: string;
    },
  ) {
    const masterWallet = await tx.userCreditWallet.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        purchasedTaskCredits: 0,
        referralTaskCredits: 0,
        visibilityCredits: 0,
      },
      update: {},
    });

    const websiteWallet = await tx.websiteCreditWallet.upsert({
      where: {
        websiteId: input.websiteId,
      },
      create: {
        websiteId: input.websiteId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        allocatedPurchasedCredits: 0,
        allocatedReferralCredits: 0,
        visibilityCredits: 0,
      },
      update: {},
    });

    const visibilityDays = input.amount * 7;
    const now = new Date();
    const activeFrom =
      websiteWallet.visibilityActiveUntil &&
      websiteWallet.visibilityActiveUntil > now
        ? websiteWallet.visibilityActiveUntil
        : now;
    const nextVisibilityActiveUntil = new Date(activeFrom);
    nextVisibilityActiveUntil.setDate(
      nextVisibilityActiveUntil.getDate() + visibilityDays,
    );

    const updatedWebsiteWallet = await tx.websiteCreditWallet.update({
      where: {
        websiteId: input.websiteId,
      },
      data: {
        visibilityCredits: {
          increment: input.amount,
        },
        visibilityActiveUntil: nextVisibilityActiveUntil,
      },
    });

    await tx.creditLog.create({
      data: {
        walletId: masterWallet.id,
        userId: input.userId,
        websiteId: input.websiteId,
        referralId: input.referralId,
        creditType: 'VISIBILITY',
        action: 'ADD',
        reason: 'REFERRAL_PAID_SUBSCRIPTION',
        amount: input.amount,
        balanceBefore: websiteWallet.visibilityCredits,
        balanceAfter: updatedWebsiteWallet.visibilityCredits,
        note: `${input.note} Visibility extended by ${visibilityDays} days.`,
      },
    });
  }

  // Referral credit purpose: store referrer visibility rewards in master wallet until allocated to a website.
  private async addReferralVisibilityCreditToMaster(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      referralId: string;
      subscriptionId: string;
      amount: number;
      note: string;
    },
  ) {
    const wallet = await tx.userCreditWallet.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        purchasedTaskCredits: 0,
        referralTaskCredits: 0,
        visibilityCredits: 0,
      },
      update: {},
    });

    const updatedWallet = await tx.userCreditWallet.update({
      where: {
        userId: input.userId,
      },
      data: {
        visibilityCredits: {
          increment: input.amount,
        },
      },
    });

    await tx.creditLog.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        referralId: input.referralId,
        creditType: 'VISIBILITY',
        action: 'ADD',
        reason: 'REFERRAL_PAID_SUBSCRIPTION',
        amount: input.amount,
        balanceBefore: wallet.visibilityCredits,
        balanceAfter: updatedWallet.visibilityCredits,
        note: input.note,
      },
    });
  }

  async getReferralSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        isReferralEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const progress = await this.getReferralProgress(userId);
    const totalReferrals = progress.length;
    const earnedTaskCredits = progress.reduce(
      (sum, referral) => sum + referral.totalTaskCreditsEarned,
      0,
    );
    const earnedVisibilityCredits = progress.reduce(
      (sum, referral) => sum + referral.totalVisibilityCreditsEarned,
      0,
    );
    const convertedReferrals = progress.filter(
      (referral) => referral.stage3.completed,
    ).length;
    const conversionRate = totalReferrals
      ? Math.round((convertedReferrals / totalReferrals) * 100)
      : 0;
    const clientUrl =
      this.configService.get<string>('CLIENT_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'https://backlyst.com';
    const referralLink =
      user.isReferralEnabled && user.referralCode
        ? `${clientUrl.replace(/\/$/, '')}/ref/${user.referralCode}`
        : null;

    return {
      referralCode: user.referralCode,
      referralLink,
      isReferralEnabled: user.isReferralEnabled,
      totalReferrals,
      earnedTaskCredits,
      earnedVisibilityCredits,
      earnedCredits: earnedTaskCredits + earnedVisibilityCredits,
      convertedReferrals,
      conversionRate,
    };
  }

  async getReferralProgress(userId: string) {
    const referrals = await this.prisma.userReferral.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        referredWebsite: {
          select: {
            id: true,
            name: true,
            websiteUrl: true,
          },
        },
        rewards: {
          orderBy: { createdAt: 'asc' },
          select: {
            stage: true,
            referrerTaskCredits: true,
            referrerVisibilityCredits: true,
            createdAt: true,
          },
        },
      },
    });

    return referrals.map((referral) => {
      const rewardByStage = new Map(
        referral.rewards.map((reward) => [reward.stage, reward]),
      );

      // Shape each stage explicitly so the API is easy for the frontend to render.
      const stage1 = rewardByStage.get('WEBSITE_VERIFIED');
      const stage2 = rewardByStage.get('FIRST_BACKLINK_ACCEPTED');
      const stage3 = rewardByStage.get('PAID_SUBSCRIPTION');

      const totalTaskCreditsEarned = referral.rewards.reduce(
        (sum, reward) => sum + reward.referrerTaskCredits,
        0,
      );
      const totalVisibilityCreditsEarned = referral.rewards.reduce(
        (sum, reward) => sum + reward.referrerVisibilityCredits,
        0,
      );

      return {
        referralId: referral.id,
        codeUsed: referral.codeUsed,
        currentStage: referral.currentStage,
        referredUser: referral.referredUser,
        referredWebsite: referral.referredWebsite,
        signedUpAt: referral.signedUpAt,
        websiteVerifiedAt: referral.websiteVerifiedAt,
        firstBacklinkAt: referral.firstBacklinkAt,
        paidSubscriptionAt: referral.paidSubscriptionAt,
        // Stage blocks let the client show progress row-wise without extra logic.
        stage1: {
          completed: Boolean(stage1),
          taskCreditsEarned: stage1?.referrerTaskCredits ?? 0,
          visibilityCreditsEarned: stage1?.referrerVisibilityCredits ?? 0,
          rewardedAt: stage1?.createdAt ?? null,
        },
        stage2: {
          completed: Boolean(stage2),
          taskCreditsEarned: stage2?.referrerTaskCredits ?? 0,
          visibilityCreditsEarned: stage2?.referrerVisibilityCredits ?? 0,
          rewardedAt: stage2?.createdAt ?? null,
        },
        stage3: {
          completed: Boolean(stage3),
          taskCreditsEarned: stage3?.referrerTaskCredits ?? 0,
          visibilityCreditsEarned: stage3?.referrerVisibilityCredits ?? 0,
          rewardedAt: stage3?.createdAt ?? null,
        },
        totalTaskCreditsEarned,
        totalVisibilityCreditsEarned,
      };
    });
  }

  private async createReferralStageNotifications(
    db: Prisma.TransactionClient,
    input: {
      referralId: string;
      stage: 'WEBSITE_VERIFIED' | 'FIRST_BACKLINK_ACCEPTED' | 'PAID_SUBSCRIPTION';
      stageLabel: string;
      referredUserId: string;
      referrerUserId: string;
      referredWebsiteId: string | null;
      referrerWebsiteId: string | null;
      referredTaskCredits: number;
      referrerTaskCredits: number;
      referredVisibilityCredits: number;
      referrerVisibilityCredits: number;
      taskId?: string;
      subscriptionId?: string;
      rewardsSuppressed: boolean;
      visibilityRewardsSuppressed?: boolean;
    },
  ) {
    // Referral notification purpose: notify the invited user when their own
    // referral milestone unlocks and any stage reward is added.
    await createReferralNotificationIfAllowed(db, {
      recipientId: input.referredUserId,
      referralId: input.referralId,
      type: this.resolveReferralNotificationType(
        input.referredTaskCredits,
        input.referredVisibilityCredits,
      ),
      title: this.resolveReferralNotificationTitle(
        input.stageLabel,
        input.referredTaskCredits,
        input.referredVisibilityCredits,
      ),
      body: this.resolveReferralNotificationBody({
        audience: 'REFERRED_USER',
        stageLabel: input.stageLabel,
        taskCredits: input.referredTaskCredits,
        visibilityCredits: input.referredVisibilityCredits,
        rewardsSuppressed: input.rewardsSuppressed,
        visibilityRewardsSuppressed: input.visibilityRewardsSuppressed ?? false,
      }),
      idempotencyKey: `referral-stage-${input.stage}-${input.referralId}-${input.referredUserId}`,
      data: {
        stage: input.stage,
        taskCredits: input.referredTaskCredits,
        visibilityCredits: input.referredVisibilityCredits,
        visibilityDays: input.referredVisibilityCredits * 7,
        walletScope: input.referredWebsiteId ? 'WEBSITE_WALLET' : null,
        websiteId: input.referredWebsiteId,
        taskId: input.taskId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        rewardsSuppressed: input.rewardsSuppressed,
        visibilityRewardsSuppressed: input.visibilityRewardsSuppressed ?? false,
      },
    });

    // Referral notification purpose: notify the referrer when a referred user
    // advances and any referrer-side reward is added.
    await createReferralNotificationIfAllowed(db, {
      recipientId: input.referrerUserId,
      actorId: input.referredUserId,
      referralId: input.referralId,
      type: this.resolveReferralNotificationType(
        input.referrerTaskCredits,
        input.referrerVisibilityCredits,
      ),
      title: this.resolveReferralNotificationTitle(
        input.stageLabel,
        input.referrerTaskCredits,
        input.referrerVisibilityCredits,
      ),
      body: this.resolveReferralNotificationBody({
        audience: 'REFERRER',
        stageLabel: input.stageLabel,
        taskCredits: input.referrerTaskCredits,
        visibilityCredits: input.referrerVisibilityCredits,
        rewardsSuppressed: input.rewardsSuppressed,
        visibilityRewardsSuppressed: input.visibilityRewardsSuppressed ?? false,
      }),
      idempotencyKey: `referral-stage-${input.stage}-${input.referralId}-${input.referrerUserId}`,
      data: {
        stage: input.stage,
        taskCredits: input.referrerTaskCredits,
        visibilityCredits: input.referrerVisibilityCredits,
        visibilityDays: input.referrerVisibilityCredits * 7,
        walletScope: input.referrerWebsiteId
          ? 'WEBSITE_WALLET'
          : 'MASTER_WALLET',
        websiteId: input.referrerWebsiteId,
        taskId: input.taskId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        referredUserId: input.referredUserId,
        rewardsSuppressed: input.rewardsSuppressed,
        visibilityRewardsSuppressed: input.visibilityRewardsSuppressed ?? false,
      },
    });
  }

  private resolveReferralNotificationType(
    taskCredits: number,
    visibilityCredits: number,
  ) {
    return taskCredits > 0 || visibilityCredits > 0
      ? NotificationType.REWARD_EARNED
      : NotificationType.SYSTEM_ANNOUNCEMENT;
  }

  private resolveReferralNotificationTitle(
    stageLabel: string,
    taskCredits: number,
    visibilityCredits: number,
  ) {
    return taskCredits > 0 || visibilityCredits > 0
      ? 'Referral reward unlocked'
      : `Referral milestone reached: ${stageLabel}`;
  }

  private resolveReferralNotificationBody(input: {
    audience: 'REFERRED_USER' | 'REFERRER';
    stageLabel: string;
    taskCredits: number;
    visibilityCredits: number;
    rewardsSuppressed: boolean;
    visibilityRewardsSuppressed: boolean;
  }) {
    const ownerText =
      input.audience === 'REFERRER'
        ? 'Your referred user'
        : 'Your referral progress';

    if (input.taskCredits > 0 || input.visibilityCredits > 0) {
      const rewards = [
        input.taskCredits > 0
          ? `${input.taskCredits} task credit${input.taskCredits === 1 ? '' : 's'}`
          : null,
        input.visibilityCredits > 0
          ? `${input.visibilityCredits} visibility credit${input.visibilityCredits === 1 ? '' : 's'}`
          : null,
      ].filter(Boolean);

      return `${ownerText} reached ${input.stageLabel}. Reward added: ${rewards.join(' and ')}.`;
    }

    if (input.rewardsSuppressed) {
      return `${ownerText} reached ${input.stageLabel}, but referral rewards are currently disabled.`;
    }

    if (input.visibilityRewardsSuppressed) {
      return `${ownerText} reached ${input.stageLabel}, but visibility rewards are currently disabled.`;
    }

    return `${ownerText} reached ${input.stageLabel}.`;
  }
}
