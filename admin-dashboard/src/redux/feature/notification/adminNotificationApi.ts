import { baseApi } from "../../baseApi";

export type NotificationStatus = "UNREAD" | "READ";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type AdminNotificationQuery = {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  type?: string;
  category?: string;
  priority?: NotificationPriority;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AdminNotification = {
  id: string;
  audience: "ADMIN" | "USER";
  type: string;
  category: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  priority: NotificationPriority;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  readAt?: string | null;
  createdAt: string;
};

export type AdminNotificationListResponse = {
  success: boolean;
  message: string;
  data: {
    data: AdminNotification[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
};

export type AdminUnreadCountResponse = {
  success: boolean;
  message: string;
  data: {
    count: number;
  };
};

function cleanParams<T extends Record<string, unknown>>(arg?: T) {
  const params: Record<string, unknown> = {};
  Object.entries(arg ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params[key] = value;
  });
  return params;
}

export const adminNotificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminNotifications: builder.query<AdminNotificationListResponse, AdminNotificationQuery | void>({
      query: (arg) => ({
        url: "/admin/notifications",
        method: "GET",
        params: cleanParams(arg ?? { page: 1, limit: 10 }),
      }),
      providesTags: ["AdminNotification"],
    }),
    getAdminUnreadNotificationCount: builder.query<AdminUnreadCountResponse, void>({
      query: () => ({
        url: "/admin/notifications/unread-count",
        method: "GET",
      }),
      providesTags: ["AdminNotificationCount"],
    }),
    markAdminNotificationRead: builder.mutation<AdminNotification, string>({
      query: (id) => ({
        url: `/admin/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["AdminNotification", "AdminNotificationCount"],
    }),
    markAllAdminNotificationsRead: builder.mutation<{ updatedCount: number }, void>({
      query: () => ({
        url: "/admin/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["AdminNotification", "AdminNotificationCount"],
    }),
  }),
});

export const {
  useGetAdminNotificationsQuery,
  useGetAdminUnreadNotificationCountQuery,
  useMarkAdminNotificationReadMutation,
  useMarkAllAdminNotificationsReadMutation,
} = adminNotificationApi;
