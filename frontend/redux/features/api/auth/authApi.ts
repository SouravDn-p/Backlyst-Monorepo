import { GetUserResponse } from "@/types/user";
import { 
  LoginResponse, 
  ChangePasswordResponse, 
  DashboardStaticsResponse, 
  ForgotPasswordResponse, 
  VerifyForgotPasswordOTPResponse, 
  RegisterResponse, 
  ResendRegisterOTPResponse, 
  SessionsResponse, 
  DeleteSessionResponse
} from "@/types/auth/authTypes";
import { baseApi } from "../baseApi";
import { deleteCookie } from "@/lib/cookie";
import { setCredentials, logout as logoutAction } from "../../slice/authSlice";
import { saveAuthSession } from "@/lib/auth/auth/session";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, any>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data?.data?.accessToken) {
            saveAuthSession(data.data.accessToken);
          }
        } catch (error) {
          console.error("Login failed:", error);
        }
      },
      invalidatesTags: ["Auth"],
    }),

    getMe: builder.query<GetUserResponse, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data?.data) {
            dispatch(setCredentials(data.data));
          }
        } catch (err: any) {
          const queryError = err?.error || err;
          if (queryError?.status !== 401) {
            console.error("Fetch user failed:", {
              error: queryError?.error || queryError?.message || queryError,
              status: queryError?.status,
              data: queryError?.data
            });
          }
          
          // If unauthorized, clear credentials
          if (queryError?.status === 401) {
            dispatch(logoutAction());
            deleteCookie("accessToken");
          }
        }
      },
      providesTags: ["Auth"],
    }),

    logout: builder.mutation<any, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Logout failed:", error);
        } finally {
          deleteCookie("accessToken");
          dispatch(logoutAction());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),

    

    changePassword: builder.mutation<ChangePasswordResponse, { oldPassword: string; newPassword: string }>({
      query: (body) => ({
        url: "/auth/change-password",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    getDashboardStatics: builder.query<DashboardStaticsResponse, void>({
      query: () => ({
        url: "/auth/dashboard-statics",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),

    forgotPassword: builder.mutation<ForgotPasswordResponse, { email: string }>({
      query: (body) => ({
        url: "/auth/forgotten-password",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    verifyForgotPasswordOTP: builder.mutation<VerifyForgotPasswordOTPResponse, { email: string; otp: string; newPassword: string }>({
      query: (body) => ({
        url: "/auth/verify-forgotten-password-otp",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    register: builder.mutation<RegisterResponse, { name: string; email: string; password: string; imageKey?: string; referralCode?: string }>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    verifyRegisterOTP: builder.mutation<RegisterResponse, { email: string; otp: string }>({
      query: (body) => ({
        url: "/auth/verify-register-otp",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    resendRegisterOTP: builder.mutation<ResendRegisterOTPResponse, { email: string }>({
      query: (body) => ({
        url: "/auth/resend-register-otp",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),


getSessions: builder.query<SessionsResponse, void>({
      query: () => ({
        url: "/auth/sessions",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),

    deleteSession: builder.mutation<DeleteSessionResponse, string>({
      query: (sessionId) => ({
        url: `/auth/sessions/${sessionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery, useLazyGetMeQuery, useLogoutMutation, useChangePasswordMutation, useGetDashboardStaticsQuery, useForgotPasswordMutation, useVerifyForgotPasswordOTPMutation, useRegisterMutation, useVerifyRegisterOTPMutation, useResendRegisterOTPMutation, useGetSessionsQuery , useDeleteSessionMutation} = authApi;