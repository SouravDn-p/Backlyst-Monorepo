-- Website Quality Engine completion (2026-07-18) — schema support
--
-- Adds:
--   1. Configurable quality-composite sub-signal weights + premium-access
--      threshold to MarketplaceScoringConfig (admin-tunable, no deploy needed).
--   2. premiumQualityAccessEligible + lastQualityRecomputeAt to
--      WebsiteMatchingProfile (premium gating + scheduled-recompute freshness).
--   3. QualityScoreHistory time-series table (periodic composite + sub-signal
--      snapshots for trend analytics).

-- 1. MarketplaceScoringConfig: composite sub-signal weights + premium threshold.
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityCompletionWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.25;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityReliabilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.25;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityRatingWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.20;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityActivityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.10;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityConsistencyWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.10;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityDiversityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityBehaviourWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "qualityPremiumAccessThreshold" DOUBLE PRECISION NOT NULL DEFAULT 75;

-- 2. WebsiteMatchingProfile: premium access flag + last scheduled recompute time.
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN "premiumQualityAccessEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN "lastQualityRecomputeAt" TIMESTAMP(3);

-- 3. QualityScoreHistory time-series.
CREATE TABLE "QualityScoreHistory" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "completionScore" DOUBLE PRECISION,
    "reliabilityScore" DOUBLE PRECISION,
    "ratingScore" DOUBLE PRECISION,
    "activityScore" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION,
    "diversityScore" DOUBLE PRECISION,
    "behaviourScore" DOUBLE PRECISION,
    "riskScore" DOUBLE PRECISION,
    "marketplaceStatus" "WebsiteMarketplaceStatus" NOT NULL,
    "trigger" "QualityStatusTrigger" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QualityScoreHistory_websiteId_createdAt_idx" ON "QualityScoreHistory"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "QualityScoreHistory_createdAt_idx" ON "QualityScoreHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "QualityScoreHistory" ADD CONSTRAINT "QualityScoreHistory_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
