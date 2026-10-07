import { baseApi } from "@/redux/baseApi";
import type {
  ComplianceQuery,
  LegalDocsQuery,
  ConsentResponse,
  GovernanceResponse,
  AbuseReportResponse,
  TaskDisputeResponse,
  FinancialResponse,
  LegalDocListResponse,
  CreateLegalDocRequest,
  CreateLegalDocResponse,
  ActivateLegalDocResponse,
  DeleteLegalDocResponse,
} from "./complianceTypes";

// Helper: build URLSearchParams from ComplianceQuery
const buildComplianceParams = (q: ComplianceQuery) => {
  const params: Record<string, string> = {
    page: String(q.page),
    limit: String(q.limit),
  };
  if (q.search?.trim()) params.search = q.search.trim();
  return params;
};

export const complianceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── 1. User Legal Consent Records ─────────────────────────────────────────
    getConsents: builder.query<ConsentResponse, ComplianceQuery>({
      query: (q) => ({
        url: "/admin/dashboard/compliance/consents",
        params: buildComplianceParams(q),
      }),
      providesTags: ["Compliance"],
    }),

    // ── 2. Account Governance Records ─────────────────────────────────────────
    getGovernanceRecords: builder.query<GovernanceResponse, ComplianceQuery>({
      query: (q) => ({
        url: "/admin/dashboard/compliance/governance-records",
        params: buildComplianceParams(q),
      }),
      providesTags: ["Compliance"],
    }),

    // ── 3. Abuse Reports ──────────────────────────────────────────────────────
    getAbuseReports: builder.query<AbuseReportResponse, ComplianceQuery>({
      query: (q) => ({
        url: "/admin/dashboard/compliance/abuse-reports",
        params: buildComplianceParams(q),
      }),
      providesTags: ["Compliance"],
    }),

    // ── 4. Task Disputes ──────────────────────────────────────────────────────
    getTaskDisputes: builder.query<TaskDisputeResponse, ComplianceQuery>({
      query: (q) => ({
        url: "/admin/dashboard/compliance/task-disputes",
        params: buildComplianceParams(q),
      }),
      providesTags: ["Compliance"],
    }),

    // ── 5. Financial Records ──────────────────────────────────────────────────
    getFinancialRecords: builder.query<FinancialResponse, ComplianceQuery>({
      query: (q) => ({
        url: "/admin/dashboard/compliance/financial-records",
        params: buildComplianceParams(q),
      }),
      providesTags: ["Compliance"],
    }),

    // ── 6. Legal Docs – List ──────────────────────────────────────────────────
    getLegalDocs: builder.query<LegalDocListResponse, LegalDocsQuery>({
      query: (q) => {
        const params: Record<string, string | boolean> = {
          page: String(q.page),
          limit: String(q.limit),
        };
        if (q.search?.trim()) params.search = q.search.trim();
        if (q.type) params.type = q.type;
        if (q.isActive !== undefined) params.isActive = q.isActive;
        return { url: "/legal-docs", params };
      },
      providesTags: ["LegalDocs"],
    }),

    // ── 6. Legal Docs – Create ────────────────────────────────────────────────
    createLegalDoc: builder.mutation<CreateLegalDocResponse, CreateLegalDocRequest>({
      query: (body) => ({
        url: "/legal-docs",
        method: "POST",
        body,
      }),
      invalidatesTags: ["LegalDocs"],
    }),

    // ── 6. Legal Docs – Activate Version ─────────────────────────────────────
    activateLegalDocVersion: builder.mutation<ActivateLegalDocResponse, string>({
      query: (versionId) => ({
        url: `/legal-docs/versions/${versionId}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: ["LegalDocs", "Compliance"],
    }),

    // ── 6. Legal Docs – Delete Version ───────────────────────────────────────
    deleteLegalDocVersion: builder.mutation<DeleteLegalDocResponse, string>({
      query: (versionId) => ({
        url: `/legal-docs/versions/${versionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LegalDocs"],
    }),
  }),
});

export const {
  useGetConsentsQuery,
  useGetGovernanceRecordsQuery,
  useGetAbuseReportsQuery,
  useGetTaskDisputesQuery,
  useGetFinancialRecordsQuery,
  useGetLegalDocsQuery,
  useCreateLegalDocMutation,
  useActivateLegalDocVersionMutation,
  useDeleteLegalDocVersionMutation,
} = complianceApi;
