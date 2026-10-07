import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Users,
  Plus,
  X,
  ChevronRight,
  Shield,
  Crown,
  Trash2,
  Edit3,
  Check,
  Loader2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Info,
  Search,
} from "lucide-react";
import {
  useGetAdminListQuery,
  useGetAdminByIdQuery,
  useGetAuthorizationSectionsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
  useReplaceAdminPermissionsMutation,
  type AdminAccount,
} from "../redux/feature/authorization/authorizationApi";
import type { AdminPermission } from "../redux/feature/auth/adminProfileApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
  DELETED: "bg-red-50 text-red-600 border-red-200",
};

// Section → display label + category colour
const SECTION_META: Record<string, { label: string; category: string; color: string }> = {
  DASHBOARD:          { label: "Dashboard",           category: "Core",       color: "#331ffd" },
  ANALYTICS:          { label: "Analytics",           category: "Core",       color: "#6366f1" },
  ADMIN_MANAGEMENT:   { label: "Admin Management",    category: "Core",       color: "#8b5cf6" },
  USERS:              { label: "Users & Accounts",    category: "People",     color: "#0ea5e9" },
  MESSAGING:          { label: "Messaging",           category: "People",     color: "#06b6d4" },
  NOTIFICATIONS:      { label: "Notifications",       category: "People",     color: "#0891b2" },
  WEBSITES:           { label: "Websites",            category: "Content",    color: "#10b981" },
  BLOG:               { label: "Blog",                category: "Content",    color: "#059669" },
  COMMUNITY_SHOWCASE: { label: "Community Showcase",  category: "Content",    color: "#34d399" },
  TAXONOMY:           { label: "Taxonomy",            category: "Content",    color: "#6ee7b7" },
  MARKETPLACE:        { label: "Marketplace",         category: "Finance",    color: "#f59e0b" },
  CREDITS:            { label: "Credits",             category: "Finance",    color: "#d97706" },
  SUBSCRIPTIONS:      { label: "Subscriptions",       category: "Finance",    color: "#b45309" },
  REFERRALS:          { label: "Referrals",           category: "Finance",    color: "#92400e" },
  REWARDS:            { label: "Rewards & Badges",    category: "Finance",    color: "#f97316" },
  TASKS:              { label: "Tasks",               category: "Operations", color: "#64748b" },
  CONTACT:            { label: "Support / Contact",   category: "Operations", color: "#475569" },
  COMPLIANCE:         { label: "Compliance",          category: "Governance", color: "#dc2626" },
  LEGAL_DOCS:         { label: "Legal Docs",          category: "Governance", color: "#b91c1c" },
  FORENSIC_AUDIT:     { label: "Forensic Audit",      category: "Governance", color: "#991b1b" },
  PLATFORM_SETTINGS:  { label: "Platform Settings",   category: "Governance", color: "#7f1d1d" },
};

const getSectionMeta = (section: string) =>
  SECTION_META[section] ?? { label: section, category: "Other", color: "#6b7280" };

// Build a blank permission for a section
const blankPerm = (section: string): AdminPermission => ({
  section,
  canCreate: false,
  canRead: false,
  canUpdate: false,
  canDelete: false,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleBadge = ({ role }: { role: string }) => {
  if (role === "SUPER_ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
        <Crown size={10} />
        Super Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-indigo-soft text-brand-indigo text-[10px] font-black uppercase tracking-wider border border-brand-indigo/20">
      <Shield size={10} />
      Admin
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}
  >
    {status}
  </span>
);

// Toggle switch for permission flags
const PermToggle = ({
  checked,
  onChange,
  disabled,
  label,
  color,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  color: string;
}) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    title={label}
    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all select-none ${
      disabled
        ? "opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border border-gray-100"
        : checked
        ? "text-white border"
        : "bg-gray-50 text-gray-400 border border-gray-200 hover:border-gray-300"
    }`}
    style={checked && !disabled ? { backgroundColor: color, borderColor: color } : {}}
  >
    {checked ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
    {label}
  </button>
);

// ─── Permission Matrix Row ────────────────────────────────────────────────────

const PermissionRow = ({
  permission,
  onChange,
  disabled,
}: {
  permission: AdminPermission;
  onChange: (updated: AdminPermission) => void;
  disabled?: boolean;
}) => {
  const meta = getSectionMeta(permission.section);
  const toggle = (flag: keyof Omit<AdminPermission, "section">) => {
    onChange({ ...permission, [flag]: !permission[flag] });
  };
  const anyEnabled =
    permission.canRead || permission.canCreate || permission.canUpdate || permission.canDelete;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        anyEnabled ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100"
      }`}
    >
      {/* Section label */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: meta.color }}
        />
        <div className="min-w-0">
          <p className="text-[12px] font-black text-gray-900 uppercase tracking-wide truncate">
            {meta.label}
          </p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            {meta.category}
          </p>
        </div>
      </div>
      {/* Toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <PermToggle checked={permission.canRead}   onChange={() => toggle("canRead")}   disabled={disabled} label="Read"   color={meta.color} />
        <PermToggle checked={permission.canCreate} onChange={() => toggle("canCreate")} disabled={disabled} label="Create" color={meta.color} />
        <PermToggle checked={permission.canUpdate} onChange={() => toggle("canUpdate")} disabled={disabled} label="Update" color={meta.color} />
        <PermToggle checked={permission.canDelete} onChange={() => toggle("canDelete")} disabled={disabled} label="Delete" color={meta.color} />
      </div>
    </div>
  );
};

// ─── Create Admin Modal ───────────────────────────────────────────────────────

const CreateAdminModal = ({
  onClose,
  sections,
}: {
  onClose: () => void;
  sections: string[];
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [perms, setPerms] = useState<AdminPermission[]>(
    sections.map((s) => blankPerm(s))
  );
  const [error, setError] = useState("");
  const [createAdmin, { isLoading }] = useCreateAdminMutation();

  const updatePerm = useCallback((updated: AdminPermission) => {
    setPerms((prev) =>
      prev.map((p) => (p.section === updated.section ? updated : p))
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const activePerms = perms.filter(
      (p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete
    );
    try {
      await createAdmin({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
        ...(company.trim() ? { companyName: company.trim() } : {}),
        ...(activePerms.length > 0 ? { permissions: activePerms } : {}),
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message ?? "Failed to create admin. Please try again.");
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-end">
      <div className="h-full w-full max-w-[640px] bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
              Admin Management
            </p>
            <h2 className="text-[18px] font-black text-gray-900 uppercase tracking-wide">
              Create New Admin
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          {/* Profile fields */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Profile Details
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* Name */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Operations Admin"
                  className="w-full h-11 bg-gray-50 rounded-xl px-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none transition-all"
                />
              </div>
              {/* Email */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@backlyst.io"
                    className="w-full h-11 bg-gray-50 rounded-xl pl-10 pr-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none transition-all"
                  />
                </div>
              </div>
              {/* Password */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full h-11 bg-gray-50 rounded-xl px-4 pr-10 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {/* Phone + Company */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880..."
                      className="w-full h-11 bg-gray-50 rounded-xl pl-10 pr-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Company
                  </label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Inc."
                      className="w-full h-11 bg-gray-50 rounded-xl pl-10 pr-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permission matrix */}
          <div className="px-6 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Section Permissions
              </p>
              <span className="text-[10px] text-gray-400 font-medium">
                {perms.filter((p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete).length} sections enabled
              </span>
            </div>
            <div className="space-y-1.5">
              {perms.map((p) => (
                <PermissionRow
                  key={p.section}
                  permission={p}
                  onChange={updatePerm}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-3">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-[12px] font-bold text-red-600">{error}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={isLoading}
              className="flex-1 h-11 rounded-xl bg-[#331ffd] text-white text-[13px] font-bold hover:bg-[#5242ff] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {isLoading ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Edit Profile Panel ───────────────────────────────────────────────────────

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "SUSPENDED"];

const EditProfilePanel = ({
  admin,
  onClose,
}: {
  admin: AdminAccount;
  onClose: () => void;
}) => {
  const [name, setName] = useState(admin.name ?? "");
  const [phone, setPhone] = useState(admin.phoneNumber ?? "");
  const [company, setCompany] = useState(admin.companyName ?? "");
  const [country, setCountry] = useState(admin.country ?? "");
  const [status, setStatus] = useState(admin.status);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [updateAdmin, { isLoading }] = useUpdateAdminMutation();

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    const body: Record<string, string> = {};
    if (name.trim()) body.name = name.trim();
    if (phone.trim()) body.phoneNumber = phone.trim();
    if (company.trim()) body.companyName = company.trim();
    if (country.trim()) body.country = country.trim();
    body.status = status;

    if (Object.keys(body).length === 0) {
      setError("At least one field must be changed.");
      return;
    }
    try {
      await updateAdmin({ id: admin.id, body }).unwrap();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message ?? "Failed to update admin.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 bg-gray-50 rounded-xl px-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Phone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-11 bg-gray-50 rounded-xl pl-10 pr-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Company</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full h-11 bg-gray-50 rounded-xl pl-10 pr-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Country</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-11 bg-gray-50 rounded-xl pl-10 pr-4 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-11 bg-gray-50 rounded-xl px-4 text-[13px] font-bold text-gray-900 focus:ring-2 focus:ring-brand-indigo/10 outline-none appearance-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-[12px] font-bold text-red-600">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-10 rounded-xl border border-gray-200 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 h-10 rounded-xl bg-[#331ffd] text-white text-[12px] font-bold hover:bg-[#5242ff] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={13} className="animate-spin" /> : success ? <Check size={13} /> : null}
          {isLoading ? "Saving..." : success ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteConfirmModal = ({
  admin,
  onConfirm,
  onClose,
  isLoading,
}: {
  admin: AdminAccount;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) =>
  ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <div>
            <p className="text-[11px] font-black text-red-400 uppercase tracking-widest mb-0.5">Irreversible Action</p>
            <h3 className="text-[16px] font-black text-gray-900">Delete Admin Account</h3>
          </div>
        </div>
        <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-1">
          You are about to delete <span className="font-black text-gray-900">{admin.name}</span>.
        </p>
        <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-6">
          This will soft-delete the account and remove all stored permissions. The admin will lose all dashboard access immediately.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {isLoading ? "Deleting..." : "Delete Admin"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const DetailPanel = ({
  adminId,
  sections,
  onDeleted,
}: {
  adminId: string;
  sections: string[];
  onDeleted: () => void;
}) => {
  const { data, isFetching, isError, refetch } = useGetAdminByIdQuery(adminId);
  const admin = data?.data?.admin;

  const [localPerms, setLocalPerms] = useState<AdminPermission[]>([]);
  const [reason, setReason] = useState("");
  const [permDirty, setPermDirty] = useState(false);
  const [permSuccess, setPermSuccess] = useState(false);
  const [permError, setPermError] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"permissions" | "profile">("permissions");

  const [replacePerms, { isLoading: savingPerms }] = useReplaceAdminPermissionsMutation();
  const [deleteAdmin, { isLoading: deletingAdmin }] = useDeleteAdminMutation();

  // Sync localPerms when admin detail loads
  useEffect(() => {
    if (!admin) return;
    if (admin.role === "SUPER_ADMIN") {
      setLocalPerms(sections.map((s) => ({
        section: s, canCreate: true, canRead: true, canUpdate: true, canDelete: true,
      })));
    } else {
      const existing = admin.authorization?.permissions ?? [];
      const existingMap = new Map(existing.map((p) => [p.section, p]));
      setLocalPerms(sections.map((s) => existingMap.get(s) ?? blankPerm(s)));
    }
    setPermDirty(false);
    setPermError("");
    setPermSuccess(false);
  }, [admin, sections]);

  const handlePermChange = (updated: AdminPermission) => {
    setLocalPerms((prev) => prev.map((p) => (p.section === updated.section ? updated : p)));
    setPermDirty(true);
    setPermSuccess(false);
  };

  const handleSavePerms = async () => {
    if (!admin) return;
    setPermError("");
    const activePerms = localPerms.filter(
      (p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete
    );
    if (activePerms.length === 0) {
      setPermError("At least one section permission must be enabled.");
      return;
    }
    try {
      await replacePerms({
        id: admin.id,
        permissions: activePerms,
        reason: reason.trim() || undefined,
      }).unwrap();
      setPermDirty(false);
      setPermSuccess(true);
      setReason("");
      setTimeout(() => setPermSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setPermError(e?.data?.message ?? "Failed to save permissions.");
    }
  };

  const handleDelete = async () => {
    if (!admin) return;
    try {
      await deleteAdmin(admin.id).unwrap();
      setDeleteConfirmOpen(false);
      onDeleted();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setPermError(e?.data?.message ?? "Failed to delete admin.");
      setDeleteConfirmOpen(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
        <Loader2 size={24} className="animate-spin text-brand-indigo" />
        <p className="text-[12px] font-black text-gray-400 uppercase tracking-wider">Loading Admin Details...</p>
      </div>
    );
  }

  if (isError || !admin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
        <AlertTriangle size={24} className="text-red-400" />
        <p className="text-[12px] font-black text-gray-400 uppercase tracking-wider">Failed to load admin</p>
        <button onClick={() => void refetch()} className="text-[11px] font-black text-brand-indigo uppercase tracking-wider hover:underline">Retry</button>
      </div>
    );
  }

  const isSA = admin.role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col h-full">
      {/* Profile header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-indigo-soft to-white border border-brand-indigo/20 flex items-center justify-center text-[16px] font-black text-brand-indigo flex-shrink-0">
              {(admin.name ?? "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-black text-gray-900 truncate">{admin.name}</p>
              <p className="text-[12px] text-gray-400 font-medium truncate">{admin.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <RoleBadge role={admin.role} />
                <StatusBadge status={admin.status} />
              </div>
            </div>
          </div>
          <button
            onClick={() => void refetch()}
            className="p-2 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-all flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Meta */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {admin.phoneNumber && (
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-gray-300 flex-shrink-0" />
              <span className="text-[11px] text-gray-500 font-medium">{admin.phoneNumber}</span>
            </div>
          )}
          {admin.companyName && (
            <div className="flex items-center gap-2">
              <Building2 size={12} className="text-gray-300 flex-shrink-0" />
              <span className="text-[11px] text-gray-500 font-medium">{admin.companyName}</span>
            </div>
          )}
          {admin.country && (
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-gray-300 flex-shrink-0" />
              <span className="text-[11px] text-gray-500 font-medium">{admin.country}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-gray-300 flex-shrink-0" />
            <span className="text-[11px] text-gray-500 font-medium">
              Since {fmtDate(admin.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["permissions", "profile"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? "border-b-2 border-brand-indigo text-brand-indigo"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab === "permissions" ? "Permissions" : "Edit Profile"}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
        {activeTab === "permissions" && (
          <div className="space-y-4">
            {isSA && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Crown size={16} className="text-amber-500 flex-shrink-0" />
                <p className="text-[12px] font-bold text-amber-700">
                  Super Admin has implicit full access to all sections. Permissions cannot be edited.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Section Permissions</p>
              {!isSA && (
                <span className="text-[10px] text-gray-400 font-medium">
                  {localPerms.filter((p) => p.canRead || p.canCreate || p.canUpdate || p.canDelete).length}/{sections.length} active
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {localPerms.map((p) => (
                <PermissionRow
                  key={p.section}
                  permission={p}
                  onChange={handlePermChange}
                  disabled={isSA}
                />
              ))}
            </div>

            {!isSA && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Audit Reason <span className="text-gray-300">(Optional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe why permissions are being changed..."
                    maxLength={500}
                    rows={2}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[13px] font-medium text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-brand-indigo/10 outline-none resize-none"
                  />
                </div>

                {permError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                    <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                    <p className="text-[12px] font-bold text-red-600">{permError}</p>
                  </div>
                )}

                <button
                  onClick={handleSavePerms}
                  disabled={savingPerms || !permDirty}
                  className="w-full h-11 rounded-xl bg-[#331ffd] text-white text-[13px] font-bold hover:bg-[#5242ff] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingPerms ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : permSuccess ? (
                    <Check size={14} />
                  ) : null}
                  {savingPerms ? "Saving..." : permSuccess ? "Permissions Saved!" : "Save Permissions"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          isSA ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Info size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-[12px] font-bold text-amber-700">
                Super Admin profiles cannot be edited through this interface.
              </p>
            </div>
          ) : (
            <EditProfilePanel admin={admin} onClose={() => setActiveTab("permissions")} />
          )
        )}
      </div>

      {/* Footer actions */}
      {!isSA && (
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="w-full h-10 rounded-xl border border-red-200 text-red-500 text-[12px] font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            Delete Admin Account
          </button>
        </div>
      )}

      {deleteConfirmOpen && admin && (
        <DeleteConfirmModal
          admin={admin}
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirmOpen(false)}
          isLoading={deletingAdmin}
        />
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminManagementPage: React.FC = () => {
  const { data: adminListData, isFetching: listFetching, isError: listError, refetch: refetchList } =
    useGetAdminListQuery();
  const { data: sectionsData } = useGetAuthorizationSectionsQuery();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const admins = adminListData?.data?.admins ?? [];
  const sections = sectionsData?.data?.sections ?? [];

  // Auto-select first admin
  useEffect(() => {
    if (!selectedId && admins.length > 0) {
      setSelectedId(admins[0].id);
    }
  }, [admins, selectedId]);

  const filteredAdmins = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleted = () => {
    setSelectedId(null);
    void refetchList();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
            Super Admin — Restricted Area
          </p>
          <h1 className="text-[20px] font-black text-gray-900 uppercase tracking-wide">
            Admin Management
          </h1>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#331ffd] text-white text-[13px] font-bold hover:bg-[#5242ff] transition-all shadow-sm shadow-brand-indigo/25"
        >
          <Plus size={15} />
          Create Admin
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Admins", value: admins.length, color: "text-gray-900" },
          {
            label: "Active",
            value: admins.filter((a) => a.status === "ACTIVE").length,
            color: "text-emerald-600",
          },
          {
            label: "Super Admins",
            value: admins.filter((a) => a.role === "SUPER_ADMIN").length,
            color: "text-amber-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-200 px-5 py-4"
          >
            <p className={`text-[22px] font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Main content — list + detail */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left — Admin List */}
        <div className="w-[320px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search admins..."
                className="w-full h-9 bg-gray-50 rounded-xl pl-9 pr-4 text-[12px] font-bold text-gray-900 placeholder:text-gray-300 outline-none"
              />
            </div>
          </div>

          {/* List header */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {filteredAdmins.length} {filteredAdmins.length === 1 ? "Admin" : "Admins"}
            </span>
            <button
              onClick={() => void refetchList()}
              className="p-1 rounded-lg text-gray-300 hover:text-gray-600 transition-colors"
            >
              <RefreshCw size={13} className={listFetching ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {listFetching && filteredAdmins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 size={20} className="animate-spin text-brand-indigo" />
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Loading...</p>
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Failed to load</p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Users size={22} className="text-gray-200" />
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">No admins found</p>
              </div>
            ) : (
              filteredAdmins.map((admin) => {
                const isSelected = selectedId === admin.id;
                const isSA = admin.role === "SUPER_ADMIN";
                return (
                  <button
                    key={admin.id}
                    onClick={() => setSelectedId(admin.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition-all ${
                      isSelected ? "bg-brand-indigo-soft" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-black flex-shrink-0 ${
                        isSA
                          ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white"
                          : "bg-brand-indigo-soft text-brand-indigo"
                      }`}
                    >
                      {(admin.name ?? "A").charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-gray-900 truncate">{admin.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium truncate">{admin.email}</p>
                    </div>
                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isSA ? (
                        <Crown size={14} className="text-amber-400" />
                      ) : (
                        <Shield size={14} className="text-brand-indigo/40" />
                      )}
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          admin.status === "ACTIVE" ? "bg-emerald-400" : "bg-gray-300"
                        }`}
                      />
                    </div>
                    {isSelected && <ChevronRight size={14} className="text-brand-indigo flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right — Detail Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
          {selectedId ? (
            <DetailPanel
              adminId={selectedId}
              sections={sections}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                <Users size={28} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-black text-gray-400 uppercase tracking-widest">
                  Select an Admin
                </p>
                <p className="text-[12px] text-gray-300 font-medium mt-1">
                  Choose an admin from the list to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Admin Modal */}
      {createOpen && sections.length > 0 && (
        <CreateAdminModal
          onClose={() => setCreateOpen(false)}
          sections={sections}
        />
      )}
    </div>
  );
};

export default AdminManagementPage;
