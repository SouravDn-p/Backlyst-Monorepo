import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Download, Loader2, Search, Star, X } from "lucide-react";
import {
  type AuditActionType,
  type AuditRegistryImpact,
  type AuditSeverity,
  type ForensicAuditEntry,
  useGetForensicAuditLogsQuery,
} from "@/redux/feature/audit/forensicAuditApi";

type SelectOption<T extends string> = { value: T; label: string };

const ACTION_OPTIONS: SelectOption<AuditActionType>[] = [
  { value: "ALL", label: "All Actions" },
  { value: "ESCROW_REVERSAL", label: "Escrow Reversal" },
  { value: "VISIBILITY_OVERRIDE", label: "Visibility Override" },
  { value: "CREDIT_ADJUSTMENT", label: "Credit Adjustment" },
  { value: "SYSTEM_THRESHOLD_UPDATE", label: "System Threshold Update" },
];

const IMPACT_OPTIONS: SelectOption<AuditRegistryImpact>[] = [
  { value: "ALL", label: "All Impacts" },
  { value: "CREDIT", label: "Credit" },
  { value: "VISIBILITY", label: "Visibility" },
  { value: "SYSTEM", label: "System" },
];

const SEVERITY_OPTIONS: SelectOption<AuditSeverity>[] = [
  { value: "ALL", label: "All Severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "WARNING", label: "Warning" },
  { value: "INFO", label: "Info" },
];

const formatDateTime = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatEntryId = (entryId: string) => entryId.replace(/-/g, "-\n");
const formatLabel = (value: string) => value.replace(/_/g, " ");

const ImpactBadge = ({ type }: { type: ForensicAuditEntry["registryImpact"] }) => {
  const styles: Record<string, { bg: string; text: string }> = {
    CREDIT: { bg: "#F0FDF4", text: "#008236" },
    VISIBILITY: { bg: "#EFF6FF", text: "#1447E6" },
    SYSTEM: { bg: "#101828", text: "#FFFFFF" },
  };
  const s = styles[type] ?? styles.SYSTEM;
  return (
    <span
      className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {type}
    </span>
  );
};

const SeverityBadge = ({ level }: { level: ForensicAuditEntry["severity"] }) => {
  const colors: Record<string, string> = {
    CRITICAL: "#E7000B",
    WARNING: "#F54900",
    INFO: "#155DFC",
  };
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-[6px] h-[6px] rounded-full"
        style={{ backgroundColor: colors[level] ?? "#155DFC" }}
      />
      <span
        className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider"
        style={{ color: colors[level] ?? "#155DFC" }}
      >
        {level}
      </span>
    </span>
  );
};

const FilterSelect = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value as T)}
    className="h-[38px] rounded-lg border border-[#E5E7EB] bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[#414651] outline-none focus:border-[#155DFC]"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const downloadCsv = (entries: ForensicAuditEntry[]) => {
  const header = [
    "Entry ID",
    "Timestamp",
    "Authority Code",
    "Authority Name",
    "Admin ID",
    "Action Type",
    "Affected Type",
    "Affected ID",
    "Affected Label",
    "Registry Impact",
    "Severity",
    "Trace ID",
  ];
  const rows = entries.map((entry) => [
    entry.entryId,
    entry.timestamp,
    entry.authority.code,
    entry.authority.name,
    entry.authority.adminId ?? "",
    entry.actionType,
    entry.affectedEntity.type,
    entry.affectedEntity.id,
    entry.affectedEntity.label,
    entry.registryImpact,
    entry.severity,
    entry.traceId,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "forensic-audit-ledger.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const AuditLogsPage: React.FC = () => {
  const [selectedEntry, setSelectedEntry] = useState<ForensicAuditEntry | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState<AuditActionType>("ALL");
  const [registryImpact, setRegistryImpact] = useState<AuditRegistryImpact>("ALL");
  const [severity, setSeverity] = useState<AuditSeverity>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      actionType,
      registryImpact,
      severity,
      dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
    }),
    [actionType, dateFrom, dateTo, page, registryImpact, search, severity],
  );

  const { data, isFetching, isLoading, isError, refetch } = useGetForensicAuditLogsQuery(queryParams);
  const entries = data?.data.items ?? [];
  const pagination = data?.data.pagination;

  const resetToFirstPage = () => setPage(1);
  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const updateActionType = (value: AuditActionType) => {
    setActionType(value);
    resetToFirstPage();
  };
  const updateRegistryImpact = (value: AuditRegistryImpact) => {
    setRegistryImpact(value);
    resetToFirstPage();
  };
  const updateSeverity = (value: AuditSeverity) => {
    setSeverity(value);
    resetToFirstPage();
  };

  return (
    <div className="w-full font-arimo space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-bold text-[#000] uppercase tracking-tight leading-tight">
              Forensic Audit Ledger
            </h1>
            <span className="px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: "#000000" }}>
              Immutable
            </span>
            <span className="px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#000]" style={{ backgroundColor: "#E5E7EB" }}>
              Append-Only
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-[#717680] font-medium mt-1.5 uppercase tracking-[0.04em] leading-relaxed max-w-2xl">
            Authoritative registry for administrative events normalized from credit adjustments, marketplace overrides, task flow events, and reward audit logs.
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: isError ? "#E7000B" : "#00A63E" }} />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: isError ? "#E7000B" : "#00A63E" }}>
              {isError ? "Ledger Unavailable" : "Node-Verified / Live"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => downloadCsv(entries)}
            disabled={!entries.length}
            className="h-[36px] sm:h-[38px] px-4 sm:px-5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#101828", color: "#FFFFFF" }}
          >
            <Download size={14} />
            Export Current Page
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717680]" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Search entry, authority, entity, or action"
              className="h-[38px] w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-[12px] font-bold text-[#000] outline-none focus:border-[#155DFC]"
            />
          </div>
          <FilterSelect value={actionType} options={ACTION_OPTIONS} onChange={updateActionType} />
          <FilterSelect value={registryImpact} options={IMPACT_OPTIONS} onChange={updateRegistryImpact} />
          <FilterSelect value={severity} options={SEVERITY_OPTIONS} onChange={updateSeverity} />
        </div>
        <div className="flex flex-col md:flex-row gap-2.5 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                resetToFirstPage();
              }}
              className="h-[38px] rounded-lg border border-[#E5E7EB] bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#414651] outline-none focus:border-[#155DFC]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                resetToFirstPage();
              }}
              className="h-[38px] rounded-lg border border-[#E5E7EB] bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#414651] outline-none focus:border-[#155DFC]"
            />
            <button
              type="button"
              onClick={applySearch}
              className="h-[38px] rounded-lg bg-[#101828] px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#1D2939]"
            >
              Apply Search
            </button>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-[38px] rounded-lg border border-[#E5E7EB] px-4 text-[10px] font-bold uppercase tracking-wider text-[#414651] hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetching ? "Refreshing" : "Refresh Ledger"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                {["Entry\nID", "Timestamp\n(UTC)", "Authority\n/ Node", "Action Type", "Affected\nEntity", "Registry\nImpact", "Severity", "Register\nTrace"].map((h, i) => (
                  <th key={i} className="px-3 sm:px-4 py-3 sm:py-4 text-left text-[9px] font-bold text-[#717680] uppercase tracking-wider whitespace-pre-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px] font-bold uppercase tracking-wider text-[#717680]">
                    <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading forensic ledger</span>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px] font-bold uppercase tracking-wider text-red-600">
                    Failed to load forensic audit ledger.
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[12px] font-bold uppercase tracking-wider text-[#717680]">
                    No forensic audit entries found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.traceId} className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#717680] whitespace-pre-line leading-tight">
                        {formatEntryId(entry.entryId)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#000] leading-tight">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <div>
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: "#155DFC" }}>
                          {entry.authority.code}
                        </span>
                        <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5 leading-tight" style={{ color: "#51A2FF" }}>
                          {entry.authority.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#000] uppercase tracking-wide">
                        {formatLabel(entry.actionType)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#000] uppercase block">
                        {entry.affectedEntity.label}
                      </span>
                      <span className="text-[9px] font-bold text-[#717680] uppercase tracking-wide">
                        {entry.affectedEntity.type}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <ImpactBadge type={entry.registryImpact} />
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <SeverityBadge level={entry.severity} />
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                        className="h-[30px] px-3 sm:px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors hover:opacity-80"
                        style={{ backgroundColor: "#EFF6FF", border: "1px solid #BEDBFF", color: "#155DFC" }}
                      >
                        <Star size={11} fill="#155DFC" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#E5E7EB] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#717680]">
            Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1} - {pagination?.total ?? 0} total ledger entries
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={isFetching || (pagination?.page ?? page) <= 1}
              className="h-[32px] rounded-lg border border-[#E5E7EB] px-3 text-[10px] font-bold uppercase tracking-wider text-[#414651] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination?.totalPages ?? current, current + 1))}
              disabled={isFetching || (pagination?.page ?? page) >= (pagination?.totalPages ?? 1)}
              className="h-[32px] rounded-lg border border-[#E5E7EB] px-3 text-[10px] font-bold uppercase tracking-wider text-[#414651] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedEntry &&
        ReactDOM.createPortal(
          <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setSelectedEntry(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-3">
                    <div className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-xl bg-[#101828] flex items-center justify-center">
                      <span className="text-white text-[14px] sm:text-[16px] font-bold">L</span>
                    </div>
                    <div>
                      <h2 className="text-[13px] sm:text-[14px] font-bold text-[#000] uppercase tracking-wide">Audit</h2>
                      <p className="text-[9px] sm:text-[10px] text-[#717680] uppercase tracking-wide">Backend Forensic Ledger Entry</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedEntry(null)} className="p-1.5 text-[#717680] hover:text-[#000] transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-4 sm:p-5 space-y-5">
                  <div className="rounded-xl p-4 sm:p-5 space-y-4" style={{ background: "linear-gradient(135deg, #101828 0%, #1E2939 100%)" }}>
                    <h3 className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider" style={{ color: "#51A2FF" }}>Forensic Identification</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      <DetailItem dark label="Entry ID" value={selectedEntry.entryId} />
                      <DetailItem dark label="Trace ID" value={selectedEntry.traceId} />
                      <DetailItem dark label="Action Timestamp" value={`${formatDateTime(selectedEntry.timestamp)} UTC`} />
                      <DetailItem dark label="Operational Type" value={formatLabel(selectedEntry.actionType)} />
                      <DetailItem dark label="Authority / Node" value={`${selectedEntry.authority.code} - ${selectedEntry.authority.name}`} />
                      <DetailItem dark label="Admin ID" value={selectedEntry.authority.adminId ?? "SYSTEM"} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#717680]">Affected Entity</p>
                      <p className="text-[13px] font-bold uppercase text-[#000]">{selectedEntry.affectedEntity.label}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#717680]">{selectedEntry.affectedEntity.type} - {selectedEntry.affectedEntity.id}</p>
                    </div>
                    <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#717680]">Registry Classification</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <ImpactBadge type={selectedEntry.registryImpact} />
                        <SeverityBadge level={selectedEntry.severity} />
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#E5E7EB] rounded-xl px-4 sm:px-5 py-4 space-y-3">
                    <h3 className="text-[11px] sm:text-[12px] font-bold text-[#000] uppercase tracking-wide">Integrity Proof</h3>
                    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 sm:px-4 py-2.5">
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider" style={{ color: "#717680" }}>Backend Trace Identifier</p>
                      <p className="text-[11px] sm:text-[12px] font-bold mt-0.5 break-all" style={{ color: "#364153" }}>{selectedEntry.traceId}</p>
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide leading-relaxed text-center italic pt-1" style={{ color: "#51A2FF" }}>
                      This entry is generated from the backend forensic audit endpoint and normalized from operational source records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

const DetailItem = ({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) => (
  <div>
    <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest" style={{ color: dark ? "#8EC5FF" : "#717680" }}>
      {label}
    </p>
    <p className="text-[12px] sm:text-[13px] font-bold uppercase mt-0.5 break-words" style={{ color: dark ? "#FFFFFF" : "#000000" }}>
      {value}
    </p>
  </div>
);

export default AuditLogsPage;
