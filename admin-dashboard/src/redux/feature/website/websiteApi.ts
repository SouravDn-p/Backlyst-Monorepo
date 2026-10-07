import { baseApi } from "@/redux/baseApi";


// ─── List params ────────────────────────────────────────────────────────────
export type WebsiteListParams = {
  page?: number;
  limit?: number;
  search?: string;
  verificationStatus?: string;
  verificationType?: string;
  authorId?: string;
};

// ─── List item (from GET /website) ──────────────────────────────────────────
export type WebsiteListItem = {
  id: string;
  name: string;
  websiteUrl: string;
  verificationStatus:
    | "VERIFIED"
    | "PENDING"
    | "REQUESTED_FOR_MANUAL_REVIEW"
    | "REJECTED"
    | string;
  verifiedAt: string | null;
  verifiedMethod: string | null;
  marketplaceVisibilityStatus?: "VISIBLE" | "GRACE_PERIOD" | "HIDDEN" | string;
  visibilityGraceStartedAt?: string | null;
  visibilityGraceEndsAt?: string | null;
  industry: string | null;
  country: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
  };
  websiteVerifications?: Array<{
    id: string;
    type: string;
    status: string;
    rejectReason?: string | null;
    errorMessage?: string | null;
    manualReviewNotes?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type WebsiteListResponse = {
  success: boolean;
  message: string;
  data: {
    data: WebsiteListItem[];
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

// ─── Detail item (from GET /website/{id}) ───────────────────────────────────
export type MozMetrics = {
  page: string;
  title: string | null;
  httpCode: number;
  lastCrawled: string | null;
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  linkingRootDomains: number;
  totalBacklinks: number;
  externalBacklinks: number;
};

export type WebsiteDetail = {
  id: string;
  name: string;
  authorId: string;
  websiteUrl: string;
  industry: string | null;
  country: string | null;
  isDeleted: boolean;
  marketplaceVisibilityStatus?: "VISIBLE" | "GRACE_PERIOD" | "HIDDEN" | string;
  visibilityGraceStartedAt?: string | null;
  visibilityGraceEndsAt?: string | null;
  description: string | null;
  logoKey: string | null;
  tagline: string | null;
  verificationStatus:
    | "VERIFIED"
    | "PENDING"
    | "REQUESTED_FOR_MANUAL_REVIEW"
    | "REJECTED"
    | string;
  verifiedAt: string | null;
  verifiedMethod: string | null;
  latestVerificationId: string | null;
  createdAt: string;
  updatedAt: string;
  isFlag: boolean;
  isWalletLock: boolean;
  domainRating?: number | null;
  mozAnalyticsError?: string | null;
  trust?: {
    reliabilityScore: number;
    reputationScore: number;
    completedInteractions: number;
    completionRate: number;
    avgQualityRating: number;
  } | null;
  mozAnalytics: {
    domain: string;
    normalizedDomain: string;
    metrics: MozMetrics;
    backlink: {
      totalBacklinks: number;
      externalBacklinks: number;
      linkingRootDomains: number;
    };
    dofollowNofollow: {
      dofollowRefDomains: number;
      nofollowRefDomains: number;
      dofollowRefDomainRatio: number;
      nofollowRefDomainRatio: number;
    };
    guestPost: {
      domainAuthority: number;
      pageAuthority: number;
      spamScore: number;
      estimatedSuitability: string;
    };
    rawPreview: {
      subdomain: string;
      rootDomain: string;
      linkPropensity: number;
      pagesFromRootDomain: number;
      rootDomainsFromRootDomain: number;
      nofollowRootDomainsToRootDomain: number;
      deletedRootDomainsToRootDomain: number;
    };
  } | null;
};

export type WebsiteDetailResponse = {
  success: boolean;
  message: string;
  data: WebsiteDetail;
};

export type WebsiteVerificationDecisionResponse = {
  success: boolean;
  message: string;
  data: {
    websiteVerificationId: string;
    websiteId: string;
  };
};

export type ApproveWebsiteVerificationRequest = {
  websiteId: string;
  manualReviewNotes?: string;
};

export type RejectWebsiteVerificationRequest = {
  websiteId: string;
  rejectionReason: string;
  manualReviewNotes?: string;
};

export type ForceWebsiteReverificationResponse = {
  success: boolean;
  message: string;
  data: {
    website: Pick<
      WebsiteDetail,
      | "id"
      | "name"
      | "websiteUrl"
      | "verificationStatus"
      | "verifiedAt"
      | "verifiedMethod"
      | "latestVerificationId"
    >;
    previousVerification: {
      status: string;
      verifiedAt: string | null;
      verifiedMethod: string | null;
      latestVerificationId: string | null;
    };
  };
};

export type WebsiteTaxonomyItem = {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  key?: string;
  tag?: string;
};

export type WebsiteTaxonomyResponse = {
  success: boolean;
  message: string;
  data: WebsiteTaxonomyItem[];
};

export type WebsiteTaxonomyMutationResponse = {
  success: boolean;
  message: string;
  data?: WebsiteTaxonomyItem;
};

export type WebsiteVerificationMetaTag = {
  metaName: string;
  verificationToken: string;
};

export type WebsiteVerificationMetaTagResponse = {
  success: boolean;
  message: string;
  data: WebsiteVerificationMetaTag;
};

export type WebsiteVerificationRequestParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
};

export type WebsiteVerificationRequestItem = {
  id: string;
  websiteId: string;
  status: string;
  type: string;
  screenshotImageKey?: string | null;
  verifiedBy?: string | null;
  errorMessage?: string | null;
  responseData?: string | null;
  rejectReason?: string | null;
  manualReviewNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type WebsiteVerificationRequestsResponse = {
  success: boolean;
  message: string;
  data: {
    data: WebsiteVerificationRequestItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type WebsiteVerificationDetails = WebsiteVerificationRequestItem & {
  screenshotUrl?: string | null;
  website: {
    id: string;
    name: string;
    logoUrl?: string | null;
    websiteUrl: string;
    verificationStatus: string;
    verifiedAt: string | null;
    verifiedMethod: string | null;
  marketplaceVisibilityStatus?: "VISIBLE" | "GRACE_PERIOD" | "HIDDEN" | string;
  visibilityGraceStartedAt?: string | null;
  visibilityGraceEndsAt?: string | null;
  industry: string | null;
    country: string | null;
    author: {
      id: string;
      name: string;
      email: string;
      imageUrl?: string | null;
    } | null;
  };
  manuallyReviewedByAdmin?: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string | null;
  } | null;
};
export type FlagWebsiteResponse = {
  success: boolean;
  message: string;
  data: WebsiteDetail;
};

// ─── API slice ───────────────────────────────────────────────────────────────
export const websiteApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWebsites: builder.query<WebsiteListResponse, WebsiteListParams | void>({
      query: (params) => ({
        url: "/website",
        params: params || {},
      }),
      providesTags: ["Website"],
    }),
    getWebsiteById: builder.query<WebsiteDetailResponse, string>({
      query: (id) => ({
        url: `/website/${id}`,
      }),
      providesTags: (result, error, id) => [{ type: "Website" as const, id }],
    }),
    approveWebsiteVerification: builder.mutation<
      WebsiteVerificationDecisionResponse,
      ApproveWebsiteVerificationRequest
    >({
      query: (body) => ({
        url: "/website-verification-admin/approve",
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { websiteId }) => [
        "Website",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    rejectWebsiteVerification: builder.mutation<
      WebsiteVerificationDecisionResponse,
      RejectWebsiteVerificationRequest
    >({
      query: (body) => ({
        url: "/website-verification-admin/reject",
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { websiteId }) => [
        "Website",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    forceWebsiteReverification: builder.mutation<
      ForceWebsiteReverificationResponse,
      string
    >({
      query: (websiteId) => ({
        url: `/website-verification-admin/websites/${websiteId}/force-reverification`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, websiteId) => [
        "Website",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    getWebsiteCategoryKeys: builder.query<WebsiteTaxonomyResponse, void>({
      query: () => ({
        url: "/website-category-keys",
      }),
      providesTags: ["WebsiteCategoryKey"],
    }),
    createWebsiteCategoryKey: builder.mutation<
      WebsiteTaxonomyMutationResponse,
      { key: string }
    >({
      query: (body) => ({
        url: "/admin/website-category-keys",
        method: "POST",
        body,
      }),
      invalidatesTags: ["WebsiteCategoryKey"],
    }),
    updateWebsiteCategoryKey: builder.mutation<
      WebsiteTaxonomyMutationResponse,
      { id: string; key: string }
    >({
      query: ({ id, key }) => ({
        url: `/admin/website-category-keys/${id}`,
        method: "PATCH",
        body: { key },
      }),
      invalidatesTags: ["WebsiteCategoryKey"],
    }),
    deleteWebsiteCategoryKey: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/admin/website-category-keys/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["WebsiteCategoryKey"],
    }),
    getWebsiteMarketplaceTags: builder.query<WebsiteTaxonomyResponse, void>({
      query: () => ({
        url: "/website-marketplace-tags",
      }),
      providesTags: ["WebsiteMarketplaceTag"],
    }),
    createWebsiteMarketplaceTag: builder.mutation<
      WebsiteTaxonomyMutationResponse,
      { tag: string }
    >({
      query: (body) => ({
        url: "/admin/website-marketplace-tags",
        method: "POST",
        body,
      }),
      invalidatesTags: ["WebsiteMarketplaceTag"],
    }),
    updateWebsiteMarketplaceTag: builder.mutation<
      WebsiteTaxonomyMutationResponse,
      { id: string; tag: string }
    >({
      query: ({ id, tag }) => ({
        url: `/admin/website-marketplace-tags/${id}`,
        method: "PATCH",
        body: { tag },
      }),
      invalidatesTags: ["WebsiteMarketplaceTag"],
    }),
    deleteWebsiteMarketplaceTag: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/admin/website-marketplace-tags/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["WebsiteMarketplaceTag"],
    }),
    getWebsiteVerificationMetaTag: builder.query<WebsiteVerificationMetaTagResponse, void>({
      query: () => ({
        url: "/website-verification-admin/meta-tag",
      }),
      providesTags: ["WebsiteVerificationMetaTag"],
    }),
    updateWebsiteVerificationMetaTag: builder.mutation<
      WebsiteVerificationMetaTagResponse,
      WebsiteVerificationMetaTag
    >({
      query: (body) => ({
        url: "/website-verification-admin/meta-tag",
        method: "POST",
        body,
      }),
      invalidatesTags: ["WebsiteVerificationMetaTag"],
    }),
    getWebsiteVerificationRequests: builder.query<
      WebsiteVerificationRequestsResponse,
      WebsiteVerificationRequestParams | void
    >({
      query: (params) => ({
        url: "/website-verification-admin/pending",
        params: params || {},
      }),
      providesTags: ["WebsiteVerificationRequest"],
    }),
    getWebsiteVerificationDetails: builder.query<WebsiteVerificationDetails, string>({
      query: (id) => ({
        url: `/website-verification-admin/details/${id}`,
      }),
      providesTags: (result, error, id) => [
        { type: "WebsiteVerificationRequest" as const, id },
      ],
    }),
    approveWebsiteScreenshotVerification: builder.mutation<
      WebsiteVerificationDecisionResponse,
      ApproveWebsiteVerificationRequest
    >({
      query: (body) => ({
        url: "/website-verification-admin/screenshot/approve",
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { websiteId }) => [
        "Website",
        "WebsiteVerificationRequest",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    rejectWebsiteScreenshotVerification: builder.mutation<
      WebsiteVerificationDecisionResponse,
      RejectWebsiteVerificationRequest
    >({
      query: (body) => ({
        url: "/website-verification-admin/screenshot/reject",
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { websiteId }) => [
        "Website",
        "WebsiteVerificationRequest",
        { type: "Website" as const, id: websiteId },
      ],
    }),
    flagWebsite: builder.mutation<FlagWebsiteResponse, string>({
      query: (websiteId) => ({
        url: `/website/${websiteId}/flag`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, websiteId) => [
        "Website",
        { type: "Website" as const, id: websiteId },
      ],
    }),
  }),
});

export const {
  useGetWebsitesQuery,
  useGetWebsiteByIdQuery,
  useApproveWebsiteVerificationMutation,
  useRejectWebsiteVerificationMutation,
  useForceWebsiteReverificationMutation,
  useFlagWebsiteMutation,
  useGetWebsiteCategoryKeysQuery,
  useCreateWebsiteCategoryKeyMutation,
  useUpdateWebsiteCategoryKeyMutation,
  useDeleteWebsiteCategoryKeyMutation,
  useGetWebsiteMarketplaceTagsQuery,
  useCreateWebsiteMarketplaceTagMutation,
  useUpdateWebsiteMarketplaceTagMutation,
  useDeleteWebsiteMarketplaceTagMutation,
  useGetWebsiteVerificationMetaTagQuery,
  useUpdateWebsiteVerificationMetaTagMutation,
  useGetWebsiteVerificationRequestsQuery,
  useGetWebsiteVerificationDetailsQuery,
  useApproveWebsiteScreenshotVerificationMutation,
  useRejectWebsiteScreenshotVerificationMutation,
} = websiteApi;

