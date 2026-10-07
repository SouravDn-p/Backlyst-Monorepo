import { baseApi } from "../baseApi";
import {
  INotificationListQuery,
  INotificationListResponse,
  INotificationUnreadCountResponse,
  IMarkOneReadResponse,
  IMarkAllReadResponse,
  INotificationPreferences,
  INotificationPreferencesResponse,
} from "@/types/notification/NotificationTypes";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /notifications
    getNotifications: builder.query<INotificationListResponse, INotificationListQuery>({
      query: (arg = {}) => {
        const params: Record<string, any> = {};
        Object.entries(arg).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params[key] = value;
          }
        });
        return { url: "/notifications", method: "GET", params };
      },
      providesTags: ["notification"],
    }),

    // GET /notifications/unread-count
    getUnreadCount: builder.query<INotificationUnreadCountResponse, void>({
      query: () => ({ url: "/notifications/unread-count", method: "GET" }),
      providesTags: ["notification"],
    }),

    // PATCH /notifications/:id/read
    markOneRead: builder.mutation<IMarkOneReadResponse, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["notification"],
    }),

    // PATCH /notifications/read-all
    markAllRead: builder.mutation<IMarkAllReadResponse, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      invalidatesTags: ["notification"],
    }),

    // GET /notifications/preferences
    getNotificationPreferences: builder.query<INotificationPreferencesResponse, void>({
      query: () => ({ url: "/notifications/preferences", method: "GET" }),
      providesTags: ["notification"],
    }),

    // PATCH /notifications/preferences
    updateNotificationPreferences: builder.mutation<
      INotificationPreferencesResponse,
      Partial<INotificationPreferences>
    >({
      query: (body) => ({
        url: "/notifications/preferences",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkOneReadMutation,
  useMarkAllReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} = notificationApi;
