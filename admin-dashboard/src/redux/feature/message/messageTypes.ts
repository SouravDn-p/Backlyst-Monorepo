export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiPaginatedResponse<T, M = PaginationMeta> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    meta: M;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export type MessageContextType = "DIRECT" | "TASK" | "DISPUTE" | "ADMIN_SUPPORT";
export type MessageRecordType = "MESSAGE" | "FILE";
export type MessageRegistryStatus = "VERIFIED" | "FLAGGED" | "RESTRICTED";
export type MessageReportStatus = "PENDING" | "REVIEWED" | "DISMISSED" | "ACTION_TAKEN";
export type MessageReportReason =
  | "SPAM"
  | "ABUSE"
  | "FAKE_PROOF"
  | "OFF_PLATFORM_PAYMENT"
  | "SENSITIVE_INFORMATION"
  | "THREAT"
  | "OTHER";

export interface MessageUserSnapshot {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  isVerified?: boolean;
  imageKey?: string | null;
}

export interface MessageTaskSnapshot {
  id: string;
  projectTitle?: string | null;
  lifecycleStatus?: string | null;
  submissionStatus?: string | null;
}

export interface IAdminChatQuery {
  senderId?: string;
  receiverId?: string;
  senderEmail?: string;
  receiverEmail?: string;
  taskId?: string;
}

export interface IAdminMessageReportsQuery {
  status?: MessageReportStatus;
  reporterId?: string;
  messageId?: string;
  reason?: MessageReportReason;
  taskId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface IAdminReviewMessageReportPayload {
  id: string;
  status: Exclude<MessageReportStatus, "PENDING">;
  reviewNote?: string;
}

export interface IAdminRegistryQuery {
  recordType?: MessageRecordType;
  registryStatus?: MessageRegistryStatus;
  contextType?: MessageContextType;
  taskId?: string;
  senderId?: string;
  recipientId?: string;
  senderEmail?: string;
  recipientEmail?: string;
  hasFile?: "true" | "false";
  reportedOnly?: "true";
  reportCount?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface IAdminUpdateRegistryStatusPayload {
  id: string;
  registryStatus: MessageRegistryStatus;
  reason?: string;
}

export interface MessageReportSummary {
  id: string;
  messageId: string;
  reporterId: string;
  reason: MessageReportReason;
  note?: string | null;
  status: MessageReportStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  reporter?: MessageUserSnapshot | null;
  reviewedBy?: MessageUserSnapshot | null;
  message?: IRegistryRecord | null;
}

export interface IRegistryRecord {
  id: string;
  senderId?: string;
  recipientId?: string;
  senderEmailSnapshot?: string | null;
  recipientEmailSnapshot?: string | null;
  taskId?: string | null;
  contextType?: MessageContextType;
  recordType: MessageRecordType;
  registryStatus: MessageRegistryStatus;
  registryReason?: string | null;
  registryUpdatedAt?: string | null;
  registryUpdatedById?: string | null;
  reportCount?: number;
  latestReportId?: string | null;
  latestReport?: MessageReportSummary | null;
  isManualOverride?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  content?: string;
  fileUrl?: string;
  text?: string | null;
  document?: string | null;
  task?: MessageTaskSnapshot | null;
  sender?: MessageUserSnapshot | null;
  receiver?: MessageUserSnapshot | null;
  Sender?: MessageUserSnapshot | null;
  Receiver?: MessageUserSnapshot | null;
}
