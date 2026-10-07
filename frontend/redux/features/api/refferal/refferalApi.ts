import { GetReferralProgressResponse, ReferralSummary } from "@/types/refferal/refferalTypes";
import { baseApi } from "../baseApi";

export const referralApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReferralProgress: builder.query<
      GetReferralProgressResponse,
      void
    >({
      query: () => ({
        url: "/credits/referrers/progress",
        method: "GET",
      }),
      providesTags: ["Referral"],
    }),

    getReferralSummary: builder.query<
      ReferralSummary,
      void
    >({
      query: () => ({
        url: "/credits/referrers/summary",
        method: "GET",
      }),
      providesTags: ["Referral"],
    }),
  }),
});

export const {
  useGetReferralProgressQuery,
  useGetReferralSummaryQuery,
} = referralApi;