-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskEventType" AS ENUM ('DISPUTE', 'REJECTION', 'FAILURE', 'ABUSE', 'SUCCESS');

-- CreateEnum
CREATE TYPE "MarketplaceMode" AS ENUM ('EARLY_STAGE', 'SCALING');

-- AlterTable: secondary-niche capture on DomainInteraction (spec §12 / T-06)
ALTER TABLE "DomainInteraction" ADD COLUMN     "sourceSecondaryCategoryKey" TEXT;
ALTER TABLE "DomainInteraction" ADD COLUMN     "targetSecondaryCategoryKey" TEXT;

CREATE INDEX "DomainInteraction_sourcePrimaryCategoryKey_idx" ON "DomainInteraction"("sourcePrimaryCategoryKey");
CREATE INDEX "DomainInteraction_targetPrimaryCategoryKey_idx" ON "DomainInteraction"("targetPrimaryCategoryKey");
CREATE INDEX "DomainInteraction_sourceSecondaryCategoryKey_idx" ON "DomainInteraction"("sourceSecondaryCategoryKey");
CREATE INDEX "DomainInteraction_targetSecondaryCategoryKey_idx" ON "DomainInteraction"("targetSecondaryCategoryKey");

-- CreateTable: Dispute (spec §25)
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "requesterWebsiteId" TEXT NOT NULL,
    "providerWebsiteId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "creditAdjustmentId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Dispute_taskId_idx" ON "Dispute"("taskId");
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");
CREATE INDEX "Dispute_requesterWebsiteId_idx" ON "Dispute"("requesterWebsiteId");
CREATE INDEX "Dispute_providerWebsiteId_idx" ON "Dispute"("providerWebsiteId");

-- CreateTable: RiskEvent (spec §15)
CREATE TABLE "RiskEvent" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" "RiskEventType" NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "riskScoreAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RiskEvent_websiteId_createdAt_idx" ON "RiskEvent"("websiteId", "createdAt");
CREATE INDEX "RiskEvent_type_idx" ON "RiskEvent"("type");

-- CreateTable: MarketplaceModeConfig (spec §28)
CREATE TABLE "MarketplaceModeConfig" (
    "id" TEXT NOT NULL,
    "mode" "MarketplaceMode" NOT NULL DEFAULT 'EARLY_STAGE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preset" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceModeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ManualMatchQueue (spec §18 / §21)
CREATE TABLE "ManualMatchQueue" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "providerWebsiteId" TEXT NOT NULL,
    "requesterWebsiteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "note" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualMatchQueue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualMatchQueue_taskId_idx" ON "ManualMatchQueue"("taskId");
CREATE INDEX "ManualMatchQueue_providerWebsiteId_idx" ON "ManualMatchQueue"("providerWebsiteId");
CREATE INDEX "ManualMatchQueue_requesterWebsiteId_idx" ON "ManualMatchQueue"("requesterWebsiteId");
CREATE INDEX "ManualMatchQueue_status_idx" ON "ManualMatchQueue"("status");

-- AlterTable: add niche tags to DomainPairStat (spec §12 / T-07) so
-- NicheDistributionCap counting works on the aggregate pair stat.
ALTER TABLE "DomainPairStat" ADD COLUMN     "sourcePrimaryCategoryKey" TEXT;
ALTER TABLE "DomainPairStat" ADD COLUMN     "targetPrimaryCategoryKey" TEXT;
ALTER TABLE "DomainPairStat" ADD COLUMN     "sourceSecondaryCategoryKey" TEXT;
ALTER TABLE "DomainPairStat" ADD COLUMN     "targetSecondaryCategoryKey" TEXT;

CREATE INDEX "DomainPairStat_sourcePrimaryCategoryKey_idx" ON "DomainPairStat"("sourcePrimaryCategoryKey");
CREATE INDEX "DomainPairStat_targetPrimaryCategoryKey_idx" ON "DomainPairStat"("targetPrimaryCategoryKey");
CREATE INDEX "DomainPairStat_sourceSecondaryCategoryKey_idx" ON "DomainPairStat"("sourceSecondaryCategoryKey");
CREATE INDEX "DomainPairStat_targetSecondaryCategoryKey_idx" ON "DomainPairStat"("targetSecondaryCategoryKey");
