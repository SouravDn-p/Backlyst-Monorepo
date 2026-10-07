-- Visibility Control audit (2026-07-18) — schema support
-- Adds explicit RESTRICTED / UNDER_REVIEW visibility factors + a RESTRICTED
-- daily-cap fraction to MarketplaceScoringConfig, and a dedicated
-- VisibilityAdjustmentLog table for per-factor visibility adjustment /
-- override-application observability.

-- AlterTable MarketplaceScoringConfig: add status visibility factors + RESTRICTED cap fraction
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "restrictedVisibilityFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.4;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "underReviewVisibilityFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.7;
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "restrictedDailyCapFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.34;

-- CreateTable VisibilityAdjustmentLog
CREATE TABLE "VisibilityAdjustmentLog" (
    "id" TEXT NOT NULL,
    "rankingRunLogId" TEXT,
    "providerId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "beforeScore" DOUBLE PRECISION NOT NULL,
    "afterScore" DOUBLE PRECISION NOT NULL,
    "factor" DOUBLE PRECISION,
    "marketplaceStatus" TEXT,
    "reasonCode" TEXT NOT NULL,
    "marketplaceMode" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisibilityAdjustmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisibilityAdjustmentLog_providerId_createdAt_idx" ON "VisibilityAdjustmentLog"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "VisibilityAdjustmentLog_websiteId_createdAt_idx" ON "VisibilityAdjustmentLog"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "VisibilityAdjustmentLog_taskId_createdAt_idx" ON "VisibilityAdjustmentLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "VisibilityAdjustmentLog_rankingRunLogId_idx" ON "VisibilityAdjustmentLog"("rankingRunLogId");

-- CreateIndex
CREATE INDEX "VisibilityAdjustmentLog_adjustmentType_idx" ON "VisibilityAdjustmentLog"("adjustmentType");
