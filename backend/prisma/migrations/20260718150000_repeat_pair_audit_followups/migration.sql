-- Migration: Repeat Pair Rules Audit (2026-07-18) follow-up fixes
-- Implements R-Repeat-2 (marketplaceMode on validation log),
-- R-Repeat-4 (DomainRelationshipEvent retention/archive), and the
-- relationshipEventRetentionDays config field.

-- R-Repeat-2: add marketplaceMode column + index to MarketplaceValidationLog
CREATE INDEX "MarketplaceValidationLog_marketplaceMode_idx" ON "MarketplaceValidationLog"("marketplaceMode");

-- R-Repeat-4: retention window for the append-only DomainRelationshipEvent table
ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "relationshipEventRetentionDays" INTEGER NOT NULL DEFAULT 180;

-- R-Repeat-4: cold-storage archive table for aged DomainRelationshipEvent rows.
-- id is preserved from the source row so re-archiving is idempotent.
CREATE TABLE "DomainRelationshipEventArchive" (
    "id" TEXT NOT NULL,
    "orderedPairKey" TEXT NOT NULL,
    "normalizedPairKey" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "targetDomain" TEXT NOT NULL,
    "domainA" TEXT NOT NULL,
    "domainB" TEXT NOT NULL,
    "interactionStatus" "DomainInteractionStatus" NOT NULL,
    "repeatPairCooldownUntil" TIMESTAMP(3),
    "reciprocalCooldownUntil" TIMESTAMP(3),
    "sourceWebsiteId" TEXT NOT NULL,
    "targetWebsiteId" TEXT NOT NULL,
    "taskId" TEXT,
    "sourcePrimaryCategoryKey" TEXT,
    "targetPrimaryCategoryKey" TEXT,
    "sourceSecondaryCategoryKey" TEXT,
    "targetSecondaryCategoryKey" TEXT,
    "trigger" TEXT NOT NULL,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainRelationshipEventArchive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DomainRelationshipEventArchive_normalizedPairKey_idx" ON "DomainRelationshipEventArchive"("normalizedPairKey");
CREATE INDEX "DomainRelationshipEventArchive_orderedPairKey_idx" ON "DomainRelationshipEventArchive"("orderedPairKey");
CREATE INDEX "DomainRelationshipEventArchive_sourceDomain_idx" ON "DomainRelationshipEventArchive"("sourceDomain");
CREATE INDEX "DomainRelationshipEventArchive_targetDomain_idx" ON "DomainRelationshipEventArchive"("targetDomain");
CREATE INDEX "DomainRelationshipEventArchive_originalCreatedAt_idx" ON "DomainRelationshipEventArchive"("originalCreatedAt");
