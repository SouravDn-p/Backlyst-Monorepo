-- DropIndex
-- NOTE: these indexes are (re)created by the later 20260715142149_phase0_missing_models
-- migration. DROP made conditional (IF EXISTS) so the shadow-DB replay order is
-- tolerant of the out-of-order timestamps and does not fail when the index is absent.
DROP INDEX IF EXISTS "DomainPairStat_sourcePrimaryCategoryKey_idx";

-- DropIndex
DROP INDEX IF EXISTS "DomainPairStat_sourceSecondaryCategoryKey_idx";

-- DropIndex
DROP INDEX IF EXISTS "DomainPairStat_targetPrimaryCategoryKey_idx";

-- DropIndex
DROP INDEX IF EXISTS "DomainPairStat_targetSecondaryCategoryKey_idx";

-- DropIndex
DROP INDEX IF EXISTS "Website_secondaryCategoryKey_idx";

-- AlterTable
ALTER TABLE "MarketplaceModeConfig" ALTER COLUMN "id" SET DEFAULT 'MARKETPLACE_MODE_CONFIG';

-- AlterTable
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN     "internalPriorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.1;
