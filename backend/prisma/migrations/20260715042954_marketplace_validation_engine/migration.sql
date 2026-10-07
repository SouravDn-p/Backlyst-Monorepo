-- AlterTable
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN     "enforceRevalidationAtAcceptance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enforceRevalidationAtApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reciprocalCooldownDays" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "repeatPairCooldownDays" INTEGER NOT NULL DEFAULT 90;

-- AlterTable
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN     "tierVelocityLimit" INTEGER,
ADD COLUMN     "weeklyInteractionLimit" INTEGER;

-- CreateTable
CREATE TABLE "MarketplaceValidationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT,
    "taskId" TEXT,
    "stage" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "failedRule" TEXT,
    "marketplaceMode" TEXT,
    "overrideApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceValidationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOverrideAudit" (
    "id" TEXT NOT NULL,
    "overrideId" TEXT,
    "adminId" TEXT NOT NULL,
    "websiteId" TEXT,
    "taskId" TEXT,
    "rule" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceOverrideAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceValidationLog_userId_createdAt_idx" ON "MarketplaceValidationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceValidationLog_taskId_createdAt_idx" ON "MarketplaceValidationLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceValidationLog_stage_idx" ON "MarketplaceValidationLog"("stage");

-- CreateIndex
CREATE INDEX "MarketplaceOverrideAudit_adminId_createdAt_idx" ON "MarketplaceOverrideAudit"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceOverrideAudit_taskId_idx" ON "MarketplaceOverrideAudit"("taskId");
