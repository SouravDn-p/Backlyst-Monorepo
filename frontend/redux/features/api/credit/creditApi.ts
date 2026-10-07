import {
  AllocatePurchasedCreditsRequest,
  AllocatePurchasedCreditsResponse,
  CreditCheckoutResponse,
  CreditStatementResponse,
  CreditsMeResponse,
  DashboardCreditSummary,
  PurchasedCheckoutSuccessResponse,
  VisibilityCheckoutSuccessResponse,
  WebsiteCreditSummaryResponse,
  WebsiteCreditWalletResponse,
} from "@/types/credit/creditTypes";
import { baseApi } from "../baseApi";

type BuyPurchasedCreditsRequest = {
  amount: number;
  note?: string;
};

type BuyVisibilityCreditsRequest = {
  websiteId: string;
  amount: number;
  note?: string;
};

type GetCreditStatementRequest = {
  page?: number;
  limit?: number;
};

export const creditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyDashboardCreditSummary: builder.query<DashboardCreditSummary, void>({
      query: () => ({
        url: "/credits/dashboard/summary",
        method: "GET",
      }),
      providesTags: ["Credit"],
    }),
    getCreditStatement: builder.query<
      CreditStatementResponse,
      GetCreditStatementRequest | void
    >({
      query: (params) => ({
        url: "/credits/statement",
        method: "GET",
        params: params || undefined,
      }),
      providesTags: ["Credit"],
    }),
    // getReferralProgress: builder.query<ReferralProgressResponse, void>({
    //   query: () => ({
    //     url: "/credits/referrers/progress",
    //     method: "GET",
    //   }),
    //   providesTags: ["Credit"],
    // }),
    // getReferralSummary: builder.query<ReferralSummaryResponse, void>({
    //   query: () => ({
    //     url: "/credits/referrers/summary",
    //     method: "GET",
    //   }),
    //   providesTags: ["Credit"],
    // }),
    buyPurchasedCredits: builder.mutation<
      CreditCheckoutResponse,
      BuyPurchasedCreditsRequest
    >({
      query: (body) => ({
        url: "/credits/purchased/buy",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Credit"],
    }),
    buyVisibilityCredits: builder.mutation<
      CreditCheckoutResponse,
      BuyVisibilityCreditsRequest
    >({
      query: (body) => ({
        url: "/credits/visibility/buy",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Credit"],
    }),
    allocatePurchasedCredits: builder.mutation<
      AllocatePurchasedCreditsResponse,
      AllocatePurchasedCreditsRequest
    >({
      query: (body) => ({
        url: "/credits/purchased/allocate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Credit"],
    }),
    getCreditsMe: builder.query<CreditsMeResponse, void>({
      query: () => ({
        url: "/credits/me",
        method: "GET",
      }),
      providesTags: ["Credit"],
    }),
    getMasterStatement: builder.query<
      CreditStatementResponse,
      GetCreditStatementRequest | void
    >({
      query: (params) => ({
        url: "/credits/master/statement",
        method: "GET",
        params: params || undefined,
      }),
      providesTags: ["Credit"],
    }),
    getPurchasedCheckoutSuccess: builder.query<
      PurchasedCheckoutSuccessResponse,
      string
    >({
      query: (sessionId) => ({
        url: "/credits/purchased/checkout-success",
        method: "GET",
        params: { sessionId },
      }),
      providesTags: ["Credit"],
    }),
    getVisibilityCheckoutSuccess: builder.query<
      VisibilityCheckoutSuccessResponse,
      string
    >({
      query: (sessionId) => ({
        url: "/credits/visibility/checkout-success",
        method: "GET",
        params: { sessionId },
      }),
      providesTags: ["Credit"],
    }),
    getWebsiteCreditWallet: builder.query<WebsiteCreditWalletResponse, string>({
      query: (websiteId) => ({
        url: `/credits/websites/${websiteId}/wallet`,
        method: "GET",
      }),
      providesTags: ["Credit"],
    }),
    getWebsiteCreditSummary: builder.query<
      WebsiteCreditSummaryResponse,
      string
    >({
      query: (websiteId) => ({
        url: `/credits/websites/${websiteId}/summary`,
        method: "GET",
      }),
      providesTags: ["Credit"],
    }),
  }),
});

export const {
  useGetMyDashboardCreditSummaryQuery,
  useGetCreditStatementQuery,
  // useGetReferralProgressQuery,
  // useGetReferralSummaryQuery,
  useBuyPurchasedCreditsMutation,
  useBuyVisibilityCreditsMutation,
  useAllocatePurchasedCreditsMutation,
  useGetCreditsMeQuery,
  useGetMasterStatementQuery,
  useGetPurchasedCheckoutSuccessQuery,
  useGetVisibilityCheckoutSuccessQuery,
  useGetWebsiteCreditWalletQuery,
  useGetWebsiteCreditSummaryQuery,
} = creditApi;
