export interface UpdateNotificationPreferencesRequest {
  notificationTaskStatusUpdates: boolean;
  notificationCreditBalanceAlerts: boolean;
  notificationDisputeReviewNotifications: boolean;
  notificationSystemAnnouncements: boolean;
}