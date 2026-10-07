export interface ActiveSubscriptionSummary {
  id: string;
  planId: string;
  planName: string;
  status: string;
}

export interface DashboardCreditSummary {
  availableCredits: number;
  availableVisibilityCredits: number;
  usedThisMonth: number;
  maximumCapacity: number;
  activeSubscription: ActiveSubscriptionSummary | null;
}

export interface BuyPurchasedCreditsRequest {
  amount: number;
  note?: string;
}

export interface BuyVisibilityCreditsRequest {
  websiteId: string;
  amount: number;
  note?: string;
}

export interface CreditCheckoutPricing {
  bundleCount?: number;
  singleCount?: number;
  totalAmountPence: number;
  totalAmount: string;
  currency: string;
}

export interface CreditCheckoutSession {
  sessionId: string;
  url: string;
  purchasedCredits?: number;
  visibilityCredits?: number;
  pricing: CreditCheckoutPricing;
}

export interface CreditCheckoutResponse {
  success: boolean;
  message: string;
  data: CreditCheckoutSession;
}

export interface CreditStatementTransaction {
  id?: string;
  transactionId?: string;
  tx?: string;
  date?: string;
  timestamp?: string;
  createdAt?: string;
  description?: string;
  note?: string;
  status?: string;
  type?: string;
  action?: string;
  reason?: string;
  creditType?: string;
  logicalCreditBucket?: string;
  direction?: string;
  amount?: number | string;
  credits?: number | string;
  creditAmount?: number | string;
  balanceBefore?: number | string;
  balanceAfter?: number | string;
  websiteId?: string | null;
  taskId?: string | null;
  referralId?: string | null;
  subscriptionId?: string | null;
}

export interface CreditStatementMeta {
  page?: number;
  limit?: number;
  totalItems?: number;
  total?: number;
  count?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export type CreditStatementData =
  | CreditStatementTransaction[]
  | {
      data: CreditStatementTransaction[];
      items?: CreditStatementTransaction[];
      meta?: CreditStatementMeta;
    }
  | {
      items: CreditStatementTransaction[];
      meta?: CreditStatementMeta;
    };

export interface CreditStatementResponse {
  success?: boolean;
  message?: string;
  data?: CreditStatementData;
  items?: CreditStatementTransaction[];
  meta?: CreditStatementMeta;
}

export interface ReferralProgressStage {
  completed: boolean;
  taskCreditsEarned: number;
  visibilityCreditsEarned: number;
  rewardedAt: string | null;
}


export interface AllocatePurchasedCreditsRequest {
  websiteId: string;
  amount: number;
  note?: string;
}

export interface AllocatePurchasedCreditsResponse {
  success: boolean;
  websiteId: string;
  allocatedAmount: number;
  masterPurchasedTaskCredits: number;
  websiteAllocatedPurchasedCredits: number;
}

export interface CreditsMeResponse {
  masterSubscriptionTaskCredits: number;
  websiteSubscriptionTaskCredits: number;
  subscriptionCredits: number;
  earnedTaskCredits: number;
  purchasedTaskCredits: number;
  referralTaskCredits: number;
  visibilityCredits: number;
  totalTaskCredits: number;
  lifetimeTotalCreditEarned: number;
  thisMonthTotalCredits: number;
  completedTaskTotalCredits: number;
}

export interface PurchasedCheckoutSuccessResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    paymentStatus: string;
    boughtAmount: number;
    purchasedTaskCredits: number;
  };
}

export interface VisibilityCheckoutSuccessResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    paymentStatus: string;
    boughtAmount: number;
    masterVisibilityCredits: number;
  };
}

// Website Credit Types

export interface WebsiteCreditInfo {
  id: string;
  name: string;
  websiteUrl: string;
  verificationStatus: string;
}

export interface WebsiteCreditBalances {
  subscriptionTaskCredits: number;
  earnedTaskCredits: number;
  allocatedPurchasedCredits: number;
  allocatedReferralCredits: number;
  visibilityCredits: number;
  totalTaskCredits: number;
}

export interface WebsiteCreditWalletResponse {
  website: WebsiteCreditInfo;
  balances: WebsiteCreditBalances;
}

export interface WebsiteCreditSummaryMeta {
  totalTransactions: number;
  latestActivityAt: string | null;
}

export interface WebsiteCreditSummaryResponse {
  website: WebsiteCreditInfo;
  balances: WebsiteCreditBalances;
  meta: WebsiteCreditSummaryMeta;
}
