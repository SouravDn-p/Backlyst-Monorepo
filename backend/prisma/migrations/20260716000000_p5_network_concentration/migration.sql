-- AlterTable
ALTER TABLE "MarketplaceScoringConfig"
  ADD COLUMN "maxNetworkConcentrationPerWindow" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "networkConcentrationWindowDays"   INTEGER NOT NULL DEFAULT 7;
