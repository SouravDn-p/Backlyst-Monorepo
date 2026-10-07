import type {
  CompanyDetailResponse,
  CompanyDirectoryResponse,
  GetCompaniesParams,
} from "@/types/company/companyDirectoryTypes";
import { baseApi } from "../baseApi";

export const companyDirectoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCompanies: builder.query<CompanyDirectoryResponse, GetCompaniesParams | void>({
      query: (params) => ({
        url: "/company",
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: [{ type: "Company", id: "LIST" }],
    }),
    getCompanyDetail: builder.query<CompanyDetailResponse, string>({
      query: (id) => ({
        url: `/company/${encodeURIComponent(id)}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Company", id }],
    }),
  }),
});

export const { useGetCompaniesQuery, useGetCompanyDetailQuery } =
  companyDirectoryApi;
