export interface Feature {
  key: string;
  value: string;
}

export type SubscriptionFeature = Feature | string;

export type TierType = 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'ENTERPRISE';
export type VisibilityType = 'MODARATE' | 'HIGHER' | 'MAXIMUM'; // Kept 'MODARATE' spelling to match your payload typo
export type BillingIntervalType = 'YEARLY' | 'MONTHLY';

export interface SubscriptionPlan {
  id: string;
  tier: TierType;
  name: string;
  description: string;
  price: string; // Represented as string in payload (e.g., "44.99")
  credit: number;
  visibility: VisibilityType;
  monthlyTaskCredits: number;
  maxTaskCreditCapacity: number;
  billingInterval: BillingIntervalType;
  features: SubscriptionFeature[];
  isActive: boolean;
  maxWebsites: number | null;
  additionalWebsitePrice: string;
  maxSimultaneousTasks: number | null;
  visibilityCreditCapacity: number;
  taskCreditUnitPrice: string;
  visibilityCreditUnitPrice: string;
  referralEnabled: boolean;
  badges: string[] | null; // Adjusted based on standard null configurations
  bulkTaskCreditDiscounts: unknown[] | null; 
  bulkVisibilityCreditDiscounts: unknown[] | null;
  createdAt: string; // ISO Date String
  updatedAt: string; // ISO Date String
  isDeleted: boolean;
}

// Response Type (Array of Subscription Plans)
export type SubscriptionResponse = SubscriptionPlan[];

export interface PricingCardData extends SubscriptionPlan {
  icon: React.ElementType;
  highlighted?: boolean;
  buttonColor: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    url: string;
  };
}

export interface CheckoutSuccessResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    status: string;
    paymentStatus: string;
    subscription: any;
  };
}

export interface SubscriptionHistoryResponse {
  success: boolean;
  message: string;
  data: {
    data: any[];
    meta: {
      currentPage: number;
      perPage: number;
      totalItems: number;
      totalPages: number;
      pageItemCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    analytics: {
      totalSubscriptions: number;
      activeSubscriptions: number;
      cancelledSubscriptions: number;
      expiredSubscriptions: number;
      pendingSubscriptions: number;
      totalSpent: number;
    };
  };
}
