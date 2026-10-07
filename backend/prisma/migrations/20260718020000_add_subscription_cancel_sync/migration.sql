-- Phase 3: record when cancellation was requested while keeping cancelledAt
-- reserved for the time Stripe actually ends the subscription.
ALTER TABLE "Subscription"
ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3);
