import { baseApi } from "../baseApi";

import {
  CreateWebsiteRequest,
  CreateWebsiteResponse,
  GetWebsiteResponse,
  UpdateWebsiteRequest,
  UpdateWebsiteResponse,
  DeleteWebsiteResponse,
  GetMyWebsitesRequest,
  GetMyWebsitesResponse,
  GetWebsiteVerificationDetailsResponse,
  DNSVerificationRequest,
  MetaTagVerificationRequest,
  ScreenshotVerificationRequest,
  MetaTagsResponse,
  DNSVerificationResponse,
  RequestVerificationResponse,
  GetVerificationRequestsRequest,
  GetVerificationRequestsResponse,
  WebsiteCategoryKeysResponse,
  WebsiteMarketplaceTagsResponse,
} from "@/types/website/websiteTypes";

export const websiteApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Website CRUD operations
    createWebsite: builder.mutation<
      CreateWebsiteResponse,
      CreateWebsiteRequest
    >({
      query: (body) => ({
        url: "/website",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Website", id: "LIST" },
        { type: "RequesterWebsite", id: "LIST" },
      ],
    }),

    getWebsite: builder.query<GetWebsiteResponse, string>({
      query: (websiteId) => ({
        url: `/website/${websiteId}`,
        method: "GET",
      }),

      providesTags: (result, error, websiteId) => [
        { type: "Website", id: websiteId },
      ],
    }),

    updateWebsite: builder.mutation<
      UpdateWebsiteResponse,
      {
        websiteId: string;
        body: UpdateWebsiteRequest;
      }
    >({
      query: ({ websiteId, body }) => ({
        url: `/website/${websiteId}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { websiteId }) => [
        { type: "Website", id: websiteId },
        { type: "Website", id: "LIST" },
        { type: "RequesterWebsite", id: websiteId },
        { type: "RequesterWebsite", id: "LIST" },
      ],
    }),

    deleteWebsite: builder.mutation<
      DeleteWebsiteResponse,
      string
    >({
      query: (websiteId) => ({
        url: `/website/${websiteId}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, websiteId) => [
        { type: "Website", id: websiteId },
        { type: "Website", id: "LIST" },
        { type: "RequesterWebsite", id: websiteId },
        { type: "RequesterWebsite", id: "LIST" },
      ],
    }),

    getMyWebsites: builder.query<
      GetMyWebsitesResponse,
      GetMyWebsitesRequest
    >({
      query: (params) => ({
        url: "/website/my-websites",
        method: "GET",
        params,
      }),

      providesTags: (result) => [
        { type: "Website", id: "LIST" },
        ...(result?.data?.data.map((website) => ({
          type: "Website" as const,
          id: website.id,
        })) ?? []),
      ],
    }),

    getWebsiteCategoryKeys: builder.query<WebsiteCategoryKeysResponse, void>({
      query: () => ({
        url: "/website-category-keys",
        method: "GET",
      }),
    }),

    getWebsiteMarketplaceTags: builder.query<WebsiteMarketplaceTagsResponse, void>({
      query: () => ({
        url: "/website-marketplace-tags",
        method: "GET",
      }),
    }),

    // Verification
    getWebsiteVerificationDetails: builder.query<
      GetWebsiteVerificationDetailsResponse,
      string
    >({
      query: (websiteId) => ({
        url: `/website-verification/details/${websiteId}`,
        method: "GET",
      }),

      providesTags: (result, error, websiteId) => [
        { type: "WebsiteVerification", id: websiteId },
      ],
    }),

    getMetaTags: builder.query<MetaTagsResponse, string | void>({
      query: (websiteId) => ({
        url: "/website-verification/meta-tags",
        method: "GET",
        params: websiteId ? { websiteId } : undefined,
      }),

      providesTags: ["WebsiteVerification"],
    }),

    requestDNSVerification: builder.mutation<
      DNSVerificationResponse,
      DNSVerificationRequest
    >({
      query: ({ websiteId }) => ({
        url: `/website-verification/dns/request/${websiteId}`,
        method: "POST",
      }),

      invalidatesTags: (result, error, { websiteId }) => [
        { type: "Website", id: websiteId },
        { type: "Website", id: "LIST" },
        { type: "RequesterWebsite", id: websiteId },
        { type: "RequesterWebsite", id: "LIST" },
        { type: "WebsiteVerification" },
        { type: "WebsiteVerification", id: websiteId },
      ],
    }),

    requestMetaTagVerification: builder.mutation<
      RequestVerificationResponse,
      MetaTagVerificationRequest
    >({
      query: (body) => ({
        url: "/website-verification/meta-tag/request/" + body.websiteId,
        method: "POST",
        
      }),

      invalidatesTags: (result, error, { websiteId }) => [
        { type: "Website", id: websiteId },
        { type: "Website", id: "LIST" },
        { type: "RequesterWebsite", id: websiteId },
        { type: "RequesterWebsite", id: "LIST" },
        { type: "WebsiteVerification" },
        { type: "WebsiteVerification", id: websiteId },
      ],
    }),

    requestScreenshotVerification: builder.mutation<
      RequestVerificationResponse,
      ScreenshotVerificationRequest
    >({
      query: ({ websiteId, file }) => {
        console.log("websiteId", websiteId);
        console.log("file", file);
    const formData = new FormData();

    formData.append("websiteId", websiteId);
    formData.append("file", file);

    return {
      url: "/website-verification/screenshot/request",
      method: "POST",
      body: formData,
    };
  },
      invalidatesTags: (result, error, { websiteId }) => [
        { type: "Website", id: websiteId },
        { type: "Website", id: "LIST" },
        { type: "RequesterWebsite", id: websiteId },
        { type: "RequesterWebsite", id: "LIST" },
        { type: "WebsiteVerification" },
        { type: "WebsiteVerification", id: websiteId },
      ],
    }),

    getVerificationRequests: builder.query<
      GetVerificationRequestsResponse,
      GetVerificationRequestsRequest
    >({
      query: (params) => ({
        url: "/website-verification/my-requests",
        method: "GET",
        params,
      }),

      providesTags: ["WebsiteVerification"],
    }),
  }),
});

export const {
  useCreateWebsiteMutation,
  useGetWebsiteQuery,
  useLazyGetWebsiteQuery,
  useUpdateWebsiteMutation,
  useDeleteWebsiteMutation,
  useGetMyWebsitesQuery,
  useGetWebsiteVerificationDetailsQuery,
  useGetMetaTagsQuery,
  useLazyGetMetaTagsQuery,
  useRequestDNSVerificationMutation,
  useRequestMetaTagVerificationMutation,
  useRequestScreenshotVerificationMutation,
  useGetVerificationRequestsQuery,
  useGetWebsiteCategoryKeysQuery,
  useGetWebsiteMarketplaceTagsQuery,
} = websiteApi;
