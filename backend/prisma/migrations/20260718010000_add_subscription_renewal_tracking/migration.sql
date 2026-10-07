-- Phase 2: represent recoverable renewal-payment failure separately from cancel.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';

-- Store the latest renewal result for user support and webhook reconciliation.
ALTER TABLE "Subscription"
ADD COLUMN "lastStripeInvoiceId" TEXT,
ADD COLUMN "lastPaidAt" TIMESTAMP(3),
ADD COLUMN "lastPaymentFailedAt" TIMESTAMP(3),
ADD COLUMN "lastPaymentFailureReason" TEXT;

-- Bind every subscription-credit grant to the Stripe invoice and billing period.
ALTER TABLE "SubscriptionCreditBatch"
ADD COLUMN "stripeInvoiceId" TEXT,
ADD COLUMN "periodStart" TIMESTAMP(3),
ADD COLUMN "periodEnd" TIMESTAMP(3);

-- Stripe can retry or emit multiple paid events; one invoice still grants once.
CREATE UNIQUE INDEX "SubscriptionCreditBatch_stripeInvoiceId_key"
ON "SubscriptionCreditBatch"("stripeInvoiceId");
