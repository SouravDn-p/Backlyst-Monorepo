import { SubscriptionStatus, UserRole, UserStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReferrerService } from 'src/modules/credit/referrer/referrer.service';
import { UserSubscriptionService } from './user-subscription.service';

// These tests model Stripe events without calling Stripe or a real database.
// They protect payment-state transitions and credit idempotency from regressions.
describe('UserSubscriptionService subscription webhook edge cases', () => {
  let service: UserSubscriptionService;
  let prisma: any;
  let stripe: any;
  let referrerService: any;

  const subscription = {
    id: 'sub_local_1',
    userId: 'user_1',
    planId: 'plan_1',
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: 'sub_stripe_1',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
    cancellationRequestedAt: null,
  };

  const freePlan = {
    id: 'plan_free_1',
    billingInterval: 'MONTHLY',
  };

  const stripeSubscription = {
    id: 'sub_stripe_1',
    customer: 'cus_1',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [
        {
          current_period_start: 1767225600,
          current_period_end: 1769904000,
        },
      ],
    },
  };

  beforeEach(() => {
    prisma = {
      subscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      subscriptionPlan: {
        findFirst: jest.fn(),
      },
      subscriptionCreditBatch: {
        aggregate: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isDeleted: false,
        }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notification_1' }),
      },
      $transaction: jest.fn(),
    };

    stripe = {
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    referrerService = {
      unlockPaidSubscriptionStage: jest.fn(),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') {
          return 'sk_test_123';
        }

        return undefined;
      }),
    };

    service = new UserSubscriptionService(
      prisma as PrismaService,
      configService as unknown as ConfigService,
      referrerService as ReferrerService,
    );
    (service as any).stripe = stripe;

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        subscription: {
          update: prisma.subscription.update,
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user_1',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            isDeleted: false,
          }),
        },
        notification: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'notification_1' }),
        },
      }),
    );
  });

  // Renewal payment: grant one auditable credit batch for the paid invoice.
  it('grants subscription credits once for a paid renewal invoice', async () => {
    const tx = {
      subscription: {
        update: jest.fn().mockResolvedValue(subscription),
      },
      subscriptionCreditBatch: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'batch_1' }),
      },
      userCreditWallet: {
        upsert: jest.fn().mockResolvedValue({
          id: 'wallet_1',
          subscriptionTaskCredits: 2,
        }),
        update: jest.fn().mockResolvedValue({
          subscriptionTaskCredits: 12,
        }),
      },
      creditLog: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isDeleted: false,
        }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notification_1' }),
      },
    };

    prisma.subscription.findUnique
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({
        ...subscription,
        plan: {
          taskCreditsPerCycle: 10,
          billingInterval: 'MONTHLY',
        },
      });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    stripe.subscriptions.retrieve.mockResolvedValue(stripeSubscription);

    const result = await service.handleStripeWebhookEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'inv_renewal_1',
          billing_reason: 'subscription_cycle',
          subscription: 'sub_stripe_1',
          status_transitions: {
            paid_at: 1767225600,
          },
        },
      },
    });

    expect(result).toEqual({ received: true, status: 'renewal_success' });
    expect(tx.subscriptionCreditBatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeInvoiceId: 'inv_renewal_1',
        totalCredits: 10,
        remainingCredits: 10,
      }),
    });
    expect(tx.userCreditWallet.update).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: {
        subscriptionTaskCredits: {
          increment: 10,
        },
      },
    });
    expect(tx.creditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ADD',
        creditType: 'SUBSCRIPTION_TASK',
        reason: 'SUBSCRIPTION_PURCHASE',
        amount: 10,
      }),
    });
  });

  // Webhook retry: repeated paid events must not increase the wallet twice.
  it('does not grant duplicate credits when renewal invoice batch already exists', async () => {
    const tx = {
      subscription: {
        update: jest.fn().mockResolvedValue(subscription),
      },
      subscriptionCreditBatch: {
        findFirst: jest.fn().mockResolvedValue({ id: 'batch_existing' }),
        create: jest.fn(),
      },
      userCreditWallet: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
      creditLog: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isDeleted: false,
        }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notification_1' }),
      },
    };

    prisma.subscription.findUnique
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({
        ...subscription,
        plan: {
          taskCreditsPerCycle: 10,
          billingInterval: 'MONTHLY',
        },
      });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    stripe.subscriptions.retrieve.mockResolvedValue(stripeSubscription);

    await service.handleStripeWebhookEvent({
      type: 'invoice.paid',
      data: {
        object: {
          id: 'inv_renewal_1',
          billing_reason: 'subscription_cycle',
          subscription: 'sub_stripe_1',
        },
      },
    });

    expect(tx.subscriptionCreditBatch.findFirst).toHaveBeenCalledWith({
      where: { stripeInvoiceId: 'inv_renewal_1' },
      select: { id: true },
    });
    expect(tx.userCreditWallet.update).not.toHaveBeenCalled();
    expect(tx.subscriptionCreditBatch.create).not.toHaveBeenCalled();
    expect(tx.creditLog.create).not.toHaveBeenCalled();
  });

  // Failed renewal: preserve the subscription for Stripe retries but grant nothing.
  it('marks subscription past due on renewal payment failure without granting credits', async () => {
    prisma.subscription.findUnique.mockResolvedValue(subscription);

    const result = await service.handleStripeWebhookEvent({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_failed_1',
          subscription: 'sub_stripe_1',
          attempt_count: 2,
        },
      },
    });

    expect(result).toEqual({
      received: true,
      status: 'renewal_payment_failed',
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_local_1' },
      data: expect.objectContaining({
        status: SubscriptionStatus.PAST_DUE,
        lastStripeInvoiceId: 'inv_failed_1',
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  // Delayed payment: Checkout completion alone is not proof of payment.
  it('does not activate or grant credits while checkout payment is pending', async () => {
    const result = await service.handleStripeWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_pending_1',
          payment_status: 'unpaid',
          metadata: {
            userId: 'user_1',
            planId: 'plan_1',
          },
        },
      },
    });

    expect(result).toEqual({ received: true, status: 'payment_pending' });
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(referrerService.unlockPaidSubscriptionStage).not.toHaveBeenCalled();
  });

  // Initial payment: invoice identity also protects Checkout/success-route races.
  it('uses the initial Stripe invoice ID to prevent duplicate checkout grants', async () => {
    const tx = {
      subscription: {
        update: jest.fn().mockResolvedValue(subscription),
      },
      subscriptionCreditBatch: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'batch_initial_1' }),
      },
      userCreditWallet: {
        upsert: jest.fn().mockResolvedValue({
          id: 'wallet_1',
          subscriptionTaskCredits: 0,
        }),
        update: jest.fn().mockResolvedValue({
          subscriptionTaskCredits: 10,
        }),
      },
      creditLog: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isDeleted: false,
        }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notification_1' }),
      },
    };

    prisma.subscription.findUnique
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({
        ...subscription,
        plan: {
          taskCreditsPerCycle: 10,
          billingInterval: 'MONTHLY',
        },
      });
    prisma.subscription.update.mockResolvedValue(subscription);
    prisma.$transaction
      .mockImplementationOnce(async (callback: any) => callback(prisma))
      .mockImplementationOnce(async (callback: any) => callback(tx));
    stripe.subscriptions.retrieve.mockResolvedValue(stripeSubscription);

    const result = await service.handleStripeWebhookEvent({
      type: 'checkout.session.async_payment_succeeded',
      data: {
        object: {
          id: 'cs_paid_1',
          payment_status: 'paid',
          customer: 'cus_1',
          subscription: 'sub_stripe_1',
          invoice: 'inv_initial_1',
          metadata: {
            userId: 'user_1',
            planId: 'plan_1',
          },
        },
      },
    });

    expect(result).toEqual({ received: true, status: 'success' });
    expect(tx.subscriptionCreditBatch.findFirst).toHaveBeenCalledWith({
      where: { stripeInvoiceId: 'inv_initial_1' },
      select: { id: true },
    });
    expect(tx.subscriptionCreditBatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeInvoiceId: 'inv_initial_1',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2026-02-01T00:00:00.000Z'),
      }),
    });
    expect(referrerService.unlockPaidSubscriptionStage).toHaveBeenCalledWith(
      'user_1',
      'sub_local_1',
    );
  });

  // Final Stripe deletion ends access and records the actual cancellation time.
  it('finalizes a period-end cancellation from Stripe', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      ...subscription,
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: new Date('2026-01-10T00:00:00.000Z'),
    });
    prisma.subscription.update.mockResolvedValue({ id: 'sub_local_1' });

    const result = await service.handleStripeWebhookEvent({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          ...stripeSubscription,
          status: 'canceled',
          cancel_at_period_end: false,
          ended_at: 1769904000,
        },
      },
    });

    expect(result).toEqual({
      received: true,
      status: 'subscription_cancelled',
      subscriptionId: 'sub_local_1',
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_local_1' },
      data: expect.objectContaining({
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false,
        cancelAtPeriodEnd: false,
        cancellationRequestedAt: null,
        cancelledAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
    });
  });

  // User cancellation disables renewal but leaves the current period active.
  it('schedules cancellation at period end through Stripe', async () => {
    prisma.subscription.findFirst.mockResolvedValue(subscription);
    prisma.subscription.findUnique
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({
        id: 'sub_local_1',
        status: SubscriptionStatus.ACTIVE,
        autoRenew: false,
        cancelAtPeriodEnd: true,
        cancellationRequestedAt: new Date('2026-01-10T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      });
    prisma.subscription.update.mockResolvedValue({ id: 'sub_local_1' });
    stripe.subscriptions.update.mockResolvedValue({
      ...stripeSubscription,
      cancel_at_period_end: true,
      canceled_at: 1768003200,
    });

    await service.cencelSubscription('user_1');

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_1', {
      cancel_at_period_end: true,
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_local_1' },
      data: expect.objectContaining({
        autoRenew: false,
        cancelAtPeriodEnd: true,
      }),
    });
  });

  // Verified signup should activate one default free plan when no other active plan exists.
  it('activates the default free subscription once for a verified user', async () => {
    const freeCreditTx = {
      subscription: {
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: 'free_sub_1',
          userId: 'user_1',
          planId: freePlan.id,
          startDate: new Date('2026-08-16T00:00:00.000Z'),
          endDate: new Date('2026-09-16T00:00:00.000Z'),
          currentPeriodStart: new Date('2026-08-16T00:00:00.000Z'),
          currentPeriodEnd: new Date('2026-09-16T00:00:00.000Z'),
        }),
      },
      subscriptionCreditBatch: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'batch_free_1' }),
      },
      userCreditWallet: {
        upsert: jest.fn().mockResolvedValue({
          id: 'wallet_1',
          subscriptionTaskCredits: 0,
        }),
        update: jest.fn().mockResolvedValue({
          subscriptionTaskCredits: 1,
        }),
      },
      creditLog: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isDeleted: false,
        }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notification_1' }),
      },
    };

    prisma.subscriptionPlan.findFirst.mockResolvedValue(freePlan);
    prisma.subscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.subscription.findUnique.mockResolvedValue({
      id: 'free_sub_1',
      userId: 'user_1',
      planId: freePlan.id,
      startDate: new Date('2026-08-16T00:00:00.000Z'),
      endDate: new Date('2026-09-16T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-16T00:00:00.000Z'),
      plan: {
        taskCreditsPerCycle: 1,
        billingInterval: 'MONTHLY',
      },
    });
    prisma.$transaction
      .mockImplementationOnce(async (callback: any) => callback(freeCreditTx))
      .mockImplementationOnce(async (callback: any) => callback(freeCreditTx));

    const result = await service.ensureDefaultFreeSubscription('user_1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'free_sub_1',
        planId: 'plan_free_1',
      }),
    );
    expect(freeCreditTx.subscription.create).toHaveBeenCalled();
    expect(freeCreditTx.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
        id: {
          not: 'free_sub_1',
        },
      },
      data: expect.objectContaining({
        status: SubscriptionStatus.CANCELLED,
      }),
    });
    expect(freeCreditTx.subscriptionCreditBatch.create).toHaveBeenCalled();
  });

  // When paid access truly ends, the user should fall back to the free plan automatically.
  it('downgrades to the default free subscription after a Stripe cancellation', async () => {
    const downgradeTx = {
      subscription: {
        update: jest.fn()
          .mockResolvedValueOnce({ id: 'sub_local_1', userId: 'user_1', status: SubscriptionStatus.CANCELLED })
          .mockResolvedValueOnce({
            id: 'free_sub_2',
            userId: 'user_1',
            planId: freePlan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
          }),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          isDeleted: false,
        }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notification_1' }),
      },
    };

    prisma.subscription.findUnique.mockResolvedValueOnce({
      ...subscription,
      userId: 'user_1',
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: new Date('2026-01-10T00:00:00.000Z'),
    });
    prisma.subscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'free_sub_2',
        userId: 'user_1',
        planId: freePlan.id,
        currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
      });
    prisma.subscriptionPlan.findFirst.mockResolvedValue(freePlan);
    prisma.$transaction
      .mockImplementationOnce(async (callback: any) => callback(downgradeTx))
      .mockImplementationOnce(async (callback: any) => callback(downgradeTx));

    const result = await service.handleStripeWebhookEvent({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          ...stripeSubscription,
          status: 'canceled',
          cancel_at_period_end: false,
          ended_at: 1769904000,
        },
      },
    });

    expect(result).toEqual({
      received: true,
      status: 'subscription_cancelled',
      subscriptionId: 'sub_local_1',
    });
    expect(prisma.subscriptionPlan.findFirst).toHaveBeenCalledWith({
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
    expect(downgradeTx.subscription.update).toHaveBeenLastCalledWith({
      where: {
        id: 'free_sub_2',
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: false,
        cancelAtPeriodEnd: false,
        cancellationRequestedAt: null,
        cancelledAt: null,
      },
    });
  });

  // Resume reverses a scheduled cancellation before Stripe ends the subscription.
  it('resumes auto-renewal before the subscription period ends', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      ...subscription,
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: new Date('2026-01-10T00:00:00.000Z'),
    });
    prisma.subscription.findUnique
      .mockResolvedValueOnce({
        ...subscription,
        cancelAtPeriodEnd: true,
        cancellationRequestedAt: new Date('2026-01-10T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'sub_local_1',
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        cancellationRequestedAt: null,
        currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      });
    prisma.subscription.update.mockResolvedValue({ id: 'sub_local_1' });
    stripe.subscriptions.update.mockResolvedValue({
      ...stripeSubscription,
      cancel_at_period_end: false,
      canceled_at: null,
    });

    await service.resumeSubscription('user_1');

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_1', {
      cancel_at_period_end: false,
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_local_1' },
      data: expect.objectContaining({
        autoRenew: true,
        cancelAtPeriodEnd: false,
        cancellationRequestedAt: null,
      }),
    });
  });
});
