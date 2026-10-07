-- Website Quality Engine (spec §6/§7/§9/§13/§16).
-- Adds automatic status-threshold config knobs, a quality ranking weight, and
-- the quality status-history / audit log with its trigger enum.

-- 1) Trigger enum for the audit log.
CREATE TYPE "QualityStatusTrigger" AS ENUM (
  'TASK_COMPLETED',
  'TASK_REJECTED',
  'TASK_FAILED',
  'TASK_CANCELLED',
  'DISPUTE_RESOLVED',
  'INTERACTION_COMPLETED',
  'SCHEDULED_RECALC',
  'ADMIN_OVERRIDE',
  'ADMIN_RESET',
  'RISK_EVENT'
);

-- 2) Ranking weight for the internal qualityScore (spec §7/§10).
ALTER TABLE "MarketplaceScoringConfig"
  ADD COLUMN "qualityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05;

-- 3) Automatic status thresholds + smoothing controls (spec §6/§7/§9).
ALTER TABLE "MarketplaceScoringConfig"
  ADD COLUMN "qualityActiveThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60,
  ADD COLUMN "qualityLowPriorityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 40,
  ADD COLUMN "qualityLimitedAccessThreshold" DOUBLE PRECISION NOT NULL DEFAULT 25,
  ADD COLUMN "qualityGradualTransitions" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "qualityMinInteractionsForStatus" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "qualityUnderReviewRiskThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60;

-- 4) Quality status-history / audit log (spec §13/§16).
CREATE TABLE "WebsiteQualityStatusLog" (
  "id" TEXT NOT NULL,
  "websiteId" TEXT NOT NULL,
  "previousStatus" "WebsiteMarketplaceStatus" NOT NULL,
  "newStatus" "WebsiteMarketplaceStatus" NOT NULL,
  "previousScore" DOUBLE PRECISION NOT NULL,
  "newScore" DOUBLE PRECISION NOT NULL,
  "trigger" "QualityStatusTrigger" NOT NULL,
  "adminId" TEXT,
  "reasonCode" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebsiteQualityStatusLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteQualityStatusLog_websiteId_createdAt_idx"
  ON "WebsiteQualityStatusLog" ("websiteId", "createdAt");
CREATE INDEX "WebsiteQualityStatusLog_trigger_idx"
  ON "WebsiteQualityStatusLog" ("trigger");
CREATE INDEX "WebsiteQualityStatusLog_newStatus_idx"
  ON "WebsiteQualityStatusLog" ("newStatus");

ALTER TABLE "WebsiteQualityStatusLog"
  ADD CONSTRAINT "WebsiteQualityStatusLog_websiteId_fkey"
  FOREIGN KEY ("websiteId") REFERENCES "Website" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
