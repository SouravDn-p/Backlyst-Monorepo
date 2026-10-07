/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { CreateCheckoutDto } from './dto/create-user-subscription.dto';

import Stripe = require('stripe');
import {
  NotificationCategory,
  NotificationType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { getPagination } from 'src/common/utils/pagination';
import { ReferrerService } from 'src/modules/credit/referrer/referrer.service';
import { createSubscriptionNotificationIfAllowed } from './subscription-notification.util';

const subscriptionPlanSelect = {
  id: true,
  tier: true,
  name: true,
  description: true,
  price: true,
  credit: true,
  visibility: true,
  taskCreditsPerCycle: true,
  maxTaskCreditCapacity: true,
  billingInterval: true,
  features: true,
} satisfies Prisma.SubscriptionPlanSelect;

// Canonical Stripe values stored locally after checkout and webhook sync.
type StripeSubscriptionIdentity = {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
};

// Optional invoice/period context makes every recurring credit grant auditable.
type SubscriptionCreditGrant = {
  stripeInvoiceId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  isRenewal?: boolean;
};

@Injectable()
export class UserSubscriptionService {
  private readonly stripe: InstanceType<typeof Stripe>;
  private static readonly ACTIVE_SUBSCRIPTION_STATUSES = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.PAST_DUE,
  ] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly referrerService: ReferrerService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is missing');
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  private calculateSubscriptionEndDate(
    billingInterval: 'MONTHLY' | 'YEARLY',
    startDate: Date,
  ) {
    const endDate = new Date(startDate);

    if (billingInterval === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  private async deactivateOtherActiveSubscriptions(
    tx: Prisma.TransactionClient,
    userId: string,
    keepSubscriptionId: string,
  ) {
    await tx.subscription.updateMany({
      where: {
        userId,
        status: {
          in: [...UserSubscriptionService.ACTIVE_SUBSCRIPTION_STATUSES],
        },
        id: {
          not: keepSubscriptionId,
        },
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false,
        cancelAtPeriodEnd: false,
        cancellationRequestedAt: null,
        cancelledAt: new Date(),
      },
    });
  }

  async ensureDefaultFreeSubscription(userId: string) {
    let freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        tier: 'FREE',
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
        billingInterval: true,
      },
    });

    if (!freePlan) {
      // Keep free-plan activation independent from optional startup seed data.
      freePlan = await this.prisma.subscriptionPlan.create({
        data: {
          tier: 'FREE',
          name: 'Free',
          description: 'Default free plan for verified users.',
          price: '0',
          credit: 1,
          taskCreditsPerCycle: 1,
          maxTaskCreditCapacity: 5,
          visibility: 'MODARATE',
          billingInterval: 'MONTHLY',
          features: [
            { key: 'task_credits', value: '1 Credit Per Month' },
            { key: 'visibility', value: 'Visible For 7 Days' },
          ],
          maxWebsites: 1,
          additionalWebsitePrice: '0',
          maxSimultaneousTasks: 1,
          visibilityCreditCapacity: 2,
          taskCreditUnitPrice: '9.99',
          visibilityCreditUnitPrice: '9.99',
          referralEnabled: false,
          badges: [{ key: 'verified_website', value: 'Verified Website Badge' }],
          bulkTaskCreditDiscounts: [],
          bulkVisibilityCreditDiscounts: [],
          isActive: true,
          isDeleted: false,
        },
        select: {
          id: true,
          billingInterval: true,
        },
      });
    }

    const now = new Date();
    const existingActiveSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [...UserSubscriptionService.ACTIVE_SUBSCRIPTION_STATUSES],
        },
      },
      include: {
        plan: {
          select: {
            tier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingActiveSubscription) {
      return existingActiveSubscription.plan.tier === 'FREE'
        ? existingActiveSubscription
        : null;
    }

    const reusableFreeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        planId: freePlan.id,
        currentPeriodEnd: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const freeSubscription = await this.prisma.$transaction(async (tx) => {
      if (reusableFreeSubscription) {
        const reactivated = await tx.subscription.update({
          where: {
            id: reusableFreeSubscription.id,
          },
          data: {
            status: SubscriptionStatus.ACTIVE,
            autoRenew: false,
            cancelAtPeriodEnd: false,
            cancellationRequestedAt: null,
            cancelledAt: null,
          },
        });

        await this.deactivateOtherActiveSubscriptions(tx, userId, reactivated.id);

        return {
          subscription: reactivated,
          shouldGrantCredits: false,
        };
      }

      const startDate = now;
      const endDate = this.calculateSubscriptionEndDate(
        freePlan.billingInterval,
        startDate,
      );

      const created = await tx.subscription.create({
        data: {
          userId,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          autoRenew: false,
          cancelAtPeriodEnd: false,
          cancellationRequestedAt: null,
          cancelledAt: null,
        },
      });

      await this.deactivateOtherActiveSubscriptions(tx, userId, created.id);

      return {
        subscription: created,
        shouldGrantCredits: true,
      };
    });

    if (freeSubscription.shouldGrantCredits) {
      await this.grantSubscriptionCredits(freeSubscription.subscription.id, {
        periodStart: freeSubscription.subscription.currentPeriodStart ?? now,
        periodEnd:
          freeSubscription.subscription.currentPeriodEnd ??
          freeSubscription.subscription.endDate ??
          this.calculateSubscriptionEndDate(freePlan.billingInterval, now),
      });
    }

    return freeSubscription.subscription;
  }

  private getStripeObjectId(value: unknown): string | null {
    // Stripe relation fields may be returned as an ID or an expanded object.
    if (typeof value === 'string') {
      return value;
    }

    if (
      value &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string'
    ) {
      return value.id;
    }

    return null;
  }

  private async getStripeSubscriptionIdentity(
    session: any,
  ): Promise<StripeSubscriptionIdentity> {
    // Checkout only carries IDs, so Stripe remains authoritative for period dates.
    const stripeSubscriptionId = this.getStripeObjectId(session.subscription);
    const stripeCustomerId = this.getStripeObjectId(session.customer);

    if (!stripeSubscriptionId || !stripeCustomerId) {
      throw new BadRequestException(
        'Stripe customer or subscription ID is missing from checkout session',
      );
    }

    const stripeSubscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const subscriptionItems = stripeSubscription.items.data;

    if (subscriptionItems.length === 0) {
      throw new BadRequestException('Stripe subscription has no billing item');
    }

    const currentPeriodStart = Math.min(
      ...subscriptionItems.map((item) => item.current_period_start),
    );
    const currentPeriodEnd = Math.max(
      ...subscriptionItems.map((item) => item.current_period_end),
    );

    return {
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    };
  }

  private getStripeSubscriptionIdFromInvoice(invoice: any): string | null {
    const subscription =
      invoice.parent?.subscription_details?.subscription ??
      invoice.subscription;

    return this.getStripeObjectId(subscription);
  }

  private async getStripeIdentityBySubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<StripeSubscriptionIdentity> {
    const stripeSubscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const stripeCustomerId = this.getStripeObjectId(
      stripeSubscription.customer,
    );
    const subscriptionItems = stripeSubscription.items.data;

    if (!stripeCustomerId || subscriptionItems.length === 0) {
      throw new BadRequestException(
        'Stripe subscription customer or billing period is missing',
      );
    }

    return {
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart: new Date(
        Math.min(
          ...subscriptionItems.map((item) => item.current_period_start),
        ) * 1000,
      ),
      currentPeriodEnd: new Date(
        Math.max(...subscriptionItems.map((item) => item.current_period_end)) *
          1000,
      ),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    };
  }

  private async handlePaidSubscriptionInvoice(invoice: any) {
    // Step 1: Resolve the local subscription represented by this Stripe invoice.
    const stripeSubscriptionId =
      this.getStripeSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) {
      return { received: true, status: 'ignored_non_subscription_invoice' };
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    // The first invoice may arrive before checkout.session.completed creates the local row.
    if (!subscription) {
      return { received: true, status: 'subscription_not_ready' };
    }

    const stripeIdentity =
      await this.getStripeIdentityBySubscriptionId(stripeSubscriptionId);

    // Step 2: A successful payment restores ACTIVE state and clears failure data.
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: stripeIdentity.stripeCustomerId,
          currentPeriodStart: stripeIdentity.currentPeriodStart,
          currentPeriodEnd: stripeIdentity.currentPeriodEnd,
          endDate: stripeIdentity.currentPeriodEnd,
          autoRenew: !stripeIdentity.cancelAtPeriodEnd,
          cancelAtPeriodEnd: stripeIdentity.cancelAtPeriodEnd,
          cancellationRequestedAt: stripeIdentity.cancelAtPeriodEnd
            ? subscription.cancellationRequestedAt
            : null,
          cancelledAt: null,
          lastStripeInvoiceId: invoice.id,
          lastPaidAt: new Date(
            (invoice.status_transitions?.paid_at ??
              Math.floor(Date.now() / 1000)) * 1000,
          ),
          lastPaymentFailedAt: null,
          lastPaymentFailureReason: null,
        },
      });

      await createSubscriptionNotificationIfAllowed(tx, {
        userId: subscription.userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title:
          invoice.billing_reason === 'subscription_cycle'
            ? 'Subscription renewed'
            : 'Subscription payment received',
        body:
          invoice.billing_reason === 'subscription_cycle'
            ? 'Your subscription renewal payment was successful.'
            : 'Your subscription payment was successful.',
        subscriptionId: subscription.id,
        planId: subscription.planId,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId,
        periodStart: stripeIdentity.currentPeriodStart,
        periodEnd: stripeIdentity.currentPeriodEnd,
        idempotencyKey: `subscription-payment-success-${subscription.id}-${invoice.id}`,
        data: {
          billingReason: invoice.billing_reason ?? null,
          eventSource: 'STRIPE_INVOICE',
        },
      });
    });

    // Step 3: Initial credits come from Checkout; only cycles grant renewal credits.
    if (invoice.billing_reason !== 'subscription_cycle') {
      return { received: true, status: 'initial_payment_synced' };
    }

    await this.grantSubscriptionCredits(subscription.id, {
      stripeInvoiceId: invoice.id,
      periodStart: stripeIdentity.currentPeriodStart,
      periodEnd: stripeIdentity.currentPeriodEnd,
      isRenewal: true,
    });

    return { received: true, status: 'renewal_success' };
  }

  private async handleFailedSubscriptionInvoice(invoice: any) {
    // Payment failure never grants credits; Stripe may retry this PAST_DUE invoice.
    const stripeSubscriptionId =
      this.getStripeSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) {
      return { received: true, status: 'ignored_non_subscription_invoice' };
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (!subscription) {
      return { received: true, status: 'subscription_not_found' };
    }

    const failureReason = `Stripe invoice ${invoice.id} payment failed after ${invoice.attempt_count ?? 1} attempt(s).`;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.PAST_DUE,
          lastStripeInvoiceId: invoice.id,
          lastPaymentFailedAt: new Date(),
          lastPaymentFailureReason: failureReason,
        },
      });

      await createSubscriptionNotificationIfAllowed(tx, {
        userId: subscription.userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: 'Subscription payment failed',
        body: 'Your subscription renewal payment failed. Please update your payment method to avoid losing access.',
        subscriptionId: subscription.id,
        planId: subscription.planId,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId,
        idempotencyKey: `subscription-payment-failed-${subscription.id}-${invoice.id}`,
        data: {
          failureReason,
          attemptCount: invoice.attempt_count ?? 1,
          eventSource: 'STRIPE_INVOICE',
        },
      });
    });

    return { received: true, status: 'renewal_payment_failed' };
  }

  private stripeTimestampToDate(value: unknown): Date | null {
    return typeof value === 'number' ? new Date(value * 1000) : null;
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete_expired':
        return SubscriptionStatus.EXPIRED;
      default:
        return SubscriptionStatus.PENDING;
    }
  }

  private async syncStripeSubscription(
    stripeSubscription: any,
    isDeleted = false,
  ) {
    // Stripe subscription events are authoritative for status and cancellation state.
    const stripeSubscriptionId = this.getStripeObjectId(stripeSubscription);

    if (!stripeSubscriptionId) {
      return { received: true, status: 'missing_stripe_subscription_id' };
    }

    const localSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (!localSubscription) {
      return { received: true, status: 'subscription_not_found' };
    }

    // Keep existing dates if Stripe sends a thin event without expanded items.
    const items = stripeSubscription.items?.data ?? [];
    const periodStart = items.length
      ? new Date(
          Math.min(...items.map((item: any) => item.current_period_start)) *
            1000,
        )
      : localSubscription.currentPeriodStart;
    const periodEnd = items.length
      ? new Date(
          Math.max(...items.map((item: any) => item.current_period_end)) * 1000,
        )
      : localSubscription.currentPeriodEnd;
    const cancelAtPeriodEnd = Boolean(stripeSubscription.cancel_at_period_end);
    const status = isDeleted
      ? SubscriptionStatus.CANCELLED
      : this.mapStripeSubscriptionStatus(stripeSubscription.status);
    const isCancelled = status === SubscriptionStatus.CANCELLED;
    const cancellationRequestedAt = cancelAtPeriodEnd
      ? (this.stripeTimestampToDate(stripeSubscription.canceled_at) ??
        localSubscription.cancellationRequestedAt ??
        new Date())
      : null;
    const cancelledAt = isCancelled
      ? (this.stripeTimestampToDate(stripeSubscription.ended_at) ??
        this.stripeTimestampToDate(stripeSubscription.canceled_at) ??
        new Date())
      : null;

    const cancellationScheduled =
      !isCancelled &&
      cancelAtPeriodEnd &&
      !localSubscription.cancelAtPeriodEnd;
    const cancellationResumed =
      !isCancelled &&
      !cancelAtPeriodEnd &&
      localSubscription.cancelAtPeriodEnd;
    const finalCancellation =
      isCancelled && localSubscription.status !== SubscriptionStatus.CANCELLED;

    const updatedSubscription = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: localSubscription.id },
        data: {
          stripeCustomerId:
            this.getStripeObjectId(stripeSubscription.customer) ??
            localSubscription.stripeCustomerId,
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          endDate: periodEnd,
          autoRenew: !cancelAtPeriodEnd && !isCancelled,
          cancelAtPeriodEnd,
          cancellationRequestedAt,
          cancelledAt,
        },
      });

      if (cancellationScheduled) {
        await createSubscriptionNotificationIfAllowed(tx, {
          userId: localSubscription.userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'Subscription cancellation scheduled',
          body: 'Your subscription will remain active until the current billing period ends.',
          subscriptionId: localSubscription.id,
          planId: localSubscription.planId,
          stripeSubscriptionId,
          periodEnd,
          idempotencyKey: `subscription-cancel-scheduled-${localSubscription.id}-${periodEnd?.toISOString() ?? 'unknown'}`,
          data: {
            eventSource: 'STRIPE_SUBSCRIPTION',
            cancelAtPeriodEnd: true,
          },
        });
      }

      if (cancellationResumed) {
        await createSubscriptionNotificationIfAllowed(tx, {
          userId: localSubscription.userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'Subscription auto-renewal resumed',
          body: 'Your subscription auto-renewal is active again.',
          subscriptionId: localSubscription.id,
          planId: localSubscription.planId,
          stripeSubscriptionId,
          periodEnd,
          idempotencyKey: `subscription-resumed-${localSubscription.id}-${periodEnd?.toISOString() ?? 'unknown'}`,
          data: {
            eventSource: 'STRIPE_SUBSCRIPTION',
            cancelAtPeriodEnd: false,
          },
        });
      }

      if (finalCancellation) {
        await createSubscriptionNotificationIfAllowed(tx, {
          userId: localSubscription.userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'Subscription cancelled',
          body: 'Your subscription has ended.',
          subscriptionId: localSubscription.id,
          planId: localSubscription.planId,
          stripeSubscriptionId,
          periodEnd,
          idempotencyKey: `subscription-cancelled-${localSubscription.id}-${cancelledAt?.toISOString() ?? 'unknown'}`,
          data: {
            eventSource: 'STRIPE_SUBSCRIPTION',
            cancelledAt: cancelledAt?.toISOString() ?? null,
          },
        });
      }

      return updated;
    });

    if (
      updatedSubscription.status === SubscriptionStatus.CANCELLED ||
      updatedSubscription.status === SubscriptionStatus.EXPIRED
    ) {
      await this.ensureDefaultFreeSubscription(updatedSubscription.userId);
    }

    return {
      received: true,
      status: isCancelled ? 'subscription_cancelled' : 'subscription_synced',
      subscriptionId: updatedSubscription.id,
    };
  }

  private async ensureActiveSubscription(
    userId: string,
    planId: string,
    stripeIdentity: StripeSubscriptionIdentity,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Prefer the immutable Stripe subscription ID for replay safety.
      const subscriptionByStripeId = await tx.subscription.findUnique({
        where: {
          stripeSubscriptionId: stripeIdentity.stripeSubscriptionId,
        },
      });

      if (subscriptionByStripeId) {
        const updated = await tx.subscription.update({
          where: { id: subscriptionByStripeId.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId: stripeIdentity.stripeCustomerId,
            currentPeriodStart: stripeIdentity.currentPeriodStart,
            currentPeriodEnd: stripeIdentity.currentPeriodEnd,
            endDate: stripeIdentity.currentPeriodEnd,
            autoRenew: !stripeIdentity.cancelAtPeriodEnd,
            cancelAtPeriodEnd: stripeIdentity.cancelAtPeriodEnd,
            cancellationRequestedAt: stripeIdentity.cancelAtPeriodEnd
              ? subscriptionByStripeId.cancellationRequestedAt
              : null,
            cancelledAt: null,
            lastPaymentFailedAt: null,
            lastPaymentFailureReason: null,
          },
        });

        await this.deactivateOtherActiveSubscriptions(tx, userId, updated.id);

        return updated;
      }

      // Step 2: Link a compatible legacy/local row that predates Stripe ID storage.
      const existingSubscription = await tx.subscription.findFirst({
        where: {
          userId,
          planId,
          status: {
            in: [...UserSubscriptionService.ACTIVE_SUBSCRIPTION_STATUSES],
          },
        },
      });

      if (existingSubscription) {
        const updated = await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            stripeCustomerId: stripeIdentity.stripeCustomerId,
            stripeSubscriptionId: stripeIdentity.stripeSubscriptionId,
            currentPeriodStart: stripeIdentity.currentPeriodStart,
            currentPeriodEnd: stripeIdentity.currentPeriodEnd,
            endDate: stripeIdentity.currentPeriodEnd,
            autoRenew: !stripeIdentity.cancelAtPeriodEnd,
            cancelAtPeriodEnd: stripeIdentity.cancelAtPeriodEnd,
            cancellationRequestedAt: stripeIdentity.cancelAtPeriodEnd
              ? existingSubscription.cancellationRequestedAt
              : null,
            cancelledAt: null,
            lastPaymentFailedAt: null,
            lastPaymentFailureReason: null,
          },
        });

        await this.deactivateOtherActiveSubscriptions(tx, userId, updated.id);

        return updated;
      }

      // Step 3: No matching row exists, so validate the plan and create one.
      const plan = await tx.subscriptionPlan.findUnique({
        where: { id: planId },
        select: {
          id: true,
          billingInterval: true,
        },
      });

      if (!plan) {
        throw new BadRequestException('Plan not found');
      }

      const startDate = stripeIdentity.currentPeriodStart;
      const endDate = stripeIdentity.currentPeriodEnd;

      const created = await tx.subscription.create({
        data: {
          userId,
          planId,
          stripeCustomerId: stripeIdentity.stripeCustomerId,
          stripeSubscriptionId: stripeIdentity.stripeSubscriptionId,
          status: 'ACTIVE',
          startDate,
          endDate,
          currentPeriodStart: stripeIdentity.currentPeriodStart,
          currentPeriodEnd: stripeIdentity.currentPeriodEnd,
          autoRenew: !stripeIdentity.cancelAtPeriodEnd,
          cancelAtPeriodEnd: stripeIdentity.cancelAtPeriodEnd,
          cancellationRequestedAt: null,
          cancelledAt: null,
        },
      });

      await this.deactivateOtherActiveSubscriptions(tx, userId, created.id);

      return created;
    });
  }

  private async getSubscriptionDetails(userId: string) {
    let subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
      },
      include: {
        plan: {
          select: subscriptionPlanSelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      await this.ensureDefaultFreeSubscription(userId);

      subscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
          },
        },
        include: {
          plan: {
            select: subscriptionPlanSelect,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    const [remainingCredits, grantedCredits] = await Promise.all([
      this.prisma.subscriptionCreditBatch.aggregate({
        where: {
          userId,
          subscriptionId: subscription.id,
          remainingCredits: {
            gt: 0,
          },
          expiresAt: {
            gt: now,
          },
        },
        _sum: {
          remainingCredits: true,
        },
      }),
      this.prisma.subscriptionCreditBatch.aggregate({
        where: {
          userId,
          subscriptionId: subscription.id,
        },
        _sum: {
          totalCredits: true,
        },
      }),
    ]);

    return {
      ...subscription,
      credits: {
        planCredits: subscription.plan.taskCreditsPerCycle,
        grantedCredits: grantedCredits._sum.totalCredits ?? 0,
        remainingCredits: remainingCredits._sum.remainingCredits ?? 0,
      },
    };
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isAlreadySubscribed = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
      },
      include: { plan: true }
    });

    if (isAlreadySubscribed && isAlreadySubscribed.plan?.tier !== 'FREE') {
      throw new BadRequestException(
        'User is already subscribed, if you want to change plan, please cancel your current subscription.',
      );
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id: dto.planId,
        isActive: true,
      },
    });

    if (!plan) {
      throw new BadRequestException('Subscription plan not found');
    }

    const clientUrl =
      this.configService.get<string>('CLIENT_URL') ||
      this.configService.get<string>('FRONTEND_URL');

    if (!clientUrl) {
      throw new InternalServerErrorException(
        'CLIENT_URL or FRONTEND_URL is missing',
      );
    }

    const unitAmount = Math.round(parseFloat(plan.price.toString()) * 100);

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: plan.name,
                description: plan.description || undefined,
              },
              unit_amount: unitAmount,
              recurring: {
                interval: plan.billingInterval === 'YEARLY' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${clientUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/subscription/cancel`,
        metadata: {
          userId,
          planId: plan.id,
        },
        subscription_data: {
          metadata: {
            userId,
            planId: plan.id,
          },
        },
      });

      return sendResponse('Checkout session created successfully', {
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to create checkout session',
      );
    }
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
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

    return this.handleStripeWebhookEvent(event);
  }

  async handleStripeWebhookEvent(event: any) {
    // Route each Stripe event to one state transition; unknown events are acknowledged.
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session: any = event.data.object;

        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
          throw new BadRequestException(
            'Missing userId or planId in session metadata',
          );
        }

        // Delayed payment methods can complete Checkout before payment settles.
        if (session.payment_status !== 'paid') {
          return { received: true, status: 'payment_pending' };
        }

        // Paid Checkout creates/syncs the subscription before granting credits.
        const stripeIdentity =
          await this.getStripeSubscriptionIdentity(session);
        const subscription = await this.ensureActiveSubscription(
          userId,
          planId,
          stripeIdentity,
        );
        await this.grantSubscriptionCredits(subscription.id, {
          stripeInvoiceId: this.getStripeObjectId(session.invoice) ?? undefined,
          periodStart: stripeIdentity.currentPeriodStart,
          periodEnd: stripeIdentity.currentPeriodEnd,
        });
        await this.referrerService.unlockPaidSubscriptionStage(
          userId,
          subscription.id,
        );

        return { received: true, status: 'success' };
      }

      case 'checkout.session.async_payment_failed': {
        const session: any = event.data.object;
        const userId = session.metadata?.userId;

        if (userId) {
          await createSubscriptionNotificationIfAllowed(this.prisma, {
            userId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Subscription payment failed',
            body: 'Your subscription checkout payment failed. Please try again or use another payment method.',
            entityId: session.id,
            planId: session.metadata?.planId ?? null,
            stripeSubscriptionId:
              this.getStripeObjectId(session.subscription) ?? null,
            idempotencyKey: `subscription-checkout-payment-failed-${session.id}-${userId}`,
            data: {
              sessionId: session.id,
              paymentStatus: session.payment_status ?? null,
              eventSource: 'STRIPE_CHECKOUT',
            },
          });
        }

        return {
          received: true,
          status: 'failed',
          sessionId: session.id,
        };
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        // Both events may arrive for one invoice; invoice ID prevents double credit.
        return this.handlePaidSubscriptionInvoice(event.data.object);

      case 'invoice.payment_failed':
        return this.handleFailedSubscriptionInvoice(event.data.object);

      case 'customer.subscription.updated':
        // Includes cancel-at-period-end and resume changes made in Stripe.
        return this.syncStripeSubscription(event.data.object);

      case 'customer.subscription.deleted':
        // This is the final cancellation after paid access actually ends.
        return this.syncStripeSubscription(event.data.object, true);

      default:
        return { received: true };
    }
  }

  async myActiveSubscription(userId: string) {
    // by imran: frontend can call this anytime to show the user's current active plan.
    return this.getSubscriptionDetails(userId);
  }

  async getSubscriptionAfterCheckout(userId: string, sessionId: string) {
    // by imran: frontend should call this right after Stripe success redirect using the session_id from the URL.
    let session: any;

    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Failed to retrieve checkout session',
      );
    }

    const sessionUserId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!sessionUserId || !planId) {
      throw new BadRequestException(
        'Missing userId or planId in checkout session metadata',
      );
    }

    if (sessionUserId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to access this checkout session',
      );
    }

    if (session.mode !== 'subscription') {
      throw new BadRequestException('Checkout session is not a subscription');
    }

    if (session.payment_status !== 'paid') {
      return sendResponse('Checkout payment is not completed yet', {
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        subscription: null,
      });
    }

    // This fallback makes the success page safe when Stripe webhook arrives later.
    const stripeIdentity = await this.getStripeSubscriptionIdentity(session);
    const activeSubscription = await this.ensureActiveSubscription(
      userId,
      planId,
      stripeIdentity,
    );
    await this.grantSubscriptionCredits(activeSubscription.id, {
      stripeInvoiceId: this.getStripeObjectId(session.invoice) ?? undefined,
      periodStart: stripeIdentity.currentPeriodStart,
      periodEnd: stripeIdentity.currentPeriodEnd,
    });
    await this.referrerService.unlockPaidSubscriptionStage(
      userId,
      activeSubscription.id,
    );

    const subscription = await this.getSubscriptionDetails(userId);

    return sendResponse('Subscription fetched successfully', {
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      subscription,
    });
  }

  async myselfSubscriptionHistory(
    userId: string,
    page?: number,
    limit?: number,
    status?: SubscriptionStatus,
  ) {
    const where = {
      userId,
      ...(status ? { status } : {}),
    };

    const totalItems = await this.prisma.subscription.count({ where });
    const { skip, take, meta } = getPagination(page, limit, totalItems);

    const [data, allSubscriptions] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          plan: {
            select: subscriptionPlanSelect,
          },
        },
      }),
      this.prisma.subscription.findMany({
        where: { userId },
        include: {
          plan: {
            select: subscriptionPlanSelect,
          },
        },
      }),
    ]);

    const analytics = allSubscriptions.reduce(
      (acc, item) => {
        acc.totalSubscriptions += 1;

        if (item.status === SubscriptionStatus.ACTIVE) {
          acc.activeSubscriptions += 1;
        }

        if (item.status === SubscriptionStatus.PAST_DUE) {
          acc.pastDueSubscriptions += 1;
        }

        if (item.status === SubscriptionStatus.CANCELLED) {
          acc.cancelledSubscriptions += 1;
        }

        if (item.status === SubscriptionStatus.EXPIRED) {
          acc.expiredSubscriptions += 1;
        }

        if (item.status === SubscriptionStatus.PENDING) {
          acc.pendingSubscriptions += 1;
        }

        acc.totalSpent += Number(item.plan?.price || 0);

        return acc;
      },
      {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        pastDueSubscriptions: 0,
        cancelledSubscriptions: 0,
        expiredSubscriptions: 0,
        pendingSubscriptions: 0,
        totalSpent: 0,
      },
    );

    return sendResponse('Subscription history fetched successfully', {
      data,
      meta,
      analytics,
    });
  }

  async cencelSubscription(userId: string) {
    // Step 1: Find the current renewable subscription owned by this user.
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException(
        'Subscription is not linked to Stripe and cannot be cancelled automatically',
      );
    }

    let stripeSubscription: any;

    // Step 2: Ask Stripe to stop renewal only after the current paid period.
    try {
      stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Failed to schedule Stripe subscription cancellation',
      );
    }

    // Step 3: Mirror Stripe's confirmed cancellation schedule in the local row.
    await this.syncStripeSubscription(stripeSubscription);

    const updatedSubscription = await this.prisma.subscription.findUnique({
      where: { id: subscription.id },
      select: {
        id: true,
        status: true,
        autoRenew: true,
        cancelAtPeriodEnd: true,
        cancellationRequestedAt: true,
        currentPeriodEnd: true,
      },
    });

    return sendResponse(
      'Subscription cancellation scheduled for the end of the billing period',
      updatedSubscription,
    );
  }

  async resumeSubscription(userId: string) {
    // Step 1: Resume is valid only while period-end cancellation is still pending.
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
        cancelAtPeriodEnd: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Scheduled cancellation not found');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException(
        'Subscription is not linked to Stripe and cannot be resumed automatically',
      );
    }

    let stripeSubscription: any;

    // Step 2: Re-enable the next automatic Stripe renewal..
    try {
      stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: false },
      );
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Failed to resume Stripe subscription',
      );
    }

    // Step 3: Clear the local cancellation schedule using Stripe's response.
    await this.syncStripeSubscription(stripeSubscription);

    const updatedSubscription = await this.prisma.subscription.findUnique({
      where: { id: subscription.id },
      select: {
        id: true,
        status: true,
        autoRenew: true,
        cancelAtPeriodEnd: true,
        cancellationRequestedAt: true,
        currentPeriodEnd: true,
      },
    });

    return sendResponse(
      'Subscription auto-renewal resumed successfully',
      updatedSubscription,
    );
  }

  private async grantSubscriptionCredits(
    subscriptionId: string,
    grant: SubscriptionCreditGrant = {},
  ) {
    // All wallet, batch, and ledger writes below commit or roll back together.
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: {
          select: {
            taskCreditsPerCycle: true,
            billingInterval: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    const creditAmount = subscription.plan.taskCreditsPerCycle;

    if (!creditAmount || creditAmount <= 0) {
      return;
    }

    const expiresAt =
      grant.periodEnd ??
      subscription.currentPeriodEnd ??
      subscription.endDate ??
      this.calculateSubscriptionEndDate(
        subscription.plan.billingInterval,
        subscription.startDate,
      );

    try {
      const grantResult = await this.prisma.$transaction(
        async (tx) => {
          // Step 1: Stop duplicate credit grant if Stripe webhook/success route runs twice.
          const existingBatch = await tx.subscriptionCreditBatch.findFirst({
            where: grant.stripeInvoiceId
              ? { stripeInvoiceId: grant.stripeInvoiceId }
              : {
                  userId: subscription.userId,
                  subscriptionId: subscription.id,
                },
            select: {
              id: true,
            },
          });

          if (existingBatch) {
            return null;
          }

          // Step 2: Create master wallet if user does not have one yet.
          const wallet = await tx.userCreditWallet.upsert({
            where: {
              userId: subscription.userId,
            },
            create: {
              userId: subscription.userId,
              subscriptionTaskCredits: 0,
              earnedTaskCredits: 0,
              purchasedTaskCredits: 0,
              referralTaskCredits: 0,
              visibilityCredits: 0,
            },
            update: {},
          });

          // Step 3: Add subscription credits to master wallet.
          const updatedWallet = await tx.userCreditWallet.update({
            where: {
              userId: subscription.userId,
            },
            data: {
              subscriptionTaskCredits: {
                increment: creditAmount,
              },
            },
          });

          // Step 4: Create subscription credit batch for expiry/tracking.
          const batch = await tx.subscriptionCreditBatch.create({
            data: {
              walletId: wallet.id,
              userId: subscription.userId,
              subscriptionId: subscription.id,
              stripeInvoiceId: grant.stripeInvoiceId,
              periodStart: grant.periodStart,
              periodEnd: grant.periodEnd,
              totalCredits: creditAmount,
              remainingCredits: creditAmount,
              expiresAt,
            },
          });

          // Step 5: Create ledger log so statements can show this credit grant.
          await tx.creditLog.create({
            data: {
              walletId: wallet.id,
              userId: subscription.userId,
              creditType: 'SUBSCRIPTION_TASK',
              action: 'ADD',
              reason: 'SUBSCRIPTION_PURCHASE',
              amount: creditAmount,
              balanceBefore: wallet.subscriptionTaskCredits,
              balanceAfter: updatedWallet.subscriptionTaskCredits,
              subscriptionId: subscription.id,
              subscriptionCreditBatchId: batch.id,
              note: grant.isRenewal
                ? 'Subscription task credits granted for paid renewal invoice ' +
                  grant.stripeInvoiceId +
                  '.'
                : 'Subscription task credits granted after successful subscription payment.',
            },
          });

          return {
            batchId: batch.id,
            balanceBefore: wallet.subscriptionTaskCredits,
            balanceAfter: updatedWallet.subscriptionTaskCredits,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        },
      );

      if (grantResult) {
        try {
          await createSubscriptionNotificationIfAllowed(this.prisma, {
          userId: subscription.userId,
          type: NotificationType.CREDIT_REWARDED,
          category: NotificationCategory.CREDIT_BALANCE,
          title: grant.isRenewal
            ? 'Subscription renewal credits added'
            : 'Subscription credits added',
          body:
            creditAmount +
            ' subscription task credit' +
            (creditAmount === 1 ? '' : 's') +
            ' added to your master wallet.',
          subscriptionId: subscription.id,
          planId: subscription.planId,
          stripeInvoiceId: grant.stripeInvoiceId ?? null,
          amount: creditAmount,
          periodStart: grant.periodStart ?? null,
          periodEnd: grant.periodEnd ?? expiresAt,
          idempotencyKey: grant.stripeInvoiceId
            ? 'subscription-credit-granted-' +
              subscription.id +
              '-' +
              grant.stripeInvoiceId
            : 'subscription-credit-granted-' +
              subscription.id +
              '-' +
              grantResult.batchId,
          data: {
            subscriptionCreditBatchId: grantResult.batchId,
            balanceBefore: grantResult.balanceBefore,
            balanceAfter: grantResult.balanceAfter,
            isRenewal: Boolean(grant.isRenewal),
          },
          });
        } catch (notificationError) {
          console.error(
            'Subscription credit notification failed:',
            notificationError,
          );
        }
      }
    } catch (error) {
      // Stripe may deliver both success event types for the same invoice.
      if (
        grant.stripeInvoiceId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      throw error;
    }
  }
}
