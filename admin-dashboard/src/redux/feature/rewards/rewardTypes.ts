export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PaginatedData<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore?: boolean;
  };
};

export type BadgeCategory =
  | "MARKETPLACE"
  | "KICKSTARTER"
  | "HALL_OF_FAME"
  | "ADMIN_FEATURED";

export type BadgeScope = "USER_PROFILE" | "PROVIDER_PROFILE" | "REQUESTER_PROFILE";
export type BadgeRoleScope = "ANY" | "REQUESTER" | "PROVIDER";
export type BadgeRewardType =
  | "RECOGNITION_ONLY"
  | "TASK_CREDIT"
  | "VISIBILITY_BOOST"
  | "PRIORITY_BOOST"
  | "SUPPORT_PRIORITY";
export type BadgeTriggerType =
  | "ACCOUNT_VERIFIED"
  | "EARLY_ADOPTER"
  | "FIRST_SUCCESS"
  | "VERIFIED_TASK_COUNT"
  | "APPROVAL_RATE"
  | "RESPONSE_TIME"
  | "REVIEW_TIME"
  | "DISPUTE_RATE"
  | "REVISION_RATE"
  | "STREAK"
  | "LOW_DISPUTE"
  | "KICKSTARTER_TIER"
  | "HALL_OF_FAME"
  | "MANUAL";

export type UserBadgeStatus =
  | "LOCKED"
  | "ELIGIBLE"
  | "EARNED"
  | "ACTIVE"
  | "INACTIVE"
  | "REVOKED";

export type RewardLedgerType =
  | "BADGE_EARNED"
  | "BADGE_ACTIVATED"
  | "BADGE_RENEWED"
  | "BADGE_EXPIRED"
  | "BADGE_DEACTIVATED"
  | "BADGE_REVOKED"
  | "BADGE_REWARD_GRANTED"
  | "BADGE_REWARD_REMOVED"
  | "MILESTONE_REWARD"
  | "WEEKLY_CONTRIBUTION"
  | "STREAK_UPDATED"
  | "ADDITIONAL_REWARD_GRANTED"
  | "ADMIN_ADJUSTMENT"
  | "SHOWCASE_FEATURED"
  | "SHOWCASE_HIDDEN";

export type RewardOutboxStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";
export type RewardAuditActorType = "ADMIN" | "SYSTEM";
export type RewardAuditStatus = "SUCCESS" | "FAILED" | "WARNING";

export type BadgeListParams = {
  search?: string;
  category?: BadgeCategory;
  roleScope?: BadgeRoleScope;
  rewardType?: BadgeRewardType;
  triggerType?: BadgeTriggerType;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type AdminBadgeRow = {
  id: string;
  code: string;
  name: string;
  category: BadgeCategory;
  roleScope: BadgeRoleScope;
  triggerType: BadgeTriggerType;
  rewardType: BadgeRewardType;
  isActive: boolean;
  isPermanent: boolean;
  validityDays: number | null;
  earnedCount: number;
  activeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BadgeDefinition = AdminBadgeRow & {
  description?: string | null;
  requirementText?: string | null;
  rewardImpactText?: string | null;
  badgeScope: BadgeScope;
  threshold?: number | null;
  secondaryThreshold?: number | null;
  isPersistent: boolean;
  rewardValue?: number | null;
  rewardMeta?: Record<string, unknown> | null;
  refreshWindowDays?: number | null;
  gracePeriodDays?: number | null;
};

export type BadgeDefinitionPayload = {
  code?: string;
  name: string;
  description?: string;
  category?: BadgeCategory;
  requirementText?: string;
  rewardImpactText?: string;
  badgeScope?: BadgeScope;
  roleScope?: BadgeRoleScope;
  triggerType: BadgeTriggerType;
  threshold?: number;
  secondaryThreshold?: number;
  isPersistent?: boolean;
  isActive?: boolean;
  rewardType?: BadgeRewardType;
  rewardValue?: number;
  rewardMeta?: Record<string, unknown>;
  validityDays?: number;
  refreshWindowDays?: number;
  gracePeriodDays?: number;
};

export type RewardLedgerParams = {
  userId?: string;
  type?: RewardLedgerType;
  rewardType?: RewardLedgerType;
  rewardCode?: string;
  badgeDefinitionId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type RewardLedgerRow = {
  id: string;
  user?: { id: string; name: string | null; email: string | null } | null;
  badge?: { id: string; code: string; name: string } | null;
  rewardType: string;
  ledgerType: RewardLedgerType;
  description: string;
  createdAt: string;
  metadataSummary?: Record<string, unknown> | null;
  task?: { id: string; projectTitle: string | null } | null;
};

export type RewardOutboxHealth = {
  counts: Record<RewardOutboxStatus, number>;
  staleProcessingCount: number;
  oldestPendingAt: string | null;
  oldestFailedAt: string | null;
  latestProcessedAt: string | null;
  failedRecent: RewardOutboxRow[];
};

export type RewardOutboxRow = {
  id: string;
  taskId: string;
  status: RewardOutboxStatus;
  attempts: number;
  lastError?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RewardAuditParams = {
  action?: string;
  actorType?: RewardAuditActorType;
  actorId?: string;
  targetUserId?: string;
  badgeDefinitionId?: string;
  rewardBenefitId?: string;
  rewardOutboxId?: string;
  status?: RewardAuditStatus;
  source?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type RewardAuditRow = {
  id: string;
  action: string;
  module: string;
  actorType: RewardAuditActorType;
  actor?: { id: string; name: string | null } | null;
  targetUser?: { id: string; name: string | null } | null;
  badge?: { id: string; code: string; name: string } | null;
  source?: string | null;
  status: RewardAuditStatus;
  reason?: string | null;
  createdAt: string;
};

export type RewardAuditListData = {
  items: RewardAuditRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type UserRewardBadge = {
  badgeId: string;
  code: string;
  name: string;
  description?: string | null;
  category: BadgeCategory;
  status: UserBadgeStatus;
  roleScope: BadgeRoleScope;
  triggerType: BadgeTriggerType;
  isPermanent: boolean;
  isDynamic: boolean;
  requirementText?: string | null;
  rewardType: BadgeRewardType;
  rewardValue?: number | null;
  benefitText?: string | null;
  progress?: Record<string, unknown> | null;
  earnedAt?: string | null;
  activatedAt?: string | null;
  deactivatedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
  lastEvaluatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UserRewardDetail = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    status: string;
    createdAt: string;
    isVerified: boolean;
  };
  profile: Record<string, unknown>;
  badges: Record<string, UserRewardBadge[]>;
  benefits: Record<string, unknown[]>;
  recentLedger: unknown[];
  recentAuditLogs: RewardAuditRow[];
  ledgerSummary: { totalRows: number; lastEventAt: string | null };
  availableManualBadges: BadgeDefinition[];
  availableKickstarterBadges: BadgeDefinition[];
  availableHallOfFameBadges: BadgeDefinition[];
  assignmentSummary: Record<string, number>;
  summary: Record<string, number>;
};

export type AssignBadgeRequest = {
  userId: string;
  badgeId?: string;
  badgeCode?: string;
  reason: string;
  metadata?: Record<string, unknown>;
  overridePerformanceBadge?: boolean;
};

export type RevokeBadgeRequest = {
  userId: string;
  badgeId?: string;
  badgeCode?: string;
  reason: string;
  metadata?: Record<string, unknown>;
};
