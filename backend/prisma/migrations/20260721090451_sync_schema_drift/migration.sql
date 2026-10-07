/*
  Warnings:

  - You are about to drop the column `primaryCategoryKey` on the `Website` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryCategoryKey` on the `Website` table. All the data in the column will be lost.
  - You are about to drop the `MarketplaceOverrideAudit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebsiteCategoryKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebsiteMargetPlaceTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_WebsiteToWebsiteMargetPlaceTag` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[creditAdjustmentId]` on the table `Dispute` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MarketplaceCategoryRole" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MarketplaceOverrideType" ADD VALUE 'LIMIT_BYPASS';
ALTER TYPE "MarketplaceOverrideType" ADD VALUE 'RISK_BYPASS';
ALTER TYPE "MarketplaceOverrideType" ADD VALUE 'PRIORITY';
ALTER TYPE "MarketplaceOverrideType" ADD VALUE 'MANUAL_ASSIGNMENT';
ALTER TYPE "MarketplaceOverrideType" ADD VALUE 'RESTRICTION';

-- AlterEnum
ALTER TYPE "TaskFlowEventType" ADD VALUE 'SYSTEM_AUTO_FAILED';

-- DropForeignKey
ALTER TABLE "Website" DROP CONSTRAINT "Website_primaryCategoryKey_fkey";

-- DropForeignKey
ALTER TABLE "Website" DROP CONSTRAINT "Website_secondaryCategoryKey_fkey";

-- DropForeignKey
ALTER TABLE "_WebsiteToWebsiteMargetPlaceTag" DROP CONSTRAINT "_WebsiteToWebsiteMargetPlaceTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_WebsiteToWebsiteMargetPlaceTag" DROP CONSTRAINT "_WebsiteToWebsiteMargetPlaceTag_B_fkey";

-- AlterTable
ALTER TABLE "MarketplaceOverride" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "taskId" TEXT,
ALTER COLUMN "websiteId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN     "limitedAccessDailyCap" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Website" DROP COLUMN "primaryCategoryKey",
DROP COLUMN "secondaryCategoryKey";

-- AlterTable
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN     "firstSuccessAt" TIMESTAMP(3),
ADD COLUMN     "lastQualityScoreUpdateAt" TIMESTAMP(3),
ADD COLUMN     "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
ALTER COLUMN "lastApplicationAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "minHoursBetweenMatches" DROP NOT NULL;

-- DropTable
DROP TABLE "MarketplaceOverrideAudit";

-- DropTable
DROP TABLE "WebsiteCategoryKey";

-- DropTable
DROP TABLE "WebsiteMargetPlaceTag";

-- DropTable
DROP TABLE "_WebsiteToWebsiteMargetPlaceTag";

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reasonCode" TEXT NOT NULL,
    "explanation" TEXT,
    "overrideId" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeographicDistributionCap" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'PRIMARY',
    "maxPerWindow" INTEGER NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeographicDistributionCap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityTypeDistributionCap" (
    "id" TEXT NOT NULL,
    "placementType" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'PRIMARY',
    "maxPerWindow" INTEGER NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityTypeDistributionCap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCategoryRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCategoryRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceTag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMarketplaceCategory" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "role" "MarketplaceCategoryRole" NOT NULL DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteMarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMarketplaceTag" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteMarketplaceTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskMarketplaceCategory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "role" "MarketplaceCategoryRole" NOT NULL DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskMarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskMarketplaceTag" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskMarketplaceTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminActionLog_adminId_createdAt_idx" ON "AdminActionLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetType_targetId_idx" ON "AdminActionLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminActionLog_action_idx" ON "AdminActionLog"("action");

-- CreateIndex
CREATE INDEX "AdminActionLog_overrideId_idx" ON "AdminActionLog"("overrideId");

-- CreateIndex
CREATE INDEX "GeographicDistributionCap_countryCode_scope_idx" ON "GeographicDistributionCap"("countryCode", "scope");

-- CreateIndex
CREATE INDEX "GeographicDistributionCap_isActive_idx" ON "GeographicDistributionCap"("isActive");

-- CreateIndex
CREATE INDEX "OpportunityTypeDistributionCap_placementType_scope_idx" ON "OpportunityTypeDistributionCap"("placementType", "scope");

-- CreateIndex
CREATE INDEX "OpportunityTypeDistributionCap_isActive_idx" ON "OpportunityTypeDistributionCap"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON "MarketplaceCategory"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_enabled_idx" ON "MarketplaceCategory"("enabled");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_parentId_idx" ON "MarketplaceCategory"("parentId");

-- CreateIndex
CREATE INDEX "MarketplaceCategoryRelation_sourceId_idx" ON "MarketplaceCategoryRelation"("sourceId");

-- CreateIndex
CREATE INDEX "MarketplaceCategoryRelation_targetId_idx" ON "MarketplaceCategoryRelation"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategoryRelation_sourceId_targetId_key" ON "MarketplaceCategoryRelation"("sourceId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceTag_slug_key" ON "MarketplaceTag"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceTag_enabled_idx" ON "MarketplaceTag"("enabled");

-- CreateIndex
CREATE INDEX "WebsiteMarketplaceCategory_websiteId_idx" ON "WebsiteMarketplaceCategory"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteMarketplaceCategory_categoryId_idx" ON "WebsiteMarketplaceCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMarketplaceCategory_websiteId_categoryId_key" ON "WebsiteMarketplaceCategory"("websiteId", "categoryId");

-- CreateIndex
CREATE INDEX "WebsiteMarketplaceTag_websiteId_idx" ON "WebsiteMarketplaceTag"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteMarketplaceTag_tagId_idx" ON "WebsiteMarketplaceTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMarketplaceTag_websiteId_tagId_key" ON "WebsiteMarketplaceTag"("websiteId", "tagId");

-- CreateIndex
CREATE INDEX "TaskMarketplaceCategory_taskId_idx" ON "TaskMarketplaceCategory"("taskId");

-- CreateIndex
CREATE INDEX "TaskMarketplaceCategory_categoryId_idx" ON "TaskMarketplaceCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskMarketplaceCategory_taskId_categoryId_key" ON "TaskMarketplaceCategory"("taskId", "categoryId");

-- CreateIndex
CREATE INDEX "TaskMarketplaceTag_taskId_idx" ON "TaskMarketplaceTag"("taskId");

-- CreateIndex
CREATE INDEX "TaskMarketplaceTag_tagId_idx" ON "TaskMarketplaceTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskMarketplaceTag_taskId_tagId_key" ON "TaskMarketplaceTag"("taskId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_creditAdjustmentId_key" ON "Dispute"("creditAdjustmentId");

-- CreateIndex
CREATE INDEX "Dispute_creditAdjustmentId_idx" ON "Dispute"("creditAdjustmentId");

-- CreateIndex
CREATE INDEX "MarketplaceOverride_taskId_idx" ON "MarketplaceOverride"("taskId");

-- CreateIndex
CREATE INDEX "MarketplaceOverride_accountId_idx" ON "MarketplaceOverride"("accountId");

-- CreateIndex
CREATE INDEX "PlacementTask_lifecycleStatus_placementType_idx" ON "PlacementTask"("lifecycleStatus", "placementType");

-- CreateIndex
CREATE INDEX "PlacementTask_lifecycleStatus_createdAt_idx" ON "PlacementTask"("lifecycleStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PlacementTask_requesterWebsiteId_lifecycleStatus_idx" ON "PlacementTask"("requesterWebsiteId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "RiskEvent_websiteId_type_idx" ON "RiskEvent"("websiteId", "type");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_creditAdjustmentId_fkey" FOREIGN KEY ("creditAdjustmentId") REFERENCES "CreditLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCategory" ADD CONSTRAINT "MarketplaceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketplaceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCategoryRelation" ADD CONSTRAINT "MarketplaceCategoryRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCategoryRelation" ADD CONSTRAINT "MarketplaceCategoryRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMarketplaceCategory" ADD CONSTRAINT "WebsiteMarketplaceCategory_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMarketplaceCategory" ADD CONSTRAINT "WebsiteMarketplaceCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMarketplaceTag" ADD CONSTRAINT "WebsiteMarketplaceTag_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMarketplaceTag" ADD CONSTRAINT "WebsiteMarketplaceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MarketplaceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMarketplaceCategory" ADD CONSTRAINT "TaskMarketplaceCategory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMarketplaceCategory" ADD CONSTRAINT "TaskMarketplaceCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMarketplaceTag" ADD CONSTRAINT "TaskMarketplaceTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMarketplaceTag" ADD CONSTRAINT "TaskMarketplaceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MarketplaceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "WebsiteMatchingProfile_marketplaceStatus_isSuppressed_suppresse" RENAME TO "WebsiteMatchingProfile_marketplaceStatus_isSuppressed_suppr_idx";
