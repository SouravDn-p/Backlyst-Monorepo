-- Phase 1: persist Stripe identity and billing-period state locally so later
-- webhook events can update the correct subscription without using user email.
ALTER TABLE "Subscription"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- A Stripe subscription must map to at most one local subscription.
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key"
ON "Subscription"("stripeSubscriptionId");

-- Customer lookup supports support/admin reconciliation with Stripe.
CREATE INDEX "Subscription_stripeCustomerId_idx"
ON "Subscription"("stripeCustomerId");
