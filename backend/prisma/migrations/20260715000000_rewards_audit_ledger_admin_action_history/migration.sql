-- CreateEnum
CREATE TYPE "RewardAuditActorType" AS ENUM ('ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RewardAuditStatus" AS ENUM ('SUCCESS', 'FAILED', 'WARNING');

-- CreateTable
CREATE TABLE "RewardAuditLog" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'REWARDS',
    "action" TEXT NOT NULL,
    "actorType" "RewardAuditActorType" NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "badgeDefinitionId" TEXT,
    "userBadgeId" TEXT,
    "rewardBenefitId" TEXT,
    "rewardLedgerId" TEXT,
    "rewardOutboxId" TEXT,
    "source" TEXT,
    "status" "RewardAuditStatus" NOT NULL DEFAULT 'SUCCESS',
    "reason" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardAuditLog_action_idx" ON "RewardAuditLog"("action");

-- CreateIndex
CREATE INDEX "RewardAuditLog_actorType_idx" ON "RewardAuditLog"("actorType");

-- CreateIndex
CREATE INDEX "RewardAuditLog_actorId_idx" ON "RewardAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "RewardAuditLog_targetUserId_idx" ON "RewardAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "RewardAuditLog_badgeDefinitionId_idx" ON "RewardAuditLog"("badgeDefinitionId");

-- CreateIndex
CREATE INDEX "RewardAuditLog_status_idx" ON "RewardAuditLog"("status");

-- CreateIndex
CREATE INDEX "RewardAuditLog_source_idx" ON "RewardAuditLog"("source");

-- CreateIndex
CREATE INDEX "RewardAuditLog_createdAt_idx" ON "RewardAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "RewardAuditLog" ADD CONSTRAINT "RewardAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAuditLog" ADD CONSTRAINT "RewardAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAuditLog" ADD CONSTRAINT "RewardAuditLog_badgeDefinitionId_fkey" FOREIGN KEY ("badgeDefinitionId") REFERENCES "BadgeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAuditLog" ADD CONSTRAINT "RewardAuditLog_userBadgeId_fkey" FOREIGN KEY ("userBadgeId") REFERENCES "UserBadge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAuditLog" ADD CONSTRAINT "RewardAuditLog_rewardBenefitId_fkey" FOREIGN KEY ("rewardBenefitId") REFERENCES "UserRewardBenefit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAuditLog" ADD CONSTRAINT "RewardAuditLog_rewardLedgerId_fkey" FOREIGN KEY ("rewardLedgerId") REFERENCES "RewardLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAuditLog" ADD CONSTRAINT "RewardAuditLog_rewardOutboxId_fkey" FOREIGN KEY ("rewardOutboxId") REFERENCES "RewardProcessingOutbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
