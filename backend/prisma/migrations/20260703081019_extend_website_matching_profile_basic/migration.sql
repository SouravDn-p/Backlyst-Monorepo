-- CreateEnum
CREATE TYPE "WebsiteMarketplaceStatus" AS ENUM ('ACTIVE', 'LOW_PRIORITY', 'LIMITED_ACCESS', 'UNDER_REVIEW', 'RESTRICTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN     "diversityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "firstSuccessBoostActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "forceNewDomainNext" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forceNewDomainUntil" TIMESTAMP(3),
ADD COLUMN     "internalPriorityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "marketplaceStatus" "WebsiteMarketplaceStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "successfulInteractions" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_marketplaceStatus_idx" ON "WebsiteMatchingProfile"("marketplaceStatus");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_internalPriorityScore_idx" ON "WebsiteMatchingProfile"("internalPriorityScore");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_riskScore_idx" ON "WebsiteMatchingProfile"("riskScore");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_forceNewDomainNext_idx" ON "WebsiteMatchingProfile"("forceNewDomainNext");
