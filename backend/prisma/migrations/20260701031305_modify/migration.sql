-- CreateEnum
CREATE TYPE "AdminAnalyticsReportType" AS ENUM ('WEBSITES_TASKS_SUMMARY', 'CREDIT_USAGE_SUMMARY', 'DAILY_PLATFORM_ACTIVITY', 'FOLLOW_NOFOLLOW_LINKS', 'USER_RETENTION_GROWTH', 'TASK_LIFECYCLE_RISK', 'PROVIDER_PERFORMANCE', 'GOVERNANCE_RISK', 'FULL_PLATFORM_SUMMARY');

-- CreateEnum
CREATE TYPE "AdminAnalyticsReportPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AdminAnalyticsReportStatus" AS ENUM ('READY', 'FAILED');

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('SUBSCRIPTION_TASK', 'EARNED_TASK', 'VISIBILITY');

-- CreateEnum
CREATE TYPE "CreditAction" AS ENUM ('ADD', 'SPEND', 'EXPIRE', 'REFUND', 'REWARD');

-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('SUBSCRIPTION_PURCHASE', 'TASK_COMPLETION', 'TASK_POST', 'WEEKLY_BACKLINK_CONTRIBUTION', 'MILESTONE_VERIFIED_BACKLINK', 'WEEKLY_CONTRIBUTION_REWARD', 'MILESTONE_VERIFIED_PLACEMENT', 'REFERRAL_WEBSITE_VERIFIED', 'REFERRAL_FIRST_BACKLINK', 'REFERRAL_PAID_SUBSCRIPTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReferralStage" AS ENUM ('SIGNED_UP', 'WEBSITE_VERIFIED', 'FIRST_BACKLINK_ACCEPTED', 'PAID_SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ReferralAttributionStatus" AS ENUM ('PENDING', 'VERIFIED', 'FLAGGED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('WEBSITE_INTEGRATION', 'DIRECT_REFERRAL', 'MARKETPLACE_TASK');

-- CreateEnum
CREATE TYPE "CreditWalletType" AS ENUM ('SUBSCRIPTION', 'PURCHASED', 'REFERRAL', 'EARNED');

-- CreateEnum
CREATE TYPE "AdminCreditAdjustmentType" AS ENUM ('TASK_CREDIT', 'VISIBILITY_CREDIT');

-- CreateEnum
CREATE TYPE "AdminCreditAdjustmentAction" AS ENUM ('ADD', 'DEDUCT', 'REVERSE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('NOT_VERIFIED', 'ACTIVE', 'BANNED', 'DELETED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserBusinessType" AS ENUM ('INDIVIDUAL', 'SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LIMITED_LIABILITY_COMPANY', 'PRIVATE_LIMITED_COMPANY', 'PUBLIC_LIMITED_COMPANY', 'CORPORATION', 'NON_PROFIT', 'GOVERNMENT', 'EDUCATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'OPEN', 'WAITING_FOR_APPLICANTS', 'APPLIED', 'SELECTED', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'REJECTED', 'APPROVED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FROZEN', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('BACKLINK_INSERTION', 'GUEST_POST', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "LinkAttribute" AS ENUM ('DOFOLLOW', 'NOFOLLOW', 'UGC', 'SPONSORED');

-- CreateEnum
CREATE TYPE "ResponsibilityType" AS ENUM ('PROVIDER', 'REQUESTER', 'SHARED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "CancellationRequestStatus" AS ENUM ('NONE', 'PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CreditAdjustmentType" AS ENUM ('REFUND', 'REVERSE', 'ADD');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'SILVER', 'GOLD', 'PLATINUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionPlanVisibility" AS ENUM ('MODARATE', 'HIGHER', 'MAXIMUM');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS_AND_CONDITIONS', 'PRIVACY_POLICY', 'COOKIE_POLICY', 'DATA_PROCESSING_AGREEMENT');

-- CreateEnum
CREATE TYPE "MarketplaceOverrideType" AS ENUM ('BOOST', 'SUPPRESS', 'FORCE_MATCH', 'SCORE_OVERRIDE', 'PENALTY');

-- CreateEnum
CREATE TYPE "MarketplaceOverrideStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MessageContextType" AS ENUM ('DIRECT', 'TASK', 'DISPUTE', 'ADMIN_SUPPORT');

-- CreateEnum
CREATE TYPE "MessageRecordType" AS ENUM ('MESSAGE', 'FILE');

-- CreateEnum
CREATE TYPE "MessageRegistryStatus" AS ENUM ('VERIFIED', 'FLAGGED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "MessageReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');

-- CreateEnum
CREATE TYPE "MessageReportReason" AS ENUM ('SPAM', 'ABUSE', 'FAKE_PROOF', 'OFF_PLATFORM_PAYMENT', 'SENSITIVE_INFORMATION', 'THREAT', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TASK_STATUS', 'CREDIT_BALANCE', 'DISPUTE_REVIEW', 'SYSTEM_ANNOUNCEMENT', 'MESSAGE', 'REWARD', 'MARKETPLACE', 'SECURITY', 'ADMIN_LEDGER', 'ADMIN_GOVERNANCE', 'ADMIN_RISK', 'ADMIN_SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('USER', 'WEBSITE', 'TASK', 'APPLICATION', 'CREDIT', 'MESSAGE', 'REPORT', 'REWARD', 'BADGE', 'MARKETPLACE', 'SYSTEM', 'LEDGER', 'AUDIT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_CREATED', 'TASK_APPLICATION_RECEIVED', 'TASK_PROVIDER_SELECTED', 'TASK_STARTED', 'TASK_PROOF_SUBMITTED', 'TASK_REVISION_REQUESTED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_CANCELLED', 'TASK_CANCELLATION_REQUESTED', 'TASK_CANCELLATION_REQUEST_REJECTED', 'TASK_DEADLINE_EXTENSION_REQUESTED', 'TASK_DEADLINE_EXTENSION_APPROVED', 'TASK_DEADLINE_EXTENSION_REJECTED', 'TASK_STATUS_UPDATED', 'TASK_DISPUTED', 'TASK_COMPLETED', 'CREDIT_DEDUCTED', 'CREDIT_REFUNDED', 'CREDIT_REWARDED', 'CREDIT_LOW_BALANCE', 'MESSAGE_RECEIVED', 'MESSAGE_REPORTED', 'REWARD_EARNED', 'BADGE_UNLOCKED', 'MILESTONE_REACHED', 'STREAK_UPDATED', 'WEEKLY_CONTRIBUTION_REWARDED', 'MARKETPLACE_NEW_OPPORTUNITY', 'MARKETPLACE_LOW_ACTIVITY_REMINDER', 'MARKETPLACE_FIRST_SUCCESS', 'WEBSITE_VERIFIED', 'WEBSITE_REJECTED', 'WEBSITE_FLAGGED', 'WEBSITE_VISIBILITY_EXPIRING', 'WEBSITE_VISIBILITY_EXPIRED', 'SYSTEM_ANNOUNCEMENT', 'ADMIN_CREDIT_LEDGER_ALERT', 'ADMIN_DISPUTE_OPENED', 'ADMIN_DISPUTE_ESCALATED', 'ADMIN_MESSAGE_REPORTED', 'ADMIN_MESSAGE_RESTRICTED', 'ADMIN_WEBSITE_FLAGGED', 'ADMIN_TASK_RISK_FLAGGED', 'ADMIN_MARKETPLACE_RISK_FLAGGED', 'ADMIN_LOW_LIQUIDITY_ALERT', 'ADMIN_SUPPLY_DEMAND_IMBALANCE', 'ADMIN_SYSTEM_HEALTH_ALERT', 'ADMIN_AUDIT_EVENT');

-- CreateEnum
CREATE TYPE "PlacementFinalTaskType" AS ENUM ('BACKLINK', 'GUEST_POST');

-- CreateEnum
CREATE TYPE "WeeklyContributionStatus" AS ENUM ('VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VerifiedPlacementStatus" AS ENUM ('VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WebsiteStreakStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'BROKEN');

-- CreateEnum
CREATE TYPE "DeadlineExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskFlowEventType" AS ENUM ('TASK_CREATED', 'TASK_PUBLISHED', 'REQUESTED_DEADLINE_UPDATED', 'PROVIDER_APPLIED', 'PROVIDER_SELECTED', 'APPLICATION_REJECTED', 'PROVIDER_PROOF_UPLOADED', 'WORK_STARTED', 'WORK_SUBMITTED', 'WORK_RESUBMITTED', 'CANCELLATION_REQUESTED', 'CANCELLATION_ACCEPTED', 'CANCELLATION_REJECTED', 'REVISION_REQUESTED', 'TASK_APPROVED', 'TASK_COMPLETED', 'TASK_REJECTED', 'TASK_CANCELLED', 'TASK_DISPUTED', 'TASK_FROZEN', 'DEADLINE_EXTENDED', 'ADMIN_STATUS_OVERRIDE', 'ADMIN_CREDIT_ADJUSTED', 'ADMIN_ABUSE_PATTERN_FLAGGED');

-- CreateEnum
CREATE TYPE "TaskFlowActorRole" AS ENUM ('REQUESTER', 'PROVIDER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "WebsiteMarketplaceVisibilityStatus" AS ENUM ('VISIBLE', 'GRACE_PERIOD', 'HIDDEN');

-- CreateEnum
CREATE TYPE "WebsiteVerificationBy" AS ENUM ('AUTOMATIC', 'MANUAL_BY_ADMIN');

-- CreateEnum
CREATE TYPE "WebsiteVerificationType" AS ENUM ('HTML_META_TAG', 'DNS_TXT_RECORD', 'SCREENSHOT_URL');

-- CreateEnum
CREATE TYPE "WebsiteVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'VERIFICATION_FAILED', 'REQUESTED_FOR_MANUAL_REVIEW', 'APPEALED', 'REJECTED');

-- CreateTable
CREATE TABLE "AdminAnalyticsReport" (
    "id" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportType" "AdminAnalyticsReportType" NOT NULL,
    "period" "AdminAnalyticsReportPeriod" NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "participant" TEXT NOT NULL DEFAULT 'ALL',
    "filters" JSONB,
    "snapshot" JSONB NOT NULL,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 1,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "status" "AdminAnalyticsReportStatus" NOT NULL DEFAULT 'READY',
    "errorMessage" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdminAnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "OtpType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCreditWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "earnedTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "purchasedTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "referralTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "visibilityCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCreditWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteCreditWallet" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "subscriptionTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "earnedTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "allocatedPurchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "allocatedReferralCredits" INTEGER NOT NULL DEFAULT 0,
    "visibilityCredits" INTEGER NOT NULL DEFAULT 0,
    "visibilityActiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteCreditWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionCreditBatch" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "totalCredits" INTEGER NOT NULL,
    "remainingCredits" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCreditBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLog" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditType" "CreditType" NOT NULL,
    "action" "CreditAction" NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "websiteId" TEXT,
    "taskId" TEXT,
    "referralId" TEXT,
    "subscriptionId" TEXT,
    "subscriptionCreditBatchId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,

    CONSTRAINT "CreditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReferral" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "referredWebsiteId" TEXT,
    "subscriptionId" TEXT,
    "codeUsed" TEXT NOT NULL,
    "currentStage" "ReferralStage" NOT NULL DEFAULT 'SIGNED_UP',
    "status" "ReferralAttributionStatus" NOT NULL DEFAULT 'PENDING',
    "source" "ReferralSource" NOT NULL DEFAULT 'DIRECT_REFERRAL',
    "signedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "websiteVerifiedAt" TIMESTAMP(3),
    "firstBacklinkAt" TIMESTAMP(3),
    "paidSubscriptionAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "flaggedAt" TIMESTAMP(3),
    "flagReason" TEXT,
    "frozenAt" TIMESTAMP(3),
    "freezeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "stage" "ReferralStage" NOT NULL,
    "referrerTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "referrerVisibilityCredits" INTEGER NOT NULL DEFAULT 0,
    "referredTaskCredits" INTEGER NOT NULL DEFAULT 0,
    "referredVisibilityCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralRewardConfig" (
    "id" TEXT NOT NULL DEFAULT 'REFERRAL_REWARD_CONFIG',
    "rewardPerReferralCredits" INTEGER NOT NULL DEFAULT 150,
    "maxUserReferralPool" INTEGER NOT NULL DEFAULT 5000,
    "oneCreditPerUserEnforced" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralRewardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeatureToggle" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeatureToggle_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminCreditAdjustment" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "creditLogId" TEXT NOT NULL,
    "type" "AdminCreditAdjustmentType" NOT NULL,
    "action" "AdminCreditAdjustmentAction" NOT NULL DEFAULT 'ADD',
    "amount" INTEGER NOT NULL,
    "visibilityDays" INTEGER,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCreditAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteWalletLockAudit" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteWalletLockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminReferralAuditLog" (
    "id" TEXT NOT NULL,
    "referralId" TEXT,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminReferralAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralProgramConfig" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "referralsFrozen" BOOLEAN NOT NULL DEFAULT false,
    "freezeReason" TEXT,
    "frozenById" TEXT,
    "frozenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralProgramConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMatchingProfile" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "opportunityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "boostFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "completedInteractions" INTEGER NOT NULL DEFAULT 0,
    "failedInteractions" INTEGER NOT NULL DEFAULT 0,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "qualityRatingSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgQualityRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boostDecayCount" INTEGER NOT NULL DEFAULT 10,
    "forceMatchNext" BOOLEAN NOT NULL DEFAULT false,
    "isSuppressed" BOOLEAN NOT NULL DEFAULT false,
    "suppressedUntil" TIMESTAMP(3),
    "lastShownAt" TIMESTAMP(3),
    "lastMatchedAt" TIMESTAMP(3),
    "lastSelectedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "exposureCount7d" INTEGER NOT NULL DEFAULT 0,
    "matchCount7d" INTEGER NOT NULL DEFAULT 0,
    "applicationCount7d" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteMatchingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityImpression" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerWebsiteId" TEXT,
    "taskId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterWebsiteId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "rank" INTEGER,
    "relaxationLevel" INTEGER,
    "reasons" JSONB,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceScoringConfig" (
    "id" TEXT NOT NULL DEFAULT 'MARKETPLACE_SCORING_CONFIG',
    "compatibilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "opportunityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "visibilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "reputationWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "boostWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "minViableMatches" INTEGER NOT NULL DEFAULT 10,
    "maxRelaxationLevel" INTEGER NOT NULL DEFAULT 4,
    "newWebsiteBoostFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "minBoostFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxBoostFactor" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "boostDecayRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "forceMatchBonus" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "exposurePenaltyPerTaskView" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "exposurePenaltyPerRequesterView" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxRequesterExposurePerDay" INTEGER NOT NULL DEFAULT 50,
    "maxProviderMatchesPerDay" INTEGER NOT NULL DEFAULT 3,
    "neglectedAfterHours" INTEGER NOT NULL DEFAULT 72,
    "forceMatchAfterHours" INTEGER NOT NULL DEFAULT 168,
    "impressionLookbackDays" INTEGER NOT NULL DEFAULT 7,
    "impressionRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "riskPenaltyDisputeWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "riskPenaltyRejectionWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOverride" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "type" "MarketplaceOverrideType" NOT NULL,
    "status" "MarketplaceOverrideStatus" NOT NULL DEFAULT 'ACTIVE',
    "boostValue" DOUBLE PRECISION,
    "visibilityScore" DOUBLE PRECISION,
    "opportunityScore" DOUBLE PRECISION,
    "reputationScore" DOUBLE PRECISION,
    "forceMatchNext" BOOLEAN,
    "suppressUntil" TIMESTAMP(3),
    "reasonCode" TEXT NOT NULL,
    "note" TEXT,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "senderEmailSnapshot" TEXT,
    "recipientEmailSnapshot" TEXT,
    "text" TEXT,
    "document" TEXT,
    "taskId" TEXT,
    "contextType" "MessageContextType" NOT NULL DEFAULT 'DIRECT',
    "recordType" "MessageRecordType" NOT NULL DEFAULT 'MESSAGE',
    "registryStatus" "MessageRegistryStatus" NOT NULL DEFAULT 'VERIFIED',
    "registryReason" TEXT,
    "registryUpdatedAt" TIMESTAMP(3),
    "registryUpdatedById" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "latestReportId" TEXT,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "MessageReportReason" NOT NULL,
    "note" TEXT,
    "status" "MessageReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "audience" "NotificationAudience" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "entityType" "NotificationEntityType",
    "entityId" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskStatusUpdates" BOOLEAN NOT NULL DEFAULT true,
    "creditBalanceAlerts" BOOLEAN NOT NULL DEFAULT true,
    "disputeReviewNotifications" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncements" BOOLEAN NOT NULL DEFAULT false,
    "contactPreferenceTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementTask" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterWebsiteId" TEXT NOT NULL,
    "selectedProviderId" TEXT,
    "selectedApplicationId" TEXT,
    "assignedProviderWebsiteId" TEXT,
    "projectTitle" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL,
    "placementGuidelines" TEXT,
    "requiredDomainRating" INTEGER,
    "placementType" "PlacementType" NOT NULL,
    "linkAttribute" "LinkAttribute" NOT NULL,
    "responsibilityType" "ResponsibilityType",
    "requestedDeadlineDays" INTEGER NOT NULL,
    "deliveryDeadline" TIMESTAMP(3),
    "deadlineExtensionCount" INTEGER NOT NULL DEFAULT 0,
    "deadlineExtendedDaysTotal" INTEGER NOT NULL DEFAULT 0,
    "deadlineLastExtendedAt" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "lateAt" TIMESTAMP(3),
    "lifecycleStatus" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionStatus" "SubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "creditCost" INTEGER NOT NULL,
    "reservedCreditAmount" INTEGER NOT NULL,
    "walletType" "CreditWalletType" NOT NULL,
    "finalTaskType" "PlacementFinalTaskType",
    "finalCreditCost" INTEGER,
    "providerRewardCredits" INTEGER,
    "completionRewardedAt" TIMESTAMP(3),
    "cancellationRequestStatus" "CancellationRequestStatus" NOT NULL DEFAULT 'NONE',
    "cancellationRequestedById" TEXT,
    "cancellationRequestedAt" TIMESTAMP(3),
    "cancellationRespondedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3),
    "supportDocuments" TEXT[],
    "providerProofDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskMozAnalyticsHistory" (
    "id" TEXT NOT NULL,
    "placementTaskId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskMozAnalyticsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementApplication" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerWebsiteId" TEXT NOT NULL,
    "placementTaskId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteWeeklyContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "triggerTaskId" TEXT,
    "weekStartAt" TIMESTAMP(3) NOT NULL,
    "weekEndAt" TIMESTAMP(3) NOT NULL,
    "verifiedPlacementCount" INTEGER NOT NULL DEFAULT 1,
    "rewardCredits" INTEGER NOT NULL DEFAULT 1,
    "status" "WeeklyContributionStatus" NOT NULL DEFAULT 'VERIFIED',
    "rewardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "WebsiteWeeklyContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMilestoneProgress" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "totalVerifiedPlacements" INTEGER NOT NULL DEFAULT 0,
    "lastMilestoneAtCount" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedPlacementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteMilestoneProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteVerifiedPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "finalTaskType" "PlacementFinalTaskType" NOT NULL,
    "status" "VerifiedPlacementStatus" NOT NULL DEFAULT 'VERIFIED',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteVerifiedPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteActivityStreak" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreakWeeks" INTEGER NOT NULL DEFAULT 0,
    "longestStreakWeeks" INTEGER NOT NULL DEFAULT 0,
    "status" "WebsiteStreakStatus" NOT NULL DEFAULT 'BROKEN',
    "streakStartedWeekStart" TIMESTAMP(3),
    "lastActiveWeekStart" TIMESTAMP(3),
    "lastActiveWeekEnd" TIMESTAMP(3),
    "lastVerifiedPlacementAt" TIMESTAMP(3),
    "brokenAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteActivityStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskFlow" (
    "id" TEXT NOT NULL,
    "placementTaskId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "providerId" TEXT,
    "actorId" TEXT NOT NULL,
    "requesterWebsiteId" TEXT,
    "providerWebsiteId" TEXT,
    "eventType" "TaskFlowEventType",
    "actorRole" "TaskFlowActorRole",
    "fromStatus" "TaskStatus",
    "toStatus" "TaskStatus" NOT NULL,
    "actionTaken" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "eventKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDeadlineExtension" (
    "id" TEXT NOT NULL,
    "placementTaskId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "respondedById" TEXT,
    "previousDeadline" TIMESTAMP(3),
    "newDeadline" TIMESTAMP(3) NOT NULL,
    "extendDays" INTEGER NOT NULL,
    "reason" TEXT,
    "responseNote" TEXT,
    "status" "DeadlineExtensionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "TaskDeadlineExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "credit" INTEGER NOT NULL,
    "visibility" "SubscriptionPlanVisibility" NOT NULL,
    "monthlyTaskCredits" INTEGER NOT NULL DEFAULT 1,
    "maxTaskCreditCapacity" INTEGER NOT NULL DEFAULT 5,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxWebsites" INTEGER,
    "additionalWebsitePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxSimultaneousTasks" INTEGER,
    "visibilityCreditCapacity" INTEGER NOT NULL DEFAULT 0,
    "taskCreditUnitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "visibilityCreditUnitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "referralEnabled" BOOLEAN NOT NULL DEFAULT false,
    "badges" JSONB,
    "bulkTaskCreditDiscounts" JSONB,
    "bulkVisibilityCreditDiscounts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "referralCode" TEXT,
    "isReferralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "companyName" TEXT,
    "businessType" "UserBusinessType",
    "imageKey" TEXT,
    "imageUrl" TEXT,
    "country" TEXT,
    "phoneNumber" TEXT,
    "vatUid" TEXT,
    "password" TEXT,
    "notificationTaskStatusUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notificationCreditBalanceAlerts" BOOLEAN NOT NULL DEFAULT true,
    "notificationDisputeReviewNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notificationSystemAnnouncements" BOOLEAN NOT NULL DEFAULT false,
    "taskAutoAcceptTasks" BOOLEAN NOT NULL DEFAULT false,
    "taskManualReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "lastPasswordChangeTime" TIMESTAMP(3),
    "registrationTime" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "suspendStart" TIMESTAMP(3),
    "suspendEnd" TIMESTAMP(3),
    "punishmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGovernanceNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGovernanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthProviderAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "AuthProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "nicheSpecialization" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "tags" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUserGovernanceNote" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserGovernanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "logoKey" TEXT,
    "tagline" TEXT,
    "verificationStatus" "WebsiteVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedMethod" "WebsiteVerificationType",
    "marketplaceVisibilityStatus" "WebsiteMarketplaceVisibilityStatus" NOT NULL DEFAULT 'VISIBLE',
    "visibilityGraceStartedAt" TIMESTAMP(3),
    "visibilityGraceEndsAt" TIMESTAMP(3),
    "latestVerificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isFlag" BOOLEAN NOT NULL DEFAULT false,
    "isWalletLock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteVerification" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" "WebsiteVerificationType" NOT NULL,
    "verifiedBy" "WebsiteVerificationBy" NOT NULL DEFAULT 'AUTOMATIC',
    "verifiedAt" TIMESTAMP(3),
    "verifiedDomain" TEXT,
    "status" "WebsiteVerificationStatus" NOT NULL,
    "errorMessage" TEXT,
    "responseData" JSONB,
    "screenshotImageKey" TEXT,
    "requestedByUserId" TEXT,
    "manuallyReviewedByAdminUserId" TEXT,
    "manualReviewNotes" TEXT,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteVerificationConfig" (
    "id" TEXT NOT NULL DEFAULT 'WEBSITE_VERIFICATION_CONFIG',
    "metaName" VARCHAR(100) NOT NULL,
    "verificationToken" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteVerificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminAnalyticsReport_reportCode_key" ON "AdminAnalyticsReport"("reportCode");

-- CreateIndex
CREATE INDEX "AdminAnalyticsReport_reportType_generatedAt_idx" ON "AdminAnalyticsReport"("reportType", "generatedAt");

-- CreateIndex
CREATE INDEX "AdminAnalyticsReport_generatedById_generatedAt_idx" ON "AdminAnalyticsReport"("generatedById", "generatedAt");

-- CreateIndex
CREATE INDEX "AdminAnalyticsReport_status_generatedAt_idx" ON "AdminAnalyticsReport"("status", "generatedAt");

-- CreateIndex
CREATE INDEX "AdminAnalyticsReport_deletedAt_idx" ON "AdminAnalyticsReport"("deletedAt");

-- CreateIndex
CREATE INDEX "OtpToken_email_type_idx" ON "OtpToken"("email", "type");

-- CreateIndex
CREATE INDEX "OtpToken_expiresAt_idx" ON "OtpToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_userId_id_key" ON "Session"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCreditWallet_userId_key" ON "UserCreditWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteCreditWallet_websiteId_key" ON "WebsiteCreditWallet"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteCreditWallet_websiteId_idx" ON "WebsiteCreditWallet"("websiteId");

-- CreateIndex
CREATE INDEX "SubscriptionCreditBatch_walletId_idx" ON "SubscriptionCreditBatch"("walletId");

-- CreateIndex
CREATE INDEX "SubscriptionCreditBatch_userId_idx" ON "SubscriptionCreditBatch"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionCreditBatch_subscriptionId_idx" ON "SubscriptionCreditBatch"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionCreditBatch_expiresAt_idx" ON "SubscriptionCreditBatch"("expiresAt");

-- CreateIndex
CREATE INDEX "CreditLog_actorId_idx" ON "CreditLog"("actorId");

-- CreateIndex
CREATE INDEX "CreditLog_walletId_createdAt_idx" ON "CreditLog"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLog_userId_createdAt_idx" ON "CreditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLog_creditType_createdAt_idx" ON "CreditLog"("creditType", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLog_reason_createdAt_idx" ON "CreditLog"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLog_websiteId_idx" ON "CreditLog"("websiteId");

-- CreateIndex
CREATE INDEX "CreditLog_taskId_idx" ON "CreditLog"("taskId");

-- CreateIndex
CREATE INDEX "CreditLog_referralId_idx" ON "CreditLog"("referralId");

-- CreateIndex
CREATE INDEX "CreditLog_subscriptionId_idx" ON "CreditLog"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReferral_referredUserId_key" ON "UserReferral"("referredUserId");

-- CreateIndex
CREATE INDEX "UserReferral_referrerUserId_idx" ON "UserReferral"("referrerUserId");

-- CreateIndex
CREATE INDEX "UserReferral_referredWebsiteId_idx" ON "UserReferral"("referredWebsiteId");

-- CreateIndex
CREATE INDEX "UserReferral_subscriptionId_idx" ON "UserReferral"("subscriptionId");

-- CreateIndex
CREATE INDEX "UserReferral_currentStage_idx" ON "UserReferral"("currentStage");

-- CreateIndex
CREATE INDEX "UserReferral_status_idx" ON "UserReferral"("status");

-- CreateIndex
CREATE INDEX "UserReferral_source_idx" ON "UserReferral"("source");

-- CreateIndex
CREATE INDEX "UserReferral_approvedById_idx" ON "UserReferral"("approvedById");

-- CreateIndex
CREATE INDEX "UserReferral_revokedById_idx" ON "UserReferral"("revokedById");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralReward_referralId_stage_key" ON "ReferralReward"("referralId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCreditAdjustment_creditLogId_key" ON "AdminCreditAdjustment"("creditLogId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCreditAdjustment_idempotencyKey_key" ON "AdminCreditAdjustment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AdminCreditAdjustment_adminId_createdAt_idx" ON "AdminCreditAdjustment"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminCreditAdjustment_websiteId_createdAt_idx" ON "AdminCreditAdjustment"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteWalletLockAudit_adminId_createdAt_idx" ON "WebsiteWalletLockAudit"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteWalletLockAudit_websiteId_createdAt_idx" ON "WebsiteWalletLockAudit"("websiteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminReferralAuditLog_idempotencyKey_key" ON "AdminReferralAuditLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AdminReferralAuditLog_referralId_createdAt_idx" ON "AdminReferralAuditLog"("referralId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminReferralAuditLog_adminId_createdAt_idx" ON "AdminReferralAuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "LegalDocument_type_idx" ON "LegalDocument"("type");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_type_key" ON "LegalDocument"("type");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_documentId_isActive_idx" ON "LegalDocumentVersion"("documentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_documentId_version_key" ON "LegalDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_userId_idx" ON "UserLegalAcceptance"("userId");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_versionId_idx" ON "UserLegalAcceptance"("versionId");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_userId_acceptedAt_idx" ON "UserLegalAcceptance"("userId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserLegalAcceptance_userId_versionId_key" ON "UserLegalAcceptance"("userId", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMatchingProfile_websiteId_key" ON "WebsiteMatchingProfile"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_userId_idx" ON "WebsiteMatchingProfile"("userId");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_websiteId_idx" ON "WebsiteMatchingProfile"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_opportunityScore_idx" ON "WebsiteMatchingProfile"("opportunityScore");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_visibilityScore_idx" ON "WebsiteMatchingProfile"("visibilityScore");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_reputationScore_idx" ON "WebsiteMatchingProfile"("reputationScore");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_boostFactor_idx" ON "WebsiteMatchingProfile"("boostFactor");

-- CreateIndex
CREATE INDEX "WebsiteMatchingProfile_isSuppressed_suppressedUntil_idx" ON "WebsiteMatchingProfile"("isSuppressed", "suppressedUntil");

-- CreateIndex
CREATE INDEX "OpportunityImpression_providerId_shownAt_idx" ON "OpportunityImpression"("providerId", "shownAt");

-- CreateIndex
CREATE INDEX "OpportunityImpression_providerWebsiteId_shownAt_idx" ON "OpportunityImpression"("providerWebsiteId", "shownAt");

-- CreateIndex
CREATE INDEX "OpportunityImpression_taskId_shownAt_idx" ON "OpportunityImpression"("taskId", "shownAt");

-- CreateIndex
CREATE INDEX "OpportunityImpression_requesterId_shownAt_idx" ON "OpportunityImpression"("requesterId", "shownAt");

-- CreateIndex
CREATE INDEX "OpportunityImpression_requesterWebsiteId_shownAt_idx" ON "OpportunityImpression"("requesterWebsiteId", "shownAt");

-- CreateIndex
CREATE INDEX "OpportunityImpression_relaxationLevel_idx" ON "OpportunityImpression"("relaxationLevel");

-- CreateIndex
CREATE INDEX "MarketplaceOverride_websiteId_idx" ON "MarketplaceOverride"("websiteId");

-- CreateIndex
CREATE INDEX "MarketplaceOverride_adminId_idx" ON "MarketplaceOverride"("adminId");

-- CreateIndex
CREATE INDEX "MarketplaceOverride_type_idx" ON "MarketplaceOverride"("type");

-- CreateIndex
CREATE INDEX "MarketplaceOverride_status_idx" ON "MarketplaceOverride"("status");

-- CreateIndex
CREATE INDEX "MarketplaceOverride_activeFrom_activeUntil_idx" ON "MarketplaceOverride"("activeFrom", "activeUntil");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- CreateIndex
CREATE INDEX "Message_taskId_createdAt_idx" ON "Message"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_recipientId_taskId_createdAt_idx" ON "Message"("senderId", "recipientId", "taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_registryStatus_idx" ON "Message"("registryStatus");

-- CreateIndex
CREATE INDEX "Message_reportCount_idx" ON "Message"("reportCount");

-- CreateIndex
CREATE INDEX "Message_latestReportId_idx" ON "Message"("latestReportId");

-- CreateIndex
CREATE INDEX "Message_isManualOverride_idx" ON "Message"("isManualOverride");

-- CreateIndex
CREATE INDEX "Message_contextType_idx" ON "Message"("contextType");

-- CreateIndex
CREATE INDEX "Message_recordType_idx" ON "Message"("recordType");

-- CreateIndex
CREATE INDEX "Message_isDeleted_idx" ON "Message"("isDeleted");

-- CreateIndex
CREATE INDEX "MessageReport_messageId_idx" ON "MessageReport"("messageId");

-- CreateIndex
CREATE INDEX "MessageReport_reporterId_idx" ON "MessageReport"("reporterId");

-- CreateIndex
CREATE INDEX "MessageReport_status_idx" ON "MessageReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReport_messageId_reporterId_key" ON "MessageReport"("messageId", "reporterId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_status_idx" ON "Notification"("recipientId", "status");

-- CreateIndex
CREATE INDEX "Notification_audience_createdAt_idx" ON "Notification"("audience", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_category_createdAt_idx" ON "Notification"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_priority_createdAt_idx" ON "Notification"("priority", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_deliveryStatus_createdAt_idx" ON "Notification"("deliveryStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_idempotencyKey_idx" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_idempotencyKey_key" ON "Notification"("recipientId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "PlacementTask_requesterId_idx" ON "PlacementTask"("requesterId");

-- CreateIndex
CREATE INDEX "PlacementTask_selectedProviderId_idx" ON "PlacementTask"("selectedProviderId");

-- CreateIndex
CREATE INDEX "PlacementTask_assignedProviderWebsiteId_idx" ON "PlacementTask"("assignedProviderWebsiteId");

-- CreateIndex
CREATE INDEX "PlacementTask_lifecycleStatus_idx" ON "PlacementTask"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "PlacementTask_deliveryDeadline_idx" ON "PlacementTask"("deliveryDeadline");

-- CreateIndex
CREATE INDEX "TaskMozAnalyticsHistory_placementTaskId_idx" ON "TaskMozAnalyticsHistory"("placementTaskId");

-- CreateIndex
CREATE INDEX "TaskMozAnalyticsHistory_subject_idx" ON "TaskMozAnalyticsHistory"("subject");

-- CreateIndex
CREATE INDEX "TaskMozAnalyticsHistory_date_idx" ON "TaskMozAnalyticsHistory"("date");

-- CreateIndex
CREATE INDEX "PlacementApplication_providerId_idx" ON "PlacementApplication"("providerId");

-- CreateIndex
CREATE INDEX "PlacementApplication_providerWebsiteId_idx" ON "PlacementApplication"("providerWebsiteId");

-- CreateIndex
CREATE INDEX "PlacementApplication_placementTaskId_idx" ON "PlacementApplication"("placementTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementApplication_providerId_placementTaskId_key" ON "PlacementApplication"("providerId", "placementTaskId");

-- CreateIndex
CREATE INDEX "WebsiteWeeklyContribution_userId_idx" ON "WebsiteWeeklyContribution"("userId");

-- CreateIndex
CREATE INDEX "WebsiteWeeklyContribution_websiteId_idx" ON "WebsiteWeeklyContribution"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteWeeklyContribution_weekStartAt_idx" ON "WebsiteWeeklyContribution"("weekStartAt");

-- CreateIndex
CREATE INDEX "WebsiteWeeklyContribution_status_idx" ON "WebsiteWeeklyContribution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteWeeklyContribution_websiteId_weekStartAt_key" ON "WebsiteWeeklyContribution"("websiteId", "weekStartAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMilestoneProgress_websiteId_key" ON "WebsiteMilestoneProgress"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteVerifiedPlacement_taskId_key" ON "WebsiteVerifiedPlacement"("taskId");

-- CreateIndex
CREATE INDEX "WebsiteVerifiedPlacement_userId_idx" ON "WebsiteVerifiedPlacement"("userId");

-- CreateIndex
CREATE INDEX "WebsiteVerifiedPlacement_websiteId_idx" ON "WebsiteVerifiedPlacement"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteVerifiedPlacement_status_idx" ON "WebsiteVerifiedPlacement"("status");

-- CreateIndex
CREATE INDEX "WebsiteVerifiedPlacement_verifiedAt_idx" ON "WebsiteVerifiedPlacement"("verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteActivityStreak_websiteId_key" ON "WebsiteActivityStreak"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteActivityStreak_userId_idx" ON "WebsiteActivityStreak"("userId");

-- CreateIndex
CREATE INDEX "WebsiteActivityStreak_websiteId_idx" ON "WebsiteActivityStreak"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteActivityStreak_status_idx" ON "WebsiteActivityStreak"("status");

-- CreateIndex
CREATE INDEX "WebsiteActivityStreak_lastActiveWeekStart_idx" ON "WebsiteActivityStreak"("lastActiveWeekStart");

-- CreateIndex
CREATE UNIQUE INDEX "TaskFlow_eventKey_key" ON "TaskFlow"("eventKey");

-- CreateIndex
CREATE INDEX "TaskFlow_placementTaskId_idx" ON "TaskFlow"("placementTaskId");

-- CreateIndex
CREATE INDEX "TaskFlow_requesterId_idx" ON "TaskFlow"("requesterId");

-- CreateIndex
CREATE INDEX "TaskFlow_providerId_idx" ON "TaskFlow"("providerId");

-- CreateIndex
CREATE INDEX "TaskFlow_actorId_idx" ON "TaskFlow"("actorId");

-- CreateIndex
CREATE INDEX "TaskFlow_requesterWebsiteId_idx" ON "TaskFlow"("requesterWebsiteId");

-- CreateIndex
CREATE INDEX "TaskFlow_providerWebsiteId_idx" ON "TaskFlow"("providerWebsiteId");

-- CreateIndex
CREATE INDEX "TaskFlow_eventType_idx" ON "TaskFlow"("eventType");

-- CreateIndex
CREATE INDEX "TaskFlow_actorRole_idx" ON "TaskFlow"("actorRole");

-- CreateIndex
CREATE INDEX "TaskFlow_eventKey_idx" ON "TaskFlow"("eventKey");

-- CreateIndex
CREATE INDEX "TaskDeadlineExtension_placementTaskId_idx" ON "TaskDeadlineExtension"("placementTaskId");

-- CreateIndex
CREATE INDEX "TaskDeadlineExtension_requestedById_idx" ON "TaskDeadlineExtension"("requestedById");

-- CreateIndex
CREATE INDEX "TaskDeadlineExtension_respondedById_idx" ON "TaskDeadlineExtension"("respondedById");

-- CreateIndex
CREATE INDEX "TaskDeadlineExtension_status_idx" ON "TaskDeadlineExtension"("status");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "UserGovernanceNote_userId_createdAt_idx" ON "UserGovernanceNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserGovernanceNote_adminId_idx" ON "UserGovernanceNote"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthProviderAccount_provider_providerId_key" ON "AuthProviderAccount"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_userId_key" ON "Publisher"("userId");

-- CreateIndex
CREATE INDEX "AdminUserGovernanceNote_subjectUserId_createdAt_idx" ON "AdminUserGovernanceNote"("subjectUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminUserGovernanceNote_adminUserId_createdAt_idx" ON "AdminUserGovernanceNote"("adminUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Website_websiteUrl_key" ON "Website"("websiteUrl");

-- CreateIndex
CREATE INDEX "Website_authorId_idx" ON "Website"("authorId");

-- CreateIndex
CREATE INDEX "Website_marketplaceVisibilityStatus_idx" ON "Website"("marketplaceVisibilityStatus");

-- CreateIndex
CREATE INDEX "Website_visibilityGraceEndsAt_idx" ON "Website"("visibilityGraceEndsAt");

-- CreateIndex
CREATE INDEX "WebsiteVerification_websiteId_type_idx" ON "WebsiteVerification"("websiteId", "type");

-- CreateIndex
CREATE INDEX "WebsiteVerification_status_idx" ON "WebsiteVerification"("status");

-- CreateIndex
CREATE INDEX "WebsiteVerification_websiteId_idx" ON "WebsiteVerification"("websiteId");

-- AddForeignKey
ALTER TABLE "AdminAnalyticsReport" ADD CONSTRAINT "AdminAnalyticsReport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCreditWallet" ADD CONSTRAINT "UserCreditWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteCreditWallet" ADD CONSTRAINT "WebsiteCreditWallet_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCreditBatch" ADD CONSTRAINT "SubscriptionCreditBatch_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserCreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCreditBatch" ADD CONSTRAINT "SubscriptionCreditBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCreditBatch" ADD CONSTRAINT "SubscriptionCreditBatch_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserCreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "UserReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_subscriptionCreditBatchId_fkey" FOREIGN KEY ("subscriptionCreditBatchId") REFERENCES "SubscriptionCreditBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_referredWebsiteId_fkey" FOREIGN KEY ("referredWebsiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "UserReferral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCreditAdjustment" ADD CONSTRAINT "AdminCreditAdjustment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCreditAdjustment" ADD CONSTRAINT "AdminCreditAdjustment_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCreditAdjustment" ADD CONSTRAINT "AdminCreditAdjustment_creditLogId_fkey" FOREIGN KEY ("creditLogId") REFERENCES "CreditLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteWalletLockAudit" ADD CONSTRAINT "WebsiteWalletLockAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteWalletLockAudit" ADD CONSTRAINT "WebsiteWalletLockAudit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReferralAuditLog" ADD CONSTRAINT "AdminReferralAuditLog_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "UserReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReferralAuditLog" ADD CONSTRAINT "AdminReferralAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralProgramConfig" ADD CONSTRAINT "ReferralProgramConfig_frozenById_fkey" FOREIGN KEY ("frozenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegalAcceptance" ADD CONSTRAINT "UserLegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegalAcceptance" ADD CONSTRAINT "UserLegalAcceptance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMatchingProfile" ADD CONSTRAINT "WebsiteMatchingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMatchingProfile" ADD CONSTRAINT "WebsiteMatchingProfile_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityImpression" ADD CONSTRAINT "OpportunityImpression_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityImpression" ADD CONSTRAINT "OpportunityImpression_providerWebsiteId_fkey" FOREIGN KEY ("providerWebsiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityImpression" ADD CONSTRAINT "OpportunityImpression_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityImpression" ADD CONSTRAINT "OpportunityImpression_requesterWebsiteId_fkey" FOREIGN KEY ("requesterWebsiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityImpression" ADD CONSTRAINT "OpportunityImpression_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOverride" ADD CONSTRAINT "MarketplaceOverride_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOverride" ADD CONSTRAINT "MarketplaceOverride_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementTask" ADD CONSTRAINT "PlacementTask_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementTask" ADD CONSTRAINT "PlacementTask_selectedProviderId_fkey" FOREIGN KEY ("selectedProviderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMozAnalyticsHistory" ADD CONSTRAINT "TaskMozAnalyticsHistory_placementTaskId_fkey" FOREIGN KEY ("placementTaskId") REFERENCES "PlacementTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementApplication" ADD CONSTRAINT "PlacementApplication_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementApplication" ADD CONSTRAINT "PlacementApplication_placementTaskId_fkey" FOREIGN KEY ("placementTaskId") REFERENCES "PlacementTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteWeeklyContribution" ADD CONSTRAINT "WebsiteWeeklyContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteWeeklyContribution" ADD CONSTRAINT "WebsiteWeeklyContribution_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteWeeklyContribution" ADD CONSTRAINT "WebsiteWeeklyContribution_triggerTaskId_fkey" FOREIGN KEY ("triggerTaskId") REFERENCES "PlacementTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMilestoneProgress" ADD CONSTRAINT "WebsiteMilestoneProgress_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVerifiedPlacement" ADD CONSTRAINT "WebsiteVerifiedPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVerifiedPlacement" ADD CONSTRAINT "WebsiteVerifiedPlacement_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVerifiedPlacement" ADD CONSTRAINT "WebsiteVerifiedPlacement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteActivityStreak" ADD CONSTRAINT "WebsiteActivityStreak_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteActivityStreak" ADD CONSTRAINT "WebsiteActivityStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFlow" ADD CONSTRAINT "TaskFlow_placementTaskId_fkey" FOREIGN KEY ("placementTaskId") REFERENCES "PlacementTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFlow" ADD CONSTRAINT "TaskFlow_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFlow" ADD CONSTRAINT "TaskFlow_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFlow" ADD CONSTRAINT "TaskFlow_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDeadlineExtension" ADD CONSTRAINT "TaskDeadlineExtension_placementTaskId_fkey" FOREIGN KEY ("placementTaskId") REFERENCES "PlacementTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDeadlineExtension" ADD CONSTRAINT "TaskDeadlineExtension_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDeadlineExtension" ADD CONSTRAINT "TaskDeadlineExtension_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGovernanceNote" ADD CONSTRAINT "UserGovernanceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGovernanceNote" ADD CONSTRAINT "UserGovernanceNote_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthProviderAccount" ADD CONSTRAINT "AuthProviderAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publisher" ADD CONSTRAINT "Publisher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserGovernanceNote" ADD CONSTRAINT "AdminUserGovernanceNote_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserGovernanceNote" ADD CONSTRAINT "AdminUserGovernanceNote_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVerification" ADD CONSTRAINT "WebsiteVerification_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVerification" ADD CONSTRAINT "WebsiteVerification_manuallyReviewedByAdminUserId_fkey" FOREIGN KEY ("manuallyReviewedByAdminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
