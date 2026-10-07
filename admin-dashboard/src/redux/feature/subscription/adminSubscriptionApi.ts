import { baseApi } from "../../baseApi";

export type AdminSubscriptionStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING"
  | string;

export interface AdminSubscriptionUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  imageUrl?: string | null;
}

export interface AdminSubscriptionPlan {
  id: string;
  tier: string;
  name: string;
  description?: string | null;
  price: string | number;
  credit: number;
  visibility: number;
  billingInterval: string;
  features?: unknown;
}

export interface AdminSubscriptionRow {
  id: string;
  userId: string;
  planId: string;
  status: AdminSubscriptionStatus;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: AdminSubscriptionUser | null;
  plan: AdminSubscriptionPlan | null;
}

export interface AdminSubscriptionMeta {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  pageItemCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AdminSubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  pendingSubscriptions: number;
  totalRevenue: number;
}

export interface AdminSubscriptionsPayload {
  data: AdminSubscriptionRow[];
  meta: AdminSubscriptionMeta;
  analytics: AdminSubscriptionAnalytics;
}

interface AdminSubscriptionsResponse {
  success: boolean;
  message: string;
  data: AdminSubscriptionsPayload;
}

interface GetAdminSubscriptionsArgs {
  page?: number;
  limit?: number;
}

export const adminSubscriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminSubscriptions: builder.query<
      AdminSubscriptionsResponse,
      GetAdminSubscriptionsArgs | void
    >({
      query: (args) => ({
        url: "/admin-subscription/all",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 10,
        },
      }),
      providesTags: ["AdminSubscription"],
    }),
  }),
});

export const { useGetAdminSubscriptionsQuery } = adminSubscriptionApi;
