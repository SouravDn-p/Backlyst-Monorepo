import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { NotificationType, Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');
import { PrismaService } from 'src/prisma/prisma.service';
import { CreditStatementQueryDto } from './dto/credit-statement-query.dto';
import {
  AllocateVisibilityCreditsDto,
  AllocatePurchasedCreditsDto,
  AllocateReferralCreditsDto,
  AllocateSubscriptionCreditsDto,
  BuyPurchasedCreditsDto,
  BuyVisibilityCreditsDto,
} from './dto/credit-wallet.dto';
import { createCreditNotificationIfAllowed } from './utils/credit-notification.util';

type RawDbClient = PrismaService | Prisma.TransactionClient;

type RawMasterWalletRow = {
  id: string;
  userId: string;
  subscriptionTaskCredits: number;
  earnedTaskCredits: number;
  purchasedTaskCredits: number;
  referralTaskCredits: number;
  visibilityCredits: number;
  createdAt: Date;
  updatedAt: Date;
};

type RawCreditLogRow = {
  id: string;
  walletId: string;
  userId: string;
  creditType: string;
  action: string;
  reason: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  websiteId: string | null;
  taskId: string | null;
  referralId: string | null;
  subscriptionId: string | null;
  note: string | null;
  createdAt: Date;
};

type RawWebsiteWalletRow = {
  id: string;
  websiteId: string;
  subscriptionTaskCredits: number;
  earnedTaskCredits: number;
  allocatedPurchasedCredits: number;
  allocatedReferralCredits: number;
  visibilityCredits: number;
  visibilityActiveUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MasterWalletBalanceColumn =
  | 'subscriptionTaskCredits'
  | 'purchasedTaskCredits'
  | 'referralTaskCredits'
  | 'visibilityCredits';

type WebsiteWalletBalanceColumn =
  | 'subscriptionTaskCredits'
  | 'earnedTaskCredits'
  | 'allocatedPurchasedCredits'
  | 'allocatedReferralCredits'
  | 'visibilityCredits';

const MASTER_PURCHASED_NOTE = '[MASTER_PURCHASED]';
const MASTER_REFERRAL_NOTE = '[MASTER_REFERRAL]';
const WEBSITE_PURCHASED_IN_NOTE = '[WEBSITE_PURCHASED_IN]';
const WEBSITE_PURCHASED_OUT_NOTE = '[WEBSITE_PURCHASED_OUT]';
const WEBSITE_REFERRAL_IN_NOTE = '[WEBSITE_REFERRAL_IN]';
const MASTER_SUBSCRIPTION_NOTE = '[MASTER_SUBSCRIPTION]';
const WEBSITE_SUBSCRIPTION_IN_NOTE = '[WEBSITE_SUBSCRIPTION_IN]';
const MASTER_PURCHASED_CHECKOUT_NOTE = '[MASTER_PURCHASED_CHECKOUT]';
const MASTER_VISIBILITY_CHECKOUT_NOTE = '[MASTER_VISIBILITY_CHECKOUT]';
const MASTER_VISIBILITY_OUT_NOTE = '[MASTER_VISIBILITY_OUT]';
const WEBSITE_VISIBILITY_IN_NOTE = '[WEBSITE_VISIBILITY_IN]';

@Injectable()
export class CreditService {
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is missing');
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  async getMyCredits(userId: string) {
    // Step 1: Get current user's master/account wallet balance.
    const wallet = await this.getMasterWalletState(this.prisma, userId);

    // Step 2: Get website-level subscription and earned credit balances.
    const websiteRows = await this.prisma.$queryRaw<
      Array<{
        totalSubscriptionCredits: number | null;
        totalEarnedCredits: number | null;
      }>
    >(Prisma.sql`
    SELECT
      COALESCE(SUM(w."subscriptionTaskCredits"), 0)::int AS "totalSubscriptionCredits",
      COALESCE(SUM(w."earnedTaskCredits"), 0)::int AS "totalEarnedCredits"
    FROM "WebsiteCreditWallet" w
    INNER JOIN "Website" site ON site."id" = w."websiteId"
    WHERE site."authorId" = ${userId}
      AND site."isDeleted" = false
  `);

    const websiteSubscriptionCredits =
      websiteRows[0]?.totalSubscriptionCredits ?? 0;
    const websiteEarnedCredits = websiteRows[0]?.totalEarnedCredits ?? 0;

    // Step 3: Get lifetime earned, monthly total, and completed task credit totals.
    const creditActivityTotals = await this.getUserCreditActivityTotals(userId);

    // Step 4: Return old fields plus new credit summary fields.
    return {
      masterSubscriptionTaskCredits: wallet.subscriptionTaskCredits,
      websiteSubscriptionTaskCredits: websiteSubscriptionCredits,
      subscriptionCredits:
        wallet.subscriptionTaskCredits + websiteSubscriptionCredits,
      earnedTaskCredits: websiteEarnedCredits,
      purchasedTaskCredits: wallet.purchasedTaskCredits,
      referralTaskCredits: wallet.referralTaskCredits,
      visibilityCredits: wallet.visibilityCredits,
      totalTaskCredits:
        wallet.subscriptionTaskCredits +
        websiteSubscriptionCredits +
        websiteEarnedCredits +
        wallet.purchasedTaskCredits +
        wallet.referralTaskCredits,

      lifetimeTotalCreditEarned: creditActivityTotals.lifetimeTotalCreditEarned,
      thisMonthTotalCredits: creditActivityTotals.thisMonthTotalCredits,
      completedTaskTotalCredits: creditActivityTotals.completedTaskTotalCredits,
    };
  }

  async getMyDashboardCreditSummary(userId: string) {
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const [wallet, websiteRows, usedThisMonth, activeSubscription] =
      await Promise.all([
        this.getMasterWalletState(this.prisma, userId),
        this.prisma.$queryRaw<
          Array<{
            totalSubscriptionCredits: number | null;
            totalEarnedCredits: number | null;
            totalAllocatedPurchasedCredits: number | null;
            totalAllocatedReferralCredits: number | null;
            totalVisibilityCredits: number | null;
          }>
        >(Prisma.sql`
          SELECT
            COALESCE(SUM(w."subscriptionTaskCredits"), 0)::int AS "totalSubscriptionCredits",
            COALESCE(SUM(w."earnedTaskCredits"), 0)::int AS "totalEarnedCredits",
            COALESCE(SUM(w."allocatedPurchasedCredits"), 0)::int AS "totalAllocatedPurchasedCredits",
            COALESCE(SUM(w."allocatedReferralCredits"), 0)::int AS "totalAllocatedReferralCredits",
            COALESCE(SUM(w."visibilityCredits"), 0)::int AS "totalVisibilityCredits"
          FROM "WebsiteCreditWallet" w
          INNER JOIN "Website" site ON site."id" = w."websiteId"
          WHERE site."authorId" = ${userId}
            AND site."isDeleted" = false
        `),
        this.prisma.creditLog.aggregate({
          where: {
            userId,
            action: 'SPEND',
            reason: 'TASK_POST',
            createdAt: {
              gte: monthStart,
              lte: now,
            },
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            planId: true,
            status: true,
            plan: {
              select: {
                name: true,
                maxTaskCreditCapacity: true,
              },
            },
          },
        }),
      ]);

    const websiteCredits = websiteRows[0];
    const websiteTaskCredits =
      (websiteCredits?.totalSubscriptionCredits ?? 0) +
      (websiteCredits?.totalEarnedCredits ?? 0) +
      (websiteCredits?.totalAllocatedPurchasedCredits ?? 0) +
      (websiteCredits?.totalAllocatedReferralCredits ?? 0);

    const masterTaskCredits =
      wallet.subscriptionTaskCredits +
      wallet.earnedTaskCredits +
      wallet.purchasedTaskCredits +
      wallet.referralTaskCredits;

    return {
      availableCredits: masterTaskCredits + websiteTaskCredits,
      availableVisibilityCredits:
        wallet.visibilityCredits +
        (websiteCredits?.totalVisibilityCredits ?? 0),
      usedThisMonth: usedThisMonth._sum.amount ?? 0,
      maximumCapacity: activeSubscription?.plan.maxTaskCreditCapacity ?? 0,
      activeSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            planId: activeSubscription.planId,
            planName: activeSubscription.plan.name,
            status: activeSubscription.status,
          }
        : null,
    };
  }

  async getMasterCredits(userId: string) {
    const wallet = await this.getMasterWalletState(this.prisma, userId);

    return {
      subscriptionTaskCredits: wallet.subscriptionTaskCredits,
      purchasedTaskCredits: wallet.purchasedTaskCredits,
      referralTaskCredits: wallet.referralTaskCredits,
      visibilityCredits: wallet.visibilityCredits,
      totalMasterTaskCredits:
        wallet.subscriptionTaskCredits +
        wallet.purchasedTaskCredits +
        wallet.referralTaskCredits,
    };
  }

  async getAdminCreditDashboard() {
    const [masterWalletTotals, websiteWalletTotals] =
      await this.prisma.$transaction([
        this.prisma.userCreditWallet.aggregate({
          _sum: {
            subscriptionTaskCredits: true,
            earnedTaskCredits: true,
            referralTaskCredits: true,
            visibilityCredits: true,
          },
        }),
        this.prisma.websiteCreditWallet.aggregate({
          _sum: {
            subscriptionTaskCredits: true,
            earnedTaskCredits: true,
            allocatedReferralCredits: true,
            visibilityCredits: true,
          },
        }),
      ]);

    const masterSubscriptionTaskCredits =
      masterWalletTotals._sum.subscriptionTaskCredits ?? 0;
    const masterEarnedTaskCredits =
      masterWalletTotals._sum.earnedTaskCredits ?? 0;
    const masterReferralTaskCredits =
      masterWalletTotals._sum.referralTaskCredits ?? 0;
    const masterVisibilityCredits =
      masterWalletTotals._sum.visibilityCredits ?? 0;

    const websiteSubscriptionTaskCredits =
      websiteWalletTotals._sum.subscriptionTaskCredits ?? 0;
    const websiteEarnedTaskCredits =
      websiteWalletTotals._sum.earnedTaskCredits ?? 0;
    const websiteAllocatedReferralCredits =
      websiteWalletTotals._sum.allocatedReferralCredits ?? 0;
    const websiteVisibilityCredits =
      websiteWalletTotals._sum.visibilityCredits ?? 0;

    const subscriptions =
      masterSubscriptionTaskCredits + websiteSubscriptionTaskCredits;
    const referralEarned =
      masterReferralTaskCredits +
      websiteAllocatedReferralCredits +
      masterEarnedTaskCredits +
      websiteEarnedTaskCredits;
    const visibility = masterVisibilityCredits + websiteVisibilityCredits;

    return {
      subscriptions: {
        value: subscriptions,
        displayValue: this.formatCompactCreditValue(subscriptions),
      },
      referralEarned: {
        value: referralEarned,
        displayValue: this.formatCompactCreditValue(referralEarned),
      },
      visibility: {
        value: visibility,
        displayValue: this.formatCompactCreditValue(visibility),
      },
    };
  }

  async getMasterCreditStatement(
    userId: string,
    query: CreditStatementQueryDto,
  ) {
    const masterWallet = await this.getMasterWalletState(this.prisma, userId);

    return this.getRawCreditStatement(userId, query, {
      masterWalletId: masterWallet.id,
      masterMovementsOnly: true,
      notePrefixes: [
        MASTER_SUBSCRIPTION_NOTE,
        MASTER_PURCHASED_NOTE,
        MASTER_PURCHASED_CHECKOUT_NOTE,
        MASTER_REFERRAL_NOTE,
      ],
    });
  }

  async getCreditStatement(userId: string, query: CreditStatementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CreditLogWhereInput = {
      userId,
      ...(query.creditType ? { creditType: query.creditType } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.reason ? { reason: query.reason } : {}),
      ...(query.websiteId ? { websiteId: query.websiteId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.creditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
          websiteId: true,
          taskId: true,
          referralId: true,
          subscriptionId: true,
          note: true,
          createdAt: true,
        },
      }),
      this.prisma.creditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        logicalCreditBucket: this.resolveLogicalCreditBucket(
          item.note,
          item.creditType,
        ),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWebsiteWallet(userId: string, websiteId: string) {
    const website = await this.ensureOwnedWebsite(userId, websiteId);
    const wallet = await this.getOrCreateWebsiteWallet(this.prisma, websiteId);

    return {
      website: {
        id: website.id,
        name: website.name,
        websiteUrl: website.websiteUrl,
        verificationStatus: website.verificationStatus,
      },
      balances: {
        subscriptionTaskCredits: wallet.subscriptionTaskCredits,
        earnedTaskCredits: wallet.earnedTaskCredits,
        allocatedPurchasedCredits: wallet.allocatedPurchasedCredits,
        allocatedReferralCredits: wallet.allocatedReferralCredits,
        visibilityCredits: wallet.visibilityCredits,
        visibilityActiveUntil: wallet.visibilityActiveUntil,
        totalTaskCredits:
          wallet.subscriptionTaskCredits +
          wallet.earnedTaskCredits +
          wallet.allocatedPurchasedCredits +
          wallet.allocatedReferralCredits,
      },
    };
  }

  async getWebsiteCreditSummary(userId: string, websiteId: string) {
    const websiteWallet = await this.getWebsiteWallet(userId, websiteId);
    const latestActivity = await this.prisma.creditLog.findFirst({
      where: {
        userId,
        websiteId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
      },
    });

    const totalTransactions = await this.prisma.creditLog.count({
      where: {
        userId,
        websiteId,
      },
    });

    return {
      ...websiteWallet,
      meta: {
        totalTransactions,
        latestActivityAt: latestActivity?.createdAt ?? null,
      },
    };
  }

  async getWebsiteCreditStatement(
    userId: string,
    websiteId: string,
    query: CreditStatementQueryDto,
  ) {
    await this.ensureOwnedWebsite(userId, websiteId);

    return this.getRawCreditStatement(userId, query, {
      websiteId,
      excludeNotePrefixes: [
        MASTER_SUBSCRIPTION_NOTE,
        MASTER_PURCHASED_NOTE,
        MASTER_PURCHASED_CHECKOUT_NOTE,
        MASTER_REFERRAL_NOTE,
      ],
    });
  }

  async allocatePurchasedCredits(
    userId: string,
    payload: AllocatePurchasedCreditsDto,
  ) {
    this.ensurePositiveAmount(payload.amount);
    await this.ensureOwnedWebsite(userId, payload.websiteId, {
      requireVerified: true,
    });

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getMasterWalletState(tx, userId);
      const websiteWallet = await this.getOrCreateWebsiteWallet(
        tx,
        payload.websiteId,
      );

      if (masterWallet.purchasedTaskCredits < payload.amount) {
        throw new BadRequestException(
          'Insufficient purchased credits in master wallet.',
        );
      }

      const updatedMaster = await this.updateMasterWalletBalance(
        tx,
        userId,
        'purchasedTaskCredits',
        -payload.amount,
      );
      const updatedWebsite = await this.updateWebsiteWalletBalance(
        tx,
        payload.websiteId,
        'allocatedPurchasedCredits',
        payload.amount,
      );

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'EARNED_TASK',
        action: 'SPEND',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: masterWallet.purchasedTaskCredits,
        balanceAfter: updatedMaster.purchasedTaskCredits,
        note: this.resolveNote(
          payload.note,
          `${MASTER_PURCHASED_NOTE} Allocated purchased credits from master wallet to website wallet.`,
        ),
      });

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'EARNED_TASK',
        action: 'ADD',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: websiteWallet.allocatedPurchasedCredits,
        balanceAfter: updatedWebsite.allocatedPurchasedCredits,
        note: this.resolveNote(
          payload.note,
          `${WEBSITE_PURCHASED_IN_NOTE} Received purchased credits from the master wallet.`,
        ),
      });

      return {
        success: true,
        websiteId: payload.websiteId,
        allocatedAmount: payload.amount,
        masterPurchasedTaskCredits: updatedMaster.purchasedTaskCredits,
        websiteAllocatedPurchasedCredits:
          updatedWebsite.allocatedPurchasedCredits,
      };
    });
  }

  async allocateReferralCredits(
    userId: string,
    payload: AllocateReferralCreditsDto,
  ) {
    this.ensurePositiveAmount(payload.amount);
    await this.ensureOwnedWebsite(userId, payload.websiteId, {
      requireVerified: true,
    });

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getMasterWalletState(tx, userId);
      const websiteWallet = await this.getOrCreateWebsiteWallet(
        tx,
        payload.websiteId,
      );

      if (masterWallet.referralTaskCredits < payload.amount) {
        throw new BadRequestException(
          'Insufficient referral credits in master wallet.',
        );
      }

      const updatedMaster = await this.updateMasterWalletBalance(
        tx,
        userId,
        'referralTaskCredits',
        -payload.amount,
      );
      const updatedWebsite = await this.updateWebsiteWalletBalance(
        tx,
        payload.websiteId,
        'allocatedReferralCredits',
        payload.amount,
      );

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'EARNED_TASK',
        action: 'SPEND',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: masterWallet.referralTaskCredits,
        balanceAfter: updatedMaster.referralTaskCredits,
        note: this.resolveNote(
          payload.note,
          `${MASTER_REFERRAL_NOTE} Allocated referral credits from master wallet to website wallet.`,
        ),
      });

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'EARNED_TASK',
        action: 'ADD',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: websiteWallet.allocatedReferralCredits,
        balanceAfter: updatedWebsite.allocatedReferralCredits,
        note: this.resolveNote(
          payload.note,
          `${WEBSITE_REFERRAL_IN_NOTE} Received referral credits from the master wallet.`,
        ),
      });

      return {
        success: true,
        websiteId: payload.websiteId,
        allocatedAmount: payload.amount,
        masterReferralTaskCredits: updatedMaster.referralTaskCredits,
        websiteAllocatedReferralCredits:
          updatedWebsite.allocatedReferralCredits,
      };
    });
  }

  async buyVisibilityCredits(userId: string, payload: BuyVisibilityCreditsDto) {
    this.ensurePositiveAmount(payload.amount);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.email) {
      throw new BadRequestException(
        'User email is required for Stripe checkout.',
      );
    }

    const clientUrl =
      this.configService.get<string>('CLIENT_URL') ||
      this.configService.get<string>('FRONTEND_URL');
    if (!clientUrl) {
      throw new InternalServerErrorException(
        'CLIENT_URL or FRONTEND_URL is missing',
      );
    }

    const unitAmountPence = this.getVisibilityCreditUnitPricePence(
      payload.amount,
    );
    const totalAmountPence = payload.amount * unitAmountPence;

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Visibility Credit',
                description:
                  'Visibility credits are added to your master wallet for website allocation.',
              },
              unit_amount: unitAmountPence,
            },
            quantity: payload.amount,
          },
        ],
        success_url: `${clientUrl}/credits/visibility/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/credits/visibility/cancel`,
        metadata: {
          userId,
          purchaseType: 'VISIBILITY_CREDIT',
          visibilityCredits: String(payload.amount),
          unitAmountPence: String(unitAmountPence),
          totalAmountPence: String(totalAmountPence),
          note: payload.note ?? '',
        },
      });

      return {
        success: true,
        message: 'Visibility credit checkout session created successfully.',
        data: {
          sessionId: session.id,
          url: session.url,
          visibilityCredits: payload.amount,
          pricing: {
            unitAmountPence,
            totalAmountPence,
            totalAmount: (totalAmountPence / 100).toFixed(2),
            currency: 'GBP',
          },
        },
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to create visibility credit checkout session',
      );
    }
  }

  async getVisibilityCreditsAfterCheckout(userId: string, sessionId: string) {
    let session: any;

    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Failed to retrieve checkout session',
      );
    }

    const sessionUserId = session.metadata?.userId;
    const visibilityCredits = Number(session.metadata?.visibilityCredits ?? 0);

    if (!sessionUserId || !visibilityCredits) {
      throw new BadRequestException(
        'Missing userId or visibilityCredits in checkout session metadata',
      );
    }

    if (sessionUserId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to access this checkout session',
      );
    }

    if (session.mode !== 'payment') {
      throw new BadRequestException('Checkout session is not a payment');
    }

    if (session.payment_status !== 'paid') {
      return {
        success: true,
        message: 'Checkout payment is not completed yet.',
        data: {
          sessionId: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          visibilityCredits: null,
        },
      };
    }

    await this.grantVisibilityCreditsFromCheckoutSession(session);

    const masterWallet = await this.getMasterWalletState(this.prisma, userId);

    return {
      success: true,
      message: 'Visibility credits added to master wallet successfully.',
      data: {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        boughtAmount: visibilityCredits,
        masterVisibilityCredits: masterWallet.visibilityCredits,
      },
    };
  }

  async handleVisibilityCreditWebhook(
    rawBody: Buffer | undefined,
    signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw body for webhook verification',
      );
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is missing',
      );
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${error.message}`,
      );
    }

    return this.handleVisibilityCreditWebhookEvent(event);
  }

  async handleVisibilityCreditWebhookEvent(event: any) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session: any = event.data.object;

        if (
          session.mode === 'payment' &&
          session.metadata?.purchaseType === 'VISIBILITY_CREDIT'
        ) {
          await this.grantVisibilityCreditsFromCheckoutSession(session);
          return { received: true, status: 'success' };
        }

        return { received: true };
      }

      case 'checkout.session.async_payment_failed': {
        const session: any = event.data.object;

        return {
          received: true,
          status: 'failed',
          sessionId: session.id,
        };
      }

      default:
        return { received: true };
    }
  }

  async allocateVisibilityCredits(
    userId: string,
    payload: AllocateVisibilityCreditsDto,
  ) {
    this.ensurePositiveAmount(payload.amount);
    await this.ensureOwnedWebsite(userId, payload.websiteId, {
      requireVerified: true,
    });

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getMasterWalletState(tx, userId);
      const websiteWallet = await this.getOrCreateWebsiteWallet(
        tx,
        payload.websiteId,
      );

      if (masterWallet.visibilityCredits < payload.amount) {
        throw new BadRequestException(
          'Insufficient visibility credits in master wallet.',
        );
      }

      const capacity = await this.getVisibilityCreditCapacity(userId);
      if (websiteWallet.visibilityCredits + payload.amount > capacity) {
        throw new BadRequestException(
          `Website visibility credit capacity exceeded. Maximum allowed is ${capacity}.`,
        );
      }

      const updatedMaster = await this.updateMasterWalletBalance(
        tx,
        userId,
        'visibilityCredits',
        -payload.amount,
      );

      const updatedWebsite = await this.updateWebsiteWalletBalance(
        tx,
        payload.websiteId,
        'visibilityCredits',
        payload.amount,
      );

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'VISIBILITY',
        action: 'SPEND',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: masterWallet.visibilityCredits,
        balanceAfter: updatedMaster.visibilityCredits,
        note: this.resolveNote(
          payload.note,
          `${MASTER_VISIBILITY_OUT_NOTE} Allocated visibility credits from master wallet to website wallet.`,
        ),
      });

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'VISIBILITY',
        action: 'ADD',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: websiteWallet.visibilityCredits,
        balanceAfter: updatedWebsite.visibilityCredits,
        note: this.resolveNote(
          payload.note,
          `${WEBSITE_VISIBILITY_IN_NOTE} Received visibility credits from the master wallet.`,
        ),
      });

      return {
        success: true,
        websiteId: payload.websiteId,
        allocatedAmount: payload.amount,
        masterVisibilityCredits: updatedMaster.visibilityCredits,
        websiteVisibilityCredits: updatedWebsite.visibilityCredits,
      };
    });
  }

  async getVisibilityCredits(userId: string) {
    const masterWallet = await this.getMasterWalletState(this.prisma, userId);
    const rows = await this.prisma.$queryRaw<
      Array<{ totalVisibilityCredits: number | null }>
    >(Prisma.sql`
      SELECT COALESCE(SUM(w."visibilityCredits"), 0)::int AS "totalVisibilityCredits"
      FROM "WebsiteCreditWallet" w
      INNER JOIN "Website" site ON site."id" = w."websiteId"
      WHERE site."authorId" = ${userId}
        AND site."isDeleted" = false
    `);

    const websiteVisibilityCredits = rows[0]?.totalVisibilityCredits ?? 0;

    return {
      masterVisibilityCredits: masterWallet.visibilityCredits,
      websiteVisibilityCredits,
      totalVisibilityCredits:
        masterWallet.visibilityCredits + websiteVisibilityCredits,
    };
  }

  async getVisibilityStatement(userId: string, query: CreditStatementQueryDto) {
    return this.getRawCreditStatement(userId, query, {
      creditType: 'VISIBILITY',
    });
  }

  async getEarnedCredits(userId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ totalEarnedCredits: number | null }>
    >(Prisma.sql`
      SELECT COALESCE(SUM(w."earnedTaskCredits"), 0)::int AS "totalEarnedCredits"
      FROM "WebsiteCreditWallet" w
      INNER JOIN "Website" site ON site."id" = w."websiteId"
      WHERE site."authorId" = ${userId}
        AND site."isDeleted" = false
    `);

    return {
      aggregatedEarnedTaskCredits: rows[0]?.totalEarnedCredits ?? 0,
      note: 'Combined overview across owned websites; use website wallet for spendable earned balance.',
    };
  }

  async getSubscriptionCredits(userId: string) {
    const wallet = await this.getMasterWalletState(this.prisma, userId);

    return {
      subscriptionTaskCredits: wallet.subscriptionTaskCredits,
    };
  }

  async allocateSubscriptionCredits(
    userId: string,
    payload: AllocateSubscriptionCreditsDto,
  ) {
    this.ensurePositiveAmount(payload.amount);
    await this.ensureOwnedWebsite(userId, payload.websiteId, {
      requireVerified: true,
    });

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getMasterWalletState(tx, userId);
      const websiteWallet = await this.getOrCreateWebsiteWallet(
        tx,
        payload.websiteId,
      );

      if (masterWallet.subscriptionTaskCredits < payload.amount) {
        throw new BadRequestException(
          'Insufficient subscription credits in master wallet.',
        );
      }

      const updatedMaster = await this.updateMasterWalletBalance(
        tx,
        userId,
        'subscriptionTaskCredits',
        -payload.amount,
      );

      const updatedWebsite = await this.updateWebsiteWalletBalance(
        tx,
        payload.websiteId,
        'subscriptionTaskCredits',
        payload.amount,
      );

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'SUBSCRIPTION_TASK',
        action: 'SPEND',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: masterWallet.subscriptionTaskCredits,
        balanceAfter: updatedMaster.subscriptionTaskCredits,
        note: this.resolveNote(
          payload.note,
          `${MASTER_SUBSCRIPTION_NOTE} Allocated subscription credits from master wallet to website wallet.`,
        ),
      });

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        websiteId: payload.websiteId,
        creditType: 'SUBSCRIPTION_TASK',
        action: 'ADD',
        reason: 'MANUAL',
        amount: payload.amount,
        balanceBefore: websiteWallet.subscriptionTaskCredits,
        balanceAfter: updatedWebsite.subscriptionTaskCredits,
        note: this.resolveNote(
          payload.note,
          `${WEBSITE_SUBSCRIPTION_IN_NOTE} Received subscription credits from the master wallet.`,
        ),
      });

      return {
        success: true,
        websiteId: payload.websiteId,
        allocatedAmount: payload.amount,
        masterSubscriptionTaskCredits: updatedMaster.subscriptionTaskCredits,
        websiteSubscriptionTaskCredits: updatedWebsite.subscriptionTaskCredits,
      };
    });
  }

  async buyPurchasedCredits(userId: string, payload: BuyPurchasedCreditsDto) {
    // the requested credit amount must be a valid positive integer.
    this.ensurePositiveAmount(payload.amount);

    // load the current user because Stripe checkout needs a customer email.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.email) {
      throw new BadRequestException(
        'User email is required for Stripe checkout.',
      );
    }

    // frontend success/cancel URLs come from CLIENT_URL, falling back to FRONTEND_URL.
    const clientUrl =
      this.configService.get<string>('CLIENT_URL') ||
      this.configService.get<string>('FRONTEND_URL');
    if (!clientUrl) {
      throw new InternalServerErrorException(
        'CLIENT_URL or FRONTEND_URL is missing',
      );
    }

    // apply the backend pricing rule.
    // Rule:
    // - every full group of 5 credits uses the discounted 5-credit bundle price
    // - remaining credits use the single-credit price
    const bundleCount = Math.floor(payload.amount / 5);
    const singleCount = payload.amount % 5;

    // build Stripe checkout line items dynamically.
    // We do not depend on Stripe price/product ids here.
    const lineItems: Array<Record<string, unknown>> = [];

    if (bundleCount > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Task Credit Bundle (5)',
            description: '5 task credits for £39.99',
          },
          // Stripe expects the smallest currency unit as an integer.
          // £39.99 => 3999 pence
          unit_amount: 3999,
        },
        quantity: bundleCount,
      });
    }

    if (singleCount > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Task Credit',
            description: '1 task credit for £9.99',
          },
          // £9.99 => 999 pence
          unit_amount: 999,
        },
        quantity: singleCount,
      });
    }

    // calculate total price in pence for reference/debugging/metadata.
    const totalAmountPence = bundleCount * 3999 + singleCount * 999;

    try {
      // create a one-time Stripe checkout session for this credit purchase.
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        line_items: lineItems,
        success_url: `${clientUrl}/credits/purchased/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/credits/purchased/cancel`,
        metadata: {
          userId,
          purchaseType: 'PURCHASED_TASK_CREDIT',
          purchasedCredits: String(payload.amount),
          totalAmountPence: String(totalAmountPence),
          note: payload.note ?? '',
        },
      });

      // return checkout URL to frontend.
      // Credit is not added yet here; it will be added after successful payment
      // from the webhook / checkout success confirmation flow.
      return {
        success: true,
        message: 'Purchased task credit checkout session created successfully.',
        data: {
          sessionId: session.id,
          url: session.url,
          purchasedCredits: payload.amount,
          pricing: {
            bundleCount,
            singleCount,
            totalAmountPence,
            totalAmount: (totalAmountPence / 100).toFixed(2),
            currency: 'GBP',
          },
        },
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to create purchased credit checkout session',
      );
    }
  }

  async getPurchasedCreditsAfterCheckout(userId: string, sessionId: string) {
    let session: any;

    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Failed to retrieve checkout session',
      );
    }

    const sessionUserId = session.metadata?.userId;
    const purchasedCredits = Number(session.metadata?.purchasedCredits ?? 0);

    if (!sessionUserId || !purchasedCredits) {
      throw new BadRequestException(
        'Missing userId or purchasedCredits in checkout session metadata',
      );
    }

    if (sessionUserId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to access this checkout session',
      );
    }

    if (session.mode !== 'payment') {
      throw new BadRequestException('Checkout session is not a payment');
    }

    if (session.payment_status !== 'paid') {
      return {
        success: true,
        message: 'Checkout payment is not completed yet.',
        data: {
          sessionId: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          purchasedCredits: null,
        },
      };
    }

    await this.grantPurchasedCreditsFromCheckoutSession(session);

    const masterWallet = await this.getMasterWalletState(this.prisma, userId);

    return {
      success: true,
      message: 'Purchased credits applied successfully.',
      data: {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        boughtAmount: purchasedCredits,
        purchasedTaskCredits: masterWallet.purchasedTaskCredits,
      },
    };
  }

  async handlePurchasedCreditWebhook(
    rawBody: Buffer | undefined,
    signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw body for webhook verification',
      );
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is missing',
      );
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${error.message}`,
      );
    }

    return this.handlePurchasedCreditWebhookEvent(event);
  }

  async handlePurchasedCreditWebhookEvent(event: any) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session: any = event.data.object;

        if (
          session.mode === 'payment' &&
          session.metadata?.purchaseType === 'PURCHASED_TASK_CREDIT'
        ) {
          await this.grantPurchasedCreditsFromCheckoutSession(session);
          return { received: true, status: 'success' };
        }

        return { received: true };
      }

      case 'checkout.session.async_payment_failed': {
        const session: any = event.data.object;

        return {
          received: true,
          status: 'failed',
          sessionId: session.id,
        };
      }

      default:
        return { received: true };
    }
  }

  private formatCompactCreditValue(value: number) {
    if (Math.abs(value) < 1000) {
      return String(value);
    }

    const compactValue = value / 1000;
    const formatted =
      Number.isInteger(compactValue) || compactValue >= 10
        ? compactValue.toFixed(0)
        : compactValue.toFixed(1);

    return `${formatted}k`;
  }

  private async grantPurchasedCreditsFromCheckoutSession(session: any) {
    const userId = session.metadata?.userId;
    const purchasedCredits = Number(session.metadata?.purchasedCredits ?? 0);
    const sessionId = session.id;
    const noteFromCheckout = session.metadata?.note || undefined;

    if (!userId || !purchasedCredits || !sessionId) {
      throw new BadRequestException(
        'Missing checkout metadata for purchased task credits.',
      );
    }

    const idempotencyNotePrefix = `${MASTER_PURCHASED_CHECKOUT_NOTE}[${sessionId}]`;

    const existingLog = await this.prisma.creditLog.findFirst({
      where: {
        userId,
        action: 'ADD',
        reason: 'MANUAL',
        note: {
          startsWith: idempotencyNotePrefix,
        },
      },
      select: { id: true },
    });

    if (existingLog) {
      return existingLog;
    }

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getMasterWalletState(tx, userId);

      const updatedMaster = await this.updateMasterWalletBalance(
        tx,
        userId,
        'purchasedTaskCredits',
        purchasedCredits,
      );

      const note = noteFromCheckout?.trim()
        ? `${idempotencyNotePrefix} ${noteFromCheckout}`
        : `${idempotencyNotePrefix} Stripe checkout purchased task credits added to master wallet.`;

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        creditType: 'EARNED_TASK',
        action: 'ADD',
        reason: 'MANUAL',
        amount: purchasedCredits,
        balanceBefore: masterWallet.purchasedTaskCredits,
        balanceAfter: updatedMaster.purchasedTaskCredits,
        note,
      });

      await this.createCreditNotification(tx, {
        recipientId: userId,
        type: NotificationType.CREDIT_REWARDED,
        title: 'Purchased task credits added',
        body: `${purchasedCredits} purchased task credit(s) were added to your master wallet.`,
        amount: purchasedCredits,
        sessionId,
        walletType: 'PURCHASED',
        balanceBefore: masterWallet.purchasedTaskCredits,
        balanceAfter: updatedMaster.purchasedTaskCredits,
        idempotencyKey: [
          'credit-purchased-checkout',
          sessionId,
          userId,
          purchasedCredits,
        ].join('-'),
      });

      return updatedMaster;
    });
  }

  private async getRawCreditStatement(
    userId: string,
    query: CreditStatementQueryDto,
    options?: {
      websiteId?: string;
      notePrefixes?: string[];
      excludeNotePrefixes?: string[];
      creditType?: 'VISIBILITY';
      masterWalletId?: string;
      masterMovementsOnly?: boolean;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const filter = this.buildRawCreditStatementFilter(userId, query, options);
    const selectSql = `
    SELECT
      "id",
      "walletId",
      "userId",
      "creditType",
      "action",
      "reason",
      "amount",
      "balanceBefore",
      "balanceAfter",
      "websiteId",
      "taskId",
      "referralId",
      "subscriptionId",
      "note",
      "createdAt"
    FROM "CreditLog"
    ${filter.whereSql}
    ORDER BY "createdAt" DESC
    LIMIT $${filter.nextIndex} OFFSET $${filter.nextIndex + 1}
  `;

    const countSql = `
    SELECT COUNT(*)::int AS total
    FROM "CreditLog"
    ${filter.whereSql}
  `;

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<RawCreditLogRow[]>(
        selectSql,
        ...filter.params,
        limit,
        offset,
      ),
      this.prisma.$queryRawUnsafe<Array<{ total: number }>>(
        countSql,
        ...filter.params,
      ),
    ]);

    const total = countRows[0]?.total ?? 0;

    return {
      items: items.map((item) => ({
        ...item,
        logicalCreditBucket: this.resolveLogicalCreditBucket(
          item.note,
          item.creditType,
        ),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildRawCreditStatementFilter(
    userId: string,
    query: CreditStatementQueryDto,
    options?: {
      websiteId?: string;
      notePrefixes?: string[];
      excludeNotePrefixes?: string[];
      creditType?: 'VISIBILITY';
      masterWalletId?: string;
      masterMovementsOnly?: boolean;
    },
  ) {
    const clauses: string[] = ['"userId" = $1'];
    const params: Array<string | Date> = [userId];

    if (options?.masterWalletId) {
      params.push(options.masterWalletId);
      clauses.push(`"walletId" = $${params.length}`);
    }

    if (options?.masterMovementsOnly) {
      clauses.push(`
        (
          "websiteId" IS NULL
          OR (
            "websiteId" IS NOT NULL
            AND "action" = 'SPEND'::"CreditAction"
            AND "reason" = 'MANUAL'::"CreditReason"
          )
        )
      `);
    }

    if (options?.websiteId) {
      params.push(options.websiteId);
      clauses.push(`"websiteId" = $${params.length}`);
    } else if (query.websiteId) {
      params.push(query.websiteId);
      clauses.push(`"websiteId" = $${params.length}`);
    }

    if (query.fromDate) {
      params.push(new Date(query.fromDate));
      clauses.push(`"createdAt" >= $${params.length}`);
    }

    if (query.toDate) {
      params.push(new Date(query.toDate));
      clauses.push(`"createdAt" <= $${params.length}`);
    }

    if (query.creditType) {
      params.push(query.creditType);
      clauses.push(`"creditType" = $${params.length}::"CreditType"`);
    }

    if (query.action) {
      params.push(query.action);
      clauses.push(`"action" = $${params.length}::"CreditAction"`);
    }

    if (query.reason) {
      params.push(query.reason);
      clauses.push(`"reason" = $${params.length}::"CreditReason"`);
    }

    if (options?.creditType) {
      params.push(options.creditType);
      clauses.push(`"creditType" = $${params.length}::"CreditType"`);
    }

    if (options?.notePrefixes?.length) {
      const noteClauses = options.notePrefixes.map((prefix) => {
        params.push(`${prefix}%`);
        return `"note" LIKE $${params.length}`;
      });

      clauses.push(`(${noteClauses.join(' OR ')})`);
    }

    if (options?.excludeNotePrefixes?.length) {
      const excludeClauses = options.excludeNotePrefixes.map((prefix) => {
        params.push(`${prefix}%`);
        return `COALESCE("note", '') NOT LIKE $${params.length}`;
      });

      clauses.push(`(${excludeClauses.join(' AND ')})`);
    }

    return {
      whereSql: `WHERE ${clauses.join(' AND ')}`,
      params,
      nextIndex: params.length + 1,
    };
  }

  private resolveLogicalCreditBucket(
    note: string | null | undefined,
    creditType: string,
  ) {
    if (note?.startsWith(MASTER_PURCHASED_NOTE)) {
      return 'PURCHASED_TASK';
    }
    if (
      note?.startsWith(WEBSITE_PURCHASED_IN_NOTE) ||
      note?.startsWith(WEBSITE_PURCHASED_OUT_NOTE)
    ) {
      return 'PURCHASED_TASK';
    }
    if (note?.startsWith(MASTER_REFERRAL_NOTE)) {
      return 'REFERRAL_TASK';
    }
    if (note?.startsWith(WEBSITE_REFERRAL_IN_NOTE)) {
      return 'REFERRAL_TASK';
    }
    if (creditType === 'VISIBILITY') {
      return 'VISIBILITY';
    }
    return creditType;
  }

  private getVisibilityCreditUnitPricePence(amount: number) {
    if (amount >= 25) {
      return 849;
    }
    if (amount >= 10) {
      return 899;
    }
    if (amount >= 5) {
      return 949;
    }
    return 999;
  }

  private async getVisibilityCreditCapacity(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        startDate: 'desc',
      },
      select: {
        plan: {
          select: {
            tier: true,
            visibilityCreditCapacity: true,
          },
        },
      },
    });

    const configuredCapacity = subscription?.plan.visibilityCreditCapacity ?? 0;
    if (configuredCapacity > 0) {
      return configuredCapacity;
    }

    switch (subscription?.plan.tier) {
      case 'SILVER':
        return 5;
      case 'GOLD':
        return 10;
      case 'PLATINUM':
      case 'ENTERPRISE':
        return 20;
      default:
        return 2;
    }
  }

  private ensurePositiveAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }
  }

  private async ensureOwnedWebsite(
    userId: string,
    websiteId: string,
    options?: { requireVerified?: boolean },
  ) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        authorId: true,
        isDeleted: true,
        verificationStatus: true,
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    if (website.authorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access credits for this website.',
      );
    }

    if (options?.requireVerified && website.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException(
        'Credits can only be allocated to a verified website.',
      );
    }

    return website;
  }

  private async getMasterWalletState(db: RawDbClient, userId: string) {
    await db.userCreditWallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        earnedTaskCredits: 0,
        visibilityCredits: 0,
      },
    });

    const rows = await db.$queryRaw<RawMasterWalletRow[]>(Prisma.sql`
      SELECT
        "id",
        "userId",
        COALESCE("subscriptionTaskCredits", 0)::int AS "subscriptionTaskCredits",
        "earnedTaskCredits",
        COALESCE("purchasedTaskCredits", 0)::int AS "purchasedTaskCredits",
        COALESCE("referralTaskCredits", 0)::int AS "referralTaskCredits",
        "visibilityCredits",
        "createdAt",
        "updatedAt"
      FROM "UserCreditWallet"
      WHERE "userId" = ${userId}
      LIMIT 1
    `);

    const wallet = rows[0];
    if (!wallet) {
      throw new NotFoundException('Master wallet not found');
    }

    return wallet;
  }

  private async getOrCreateWebsiteWallet(db: RawDbClient, websiteId: string) {
    const existing = await db.$queryRaw<RawWebsiteWalletRow[]>(Prisma.sql`
      SELECT
        "id",
        "websiteId",
        "subscriptionTaskCredits",
        "earnedTaskCredits",
        "allocatedPurchasedCredits",
        "allocatedReferralCredits",
        "visibilityCredits",
        "visibilityActiveUntil",
        "createdAt",
        "updatedAt"
      FROM "WebsiteCreditWallet"
      WHERE "websiteId" = ${websiteId}
      LIMIT 1
    `);

    if (existing[0]) {
      return existing[0];
    }

    const inserted = await db.$queryRaw<RawWebsiteWalletRow[]>(Prisma.sql`
      INSERT INTO "WebsiteCreditWallet" (
        "id",
        "websiteId",
        "subscriptionTaskCredits",
        "earnedTaskCredits",
        "allocatedPurchasedCredits",
        "allocatedReferralCredits",
        "visibilityCredits",
        "createdAt",
        "updatedAt"
      )
      VALUES (${randomUUID()}, ${websiteId}, 0, 0, 0, 0, 0, NOW(), NOW())
      RETURNING
        "id",
        "websiteId",
        "subscriptionTaskCredits",
        "earnedTaskCredits",
        "allocatedPurchasedCredits",
        "allocatedReferralCredits",
        "visibilityCredits",
        "visibilityActiveUntil",
        "createdAt",
        "updatedAt"
    `);

    return inserted[0];
  }

  private async updateMasterWalletBalance(
    db: RawDbClient,
    userId: string,
    column: MasterWalletBalanceColumn,
    delta: number,
  ) {
    const sql = `
      UPDATE "UserCreditWallet"
      SET "${column}" = COALESCE("${column}", 0) + $1,
          "updatedAt" = NOW()
      WHERE "userId" = $2
      RETURNING
        "id",
        "userId",
        COALESCE("subscriptionTaskCredits", 0)::int AS "subscriptionTaskCredits",
        "earnedTaskCredits",
        COALESCE("purchasedTaskCredits", 0)::int AS "purchasedTaskCredits",
        COALESCE("referralTaskCredits", 0)::int AS "referralTaskCredits",
        "visibilityCredits",
        "createdAt",
        "updatedAt"
    `;

    const rows = await db.$queryRawUnsafe<RawMasterWalletRow[]>(
      sql,
      delta,
      userId,
    );

    return rows[0];
  }

  private async updateWebsiteWalletBalance(
    db: RawDbClient,
    websiteId: string,
    column: WebsiteWalletBalanceColumn,
    delta: number,
  ) {
    const sql = `
      UPDATE "WebsiteCreditWallet"
      SET "${column}" = COALESCE("${column}", 0) + $1,
          "updatedAt" = NOW()
      WHERE "websiteId" = $2
      RETURNING
        "id",
        "websiteId",
        "subscriptionTaskCredits",
        "earnedTaskCredits",
        "allocatedPurchasedCredits",
        "allocatedReferralCredits",
        "visibilityCredits",
        "visibilityActiveUntil",
        "createdAt",
        "updatedAt"
    `;

    const rows = await db.$queryRawUnsafe<RawWebsiteWalletRow[]>(
      sql,
      delta,
      websiteId,
    );

    return rows[0];
  }

  private async createCreditLog(
    db: RawDbClient,
    data: {
      walletId: string;
      userId: string;
      websiteId?: string;
      creditType: 'SUBSCRIPTION_TASK' | 'EARNED_TASK' | 'VISIBILITY';
      action: 'ADD' | 'SPEND' | 'REFUND';
      reason:
        | 'SUBSCRIPTION_PURCHASE'
        | 'TASK_COMPLETION'
        | 'TASK_POST'
        | 'REFERRAL_WEBSITE_VERIFIED'
        | 'REFERRAL_FIRST_BACKLINK'
        | 'REFERRAL_PAID_SUBSCRIPTION'
        | 'MANUAL';
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      note?: string;
    },
  ) {
    await db.$executeRaw(Prisma.sql`
    INSERT INTO "CreditLog" (
      "id",
      "walletId",
      "userId",
      "creditType",
      "action",
      "reason",
      "amount",
      "balanceBefore",
      "balanceAfter",
      "websiteId",
      "note",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${data.walletId},
      ${data.userId},
      ${data.creditType}::"CreditType",
      ${data.action}::"CreditAction",
      ${data.reason}::"CreditReason",
      ${data.amount},
      ${data.balanceBefore},
      ${data.balanceAfter},
      ${data.websiteId ?? null},
      ${data.note ?? null},
      NOW()
    )
  `);
  }

  private resolveNote(note: string | undefined, fallback: string) {
    const trimmed = note?.trim();
    if (!trimmed) {
      return fallback;
    }

    const fallbackPrefix = fallback.match(/^\[[^\]]+\]/)?.[0];
    if (!fallbackPrefix || trimmed.startsWith(fallbackPrefix)) {
      return trimmed;
    }

    return `${fallbackPrefix} ${trimmed}`;
  }

  private async grantVisibilityCreditsFromCheckoutSession(session: any) {
    const userId = session.metadata?.userId;
    const visibilityCredits = Number(session.metadata?.visibilityCredits ?? 0);
    const sessionId = session.id;
    const noteFromCheckout = session.metadata?.note || undefined;

    if (!userId || !visibilityCredits || !sessionId) {
      throw new BadRequestException(
        'Missing checkout metadata for visibility credits.',
      );
    }

    const idempotencyNotePrefix = `${MASTER_VISIBILITY_CHECKOUT_NOTE}[${sessionId}]`;

    const existingLog = await this.prisma.creditLog.findFirst({
      where: {
        userId,
        action: 'ADD',
        reason: 'MANUAL',
        creditType: 'VISIBILITY',
        note: {
          startsWith: idempotencyNotePrefix,
        },
      },
      select: { id: true },
    });

    if (existingLog) {
      return existingLog;
    }

    return this.prisma.$transaction(async (tx) => {
      const masterWallet = await this.getMasterWalletState(tx, userId);
      const updatedMaster = await this.updateMasterWalletBalance(
        tx,
        userId,
        'visibilityCredits',
        visibilityCredits,
      );

      const note = noteFromCheckout?.trim()
        ? `${idempotencyNotePrefix} ${noteFromCheckout}`
        : `${idempotencyNotePrefix} Stripe checkout visibility credits added to master wallet.`;

      await this.createCreditLog(tx, {
        walletId: masterWallet.id,
        userId,
        creditType: 'VISIBILITY',
        action: 'ADD',
        reason: 'MANUAL',
        amount: visibilityCredits,
        balanceBefore: masterWallet.visibilityCredits,
        balanceAfter: updatedMaster.visibilityCredits,
        note,
      });

      await this.createCreditNotification(tx, {
        recipientId: userId,
        type: NotificationType.CREDIT_REWARDED,
        title: 'Visibility credits added',
        body: `${visibilityCredits} visibility credit(s) were added to your master wallet.`,
        amount: visibilityCredits,
        sessionId,
        walletType: 'VISIBILITY',
        balanceBefore: masterWallet.visibilityCredits,
        balanceAfter: updatedMaster.visibilityCredits,
        idempotencyKey: [
          'credit-visibility-checkout',
          sessionId,
          userId,
          visibilityCredits,
        ].join('-'),
      });

      return updatedMaster;
    });
  }

  private async createCreditNotification(
    db: RawDbClient,
    input: Parameters<typeof createCreditNotificationIfAllowed>[1],
  ) {
    try {
      await createCreditNotificationIfAllowed(db, input);
    } catch {
      // Credit movement is the source of truth; notification failure must not
      // break checkout/webhook processing.
    }
  }

  private async getUserCreditActivityTotals(userId: string) {
    const monthStart = this.getMonthStartDate();

    const [
      lifetimeTotalCreditEarned,
      completedTaskTotalCredits,
      thisMonthTotalCredits,
    ] = await Promise.all([
      // Lifetime earned credits from completed task rewards.
      this.prisma.creditLog.aggregate({
        where: {
          userId,
          creditType: 'EARNED_TASK',
          reason: 'TASK_COMPLETION',
          action: {
            in: ['ADD', 'REWARD'],
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Lifetime task credit activity: requester spend + provider reward.
      this.prisma.creditLog.aggregate({
        where: {
          userId,
          creditType: 'EARNED_TASK',
          reason: {
            in: ['TASK_POST', 'TASK_COMPLETION'],
          },
          action: {
            in: ['SPEND', 'ADD', 'REWARD'],
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Current month task credit activity: requester spend + provider reward.
      this.prisma.creditLog.aggregate({
        where: {
          userId,
          creditType: 'EARNED_TASK',
          reason: {
            in: ['TASK_POST', 'TASK_COMPLETION'],
          },
          action: {
            in: ['SPEND', 'ADD', 'REWARD'],
          },
          createdAt: {
            gte: monthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      lifetimeTotalCreditEarned: lifetimeTotalCreditEarned._sum.amount ?? 0,
      completedTaskTotalCredits: completedTaskTotalCredits._sum.amount ?? 0,
      thisMonthTotalCredits: thisMonthTotalCredits._sum.amount ?? 0,
    };
  }
  private getMonthStartDate() {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
}
