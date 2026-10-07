export type BusinessType =
  | "INDIVIDUAL"
  | "SOLE_PROPRIETORSHIP"
  | "PARTNERSHIP"
  | "LIMITED_LIABILITY_COMPANY"
  | "PRIVATE_LIMITED_COMPANY"
  | "PUBLIC_LIMITED_COMPANY"
  | "CORPORATION"
  | "NON_PROFIT"
  | "GOVERNMENT"
  | "EDUCATIONAL"
  | "OTHER";

export interface UpdateProfileRequest {
  name?: string;
  phoneNumber?: string;
  country?: string;
  companyName?: string;
  businessType?: BusinessType;
  vatUid?: string;
  newPassword?: string;
  file?: File;
}
export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  country: string;
  companyName: string;
  businessType: BusinessType;
  vatUid: string;
  imageKey: string | null;
  status: string;
  role: string;

  notificationTaskStatusUpdates: boolean;
  notificationCreditBalanceAlerts: boolean;
  notificationDisputeReviewNotifications: boolean;
  notificationSystemAnnouncements: boolean;

  registrationTime: string;
  lastPasswordChangeTime: string;
  image: string | null;
}