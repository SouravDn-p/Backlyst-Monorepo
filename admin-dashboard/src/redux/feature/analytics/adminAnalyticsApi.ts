import { API_BASE_URL, baseApi } from "@/redux/baseApi";
import type {
  AnalyticsBaseParams,
  AnalyticsOverviewResponse,
  RegistryReportParams,
  AnalyticsReportRegistryResponse,
  LiveReportParams,
  LiveReportResponse,
  SavedReportsListParams,
  SavedReportsListResponse,
  SavedReportDetailResponse,
  CreateSavedReportRequest,
  CreateSavedReportResponse,
  UpdateSavedReportRequest,
  UpdateSavedReportResponse,
  DeleteSavedReportResponse,
  RegenerateSavedReportResponse,
} from "./adminAnalyticsTypes";

// ── Helper: build params for base analytics filters ───────────────────────
function buildBaseParams(
  p: AnalyticsBaseParams
): Record<string, string> {
  const params: Record<string, string> = {};
  if (p.range) params.range = p.range;
  if (p.participant) params.participant = p.participant;
  if (p.range === "CUSTOM" && p.from) params.from = p.from;
  if (p.range === "CUSTOM" && p.to) params.to = p.to;
  return params;
}

export const adminAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── 1. Overview Cards ─────────────────────────────────────────────────
    getAnalyticsOverview: builder.query<
      AnalyticsOverviewResponse,
      AnalyticsBaseParams
    >({
      query: (params) => ({
        url: "/admin/analytics/overview",
        params: buildBaseParams(params),
      }),
      providesTags: ["Analytics"],
    }),

    // ── 2. Report Registry Table ──────────────────────────────────────────
    getAnalyticsReportRegistry: builder.query<
      AnalyticsReportRegistryResponse,
      RegistryReportParams
    >({
      query: (params) => {
        const p = buildBaseParams(params);
        if (params.metric) p.metric = params.metric;
        if (params.source) p.source = params.source;
        return {
          url: "/admin/analytics/report-registry",
          params: p,
        };
      },
      providesTags: ["Analytics"],
    }),

    // ── 3. Live Report Detail (one reportType) ────────────────────────────
    getAnalyticsReport: builder.query<LiveReportResponse, LiveReportParams>({
      query: ({ reportType, ...rest }) => ({
        url: `/admin/analytics/reports/${reportType}`,
        params: buildBaseParams(rest),
      }),
      providesTags: ["Analytics"],
    }),

    // ── 4. Saved Reports List (paginated) ─────────────────────────────────
    getSavedAnalyticsReports: builder.query<
      SavedReportsListResponse,
      SavedReportsListParams
    >({
      query: (params) => {
        const p: Record<string, string | number> = {};
        if (params.page !== undefined) p.page = params.page;
        if (params.limit !== undefined) p.limit = params.limit;
        if (params.search?.trim()) p.search = params.search.trim();
        if (params.reportType) p.reportType = params.reportType;
        if (params.status) p.status = params.status;
        if (params.generatedFrom) p.generatedFrom = params.generatedFrom;
        if (params.generatedTo) p.generatedTo = params.generatedTo;
        if (params.sortBy) p.sortBy = params.sortBy;
        if (params.sortOrder) p.sortOrder = params.sortOrder;
        return {
          url: "/admin/analytics/saved-reports",
          params: p,
        };
      },
      providesTags: ["SavedReport"],
    }),

    // ── 5. Saved Report Detail (with snapshot) ────────────────────────────
    getSavedAnalyticsReport: builder.query<SavedReportDetailResponse, string>({
      query: (id) => ({
        url: `/admin/analytics/saved-reports/${id}`,
      }),
      providesTags: (_result, _error, id) => [{ type: "SavedReport", id }],
    }),

    // ── 12. Create (save) Snapshot Report ─────────────────────────────────
    createSavedAnalyticsReport: builder.mutation<
      CreateSavedReportResponse,
      CreateSavedReportRequest
    >({
      query: (body) => ({
        url: "/admin/analytics/saved-reports",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SavedReport", "Analytics"],
    }),

    // ── 13. Update Saved Report (name + description ONLY) ─────────────────
    updateSavedAnalyticsReport: builder.mutation<
      UpdateSavedReportResponse,
      UpdateSavedReportRequest
    >({
      query: ({ id, name, description }) => ({
        url: `/admin/analytics/saved-reports/${id}`,
        method: "PATCH",
        // Do NOT send reportType, snapshot, filters, dateFrom, dateTo, generatedById
        body: { name, ...(description !== undefined ? { description } : {}) },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "SavedReport", id },
        "SavedReport",
      ],
    }),

    // ── 14. Delete Saved Report (soft delete) ─────────────────────────────
    deleteSavedAnalyticsReport: builder.mutation<
      DeleteSavedReportResponse,
      string
    >({
      query: (id) => ({
        url: `/admin/analytics/saved-reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SavedReport"],
    }),

    // ── 15. Regenerate Saved Report ───────────────────────────────────────
    regenerateSavedAnalyticsReport: builder.mutation<
      RegenerateSavedReportResponse,
      string
    >({
      query: (id) => ({
        url: `/admin/analytics/saved-reports/${id}/regenerate`,
        method: "POST",
      }),
      invalidatesTags: ["SavedReport"],
    }),
  }),
});

// ── Binary export helper (uses native fetch with Authorization header) ────
// RTK Query cannot handle binary file downloads with auth headers.
// This follows the exact pattern from admin-analytics-frontend-api.md section 6.
function resolveDownloadUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

function filenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ?? null;
}

function expectedMime(filename: string): string | null {
  if (filename.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (filename.toLowerCase().endsWith(".csv")) return "text/csv";
  return null;
}

export async function downloadAnalyticsFile(
  pathOrUrl: string,
  fallbackFilename: string
): Promise<void> {
  const token =
    sessionStorage.getItem("accessToken") ??
    localStorage.getItem("accessToken");

  const res = await fetch(resolveDownloadUrl(pathOrUrl), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: fallbackFilename.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "text/csv,application/octet-stream,*/*",
    },
  });

  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const message = contentType.includes("application/json")
      ? await res.text()
      : `${res.status} ${res.statusText}`;
    throw new Error(`Download failed: ${message}`);
  }

  if (contentType.includes("text/html")) {
    throw new Error("Download returned HTML instead of an analytics file.");
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const mime = expectedMime(fallbackFilename);

  if (mime === "application/pdf") {
    const signature = String.fromCharCode(...bytes.slice(0, 4));
    if (signature !== "%PDF") {
      throw new Error("Download returned a non-PDF response.");
    }
  }

  const filename =
    filenameFromDisposition(res.headers.get("content-disposition")) ??
    fallbackFilename;
  const blob = new Blob([arrayBuffer], {
    type: contentType || mime || "application/octet-stream",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
export const {
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsReportRegistryQuery,
  useGetAnalyticsReportQuery,
  useGetSavedAnalyticsReportsQuery,
  useGetSavedAnalyticsReportQuery,
  useCreateSavedAnalyticsReportMutation,
  useUpdateSavedAnalyticsReportMutation,
  useDeleteSavedAnalyticsReportMutation,
  useRegenerateSavedAnalyticsReportMutation,
} = adminAnalyticsApi;
