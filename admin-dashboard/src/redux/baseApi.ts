import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const API_BASE_URL = "https://api.backlyst.co.uk";

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      // Prefer sessionStorage (non-persistent) then localStorage (persistent)
      let token = sessionStorage.getItem("accessToken");

      if (!token) {
        const stored = localStorage.getItem("accessToken");
        const expiry = localStorage.getItem("accessTokenExpiry");
        if (stored) {
          if (expiry && Number(expiry) < Date.now()) {
            // token expired: remove it
            localStorage.removeItem("accessToken");
            localStorage.removeItem("accessTokenExpiry");
          } else {
            token = stored;
          }
        }
      }

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: [
    "UserRegistry",
    "UserProfile",
    "Website",
    "WebsiteCategoryKey",
    "WebsiteMarketplaceTag",
    "WebsiteVerificationRequest",
    "WebsiteVerificationMetaTag",
    "Task",
    "CreditGovernanceSummary",
    "Referral",
    "Compliance",
    "LegalDocs",
    "Analytics",
    "SavedReport",
    "Message",
    "MessageReport",
    "MessageRegistry",
    "MarketplaceVisibility",
    "Blog",
    "Rewards",
    "RewardBadge",
    "RewardLedger",
    "RewardOutbox",
    "RewardAudit",
    "UserRewardDetail",
    "SystemPlan",
    "SystemReferralConfig",
    "SystemFeatureToggle",
    "SystemMarketplaceConfig",
    "SystemBadgeConfig",
    "AdminSubscription",
    "ContactEnquiry",
    "AdminProfile",
    "AdminNotification",
    "AdminNotificationCount",
    // Authorization / admin management
    "AdminList",
    "AdminDetail",
    "AuthorizationSections",
  ],
  endpoints: () => ({}),
});
