import { baseApi } from "@/redux/baseApi";
import { AdminDashboardOverviewResponse, AdminTaskLifecyclePanelResponse } from "./dashboardTypes";

export type DashboardPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboardOverview: builder.query<
      AdminDashboardOverviewResponse,
      DashboardPeriod | void
    >({
      query: (period = "DAILY") => ({
        url: "/admin/dashboard/overview",
        params: { period },
      }),
    }),
    getAdminTaskLifecyclePanel: builder.query<
      AdminTaskLifecyclePanelResponse,
      { range?: DashboardPeriod | string; from?: string; to?: string }
    >({
      query: (params) => ({
        url: "/admin-task/dashboard/lifecycle-panel",
        params,
      }),
    }),
  }),
});

export const { useGetAdminDashboardOverviewQuery, useGetAdminTaskLifecyclePanelQuery } = dashboardApi;
