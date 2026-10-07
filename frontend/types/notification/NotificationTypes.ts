// ─── Enums ────────────────────────────────────────────────────────────────────

export type NotificationStatus = "UNREAD" | "READ";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type NotificationAudience = "USER" | "ADMIN";

export type NotificationCategory =
  | "TASK_STATUS"
  | "CREDIT_BALANCE"
  | "DISPUTE_REVIEW"
  | "SYSTEM_ANNOUNCEMENT"
  | "MESSAGE"
  | "REWARD"
  | "MARKETPLACE"
  | "SECURITY";

export type NotificationEntityType =
  | "TASK"
  | "WEBSITE"
  | "CREDIT"
  | "MESSAGE"
  | "REWARD"
  | "BADGE"
  | "SUBSCRIPTION"
  | "USER";

export type NotificationType =
  // Task
  | "TASK_CREATED"
  | "TASK_APPLICATION_RECEIVED"
  | "TASK_PROVIDER_SELECTED"
  | "TASK_STARTED"
  | "TASK_PROOF_SUBMITTED"
  | "TASK_REVISION_REQUESTED"
  | "TASK_APPROVED"
  | "TASK_REJECTED"
  | "TASK_CANCELLED"
  | "TASK_CANCELLATION_REQUESTED"
  | "TASK_CANCELLATION_REQUEST_REJECTED"
  | "TASK_DEADLINE_EXTENSION_REQUESTED"
  | "TASK_DEADLINE_EXTENSION_APPROVED"
  | "TASK_DEADLINE_EXTENSION_REJECTED"
  | "TASK_STATUS_UPDATED"
  | "TASK_DISPUTED"
  | "TASK_COMPLETED"
  // Credit
  | "CREDIT_DEDUCTED"
  | "CREDIT_REFUNDED"
  | "CREDIT_REWARDED"
  | "CREDIT_LOW_BALANCE"
  // Message
  | "MESSAGE_RECEIVED"
  | "MESSAGE_REPORTED"
  // Reward
  | "REWARD_EARNED"
  | "BADGE_UNLOCKED"
  | "MILESTONE_REACHED"
  | "STREAK_UPDATED"
  | "WEEKLY_CONTRIBUTION_REWARDED"
  // Marketplace
  | "MARKETPLACE_NEW_OPPORTUNITY"
  | "MARKETPLACE_LOW_ACTIVITY_REMINDER"
  | "MARKETPLACE_FIRST_SUCCESS"
  // Website
  | "WEBSITE_VERIFIED"
  | "WEBSITE_REJECTED"
  | "WEBSITE_FLAGGED"
  | "WEBSITE_VISIBILITY_EXPIRING"
  | "WEBSITE_VISIBILITY_EXPIRED"
  // System
  | "SYSTEM_ANNOUNCEMENT";

// ─── Core Model ───────────────────────────────────────────────────────────────

export interface INotification {
  id: string;
  audience: NotificationAudience;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  priority: NotificationPriority;
  data: Record<string, any>;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
}

// ─── List / Pagination ────────────────────────────────────────────────────────

export interface INotificationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface INotificationListResponse {
  success: boolean;
  message: string;
  data: {
    data: INotification[];
    meta: INotificationMeta;
  };
}

// ─── Unread Count ─────────────────────────────────────────────────────────────

export interface INotificationUnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
  };
}

// ─── Read Actions ─────────────────────────────────────────────────────────────

export interface IMarkAllReadResponse {
  success: boolean;
  message: string;
  data: {
    updatedCount: number;
  };
}

export interface IMarkOneReadResponse {
  success: boolean;
  message: string;
  data: INotification;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export interface INotificationPreferences {
  taskStatusUpdates: boolean;
  creditBalanceAlerts: boolean;
  disputeReviewNotifications: boolean;
  systemAnnouncements: boolean;
  contactPreferenceTags: string[];
}

export interface INotificationPreferencesResponse {
  success: boolean;
  message: string;
  data: INotificationPreferences;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface INotificationListQuery {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  entityType?: NotificationEntityType;
  dateFrom?: string;
  dateTo?: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export type NotificationSocketEventName =
  | "notification:new"
  | "notification:unread_count"
  | "notification:read"
  | "notification:read_all";

export interface INotificationSocketEvent {
  event: NotificationSocketEventName;
  data: any;
}
