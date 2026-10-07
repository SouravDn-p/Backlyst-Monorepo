import { ReferralProgress } from "@/types/refferal/refferalTypes";

export type ReferralStatus = "Active" | "Pending" | "Completed";

export interface ReferralRow {
  id: string;
  site: string;
  company: string;
  stage: number;
  completedActions: string[];
  nextRequirement: string;
  rewardsEarned: string;
  status: ReferralStatus;
}

export const STAGE_BADGE: Record<number, string> = {
  0: "bg-[#f2f4f7] text-[#535862]",
  1: "bg-[#FFF4ED] text-secondary",
  2: "bg-[#EFF8FF] text-[#175CD3]",
  3: "bg-[#ECFDF3] text-[#027A48]",
};

export const getStage = (
  currentStage: ReferralProgress["currentStage"],
): number => {
  switch (currentStage) {
    case "SIGNED_UP":
      return 0;

    case "WEBSITE_VERIFIED":
      return 1;

    case "FIRST_BACKLINK_ACCEPTED":
      return 2;

    case "PAID_SUBSCRIPTION":
      return 3;

    default:
      return 0;
  }
};

export const getCompletedActions = (
  currentStage: ReferralProgress["currentStage"],
): string[] => {
  switch (currentStage) {
    case "SIGNED_UP":
      return ["Signup"];

    case "WEBSITE_VERIFIED":
      return ["Signup", "Website Verified"];

    case "FIRST_BACKLINK_ACCEPTED":
      return [
        "Signup",
        "Website Verified",
        "First Backlink Accepted",
      ];

    case "PAID_SUBSCRIPTION":
      return [
        "Signup",
        "Website Verified",
        "First Backlink Accepted",
        "Subscription",
      ];

    default:
      return [];
  }
};

export const getNextUnlockRequirement = (
  currentStage: ReferralProgress["currentStage"],
): string => {
  switch (currentStage) {
    case "SIGNED_UP":
      return "Website Verified";

    case "WEBSITE_VERIFIED":
      return "First Backlink Accepted";

    case "FIRST_BACKLINK_ACCEPTED":
      return "Subscription";

    case "PAID_SUBSCRIPTION":
      return "Completed";

    default:
      return "-";
  }
};

export const getRewardsEarned = (
  item: ReferralProgress,
): string => {
  const rewards: string[] = [];

  if (item.totalTaskCreditsEarned > 0) {
    rewards.push(
      `+${item.totalTaskCreditsEarned} Task Credits`,
    );
  }

  if (item.totalVisibilityCreditsEarned > 0) {
    rewards.push(
      `+${item.totalVisibilityCreditsEarned} Visibility Credits`,
    );
  }

  return rewards.length ? rewards.join(", ") : "None";
};

export const getDisplaySite = (
  item: ReferralProgress,
): string => {
  if (item.referredWebsite?.websiteUrl) {
    try {
      return new URL(
        item.referredWebsite.websiteUrl,
      ).hostname;
    } catch {
      return item.referredWebsite.websiteUrl;
    }
  }

  return item.referredUser.email;
};

export const mapReferral = (
  item: ReferralProgress,
): ReferralRow => {
  const stage = getStage(item.currentStage);

  return {
    id: item.referralId,

    site: getDisplaySite(item),

    company:
      item.referredWebsite?.name ??
      item.referredUser?.name,

    stage,

    completedActions: getCompletedActions(
      item.currentStage,
    ),

    nextRequirement: getNextUnlockRequirement(
      item.currentStage,
    ),

    rewardsEarned: getRewardsEarned(item),

    status:
      stage === 3
        ? "Completed"
        : stage > 0
          ? "Active"
          : "Pending",
  };
};