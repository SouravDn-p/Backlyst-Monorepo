-- CreateTable
CREATE TABLE "DomainInteraction" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sourceWebsiteId" TEXT NOT NULL,
    "targetWebsiteId" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "targetDomain" TEXT NOT NULL,
    "normalizedPairKey" TEXT NOT NULL,
    "sourcePrimaryCategoryKey" TEXT,
    "targetPrimaryCategoryKey" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainPairStat" (
    "id" TEXT NOT NULL,
    "normalizedPairKey" TEXT NOT NULL,
    "domainA" TEXT NOT NULL,
    "domainB" TEXT NOT NULL,
    "lastSourceDomain" TEXT,
    "lastTargetDomain" TEXT,
    "lastInteractionAt" TIMESTAMP(3),
    "repeatPairCooldownUntil" TIMESTAMP(3),
    "reciprocalCooldownUntil" TIMESTAMP(3),
    "interactionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainPairStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainInteraction_taskId_key" ON "DomainInteraction"("taskId");

-- CreateIndex
CREATE INDEX "DomainInteraction_sourceDomain_idx" ON "DomainInteraction"("sourceDomain");

-- CreateIndex
CREATE INDEX "DomainInteraction_targetDomain_idx" ON "DomainInteraction"("targetDomain");

-- CreateIndex
CREATE INDEX "DomainInteraction_normalizedPairKey_idx" ON "DomainInteraction"("normalizedPairKey");

-- CreateIndex
CREATE INDEX "DomainInteraction_completedAt_idx" ON "DomainInteraction"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DomainPairStat_normalizedPairKey_key" ON "DomainPairStat"("normalizedPairKey");

-- CreateIndex
CREATE INDEX "DomainPairStat_domainA_idx" ON "DomainPairStat"("domainA");

-- CreateIndex
CREATE INDEX "DomainPairStat_domainB_idx" ON "DomainPairStat"("domainB");

-- CreateIndex
CREATE INDEX "DomainPairStat_repeatPairCooldownUntil_idx" ON "DomainPairStat"("repeatPairCooldownUntil");

-- CreateIndex
CREATE INDEX "DomainPairStat_reciprocalCooldownUntil_idx" ON "DomainPairStat"("reciprocalCooldownUntil");
