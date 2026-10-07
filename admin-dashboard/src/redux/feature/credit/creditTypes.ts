export type CreditAmount = {
  value: number;
  displayValue: string;
};

export type CreditUsageAmount = {
  value: number;
  displayValue: string;
};

export type CreditGovernanceSummaryResponse = {
  success: boolean;
  message: string;
  data: {
    subscriptionPoolCredits: CreditAmount;
    referralCredits: CreditAmount;
    visibilityPoolCredits: CreditAmount;
    earnedCredits: CreditAmount;
    creditUsage: {
      used: CreditUsageAmount;
      available: CreditUsageAmount;
    };
  };
};

export type TaskCreditAdjustmentRequest = {
  websiteId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
};

export type TaskCreditAdjustmentResponse = {
  success: boolean;
  message: string;
  data: {
    adjustmentId?: string;
    creditLogId?: string;
    websiteId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    alreadyProcessed: boolean;
  };
};

export type VisibilityCreditAdjustmentResponse = {
  success: boolean;
  message: string;
  data: {
    websiteId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    visibilityDays: number;
    visibilityActiveUntil: string;
    alreadyProcessed: boolean;
  };
};

export type WalletLockRequest = {
  websiteId: string;
  locked: boolean;
  reason: string;
};

export type WalletLockResponse = {
  success: boolean;
  message: string;
  data: {
    websiteId: string;
    locked: boolean;
    changed: boolean;
    reason: string;
    auditId: string;
    updatedAt: string;
  };
};

export type CreditTransactionLog = {
  id: string;
  creditType: string;
  action: string;
  reason: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  taskId: string | null;
  referralId: string | null;
  subscriptionId: string | null;
  note: string | null;
  createdAt: string;
  signedAmount: number;
};

export type WebsiteCreditDetailsResponse = {

  success: boolean;
  message: string;
  data: {
    website: {
      id: string;
      name: string;
      url: string;
      verificationStatus: string;
    };
    wallet: {
      subscriptionCredits: number;
      earnedCredits: number;
      purchasedCredits: number;
      referralCredits: number;
      visibilityCredits: number;
      visibilityActiveUntil: string | null;
      creditOnHold: number;
      status: string;
    };
    subscription: {
      id: string;
      tier: string;
      name: string;
      cost: number;
      billingInterval: string;
      status: string;
      startDate: string;
      endDate: string;
      autoRenew: boolean;
    } | null;
    transactions: CreditTransactionLog[];

    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};
