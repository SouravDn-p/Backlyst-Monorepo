import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";

import { getCookie } from "@/lib/cookie";

const baseAPI = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.backlyst.co.uk";

// retry wrapper
const baseQuery = retry(
  fetchBaseQuery({
    baseUrl: baseAPI,

    prepareHeaders: (headers) => {
      const token = getCookie("accessToken");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      // headers.set("Content-Type", "application/json");
      // IMPORTANT FOR NGROK
      // Comment for dev branch
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  {
    maxRetries: 1, // retry only 1 extra time
  },
);

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery,
  tagTypes: [
    "Auth",
    "Website",
    "WebsiteVerification",
    "Subscription",
    "Credit",
    "notification",
    "Me",
    "RequesterTask",
    "RequesterWebsite",
    "ProviderTask",
    "ProviderOpportunity",
    "Message",
    "ProviderDashboard",
    "LegalDocs",
    "Referral",
    "RequesterDashboard",
    "Blog",
    "Contact",
    "Company",
    "DirectTask",
    "Dispute",
  ],
  endpoints: () => ({}),
});
