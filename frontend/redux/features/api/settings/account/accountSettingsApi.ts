import { UserProfileResponse , UpdateProfileRequest} from "@/types/settings/accountSettingsType";
import { baseApi } from "../../baseApi";

export const accountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateProfile: builder.mutation<
      UserProfileResponse,
      UpdateProfileRequest
    >({
      query: (formData) => ({
        url: "/user/update-profile",
        method: "PATCH",
        body: formData,
      }),
      invalidatesTags: ["Me"],
    }),
  }),
});

export const { useUpdateProfileMutation } = accountApi;