-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "secondaryCategoryKey" TEXT;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_secondaryCategoryKey_fkey" FOREIGN KEY ("secondaryCategoryKey") REFERENCES "WebsiteCategoryKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Website_secondaryCategoryKey_idx" ON "Website"("secondaryCategoryKey");

-- CreateTable
CREATE TABLE "NicheDistributionCap" (
    "id" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'PRIMARY',
    "maxPerWindow" INTEGER NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NicheDistributionCap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NicheDistributionCap_categoryKey_scope_idx" ON "NicheDistributionCap"("categoryKey", "scope");

-- CreateIndex
CREATE INDEX "NicheDistributionCap_isActive_idx" ON "NicheDistributionCap"("isActive");
