import { API_BASE_URL, baseApi } from "../../baseApi";
import {
  ApiPaginatedResponse,
  ApiResponse,
  IAdminChatQuery,
  IAdminMessageReportsQuery,
  IAdminRegistryQuery,
  IAdminReviewMessageReportPayload,
  IAdminUpdateRegistryStatusPayload,
  IRegistryRecord,
  MessageReportSummary,
  PaginationMeta,
} from "./messageTypes";

function cleanParams<T extends Record<string, unknown>>(arg: T) {
  const params: Record<string, unknown> = {};
  Object.entries(arg).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value;
    }
  });
  return params;
}

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

export async function downloadAdminMessageEvidencePdf(messageId: string): Promise<void> {
  const token = sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken");
  const res = await fetch(resolveDownloadUrl(`/messaging/admin/registry/${messageId}/evidence-pdf`), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/pdf",
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    const message = contentType.includes("application/json") ? await res.text() : `${res.status} ${res.statusText}`;
    throw new Error(`Evidence download failed: ${message}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const signature = String.fromCharCode(...bytes.slice(0, 4));
  if (!contentType.includes("application/pdf") && signature !== "%PDF") {
    throw new Error("Evidence endpoint returned a non-PDF response.");
  }

  const filename = filenameFromDisposition(res.headers.get("content-disposition")) ?? `message-evidence-${messageId}.pdf`;
  const blob = new Blob([arrayBuffer], { type: contentType || "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export const messageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminChat: builder.query<ApiResponse<IRegistryRecord[]>, IAdminChatQuery>({
      query: (arg) => ({
        url: "/messaging/admin/chat",
        method: "GET",
        params: cleanParams(arg),
      }),
      providesTags: ["Message"],
    }),

    getAdminMessageReports: builder.query<ApiPaginatedResponse<MessageReportSummary, PaginationMeta>, IAdminMessageReportsQuery>({
      query: (arg) => ({
        url: "/messaging/admin/message-reports",
        method: "GET",
        params: cleanParams(arg),
      }),
      providesTags: ["MessageReport"],
    }),

    reviewAdminMessageReport: builder.mutation<ApiResponse<MessageReportSummary>, IAdminReviewMessageReportPayload>({
      query: ({ id, ...body }) => ({
        url: `/messaging/admin/message-reports/${id}/review`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["MessageReport", "MessageRegistry"],
    }),

    getAdminRegistry: builder.query<ApiPaginatedResponse<IRegistryRecord, PaginationMeta>, IAdminRegistryQuery>({
      query: (arg) => ({
        url: "/messaging/admin/registry",
        method: "GET",
        params: cleanParams(arg),
      }),
      providesTags: ["MessageRegistry"],
    }),

    updateAdminRegistryStatus: builder.mutation<ApiResponse<IRegistryRecord>, IAdminUpdateRegistryStatusPayload>({
      query: ({ id, ...body }) => ({
        url: `/messaging/admin/registry/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["MessageRegistry", "MessageReport"],
    }),

    deleteAdminMessageReport: builder.mutation<ApiResponse<{ id: string; registryStatus: string; reportCount: number; latestReportId?: string | null }>, string>({
      query: (id) => ({
        url: `/messaging/admin/message-reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["MessageReport", "MessageRegistry"],
    }),
  }),
});

export const {
  useGetAdminChatQuery,
  useLazyGetAdminChatQuery,
  useGetAdminMessageReportsQuery,
  useReviewAdminMessageReportMutation,
  useGetAdminRegistryQuery,
  useLazyGetAdminRegistryQuery,
  useUpdateAdminRegistryStatusMutation,
  useDeleteAdminMessageReportMutation,
} = messageApi;
