import { AcceptLegalDocResponse, GetLegalDocsResponse, LegalDocumentType } from "@/types/settings/legalDocsTypes";
import { baseApi } from "../../baseApi";


export const legalDocsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyLegalDocs: builder.query<GetLegalDocsResponse, void>({
      query: () => ({
        url: "/legal-docs/me",
        method: "GET",
      }),
      providesTags: ["LegalDocs"],
    }),

    acceptLegalDoc: builder.mutation<
      AcceptLegalDocResponse,
      LegalDocumentType
    >({
      query: (type) => ({
        url: `/legal-docs/types/${type}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["LegalDocs"],
    }),
  }),
});

export const {
  useGetMyLegalDocsQuery,
  useAcceptLegalDocMutation,
} = legalDocsApi;
