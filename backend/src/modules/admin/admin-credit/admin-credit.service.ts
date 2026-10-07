import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  AddAdminCreditDto,
  RemoveAdminCreditDto,
  UpdateWebsiteWalletLockDto,
} from './dto/admin-credit.dto';
import { AdminWebsiteDetailsQueryDto } from './dto/admin-website-details-query.dto';

type LockedWebsiteWallet = {
  id: string;
  earnedTaskCredits: number;
  visibilityCredits: number;
  visibilityActiveUntil: Date | null;
};

@Injectable()
export class AdminCreditService {
  constructor(private readonly prisma: PrismaService) {}

  async addTaskCredits(
    adminId: string,
    websiteId: string,
    body: AddAdminCreditDto,
  ) {
    // Step 1: prevent the same admin request from adding credits twice.
    const existing = await this.findExistingAdjustment(
      body.idempotencyKey,
      adminId,
      websiteId,
      'TASK_CREDIT',
      'ADD',
      body.amount,
    );

    // Step 2: return the original result when this exact request was processed before.
    if (existing) {
      return sendResponse('Task credit adjustment already processed', {
        websiteId,
        amount: existing.amount,
        balanceBefore: existing.creditLog.balanceBefore,
        balanceAfter: existing.creditLog.balanceAfter,
        alreadyProcessed: true,
      });
    }

    // Step 3: ensure the target website exists and its wallet is not locked.
    const website = await this.getAdjustableWebsite(websiteId);

    // Step 4: update the balance and both audit records atomically.
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 5: ensure the owner master wallet exists and lock the website wallet row.
      const masterWallet = await this.getOrCreateMasterWallet(
        tx,
        website.authorId,
      );
      const wallet = await this.getLockedWebsiteWallet(tx, websiteId);
      const balanceBefore = wallet.earnedTaskCredits;
      const balanceAfter = balanceBefore + body.amount;

      // Step 6: add the manual task credits to the website earned-credit bucket.
      await tx.websiteCreditWallet.update({
        where: { websiteId },
        data: {
          earnedTaskCredits: balanceAfter,
        },
      });

      // Step 7: record the authoritative financial movement in the credit ledger.
      const creditLog = await tx.creditLog.create({
        data: {
          walletId: masterWallet.id,
          userId: website.authorId,
          actorId: adminId,
          websiteId,
          creditType: 'EARNED_TASK',
          action: 'ADD',
          reason: 'MANUAL',
          amount: body.amount,
          balanceBefore,
          balanceAfter,
          note: `[ADMIN_TASK_CREDIT][${body.idempotencyKey}] ${body.reason}`,
        },
      });

      // Step 8: record who performed the admin adjustment and why.
      const adjustment = await tx.adminCreditAdjustment.create({
        data: {
          adminId,
          websiteId,
          creditLogId: creditLog.id,
          type: 'TASK_CREDIT',
          action: 'ADD',
          amount: body.amount,
          reason: body.reason,
          idempotencyKey: body.idempotencyKey,
        },
      });

      return {
        adjustmentId: adjustment.id,
        creditLogId: creditLog.id,
        websiteId,
        amount: body.amount,
        balanceBefore,
        balanceAfter,
        alreadyProcessed: false,
      };
    });

    // Step 9: return the completed adjustment with before/after balances.
    return sendResponse('Task credits added successfully', result);
  }

  async addVisibilityCredits(
    adminId: string,
    websiteId: string,
    body: AddAdminCreditDto,
  ) {
    // Step 1: prevent the same admin request from adding visibility twice.
    const existing = await this.findExistingAdjustment(
      body.idempotencyKey,
      adminId,
      websiteId,
      'VISIBILITY_CREDIT',
      'ADD',
      body.amount,
    );

    // Step 2: return the original result when this exact request was processed before.
    if (existing) {
      return sendResponse('Visibility credit adjustment already processed', {
        websiteId,
        amount: existing.amount,
        balanceBefore: existing.creditLog.balanceBefore,
        balanceAfter: existing.creditLog.balanceAfter,
        visibilityDays: existing.visibilityDays,
        alreadyProcessed: true,
      });
    }

    // Step 3: ensure the target website exists and its wallet is not locked.
    const website = await this.getAdjustableWebsite(websiteId);

    // Step 4: update visibility and both audit records atomically.
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 5: ensure the owner master wallet exists and lock the website wallet row.
      const masterWallet = await this.getOrCreateMasterWallet(
        tx,
        website.authorId,
      );
      const wallet = await this.getLockedWebsiteWallet(tx, websiteId);

      // Step 6: stack 7 days per credit on the remaining visibility period.
      const now = new Date();
      const baseDate =
        wallet.visibilityActiveUntil && wallet.visibilityActiveUntil > now
          ? wallet.visibilityActiveUntil
          : now;
      const visibilityDays = body.amount * 7;
      const visibilityActiveUntil = new Date(
        baseDate.getTime() + visibilityDays * 24 * 60 * 60 * 1000,
      );
      const balanceBefore = wallet.visibilityCredits;
      const balanceAfter = balanceBefore + body.amount;

      // Step 7: update both the visibility credit count and active-until date.
      await tx.websiteCreditWallet.update({
        where: { websiteId },
        data: {
          visibilityCredits: balanceAfter,
          visibilityActiveUntil,
        },
      });

      // Step 8: record the authoritative financial movement in the credit ledger.
      const creditLog = await tx.creditLog.create({
        data: {
          walletId: masterWallet.id,
          userId: website.authorId,
          actorId: adminId,
          websiteId,
          creditType: 'VISIBILITY',
          action: 'ADD',
          reason: 'MANUAL',
          amount: body.amount,
          balanceBefore,
          balanceAfter,
          note: `[ADMIN_VISIBILITY_CREDIT][${body.idempotencyKey}] ${body.reason}`,
        },
      });

      // Step 9: record the admin actor, reason, amount, and granted visibility days.
      const adjustment = await tx.adminCreditAdjustment.create({
        data: {
          adminId,
          websiteId,
          creditLogId: creditLog.id,
          type: 'VISIBILITY_CREDIT',
          action: 'ADD',
          amount: body.amount,
          visibilityDays,
          reason: body.reason,
          idempotencyKey: body.idempotencyKey,
        },
      });

      return {
        adjustmentId: adjustment.id,
        creditLogId: creditLog.id,
        websiteId,
        amount: body.amount,
        balanceBefore,
        balanceAfter,
        visibilityDays,
        visibilityActiveUntil,
        alreadyProcessed: false,
      };
    });

    // Step 10: return the updated balance and visibility expiry.
    return sendResponse('Visibility credits added successfully', result);
  }

  async getGovernanceSummary() {
    const [
      masterWalletTotals,
      websiteWalletTotals,
      spentCredits,
      refundedCredits,
    ] = await Promise.all([
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

      // Count only actual task spending, not master-to-website allocation.
      this.prisma.creditLog.aggregate({
        where: {
          action: 'SPEND',
          reason: 'TASK_POST',
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.creditLog.aggregate({
        where: {
          action: 'REFUND',
          reason: 'TASK_POST',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const master = masterWalletTotals._sum;
    const website = websiteWalletTotals._sum;

    const subscriptionPoolCredits =
      (master.subscriptionTaskCredits ?? 0) +
      (website.subscriptionTaskCredits ?? 0);

    const referralCredits =
      (master.referralTaskCredits ?? 0) +
      (website.allocatedReferralCredits ?? 0);

    const visibilityPoolCredits =
      (master.visibilityCredits ?? 0) + (website.visibilityCredits ?? 0);

    const earnedCredits =
      (master.earnedTaskCredits ?? 0) + (website.earnedTaskCredits ?? 0);

    const purchasedCredits =
      (master.purchasedTaskCredits ?? 0) +
      (website.allocatedPurchasedCredits ?? 0);

    const used = Math.max(
      (spentCredits._sum.amount ?? 0) - (refundedCredits._sum.amount ?? 0),
      0,
    );

    // Visibility is excluded because it cannot be spent on tasks.
    const available =
      subscriptionPoolCredits +
      referralCredits +
      earnedCredits +
      purchasedCredits;

    return sendResponse('Credit governance summary fetched successfully', {
      subscriptionPoolCredits: this.formatGovernanceCredit(
        subscriptionPoolCredits,
      ),
      referralCredits: this.formatGovernanceCredit(referralCredits),
      visibilityPoolCredits: this.formatGovernanceCredit(visibilityPoolCredits),
      earnedCredits: this.formatGovernanceCredit(earnedCredits),
      creditUsage: {
        used: this.formatGovernanceCredit(used, true),
        available: this.formatGovernanceCredit(available, true),
      },
    });
  }

  async removeTaskCredits(
    adminId: string,
    websiteId: string,
    body: RemoveAdminCreditDto,
  ) {
    const existing = await this.findExistingAdjustment(
      body.idempotencyKey,
      adminId,
      websiteId,
      'TASK_CREDIT',
      'DEDUCT',
      body.amount,
    );

    if (existing) {
      return sendResponse('Task credit removal already processed', {
        websiteId,
        amount: existing.amount,
        balanceBefore: existing.creditLog.balanceBefore,
        balanceAfter: existing.creditLog.balanceAfter,
        alreadyProcessed: true,
      });
    }

    const website = await this.getWebsiteForAdmin(websiteId);

    const result = await this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getOrCreateMasterWallet(
        tx,
        website.authorId,
      );
      const wallet = await this.getLockedWebsiteWallet(tx, websiteId);

      if (wallet.earnedTaskCredits < body.amount) {
        throw new BadRequestException(
          'Website does not have enough earned task credits',
        );
      }

      const balanceBefore = wallet.earnedTaskCredits;
      const balanceAfter = balanceBefore - body.amount;

      await tx.websiteCreditWallet.update({
        where: { websiteId },
        data: { earnedTaskCredits: balanceAfter },
      });

      const creditLog = await tx.creditLog.create({
        data: {
          walletId: masterWallet.id,
          userId: website.authorId,
          actorId: adminId,
          websiteId,
          creditType: 'EARNED_TASK',
          action: 'SPEND',
          reason: 'MANUAL',
          amount: body.amount,
          balanceBefore,
          balanceAfter,
          note: `[ADMIN_TASK_CREDIT_DEDUCT][${body.idempotencyKey}] ${body.reason}`,
        },
      });

      const adjustment = await tx.adminCreditAdjustment.create({
        data: {
          adminId,
          websiteId,
          creditLogId: creditLog.id,
          type: 'TASK_CREDIT',
          action: 'DEDUCT',
          amount: body.amount,
          reason: body.reason,
          idempotencyKey: body.idempotencyKey,
        },
      });

      return {
        adjustmentId: adjustment.id,
        creditLogId: creditLog.id,
        websiteId,
        amount: body.amount,
        balanceBefore,
        balanceAfter,
        alreadyProcessed: false,
      };
    });

    return sendResponse('Task credits removed successfully', result);
  }

  async updateWalletLock(
    adminId: string,
    websiteId: string,
    body: UpdateWebsiteWalletLockDto,
  ) {
    const website = await this.getWebsiteForAdmin(websiteId);

    if (website.isWalletLock === body.locked) {
      return sendResponse(
        body.locked
          ? 'Website wallet is already locked'
          : 'Website wallet is already unlocked',
        {
          websiteId,
          locked: body.locked,
          changed: false,
        },
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.website.update({
        where: { id: websiteId },
        data: { isWalletLock: body.locked },
      });

      const audit = await tx.websiteWalletLockAudit.create({
        data: {
          adminId,
          websiteId,
          locked: body.locked,
          reason: body.reason,
        },
      });

      return {
        websiteId,
        locked: body.locked,
        changed: true,
        reason: body.reason,
        auditId: audit.id,
        updatedAt: audit.createdAt,
      };
    });

    return sendResponse(
      body.locked
        ? 'Website wallet locked successfully'
        : 'Website wallet unlocked successfully',
      result,
    );
  }

  async getWebsiteDetails(
    websiteId: string,
    query: AdminWebsiteDetailsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        authorId: true,
        verificationStatus: true,
        isWalletLock: true,
        creditWallet: {
          select: {
            subscriptionTaskCredits: true,
            earnedTaskCredits: true,
            allocatedPurchasedCredits: true,
            allocatedReferralCredits: true,
            visibilityCredits: true,
            visibilityActiveUntil: true,
          },
        },
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    const terminalTaskStatuses = ['COMPLETED', 'CANCELLED', 'EXPIRED'] as const;

    const [subscription, creditOnHoldResult, transactions, totalTransactions] =
      await Promise.all([
        this.prisma.subscription.findFirst({
          where: {
            userId: website.authorId,
            status: 'ACTIVE',
          },
          orderBy: {
            startDate: 'desc',
          },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            autoRenew: true,
            plan: {
              select: {
                id: true,
                name: true,
                tier: true,
                price: true,
                billingInterval: true,
              },
            },
          },
        }),

        this.prisma.placementTask.aggregate({
          where: {
            requesterWebsiteId: websiteId,
            lifecycleStatus: {
              notIn: [...terminalTaskStatuses],
            },
          },
          _sum: {
            reservedCreditAmount: true,
          },
        }),

        this.prisma.creditLog.findMany({
          where: {
            websiteId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            creditType: true,
            action: true,
            reason: true,
            amount: true,
            balanceBefore: true,
            balanceAfter: true,
            taskId: true,
            referralId: true,
            subscriptionId: true,
            note: true,
            createdAt: true,
          },
        }),

        this.prisma.creditLog.count({
          where: {
            websiteId,
          },
        }),
      ]);

    const wallet = website.creditWallet;

    return sendResponse('Website details fetched successfully', {
      website: {
        id: website.id,
        name: website.name,
        url: website.websiteUrl,
        verificationStatus: website.verificationStatus,
      },

      wallet: {
        subscriptionCredits: wallet?.subscriptionTaskCredits ?? 0,
        earnedCredits: wallet?.earnedTaskCredits ?? 0,
        purchasedCredits: wallet?.allocatedPurchasedCredits ?? 0,
        referralCredits: wallet?.allocatedReferralCredits ?? 0,
        visibilityCredits: wallet?.visibilityCredits ?? 0,
        visibilityActiveUntil: wallet?.visibilityActiveUntil ?? null,
        creditOnHold: creditOnHoldResult._sum.reservedCreditAmount ?? 0,
        status: website.isWalletLock ? 'LOCKED' : 'ACTIVE',
      },

      subscription: subscription
        ? {
            id: subscription.id,
            tier: subscription.plan.tier,
            name: subscription.plan.name,
            cost: Number(subscription.plan.price),
            billingInterval: subscription.plan.billingInterval,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: subscription.autoRenew,
          }
        : null,

      transactions: transactions.map((transaction) => ({
        ...transaction,
        signedAmount:
          transaction.action === 'SPEND' || transaction.action === 'EXPIRE'
            ? -transaction.amount
            : transaction.amount,
      })),

      pagination: {
        page,
        limit,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
      },
    });
  }

  private async getAdjustableWebsite(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
        isWalletLock: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    if (website.isWalletLock) {
      throw new BadRequestException('Website wallet is locked');
    }

    return website;
  }

  private async findExistingAdjustment(
    idempotencyKey: string,
    adminId: string,
    websiteId: string,
    type: 'TASK_CREDIT' | 'VISIBILITY_CREDIT',
    action: 'ADD' | 'DEDUCT',
    amount: number,
  ) {
    const existing = await this.prisma.adminCreditAdjustment.findUnique({
      where: { idempotencyKey },
      include: {
        creditLog: {
          select: {
            balanceBefore: true,
            balanceAfter: true,
          },
        },
      },
    });

    if (
      existing &&
      (existing.adminId !== adminId ||
        existing.websiteId !== websiteId ||
        existing.type !== type ||
        existing.action !== action ||
        existing.amount !== amount)
    ) {
      throw new ConflictException(
        'idempotencyKey was already used for another adjustment',
      );
    }

    return existing;
  }

  private async getOrCreateMasterWallet(
    tx: Prisma.TransactionClient,
    userId: string,
  ) {
    return tx.userCreditWallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
  }

  private async getLockedWebsiteWallet(
    tx: Prisma.TransactionClient,
    websiteId: string,
  ) {
    await tx.websiteCreditWallet.upsert({
      where: { websiteId },
      update: {},
      create: { websiteId },
    });

    const rows = await tx.$queryRaw<LockedWebsiteWallet[]>(Prisma.sql`
      SELECT
        "id",
        "earnedTaskCredits",
        "visibilityCredits",
        "visibilityActiveUntil"
      FROM "WebsiteCreditWallet"
      WHERE "websiteId" = ${websiteId}
      FOR UPDATE
    `);

    const wallet = rows[0];
    if (!wallet) {
      throw new NotFoundException('Website wallet not found');
    }

    return wallet;
  }

  private formatGovernanceCredit(value: number, includeUnit = false) {
    let displayValue: string;

    if (value >= 1_000_000) {
      displayValue = `${Number((value / 1_000_000).toFixed(2))}M`;
    } else if (value >= 1_000) {
      displayValue = `${Number((value / 1_000).toFixed(2))}K`;
    } else {
      displayValue = String(value);
    }

    return {
      value,
      displayValue: includeUnit ? `${displayValue} CR` : displayValue,
    };
  }

  private async getWebsiteForAdmin(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
        isWalletLock: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    return website;
  }
}
