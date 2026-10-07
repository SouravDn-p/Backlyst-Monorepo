// user.Types.ts

export type UserRole = "USER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

// export interface UserSession {
//   id: string;
//   ipAddress: string;
//   device: string;
//   userAgent: string;
//   loginAt: string;
//   logoutAt: string | null;
// }

export interface UserSession {
  id: string;
  ipAddress: string;
  device: string;
  userAgent: string;
  loginAt: string;
  logoutAt: string | null;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string | null;
  businessType: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  country: string | null;
  phoneNumber: string | null;
  vatUid: string | null;
  lastPasswordChangeTime: string | null;
  status: UserStatus;
  notificationTaskStatusUpdates?: boolean;
  notificationCreditBalanceAlerts?: boolean;
  notificationDisputeReviewNotifications?: boolean;
  notificationSystemAnnouncements?: boolean;
  referralCode?: string | null;
  isReferralEnabled?: boolean;
  sessions: UserSession[];
  image: string | null;
}

export interface GetUserResponse {
  success: boolean;
  message: string;
  data: UserData;
}
