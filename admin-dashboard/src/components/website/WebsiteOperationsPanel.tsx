import React, { useEffect, useState } from "react";
import { CheckCircle2, Copy, Eye, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import {
  useApproveWebsiteScreenshotVerificationMutation,
  useCreateWebsiteCategoryKeyMutation,
  useCreateWebsiteMarketplaceTagMutation,
  useDeleteWebsiteCategoryKeyMutation,
  useDeleteWebsiteMarketplaceTagMutation,
  useGetWebsiteCategoryKeysQuery,
  useGetWebsiteMarketplaceTagsQuery,
  useGetWebsiteVerificationDetailsQuery,
  useGetWebsiteVerificationMetaTagQuery,
  useGetWebsiteVerificationRequestsQuery,
  useRejectWebsiteScreenshotVerificationMutation,
  useUpdateWebsiteCategoryKeyMutation,
  useUpdateWebsiteMarketplaceTagMutation,
  useUpdateWebsiteVerificationMetaTagMutation,
  type WebsiteTaxonomyItem,
  type WebsiteVerificationRequestParams,
} from "../../redux/feature/website/websiteApi";

const inputClass = "h-[42px] w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-800 outline-none placeholder:text-gray-300 focus:border-[#331FFD]";
const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-400";
const primaryButtonClass = "inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-black px-4 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50";
const ghostButtonClass = "inline-flex h-[36px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

type NoticeState = { type: "success" | "error"; text: string } | null;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null) {
      const message = (data as { message?: unknown }).message;
      const errorText = (data as { error?: unknown }).error;
      if (Array.isArray(message)) return message.join(" ");
      if (typeof message === "string") return message;
      if (typeof errorText === "string") return errorText;
    }
  }
  return error instanceof Error ? error.message : fallback;
};

const normalizeToken = (value: string) => value.trim().toUpperCase();

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const Notice = ({ notice }: { notice: NoticeState }) =>
  notice ? (
    <div className={`rounded-lg border px-4 py-3 text-[12px] font-bold uppercase tracking-wide ${notice.type === "success" ? "border-green-100 bg-green-50 text-[#008236]" : "border-red-100 bg-red-50 text-[#C10007]"}`}>
      {notice.text}
    </div>
  ) : null;

const SectionShell = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-gray-200 bg-white">
    <div className="border-b border-gray-100 px-6 py-4">
      <h2 className="text-[15px] font-bold uppercase tracking-[0.05em] text-black">{title}</h2>
      <p className="mt-1 text-[12px] font-medium uppercase tracking-wide text-gray-400">{description}</p>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const TaxonomyRows = ({ items, emptyText, editingId, editValue, label, disabled, onEdit, onEditValueChange, onSave, onCancel, onDelete }: {
  items: WebsiteTaxonomyItem[];
  emptyText: string;
  editingId: string | null;
  editValue: string;
  label: "key" | "tag";
  disabled: boolean;
  onEdit: (item: WebsiteTaxonomyItem) => void;
  onEditValueChange: (value: string) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}) => {
  if (!items.length) return <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-[12px] font-bold uppercase tracking-wider text-gray-400">{emptyText}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead><tr className="border-b border-gray-100"><th className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Value</th><th className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th><th className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Updated</th><th className="px-2 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Action</th></tr></thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item) => {
            const value = item[label] ?? item.slug ?? item.name;
            const isEditing = editingId === item.id;
            return (
              <tr key={item.id}>
                <td className="px-2 py-3">{isEditing ? <input className={inputClass} value={editValue} onChange={(event) => onEditValueChange(event.target.value)} /> : <span className="text-[13px] font-bold uppercase text-black">{value}</span>}</td>
                <td className="px-2 py-3"><span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#008236]">{item.enabled ? "Enabled" : "Disabled"}</span></td>
                <td className="px-2 py-3 text-[12px] font-medium uppercase tracking-wide text-gray-400">{formatDate(item.updatedAt)}</td>
                <td className="px-2 py-3"><div className="flex justify-end gap-2">{isEditing ? <><button type="button" className={ghostButtonClass} onClick={() => onSave(item.id)} disabled={disabled}><Save size={14} /> Save</button><button type="button" className={ghostButtonClass} onClick={onCancel} disabled={disabled}><X size={14} /> Cancel</button></> : <><button type="button" className={ghostButtonClass} onClick={() => onEdit(item)} disabled={disabled}><Pencil size={14} /> Edit</button><button type="button" className={ghostButtonClass} onClick={() => onDelete(item.id)} disabled={disabled}><Trash2 size={14} /> Delete</button></>}</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const CategoryKeyPanel = () => {
  const { data, isFetching } = useGetWebsiteCategoryKeysQuery();
  const [createKey, { isLoading: isCreating }] = useCreateWebsiteCategoryKeyMutation();
  const [updateKey, { isLoading: isUpdating }] = useUpdateWebsiteCategoryKeyMutation();
  const [deleteKey, { isLoading: isDeleting }] = useDeleteWebsiteCategoryKeyMutation();
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const busy = isCreating || isUpdating || isDeleting;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const key = normalizeToken(newValue);
    if (!key) return setNotice({ type: "error", text: "Category key is required." });
    try {
      const response = await createKey({ key }).unwrap();
      setNewValue("");
      setNotice({ type: "success", text: response.message });
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Category key could not be created.") });
    }
  };

  const save = async (id: string) => {
    const key = normalizeToken(editValue);
    if (!key) return setNotice({ type: "error", text: "Category key is required." });
    try {
      const response = await updateKey({ id, key }).unwrap();
      setEditingId(null);
      setEditValue("");
      setNotice({ type: "success", text: response.message });
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Category key could not be updated.") });
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this website category key?")) return;
    try {
      const response = await deleteKey(id).unwrap();
      setNotice({ type: "success", text: response.message });
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Category key could not be deleted.") });
    }
  };

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
        <div className="flex-1"><label className={labelClass}>New Category Key</label><input className={inputClass} placeholder="E-COMMERCE" value={newValue} onChange={(event) => setNewValue(event.target.value)} /></div>
        <button className={`${primaryButtonClass} mt-auto`} disabled={busy} type="submit"><Plus size={15} /> Create Key</button>
      </form>
      <Notice notice={notice} />
      {isFetching ? <div className="py-8 text-center text-[12px] font-bold uppercase tracking-wider text-gray-400">Loading category keys...</div> : (
        <TaxonomyRows items={data?.data ?? []} emptyText="No category keys found." editingId={editingId} editValue={editValue} label="key" disabled={busy} onEdit={(item) => { setEditingId(item.id); setEditValue(item.key ?? item.slug); }} onEditValueChange={setEditValue} onSave={save} onCancel={() => { setEditingId(null); setEditValue(""); }} onDelete={remove} />
      )}
    </div>
  );
};

const MarketplaceTagPanel = () => {
  const { data, isFetching } = useGetWebsiteMarketplaceTagsQuery();
  const [createTag, { isLoading: isCreating }] = useCreateWebsiteMarketplaceTagMutation();
  const [updateTag, { isLoading: isUpdating }] = useUpdateWebsiteMarketplaceTagMutation();
  const [deleteTag, { isLoading: isDeleting }] = useDeleteWebsiteMarketplaceTagMutation();
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const busy = isCreating || isUpdating || isDeleting;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tag = normalizeToken(newValue);
    if (!tag) return setNotice({ type: "error", text: "Marketplace tag is required." });
    try {
      const response = await createTag({ tag }).unwrap();
      setNewValue("");
      setNotice({ type: "success", text: response.message });
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Marketplace tag could not be created.") });
    }
  };

  const save = async (id: string) => {
    const tag = normalizeToken(editValue);
    if (!tag) return setNotice({ type: "error", text: "Marketplace tag is required." });
    try {
      const response = await updateTag({ id, tag }).unwrap();
      setEditingId(null);
      setEditValue("");
      setNotice({ type: "success", text: response.message });
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Marketplace tag could not be updated.") });
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this website marketplace tag?")) return;
    try {
      const response = await deleteTag(id).unwrap();
      setNotice({ type: "success", text: response.message });
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Marketplace tag could not be deleted.") });
    }
  };

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
        <div className="flex-1"><label className={labelClass}>New Marketplace Tag</label><input className={inputClass} placeholder="SEO" value={newValue} onChange={(event) => setNewValue(event.target.value)} /></div>
        <button className={`${primaryButtonClass} mt-auto`} disabled={busy} type="submit"><Plus size={15} /> Create Tag</button>
      </form>
      <Notice notice={notice} />
      {isFetching ? <div className="py-8 text-center text-[12px] font-bold uppercase tracking-wider text-gray-400">Loading marketplace tags...</div> : (
        <TaxonomyRows items={data?.data ?? []} emptyText="No marketplace tags found." editingId={editingId} editValue={editValue} label="tag" disabled={busy} onEdit={(item) => { setEditingId(item.id); setEditValue(item.tag ?? item.slug); }} onEditValueChange={setEditValue} onSave={save} onCancel={() => { setEditingId(null); setEditValue(""); }} onDelete={remove} />
      )}
    </div>
  );
};

const VerificationMetaTagPanel = () => {
  const { data, isFetching } = useGetWebsiteVerificationMetaTagQuery();
  const [updateMetaTag, { isLoading }] = useUpdateWebsiteVerificationMetaTagMutation();
  const [metaName, setMetaName] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    if (data?.data) {
      setMetaName(data.data.metaName);
      setVerificationToken(data.data.verificationToken);
    }
  }, [data]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!metaName.trim() || !verificationToken.trim()) return setNotice({ type: "error", text: "Meta name and token are required." });
    try {
      const response = await updateMetaTag({ metaName: metaName.trim(), verificationToken: verificationToken.trim() }).unwrap();
      setNotice({ type: "success", text: response.message });
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Meta tag could not be saved.") });
    }
  };

  const snippet = `<meta name="${metaName || "backlyst-verification"}" content="${verificationToken || "token"}" />`;

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div><label className={labelClass}>Meta Name</label><input className={inputClass} value={metaName} onChange={(event) => setMetaName(event.target.value)} disabled={isFetching} /></div>
        <div><label className={labelClass}>Verification Token</label><input className={inputClass} value={verificationToken} onChange={(event) => setVerificationToken(event.target.value)} disabled={isFetching} /></div>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between">
        <code className="break-all text-[12px] font-bold text-gray-700">{snippet}</code>
        <button type="button" className={ghostButtonClass} onClick={() => navigator.clipboard?.writeText(snippet)}><Copy size={14} /> Copy</button>
      </div>
      <Notice notice={notice} />
      <button className={primaryButtonClass} disabled={isLoading || isFetching} type="submit"><Save size={15} /> Save Meta Tag</button>
    </form>
  );
};

const VerificationReviewModal = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const { data, isFetching, isError } = useGetWebsiteVerificationDetailsQuery(id);
  const [approve, { isLoading: isApproving }] = useApproveWebsiteScreenshotVerificationMutation();
  const [reject, { isLoading: isRejecting }] = useRejectWebsiteScreenshotVerificationMutation();
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const busy = isApproving || isRejecting;

  const approveRequest = async () => {
    if (!data) return;
    try {
      const response = await approve({ websiteId: data.websiteId, manualReviewNotes: notes.trim() || "Verification proof reviewed and accepted by admin." }).unwrap();
      setNotice({ type: "success", text: response.message });
      window.setTimeout(onClose, 700);
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Verification could not be approved.") });
    }
  };

  const rejectRequest = async () => {
    if (!data) return;
    if (!reason.trim()) return setNotice({ type: "error", text: "Rejection reason is required." });
    try {
      const response = await reject({ websiteId: data.websiteId, rejectionReason: reason.trim(), manualReviewNotes: notes.trim() || "Verification proof reviewed and rejected by admin." }).unwrap();
      setNotice({ type: "success", text: response.message });
      window.setTimeout(onClose, 700);
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Verification could not be rejected.") });
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div><h3 className="text-[16px] font-bold uppercase tracking-wider text-black">Verification Review</h3><p className="mt-1 text-[12px] font-medium uppercase tracking-wide text-gray-400">Request ID: {id}</p></div>
          <button className="p-1.5 text-gray-400 hover:text-gray-700" onClick={onClose} type="button"><X size={20} /></button>
        </div>
        <div className="space-y-5 p-6">
          {isFetching && <div className="py-10 text-center text-[12px] font-bold uppercase tracking-wider text-gray-400">Loading verification details...</div>}
          {isError && <Notice notice={{ type: "error", text: "Verification details could not be loaded." }} />}
          {data && (
            <>
              <div className="grid gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-2">
                <div><p className={labelClass}>Website</p><p className="text-[15px] font-bold uppercase text-black">{data.website?.name || "N/A"}</p><a href={data.website?.websiteUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[12px] font-bold text-[#155DFC] hover:underline">{data.website?.websiteUrl}</a></div>
                <div><p className={labelClass}>Owner</p><p className="text-[15px] font-bold uppercase text-black">{data.website?.author?.name || "N/A"}</p><p className="text-[12px] font-medium text-gray-400">{data.website?.author?.email || "N/A"}</p></div>
                <div><p className={labelClass}>Status / Type</p><p className="text-[13px] font-bold uppercase text-black">{data.status} / {data.type}</p></div>
                <div><p className={labelClass}>Submitted</p><p className="text-[13px] font-bold uppercase text-black">{formatDate(data.createdAt)}</p></div>
              </div>
              {data.screenshotUrl && <div><p className={labelClass}>Screenshot Proof</p><a href={data.screenshotUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-200"><img src={data.screenshotUrl} alt="Website verification proof" className="max-h-[340px] w-full bg-gray-50 object-contain" /></a></div>}
              {data.responseData && <div className="rounded-lg border border-gray-100 bg-gray-50 p-4"><p className={labelClass}>Verification Response</p><pre className="max-h-[180px] overflow-auto whitespace-pre-wrap text-[12px] font-medium text-gray-700">{data.responseData}</pre></div>}
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={labelClass}>Internal Notes</label><textarea className="min-h-[104px] w-full rounded-lg border border-gray-200 px-3 py-3 text-[13px] font-medium text-gray-800 outline-none focus:border-[#331FFD]" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></div>
                <div><label className={labelClass}>Rejection Reason</label><textarea className="min-h-[104px] w-full rounded-lg border border-gray-200 px-3 py-3 text-[13px] font-medium text-gray-800 outline-none focus:border-[#331FFD]" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Required only when rejecting" /></div>
              </div>
              <Notice notice={notice} />
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><button className={ghostButtonClass} onClick={onClose} disabled={busy} type="button">Cancel</button><button className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-[#C10007] px-4 text-[12px] font-bold uppercase tracking-wider text-white disabled:opacity-50" onClick={rejectRequest} disabled={busy} type="button"><X size={15} /> Reject</button><button className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-[#008236] px-4 text-[12px] font-bold uppercase tracking-wider text-white disabled:opacity-50" onClick={approveRequest} disabled={busy} type="button"><CheckCircle2 size={15} /> Approve</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const VerificationRequestsPanel = () => {
  const [filters, setFilters] = useState<WebsiteVerificationRequestParams>({ page: 1, limit: 8 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isFetching, refetch } = useGetWebsiteVerificationRequestsQuery(filters);
  const rows = data?.data.data ?? [];
  const meta = data?.data.meta;

  const apply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ page: 1, limit: 8, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}), ...(type ? { type } : {}) });
  };

  return (
    <div className="space-y-4">
      <form className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto_auto]" onSubmit={apply}>
        <div><label className={labelClass}>Search</label><input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Domain, country, industry" /></div>
        <div><label className={labelClass}>Status</label><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All</option><option value="PENDING">Pending</option><option value="REQUESTED_FOR_MANUAL_REVIEW">Manual Review</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="VERIFICATION_FAILED">Failed</option></select></div>
        <div><label className={labelClass}>Type</label><select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}><option value="">All</option><option value="SCREENSHOT_URL">Screenshot</option><option value="HTML_META_TAG">HTML Meta Tag</option><option value="DNS_TXT_RECORD">DNS TXT Record</option><option value="MANUAL_REVIEW">Manual Review</option></select></div>
        <button className={`${primaryButtonClass} mt-auto`} type="submit"><Search size={15} /> Filter</button>
        <button className={`${ghostButtonClass} mt-auto h-[42px]`} type="button" onClick={() => refetch()}><RefreshCw size={15} /> Refresh</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead><tr className="border-b border-gray-100"><th className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Request</th><th className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Website ID</th><th className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th><th className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Created</th><th className="px-2 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-2 py-3"><p className="text-[13px] font-bold uppercase text-black">{row.type}</p><p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">{row.id}</p></td>
                <td className="px-2 py-3 text-[12px] font-bold text-gray-700">{row.websiteId}</td>
                <td className="px-2 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#155DFC]">{row.status.replaceAll("_", " ")}</span></td>
                <td className="px-2 py-3 text-[12px] font-medium uppercase tracking-wide text-gray-400">{formatDate(row.createdAt)}</td>
                <td className="px-2 py-3 text-right"><button className={ghostButtonClass} onClick={() => setSelectedId(row.id)} type="button"><Eye size={14} /> Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-[12px] font-bold uppercase tracking-wider text-gray-400">{isFetching ? "Loading verification requests..." : "No verification requests found."}</div>}
      {meta && <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-gray-400"><span>{meta.total} Requests</span><span>Page {meta.page} of {meta.totalPages || 1}</span></div>}
      {selectedId && <VerificationReviewModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
};

const WebsiteOperationsPanel = () => (
  <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionShell title="Website Category Keys" description="Create, update, and retire marketplace category keys."><CategoryKeyPanel /></SectionShell>
      <SectionShell title="Website Marketplace Tags" description="Manage website discovery tags used across marketplace surfaces."><MarketplaceTagPanel /></SectionShell>
    </div>
    <SectionShell title="Verification Meta Tag" description="Global HTML meta tag issued to website owners for ownership verification."><VerificationMetaTagPanel /></SectionShell>
    <SectionShell title="Verification Requests" description="Admin queue for pending, screenshot, DNS, meta-tag, and manual review requests.">
      <VerificationRequestsPanel />
    </SectionShell>
  </div>
);

export default WebsiteOperationsPanel;

