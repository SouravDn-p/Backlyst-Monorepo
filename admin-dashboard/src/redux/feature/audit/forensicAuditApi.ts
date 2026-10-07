import { baseApi } from "@/redux/baseApi";

export type AuditActionType =
  | "ESCROW_REVERSAL"
  | "VISIBILITY_OVERRIDE"
  | "CREDIT_ADJUSTMENT"
  | "SYSTEM_THRESHOLD_UPDATE"
  | "ALL";

export type AuditRegistryImpact = "CREDIT" | "VISIBILITY" | "SYSTEM" | "ALL";
export type AuditSeverity = "CRITICAL" | "WARNING" | "INFO" | "ALL";

export type ForensicAuditQueryParams = {
  page?: number;
  limit?: number;
  actionType?: AuditActionType;
  registryImpact?: AuditRegistryImpact;
  severity?: AuditSeverity;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ForensicAuditEntry = {
  entryId: string;
  timestamp: string;
  authority: {
    code: string;
    name: string;
    adminId: string | null;
  };
  actionType: Exclude<AuditActionType, "ALL">;
  affectedEntity: {
    type: "TASK" | "WEBSITE" | "USER" | "SYSTEM";
    id: string;
    label: string;
  };
  registryImpact: Exclude<AuditRegistryImpact, "ALL">;
  severity: Exclude<AuditSeverity, "ALL">;
  traceId: string;
};

export type ForensicAuditResponse = {
  success: boolean;
  message: string;
  data: {
    items: ForensicAuditEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export const forensicAuditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getForensicAuditLogs: builder.query<
      ForensicAuditResponse,
      ForensicAuditQueryParams | void
    >({
      query: (params) => {
        const cleanedParams = Object.fromEntries(
          Object.entries(params || {}).filter(([, value]) => {
            return value !== undefined && value !== null && value !== "" && value !== "ALL";
          }),
        );

        return {
          url: "/admin/forensic-audit-logs",
          params: cleanedParams,
        };
      },
    }),
  }),
});

export const { useGetForensicAuditLogsQuery } = forensicAuditApi;
