import { baseApi } from "@/redux/baseApi";

export type EnquiryStatus = "NEW" | "RESOLVED" | "ARCHIVED";

export type ContactEnquiry = {
  id: string;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  isRead: boolean;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
};

export type ContactEnquiryListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: EnquiryStatus;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export type ContactEnquiryListResponse = {
  success: boolean;
  message: string;
  data: ContactEnquiry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type ContactEnquiryDetailResponse = {
  success: boolean;
  message: string;
  data: ContactEnquiry;
};

export type UpdateContactEnquiryRequest = {
  id: string;
  isRead?: boolean;
  status?: EnquiryStatus;
  replyMessage?: string;
};

export const contactApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getContactEnquiries: builder.query<ContactEnquiryListResponse, ContactEnquiryListParams | void>({
      query: (params) => {
        const cleanedParams = Object.fromEntries(
          Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
        );

        return {
          url: "/contact/admin/all",
          params: cleanedParams,
        };
      },
      providesTags: ["ContactEnquiry" as never],
    }),
    getContactEnquiry: builder.query<ContactEnquiryDetailResponse, string>({
      query: (id) => `/contact/admin/${id}`,
      providesTags: (result, error, id) => [{ type: "ContactEnquiry" as never, id }],
    }),
    updateContactEnquiry: builder.mutation<ContactEnquiryDetailResponse, UpdateContactEnquiryRequest>({
      query: ({ id, ...body }) => ({
        url: `/contact/admin/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "ContactEnquiry" as never,
        { type: "ContactEnquiry" as never, id },
      ],
    }),
    deleteContactEnquiry: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/contact/admin/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ContactEnquiry" as never],
    }),
  }),
});

export const {
  useGetContactEnquiriesQuery,
  useGetContactEnquiryQuery,
  useUpdateContactEnquiryMutation,
  useDeleteContactEnquiryMutation,
} = contactApi;
