import { baseApi } from "@/redux/baseApi";
import { ApproveReferralCreditRequest, DisableEntityReferralsRequest, ReferralDetailResponse, ReferralListParams, ReferralListResponse, RevokeReferralCreditRequest, ToggleReferralFreezeRequest, ToggleReferralFreezeResponse } from "./referralTypes";



export const referralApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReferralRegistry: builder.query<ReferralListResponse, ReferralListParams | void>({
      query: (params) => ({
        url: "/admin/referrals/registry",
        params: params || {},
      }),
      providesTags: ["Referral" as any],
    }),
    toggleReferralFreeze: builder.mutation<ToggleReferralFreezeResponse, ToggleReferralFreezeRequest>({
      query: (body) => ({
        url: "/admin/referrals/freeze",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Referral" as any],
    }),
    getReferralDetail: builder.query<ReferralDetailResponse, string>({
      query: (userReferralId) => ({
        url: `/admin/referrals/${userReferralId}`,
      }),
      providesTags: (result, error, arg) => [{ type: "Referral" as any, id: arg }],
    }),
    approveReferralCredit: builder.mutation<any, ApproveReferralCreditRequest>({
      query: ({ referralId, ...body }) => ({
        url: `/admin/referrals/${referralId}/approve-credit`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { referralId }) => ["Referral" as any, { type: "Referral" as any, id: referralId }],
    }),
    revokeReferralCredit: builder.mutation<any, RevokeReferralCreditRequest>({
      query: ({ referralId, ...body }) => ({
        url: `/admin/referrals/${referralId}/revoke-credit`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { referralId }) => ["Referral" as any, { type: "Referral" as any, id: referralId }],
    }),
    disableEntityReferrals: builder.mutation<any, DisableEntityReferralsRequest>({
      query: ({ referralId, ...body }) => ({
        url: `/admin/referrals/${referralId}/disable-entity-referrals`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { referralId }) => ["Referral" as any, { type: "Referral" as any, id: referralId }],
    }),
  }),
});

export const {
  useGetReferralRegistryQuery,
  useToggleReferralFreezeMutation,
  useGetReferralDetailQuery,
  useApproveReferralCreditMutation,
  useRevokeReferralCreditMutation,
  useDisableEntityReferralsMutation,
} = referralApi;
