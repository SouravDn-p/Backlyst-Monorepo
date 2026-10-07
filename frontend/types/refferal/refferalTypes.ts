// Referral Progress

export interface ReferralUser {
  id: string;
  name: string;
  email: string;
}

export interface ReferralWebsite {
  id: string;
  name: string;
  websiteUrl: string;
}

export interface ReferralStage {
  completed: boolean;
  taskCreditsEarned: number;
  visibilityCreditsEarned: number;
  rewardedAt: string | null;
}

export interface ReferralProgress {
  referralId: string;
  codeUsed: string;
  currentStage:
    | "SIGNED_UP"
    | "WEBSITE_VERIFIED"
    | "FIRST_BACKLINK_ACCEPTED"
    | "PAID_SUBSCRIPTION";

  referredUser: ReferralUser;
  referredWebsite: ReferralWebsite;

  signedUpAt: string;
  websiteVerifiedAt: string | null;
  firstBacklinkAt: string | null;
  paidSubscriptionAt: string | null;

  stage1: ReferralStage;
  stage2: ReferralStage;
  stage3: ReferralStage;

  totalTaskCreditsEarned: number;
  totalVisibilityCreditsEarned: number;
}

export type GetReferralProgressResponse = ReferralProgress[];

// Referral Summary

export interface ReferralSummary {
  referralCode: string;
  referralLink: string;
  isReferralEnabled: boolean;

  totalReferrals: number;
  earnedTaskCredits: number;
  earnedVisibilityCredits: number;
  earnedCredits: number;

  convertedReferrals: number;
  conversionRate: number;
}