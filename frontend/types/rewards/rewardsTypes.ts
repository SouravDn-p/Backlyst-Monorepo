export interface BadgeProgress {
  current: number | null;
  target: number | null;
  percentage: number | null;
  label: string | null;
  details?: Record<string, any>;
}

export interface NextBadge {
  badgeId: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  roleScope: string;
  status: string;
  isPermanent: boolean;
  isDynamic: boolean;
  iconKey: string | null;
  iconUrl: string | null;
  requirementText: string | null;
  rewardType: string;
  rewardValue: string | null;
  benefitText: string | null;
  progress: BadgeProgress;
  progressLabel: string | null;
  earnedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  lastEvaluatedAt: string | null;
  revokedAt: string | null;
  triggerType: string;
  badgeScope: string;
}

export interface RewardSummary {
  badgesEarned: number;
  activeBadges: number;
  lockedBadges: number;
  inactiveBadges: number;
  activeBenefits: number;
  kickstarterBadges: number;
  hallOfFameBadges: number;
  nextBadge: NextBadge | null;
}

export interface RewardProfile {
  id: string;
  userId: string;
  totalApprovedTasks: number;
  providerApprovedTasks: number;
  requesterCompletedTasks: number;
  providerReviewedTasks: number;
  providerApprovalRate: number;
  providerDisputeRate: number;
  providerRevisionRate: number;
  providerResponseRate24h: number;
  providerFastResponseCount: number;
  providerResponseOpportunityCount: number;
  requesterReviewRate72h: number;
  requesterFastReviewCount: number;
  requesterReviewOpportunityCount: number;
  requesterDisputeRate: number;
  currentStreakCount: number;
  bestStreakCount: number;
  milestoneTaskCount: number;
  nextMilestoneAt: number;
  uniqueRequesterCount: number;
  uniqueProviderCount: number;
  uniqueDomainCount: number;
  earnedBadgeCount: number;
  activeRewardCount: number;
  lastRewardEvaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeGroups {
  earned: NextBadge[];
  active: NextBadge[];
  locked: NextBadge[];
  inactive: NextBadge[];
  kickstarter: NextBadge[];
  hallOfFame: NextBadge[];
}

export interface AdditionalReward {
  code: string;
  title: string;
  description: string | null;
  rewardType: string;
  roleScope: string;
  requirementText: string;
  rewardValueText: string;
  status: string;
  progress: Record<string, any>;
  activeBenefit: any | null;
}

export interface RewardsOverviewResponse {
  success: boolean;
  message: string;
  data: {
    summary: RewardSummary;
    profile: RewardProfile;
    badges: BadgeGroups;
    activeBenefits: any[];
    additionalRewards: AdditionalReward[];
    recentLedger: any[];
    nextAchievements: NextBadge[];
  };
}

export interface RewardsBadgesResponse {
  success: boolean;
  message: string;
  data: {
    all?: NextBadge[];
    active?: NextBadge[];
    earned?: NextBadge[];
    locked?: NextBadge[];
    inactive?: NextBadge[];
    kickstarter?: NextBadge[];
    hallOfFame?: NextBadge[];
  };
}

export interface AdditionalRewardsResponse {
  success: boolean;
  message: string;
  data: AdditionalReward[];
}

export interface LedgerItem {
  id: string;
  type: string;
  title: string;
  description: string;
  badge: {
    id: string;
    name: string;
    code: string;
  };
  benefit: any | null;
  createdAt: string;
}

export interface LedgerResponse {
  items: LedgerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
