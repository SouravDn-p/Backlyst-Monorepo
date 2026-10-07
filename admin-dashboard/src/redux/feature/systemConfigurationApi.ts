import { baseApi } from "@/redux/baseApi";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PlanTier = "FREE" | "SILVER" | "GOLD" | "PLATINUM" | "ENTERPRISE";
export type BillingInterval = "MONTHLY" | "YEARLY";

export type SubscriptionPlan = {
  id: string;
  tier: PlanTier;
  name: string;
  description?: string | null;
  price: string;
  credit?: number;
  visibility?: string | null;
  billingInterval: BillingInterval;
  monthlyTaskCredits: number;
  maxTaskCreditCapacity: number;
  maxWebsites: number;
  visibilityCreditCapacity: number;
  features?: unknown[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateSubscriptionPlanBody = Partial<{
  price: string;
  billingInterval: BillingInterval;
  monthlyTaskCredits: number;
  maxTaskCreditCapacity: number;
  maxWebsites: number;
  visibilityCreditCapacity: number;
  isActive: boolean;
}>;

export type ReferralRewardConfig = {
  id: string;
  rewardPerReferralCredits: number;
  maxUserReferralPool: number;
  oneCreditPerUserEnforced: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateReferralRewardConfigBody = Partial<{
  rewardPerReferralCredits: number;
  maxUserReferralPool: number;
  oneCreditPerUserEnforced: boolean;
}>;

export type PlatformFeatureToggleKey =
  | "USER_REVIEWS_RATINGS"
  | "REFERRAL_ENGINE_INCENTIVES"
  | "VISIBILITY_DISCOVERY_REWARDS"
  | "INTERNAL_ENTITY_MESSAGING"
  | "EXTERNAL_NODE_API_ACCESS"
  | "SELF_SERVICE_DISPUTE_CENTER";

export type PlatformFeatureToggle = {
  key: PlatformFeatureToggleKey | (string & {});
  label: string;
  category: string;
  enabled: boolean;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MarketplaceScoringConfig = {
  id: string;
  compatibilityWeight?: number;
  opportunityWeight?: number;
  visibilityWeight: number;
  reputationWeight?: number;
  boostWeight?: number;
  minViableMatches: number;
  maxRelaxationLevel: number;
  maxProviderMatchesPerDay: number;
  restrictedVisibilityFactor: number;
  underReviewVisibilityFactor: number;
  restrictedDailyCapFactor: number;
  qualityActiveThreshold: number;
  qualityLowPriorityThreshold: number;
  qualityLimitedAccessThreshold: number;
  qualityGradualTransitions: boolean;
  qualityMinInteractionsForStatus: number;
  qualityUnderReviewRiskThreshold: number;
  qualityPremiumAccessThreshold: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateMarketplaceScoringConfigBody = Partial<MarketplaceScoringConfig> & {
  reasonCode: string;
};

export type MarketplaceVisibilityStatus = "VISIBLE" | "GRACE_PERIOD" | "HIDDEN";
export type MarketplaceCompliance = "COMPLIANT" | "NON_COMPLIANT";

export type MarketplaceVisibilityQueryParams = {
  page?: number;
  limit?: number;
  visibilityStatus?: MarketplaceVisibilityStatus | "";
  compliance?: MarketplaceCompliance | "";
  search?: string;
};

export type MarketplaceVisibilityItem = {
  website: {
    id: string;
    name: string;
    websiteUrl: string;
    owner: {
      id: string;
      name: string;
      email: string;
    };
  };
  status: MarketplaceVisibilityStatus;
  compliance: MarketplaceCompliance;
  usage: {
    credits: number;
    label: string;
  };
  visibility: {
    credits: number;
    activeUntil: string | null;
    graceStartedAt: string | null;
    graceEndsAt: string | null;
  };
  graceTimer: {
    endsAt: string;
    remainingSeconds: number;
    serverTime: string;
    remainingTime: {
      hours: number;
      minutes: number;
      seconds: number;
    };
    label: string;
  } | null;
  authorityAction: {
    label: string;
    websiteId: string;
  };
};

export type MarketplaceVisibilityResponseData = {
  serverTime: string;
  items: MarketplaceVisibilityItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminBadgeRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  roleScope: string;
  triggerType: string;
  rewardType: string;
  isActive: boolean;
  isPermanent: boolean;
  validityDays: number | null;
  earnedCount?: number;
  activeCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BadgeDefinition = AdminBadgeRow & {
  description?: string | null;
  requirementText?: string | null;
  rewardImpactText?: string | null;
  badgeScope?: string;
  threshold?: number | null;
  secondaryThreshold?: number | null;
  isPersistent?: boolean;
  rewardValue?: number | null;
  rewardMeta?: Record<string, unknown> | null;
  refreshWindowDays?: number | null;
  gracePeriodDays?: number | null;
};

type BadgeListResponse = ApiResponse<{
  data: AdminBadgeRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore?: boolean;
  };
}>;

export const systemConfigurationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemSubscriptionPlans: builder.query<ApiResponse<SubscriptionPlan[]>, { isActive?: boolean; tier?: PlanTier } | void>({
      query: (params) => ({
        url: "/admin-subscription-plan/all",
        params: params || {},
      }),
      providesTags: ["SystemPlan" as never],
    }),
    updateSystemSubscriptionPlan: builder.mutation<ApiResponse<SubscriptionPlan>, { id: string; body: UpdateSubscriptionPlanBody }>({
      query: ({ id, body }) => ({
        url: `/admin-subscription-plan/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SystemPlan" as never],
    }),
    getSystemReferralRewardConfig: builder.query<ApiResponse<ReferralRewardConfig>, void>({
      query: () => "/admin/referral-reward-config",
      providesTags: ["SystemReferralConfig" as never],
    }),
    updateSystemReferralRewardConfig: builder.mutation<ApiResponse<ReferralRewardConfig>, UpdateReferralRewardConfigBody>({
      query: (body) => ({
        url: "/admin/referral-reward-config",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SystemReferralConfig" as never],
    }),
    getSystemFeatureToggles: builder.query<ApiResponse<{ toggles: PlatformFeatureToggle[] }>, void>({
      query: () => "/admin/platform-feature-toggles",
      providesTags: ["SystemFeatureToggle" as never],
    }),
    updateSystemFeatureToggles: builder.mutation<ApiResponse<{ toggles: PlatformFeatureToggle[] }>, { toggles: { key: PlatformFeatureToggleKey; enabled: boolean }[] }>({
      query: (body) => ({
        url: "/admin/platform-feature-toggles",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SystemFeatureToggle" as never],
    }),
    getSystemMarketplaceConfig: builder.query<ApiResponse<MarketplaceScoringConfig>, void>({
      query: () => "/admin/marketplace-config",
      providesTags: ["SystemMarketplaceConfig" as never],
    }),
    updateSystemMarketplaceConfig: builder.mutation<ApiResponse<MarketplaceScoringConfig>, UpdateMarketplaceScoringConfigBody>({
      query: (body) => ({
        url: "/admin/marketplace-config",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SystemMarketplaceConfig" as never],
    }),
    getSystemMarketplaceVisibility: builder.query<ApiResponse<MarketplaceVisibilityResponseData>, MarketplaceVisibilityQueryParams | void>({
      query: (params) => {
        const cleanedParams = Object.fromEntries(
          Object.entries(params || {}).filter(([, value]) => value !== "" && value !== undefined && value !== null),
        );

        return {
          url: "/admin/marketplace-visibility",
          params: cleanedParams,
        };
      },
      providesTags: ["MarketplaceVisibility" as never],
    }),
    getSystemBadgeDefinitions: builder.query<ApiResponse<BadgeDefinition[]>, void>({
      async queryFn(_arg, _api, _extraOptions, fetchWithBQ) {
        const listResult = await fetchWithBQ({ url: "/admin/rewards/badges", params: { page: 1, limit: 50 } });

        if (listResult.error) {
          return { error: listResult.error };
        }

        const list = listResult.data as BadgeListResponse;
        const rows = list.data?.data || [];
        const details = await Promise.all(
          rows.map(async (badge) => {
            const detailResult = await fetchWithBQ(`/admin/rewards/badges/${badge.id}`);
            if (detailResult.error) {
              return badge as BadgeDefinition;
            }
            const detail = detailResult.data as ApiResponse<BadgeDefinition>;
            return detail.data;
          }),
        );

        return {
          data: {
            success: true,
            message: list.message,
            data: details,
          },
        };
      },
      providesTags: ["SystemBadgeConfig" as never, "RewardBadge" as never],
    }),
    updateSystemBadgeDefinition: builder.mutation<ApiResponse<BadgeDefinition>, { id: string; body: Partial<Pick<BadgeDefinition, "threshold" | "secondaryThreshold" | "validityDays" | "refreshWindowDays" | "gracePeriodDays" | "isActive">> }>({
      query: ({ id, body }) => ({
        url: `/admin/rewards/badges/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SystemBadgeConfig" as never, "RewardBadge" as never, "RewardAudit" as never],
    }),
  }),
});

export const {
  useGetSystemSubscriptionPlansQuery,
  useUpdateSystemSubscriptionPlanMutation,
  useGetSystemReferralRewardConfigQuery,
  useUpdateSystemReferralRewardConfigMutation,
  useGetSystemFeatureTogglesQuery,
  useUpdateSystemFeatureTogglesMutation,
  useGetSystemMarketplaceConfigQuery,
  useUpdateSystemMarketplaceConfigMutation,
  useGetSystemMarketplaceVisibilityQuery,
  useGetSystemBadgeDefinitionsQuery,
  useUpdateSystemBadgeDefinitionMutation,
} = systemConfigurationApi;
