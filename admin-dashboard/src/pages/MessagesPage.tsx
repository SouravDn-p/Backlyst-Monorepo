
import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { CheckCircle2, Copy, Download, Eye, FileText, Fingerprint, Loader2, MessageSquare, RefreshCw, Search, ShieldAlert, Trash2, X } from "lucide-react";
import {
  downloadAdminMessageEvidencePdf,
  useDeleteAdminMessageReportMutation,
  useGetAdminMessageReportsQuery,
  useGetAdminRegistryQuery,
  useReviewAdminMessageReportMutation,
  useUpdateAdminRegistryStatusMutation,
} from "../redux/feature/message/messageApi";
import { usePermissions } from "../utils/usePermissions";
import type {
  IRegistryRecord,
  MessageContextType,
  MessageRecordType,
  MessageRegistryStatus,
  MessageReportReason,
  MessageReportStatus,
  MessageReportSummary,
} from "../redux/feature/message/messageTypes";

type MainTab = "REGISTRY" | "REPORTS";
type AllRegistryStatus = "ALL" | MessageRegistryStatus;
type AllRecordType = "ALL" | MessageRecordType;
type AllContextType = "ALL" | MessageContextType;
type AllReportStatus = "ALL" | MessageReportStatus;
type AllReportReason = "ALL" | MessageReportReason;
type ReviewStatus = Exclude<MessageReportStatus, "PENDING">;

type FileSelectValue = "ALL" | "true" | "false";

const PAGE_LIMIT = 20;
const REGISTRY_STATUSES: MessageRegistryStatus[] = ["VERIFIED", "FLAGGED", "RESTRICTED"];
const RECORD_TYPES: MessageRecordType[] = ["MESSAGE", "FILE"];
const CONTEXT_TYPES: MessageContextType[] = ["DIRECT", "TASK", "DISPUTE", "ADMIN_SUPPORT"];
const REPORT_STATUSES: MessageReportStatus[] = ["PENDING", "REVIEWED", "DISMISSED", "ACTION_TAKEN"];
const REPORT_REASONS: MessageReportReason[] = ["SPAM", "ABUSE", "FAKE_PROOF", "OFF_PLATFORM_PAYMENT", "SENSITIVE_INFORMATION", "THREAT", "OTHER"];

const STATUS_STYLES: Record<MessageRegistryStatus, { bg: string; text: string }> = {
  VERIFIED: { bg: "#F0FDF4", text: "#008236" },
  FLAGGED: { bg: "#FEF2F2", text: "#C10007" },
  RESTRICTED: { bg: "#F3F4F6", text: "#1F2937" },
};

const REPORT_STYLES: Record<MessageReportStatus, { bg: string; text: string }> = {
  PENDING: { bg: "#FFFBEB", text: "#CA3500" },
  REVIEWED: { bg: "#EFF6FF", text: "#1447E6" },
  DISMISSED: { bg: "#F3F4F6", text: "#364153" },
  ACTION_TAKEN: { bg: "#F0FDF4", text: "#008236" },
};

function label(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "N/A";
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "N/A";
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function participant(record: IRegistryRecord, side: "sender" | "receiver") {
  const user = side === "sender" ? record.Sender ?? record.sender : record.Receiver ?? record.receiver;
  const email = side === "sender" ? record.senderEmailSnapshot : record.recipientEmailSnapshot;
  return {
    name: user?.name ?? email ?? "Unknown",
    email: user?.email ?? email ?? "N/A",
  };
}

function getRecordText(record: IRegistryRecord) {
  if (record.recordType === "FILE") return record.document ?? record.fileUrl ?? "";
  return record.text ?? record.content ?? "";
}

function asEvidenceRecord(report: MessageReportSummary): IRegistryRecord {
  return {
    ...(report.message ?? {}),
    id: report.messageId,
    recordType: report.message?.recordType ?? "MESSAGE",
    registryStatus: report.message?.registryStatus ?? "VERIFIED",
    createdAt: report.message?.createdAt ?? report.createdAt,
  };
}

const Badge: React.FC<{ value: string; variant?: "registry" | "report" }> = ({ value, variant = "registry" }) => {
  const style = variant === "report"
    ? REPORT_STYLES[value as MessageReportStatus] ?? { bg: "#F3F4F6", text: "#364153" }
    : STATUS_STYLES[value as MessageRegistryStatus] ?? { bg: "#F3F4F6", text: "#364153" };
  return <span className="inline-flex min-w-[88px] items-center justify-center rounded px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: style.bg, color: style.text }}>{label(value)}</span>;
};
const MessagesPage: React.FC = () => {
  const { can } = usePermissions();
  const canUpdate = can("MESSAGING", "canUpdate");
  const canDelete = can("MESSAGING", "canDelete");

  const [tab, setTab] = useState<MainTab>("REGISTRY");
  const [registryPage, setRegistryPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [recordType, setRecordType] = useState<AllRecordType>("ALL");
  const [registryStatus, setRegistryStatus] = useState<AllRegistryStatus>("ALL");
  const [contextType, setContextType] = useState<AllContextType>("ALL");
  const [reportedOnly, setReportedOnly] = useState(false);
  const [hasFile, setHasFile] = useState<FileSelectValue>("ALL");
  const [taskId, setTaskId] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportStatus, setReportStatus] = useState<AllReportStatus>("PENDING");
  const [reportReason, setReportReason] = useState<AllReportReason>("ALL");
  const [selectedRecord, setSelectedRecord] = useState<IRegistryRecord | null>(null);
  const [selectedReport, setSelectedReport] = useState<MessageReportSummary | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("REVIEWED");
  const [reviewNote, setReviewNote] = useState("");
  const [registryReason, setRegistryReason] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const registryQuery = useMemo(() => ({
    page: registryPage,
    limit: PAGE_LIMIT,
    recordType: recordType === "ALL" ? undefined : recordType,
    registryStatus: registryStatus === "ALL" ? undefined : registryStatus,
    contextType: contextType === "ALL" ? undefined : contextType,
    reportedOnly: reportedOnly ? "true" as const : undefined,
    hasFile: hasFile === "ALL" ? undefined : hasFile,
    taskId: taskId.trim() || undefined,
    senderEmail: senderEmail.trim() || undefined,
    recipientEmail: recipientEmail.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [contextType, dateFrom, dateTo, hasFile, recipientEmail, recordType, registryPage, registryStatus, reportedOnly, senderEmail, taskId]);

  const reportQuery = useMemo(() => ({
    page: reportPage,
    limit: PAGE_LIMIT,
    status: reportStatus === "ALL" ? undefined : reportStatus,
    reason: reportReason === "ALL" ? undefined : reportReason,
    taskId: taskId.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [dateFrom, dateTo, reportPage, reportReason, reportStatus, taskId]);

  const { data: registryData, isFetching: registryFetching, isError: registryError, refetch: refetchRegistry } = useGetAdminRegistryQuery(registryQuery);
  const { data: reportData, isFetching: reportsFetching, isError: reportsError, refetch: refetchReports } = useGetAdminMessageReportsQuery(reportQuery);
  const { data: flaggedCount } = useGetAdminRegistryQuery({ page: 1, limit: 1, registryStatus: "FLAGGED" });
  const { data: pendingReports } = useGetAdminMessageReportsQuery({ page: 1, limit: 1, status: "PENDING" });
  const [updateRegistryStatus, { isLoading: updatingRegistry }] = useUpdateAdminRegistryStatusMutation();
  const [reviewReport, { isLoading: reviewingReport }] = useReviewAdminMessageReportMutation();
  const [deleteReport, { isLoading: deletingReport }] = useDeleteAdminMessageReportMutation();

  const registryItems = registryData?.data.items ?? [];
  const registryMeta = registryData?.data.meta;
  const reportItems = reportData?.data.items ?? [];
  const reportMeta = reportData?.data.meta;

  const resetPages = () => {
    setRegistryPage(1);
    setReportPage(1);
  };

  const handleEvidenceDownload = async (record: IRegistryRecord) => {
    try {
      setDownloadingId(record.id);
      await downloadAdminMessageEvidencePdf(record.id);
      setNotice({ type: "success", text: "Evidence PDF downloaded from backend." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to download evidence PDF." });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async (record: IRegistryRecord, nextStatus: MessageRegistryStatus) => {
    try {
      await updateRegistryStatus({ id: record.id, registryStatus: nextStatus, reason: registryReason.trim() || undefined }).unwrap();
      setNotice({ type: "success", text: "Registry status updated." });
      setSelectedRecord((prev) => prev ? { ...prev, registryStatus: nextStatus, registryReason: registryReason.trim() || prev.registryReason } : prev);
      setRegistryReason("");
    } catch {
      setNotice({ type: "error", text: "Failed to update registry status." });
    }
  };

  const handleOpenReport = (report: MessageReportSummary) => {
    setSelectedReport(report);
    setReviewStatus(report.status === "PENDING" ? "REVIEWED" : (report.status as ReviewStatus));
    setReviewNote(report.reviewNote ?? "");
  };

  const handleReviewReport = async () => {
    if (!selectedReport) return;
    try {
      await reviewReport({ id: selectedReport.id, status: reviewStatus, reviewNote: reviewNote.trim() || undefined }).unwrap();
      setNotice({ type: "success", text: "Message report reviewed." });
      setSelectedReport(null);
      setReviewNote("");
    } catch {
      setNotice({ type: "error", text: "Failed to review message report." });
    }
  };

  const handleDeleteReport = async (report: MessageReportSummary) => {
    if (!window.confirm("Delete this message report? The backend will recompute the linked registry status.")) return;
    try {
      await deleteReport(report.id).unwrap();
      setNotice({ type: "success", text: "Message report deleted and registry recomputed." });
      setSelectedReport(null);
    } catch {
      setNotice({ type: "error", text: "Failed to delete message report." });
    }
  };

  const renderPagination = (page: number, totalPages: number | undefined, setPage: React.Dispatch<React.SetStateAction<number>>) => (
    <div className="flex items-center gap-2">
      <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-9 rounded-lg border border-gray-200 px-3 text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-gray-50">Prev</button>
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Page {page} of {Math.max(1, totalPages ?? 1)}</span>
      <button disabled={page >= Math.max(1, totalPages ?? 1)} onClick={() => setPage((p) => p + 1)} className="h-9 rounded-lg border border-gray-200 px-3 text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-gray-50">Next</button>
    </div>
  );
  return (
    <div className="w-full font-arimo space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <section>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-black uppercase tracking-tight leading-tight">Messages & Files</h1>
          <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">Admin registry, evidence downloads, and message report review.</p>
        </section>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { void refetchRegistry(); void refetchReports(); }} className="h-[42px] px-4 rounded-lg border border-gray-200 bg-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {notice && <div className={`rounded-xl border px-4 py-3 text-[12px] font-bold uppercase tracking-wider ${notice.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.text}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registry Records</p><p className="mt-2 text-[28px] font-bold text-black">{registryMeta?.totalItems?.toLocaleString() ?? "0"}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Flagged Records</p><p className="mt-2 text-[28px] font-bold text-red-600">{flaggedCount?.data.meta.totalItems?.toLocaleString() ?? "0"}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Reports</p><p className="mt-2 text-[28px] font-bold text-orange-600">{pendingReports?.data.meta.totalItems?.toLocaleString() ?? "0"}</p></div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["REGISTRY", "REPORTS"] as MainTab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`h-10 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider ${tab === item ? "bg-black text-white" : "border border-gray-200 bg-white text-black hover:bg-gray-50"}`}>{item === "REGISTRY" ? "Message Registry" : "Message Reports"}</button>)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Task ID</span><div className="h-10 rounded-lg border border-gray-200 px-3 flex items-center gap-2"><Search size={14} className="text-gray-400" /><input value={taskId} onChange={(e) => { setTaskId(e.target.value); resetPages(); }} placeholder="Task context" className="w-full outline-none text-[12px] font-medium" /></div></label>
          {tab === "REGISTRY" ? <>
            <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Record</span><select value={recordType} onChange={(e) => { setRecordType(e.target.value as AllRecordType); resetPages(); }} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase"><option value="ALL">All</option>{RECORD_TYPES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span><select value={registryStatus} onChange={(e) => { setRegistryStatus(e.target.value as AllRegistryStatus); resetPages(); }} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase"><option value="ALL">All</option>{REGISTRY_STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Context</span><select value={contextType} onChange={(e) => { setContextType(e.target.value as AllContextType); resetPages(); }} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase"><option value="ALL">All</option>{CONTEXT_TYPES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          </> : <>
            <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Report Status</span><select value={reportStatus} onChange={(e) => { setReportStatus(e.target.value as AllReportStatus); resetPages(); }} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase"><option value="ALL">All</option>{REPORT_STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
            <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reason</span><select value={reportReason} onChange={(e) => { setReportReason(e.target.value as AllReportReason); resetPages(); }} className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase"><option value="ALL">All</option>{REPORT_REASONS.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          </>}
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">From</span><input value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPages(); }} type="date" className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">To</span><input value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPages(); }} type="date" className="h-10 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase" /></label>
        </div>

        {tab === "REGISTRY" && <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={senderEmail} onChange={(e) => { setSenderEmail(e.target.value); resetPages(); }} placeholder="Sender email" className="h-10 rounded-lg border border-gray-200 px-3 text-[12px] font-medium" />
          <input value={recipientEmail} onChange={(e) => { setRecipientEmail(e.target.value); resetPages(); }} placeholder="Recipient email" className="h-10 rounded-lg border border-gray-200 px-3 text-[12px] font-medium" />
          <select value={hasFile} onChange={(e) => { setHasFile(e.target.value as FileSelectValue); resetPages(); }} className="h-10 rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase"><option value="ALL">Any attachment state</option><option value="true">Has file</option><option value="false">No file</option></select>
          <label className="h-10 rounded-lg border border-gray-200 px-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider"><input type="checkbox" checked={reportedOnly} onChange={(e) => { setReportedOnly(e.target.checked); resetPages(); }} /> Reported only</label>
        </div>}
      </div>
      {tab === "REGISTRY" ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1120px]">
              <thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="pl-6 pr-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Record</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Participants</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Context</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reports</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Created</th><th className="pl-3 pr-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {registryFetching ? <tr><td colSpan={6} className="py-12 text-center text-[12px] font-bold uppercase tracking-wider text-gray-500"><Loader2 size={16} className="inline animate-spin mr-2" />Loading registry records</td></tr>
                  : registryError ? <tr><td colSpan={6} className="py-12 text-center text-[12px] font-bold uppercase tracking-wider text-red-600">Failed to load registry records.</td></tr>
                  : registryItems.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-[12px] font-bold uppercase tracking-wider text-gray-500">No registry records found.</td></tr>
                  : registryItems.map((record) => {
                    const sender = participant(record, "sender");
                    const receiver = participant(record, "receiver");
                    const recordContent = getRecordText(record);
                    return <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="pl-6 pr-3 py-5"><div className="flex items-start gap-3"><div className="mt-0.5 text-gray-400">{record.recordType === "FILE" ? <FileText size={17} /> : <MessageSquare size={17} />}</div><div><p className="text-[13px] font-bold text-black uppercase">{shortId(record.id)}</p><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label(record.recordType)} / {label(record.contextType)}</p><div className="mt-2"><Badge value={record.registryStatus} /></div></div></div></td>
                      <td className="px-3 py-5"><p className="text-[12px] font-bold text-black uppercase">{sender.name}</p><p className="text-[10px] text-gray-400 truncate max-w-[210px]">{sender.email}</p><p className="mt-1 text-[11px] font-medium text-gray-500">To: {receiver.name}</p></td>
                      <td className="px-3 py-5"><p className="text-[12px] font-bold text-black uppercase">{record.task?.projectTitle ?? shortId(record.taskId)}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">Task {shortId(record.taskId)}</p></td>
                      <td className="px-3 py-5"><p className="text-[18px] font-bold text-black">{record.reportCount ?? 0}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">Latest {shortId(record.latestReportId)}</p></td>
                      <td className="px-3 py-5 text-[12px] font-medium text-gray-600">{formatDate(record.createdAt)}</td>
                      <td className="pl-3 pr-6 py-5"><div className="flex items-center justify-end gap-2"><button onClick={() => setSelectedRecord(record)} title="View details" className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100"><Eye size={16} /></button><button onClick={() => void handleEvidenceDownload(record)} title="Download backend evidence PDF" disabled={downloadingId === record.id} className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 disabled:opacity-40">{downloadingId === record.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}</button><button onClick={() => void navigator.clipboard.writeText(recordContent)} title="Copy content or file URL" disabled={!recordContent} className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 disabled:opacity-30"><Copy size={16} /></button></div></td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"><p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Showing {registryItems.length} of {registryMeta?.totalItems ?? 0} backend registry records.</p>{renderPagination(registryPage, registryMeta?.totalPages, setRegistryPage)}</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="pl-6 pr-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Report</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reporter</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Linked Message</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th><th className="px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submitted</th><th className="pl-3 pr-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reportsFetching ? <tr><td colSpan={6} className="py-12 text-center text-[12px] font-bold uppercase tracking-wider text-gray-500"><Loader2 size={16} className="inline animate-spin mr-2" />Loading message reports</td></tr>
                  : reportsError ? <tr><td colSpan={6} className="py-12 text-center text-[12px] font-bold uppercase tracking-wider text-red-600">Failed to load message reports.</td></tr>
                  : reportItems.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-[12px] font-bold uppercase tracking-wider text-gray-500">No message reports found.</td></tr>
                  : reportItems.map((report) => <tr key={report.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="pl-6 pr-3 py-5"><p className="text-[13px] font-bold text-black uppercase">{label(report.reason)}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">{shortId(report.id)}</p><p className="mt-2 text-[12px] text-gray-600 line-clamp-2 max-w-[260px]">{report.note ?? "No reporter note supplied."}</p></td>
                    <td className="px-3 py-5"><p className="text-[12px] font-bold text-black uppercase">{report.reporter?.name ?? "Unknown"}</p><p className="text-[10px] text-gray-400 truncate max-w-[220px]">{report.reporter?.email ?? "N/A"}</p></td>
                    <td className="px-3 py-5"><p className="text-[12px] font-bold text-black uppercase">Task {shortId(report.message?.taskId)}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">Message {shortId(report.messageId)}</p>{report.message?.registryStatus && <div className="mt-2"><Badge value={report.message.registryStatus} /></div>}</td>
                    <td className="px-3 py-5"><Badge value={report.status} variant="report" /></td>
                    <td className="px-3 py-5 text-[12px] font-medium text-gray-600">{formatDate(report.createdAt)}</td>
                    <td className="pl-3 pr-6 py-5"><div className="flex items-center justify-end gap-2"><button onClick={() => handleOpenReport(report)} title="Review report" className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100"><Eye size={16} /></button><button onClick={() => void handleEvidenceDownload(asEvidenceRecord(report))} title="Download message evidence" className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100"><Download size={16} /></button>{canDelete && <button onClick={() => void handleDeleteReport(report)} title="Delete report" disabled={deletingReport} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 size={16} /></button>}</div></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"><p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Showing {reportItems.length} of {reportMeta?.totalItems ?? 0} backend message reports.</p>{renderPagination(reportPage, reportMeta?.totalPages, setReportPage)}</div>
        </div>
      )}
      {selectedRecord && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setSelectedRecord(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between px-7 pt-7 pb-4"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center text-white">{selectedRecord.recordType === "FILE" ? <FileText size={20} /> : <MessageSquare size={20} />}</div><div><h2 className="text-[18px] font-bold text-black uppercase tracking-wide">Registry Record {shortId(selectedRecord.id)}</h2><p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Backend message evidence node</p></div></div><button onClick={() => setSelectedRecord(null)} className="p-2 text-gray-400 hover:text-gray-700"><X size={22} /></button></div>
              <div className="border-t border-gray-100" />
              <div className="px-7 py-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="rounded-xl bg-gray-50 border border-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</p><div className="mt-2"><Badge value={selectedRecord.registryStatus} /></div></div><div className="rounded-xl bg-gray-50 border border-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reports</p><p className="mt-2 text-[20px] font-bold text-black">{selectedRecord.reportCount ?? 0}</p></div><div className="rounded-xl bg-gray-50 border border-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Created</p><p className="mt-2 text-[12px] font-bold text-black">{formatDate(selectedRecord.createdAt)}</p></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Sender</p><div className="rounded-xl border border-gray-200 p-4"><p className="text-[13px] font-bold text-black uppercase">{participant(selectedRecord, "sender").name}</p><p className="text-[11px] text-gray-500 mt-1">{participant(selectedRecord, "sender").email}</p></div></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Recipient</p><div className="rounded-xl border border-gray-200 p-4"><p className="text-[13px] font-bold text-black uppercase">{participant(selectedRecord, "receiver").name}</p><p className="text-[11px] text-gray-500 mt-1">{participant(selectedRecord, "receiver").email}</p></div></div></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Evidence Transcript / Attachment</p><div className="rounded-xl bg-gray-50 border-l-4 border-gray-300 p-5"><p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words">{getRecordText(selectedRecord) || "No transcript or attachment URL available."}</p></div></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Registry Override Reason</p><textarea value={registryReason} onChange={(e) => setRegistryReason(e.target.value)} maxLength={1000} placeholder={selectedRecord.registryReason ?? "Optional context for manual status changes"} className="min-h-[86px] w-full rounded-xl border border-gray-200 p-3 text-[13px] outline-none focus:border-black" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3"><button onClick={() => void handleEvidenceDownload(selectedRecord)} disabled={Boolean(downloadingId)} className="h-11 rounded-lg bg-black text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"><Download size={14} /> Evidence PDF</button>{canUpdate && REGISTRY_STATUSES.map((status) => <button key={status} onClick={() => void handleStatusChange(selectedRecord, status)} disabled={updatingRegistry || selectedRecord.registryStatus === status} className="h-11 rounded-lg border border-gray-200 text-[11px] font-bold uppercase tracking-wider hover:bg-gray-50 disabled:opacity-40">{label(status)}</button>)}</div>
                {selectedRecord.document && <button onClick={() => window.open(selectedRecord.document ?? "", "_blank", "noopener,noreferrer")} className="h-10 rounded-lg border border-gray-200 px-4 text-[11px] font-bold uppercase tracking-wider hover:bg-gray-50">Open Attachment URL</button>}
                <div className="border-t border-gray-100 pt-5 flex items-start gap-3"><Fingerprint size={20} className="text-gray-500 mt-0.5" /><div><p className="text-[13px] font-bold text-black uppercase tracking-wider">Chain-of-custody source</p><p className="text-[11px] font-medium uppercase tracking-wider mt-1 text-blue-700">Official evidence packets come from the backend evidence PDF endpoint.</p></div></div>
              </div>
            </div>
          </div>
        </>, document.body
      )}

      {selectedReport && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setSelectedReport(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between px-7 pt-7 pb-4"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><ShieldAlert size={21} /></div><div><h2 className="text-[18px] font-bold text-black uppercase tracking-wide">Message Report {shortId(selectedReport.id)}</h2><p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Admin moderation review</p></div></div><button onClick={() => setSelectedReport(null)} className="p-2 text-gray-400 hover:text-gray-700"><X size={22} /></button></div>
              <div className="border-t border-gray-100" />
              <div className="px-7 py-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="rounded-xl border border-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reason</p><p className="mt-2 text-[13px] font-bold uppercase text-black">{label(selectedReport.reason)}</p></div><div className="rounded-xl border border-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</p><div className="mt-2"><Badge value={selectedReport.status} variant="report" /></div></div><div className="rounded-xl border border-gray-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Created</p><p className="mt-2 text-[12px] font-bold uppercase text-black">{formatDate(selectedReport.createdAt)}</p></div></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Reporter Note</p><div className="rounded-xl bg-gray-50 border-l-4 border-red-200 p-5"><p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">{selectedReport.note ?? "No reporter note supplied."}</p></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Reporter</p><div className="rounded-xl border border-gray-200 p-4"><p className="text-[13px] font-bold uppercase text-black">{selectedReport.reporter?.name ?? "Unknown"}</p><p className="text-[11px] text-gray-500 mt-1">{selectedReport.reporter?.email ?? "N/A"}</p></div></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Linked Message</p><div className="rounded-xl border border-gray-200 p-4"><p className="text-[13px] font-bold uppercase text-black">{shortId(selectedReport.messageId)}</p><p className="text-[11px] text-gray-500 mt-1">Task {shortId(selectedReport.message?.taskId)}</p></div></div></div>
                <label className="block space-y-2"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Review Decision</span><select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)} className="h-11 w-full rounded-lg border border-gray-200 px-3 text-[12px] font-bold uppercase"><option value="REVIEWED">Reviewed</option><option value="DISMISSED">Dismissed</option><option value="ACTION_TAKEN">Action Taken</option></select></label>
                <label className="block space-y-2"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Review Note</span><textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} maxLength={1000} className="min-h-[100px] w-full rounded-xl border border-gray-200 p-3 text-[13px] outline-none focus:border-black" placeholder="Optional admin note stored on the report" /></label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{canUpdate && <button onClick={() => void handleReviewReport()} disabled={reviewingReport} className="h-11 rounded-lg bg-black text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 size={14} /> Save Review</button>}<button onClick={() => void handleEvidenceDownload(asEvidenceRecord(selectedReport))} className="h-11 rounded-lg border border-gray-200 text-[11px] font-bold uppercase tracking-wider hover:bg-gray-50 flex items-center justify-center gap-2"><Download size={14} /> Evidence</button>{canDelete && <button onClick={() => void handleDeleteReport(selectedReport)} disabled={deletingReport} className="h-11 rounded-lg border border-red-200 text-red-600 text-[11px] font-bold uppercase tracking-wider hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50"><Trash2 size={14} /> Delete</button>}</div>
              </div>
            </div>
          </div>
        </>, document.body
      )}
    </div>
  );
};

export default MessagesPage;
