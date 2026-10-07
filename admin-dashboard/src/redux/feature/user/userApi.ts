import { baseApi } from "../../baseApi";

export type UserRegistryParams = {
  page?: number;
  limit?: number;
  search?: string;
  subscriptionTier?: string;
  status?: string;
  referralStatus?: string;
};

export type UserRegistryItem = {
  id: string;
  userNumber: string;
  emailIdentity: string;
  accountType: string | null;
  accountTypeLabel: string;
  governanceStatus: string;
  country: string | null;
  assets: {
    verified: number;
  };
  credits: {
    used: number;
    allowed: number;
    available: number;
    displayValue: string;
  };
  referral: {
    total: number;
    statuses: string[];
  };
  authorityAction: {
    label: string;
    profileEndpoint: string;
  };
  registeredAt: string;
};

export type UserRegistryResponse = {
  success: boolean;
  message: string;
  data: {
    items: UserRegistryItem[];
    meta: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};

export type GovernanceNoteItem = {
  id?: string;
  note: string;
  createdAt: string;
  adminName?: string;
};

export type UserProfileResponse = {
  success: boolean;
  message: string;
  data: {
    oversight: {
      title: string;
      subtitle: string;
      accountStatus: string;
      authorityClearance: string;
      primaryEmail: string;
      countryOfOrigin: string | null;
      registrationDate: string;
      subscriptionTier: string;
      institutionalAssets: {
        linkedWebsites: number;
        verifiedWebsites: number;
        referralActivity: string;
      };
      creditReserves: {
        totalBalance: number;
        used: number;
        available: number;
        displayValue: string;
        progressPercent: number;
        readOnly: boolean;
      };
      governanceNotes: GovernanceNoteItem[];
    };
    user: {
      id: string;
      name: string;
      emailIdentity: string;
      governanceStatus: string;
      country: string | null;
      companyName: string | null;
      businessType: string | null;
      registeredAt: string;
    };
    subscription: {
      id: string;
      status: string;
      startDate: string;
      endDate: string;
      plan: {
        id: string;
        tier: string;
        name: string;
        credit: number;
        visibility: string;
        billingInterval: string;
      };
    } | null;
    assets: {
      total: number;
      verified: number;
      websites: Array<{
        id: string;
        name: string;
        websiteUrl: string;
        verificationStatus: string;
        country: string | null;
        creditWallet: any;
      }>;
    };
    credits: {
      used: number;
      allowed: number;
      available: number;
      displayValue: string;
      masterWallet: {
        subscriptionTaskCredits: number;
        earnedTaskCredits: number;
        purchasedTaskCredits: number;
        referralTaskCredits: number;
        visibilityCredits: number;
      };
      websiteWalletTotal: number;
    };
    referral: {
      sent: any[];
      received: Array<{
        id: string;
        currentStage: string;
        codeUsed: string;
        signedUpAt: string;
      }>;
    };
  };
};

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserRegistry: builder.query<UserRegistryResponse, UserRegistryParams | void>({
      query: (params) => ({
        url: "/admin-user/registry",
        params: params || {},
      }),
      providesTags: ["UserRegistry"],
    }),
    getUserProfile: builder.query<UserProfileResponse, string>({
      query: (userId) => ({
        url: `/admin-user/registry/${userId}`,
      }),
      providesTags: (result, error, userId) => [{ type: "UserProfile" as const, id: userId }],
    }),
    suspendUser: builder.mutation<
      { success: boolean; message: string },
      { userId: string; reason: string; durationInDays: number }
    >({
      query: ({ userId, reason, durationInDays }) => ({
        url: `/admin-user/registry/${userId}/suspend`,
        method: "POST",
        body: { reason, durationInDays },
      }),
      invalidatesTags: (result, error, { userId }) => ["UserRegistry", { type: "UserProfile" as const, id: userId }],
    }),
    banUser: builder.mutation<
      { success: boolean; message: string },
      { userId: string; reason: string }
    >({
      query: ({ userId, reason }) => ({
        url: `/admin-user/registry/${userId}/ban`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (result, error, { userId }) => ["UserRegistry", { type: "UserProfile" as const, id: userId }],
    }),
    resetPassword: builder.mutation<{ success: boolean; message: string }, string>({
      query: (userId) => ({
        url: `/admin-user/registry/${userId}/reset-password`,
        method: "POST",
      }),
      invalidatesTags: (result, error, userId) => ["UserRegistry", { type: "UserProfile" as const, id: userId }],
    }),
    forceLogout: builder.mutation<{ success: boolean; message: string }, string>({
      query: (userId) => ({
        url: `/admin-user/registry/${userId}/force-logout`,
        method: "POST",
      }),
      invalidatesTags: (result, error, userId) => ["UserRegistry", { type: "UserProfile" as const, id: userId }],
    }),
    appendGovernanceNote: builder.mutation<
      { success: boolean; message: string },
      { userId: string; note: string }
    >({
      query: ({ userId, note }) => ({
        url: `/admin-user/registry/${userId}/governance-notes`,
        method: "POST",
        body: { note },
      }),
      invalidatesTags: (result, error, { userId }) => ["UserRegistry", { type: "UserProfile" as const, id: userId }],
    }),
  }),
});

export const {
  useGetUserRegistryQuery,
  useGetUserProfileQuery,
  useSuspendUserMutation,
  useBanUserMutation,
  useResetPasswordMutation,
  useForceLogoutMutation,
  useAppendGovernanceNoteMutation,
} = userApi;
