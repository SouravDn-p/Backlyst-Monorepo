import { RequesterDashboardSummaryQuery, RequesterDashboardSummaryResponse } from "@/types/requester/dashboard/requesterDashboard.types";
import { baseApi } from "../../baseApi";


export const requesterDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRequesterDashboardSummary: builder.query<
      RequesterDashboardSummaryResponse,
      RequesterDashboardSummaryQuery
    >({
      query: ({ range, from, to, websiteId } = {}) => ({
        url: "/requester/dashboard/summary",
        method: "GET",
        params: Object.fromEntries(
          Object.entries({
            range,
            from,
            to,
            websiteId,
          }).filter(([_, value]) => value != null)
        ),
      }),
      providesTags: ["RequesterDashboard"],
    }),
  }),
});

export const {
  useGetRequesterDashboardSummaryQuery,
} = requesterDashboardApi;