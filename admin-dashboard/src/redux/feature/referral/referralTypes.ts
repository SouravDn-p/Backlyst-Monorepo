export type ReferralListParams = {
  page?: number;
  limit?: number;
  status?: string;
  conversion?: string;
  source?: string;
  search?: string;
};

export type ReferralItem = {
  referralId: string;
  userReferralId: string;
  referrer: {
    id: string;
    name: string;
    contactName: string;
    email: string;
    isReferralEnabled: boolean;
  };
  referred: {
    id: string;
    name: string;
    contactName: string;
    email: string;
    isReferralEnabled: boolean;
  };
  referredWebsite: {
    id: string;
    name: string;
    url: string;
    verificationStatus: string;
  } | null;
  source: string;
  sourceLabel: string;
  creditAmount: number;
  status: string;
  conversion: string;
  currentStage: string;
  signedUpAt: string;
  createdAt: string;
  oversightEndpoint: string;
};

export type ReferralListResponse = {
  success: boolean;
  message: string;
  data: {
    policy: string;
    emergencyFreeze: {
      frozen: boolean;
      reason: string | null;
      frozenAt: string | null;
    };
    items: ReferralItem[];
    meta: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};

export type ToggleReferralFreezeRequest = {
  reason: string;
  idempotencyKey: string;
};

export type ToggleReferralFreezeResponse = {
  success: boolean;
  message: string;
  data: {
    alreadyProcessed: boolean;
    auditId: string;
    config: {
      id: string;
      referralsFrozen: boolean;
      freezeReason: string | null;
      frozenById: string | null;
      frozenAt: string | null;
      updatedAt: string;
    };
  };
};

export type ReferralDetailResponse = {
  success: boolean;
  message: string;
  data: {
    referral: {
      id: string;
      userReferralId: string;
      status: string;
      source: string;
      sourceLabel: string;
      originalSource: string;
      codeUsed: string | null;
      currentStage: string;
      conversion: string;
      approvedAt: string | null;
      revokedAt: string | null;
      revokeReason: string | null;
      flaggedAt: string | null;
      flagReason: string | null;
    };
    chain: {
      referrer: {
        id: string;
        name: string;
        contactName: string;
        email: string;
        isReferralEnabled: boolean;
      };
      referred: {
        id: string;
        name: string;
        contactName: string;
        email: string;
        isReferralEnabled: boolean;
      };
      referredWebsite: any | null;
    };
    credit: {
      type: string;
      totalIssued: number;
      rewards: any[];
    };
    history: any[];
    auditTrail: any[];
    actions: {
      canApprove: boolean;
      canRevoke: boolean;
      canDisableEntityReferrals: boolean;
    };
  };
};

export type ApproveReferralCreditRequest = {
  referralId: string;
  reason: string;
  idempotencyKey: string;
  creditAmount: number;
};

export type RevokeReferralCreditRequest = {
  referralId: string;
  reason: string;
  idempotencyKey: string;
};

export type DisableEntityReferralsRequest = {
  referralId: string;
  reason: string;
  idempotencyKey: string;
  target: "REFERRER" | "REFERRED";
};