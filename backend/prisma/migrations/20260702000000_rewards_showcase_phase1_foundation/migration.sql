-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('MARKETPLACE', 'KICKSTARTER', 'HALL_OF_FAME', 'ADMIN_FEATURED');

-- CreateEnum
CREATE TYPE "BadgeScope" AS ENUM ('USER_PROFILE', 'PROVIDER_PROFILE', 'REQUESTER_PROFILE');

-- CreateEnum
CREATE TYPE "BadgeRoleScope" AS ENUM ('ANY', 'REQUESTER', 'PROVIDER');

-- CreateEnum
CREATE TYPE "UserBadgeStatus" AS ENUM ('LOCKED', 'ELIGIBLE', 'EARNED', 'ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "BadgeTriggerType" AS ENUM ('ACCOUNT_VERIFIED', 'EARLY_ADOPTER', 'FIRST_SUCCESS', 'VERIFIED_TASK_COUNT', 'APPROVAL_RATE', 'RESPONSE_TIME', 'REVIEW_TIME', 'DISPUTE_RATE', 'REVISION_RATE', 'STREAK', 'LOW_DISPUTE', 'KICKSTARTER_TIER', 'HALL_OF_FAME', 'MANUAL');

-- CreateEnum
CREATE TYPE "BadgeRewardType" AS ENUM ('RECOGNITION_ONLY', 'TASK_CREDIT', 'VISIBILITY_BOOST', 'PRIORITY_BOOST', 'SUPPORT_PRIORITY');

-- CreateEnum
CREATE TYPE "RewardLedgerType" AS ENUM ('BADGE_EARNED', 'BADGE_ACTIVATED', 'BADGE_RENEWED', 'BADGE_EXPIRED', 'BADGE_DEACTIVATED', 'BADGE_REVOKED', 'BADGE_REWARD_GRANTED', 'BADGE_REWARD_REMOVED', 'MILESTONE_REWARD', 'WEEKLY_CONTRIBUTION', 'STREAK_UPDATED', 'ADDITIONAL_REWARD_GRANTED', 'ADMIN_ADJUSTMENT', 'SHOWCASE_FEATURED', 'SHOWCASE_HIDDEN');

-- CreateEnum
CREATE TYPE "RewardBenefitStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ShowcaseSection" AS ENUM ('TOP_CONTRIBUTORS', 'TRUSTED_PARTNERS', 'FEATURED_MEMBERS', 'FEATURED_WEBSITES', 'MOST_SUCCESSFUL_WEBSITES', 'HIGHEST_RATED_PROVIDERS', 'RISING_STARS', 'TOP_PERFORMERS_WEEK', 'TOP_PERFORMERS_MONTH', 'ADMIN_FEATURED_MEMBERS');

-- CreateEnum
CREATE TYPE "ShowcaseEntityType" AS ENUM ('USER', 'WEBSITE');

-- CreateEnum
CREATE TYPE "RankingPeriod" AS ENUM ('ALL_TIME', 'THIS_WEEK', 'THIS_MONTH', 'LAST_30_DAYS', 'THIS_YEAR');

-- CreateEnum
CREATE TYPE "ShowcaseLinkType" AS ENUM ('DOFOLLOW', 'NOFOLLOW', 'SPONSORED');

-- CreateEnum
CREATE TYPE "RewardOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "BadgeCategory" NOT NULL DEFAULT 'MARKETPLACE',
    "requirementText" TEXT,
    "rewardImpactText" TEXT,
    "badgeScope" "BadgeScope" NOT NULL DEFAULT 'USER_PROFILE',
    "roleScope" "BadgeRoleScope" NOT NULL DEFAULT 'ANY',
    "triggerType" "BadgeTriggerType" NOT NULL,
    "threshold" INTEGER,
    "secondaryThreshold" INTEGER,
    "isPersistent" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rewardType" "BadgeRewardType" NOT NULL DEFAULT 'RECOGNITION_ONLY',
    "rewardValue" INTEGER,
    "rewardMeta" JSONB,
    "validityDays" INTEGER,
    "refreshWindowDays" INTEGER,
    "gracePeriodDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "status" "UserBadgeStatus" NOT NULL DEFAULT 'LOCKED',
    "earnedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastQualifiedAt" TIMESTAMP(3),
    "lastEvaluatedAt" TIMESTAMP(3),
    "nextEvaluationAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "triggerTaskId" TEXT,
    "triggerWebsiteId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRewardProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalApprovedTasks" INTEGER NOT NULL DEFAULT 0,
    "providerApprovedTasks" INTEGER NOT NULL DEFAULT 0,
    "requesterCompletedTasks" INTEGER NOT NULL DEFAULT 0,
    "providerReviewedTasks" INTEGER NOT NULL DEFAULT 0,
    "providerApprovalRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerDisputeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerRevisionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerResponseRate24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerFastResponseCount" INTEGER NOT NULL DEFAULT 0,
    "providerResponseOpportunityCount" INTEGER NOT NULL DEFAULT 0,
    "requesterReviewRate72h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requesterFastReviewCount" INTEGER NOT NULL DEFAULT 0,
    "requesterReviewOpportunityCount" INTEGER NOT NULL DEFAULT 0,
    "requesterDisputeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStreakCount" INTEGER NOT NULL DEFAULT 0,
    "bestStreakCount" INTEGER NOT NULL DEFAULT 0,
    "milestoneTaskCount" INTEGER NOT NULL DEFAULT 0,
    "nextMilestoneAt" INTEGER NOT NULL DEFAULT 10,
    "uniqueRequesterCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueProviderCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueDomainCount" INTEGER NOT NULL DEFAULT 0,
    "earnedBadgeCount" INTEGER NOT NULL DEFAULT 0,
    "activeRewardCount" INTEGER NOT NULL DEFAULT 0,
    "lastRewardEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserRewardProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRewardBenefit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardCode" TEXT NOT NULL,
    "rewardType" "BadgeRewardType" NOT NULL,
    "status" "RewardBenefitStatus" NOT NULL DEFAULT 'ACTIVE',
    "value" INTEGER,
    "metadata" JSONB,
    "sourceBadgeId" TEXT,
    "sourceTaskId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserRewardBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "badgeId" TEXT,
    "sourceWebsiteId" TEXT,
    "rewardType" "RewardLedgerType" NOT NULL,
    "rewardCode" TEXT NOT NULL,
    "rewardValue" INTEGER,
    "eventKey" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalRewardDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rewardType" "BadgeRewardType" NOT NULL,
    "requirementText" TEXT,
    "rewardValueText" TEXT,
    "roleScope" "BadgeRoleScope" NOT NULL DEFAULT 'ANY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdditionalRewardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardProcessingOutbox" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "RewardOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RewardProcessingOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityShowcaseEntry" (
    "id" TEXT NOT NULL,
    "section" "ShowcaseSection" NOT NULL,
    "entityType" "ShowcaseEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "featuredFrom" TIMESTAMP(3),
    "featuredUntil" TIMESTAMP(3),
    "showExternalLink" BOOLEAN NOT NULL DEFAULT false,
    "linkType" "ShowcaseLinkType",
    "createdByAdminId" TEXT,
    "updatedByAdminId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityShowcaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRankingSnapshot" (
    "id" TEXT NOT NULL,
    "section" "ShowcaseSection" NOT NULL,
    "period" "RankingPeriod" NOT NULL,
    "entityType" "ShowcaseEntityType" NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "CommunityRankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRankingEntry" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "entityType" "ShowcaseEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metrics" JSONB,
    "displayData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityRankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShowcaseStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedTasks" INTEGER NOT NULL DEFAULT 0,
    "approvalRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disputeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revisionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeBadgeCount" INTEGER NOT NULL DEFAULT 0,
    "permanentBadgeCount" INTEGER NOT NULL DEFAULT 0,
    "hallOfFameCount" INTEGER NOT NULL DEFAULT 0,
    "weeklyApprovedTasks" INTEGER NOT NULL DEFAULT 0,
    "monthlyApprovedTasks" INTEGER NOT NULL DEFAULT 0,
    "topContributorScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trustedPartnerScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risingStarScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserShowcaseStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteShowcaseStats" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "approvedPlacements" INTEGER NOT NULL DEFAULT 0,
    "approvalRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disputeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyPlacements" INTEGER NOT NULL DEFAULT 0,
    "monthlyPlacements" INTEGER NOT NULL DEFAULT 0,
    "successfulWebsiteScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteShowcaseStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeDefinition_code_key" ON "BadgeDefinition"("code");
CREATE INDEX "UserBadge_userId_status_idx" ON "UserBadge"("userId", "status");
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");
CREATE INDEX "UserBadge_nextEvaluationAt_idx" ON "UserBadge"("nextEvaluationAt");
CREATE INDEX "UserBadge_expiresAt_idx" ON "UserBadge"("expiresAt");
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
CREATE UNIQUE INDEX "UserRewardProfile_userId_key" ON "UserRewardProfile"("userId");
CREATE INDEX "UserRewardBenefit_userId_status_idx" ON "UserRewardBenefit"("userId", "status");
CREATE INDEX "UserRewardBenefit_rewardType_status_idx" ON "UserRewardBenefit"("rewardType", "status");
CREATE INDEX "UserRewardBenefit_rewardCode_idx" ON "UserRewardBenefit"("rewardCode");
CREATE INDEX "UserRewardBenefit_expiresAt_idx" ON "UserRewardBenefit"("expiresAt");
CREATE UNIQUE INDEX "RewardLedger_eventKey_key" ON "RewardLedger"("eventKey");
CREATE INDEX "RewardLedger_userId_createdAt_idx" ON "RewardLedger"("userId", "createdAt");
CREATE INDEX "RewardLedger_taskId_idx" ON "RewardLedger"("taskId");
CREATE INDEX "RewardLedger_badgeId_idx" ON "RewardLedger"("badgeId");
CREATE INDEX "RewardLedger_rewardCode_idx" ON "RewardLedger"("rewardCode");
CREATE UNIQUE INDEX "AdditionalRewardDefinition_code_key" ON "AdditionalRewardDefinition"("code");
CREATE UNIQUE INDEX "RewardProcessingOutbox_taskId_key" ON "RewardProcessingOutbox"("taskId");
CREATE INDEX "RewardProcessingOutbox_status_createdAt_idx" ON "RewardProcessingOutbox"("status", "createdAt");
CREATE INDEX "CommunityShowcaseEntry_section_isVisible_idx" ON "CommunityShowcaseEntry"("section", "isVisible");
CREATE INDEX "CommunityShowcaseEntry_entityType_entityId_idx" ON "CommunityShowcaseEntry"("entityType", "entityId");
CREATE INDEX "CommunityShowcaseEntry_isFeatured_idx" ON "CommunityShowcaseEntry"("isFeatured");
CREATE INDEX "CommunityShowcaseEntry_priority_idx" ON "CommunityShowcaseEntry"("priority");
CREATE INDEX "CommunityRankingSnapshot_section_period_entityType_idx" ON "CommunityRankingSnapshot"("section", "period", "entityType");
CREATE INDEX "CommunityRankingSnapshot_generatedAt_idx" ON "CommunityRankingSnapshot"("generatedAt");
CREATE INDEX "CommunityRankingEntry_snapshotId_rank_idx" ON "CommunityRankingEntry"("snapshotId", "rank");
CREATE INDEX "CommunityRankingEntry_entityType_entityId_idx" ON "CommunityRankingEntry"("entityType", "entityId");
CREATE INDEX "CommunityRankingEntry_score_idx" ON "CommunityRankingEntry"("score");
CREATE UNIQUE INDEX "UserShowcaseStats_userId_key" ON "UserShowcaseStats"("userId");
CREATE INDEX "UserShowcaseStats_topContributorScore_idx" ON "UserShowcaseStats"("topContributorScore");
CREATE INDEX "UserShowcaseStats_trustedPartnerScore_idx" ON "UserShowcaseStats"("trustedPartnerScore");
CREATE INDEX "UserShowcaseStats_risingStarScore_idx" ON "UserShowcaseStats"("risingStarScore");
CREATE UNIQUE INDEX "WebsiteShowcaseStats_websiteId_key" ON "WebsiteShowcaseStats"("websiteId");
CREATE INDEX "WebsiteShowcaseStats_ownerUserId_idx" ON "WebsiteShowcaseStats"("ownerUserId");
CREATE INDEX "WebsiteShowcaseStats_successfulWebsiteScore_idx" ON "WebsiteShowcaseStats"("successfulWebsiteScore");

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "BadgeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRewardProfile" ADD CONSTRAINT "UserRewardProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRewardBenefit" ADD CONSTRAINT "UserRewardBenefit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRewardBenefit" ADD CONSTRAINT "UserRewardBenefit_sourceBadgeId_fkey" FOREIGN KEY ("sourceBadgeId") REFERENCES "BadgeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "BadgeDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_sourceWebsiteId_fkey" FOREIGN KEY ("sourceWebsiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityRankingEntry" ADD CONSTRAINT "CommunityRankingEntry_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CommunityRankingSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserShowcaseStats" ADD CONSTRAINT "UserShowcaseStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteShowcaseStats" ADD CONSTRAINT "WebsiteShowcaseStats_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteShowcaseStats" ADD CONSTRAINT "WebsiteShowcaseStats_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
