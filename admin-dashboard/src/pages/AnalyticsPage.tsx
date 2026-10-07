import React, { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  Download,
  FileText,
  ChevronRight,
  ChevronLeft,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Info,
  Plus,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

import {
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsReportRegistryQuery,
  useGetAnalyticsReportQuery,
  useGetSavedAnalyticsReportsQuery,
  useGetSavedAnalyticsReportQuery,
  useCreateSavedAnalyticsReportMutation,
  useUpdateSavedAnalyticsReportMutation,
  useDeleteSavedAnalyticsReportMutation,
  useRegenerateSavedAnalyticsReportMutation,
  downloadAnalyticsFile,
} from "@/redux/feature/analytics/adminAnalyticsApi";

import type {
  AnalyticsRange,
  AnalyticsParticipant,
  AnalyticsReportType,
  AnalyticsDataSource,
  AnalyticsTrend,
  AnalyticsTrendDirection,
} from "@/redux/feature/analytics/adminAnalyticsTypes";


// The 8 registry report types (FULL_PLATFORM_SUMMARY is NOT in this list)
const REGISTRY_REPORT_TYPES: AnalyticsReportType[] = [
  "WEBSITES_TASKS_SUMMARY",
  "CREDIT_USAGE_SUMMARY",
  "DAILY_PLATFORM_ACTIVITY",
  "FOLLOW_NOFOLLOW_LINKS",
  "USER_RETENTION_GROWTH",
  "TASK_LIFECYCLE_RISK",
  "PROVIDER_PERFORMANCE",
  "GOVERNANCE_RISK",
];

// All report types including FULL_PLATFORM_SUMMARY (for saved-report creation)
const ALL_REPORT_TYPES: AnalyticsReportType[] = [
  ...REGISTRY_REPORT_TYPES,
  "FULL_PLATFORM_SUMMARY",
];

const METRIC_OPTIONS: Array<{ value: AnalyticsReportType | "ALL"; label: string }> = [
  { value: "ALL", label: "All Metrics" },
  { value: "WEBSITES_TASKS_SUMMARY", label: "Websites vs Task Summary" },
  { value: "CREDIT_USAGE_SUMMARY", label: "Credit Usage Summary" },
  { value: "DAILY_PLATFORM_ACTIVITY", label: "Daily Platform Activity" },
  { value: "FOLLOW_NOFOLLOW_LINKS", label: "Follow / No-Follow Links" },
  { value: "USER_RETENTION_GROWTH", label: "User Retention Growth" },
  { value: "TASK_LIFECYCLE_RISK", label: "Task Lifecycle Risk" },
  { value: "PROVIDER_PERFORMANCE", label: "Provider Performance" },
  { value: "GOVERNANCE_RISK", label: "Governance Risk" },
];

const SOURCE_OPTIONS: Array<{ value: AnalyticsDataSource; label: string }> = [
  { value: "ALL", label: "All Sources" },
  { value: "PLATFORM_RECORDS", label: "Platform Records" },
  { value: "TASK_LIFECYCLE", label: "Task Lifecycle" },
  { value: "PAYMENT_AND_CREDIT_SYSTEM", label: "Payment & Credit System" },
  { value: "USER_ACTIVITY", label: "User Activity" },
  { value: "GOVERNANCE", label: "Governance" },
];

const REPORT_TYPE_LABELS: Record<AnalyticsReportType, string> = {
  WEBSITES_TASKS_SUMMARY: "Websites vs Task Summary",
  CREDIT_USAGE_SUMMARY: "Credit Usage Summary",
  DAILY_PLATFORM_ACTIVITY: "Daily Platform Activity",
  FOLLOW_NOFOLLOW_LINKS: "Follow vs No-Follow Links",
  USER_RETENTION_GROWTH: "User Retention Growth",
  TASK_LIFECYCLE_RISK: "Task Lifecycle Risk",
  PROVIDER_PERFORMANCE: "Provider Performance",
  GOVERNANCE_RISK: "Governance Risk",
  FULL_PLATFORM_SUMMARY: "Full Platform Summary",
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  PLATFORM_RECORDS: "Platform Records",
  TASK_LIFECYCLE: "Task Lifecycle",
  PAYMENT_AND_CREDIT_SYSTEM: "Payment & Credit System",
  USER_ACTIVITY: "User Activity",
  GOVERNANCE: "Governance",
  ALL: "All Sources",
};

// ── Small helpers ──────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "–";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso: string): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function trendColor(dir: AnalyticsTrendDirection): string {
  if (dir === "UP") return "#00A63E";
  if (dir === "DOWN") return "#E7000B";
  return "#99A1AF";
}

function TrendBadge({ trend }: { trend: AnalyticsTrend }) {
  const color = trendColor(trend.trendDirection);
  const Icon =
    trend.trendDirection === "UP"
      ? TrendingUp
      : trend.trendDirection === "DOWN"
      ? TrendingDown
      : Minus;
  const label =
    trend.trendDirection === "NEW"
      ? "NEW"
      : trend.trendPercent != null
      ? `${trend.trendDirection === "DOWN" ? "-" : "+"}${trend.trendPercent.toFixed(1)}%`
      : "–";

  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color }}>
      <Icon size={13} />
      {label}
    </span>
  );
}

// ── Reusable UI atoms ──────────────────────────────────────────────────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex-1 min-w-[140px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-[42px] border border-gray-200 rounded-lg px-4 pr-10 text-[13px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white cursor-pointer focus:border-[#155DFC] transition-colors"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronRight
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

function ExportBtn({
  onClick,
  loading,
  icon,
  children,
  variant = "outline",
}: {
  onClick: () => void;
  loading: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "outline" | "solid";
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`h-[42px] px-5 rounded-lg text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === "solid"
          ? "bg-[#000000] text-white hover:opacity-90"
          : "border border-gray-200 text-[#000000] hover:bg-gray-50"
      }`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

function LoadingRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-10 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px] font-medium">Loading…</span>
        </div>
      </td>
    </tr>
  );
}

function EmptyRow({ cols = 6, message = "No data found." }: { cols?: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-10 text-center text-[13px] text-gray-400 font-medium">
        {message}
      </td>
    </tr>
  );
}

// ── Tooltip (native title fallback with custom UI hover) ───────────────────
function InfoTooltip({ text }: { text: string }) {
  return (
    <span title={text} className="cursor-help ml-1 inline-flex items-center">
      <Info size={13} className="text-gray-400" />
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// OVERVIEW CARDS
// ══════════════════════════════════════════════════════════════════════════
function OverviewSection({
  range,
  participant,
}: {
  range: AnalyticsRange;
  participant: AnalyticsParticipant;
}) {
  const { data, isFetching, isError } = useGetAnalyticsOverviewQuery({
    range,
    participant,
  });

  if (isError) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-center min-h-[140px]">
            <div className="flex items-center gap-2 text-red-500 text-[13px] font-medium">
              <AlertCircle size={16} />
              Failed to load
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards = data?.data?.cards;
  const m = cards?.marketplace;
  const ce = cards?.creditEconomy;
  const th = cards?.taskHealthAndRisk;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Card 1: Marketplace */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-bold text-[#000000] uppercase tracking-wider">
              Available Websites vs Active Tasks
            </h3>
            {m?.snapshotNote && <InfoTooltip text={m.snapshotNote} />}
          </div>
          {m && <TrendBadge trend={m.taskCreationTrend} />}
        </div>

        {isFetching ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#99A1AF" }}>
                  Available Websites
                </p>
                <p className="text-[28px] font-bold text-[#000000] leading-none">
                  {fmt(m?.availableWebsites)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#99A1AF" }}>
                  Active Tasks
                </p>
                <p className="text-[28px] font-bold text-[#000000] leading-none">
                  {fmt(m?.activeTasks)}
                </p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: m
                    ? `${Math.round((m.availableWebsites / Math.max(m.availableWebsites + m.activeTasks, 1)) * 100)}%`
                    : "0%",
                  backgroundColor: "#2B7FFF",
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-medium text-gray-400 uppercase">
                Verified this period: {fmt(m?.websitesVerifiedThisPeriod)}
              </span>
              <span className="text-[9px] font-medium text-gray-400 uppercase">
                Tasks created: {fmt(m?.tasksCreatedThisPeriod)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Card 2: Credit Economy — NO dollar signs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-[13px] font-bold text-[#000000] uppercase tracking-wider">
            Credit Economy
          </h3>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#99A1AF" }}>
              Avg Settlement
            </p>
            {isFetching ? (
              <Loader2 size={14} className="animate-spin text-gray-300 ml-auto" />
            ) : (
              <p className="text-[14px] font-bold text-[#000000]">
                {fmt(ce?.averageTaskSettlementDays, 2)} Days
              </p>
            )}
          </div>
        </div>

        {isFetching ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[
                { label: "Credits Spent", value: ce?.creditsSpent, color: "#E7000B" },
                { label: "Credits Earned", value: ce?.creditsEarned, color: "#00A63E" },
                { label: "Credits Refunded", value: ce?.creditsRefunded, color: "#155DFC" },
                { label: "Net Credit Flow", value: ce?.netCreditFlow, color: (ce?.netCreditFlow ?? 0) >= 0 ? "#00A63E" : "#E7000B" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    {item.label}
                  </p>
                  <p className="text-[18px] font-bold leading-tight" style={{ color: item.color }}>
                    {item.value != null && item.value > 0 && item.label === "Net Credit Flow" && "+"}
                    {fmt(item.value)}
                    <span className="text-[10px] font-normal text-gray-400 ml-1">cr</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-400">
                Based on {fmt(ce?.settlementTaskCount)} settled tasks
                <span className="ml-1 text-gray-300">• platform_credits, not currency</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Card 3: Task Health & Risk */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-[#000000] uppercase tracking-wider">
            Task Health & Risk
          </h3>
          {th && <TrendBadge trend={th.completionTrend} />}
        </div>

        {isFetching ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Completion Rate", value: th?.completionRate, suffix: "%" },
              { label: "Approval Rate", value: th?.approvalRate, suffix: "%" },
              { label: "Dispute Rate", value: th?.disputeRate, suffix: "%" },
              { label: "Revision Rate", value: th?.revisionRate, suffix: "%" },
              { label: "Late / Overdue", value: th?.lateOrOverdueTaskCount, suffix: "" },
              { label: "Cancelled", value: th?.cancelledTaskCount, suffix: "" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                  {item.label}
                </p>
                <p className="text-[17px] font-bold text-[#000000] leading-tight">
                  {fmt(item.value, item.suffix === "%" ? 1 : 0)}
                  {item.suffix && <span className="text-[12px]">{item.suffix}</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LIVE REPORT DETAIL MODAL
// ══════════════════════════════════════════════════════════════════════════
function LiveReportModal({
  reportType,
  globalRange,
  globalParticipant,
  onClose,
}: {
  reportType: AnalyticsReportType;
  globalRange: AnalyticsRange;
  globalParticipant: AnalyticsParticipant;
  onClose: () => void;
}) {
  const [dlCsvLoading, setDlCsvLoading] = useState(false);
  const [dlPdfLoading, setDlPdfLoading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  const { data, isFetching, isError } = useGetAnalyticsReportQuery({
    reportType,
    range: globalRange,
    participant: globalParticipant,
  });

  const report = data?.data;

  async function handleExport(format: "csv" | "pdf") {
    setDlError(null);
    const setter = format === "csv" ? setDlCsvLoading : setDlPdfLoading;
    setter(true);
    try {
      const params = new URLSearchParams({ range: globalRange, participant: globalParticipant });
      const url = `/admin/analytics/export/${reportType}/${format}?${params}`;
      const filename = `backlyst-${reportType.toLowerCase().replace(/_/g, "-")}.${format}`;
      await downloadAnalyticsFile(url, filename);
    } catch (err) {
      setDlError(`${format.toUpperCase()} export failed. Please try again.`);
    } finally {
      setter(false);
    }
  }

  // Render summary key-value pairs smartly
  function renderSummaryValue(value: unknown): React.ReactNode {
    if (value === null || value === undefined) return "–";
    if (typeof value === "number") return fmt(value, value % 1 !== 0 ? 2 : 0);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === "object") return "—";
    return String(value);
  }

  function formatSummaryKey(key: string): string {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  const content = (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-[17px] font-bold text-[#000000] uppercase tracking-wide">
                {report?.metadata.reportName ?? REPORT_TYPE_LABELS[reportType]}
              </h2>
              {report && (
                <p className="text-[11px] font-medium text-gray-400 mt-0.5 uppercase tracking-wider">
                  {report.metadata.range} · {fmtDate(report.metadata.from)} – {fmtDate(report.metadata.to)}
                  &nbsp;·&nbsp; {fmt(report.metadata.totalRecords)} records
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <ExportBtn
                onClick={() => handleExport("csv")}
                loading={dlCsvLoading}
                icon={<Download size={13} />}
                variant="outline"
              >
                CSV
              </ExportBtn>
              <ExportBtn
                onClick={() => handleExport("pdf")}
                loading={dlPdfLoading}
                icon={<FileText size={13} />}
                variant="solid"
              >
                PDF
              </ExportBtn>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-7 py-6 space-y-6 flex-1">
            {dlError && (
              <div className="flex items-center gap-2 text-red-600 text-[12px] font-medium bg-red-50 rounded-lg px-4 py-3">
                <AlertCircle size={14} />
                {dlError}
              </div>
            )}

            {isFetching && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-gray-300" />
              </div>
            )}

            {isError && (
              <div className="flex items-center justify-center py-10 gap-2 text-red-500 text-[13px] font-medium">
                <AlertCircle size={16} /> Failed to load report data.
              </div>
            )}

            {!isFetching && !isError && report && (
              <>
                {/* Summary metrics */}
                {report.summary && Object.keys(report.summary).length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(report.summary)
                        .filter(([, v]) => typeof v !== "object" || v === null)
                        .map(([key, value]) => (
                          <div key={key} className="bg-[#F9FAFB] rounded-lg p-3">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                              {formatSummaryKey(key)}
                            </p>
                            <p className="text-[15px] font-bold text-[#000000]">
                              {renderSummaryValue(value)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Data breakdowns */}
                {report.data && Object.keys(report.data).length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Breakdown
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(report.data)
                        .filter(([, v]) => Array.isArray(v) && (v as unknown[]).length > 0)
                        .map(([key, rawArr]) => {
                          const arr = rawArr as Array<Record<string, unknown>>;
                          const cols = Object.keys(arr[0] ?? {}).filter(
                            (k) => k !== "_count" && k !== "_sum"
                          );
                          // Extract count/sum from nested objects
                          const rows = arr.map((row) => {
                            const out: Record<string, unknown> = {};
                            cols.forEach((c) => (out[c] = row[c]));
                            if (row._count) out["Count"] = (row._count as Record<string, unknown>)._all;
                            if (row._sum) {
                              Object.entries(row._sum as Record<string, unknown>).forEach(
                                ([sk, sv]) => (out[`Total ${sk}`] = sv)
                              );
                            }
                            return out;
                          });
                          const allCols = Object.keys(rows[0] ?? {});

                          return (
                            <div key={key}>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                {formatSummaryKey(key)}
                              </p>
                              <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                                <table className="w-full text-left min-w-[300px]">
                                  <thead>
                                    <tr className="bg-[#F9FAFB] border-b border-gray-100">
                                      {allCols.map((c) => (
                                        <th
                                          key={c}
                                          className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                        >
                                          {formatSummaryKey(c)}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {rows.map((row, i) => (
                                      <tr key={i}>
                                        {allCols.map((c) => (
                                          <td key={c} className="px-4 py-2.5">
                                            <span className="text-[13px] font-semibold text-[#000000]">
                                              {renderSummaryValue(row[c])}
                                            </span>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="px-7 py-3 border-t border-gray-100 bg-[#F9FAFB] flex-shrink-0">
            <p className="text-[10px] font-medium text-gray-400 text-center uppercase tracking-wider">
              All Reports Are Read-Only · Generated from Live Analytics Data
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}

// ══════════════════════════════════════════════════════════════════════════
// SAVED REPORT DETAIL MODAL (shows snapshot, exportable)
// ══════════════════════════════════════════════════════════════════════════
function SavedReportDetailModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [dlCsvLoading, setDlCsvLoading] = useState(false);
  const [dlPdfLoading, setDlPdfLoading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  const { data, isFetching, isError } = useGetSavedAnalyticsReportQuery(id);
  const rpt = data?.data;

  async function handleExport(format: "csv" | "pdf") {
    setDlError(null);
    const setter = format === "csv" ? setDlCsvLoading : setDlPdfLoading;
    setter(true);
    try {
      const url = `/admin/analytics/saved-reports/${id}/export/${format}`;
      const filename = `${rpt?.reportCode ?? "saved-report"}.${format}`;
      await downloadAnalyticsFile(url, filename);
    } catch {
      setDlError(`${format.toUpperCase()} export failed. Please try again.`);
    } finally {
      setter(false);
    }
  }

  const content = (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-[#155DFC] bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">
                  {rpt?.reportCode ?? "…"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${rpt?.status === "READY" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {rpt?.status ?? "…"}
                </span>
              </div>
              <h2 className="text-[17px] font-bold text-[#000000] uppercase tracking-wide">
                {rpt?.name ?? "Saved Report"}
              </h2>
              {rpt && (
                <p className="text-[11px] font-medium text-gray-400 mt-0.5 uppercase tracking-wider">
                  {REPORT_TYPE_LABELS[rpt.reportType]} · {fmtDate(rpt.dateFrom)} – {fmtDate(rpt.dateTo)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <ExportBtn onClick={() => handleExport("csv")} loading={dlCsvLoading} icon={<Download size={13} />} variant="outline">
                CSV
              </ExportBtn>
              <ExportBtn onClick={() => handleExport("pdf")} loading={dlPdfLoading} icon={<FileText size={13} />} variant="solid">
                PDF
              </ExportBtn>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-7 py-6 space-y-4 flex-1">
            {dlError && (
              <div className="flex items-center gap-2 text-red-600 text-[12px] font-medium bg-red-50 rounded-lg px-4 py-3">
                <AlertCircle size={14} />{dlError}
              </div>
            )}
            {isFetching && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-gray-300" />
              </div>
            )}
            {isError && (
              <div className="flex items-center justify-center py-10 gap-2 text-red-500 text-[13px]">
                <AlertCircle size={16} /> Failed to load saved report.
              </div>
            )}
            {!isFetching && !isError && rpt && (
              <>
                {/* Metadata grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Generated At", value: fmtDate(rpt.generatedAt) },
                    { label: "Generated By", value: rpt.generatedBy?.name ?? "–" },
                    { label: "Participant", value: rpt.participant },
                    { label: "Total Records", value: fmt(rpt.totalRecords) },
                    { label: "Snapshot Version", value: fmt(rpt.snapshotVersion) },
                    { label: "Period", value: rpt.period },
                  ].map((item) => (
                    <div key={item.label} className="bg-[#F9FAFB] rounded-lg p-3">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-[13px] font-bold text-[#000000]">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {rpt.description && (
                  <div className="bg-[#F9FAFB] rounded-lg p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Description
                    </p>
                    <p className="text-[13px] text-gray-600">{rpt.description}</p>
                  </div>
                )}

                {/* Snapshot note */}
                <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                  <Info size={14} className="text-[#155DFC] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-medium text-[#155DFC]">
                    This is an immutable snapshot. The data was captured at the time of generation and will not change.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}

// ══════════════════════════════════════════════════════════════════════════
// CREATE SAVED REPORT MODAL
// ══════════════════════════════════════════════════════════════════════════
function CreateSavedReportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState<AnalyticsReportType>("FULL_PLATFORM_SUMMARY");
  const [range, setRange] = useState<AnalyticsRange>("MONTHLY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [participant, setParticipant] = useState<AnalyticsParticipant>("ALL");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [createReport, { isLoading, error }] = useCreateSavedAnalyticsReportMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Name is required.");
      return;
    }
    if (range === "CUSTOM" && (!from || !to)) {
      setValidationError("Both From and To dates are required for CUSTOM range.");
      return;
    }

    try {
      await createReport({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        reportType,
        range,
        ...(range === "CUSTOM" ? { from, to } : {}),
        participant,
      }).unwrap();
      onSuccess();
      onClose();
    } catch {
      // error handled via RTK error display below
    }
  }

  const content = (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-gray-100">
            <h2 className="text-[16px] font-bold text-[#000000] uppercase tracking-wide">
              Save Analytics Report
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
            {(validationError || error) && (
              <div className="flex items-center gap-2 text-red-600 text-[12px] font-medium bg-red-50 rounded-lg px-4 py-3">
                <AlertCircle size={14} />
                {validationError ?? "Failed to create report. Please try again."}
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. June Full Platform Summary"
                className="w-full h-[42px] border border-gray-200 rounded-lg px-4 text-[13px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal note…"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[13px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Report Type
                </label>
                <div className="relative">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as AnalyticsReportType)}
                    className="w-full h-[42px] border border-gray-200 rounded-lg px-4 pr-10 text-[12px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white focus:border-[#155DFC] transition-colors"
                  >
                    {ALL_REPORT_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {REPORT_TYPE_LABELS[rt]}
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Participant
                </label>
                <div className="relative">
                  <select
                    value={participant}
                    onChange={(e) => setParticipant(e.target.value as AnalyticsParticipant)}
                    className="w-full h-[42px] border border-gray-200 rounded-lg px-4 pr-10 text-[12px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white focus:border-[#155DFC] transition-colors"
                  >
                    {["ALL", "REQUESTER", "PROVIDER"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Range
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"] as AnalyticsRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className="h-[34px] px-3 text-[11px] font-bold uppercase tracking-wider border rounded-lg transition-colors"
                    style={{
                      backgroundColor: range === r ? "#000000" : "#FFFFFF",
                      color: range === r ? "#FFFFFF" : "#000000",
                      borderColor: range === r ? "#000000" : "#E5E7EB",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {range === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={from}
                    onChange={(e) => setFrom(e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="w-full h-[42px] border border-gray-200 rounded-lg px-4 text-[12px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={to}
                    onChange={(e) => setTo(e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="w-full h-[42px] border border-gray-200 rounded-lg px-4 text-[12px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-[42px] px-5 border border-gray-200 rounded-lg text-[12px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="h-[42px] px-6 bg-[#000000] text-white rounded-lg text-[12px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {isLoading ? "Saving…" : "Save Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}

// ══════════════════════════════════════════════════════════════════════════
// EDIT SAVED REPORT MODAL
// ══════════════════════════════════════════════════════════════════════════
function EditSavedReportModal({
  id,
  initialName,
  initialDescription,
  onClose,
}: {
  id: string;
  initialName: string;
  initialDescription: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [updateReport, { isLoading, error }] = useUpdateSavedAnalyticsReportMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await updateReport({ id, name: name.trim(), description: description.trim() }).unwrap();
    onClose();
  }

  const content = (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-gray-100">
            <h2 className="text-[16px] font-bold text-[#000000] uppercase tracking-wide">
              Edit Report
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-[12px] font-medium bg-red-50 rounded-lg px-4 py-3">
                <AlertCircle size={14} /> Failed to update. Please try again.
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[42px] border border-gray-200 rounded-lg px-4 text-[13px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[13px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors resize-none"
              />
            </div>
            <p className="text-[10px] text-gray-400 italic">
              Only name and description can be changed. Report data (snapshot, filters, dates) cannot be modified.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="h-[42px] px-5 border border-gray-200 rounded-lg text-[12px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={isLoading || !name.trim()} className="h-[42px] px-6 bg-[#000000] text-white rounded-lg text-[12px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={13} />}
                {isLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}

// ══════════════════════════════════════════════════════════════════════════
// REPORT REGISTRY TABLE
// ══════════════════════════════════════════════════════════════════════════
function ReportRegistrySection({
  range,
  participant,
  onViewReport,
}: {
  range: AnalyticsRange;
  participant: AnalyticsParticipant;
  onViewReport: (reportType: AnalyticsReportType) => void;
}) {
  const [metric, setMetric] = useState<AnalyticsReportType | "ALL">("ALL");
  const [source, setSource] = useState<AnalyticsDataSource>("ALL");
  const [exportingCsv, setExportingCsv] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);

  const { data, isFetching, isError } = useGetAnalyticsReportRegistryQuery({
    range,
    participant,
    metric,
    source,
  });

  const rows = data?.data?.data ?? [];

  async function handleExportRow(reportType: string, format: "csv" | "pdf") {
    const setter = format === "csv" ? setExportingCsv : setExportingPdf;
    setter(reportType);
    try {
      const params = new URLSearchParams({ range, participant });
      const url = `/admin/analytics/export/${reportType}/${format}?${params}`;
      const filename = `backlyst-${reportType.toLowerCase().replace(/_/g, "-")}.${format}`;
      await downloadAnalyticsFile(url, filename);
    } catch {
      // silent fail — user will notice
    } finally {
      setter(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#000000]" />
            <h2 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">
              Report Registry
            </h2>
          </div>
          <p className="text-[12px] font-medium text-gray-400 mt-0.5 ml-4">
            Live analytics reports with current record counts
          </p>
        </div>
      </div>

      {/* Sub-filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <FilterSelect
          label="Metric Selector"
          value={metric}
          onChange={(v) => setMetric(v as AnalyticsReportType | "ALL")}
          options={METRIC_OPTIONS}
        />
        <FilterSelect
          label="Data Source Filter"
          value={source}
          onChange={(v) => setSource(v as AnalyticsDataSource)}
          options={SOURCE_OPTIONS}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Report Name</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Frequency</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data Source</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date Range</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Total Records</th>
              <th className="pb-3 pl-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isFetching ? (
              <LoadingRow cols={6} />
            ) : isError ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[13px] text-red-500 font-medium">
                  <AlertCircle size={16} className="inline mr-2" />
                  Failed to load report registry.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <EmptyRow cols={6} message="No reports match the selected filters." />
            ) : (
              rows.map((row) => (
                <tr key={row.reportType} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 pr-3">
                    <span className="text-[13px] font-bold text-[#000000]">{row.name}</span>
                    {row.latestSavedReport && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Latest: {fmtDate(row.latestSavedReport.generatedAt)}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[12px] font-medium text-gray-500 uppercase">{row.frequency}</span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[12px] font-bold uppercase" style={{ color: "#155DFC" }}>
                      {DATA_SOURCE_LABELS[row.dataSource] ?? row.dataSource}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[12px] font-medium text-gray-500">
                      {fmtDate(row.dateRange.from)} – {fmtDate(row.dateRange.to)}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <span className="text-[16px] font-bold text-[#000000]">
                      {row.totalRecords.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onViewReport(row.reportType)}
                        className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border transition-colors hover:bg-blue-50"
                        style={{ color: "#155DFC", borderColor: "#2B7FFF" }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleExportRow(row.reportType, "csv")}
                        disabled={exportingCsv === row.reportType}
                        className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {exportingCsv === row.reportType ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                      </button>
                      <button
                        onClick={() => handleExportRow(row.reportType, "pdf")}
                        disabled={exportingPdf === row.reportType}
                        className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {exportingPdf === row.reportType ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <FileText size={12} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SAVED REPORTS SECTION
// ══════════════════════════════════════════════════════════════════════════
function SavedReportsSection() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState<AnalyticsReportType | "">("");
  const [statusFilter, setStatusFilter] = useState<"READY" | "FAILED" | "">("");
  const [sortBy, setSortBy] = useState<"generatedAt" | "name" | "reportType" | "status">("generatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);

  const [deleteReport] = useDeleteSavedAnalyticsReportMutation();
  const [regenerateReport] = useRegenerateSavedAnalyticsReportMutation();

  // Debounce search
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    const t = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const { data, isFetching, isError } = useGetSavedAnalyticsReportsQuery({
    page,
    limit: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(reportTypeFilter ? { reportType: reportTypeFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    sortBy,
    sortOrder,
  });

  const rows = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this saved report? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteReport(id).unwrap();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRegenerate(id: string) {
    if (!window.confirm("Regenerate this report? A new report will be created using the original filters. The existing report will remain unchanged.")) return;
    setRegeneratingId(id);
    try {
      await regenerateReport(id).unwrap();
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleExport(id: string, reportCode: string, format: "csv" | "pdf") {
    const setter = format === "csv" ? setExportingCsv : setExportingPdf;
    setter(id);
    try {
      const url = `/admin/analytics/saved-reports/${id}/export/${format}`;
      await downloadAnalyticsFile(url, `${reportCode}.${format}`);
    } catch {
      // silent
    } finally {
      setter(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#000000]" />
            <h2 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">Saved Reports</h2>
          </div>
          <p className="text-[12px] font-medium text-gray-400 mt-0.5 ml-4">
            Immutable snapshots — data does not recalculate after saving
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-[38px] px-4 bg-[#000000] text-white rounded-lg text-[12px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={14} /> Save Report
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name or report code…"
            className="w-full h-[38px] border border-gray-200 rounded-lg pl-9 pr-4 text-[12px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors"
          />
        </div>
        {/* Report type filter */}
        <div className="relative min-w-[180px]">
          <select
            value={reportTypeFilter}
            onChange={(e) => { setReportTypeFilter(e.target.value as AnalyticsReportType | ""); setPage(1); }}
            className="w-full h-[38px] border border-gray-200 rounded-lg px-3 pr-9 text-[11px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white focus:border-[#155DFC] transition-colors"
          >
            <option value="">All Types</option>
            {ALL_REPORT_TYPES.map((rt) => (
              <option key={rt} value={rt}>{REPORT_TYPE_LABELS[rt]}</option>
            ))}
          </select>
          <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {/* Status filter */}
        <div className="relative min-w-[120px]">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as "READY" | "FAILED" | ""); setPage(1); }}
            className="w-full h-[38px] border border-gray-200 rounded-lg px-3 pr-9 text-[11px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white focus:border-[#155DFC] transition-colors"
          >
            <option value="">All Status</option>
            <option value="READY">Ready</option>
            <option value="FAILED">Failed</option>
          </select>
          <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {/* Sort */}
        <div className="relative min-w-[140px]">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split("-") as [typeof sortBy, typeof sortOrder];
              setSortBy(sb); setSortOrder(so); setPage(1);
            }}
            className="w-full h-[38px] border border-gray-200 rounded-lg px-3 pr-9 text-[11px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white focus:border-[#155DFC] transition-colors"
          >
            <option value="generatedAt-desc">Newest First</option>
            <option value="generatedAt-asc">Oldest First</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="reportType-asc">Type A–Z</option>
            <option value="status-asc">Status</option>
          </select>
          <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Report Code</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Period</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Records</th>
              <th className="pb-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="pb-3 pl-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isFetching ? (
              <LoadingRow cols={7} />
            ) : isError ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[13px] text-red-500 font-medium">
                  <AlertCircle size={16} className="inline mr-2" />Failed to load saved reports.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <EmptyRow cols={7} message="No saved reports found. Create one to get started." />
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 pr-3">
                    <span className="text-[11px] font-bold text-[#155DFC] font-mono bg-blue-50 px-2 py-1 rounded">
                      {row.reportCode}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[13px] font-bold text-[#000000]">{row.name}</span>
                    {row.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] truncate">{row.description}</p>
                    )}
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[11px] font-medium text-gray-600 uppercase">
                      {REPORT_TYPE_LABELS[row.reportType]}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[12px] font-medium text-gray-500">{row.period}</span>
                    <p className="text-[10px] text-gray-400">
                      {fmtDate(row.dateFrom)} – {fmtDate(row.dateTo)}
                    </p>
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[14px] font-bold text-[#000000]">
                      {row.totalRecords.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    {row.status === "READY" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded uppercase">
                        <CheckCircle size={11} /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded uppercase">
                        <XCircle size={11} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="py-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View detail */}
                      <button
                        onClick={() => setViewDetailId(row.id)}
                        title="View snapshot"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-blue-50 text-gray-500 hover:text-[#155DFC] transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => setEditItem({ id: row.id, name: row.name, description: row.description })}
                        title="Edit name/description"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      {/* Regenerate */}
                      <button
                        onClick={() => handleRegenerate(row.id)}
                        disabled={regeneratingId === row.id}
                        title="Regenerate from original filters"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50"
                      >
                        {regeneratingId === row.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={13} />
                        )}
                      </button>
                      {/* Export CSV */}
                      <button
                        onClick={() => handleExport(row.id, row.reportCode, "csv")}
                        disabled={exportingCsv === row.id}
                        title="Download CSV"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50"
                      >
                        {exportingCsv === row.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                      </button>
                      {/* Export PDF */}
                      <button
                        onClick={() => handleExport(row.id, row.reportCode, "pdf")}
                        disabled={exportingPdf === row.id}
                        title="Download PDF"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50"
                      >
                        {exportingPdf === row.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <FileText size={13} />
                        )}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        title="Delete saved report"
                        className="p-1.5 rounded-md border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {deletingId === row.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-[12px] font-medium text-gray-400">
            {meta.totalItems.toLocaleString()} total · Page {meta.currentPage} of {meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!meta.hasPrevPage}
              className="h-[34px] w-[34px] flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
              className="h-[34px] w-[34px] flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {viewDetailId && (
        <SavedReportDetailModal id={viewDetailId} onClose={() => setViewDetailId(null)} />
      )}
      {editItem && (
        <EditSavedReportModal
          id={editItem.id}
          initialName={editItem.name}
          initialDescription={editItem.description}
          onClose={() => setEditItem(null)}
        />
      )}
      {showCreate && (
        <CreateSavedReportModal onClose={() => setShowCreate(false)} onSuccess={() => {}} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN ANALYTICS PAGE
// ══════════════════════════════════════════════════════════════════════════
const AnalyticsPage: React.FC = () => {
  // Global filter state
  const [range, setRange] = useState<AnalyticsRange>("MONTHLY");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [participant, setParticipant] = useState<AnalyticsParticipant>("ALL");

  // Live report detail modal
  const [liveReportType, setLiveReportType] = useState<AnalyticsReportType | null>(null);

  // Export all state
  const [exportAllCsvLoading, setExportAllCsvLoading] = useState(false);
  const [exportAllPdfLoading, setExportAllPdfLoading] = useState(false);
  const [exportAllError, setExportAllError] = useState<string | null>(null);

  // Build the effective range params (only send from/to for CUSTOM)
  const effectiveRange = range;
  const effectiveFrom = range === "CUSTOM" ? customFrom : undefined;
  const effectiveTo = range === "CUSTOM" ? customTo : undefined;

  const customValid = range !== "CUSTOM" || (!!customFrom && !!customTo);

  async function handleExportAll(format: "csv" | "pdf") {
    if (!customValid) return;
    setExportAllError(null);
    const setter = format === "csv" ? setExportAllCsvLoading : setExportAllPdfLoading;
    setter(true);
    try {
      const params = new URLSearchParams({ range: effectiveRange, participant });
      if (effectiveFrom) params.set("from", effectiveFrom);
      if (effectiveTo) params.set("to", effectiveTo);
      const url = `/admin/analytics/export/all/${format}?${params}`;
      const ts = new Date().toISOString().slice(0, 10);
      await downloadAnalyticsFile(url, `backlyst-all-analytics-${ts}.${format}`);
    } catch {
      setExportAllError(`Export all ${format.toUpperCase()} failed. The server may not support this format yet.`);
    } finally {
      setter(false);
    }
  }

  return (
    <div className="w-full font-arimo space-y-6">
      {/* ── Page Title ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
          Analytics Registry
        </h1>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
          Read-Only Performance Intelligence and Marketplace Health Monitoring.
        </p>
      </div>

      {/* ── Global Filters + Export All ─────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row items-start xl:items-end gap-4">
        <div className="flex flex-wrap gap-4 flex-1">
          {/* Range */}
          <FilterSelect
            label="Date Range"
            value={range}
            onChange={(v) => setRange(v as AnalyticsRange)}
            options={[
              { value: "DAILY", label: "Daily" },
              { value: "WEEKLY", label: "Weekly" },
              { value: "MONTHLY", label: "Monthly" },
              { value: "YEARLY", label: "Yearly" },
              { value: "CUSTOM", label: "Custom Range" },
            ]}
          />

          {/* Custom date pickers — only shown when CUSTOM */}
          {range === "CUSTOM" && (
            <>
              <div className="flex-1 min-w-[160px]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">From</p>
                <input
                  type="date"
                  value={customFrom ? customFrom.slice(0, 10) : ""}
                  onChange={(e) =>
                    setCustomFrom(e.target.value ? `${e.target.value}T00:00:00.000Z` : "")
                  }
                  className="w-full h-[42px] border border-gray-200 rounded-lg px-4 text-[13px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">To</p>
                <input
                  type="date"
                  value={customTo ? customTo.slice(0, 10) : ""}
                  onChange={(e) =>
                    setCustomTo(e.target.value ? `${e.target.value}T23:59:59.999Z` : "")
                  }
                  className="w-full h-[42px] border border-gray-200 rounded-lg px-4 text-[13px] font-medium text-[#000000] focus:border-[#155DFC] transition-colors"
                />
              </div>
            </>
          )}

          {/* Participant */}
          <FilterSelect
            label="User Type Filter"
            value={participant}
            onChange={(v) => setParticipant(v as AnalyticsParticipant)}
            options={[
              { value: "ALL", label: "All Participants" },
              { value: "REQUESTER", label: "Requester" },
              { value: "PROVIDER", label: "Provider" },
            ]}
          />
        </div>

        {/* Export All buttons */}
        <div className="flex gap-3 flex-shrink-0">
          <ExportBtn
            onClick={() => handleExportAll("csv")}
            loading={exportAllCsvLoading}
            icon={<Download size={14} />}
            variant="outline"
          >
            Export CSV
          </ExportBtn>
          <ExportBtn
            onClick={() => handleExportAll("pdf")}
            loading={exportAllPdfLoading}
            icon={<FileText size={14} />}
            variant="solid"
          >
            Export PDF
          </ExportBtn>
        </div>
      </div>

      {/* Custom date validation warning */}
      {range === "CUSTOM" && !customValid && (
        <div className="flex items-center gap-2 text-amber-600 text-[12px] font-medium bg-amber-50 rounded-lg px-4 py-3">
          <AlertCircle size={14} />
          Please select both From and To dates to use a custom range.
        </div>
      )}

      {/* Export All error */}
      {exportAllError && (
        <div className="flex items-center gap-2 text-red-600 text-[12px] font-medium bg-red-50 rounded-lg px-4 py-3">
          <AlertCircle size={14} /> {exportAllError}
        </div>
      )}

      {/* ── Overview Cards ───────────────────────────────────────────────── */}
      {customValid && (
        <OverviewSection
          range={effectiveRange}
          participant={participant}
        />
      )}

      {/* ── Report Registry Table ────────────────────────────────────────── */}
      {customValid && (
        <ReportRegistrySection
          range={effectiveRange}
          participant={participant}
          onViewReport={(rt) => setLiveReportType(rt)}
        />
      )}

      {/* ── Saved Reports ────────────────────────────────────────────────── */}
      <SavedReportsSection />

      {/* ── Footer legal copy ────────────────────────────────────────────── */}
      <div className="text-center space-y-2 pb-2">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          This Report Shows Summarized, Read-Only Analytics Data for Reporting Purposes.
        </p>
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider leading-relaxed">
          All Analytics Are Aggregated, Anonymized, and Read-Only. Reports are Generated for Monitoring and Reporting
          Purposes Only and Do Not Initiate Enforcement Actions.
        </p>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          Unrestricted Reporting Mode •
        </p>
      </div>

      {/* ── Live Report Detail Modal ─────────────────────────────────────── */}
      {liveReportType && (
        <LiveReportModal
          reportType={liveReportType}
          globalRange={effectiveRange}
          globalParticipant={participant}
          onClose={() => setLiveReportType(null)}
        />
      )}
    </div>
  );
};

export default AnalyticsPage;
