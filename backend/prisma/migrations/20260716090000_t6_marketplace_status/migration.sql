-- Spec §7: differentiate non-active WebsiteMarketplaceStatus semantics.

-- Per-profile daily match cap to throttle LIMITED_ACCESS sites (overrides the
-- global MarketplaceScoringConfig.maxProviderMatchesPerDay). Null => global cap.
ALTER TABLE "WebsiteMatchingProfile"
  ADD COLUMN "marketplaceStatusDailyCap" INTEGER;

-- Final-score multiplier for LOW_PRIORITY profiles (e.g. 0.7 reduces visibility).
ALTER TABLE "MarketplaceScoringConfig"
  ADD COLUMN "lowPriorityFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.7;
