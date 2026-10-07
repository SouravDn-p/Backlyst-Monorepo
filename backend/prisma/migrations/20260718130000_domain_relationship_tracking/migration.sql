-- Domain Relationship Tracking audit (2026-07-18) — schema completion.
-- Adds:
--   * DomainInteractionStatus enum (PENDING / ACCEPTED / COMPLETED / REJECTED /
--     CANCELLED / DISPUTED) — audit §8: previously only COMPLETED was tracked.
--   * DomainInteraction.interactionId (surrogate key) — audit §10: an independent
--     interaction id instead of conflating it with taskId.
--   * DomainInteraction.interactionStatus — audit §4/§8: record all terminal states.
--   * DomainRelationshipEvent — audit §11: append-only, immutable per-pair
--     transition history (DomainPairStat is overwritten and loses history).

-- CreateEnum
CREATE TYPE "DomainInteractionStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'DISPUTED'
);

-- AlterTable: DomainInteraction — new surrogate id + niche + status columns.
ALTER TABLE "DomainInteraction"
    ADD COLUMN "interactionId" TEXT,
    ADD COLUMN "interactionStatus" "DomainInteractionStatus" NOT NULL DEFAULT 'COMPLETED';

-- Backfill interactionId for existing rows so the UNIQUE/NOT NULL can be applied.
UPDATE "DomainInteraction"
SET "interactionId" = gen_random_uuid()::text
WHERE "interactionId" IS NULL;

ALTER TABLE "DomainInteraction"
    ALTER COLUMN "interactionId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DomainInteraction_interactionId_key" ON "DomainInteraction"("interactionId");
CREATE INDEX "DomainInteraction_interactionStatus_idx" ON "DomainInteraction"("interactionStatus");

CREATE INDEX "DomainInteraction_sourceWebsiteId_targetWebsiteId_completed_idx" ON "DomainInteraction"("sourceWebsiteId", "targetWebsiteId", "completedAt");

-- CreateTable: append-only per-pair transition history (audit §11).
CREATE TABLE "DomainRelationshipEvent" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainRelationshipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainRelationshipEvent_orderedPairKey_idx" ON "DomainRelationshipEvent"("orderedPairKey");
CREATE INDEX "DomainRelationshipEvent_normalizedPairKey_idx" ON "DomainRelationshipEvent"("normalizedPairKey");
CREATE INDEX "DomainRelationshipEvent_sourceDomain_idx" ON "DomainRelationshipEvent"("sourceDomain");
CREATE INDEX "DomainRelationshipEvent_targetDomain_idx" ON "DomainRelationshipEvent"("targetDomain");
CREATE INDEX "DomainRelationshipEvent_domainA_idx" ON "DomainRelationshipEvent"("domainA");
CREATE INDEX "DomainRelationshipEvent_domainB_idx" ON "DomainRelationshipEvent"("domainB");
CREATE INDEX "DomainRelationshipEvent_interactionStatus_idx" ON "DomainRelationshipEvent"("interactionStatus");
CREATE INDEX "DomainRelationshipEvent_taskId_idx" ON "DomainRelationshipEvent"("taskId");
CREATE INDEX "DomainRelationshipEvent_createdAt_idx" ON "DomainRelationshipEvent"("createdAt");
