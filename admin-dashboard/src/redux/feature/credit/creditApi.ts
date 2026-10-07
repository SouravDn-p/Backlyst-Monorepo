import { baseApi } from "@/redux/baseApi";
import type {
  CreditGovernanceSummaryResponse,
  TaskCreditAdjustmentRequest,
  TaskCreditAdjustmentResponse,
  VisibilityCreditAdjustmentResponse,
  WalletLockRequest,
  WalletLockResponse,
  WebsiteCreditDetailsResponse,
} from "./creditTypes";

export const creditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCreditGovernanceSummary: builder.query<
      CreditGovernanceSummaryResponse,
      void
    >({
      query: () => ({
        url: "/admin/credits/governance-summary",
      }),
      providesTags: ["CreditGovernanceSummary"],
    }),
    addWebsiteTaskCredits: builder.mutation<
      TaskCreditAdjustmentResponse,
      TaskCreditAdjustmentRequest
    >({
      query: ({ websiteId, amount, reason, idempotencyKey }) => ({
        url: `/admin/credits/websites/${websiteId}/task-credits`,
        method: "POST",
        body: { amount, reason, idempotencyKey },
      }),
      invalidatesTags: (result, error, { websiteId }) => [
        "CreditGovernanceSummary",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    addWebsiteVisibilityCredits: builder.mutation<
      VisibilityCreditAdjustmentResponse,
      TaskCreditAdjustmentRequest
    >({
      query: ({ websiteId, amount, reason, idempotencyKey }) => ({
        url: `/admin/credits/websites/${websiteId}/visibility-credits`,
        method: "POST",
        body: { amount, reason, idempotencyKey },
      }),
      invalidatesTags: (result, error, { websiteId }) => [
        "CreditGovernanceSummary",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    lockWebsiteWallet: builder.mutation<WalletLockResponse, WalletLockRequest>({
      query: ({ websiteId, locked, reason }) => ({
        url: `/admin/credits/websites/${websiteId}/wallet-lock`,
        method: "PATCH",
        body: { locked, reason },
      }),
      invalidatesTags: (result, error, { websiteId }) => [
        "CreditGovernanceSummary",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    getWebsiteCreditDetails: builder.query<WebsiteCreditDetailsResponse, string>({
      query: (websiteId) => ({
        url: `/admin/credits/websites/${websiteId}/details`,
      }),
      providesTags: (result, error, websiteId) => [
        { type: "Website" as const, id: websiteId },
      ],
    }),
  }),
});

export const {
  useGetCreditGovernanceSummaryQuery,
  useAddWebsiteTaskCreditsMutation,
  useAddWebsiteVisibilityCreditsMutation,
  useLockWebsiteWalletMutation,
  useGetWebsiteCreditDetailsQuery,
} = creditApi;
