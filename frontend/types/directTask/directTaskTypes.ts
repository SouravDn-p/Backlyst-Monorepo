import type {
  RequesterTaskDeadlineDays,
  RequesterTaskLinkAttribute,
  RequesterTaskPlacementType,
  RequesterTaskWalletType,
} from "@/types/requesterTask/requesterTaskTypes";

export type DirectTaskRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export interface CreateDirectTaskPayload {
  requesterWebsiteId: string;
  targetProviderId: string;
  projectTitle: string;
  targetUrl: string;
  anchorText: string;
  placementGuidelines?: string;
  requiredDomainRating?: number;
  placementType: RequesterTaskPlacementType;
  linkAttribute: RequesterTaskLinkAttribute;
  requestedDeadlineDays: RequesterTaskDeadlineDays;
  walletType: RequesterTaskWalletType;
}

export interface CreateDirectTaskRequest {
  data: CreateDirectTaskPayload;
  files?: File[];
}

export interface DirectTaskRequestItem {
  id: string;
  requesterId: string;
  requesterWebsiteId: string;
  targetProviderId: string;
  projectTitle: string;
  targetUrl: string;
  anchorText: string;
  placementGuidelines?: string | null;
  requiredDomainRating?: number | null;
  placementType: RequesterTaskPlacementType;
  linkAttribute: RequesterTaskLinkAttribute;
  requestedDeadlineDays: number;
  creditCost: number;
  reservedCreditAmount: number;
  walletType: RequesterTaskWalletType;
  status: DirectTaskRequestStatus;
  createdTaskId?: string | null;
  supportDocuments?: string[];
  expiresAt?: string;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDirectTaskResponse {
  success: boolean;
  message: string;
  data: DirectTaskRequestItem;
}

export interface GetDirectTasksRequest {
  page?: number;
  limit?: number;
  status?: DirectTaskRequestStatus | "ALL";
}

export interface PaginatedDirectTasksResponse {
  success: boolean;
  message: string;
  data: {
    items: DirectTaskRequestItem[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
  };
}

export interface AcceptDirectTaskPayload {
  providerWebsiteId?: string;
}

export interface AcceptDirectTaskRequest {
  id: string;
  data: AcceptDirectTaskPayload;
}

export interface RejectDirectTaskPayload {
  rejectionReason?: string;
}

export interface RejectDirectTaskRequest {
  id: string;
  data: RejectDirectTaskPayload;
}

export interface CancelDirectTaskPayload {
  cancellationReason?: string;
}

export interface CancelDirectTaskRequest {
  id: string;
  data: CancelDirectTaskPayload;
}

export interface ActionDirectTaskResponse {
  success: boolean;
  message: string;
  data: any;
}
