import { baseApi } from "../../baseApi";

export interface VisibilityWebsite {
  id: string;
  name: string;
  websiteUrl: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export interface VisibilityItem {
  website: VisibilityWebsite;
  status: "VISIBLE" | "GRACE_PERIOD" | "HIDDEN";
  compliance: "COMPLIANT" | "NON_COMPLIANT";
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
  graceTimer?: {
    endsAt: string;
    remainingSeconds: number;
    serverTime: string;
    remainingTime: {
      hours: number;
      minutes: number;
      seconds: number;
    };
    label: string;
  };
  authorityAction: {
    label: string;
    websiteId: string;
  };
}

export interface MarketplaceVisibilityResponse {
  success: boolean;
  message: string;
  data: {
    serverTime: string;
    items: VisibilityItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface MarketplaceVisibilityQueryParams {
  page?: number;
  limit?: number;
  visibilityStatus?: string;
  compliance?: string;
  search?: string;
}

export const visibilityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMarketplaceVisibility: builder.query<
      MarketplaceVisibilityResponse,
      MarketplaceVisibilityQueryParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());
        if (params.visibilityStatus)
          queryParams.append("visibilityStatus", params.visibilityStatus);
        if (params.compliance)
          queryParams.append("compliance", params.compliance);
        if (params.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        return `/admin/marketplace-visibility${
          queryString ? `?${queryString}` : ""
        }`;
      },
      providesTags: ["MarketplaceVisibility"],
    }),
  }),
});

export const { useGetMarketplaceVisibilityQuery } = visibilityApi;
