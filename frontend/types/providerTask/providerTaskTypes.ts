export enum ProviderTaskPlacementType {
  BACKLINK_INSERTION = "BACKLINK_INSERTION",
  GUEST_POST = "GUEST_POST",
  FLEXIBLE = "FLEXIBLE",
}

export enum ProviderTaskLinkAttribute {
  DOFOLLOW = "DOFOLLOW",
  NOFOLLOW = "NOFOLLOW",
  UGC = "UGC",
  SPONSORED = "SPONSORED",
}

export enum ProviderOpportunityStatus {
  OPEN = "OPEN",
  WAITING_FOR_APPLICANTS = "WAITING_FOR_APPLICANTS",
}

export enum ProviderTaskScope {
  SELECTED = "SELECTED",
  APPLIED = "APPLIED",
  INVOLVED = "INVOLVED",
}

export enum ProviderTaskLifecycleStatus {
  ALL = "ALL",
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  WAITING_FOR_APPLICANTS = "WAITING_FOR_APPLICANTS",
  APPLIED = "APPLIED",
  SELECTED = "SELECTED",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  REVISION_REQUESTED = "REVISION_REQUESTED",
  REJECTED = "REJECTED",
  APPROVED = "APPROVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  FROZEN = "FROZEN",
  DISPUTED = "DISPUTED",
}

export enum ProviderTaskFinalTaskType {
  BACKLINK = "BACKLINK",
  GUEST_POST = "GUEST_POST",
}

export enum ProviderTaskCancelAction {
  ACCEPT = "ACCEPT",
  REJECT = "REJECT",
}

export interface ProviderTaskPerson {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string | null;
}

export interface ProviderTaskWebsite {
  id: string;
  name: string;
  websiteUrl: string;
  industry?: string | null;
  country?: string | null;
  verificationStatus?: string | null;
}

export interface ProviderTaskAttachment {
  id?: string;
  name?: string;
  fileName?: string;
  fileUrl?: string;
  url?: string;
}

export interface ProviderTaskApplication {
  id?: string;
  placementTaskId?: string;
  providerId?: string;
  providerWebsiteId?: string;
  status?: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  provider?: ProviderTaskPerson | null;
  providerWebsite?: ProviderTaskWebsite | null;
  domainRating?: number | null;
  rating?: number | null;
  reviews?: number | null;
  tags?: string[];
}

export interface ProviderTaskTimelineEvent {
  id?: string;
  placementTaskId?: string;
  requesterId?: string;
  providerId?: string;
  actorId?: string;
  requesterWebsiteId?: string;
  providerWebsiteId?: string;
  eventType?: string;
  actorRole?: string;
  fromStatus?: string;
  toStatus?: string;
  actionTaken?: string;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  eventKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProviderTask {
  id: string;
  requesterWebsiteId?: string;
  requesterWebsite?: ProviderTaskWebsite | null;
  requester?: ProviderTaskPerson | null;
  selectedProvider?: ProviderTaskPerson | null;
  providerWebsiteId?: string | null;
  providerWebsite?: ProviderTaskWebsite | null;
  projectTitle: string;
  targetUrl: string;
  anchorText: string;
  placementGuidelines?: string | null;
  requiredDomainRating?: number | null;
  placementType: ProviderTaskPlacementType;
  linkAttribute: ProviderTaskLinkAttribute;
  requestedDeadlineDays?: number | null;
  deliveryDeadline?: string | null;
  walletType?: string | null;
  lifecycleStatus: ProviderTaskLifecycleStatus;
  submissionStatus?: string | null;
  deadlineStatus?: string | null;
  isLate?: boolean;
  lateAt?: string | null;
  deadlineExtensionCount?: number;
  deadlineExtendedDaysTotal?: number;
  deadlineLastExtendedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  assignedAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  expiredAt?: string | null;
  frozenAt?: string | null;
  liveLinkUrl?: string | null;
  providerNote?: string | null;
  note?: string | null;
  providerProofDocuments?: string[];
  supportDocuments?: string[];
  finalTaskType?: ProviderTaskFinalTaskType | null;
  finalCreditCost?: number | null;
  providerRewardCredits?: number | null;
  completionRewardedAt?: string | null;
  cancellationRequestStatus?: string | null;
  cancellationRequestedById?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationRespondedAt?: string | null;
  selectedProviderId?: string | null;
  selectedApplicationId?: string | null;
  assignedProviderWebsiteId?: string | null;
  rewardCredits?: number | null;
  estimatedCredits?: number | null;
  creditCost?: number | null;
  reservedCreditAmount?: number | null;
  requesterRating?: number | null;
  requesterReviewCount?: number | null;
  applicationsCount?: number | null;
  files?: ProviderTaskAttachment[];
  application?: ProviderTaskApplication | null;
  taskFlows?: ProviderTaskTimelineEvent[];
  placementApplications?: ProviderTaskApplication[];
  mozAnalyticsHistories?: unknown[];
  deadlineExtensions?: DeadlineExtension[];
}

export interface DeadlineExtension {
  id: string;
  placementTaskId: string;
  requestedById: string;
  respondedById: string | null;
  previousDeadline: string;
  newDeadline: string;
  extendDays: number;
  reason: string | null;
  responseNote: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  respondedAt: string | null;
}

export interface ProviderTaskListMeta {
  page?: number;
  currentPage?: number;
  limit?: number;
  perPage?: number;
  totalItems: number;
  totalPages: number;
  pageItemCount?: number;
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ProviderTaskListResponse {
  items?: ProviderTask[];
  data?: ProviderTask[];
  meta: ProviderTaskListMeta;
}

export interface GetProviderOpportunitiesRequest {
  placementType?: ProviderTaskPlacementType;
  linkAttribute?: ProviderTaskLinkAttribute;
  status?: ProviderOpportunityStatus;
  page?: number;
  limit?: number;
}

export interface GetProviderOpportunitiesResponse {
  success: boolean;
  message: string;
  data: ProviderTaskListResponse;
}

export interface GetProviderTaskDetailRequest {
  taskId: string;
}

export interface GetProviderTaskDetailResponse {
  success: boolean;
  message: string;
  data: ProviderTask;
}

export interface ApplyToProviderTaskRequest {
  taskId: string;
  providerWebsiteId: string;
  note?: string;
}

export interface ApplyToProviderTaskResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    placementTaskId: string;
    providerId: string;
    providerWebsiteId: string;
    status: string;
  };
}

export interface GetProviderTasksRequest {
  scope?: ProviderTaskScope;
  lifecycleStatus?: ProviderTaskLifecycleStatus;
  page?: number;
  limit?: number;
}

export interface GetProviderTasksResponse {
  success: boolean;
  message: string;
  data: ProviderTaskListResponse;
}

export interface StartProviderTaskWorkRequest {
  taskId: string;
}

export interface StartProviderTaskWorkResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    lifecycleStatus: ProviderTaskLifecycleStatus;
  };
}

export interface SubmitProviderTaskPayload {
  deliveryMessage: string;
  proofUrl?: string;
  additionalNotes?: string;
  finalTaskType?: ProviderTaskFinalTaskType;
}

export interface SubmitProviderTaskRequest {
  taskId: string;
  data: SubmitProviderTaskPayload;
  files?: File[];
}

export interface SubmitProviderTaskResponse {
  success: boolean;
  message: string;
  data?: Partial<ProviderTask> & {
    id?: string;
    lifecycleStatus?: ProviderTaskLifecycleStatus;
  };
}

export interface RespondProviderCancelRequest {
  taskId: string;
  action: ProviderTaskCancelAction;
  note?: string;
}

export interface RespondProviderCancelResponse {
  success: boolean;
  message: string;
  data?: Partial<ProviderTask> & {
    id?: string;
    lifecycleStatus?: ProviderTaskLifecycleStatus;
  };
}

export interface ProviderDeadlineStatusResponse {
  success: boolean;
  message: string;
  data: {
    upcoming: ProviderTask[];
    dueToday: ProviderTask[];
    overdue: ProviderTask[];
    extended: ProviderTask[];
    counts: {
      upcoming: number;
      dueToday: number;
      overdue: number;
      extended: number;
    };
  };
}

export interface RequestProviderDeadlineExtensionRequest {
  taskId: string;
  extendDays: number;
  reason?: string;
}

export interface RequestProviderDeadlineExtensionResponse {
  success: boolean;
  message: string;
  data: DeadlineExtension;
}
