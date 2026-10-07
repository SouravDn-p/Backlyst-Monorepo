export interface ProviderDashboardSummaryResponse {
  success: boolean;
  message: string;
  data: ProviderDashboardSummary;
}

export interface ProviderDashboardSummary {
  applications: {
    totalApplied: number;
    selected: number;
    rejected: number;
    pending: number;
    submitted: number;
    inProgress: number;
    completed: number;
  };

  tasks: {
    assigned: number;
    inProgress: number;
    submitted: number;
    revisionRequested: number;
    completed: number;
    cancelled: number;
    disputed: number;
    expired: number;
    lateTasks: number;
  };

  performance: {
    approvalRate: number;
    completionRate: number;
    revisionRate: number;
    disputeRate: number;
  };

  contribution: {
    verifiedPlacements: number;
    lastVerifiedPlacementAt: string | null;
    lastMilestoneAtCount: number;
    nextMilestoneAt: number;
    placementsUntilNextMilestone: number;
    contributionRewardsCount: number;
  };

  meta: {
    providerId: string;
    websiteId: string | null;
    range: string;
    from: string;
    to: string;
  };
}

export interface ProviderDashboardSummaryQuery {
  range?: string;
  from?: string;
  to?: string;
  websiteId?: string;
}