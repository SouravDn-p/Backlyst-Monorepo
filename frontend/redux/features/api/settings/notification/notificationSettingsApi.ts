
import { UpdateNotificationPreferencesRequest } from "@/types/settings/notificationTypes";
import { baseApi } from "../../baseApi";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateNotificationPreferences: builder.mutation<
      any,
      UpdateNotificationPreferencesRequest
    >({
      query: (body) => ({
        url: "/user/update-notification-preferences",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Me"],
    }),
  }),
});

export const { useUpdateNotificationPreferencesMutation } = notificationApi;