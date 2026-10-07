-- Spec §7 / M9: composite index for daily suppression sweeps on
-- (marketplaceStatus, isSuppressed, suppressedUntil).
CREATE INDEX "WebsiteMatchingProfile_marketplaceStatus_isSuppressed_suppressedUntil_idx"
  ON "WebsiteMatchingProfile" ("marketplaceStatus", "isSuppressed", "suppressedUntil");

-- Spec §28 / M9: persist the admin who last changed marketplace mode.
ALTER TABLE "MarketplaceModeConfig"
  ADD COLUMN "updatedById" TEXT;

-- M9: remove dead rollout-guard columns no longer referenced by code.
ALTER TABLE "MarketplaceScoringConfig"
  DROP COLUMN "enforceRevalidationAtAcceptance";

ALTER TABLE "MarketplaceScoringConfig"
  DROP COLUMN "enforceRevalidationAtApproval";
