import { ProviderDashboardSummaryQuery, ProviderDashboardSummaryResponse } from "@/types/provider/dashboard/providerDashboard.types";
import { baseApi } from "../../baseApi";


export const providerDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProviderDashboardSummary: builder.query<
      ProviderDashboardSummaryResponse,
      ProviderDashboardSummaryQuery
    >({
      query: ({ range, from, to, websiteId } = {}) => ({
        url: "/provider/dashboard/summary",
        method: "GET",
        params: Object.fromEntries(
          Object.entries({
            range,
            from,
            to,
            websiteId,
          }).filter(([_, value]) => value !== undefined && value !== null)
        ),
      }),
      providesTags: ["ProviderDashboard"],
    }),
  }),
});

export const {
  useGetProviderDashboardSummaryQuery,
} = providerDashboardApi;