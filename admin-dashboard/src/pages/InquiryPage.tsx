import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  Archive,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  type ContactEnquiry,
  type EnquiryStatus,
  useDeleteContactEnquiryMutation,
  useGetContactEnquiriesQuery,
  useGetContactEnquiryQuery,
  useUpdateContactEnquiryMutation,
} from "@/redux/feature/contact/contactApi";
import { usePermissions } from "../utils/usePermissions";

type StatusFilter = "ALL" | EnquiryStatus;
type ReadFilter = "ALL" | "READ" | "UNREAD";
type Notice = { type: "success" | "error"; text: string } | null;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All Statuses" },
  { value: "NEW", label: "New" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ARCHIVED", label: "Archived" },
];

const READ_OPTIONS: Array<{ value: ReadFilter; label: string }> = [
  { value: "ALL", label: "All Read States" },
  { value: "UNREAD", label: "Unread" },
  { value: "READ", label: "Read" },
];

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  NEW: "bg-blue-50 text-[#155DFC] border-blue-100",
  RESOLVED: "bg-green-50 text-[#008236] border-green-100",
  ARCHIVED: "bg-gray-100 text-gray-600 border-gray-200",
};

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
  });
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybe = error as { data?: { message?: string | string[] }; message?: string };
  const message = maybe?.data?.message ?? maybe?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
};

const InquiryPage: React.FC = () => {
  const { can } = usePermissions();
  const canUpdate = can("CONTACT", "canUpdate");
  const canDelete = can("CONTACT", "canDelete");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const queryParams = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    isRead: readFilter === "ALL" ? undefined : readFilter === "READ",
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [dateFrom, dateTo, page, readFilter, search, status]);

  const { data, isFetching, isLoading, isError, refetch } = useGetContactEnquiriesQuery(queryParams);
  const { data: allCount } = useGetContactEnquiriesQuery({ page: 1, limit: 1 });
  const { data: newCount } = useGetContactEnquiriesQuery({ page: 1, limit: 1, status: "NEW" });
  const { data: unreadCount } = useGetContactEnquiriesQuery({ page: 1, limit: 1, isRead: false });
  const { data: selectedResponse, isFetching: isFetchingSelected } = useGetContactEnquiryQuery(selectedId || "", { skip: !selectedId });
  const selectedEnquiry = selectedResponse?.data ?? data?.data.find((item) => item.id === selectedId) ?? null;

  const [updateEnquiry, { isLoading: isUpdating }] = useUpdateContactEnquiryMutation();
  const [deleteEnquiry, { isLoading: isDeleting }] = useDeleteContactEnquiryMutation();

  const enquiries = data?.data ?? [];
  const meta = data?.meta;

  const showNotice = (nextNotice: Notice) => {
    setNotice(nextNotice);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const updateStatus = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const updateReadFilter = (value: ReadFilter) => {
    setReadFilter(value);
    setPage(1);
  };

  const closeModal = () => {
    setSelectedId(null);
    setReplyMessage("");
  };

  const patchSelected = async (body: { isRead?: boolean; status?: EnquiryStatus; replyMessage?: string }, successMessage: string) => {
    if (!selectedId) return;
    try {
      await updateEnquiry({ id: selectedId, ...body }).unwrap();
      showNotice({ type: "success", text: successMessage });
      if (body.status === "RESOLVED" || body.status === "ARCHIVED") closeModal();
    } catch (error) {
      showNotice({ type: "error", text: getErrorMessage(error, "Failed to update support inquiry.") });
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const shouldDelete = window.confirm("Delete this support inquiry? This cannot be undone.");
    if (!shouldDelete) return;
    try {
      await deleteEnquiry(selectedId).unwrap();
      showNotice({ type: "success", text: "Support inquiry deleted." });
      closeModal();
    } catch (error) {
      showNotice({ type: "error", text: getErrorMessage(error, "Failed to delete support inquiry.") });
    }
  };

  const statCards = [
    { label: "Total Inquiries", value: allCount?.meta.total ?? 0, icon: Mail, tone: "text-[#155DFC]" },
    { label: "New Queue", value: newCount?.meta.total ?? 0, icon: Clock, tone: "text-[#F54900]" },
    { label: "Unread", value: unreadCount?.meta.total ?? 0, icon: MessageSquare, tone: "text-[#E7000B]" },
  ];

  return (
    <div className="w-full font-arimo space-y-4 sm:space-y-6">
      <section className="space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-bold text-[#000] uppercase tracking-tight leading-tight">
              Support Inquiries
            </h1>
            <p className="text-[10px] sm:text-[11px] text-[#717680] font-medium mt-1 uppercase tracking-[0.04em] leading-relaxed">
              Admin contact enquiry queue with status, read-state, reply, archive, and deletion controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-[36px] px-4 border border-[#D1D5DC] rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 self-start hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh Queue
          </button>
        </div>
        {notice && (
          <div className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${notice.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {notice.text}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#717680] uppercase tracking-wider">{stat.label}</p>
              <p className="text-[28px] font-bold text-[#000] leading-tight mt-1">{stat.value.toLocaleString()}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center ${stat.tone}`}>
              <stat.icon size={21} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_170px_170px] gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717680]" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Search name, email, company, or subject"
              className="h-[38px] w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-[12px] font-bold text-[#000] outline-none focus:border-[#155DFC]"
            />
          </div>
          <select value={status} onChange={(event) => updateStatus(event.target.value as StatusFilter)} className="h-[38px] rounded-lg border border-[#E5E7EB] bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[#414651] outline-none focus:border-[#155DFC]">
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={readFilter} onChange={(event) => updateReadFilter(event.target.value as ReadFilter)} className="h-[38px] rounded-lg border border-[#E5E7EB] bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[#414651] outline-none focus:border-[#155DFC]">
            {READ_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex flex-wrap gap-2.5">
            <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="h-[38px] rounded-lg border border-[#E5E7EB] bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#414651] outline-none focus:border-[#155DFC]" />
            <input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="h-[38px] rounded-lg border border-[#E5E7EB] bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-[#414651] outline-none focus:border-[#155DFC]" />
            <button type="button" onClick={applySearch} className="h-[38px] rounded-lg bg-[#101828] px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#1D2939]">Apply Search</button>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#717680]">
            {meta?.total ?? 0} matching enquiries
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[940px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC]">
                {["Inquiry Details", "Contact", "Status", "Read State", "Submitted", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-[9px] font-bold text-[#717680] uppercase tracking-widest">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold uppercase tracking-wider text-[#717680]"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading support enquiries</span></td></tr>
              ) : isError ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold uppercase tracking-wider text-red-600">Failed to load support enquiries.</td></tr>
              ) : enquiries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold uppercase tracking-wider text-[#717680]">No support enquiries found.</td></tr>
              ) : (
                enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-bold text-[#000] uppercase tracking-wide max-w-[280px] truncate">{enquiry.subject || "Untitled enquiry"}</p>
                      <p className="text-[10px] font-bold text-[#717680] uppercase tracking-wide mt-1 max-w-[360px] truncate">{enquiry.message}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <User size={14} className="text-[#717680] mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#000] uppercase truncate max-w-[210px]">{enquiry.name}</p>
                          <a href={`mailto:${enquiry.email}`} className="text-[10px] font-bold text-[#155DFC] truncate max-w-[210px] block hover:underline">{enquiry.email}</a>
                          {enquiry.company && <p className="text-[10px] font-bold text-[#717680] uppercase truncate max-w-[210px]">{enquiry.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={enquiry.status} /></td>
                    <td className="px-4 py-4"><ReadBadge isRead={enquiry.isRead} /></td>
                    <td className="px-4 py-4"><span className="text-[11px] font-bold text-[#414651] uppercase">{formatDateTime(enquiry.createdAt)}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button type="button" onClick={() => { setSelectedId(enquiry.id); setReplyMessage(""); }} className="h-[30px] px-3 rounded-lg border border-blue-100 bg-blue-50 text-[10px] font-bold uppercase tracking-wider text-[#155DFC] flex items-center gap-1.5 hover:bg-blue-100">
                          <MessageSquare size={12} /> View
                        </button>
                        <a href={`mailto:${enquiry.email}`} className="h-[30px] w-[30px] rounded-lg border border-[#E5E7EB] text-[#717680] flex items-center justify-center hover:text-[#155DFC] hover:bg-gray-50" title="Email contact">
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#E5E7EB] px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#717680]">
            Page {meta?.page ?? page} of {meta?.totalPages ?? 1} - {meta?.total ?? 0} total
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={isFetching || (meta?.page ?? page) <= 1} className="h-[32px] rounded-lg border border-[#E5E7EB] px-3 text-[10px] font-bold uppercase tracking-wider text-[#414651] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            <button type="button" onClick={() => setPage((current) => Math.min(meta?.totalPages ?? current, current + 1))} disabled={isFetching || (meta?.page ?? page) >= (meta?.totalPages ?? 1)} className="h-[32px] rounded-lg border border-[#E5E7EB] px-3 text-[10px] font-bold uppercase tracking-wider text-[#414651] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>

      {selectedId && (
        <InquiryModal
          enquiry={selectedEnquiry}
          loading={isFetchingSelected}
          updating={isUpdating}
          deleting={isDeleting}
          replyMessage={replyMessage}
          setReplyMessage={setReplyMessage}
          onClose={closeModal}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onMarkRead={(isRead) => patchSelected({ isRead }, isRead ? "Inquiry marked read." : "Inquiry marked unread.")}
          onResolve={() => patchSelected({ status: "RESOLVED", isRead: true, replyMessage: replyMessage.trim() }, "Inquiry resolved and reply sent when mail delivery is available.")}
          onArchive={() => patchSelected({ status: "ARCHIVED", isRead: true }, "Inquiry archived.")}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: EnquiryStatus }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}>
    {status}
  </span>
);

const ReadBadge = ({ isRead }: { isRead: boolean }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${isRead ? "bg-gray-50 text-gray-500 border-gray-200" : "bg-red-50 text-red-600 border-red-100"}`}>
    {isRead ? "Read" : "Unread"}
  </span>
);

const InquiryModal = ({
  enquiry,
  loading,
  updating,
  deleting,
  replyMessage,
  setReplyMessage,
  onClose,
  onMarkRead,
  onResolve,
  onArchive,
  onDelete,
  canUpdate,
  canDelete,
}: {
  enquiry: ContactEnquiry | null;
  loading: boolean;
  updating: boolean;
  deleting: boolean;
  replyMessage: string;
  setReplyMessage: (value: string) => void;
  onClose: () => void;
  onMarkRead: (isRead: boolean) => void;
  onResolve: () => void;
  onArchive: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) => ReactDOM.createPortal(
  <>
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-[13px] sm:text-[14px] font-bold text-[#000] uppercase tracking-wide">Support Inquiry</h2>
            <p className="text-[9px] sm:text-[10px] text-[#717680] uppercase tracking-wide">Contact admin queue detail</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-[#717680] hover:text-[#000] transition-colors"><X size={18} /></button>
        </div>
        {loading || !enquiry ? (
          <div className="p-8 text-center text-[12px] font-bold uppercase tracking-wider text-[#717680]"><Loader2 size={16} className="animate-spin inline mr-2" /> Loading inquiry</div>
        ) : (
          <div className="p-4 sm:p-5 space-y-5">
            <div className="rounded-xl p-4 sm:p-5 space-y-4" style={{ background: "linear-gradient(135deg, #101828 0%, #1E2939 100%)" }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#8EC5FF" }}>Subject</p>
                  <p className="text-[15px] font-bold text-white uppercase mt-1">{enquiry.subject || "Untitled enquiry"}</p>
                </div>
                <div className="flex gap-2"><StatusBadge status={enquiry.status} /><ReadBadge isRead={enquiry.isRead} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Name" value={enquiry.name} dark />
                <DetailItem label="Email" value={enquiry.email} dark />
                <DetailItem label="Company" value={enquiry.company || "N/A"} dark />
                <DetailItem label="Phone" value={enquiry.phone || "N/A"} dark />
                <DetailItem label="Submitted" value={formatDateTime(enquiry.createdAt)} dark />
                <DetailItem label="Updated" value={formatDateTime(enquiry.updatedAt)} dark />
              </div>
            </div>

            <div className="border border-[#E5E7EB] rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#717680] mb-2">Message</p>
              <p className="text-[13px] font-medium leading-relaxed text-[#364153] whitespace-pre-wrap">{enquiry.message}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#717680]">Resolution Reply</label>
              <textarea
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                maxLength={1000}
                placeholder="Write the response that should be emailed when marking this enquiry resolved."
                className="min-h-[120px] w-full rounded-xl border border-[#E5E7EB] px-3 py-3 text-[13px] font-medium text-[#364153] outline-none focus:border-[#155DFC] resize-y"
              />
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#717680] text-right">{replyMessage.length}/1000</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {canUpdate && (
                <button type="button" onClick={() => onMarkRead(!enquiry.isRead)} disabled={updating} className="h-[42px] rounded-lg border border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider text-[#414651] hover:bg-gray-50 disabled:opacity-50">
                  {enquiry.isRead ? "Mark Unread" : "Mark Read"}
                </button>
              )}
              {canUpdate && (
                <button type="button" onClick={onArchive} disabled={updating || enquiry.status === "ARCHIVED"} className="h-[42px] rounded-lg border border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider text-[#414651] hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"><Archive size={14} /> Archive</button>
              )}
              {canDelete && (
                <button type="button" onClick={onDelete} disabled={deleting} className="h-[42px] rounded-lg border border-red-100 bg-red-50 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"><Trash2 size={14} /> {deleting ? "Deleting" : "Delete"}</button>
              )}
              {canUpdate && (
                <button type="button" onClick={onResolve} disabled={updating || !replyMessage.trim() || enquiry.status === "RESOLVED"} className="h-[42px] rounded-lg bg-[#00C950] text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#00b045] disabled:opacity-50 flex items-center justify-center gap-2"><CheckCircle2 size={14} /> {updating ? "Resolving" : "Resolve & Reply"}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </>,
  document.body,
);

const DetailItem = ({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) => (
  <div>
    <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest" style={{ color: dark ? "#8EC5FF" : "#717680" }}>{label}</p>
    <p className="text-[12px] sm:text-[13px] font-bold uppercase mt-0.5 break-words" style={{ color: dark ? "#FFFFFF" : "#000000" }}>{value}</p>
  </div>
);

export default InquiryPage;
