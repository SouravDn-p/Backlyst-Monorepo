import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle,
  List,
  Ban,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Shield,
  Users,
  AlertTriangle,
  DollarSign,
  Scale,
  X,
  Trash2,
  Zap,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useGetConsentsQuery,
  useGetGovernanceRecordsQuery,
  useGetAbuseReportsQuery,
  useGetTaskDisputesQuery,
  useGetFinancialRecordsQuery,
  useGetLegalDocsQuery,
  useCreateLegalDocMutation,
  useActivateLegalDocVersionMutation,
  useDeleteLegalDocVersionMutation,
} from "@/redux/feature/compliance/complianceApi";
import type {
  AbuseReportItem,
  LegalDocType,
  ConsentStatus,
} from "@/redux/feature/compliance/complianceTypes";
import { usePermissions } from "../utils/usePermissions";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 10;

const LEGAL_DOC_TYPES: { value: LegalDocType; label: string }[] = [
  { value: "TERMS_AND_CONDITIONS", label: "Terms & Conditions" },
  { value: "PRIVACY_POLICY", label: "Privacy Policy" },
  { value: "COOKIE_POLICY", label: "Cookie Policy" },
  { value: "DATA_PROCESSING_AGREEMENT", label: "Data Processing Agreement" },
];

const TAB_LIST = [
  { id: "consents", label: "Consent Records", icon: Users },
  { id: "governance", label: "Governance Records", icon: Shield },
  { id: "abuse", label: "Abuse Reports", icon: AlertTriangle },
  { id: "disputes", label: "Task Disputes", icon: Scale },
  { id: "financial", label: "Financial Records", icon: DollarSign },
  { id: "legal-docs", label: "Legal Docs", icon: FileText },
] as const;

type TabId = (typeof TAB_LIST)[number]["id"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Shared Sub-Components ────────────────────────────────────────────────────

const EmptyState = ({ message }: { message: string }) => (
  <tr>
    <td colSpan={99} className="py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <AlertCircle size={32} className="text-gray-300" />
        <p className="text-[13px] font-medium text-gray-400 uppercase tracking-wider">
          {message}
        </p>
      </div>
    </td>
  </tr>
);

const LoadingState = () => (
  <tr>
    <td colSpan={99} className="py-16 text-center">
      <div className="flex items-center justify-center gap-2">
        <Loader2 size={22} className="animate-spin text-gray-400" />
        <span className="text-[13px] font-medium text-gray-400 uppercase tracking-wider">
          Loading…
        </span>
      </div>
    </td>
  </tr>
);

const ErrorState = () => (
  <tr>
    <td colSpan={99} className="py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <AlertCircle size={32} style={{ color: "#FB2C36" }} />
        <p className="text-[13px] font-medium uppercase tracking-wider" style={{ color: "#FB2C36" }}>
          Failed to load data. Please try again.
        </p>
      </div>
    </td>
  </tr>
);

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const Pagination = ({ page, totalPages, total, onPrev, onNext }: PaginationProps) => {
  if (totalPages <= 0) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
        {total} record{total !== 1 ? "s" : ""} total
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="h-7 w-7 rounded flex items-center justify-center border border-gray-200 disabled:opacity-30 hover:border-gray-400 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[12px] font-bold text-gray-700">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="h-7 w-7 rounded flex items-center justify-center border border-gray-200 disabled:opacity-30 hover:border-gray-400 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = "Search…" }: SearchBarProps) => (
  <div className="relative">
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 bg-white placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-colors w-64"
    />
  </div>
);

// ─── Status Badges ────────────────────────────────────────────────────────────

const ConsentStatusBadge = ({ status }: { status: ConsentStatus }) => {
  const cfg: Record<ConsentStatus, { bg: string; color: string; label: string }> = {
    CURRENT: { bg: "#F0FDF4", color: "#008236", label: "Current" },
    RE_ACCEPTANCE_PENDING: { bg: "#FFF7ED", color: "#CA3500", label: "Re-Acceptance Pending" },
    LEGAL_DOCUMENT_NOT_CONFIGURED: { bg: "#FEF2F2", color: "#DC2626", label: "Doc Not Configured" },
  };
  const s = cfg[status] ?? { bg: "#F3F4F6", color: "#6B7280", label: status };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
};

const StatusBadge = ({
  status,
  small,
}: {
  status: string;
  small?: boolean;
}) => {
  const s = status?.toUpperCase();
  let bg = "#F3F4F6", color = "#6B7280";
  if (s === "PENDING") { bg = "#FFF7ED"; color = "#CA3500"; }
  else if (s === "REVIEWED" || s === "RESOLVED" || s === "RECORDED") { bg = "#F0FDF4"; color = "#008236"; }
  else if (s === "SUSPENDED" || s === "FLAGGED" || s === "FRAUD_FLAG") { bg = "#FEF2F2"; color = "#DC2626"; }
  else if (s === "ACTIVE") { bg = "#F0FDF4"; color = "#008236"; }
  else if (s === "LOCKED" || s === "DISPUTED" || s === "FROZEN") { bg = "#FEF2F2"; color = "#DC2626"; }
  else if (s === "TASK_DISPUTED" || s === "TASK_FROZEN") { bg = "#FEF9C3"; color = "#92400E"; }
  else if (s === "ADMIN_ABUSE_PATTERN_FLAGGED") { bg = "#FEF2F2"; color = "#DC2626"; }

  return (
    <span
      className={`font-bold uppercase tracking-wider rounded ${small ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"}`}
      style={{ backgroundColor: bg, color }}
    >
      {status}
    </span>
  );
};

const LiveBadge = () => (
  <span
    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1"
    style={{ backgroundColor: "#F0FDF4", color: "#008236" }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
    Live
  </span>
);

const DraftBadge = () => (
  <span
    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
    style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
  >
    Draft
  </span>
);

// ─── Table Wrapper ────────────────────────────────────────────────────────────

const TableCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[700px]">{children}</table>
    </div>
  </div>
);

const THead = ({ children }: { children: React.ReactNode }) => (
  <thead>
    <tr className="border-b border-gray-100">{children}</tr>
  </thead>
);

const TH = ({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) => (
  <th
    className={`px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider first:pl-6 last:pr-6 ${right ? "text-right" : ""}`}
  >
    {children}
  </th>
);

const TR = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
    {children}
  </tr>
);

const TD = ({
  children,
  right,
  muted,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
}) => (
  <td
    className={`px-5 py-3.5 first:pl-6 last:pr-6 ${right ? "text-right" : ""} ${muted ? "text-[12px] text-gray-400" : ""}`}
  >
    {children}
  </td>
);

// ─── 1. Consent Records Tab ───────────────────────────────────────────────────

const ConsentTab = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, isError } = useGetConsentsQuery({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch,
  });

  const items = data?.data?.items ?? [];
  const meta = data?.data?.meta;
  const av = data?.data?.activeVersions;

  return (
    <div className="space-y-4">
      {/* Active version banner */}
      {av && (av.terms || av.privacy) && (
        <div className="flex flex-wrap gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          {av.terms && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                Active Terms:
              </span>
              <span className="text-[12px] font-bold text-[#155DFC]">v{av.terms.version}</span>
              <span className="text-[11px] text-gray-400">{formatDateShort(av.terms.publishedAt)}</span>
            </div>
          )}
          {av.terms && av.privacy && (
            <span className="text-gray-300 text-sm">|</span>
          )}
          {av.privacy && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                Active Privacy:
              </span>
              <span className="text-[12px] font-bold text-[#155DFC]">v{av.privacy.version}</span>
              <span className="text-[11px] text-gray-400">{formatDateShort(av.privacy.publishedAt)}</span>
            </div>
          )}
        </div>
      )}

      {(!av || (!av.terms && !av.privacy)) && !isFetching && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
          <span className="text-[12px] font-medium text-amber-700">
            No active legal document versions are configured. Users cannot accept terms.
          </span>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, company…" />
        {isFetching && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      <TableCard>
        <THead>
          <TH>Entity Identity</TH>
          <TH>Email</TH>
          <TH>TOS Acceptance</TH>
          <TH>Privacy Acceptance</TH>
          <TH>Version Tracking</TH>
          <TH right>Status</TH>
        </THead>
        <tbody>
          {isError ? (
            <ErrorState />
          ) : isFetching && items.length === 0 ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState message="No consent records found" />
          ) : (
            items.map((item) => (
              <TR key={item.userId}>
                <TD>
                  <div>
                    <p className="text-[13px] font-bold text-[#000000] uppercase">
                      {item.entityIdentity || "—"}
                    </p>
                    <p className="text-[11px] text-gray-400">{item.userName}</p>
                  </div>
                </TD>
                <TD>
                  <span className="text-[12px] text-gray-500">{item.email}</span>
                </TD>
                <TD>
                  <span className="text-[12px] font-medium text-gray-700 uppercase">
                    {item.termsAcceptance || "—"}
                  </span>
                </TD>
                <TD>
                  <span className="text-[12px] font-medium text-gray-700 uppercase">
                    {item.privacyAcceptance || "—"}
                  </span>
                </TD>
                <TD muted>{formatDateShort(item.versionTrackingDate)}</TD>
                <TD right>
                  <ConsentStatusBadge status={item.status} />
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </TableCard>

      {meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
};

// ─── 2. Governance Records Tab ────────────────────────────────────────────────

const GovernanceTab = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, isError } = useGetGovernanceRecordsQuery({
    page, limit: PAGE_LIMIT, search: debouncedSearch,
  });

  const items = data?.data?.items ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, note…" />
        {isFetching && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      <TableCard>
        <THead>
          <TH>Ref ID</TH>
          <TH>Entity / Email</TH>
          <TH>Account Status</TH>
          <TH>Punishment Reason</TH>
          <TH>Suspension Period</TH>
          <TH>Reviewed By</TH>
          <TH right>Created</TH>
        </THead>
        <tbody>
          {isError ? <ErrorState /> : isFetching && items.length === 0 ? <LoadingState /> : items.length === 0 ? (
            <EmptyState message="No governance records found" />
          ) : (
            items.map((item) => (
              <TR key={item.referenceId}>
                <TD>
                  <span className="text-[11px] font-bold font-mono" style={{ color: "#155DFC" }}>
                    {item.referenceId}
                  </span>
                </TD>
                <TD>
                  <div>
                    <p className="text-[13px] font-bold text-[#000000] uppercase">{item.entityIdentity || "—"}</p>
                    <p className="text-[11px] text-gray-400">{item.email}</p>
                  </div>
                </TD>
                <TD>
                  <StatusBadge status={item.accountStatus} />
                </TD>
                <TD>
                  <span className="text-[12px] text-gray-600">{item.punishmentReason || "—"}</span>
                </TD>
                <TD>
                  {item.suspension?.startsAt ? (
                    <div className="text-[11px] text-gray-500">
                      <p>{formatDateShort(item.suspension.startsAt)}</p>
                      <p className="text-gray-400">→ {formatDateShort(item.suspension.endsAt)}</p>
                    </div>
                  ) : (
                    <span className="text-[12px] text-gray-400">—</span>
                  )}
                </TD>
                <TD>
                  <div>
                    <p className="text-[12px] font-medium text-gray-700">{item.admin?.name || "—"}</p>
                    <p className="text-[11px] text-gray-400">{item.admin?.email}</p>
                  </div>
                </TD>
                <TD right muted>{formatDateShort(item.createdAt)}</TD>
              </TR>
            ))
          )}
        </tbody>
      </TableCard>

      {meta && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

// ─── 3. Abuse Reports Tab ─────────────────────────────────────────────────────

const AbuseReportDetailModal = ({
  item,
  onClose,
}: {
  item: AbuseReportItem;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Abuse Report</p>
            <p className="text-[14px] font-bold text-[#000000] font-mono">{item.referenceId}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type & Status */}
          <div className="flex items-center gap-3">
            <StatusBadge status={item.type} />
            <StatusBadge status={item.status} />
          </div>

          {/* Note */}
          {item.note && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Report Note</p>
              <p className="text-[13px] text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">{item.note}</p>
            </div>
          )}

          {/* Review Action */}
          {item.reviewAction && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Review Action</p>
              <p className="text-[13px] text-gray-700">{item.reviewAction}</p>
            </div>
          )}

          {/* Reporter */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reporter</p>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-1">
              <p className="text-[13px] font-bold text-[#000000]">{item.reporter?.name || "—"}</p>
              <p className="text-[12px] text-gray-400">{item.reporter?.email}</p>
            </div>
          </div>

          {/* Reviewed By */}
          {item.reviewedBy && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reviewed By</p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-1">
                <p className="text-[13px] font-bold text-[#000000]">{item.reviewedBy.name}</p>
                <p className="text-[12px] text-gray-400">{item.reviewedBy.email}</p>
                <p className="text-[11px] text-gray-400">{formatDate(item.reviewedAt)}</p>
              </div>
            </div>
          )}

          {/* Source */}
          {item.source && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Message Source</p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Context:</span>
                  <span className="text-[12px] font-bold text-gray-700">{item.source.contextType || "—"}</span>
                  <StatusBadge status={item.source.registryStatus || ""} small />
                </div>
                {item.source.registryReason && (
                  <p className="text-[12px] text-gray-600">{item.source.registryReason}</p>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {item.source.sender && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Sender</p>
                      <p className="text-[12px] font-medium text-gray-700">{item.source.sender.name}</p>
                      <p className="text-[11px] text-gray-400">{item.source.sender.email}</p>
                    </div>
                  )}
                  {item.source.receiver && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Receiver</p>
                      <p className="text-[12px] font-medium text-gray-700">{item.source.receiver.name}</p>
                      <p className="text-[11px] text-gray-400">{item.source.receiver.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reported</p>
              <p className="text-[12px] text-gray-600">{formatDate(item.createdAt)}</p>
            </div>
            {item.reviewedAt && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reviewed</p>
                <p className="text-[12px] text-gray-600">{formatDate(item.reviewedAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AbuseTab = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<AbuseReportItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, isError } = useGetAbuseReportsQuery({
    page, limit: PAGE_LIMIT, search: debouncedSearch,
  });

  const items = data?.data?.items ?? [];
  const meta = data?.data?.meta;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by reporter, note…" />
          {isFetching && <Loader2 size={16} className="animate-spin text-gray-400" />}
        </div>

        <TableCard>
          <THead>
            <TH>Ref ID</TH>
            <TH>Type</TH>
            <TH>Reporter</TH>
            <TH>Status</TH>
            <TH right>Created</TH>
            <TH right>Details</TH>
          </THead>
          <tbody>
            {isError ? <ErrorState /> : isFetching && items.length === 0 ? <LoadingState /> : items.length === 0 ? (
              <EmptyState message="No abuse reports found" />
            ) : (
              items.map((item) => (
                <TR key={item.referenceId}>
                  <TD>
                    <span className="text-[11px] font-bold font-mono" style={{ color: "#155DFC" }}>
                      {item.referenceId}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge status={item.type} />
                  </TD>
                  <TD>
                    <div>
                      <p className="text-[12px] font-medium text-gray-700">{item.reporter?.name || "—"}</p>
                      <p className="text-[11px] text-gray-400">{item.reporter?.email}</p>
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge status={item.status} />
                  </TD>
                  <TD right muted>{formatDateShort(item.createdAt)}</TD>
                  <TD right>
                    <button
                      onClick={() => setSelectedReport(item)}
                      className="h-7 px-3 text-[11px] font-bold rounded border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors uppercase tracking-wider"
                    >
                      View
                    </button>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </TableCard>

        {meta && (
          <Pagination page={page} totalPages={meta.totalPages} total={meta.total}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)} />
        )}
      </div>

      {selectedReport && (
        <AbuseReportDetailModal item={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </>
  );
};

// ─── 4. Task Disputes Tab ─────────────────────────────────────────────────────

const DisputesTab = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, isError } = useGetTaskDisputesQuery({
    page, limit: PAGE_LIMIT, search: debouncedSearch,
  });

  const items = data?.data?.items ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by project, action, note…" />
        {isFetching && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      <TableCard>
        <THead>
          <TH>Ref ID</TH>
          <TH>Project Title</TH>
          <TH>Event Type</TH>
          <TH>Task Status</TH>
          <TH>Transition</TH>
          <TH>Triggered By</TH>
          <TH right>Created</TH>
        </THead>
        <tbody>
          {isError ? <ErrorState /> : isFetching && items.length === 0 ? <LoadingState /> : items.length === 0 ? (
            <EmptyState message="No dispute records found" />
          ) : (
            items.map((item) => (
              <TR key={item.referenceId}>
                <TD>
                  <span className="text-[11px] font-bold font-mono" style={{ color: "#155DFC" }}>
                    {item.referenceId}
                  </span>
                </TD>
                <TD>
                  <p className="text-[13px] font-bold text-[#000000]">{item.projectTitle || "—"}</p>
                </TD>
                <TD>
                  <StatusBadge status={item.type} small />
                </TD>
                <TD>
                  <StatusBadge status={item.currentTaskStatus} />
                </TD>
                <TD>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="text-gray-500 uppercase">{item.transition?.from}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-bold text-gray-700 uppercase">{item.transition?.to}</span>
                  </div>
                </TD>
                <TD>
                  <div>
                    <p className="text-[12px] font-medium text-gray-700">{item.actor?.name || "—"}</p>
                    <p className="text-[11px] text-gray-400 uppercase">{item.actorRole}</p>
                  </div>
                </TD>
                <TD right muted>{formatDateShort(item.createdAt)}</TD>
              </TR>
            ))
          )}
        </tbody>
      </TableCard>

      {meta && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

// ─── 5. Financial Records Tab ─────────────────────────────────────────────────

const FinancialTab = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, isError } = useGetFinancialRecordsQuery({
    page, limit: PAGE_LIMIT, search: debouncedSearch,
  });

  const items = data?.data?.items ?? [];
  const meta = data?.data?.meta;
  const disclosure = data?.data?.disclosure;

  return (
    <div className="space-y-4">
      {disclosure && (
        <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <AlertCircle size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-medium text-gray-500">{disclosure}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, note…" />
        {isFetching && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      <TableCard>
        <THead>
          <TH>Ref ID</TH>
          <TH>Entity</TH>
          <TH>Record Type</TH>
          <TH>Credit Amount</TH>
          <TH>Balance Change</TH>
          <TH>Ext. Reference</TH>
          <TH>Status</TH>
          <TH right>Created</TH>
        </THead>
        <tbody>
          {isError ? <ErrorState /> : isFetching && items.length === 0 ? <LoadingState /> : items.length === 0 ? (
            <EmptyState message="No financial records found" />
          ) : (
            items.map((item) => (
              <TR key={item.referenceId}>
                <TD>
                  <span className="text-[11px] font-bold font-mono" style={{ color: "#155DFC" }}>
                    {item.referenceId}
                  </span>
                </TD>
                <TD>
                  <div>
                    <p className="text-[13px] font-bold text-[#000000] uppercase">{item.user?.entityIdentity || "—"}</p>
                    <p className="text-[11px] text-gray-400">{item.user?.email}</p>
                  </div>
                </TD>
                <TD>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {item.recordType}
                  </span>
                </TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: item.action === "ADD" ? "#F0FDF4" : "#FEF2F2", color: item.action === "ADD" ? "#008236" : "#DC2626" }}
                    >
                      {item.action}
                    </span>
                    <span className="text-[13px] font-bold text-[#000000]">{item.creditAmount}</span>
                  </div>
                </TD>
                <TD>
                  <span className="text-[11px] text-gray-500">
                    {item.balanceBefore} → {item.balanceAfter}
                  </span>
                </TD>
                <TD>
                  {item.externalReference ? (
                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {item.externalReference}
                    </span>
                  ) : (
                    <span className="text-[12px] text-gray-300">—</span>
                  )}
                </TD>
                <TD>
                  <StatusBadge status={item.recordStatus} small />
                </TD>
                <TD right muted>{formatDateShort(item.createdAt)}</TD>
              </TR>
            ))
          )}
        </tbody>
      </TableCard>

      {meta && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)} />
      )}
    </div>
  );
};

// ─── 6. Legal Docs Tab ────────────────────────────────────────────────────────

interface CreateDocModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateDocModal = ({ onClose, onSuccess }: CreateDocModalProps) => {
  const [type, setType] = useState<LegalDocType>("TERMS_AND_CONDITIONS");
  const [version, setVersion] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [createDoc, { isLoading }] = useCreateLegalDocMutation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!version.trim()) { setError("Version is required (e.g. 1.0.0)"); return; }
    if (!content.trim()) { setError("Content is required"); return; }
    try {
      await createDoc({ type, version: version.trim(), content: content.trim() }).unwrap();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message ?? "Failed to create document. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-[16px] font-bold text-[#000000] uppercase tracking-wide">
              Create Legal Document Version
            </h3>
            <p className="text-[12px] text-gray-400 mt-0.5">
              New versions are created as <strong>inactive (draft)</strong> and must be explicitly activated.
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Document Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LegalDocType)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
              >
                {LEGAL_DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {/* Version */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Version * <span className="normal-case font-normal text-gray-400">(e.g. 1.0.0)</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 placeholder-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Document Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="Enter the full legal document content here…"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 placeholder-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none resize-y min-h-[120px]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-[12px] font-medium text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-5 rounded-lg text-[12px] font-bold uppercase tracking-wider border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-9 px-5 rounded-lg text-[12px] font-bold uppercase tracking-wider text-white flex items-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#101828" }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LegalDocsTab = () => {
  const { can } = usePermissions();
  const canCreate = can("COMPLIANCE", "canCreate");
  const canUpdateDocs = can("COMPLIANCE", "canUpdate");
  const canDeleteDocs = can("COMPLIANCE", "canDelete");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching, isError, refetch } = useGetLegalDocsQuery({
    page, limit: PAGE_LIMIT, search: debouncedSearch,
  });

  const [activateVersion] = useActivateLegalDocVersionMutation();
  const [deleteVersion] = useDeleteLegalDocVersionMutation();

  const docs = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const handleActivate = async (versionId: string) => {
    setActivatingId(versionId);
    setActionError(null);
    try {
      await activateVersion(versionId).unwrap();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setActionError(e?.data?.message ?? "Failed to activate version.");
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm("Delete this document version? This cannot be undone.")) return;
    setDeletingId(versionId);
    setActionError(null);
    try {
      await deleteVersion(versionId).unwrap();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setActionError(e?.data?.message ?? "Failed to delete version.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search documents…" />
            {isFetching && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-9 px-4 rounded-lg text-[12px] font-bold uppercase tracking-wider text-white flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0"
              style={{ backgroundColor: "#101828" }}
            >
              <Plus size={14} />
              New Version
            </button>
          )}
        </div>

        {actionError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-[12px] font-medium text-red-600">{actionError}</p>
            <button onClick={() => setActionError(null)} className="ml-auto">
              <X size={12} className="text-red-400 hover:text-red-600" />
            </button>
          </div>
        )}

        {/* Docs grid */}
        {isError ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <AlertCircle size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-400 uppercase tracking-wider">Failed to load legal documents</p>
          </div>
        ) : isFetching && docs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-1">No Legal Documents</p>
            <p className="text-[12px] text-gray-400">Create your first legal document version above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => {
              const latestV = doc.latestVersion;
              const activeV = doc.activeVersion;
              const canDelete = latestV && !latestV.isActive;
              const isActivating = activatingId === latestV?.id;
              const isDeleting = deletingId === latestV?.id;

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: doc info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-2">
                        <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wide">
                          {doc.title}
                        </h3>
                        {doc.isActive ? <LiveBadge /> : <DraftBadge />}
                        <span className="text-[11px] text-gray-400">
                          {doc.totalVersions} version{doc.totalVersions !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Active Version */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Eye size={10} />
                            Active Version (Shown to Users)
                          </p>
                          {activeV ? (
                            <div>
                              <p className="text-[13px] font-bold text-[#000000]">v{activeV.version}</p>
                              <p className="text-[11px] text-gray-400">Published: {formatDateShort(activeV.publishedAt)}</p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <EyeOff size={12} className="text-amber-400" />
                              <p className="text-[12px] font-medium text-amber-600">Not published yet</p>
                            </div>
                          )}
                        </div>

                        {/* Latest Version */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Latest Draft Version
                          </p>
                          {latestV ? (
                            <div>
                              <p className="text-[13px] font-bold text-[#000000]">v{latestV.version}</p>
                              <p className="text-[11px] text-gray-400">Created: {formatDateShort(latestV.createdAt)}</p>
                            </div>
                          ) : (
                            <p className="text-[12px] text-gray-400">—</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: actions */}
                    {latestV && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {/* Activate button — only if latest version is NOT already active */}
                        {!latestV.isActive && canUpdateDocs && (
                          <button
                            onClick={() => handleActivate(latestV.id)}
                            disabled={isActivating}
                            className="h-8 px-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity whitespace-nowrap"
                            style={{ backgroundColor: "#155DFC" }}
                            title="Activate this version — it will become visible to users"
                          >
                            {isActivating ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Zap size={12} />
                            )}
                            Activate
                          </button>
                        )}

                        {/* Already active label */}
                        {latestV.isActive && (
                          <span
                            className="h-8 px-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
                            style={{ backgroundColor: "#F0FDF4", color: "#008236" }}
                          >
                            <CheckCircle size={12} />
                            Active
                          </span>
                        )}

                        {/* Delete button — ONLY when isActive is false AND admin has delete permission */}
                        {canDelete && canDeleteDocs ? (
                          <button
                            onClick={() => handleDelete(latestV.id)}
                            disabled={isDeleting}
                            className="h-8 px-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-60 border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                            style={{ color: "#DC2626" }}
                            title="Delete this draft version"
                          >
                            {isDeleting ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Delete
                          </button>
                        ) : (
                          <button
                            disabled
                            className="h-8 px-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-30 cursor-not-allowed border border-gray-200 text-gray-400 whitespace-nowrap"
                            title="Cannot delete an active version"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meta && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              {meta.total} document{meta.total !== 1 ? "s" : ""} total
            </span>
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 w-7 rounded flex items-center justify-center border border-gray-200 disabled:opacity-30 hover:border-gray-400 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[12px] font-bold text-gray-700">{page} / {meta.totalPages}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.totalPages}
                  className="h-7 w-7 rounded flex items-center justify-center border border-gray-200 disabled:opacity-30 hover:border-gray-400 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateDocModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CompliancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("consents");

  const renderTab = () => {
    switch (activeTab) {
      case "consents":    return <ConsentTab />;
      case "governance":  return <GovernanceTab />;
      case "abuse":       return <AbuseTab />;
      case "disputes":    return <DisputesTab />;
      case "financial":   return <FinancialTab />;
      case "legal-docs":  return <LegalDocsTab />;
      default:            return null;
    }
  };

  return (
    <div className="w-full font-arimo space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <section>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
            Compliance &amp; Governance
          </h1>
          <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
            Institutional-Grade Registry Mode // Audit-Ready Operational Environment
          </p>
        </section>
      </div>

      {/* ── Credit Compliance Banner ────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={20} style={{ color: "#00C950" }} />
              <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "#00A63E" }}>
                Asset Distinction
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-[#000000] uppercase tracking-wider mb-2">
              Proof: Credits ≠ Stored Value
            </h3>
            <p className="text-[11px] font-medium text-gray-400 leading-relaxed uppercase tracking-wide">
              Backlyst credits are internal operational markers with zero redemption potential.
              They do not constitute a money or stored-value asset.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <List size={20} style={{ color: "#2B7FFF" }} />
              <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "#155DFC" }}>
                Lifecycle Logs
              </span>
            </div>
            <div className="space-y-2.5">
              {["CREATED", "LOCKED", "SETTLED"].map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "#6A7282" }}>
                    {label}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: "#F0FDF4", color: "#008236" }}>
                    Logged
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: "#101828" }}>
            <div className="flex items-center gap-2 mb-3">
              <Ban size={20} style={{ color: "#FB2C36" }} />
              <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "#FB2C36" }}>
                Restricted Action
              </span>
            </div>
            <h3 className="text-[15px] font-bold uppercase tracking-wider mb-2" style={{ color: "#FFFFFF" }}>
              No Cash Conversion Path
            </h3>
            <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wide" style={{ color: "#99A1AF" }}>
              Platform governance explicitly prevents cash conversion. Credits are task-utilization
              tokens only. There is no strictly withdrawal or monetary legal.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 overflow-x-auto">
          {TAB_LIST.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 px-4 py-3 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all"
                style={{
                  borderBottomColor: isActive ? "#155DFC" : "transparent",
                  color: isActive ? "#155DFC" : "#6A7282",
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div>{renderTab()}</div>

      {/* ── Dark Footer Banner ─────────────────────────────────────────────── */}
      <div className="rounded-xl p-6 lg:p-8" style={{ backgroundColor: "#101828" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} style={{ color: "#00C950" }} />
              <span className="text-[14px] font-bold text-white uppercase tracking-wider">
                Audit Integrity Verified
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#99A1AF" }}>
              Institutional Scope
            </p>
            <p className="text-[11px] font-medium leading-relaxed uppercase tracking-wide" style={{ color: "#D1D5DC" }}>
              All institutional records are maintained for regulatory traceability.
              Transactions, disputes, and policy acceptance events are automatically
              captured in system forensic registries. Dispute escalation and failure
              mechanisms are strictly enforced.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} style={{ color: "#00C950" }} />
              <span className="text-[14px] font-bold text-white uppercase tracking-wider">
                Read-Only Governance Active
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#99A1AF" }}>
              Financial Disclosure
            </p>
            <p className="text-[11px] font-medium leading-relaxed uppercase tracking-wide" style={{ color: "#D1D5DC" }}>
              Payment data disclosure is strictly read-only from a cash conversion
              perspective. Merchant provider data (Stripe) is maintained under custody
              for institutional payments compliance only.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-center" style={{ color: "#6A7282" }}>
            Management Environment Mode: V1.4.2 // Platform Integrity Verified
          </p>
        </div>
      </div>

      {/* ── Footer Status Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 pb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#99A1AF" }}>
          Management Environment V1.4.2
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#99A1AF" }}>
          Platform Integrity Verified
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#99A1AF" }}>
          System Compliance: Policy Protocols Active
        </span>
      </div>
    </div>
  );
};

export default CompliancePage;
