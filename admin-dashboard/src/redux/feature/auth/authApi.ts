import { baseApi } from "../../baseApi";
import type {
  AdminLoginRequest,
  AdminLoginResponse,
  ForgottenPasswordRequest,
  VerifyForgottenPasswordOtpRequest,
} from "./authTypes";

export const getTokenFromLoginResponse = (response: AdminLoginResponse) =>
  response.data?.accessToken ??
  response.data?.token ??
  response.accessToken ??
  response.token;

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    adminLogin: builder.mutation<AdminLoginResponse, AdminLoginRequest>({
      query: (credentials) => ({
        url: "auth/admin-login",
        method: "POST",
        body: credentials,
      }),
      // Invalidate the cached /auth/me profile so the next subscriber always
      // fetches fresh data for the newly logged-in admin — not a stale entry
      // from a previous session (e.g. super admin → normal admin switch).
      invalidatesTags: ["AdminProfile"],
    }),
    adminLogout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: "auth/logout",
        method: "POST",
      }),
    }),
    requestForgottenPasswordOtp: builder.mutation<{ success: boolean; message: string }, ForgottenPasswordRequest>({
      query: (body) => ({
        url: "auth/forgotten-password",
        method: "POST",
        body,
      }),
    }),
    verifyForgottenPasswordOtp: builder.mutation<
      { success: boolean; message: string },
      VerifyForgottenPasswordOtpRequest
    >({
      query: (body) => ({
        url: "auth/verify-forgotten-password-otp",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useAdminLoginMutation,
  useAdminLogoutMutation,
  useRequestForgottenPasswordOtpMutation,
  useVerifyForgottenPasswordOtpMutation,
} = authApi;
