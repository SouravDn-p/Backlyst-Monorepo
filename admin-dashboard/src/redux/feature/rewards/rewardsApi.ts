import { baseApi } from "@/redux/baseApi";
import type {
  ApiResponse,
  AssignBadgeRequest,
  BadgeDefinition,
  BadgeDefinitionPayload,
  BadgeListParams,
  AdminBadgeRow,
  PaginatedData,
  RewardAuditListData,
  RewardAuditParams,
  RewardLedgerParams,
  RewardLedgerRow,
  RewardOutboxHealth,
  RewardOutboxRow,
  RewardOutboxStatus,
  RevokeBadgeRequest,
  UserRewardDetail,
} from "./rewardTypes";

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRewardBadges: builder.query<ApiResponse<PaginatedData<AdminBadgeRow>>, BadgeListParams | void>({
      query: (params) => ({
        url: "/admin/rewards/badges",
        params: params || {},
      }),
      providesTags: ["Rewards" as never, "RewardBadge" as never],
    }),
    getRewardBadge: builder.query<ApiResponse<BadgeDefinition>, string>({
      query: (id) => ({
        url: `/admin/rewards/badges/${id}`,
      }),
      providesTags: (result, error, id) => [{ type: "RewardBadge" as never, id }],
    }),
    createRewardBadge: builder.mutation<ApiResponse<BadgeDefinition>, BadgeDefinitionPayload>({
      query: (body) => ({
        url: "/admin/rewards/badges",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Rewards" as never, "RewardBadge" as never, "RewardAudit" as never],
    }),
    updateRewardBadge: builder.mutation<
      ApiResponse<BadgeDefinition>,
      { id: string; body: Partial<BadgeDefinitionPayload> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/rewards/badges/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Rewards" as never,
        "RewardBadge" as never,
        "RewardAudit" as never,
        { type: "RewardBadge" as never, id },
      ],
    }),
    disableRewardBadge: builder.mutation<ApiResponse<BadgeDefinition>, string>({
      query: (id) => ({
        url: `/admin/rewards/badges/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Rewards" as never, "RewardBadge" as never, "RewardAudit" as never],
    }),
    seedRewardDefaults: builder.mutation<ApiResponse<Record<string, unknown>>, void>({
      query: () => ({
        url: "/admin/rewards/seed-defaults",
        method: "POST",
      }),
      invalidatesTags: ["Rewards" as never, "RewardBadge" as never, "RewardAudit" as never],
    }),
    getRewardLedger: builder.query<ApiResponse<PaginatedData<RewardLedgerRow>>, RewardLedgerParams | void>({
      query: (params) => ({
        url: "/admin/rewards/ledger",
        params: params || {},
      }),
      providesTags: ["RewardLedger" as never],
    }),
    getRewardOutboxHealth: builder.query<ApiResponse<RewardOutboxHealth>, void>({
      query: () => ({
        url: "/admin/rewards/outbox/health",
      }),
      providesTags: ["RewardOutbox" as never],
    }),
    getRewardOutbox: builder.query<
      ApiResponse<PaginatedData<RewardOutboxRow>>,
      { status?: RewardOutboxStatus; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: "/admin/rewards/outbox",
        params: params || {},
      }),
      providesTags: ["RewardOutbox" as never],
    }),
    recoverStaleRewardOutbox: builder.mutation<ApiResponse<Record<string, unknown>>, { limit?: number } | void>({
      query: (body) => ({
        url: "/admin/rewards/outbox/recover-stale",
        method: "POST",
        body: body || {},
      }),
      invalidatesTags: ["RewardOutbox" as never, "RewardAudit" as never],
    }),
    refreshDynamicBadges: builder.mutation<ApiResponse<Record<string, unknown>>, { limit?: number } | void>({
      query: (body) => ({
        url: "/admin/rewards/dynamic-refresh",
        method: "POST",
        body: body || {},
      }),
      invalidatesTags: [
        "Rewards" as never,
        "RewardBadge" as never,
        "RewardLedger" as never,
        "RewardAudit" as never,
        "UserRewardDetail" as never,
      ],
    }),
    expireRewardBenefits: builder.mutation<ApiResponse<Record<string, unknown>>, { limit?: number } | void>({
      query: (body) => ({
        url: "/admin/rewards/expire-benefits",
        method: "POST",
        body: body || {},
      }),
      invalidatesTags: ["Rewards" as never, "RewardLedger" as never, "RewardAudit" as never, "UserRewardDetail" as never],
    }),
    getRewardAuditLogs: builder.query<ApiResponse<RewardAuditListData>, RewardAuditParams | void>({
      query: (params) => ({
        url: "/admin/rewards/audit-logs",
        params: params || {},
      }),
      providesTags: ["RewardAudit" as never],
    }),
    getRewardAuditLogDetail: builder.query<ApiResponse<Record<string, unknown>>, string>({
      query: (id) => ({
        url: `/admin/rewards/audit-logs/${id}`,
      }),
      providesTags: (result, error, id) => [{ type: "RewardAudit" as never, id }],
    }),
    getUserRewardDetail: builder.query<ApiResponse<UserRewardDetail>, string>({
      query: (userId) => ({
        url: `/admin/rewards/users/${userId}`,
      }),
      providesTags: (result, error, userId) => [{ type: "UserRewardDetail" as never, id: userId }],
    }),
    assignUserRewardBadge: builder.mutation<ApiResponse<Record<string, unknown>>, AssignBadgeRequest>({
      query: ({ userId, ...body }) => ({
        url: `/admin/rewards/users/${userId}/badges/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { userId }) => [
        "Rewards" as never,
        "RewardLedger" as never,
        "RewardAudit" as never,
        { type: "UserRewardDetail" as never, id: userId },
      ],
    }),
    revokeUserRewardBadge: builder.mutation<ApiResponse<Record<string, unknown>>, RevokeBadgeRequest>({
      query: ({ userId, ...body }) => ({
        url: `/admin/rewards/users/${userId}/badges/revoke`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { userId }) => [
        "Rewards" as never,
        "RewardLedger" as never,
        "RewardAudit" as never,
        { type: "UserRewardDetail" as never, id: userId },
      ],
    }),
  }),
});

export const {
  useGetRewardBadgesQuery,
  useGetRewardBadgeQuery,
  useCreateRewardBadgeMutation,
  useUpdateRewardBadgeMutation,
  useDisableRewardBadgeMutation,
  useSeedRewardDefaultsMutation,
  useGetRewardLedgerQuery,
  useGetRewardOutboxHealthQuery,
  useGetRewardOutboxQuery,
  useRecoverStaleRewardOutboxMutation,
  useRefreshDynamicBadgesMutation,
  useExpireRewardBenefitsMutation,
  useGetRewardAuditLogsQuery,
  useGetRewardAuditLogDetailQuery,
  useGetUserRewardDetailQuery,
  useAssignUserRewardBadgeMutation,
  useRevokeUserRewardBadgeMutation,
} = rewardsApi;
