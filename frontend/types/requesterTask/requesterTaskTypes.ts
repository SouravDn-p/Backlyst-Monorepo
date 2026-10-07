export enum RequesterTaskPlacementType {
  BACKLINK_INSERTION = "BACKLINK_INSERTION",
  GUEST_POST = "GUEST_POST",
  FLEXIBLE = "FLEXIBLE",
}

export enum RequesterTaskLinkAttribute {
  DOFOLLOW = "DOFOLLOW",
  NOFOLLOW = "NOFOLLOW",
  UGC = "UGC",
  SPONSORED = "SPONSORED",
}

export enum RequesterTaskWalletType {
  SUBSCRIPTION = "SUBSCRIPTION",
  PURCHASED = "PURCHASED",
  REFERRAL = "REFERRAL",
  EARNED = "EARNED",
}

export enum RequesterTaskDeadlineDays {
  THREE = 3,
  FIVE = 5,
  SEVEN = 7,
  TEN = 10,
  FOURTEEN = 14,
  TWENTY_ONE = 21,
  THIRTY = 30,
}

export enum RequesterTaskLifecycleStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  WAITING_FOR_APPLICANTS = "WAITING_FOR_APPLICANTS",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  REVISION_REQUESTED = "REVISION_REQUESTED",
  APPROVED = "APPROVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  FROZEN = "FROZEN",
  DISPUTED = "DISPUTED",
}

export enum RequesterTaskDeadlineStatus {
  LATE = "LATE",
  ONTIME = "ONTIME",
}

export enum RequesterTaskSubmissionStatus {
  NOT_SUBMITTED = "NOT_SUBMITTED",
  SUBMITTED = "SUBMITTED",
  REVISION_REQUESTED = "REVISION_REQUESTED",
  APPROVED = "APPROVED",
}

export enum RequesterTaskReviewAction {
  APPROVE = "APPROVE",
  REQUEST_REVISION = "REQUEST_REVISION",
  REJECT = "REJECT",
}

export enum RequesterTaskCancelAction {
  ACCEPT = "ACCEPT",
  REJECT = "REJECT",
}

export interface RequesterTaskUser {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  role?: string | null;
}

export interface RequesterTaskWebsite {
  id: string;
  name: string;
  websiteUrl: string;
  industry?: string | null;
  country?: string | null;
}

export interface RequesterTaskAttachment {
  id?: string;
  name?: string;
  fileName?: string;
  fileUrl?: string;
  url?: string;
}

export interface RequesterTaskTimelineEvent {
  id?: string;
  label?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  eventType?: string;
  note?: string | null;
}

export interface RequesterTaskApplicant {
  id: string;
  placementTaskId?: string;
  providerId?: string;
  providerWebsiteId?: string;
  status?: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  provider?: RequesterTaskUser | null;
  providerWebsite?: RequesterTaskWebsite | null;
  domainRating?: number | null;
  rating?: number | null;
  reviews?: number | null;
  tags?: string[];
}

export interface RequesterTaskPlacementApplication {
  id: string;
  placementTaskId?: string;
  providerId?: string;
  providerWebsiteId?: string;
  status?: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  provider?: RequesterTaskUser | null;
  providerWebsite?: RequesterTaskWebsite | null;
  domainRating?: number | null;
  rating?: number | null;
  reviews?: number | null;
  tags?: string[];
}

export interface RequesterTask {
  id: string;
  requesterWebsiteId: string;
  requesterWebsite?: RequesterTaskWebsite | null;
  projectTitle: string;
  targetUrl: string;
  anchorText: string;
  placementGuidelines?: string | null;
  requiredDomainRating?: number | null;
  placementType: RequesterTaskPlacementType;
  linkAttribute: RequesterTaskLinkAttribute;
  requestedDeadlineDays: number;
  walletType: RequesterTaskWalletType;
  lifecycleStatus: RequesterTaskLifecycleStatus;
  submissionStatus: RequesterTaskSubmissionStatus;
  deadlineStatus?: RequesterTaskDeadlineStatus | null;
  isLate?: boolean;
  lateAt?: string | null;
  responsibilityType?: string | null;
  creditCost?: number | null;
  reservedCreditAmount?: number | null;
  providerRewardCredits?: number | null;
  finalCreditCost?: number | null;
  finalTaskType?: string | null;
  completionRewardedAt?: string | null;
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
  deliveryMessage?: string | null;
  proofUrl?: string | null;
  additionalNotes?: string | null;
  providerNote?: string | null;
  provider?: RequesterTaskUser | null;
  selectedProvider?: RequesterTaskUser | null;
  requester?: RequesterTaskUser | null;
  applicationsCount?: number;
  selectedProviderId?: string | null;
  selectedApplicationId?: string | null;
  assignedProviderWebsiteId?: string | null;
  deliveryDeadline?: string | null;
  deadlineExtensionCount?: number;
  deadlineExtendedDaysTotal?: number;
  deadlineLastExtendedAt?: string | null;
  cancellationRequestStatus?: string | null;
  cancellationRequestedById?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationRespondedAt?: string | null;
  supportDocuments?: string[];
  providerProofDocuments?: string[];
  files?: RequesterTaskAttachment[];
  timeline?: RequesterTaskTimelineEvent[];
  taskFlows?: RequesterTaskTimelineEvent[];
  placementApplications?: RequesterTaskPlacementApplication[];
  deadlineExtensions?: DeadlineExtension[];
  _count?: {
    placementApplications?: number;
    taskFlows?: number;
  };
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

export interface CreateRequesterTaskPayload {
  requesterWebsiteId: string;
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

export interface CreateRequesterTaskRequest {
  data: CreateRequesterTaskPayload;
  files?: File[];
}

export interface RequesterMozStatsRequest {
  domain: string;
}

export interface RequesterMozStatsResponse {
  success: boolean;
  message: string;
  data: {
    domain: string;
    normalizedDomain: string;
    metrics: {
      domainAuthority: number;
      pageAuthority: number;
      spamScore: number;
    };
  };
}

export interface CreateRequesterTaskResponse {
  success: boolean;
  message: string;
  data: RequesterTask;
}

export interface GetRequesterTasksRequest {
  status?: RequesterTaskLifecycleStatus;
  deadlineStatus?: RequesterTaskDeadlineStatus;
  page?: number;
  limit?: number;
}

export interface RequesterTaskListMeta {
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

export interface GetRequesterTasksResponse {
  success: boolean;
  message: string;
  data: {
    items: RequesterTask[];
    meta: RequesterTaskListMeta;
  };
}

export interface GetRequesterTaskResponse {
  success: boolean;
  message: string;
  data: RequesterTask;
}

export interface GetRequesterTaskApplicantsRequest {
  taskId: string;
  page?: number;
  limit?: number;
}

export interface GetRequesterTaskApplicantsResponse {
  success: boolean;
  message: string;
  data: {
    items: RequesterTaskApplicant[];
    meta: RequesterTaskListMeta;
  };
}

export interface SelectRequesterTaskProviderRequest {
  taskId: string;
  applicationId: string;
}

export interface SelectRequesterTaskProviderResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    selectedProviderId: string;
    selectedApplicationId: string;
    assignedProviderWebsiteId: string;
    lifecycleStatus: RequesterTaskLifecycleStatus;
    deliveryDeadline: string;
  };
}

export interface GetRequesterTaskTimelineResponse {
  success: boolean;
  message: string;
  data: RequesterTaskTimelineEvent[] | { data: RequesterTaskTimelineEvent[] };
}

export interface ReviewRequesterTaskRequest {
  taskId: string;
  action: RequesterTaskReviewAction;
  note: string;
  rating?: number;
  review?: string;
}

export interface ReviewRequesterTaskResponse {
  success: boolean;
  message: string;
  data: RequesterTask;
}

export interface CancelRequesterTaskRequest {
  taskId: string;
  note?: string;
}

export interface CancelRequesterTaskResponse {
  success: boolean;
  message: string;
  data: RequesterTask;
}

export interface UpdateRequesterTaskDeadlineRequest {
  taskId: string;
  requestedDeadlineDays: RequesterTaskDeadlineDays;
}

export interface UpdateRequesterTaskDeadlineResponse {
  success: boolean;
  message: string;
  data: RequesterTask;
}

export interface SubmitQualityRubricRequest {
  taskId: string;
  contentRelevance: number;
  technicalQuality: number;
  communication: number;
  timeliness: number;
  overallSatisfaction: number;
  comments?: string;
}

export interface SubmitQualityRubricResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface RespondRequesterDeadlineExtensionRequest {
  taskId: string;
  requestId: string;
  action: "APPROVE" | "REJECT";
  note?: string;
}

export interface RespondRequesterDeadlineExtensionResponse {
  success: boolean;
  message: string;
  data: DeadlineExtension;
}
