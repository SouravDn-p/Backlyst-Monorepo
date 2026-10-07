import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';

@Injectable()
export class AdminCreditService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [masterAggregate, websiteAggregate] = await Promise.all([
      this.prisma.userCreditWallet.aggregate({
        _sum: {
          subscriptionTaskCredits: true,
          earnedTaskCredits: true,
          purchasedTaskCredits: true,
          referralTaskCredits: true,
          visibilityCredits: true,
        },
      }),
      this.prisma.websiteCreditWallet.aggregate({
        _sum: {
          subscriptionTaskCredits: true,
          earnedTaskCredits: true,
          allocatedPurchasedCredits: true,
          allocatedReferralCredits: true,
          visibilityCredits: true,
        },
      }),
    ]);

    const master = masterAggregate._sum;
    const websites = websiteAggregate._sum;
    const subscriptionCredits =
      (master.subscriptionTaskCredits ?? 0) +
      (websites.subscriptionTaskCredits ?? 0);
    const referralEarnedCredits =
      (master.referralTaskCredits ?? 0) +
      (master.earnedTaskCredits ?? 0) +
      (websites.allocatedReferralCredits ?? 0) +
      (websites.earnedTaskCredits ?? 0);
    const visibilityCredits =
      (master.visibilityCredits ?? 0) + (websites.visibilityCredits ?? 0);

    return sendResponse('Admin credit overview retrieved successfully.', {
      creditSimulation: {
        subscriptions: {
          value: subscriptionCredits,
          displayValue: this.formatCompactCredit(subscriptionCredits),
        },
        referralEarned: {
          value: referralEarnedCredits,
          displayValue: this.formatCompactCredit(referralEarnedCredits),
        },
        visibility: {
          value: visibilityCredits,
          displayValue: this.formatCompactCredit(visibilityCredits),
        },
      },
    });
  }

  private formatCompactCredit(value: number) {
    if (value < 1000) {
      return `${value}`;
    }

    const compact = value / 1000;
    const formatted =
      compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1);

    return `${formatted}k`;
  }

  async getUserWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found.');
    }

    const wallet = await this.getOrCreateUserWallet(this.prisma, userId);
    const recentLedger = await this.prisma.creditLog.findMany({
      where: { userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: this.ledgerSelect(),
    });

    return sendResponse('Admin user credit wallet retrieved successfully.', {
      user,
      balances: {
        subscriptionTaskCredits: wallet.subscriptionTaskCredits,
        earnedTaskCredits: wallet.earnedTaskCredits,
        purchasedTaskCredits: wallet.purchasedTaskCredits,
        referralTaskCredits: wallet.referralTaskCredits,
        visibilityCredits: wallet.visibilityCredits,
        totalTaskCredits:
          wallet.subscriptionTaskCredits +
          wallet.earnedTaskCredits +
          wallet.purchasedTaskCredits +
          wallet.referralTaskCredits,
      },
      recentLedger: recentLedger.map((item) => this.serializeLedgerItem(item)),
    });
  }

  async getWebsiteWallet(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        verificationStatus: true,
        isDeleted: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found.');
    }

    const wallet = await this.getOrCreateWebsiteWallet(this.prisma, websiteId);
    const recentLedger = await this.prisma.creditLog.findMany({
      where: { websiteId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: this.ledgerSelect(),
    });

    return sendResponse('Admin website credit wallet retrieved successfully.', {
      website,
      balances: {
        subscriptionTaskCredits: wallet.subscriptionTaskCredits,
        earnedTaskCredits: wallet.earnedTaskCredits,
        allocatedPurchasedCredits: wallet.allocatedPurchasedCredits,
        allocatedReferralCredits: wallet.allocatedReferralCredits,
        visibilityCredits: wallet.visibilityCredits,
        totalTaskCredits:
          wallet.subscriptionTaskCredits +
          wallet.earnedTaskCredits +
          wallet.allocatedPurchasedCredits +
          wallet.allocatedReferralCredits,
      },
      recentLedger: recentLedger.map((item) => this.serializeLedgerItem(item)),
    });
  }

  private ledgerSelect() {
    return {
      id: true,
      walletId: true,
      userId: true,
      creditType: true,
      action: true,
      reason: true,
      amount: true,
      balanceBefore: true,
      balanceAfter: true,
      websiteId: true,
      taskId: true,
      referralId: true,
      subscriptionId: true,
      subscriptionCreditBatchId: true,
      note: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
      website: {
        select: {
          id: true,
          name: true,
          websiteUrl: true,
          verificationStatus: true,
        },
      },
    } satisfies Prisma.CreditLogSelect;
  }

  private serializeLedgerItem<T extends { note: string | null }>(item: T) {
    return {
      ...item,
      sourceBucket: this.resolveLogicalSourceBucket(item.note),
    };
  }

  private resolveLogicalSourceBucket(note: string | null) {
    if (note?.includes('PURCHASED')) return 'PURCHASED';
    if (note?.includes('REFERRAL')) return 'REFERRAL';
    if (note?.includes('SUBSCRIPTION')) return 'SUBSCRIPTION';
    if (note?.includes('VISIBILITY')) return 'VISIBILITY';
    return null;
  }

  private async getOrCreateUserWallet(
    db: PrismaService | Prisma.TransactionClient,
    userId: string,
  ) {
    return db.userCreditWallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        purchasedTaskCredits: 0,
        referralTaskCredits: 0,
        visibilityCredits: 0,
      },
    });
  }

  private async getOrCreateWebsiteWallet(
    db: PrismaService | Prisma.TransactionClient,
    websiteId: string,
  ) {
    return db.websiteCreditWallet.upsert({
      where: { websiteId },
      update: {},
      create: {
        websiteId,
        subscriptionTaskCredits: 0,
        earnedTaskCredits: 0,
        allocatedPurchasedCredits: 0,
        allocatedReferralCredits: 0,
        visibilityCredits: 0,
      },
    });
  }
}
