export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export type DisputeDecision =
  | "RESOLVE_IN_FAVOR_OF_REQUESTER"
  | "RESOLVE_IN_FAVOR_OF_PROVIDER"
  | "REJECT"
  | "MARK_UNDER_REVIEW";

export type CreditAdjustmentType = "REFUND_REQUESTER" | "REWARD_PROVIDER" | "NONE";

export type WalletType = "SUBSCRIPTION" | "PURCHASED" | "REFERRAL" | "EARNED";

export interface DisputeEvidence {  
  notes?: string;
  screenshotKeys?: string[];
  [key: string]: unknown;
}

export interface Dispute {
  id: string;
  taskId: string;
  requesterWebsiteId: string | null;
  providerWebsiteId: string | null;
  openedById: string;
  resolvedById: string | null;
  status: DisputeStatus;
  reason: string;
  evidence: DisputeEvidence | null;
  creditAdjustmentId: string | null;
  openedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeListMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Open Dispute ───────────────────────────────────────────────────────────

export interface OpenDisputeRequest {
  taskId: string;
  reason: string;
  evidence?: DisputeEvidence;
}

export interface OpenDisputeResponse {
  success: boolean;
  message: string;
  data: Dispute;
}

// ─── List Disputes ───────────────────────────────────────────────────────────

export interface GetDisputesRequest {
  status?: DisputeStatus;
  taskId?: string;
  page?: number;
  limit?: number;
}

export interface GetDisputesResponse {
  success: boolean;
  message: string;
  data: {
    items: Dispute[];
    meta: DisputeListMeta;
  };
}

// ─── Resolve Dispute (Admin) ─────────────────────────────────────────────────

export interface CreditAdjustmentPayload {
  type: CreditAdjustmentType;
  amount?: number;
  walletType?: WalletType;
  note?: string;
}

export interface ResolveDisputeRequest {
  id: string;
  decision?: DisputeDecision;
  creditAdjustment?: CreditAdjustmentPayload;
}

export interface ResolveDisputeResponse {
  success: boolean;
  message: string;
  data: Dispute;
}
