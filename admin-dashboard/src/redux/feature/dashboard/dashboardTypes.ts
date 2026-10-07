type CreditValue = {
  value: number;
  displayValue: string;
};

export type AdminDashboardOverview = {
  activeUsers: {
    count: number;
    description: string;
  };
  activeWebsites: {
    verified: number;
    pending: number;
    flagged: number;
  };
  taskOversight: {
    totalTasks: number;
    totalUsers: number;
    disputedTasks: number;
  };
  creditSimulation: {
    subscriptionCredits: CreditValue;
    referralEarnedCredits: CreditValue;
    visibilityCredits: CreditValue;
  };
};

export type AdminDashboardOverviewResponse = {
  success: boolean;
  message: string;
  data: AdminDashboardOverview;
};

export type AdminTaskLifecyclePanel = {
  range: string;
  from: string;
  to: string;
  lifecycle: {
    created: number;
    accepted: number;
    completed: number;
    disputed: number;
  };
  backlinkTrustRatio: {
    followCount: number;
    noFollowCount: number;
    followRatio: number;
    noFollowRatio: number;
  };
};

export type AdminTaskLifecyclePanelResponse = {
  success: boolean;
  message: string;
  data: AdminTaskLifecyclePanel;
};