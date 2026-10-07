import { baseApi } from "../baseApi";
import {
  RewardsOverviewResponse,
  RewardsBadgesResponse,
  AdditionalRewardsResponse,
  LedgerResponse,
} from "@/types/rewards/rewardsTypes";

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRewardsOverview: builder.query<RewardsOverviewResponse, void>({
      query: () => ({
        url: "/rewards/me",
        method: "GET",
      }),
      providesTags: ["Me"], // using Me tag as it is tied to the user profile
    }),
    getRewardsBadges: builder.query<
      RewardsBadgesResponse,
      { status?: string; category?: string }
    >({
      query: ({ status, category }) => {
        let url = "/rewards/me/badges";
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        if (category) params.append("category", category);
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
        return {
          url,
          method: "GET",
        };
      },
      providesTags: ["Me"],
    }),
    getRewardsLedger: builder.query<
      LedgerResponse,
      { page?: number; limit?: number; type?: string; dateFrom?: string; dateTo?: string }
    >({
      query: ({ page = 1, limit = 20, type, dateFrom, dateTo }) => {
        let url = "/rewards/me/ledger";
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (type) params.append("type", type);
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
        return {
          url,
          method: "GET",
        };
      },
      providesTags: ["Me"],
    }),
    getAdditionalRewards: builder.query<AdditionalRewardsResponse, void>({
      query: () => ({
        url: "/rewards/me/additional-rewards",
        method: "GET",
      }),
      providesTags: ["Me"],
    }),
  }),
});

export const {
  useGetRewardsOverviewQuery,
  useGetRewardsBadgesQuery,
  useGetRewardsLedgerQuery,
  useGetAdditionalRewardsQuery,
} = rewardsApi;
