export interface RequesterDashboardSummaryResponse {
  success: boolean;
  message: string;
  data: {
    tasks: {
      created: number;
      open: number;
      waitingForApplicants: number;
      assigned: number;
      inProgress: number;
      submitted: number;
      revisionRequested: number;
      approved: number;
      completed: number;
      cancelled: number;
      disputed: number;
      expired: number;
      frozen: number;
      lateTasks: number;
    };
    spend: {
      totalTaskCreditsSpent: number;
      subscriptionCreditsSpent: number;
      purchasedCreditsSpent: number;
      referralCreditsSpent: number;
      earnedCreditsSpent: number;
    };
    performance: {
      completionRate: number;
      disputeRate: number;
      cancellationRate: number;
      approvalRate: number;
    };
    meta: {
      requesterId: string;
      websiteId: string | null;
      range: string;
      from: string;
      to: string;
    };
  };
}

export interface RequesterDashboardSummaryQuery {
  range?: string;
  from?: string;
  to?: string;
  websiteId?: string;
}