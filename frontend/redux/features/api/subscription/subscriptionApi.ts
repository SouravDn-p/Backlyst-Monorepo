import { SubscriptionResponse, CheckoutResponse, CheckoutSuccessResponse, SubscriptionHistoryResponse } from "@/types/subscription/subscriptionTypes";
import { baseApi } from "../baseApi";

export const subscriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionPlans: builder.query<SubscriptionResponse, void>({
      query: () => ({
        url: "/user-subscription-plan/all",
        method: "GET",
      }),
      providesTags: ["Subscription"],
    }),
    cancelSubscription: builder.mutation<any, void>({
      query: () => ({
        url: "/user-subscription/cancel",
        method: "PATCH",
      }),
      invalidatesTags: ["Subscription"],
    }),
    checkoutSubscription: builder.mutation<CheckoutResponse, { planId: string }>({
      query: (body) => ({
        url: "/user-subscription/checkout",
        method: "POST",
        body,
      }),
    }),
    checkoutSuccess: builder.query<CheckoutSuccessResponse, string>({
      query: (sessionId) => ({
        url: `/user-subscription/checkout-success?sessionId=${sessionId}`,
        method: "GET",
      }),
      providesTags: ["Subscription"],
    }),
    getMyActiveSubscription: builder.query<any, void>({
      query: () => ({
        url: "/user-subscription/my-active-subscription",
        method: "GET",
      }),
      providesTags: ["Subscription"],
    }),
    getMySubscriptionHistory: builder.query<SubscriptionHistoryResponse, { page: number; limit: number; status: string }>({
      query: ({ page, limit, status }) => ({
        url: `/user-subscription/my-subscription-history?page=${page}&limit=${limit}&status=${status}`,
        method: "GET",
      }),
      providesTags: ["Subscription"],
    }),
  }),
});

export const {
  useGetSubscriptionPlansQuery,
  useCancelSubscriptionMutation,
  useCheckoutSubscriptionMutation,
  useCheckoutSuccessQuery,
  useGetMyActiveSubscriptionQuery,
  useGetMySubscriptionHistoryQuery,
} = subscriptionApi;
