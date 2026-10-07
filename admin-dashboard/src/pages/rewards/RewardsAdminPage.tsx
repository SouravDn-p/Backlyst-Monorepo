import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Database,
  Edit3,
  Eye,
  Filter,
  Gift,
  History,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useAssignUserRewardBadgeMutation,
  useCreateRewardBadgeMutation,
  useDisableRewardBadgeMutation,
  useExpireRewardBenefitsMutation,
  useGetRewardAuditLogDetailQuery,
  useGetRewardAuditLogsQuery,
  useGetRewardBadgeQuery,
  useGetRewardBadgesQuery,
  useGetRewardLedgerQuery,
  useGetRewardOutboxHealthQuery,
  useGetRewardOutboxQuery,
  useGetUserRewardDetailQuery,
  useRecoverStaleRewardOutboxMutation,
  useRefreshDynamicBadgesMutation,
  useRevokeUserRewardBadgeMutation,
  useSeedRewardDefaultsMutation,
  useUpdateRewardBadgeMutation,
} from "@/redux/feature/rewards/rewardsApi";
import { useGetUserRegistryQuery } from "@/redux/feature/user/userApi";
import { usePermissions } from "@/utils/usePermissions";
import type {
  AdminBadgeRow,
  BadgeCategory,
  BadgeDefinitionPayload,
  BadgeRewardType,
  BadgeRoleScope,
  BadgeScope,
  BadgeTriggerType,
  RewardAuditActorType,
  RewardAuditStatus,
  RewardLedgerType,
  RewardOutboxStatus,
  UserRewardBadge,
} from "@/redux/feature/rewards/rewardTypes";

const CATEGORIES: BadgeCategory[] = ["MARKETPLACE", "KICKSTARTER", "HALL_OF_FAME", "ADMIN_FEATURED"];
const ROLE_SCOPES: BadgeRoleScope[] = ["ANY", "REQUESTER", "PROVIDER"];
const BADGE_SCOPES: BadgeScope[] = ["USER_PROFILE", "PROVIDER_PROFILE", "REQUESTER_PROFILE"];
const REWARD_TYPES: BadgeRewardType[] = ["RECOGNITION_ONLY", "TASK_CREDIT", "VISIBILITY_BOOST", "PRIORITY_BOOST", "SUPPORT_PRIORITY"];
const TRIGGER_TYPES: BadgeTriggerType[] = ["ACCOUNT_VERIFIED", "EARLY_ADOPTER", "FIRST_SUCCESS", "VERIFIED_TASK_COUNT", "APPROVAL_RATE", "RESPONSE_TIME", "REVIEW_TIME", "DISPUTE_RATE", "REVISION_RATE", "STREAK", "LOW_DISPUTE", "KICKSTARTER_TIER", "HALL_OF_FAME", "MANUAL"];
const LEDGER_TYPES: RewardLedgerType[] = ["BADGE_EARNED", "BADGE_ACTIVATED", "BADGE_RENEWED", "BADGE_EXPIRED", "BADGE_DEACTIVATED", "BADGE_REVOKED", "BADGE_REWARD_GRANTED", "BADGE_REWARD_REMOVED", "MILESTONE_REWARD", "WEEKLY_CONTRIBUTION", "STREAK_UPDATED", "ADDITIONAL_REWARD_GRANTED", "ADMIN_ADJUSTMENT", "SHOWCASE_FEATURED", "SHOWCASE_HIDDEN"];
const OUTBOX_STATUSES: RewardOutboxStatus[] = ["PENDING", "PROCESSING", "PROCESSED", "FAILED"];
const AUDIT_STATUSES: RewardAuditStatus[] = ["SUCCESS", "FAILED", "WARNING"];
const ACTOR_TYPES: RewardAuditActorType[] = ["ADMIN", "SYSTEM"];
const USER_BADGES_PAGE_SIZE = 9;
const PERFORMANCE_TRIGGER_TYPES = new Set<BadgeTriggerType>(
  TRIGGER_TYPES.filter((triggerType) => !["MANUAL", "KICKSTARTER_TIER", "HALL_OF_FAME"].includes(triggerType)),
);

type TabKey = "badges" | "ledger" | "outbox" | "audit" | "user";

type BadgeFormState = {
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  requirementText: string;
  rewardImpactText: string;
  badgeScope: BadgeScope;
  roleScope: BadgeRoleScope;
  triggerType: BadgeTriggerType;
  threshold: string;
  secondaryThreshold: string;
  isPersistent: boolean;
  isActive: boolean;
  rewardType: BadgeRewardType;
  rewardValue: string;
  validityDays: string;
  refreshWindowDays: string;
  gracePeriodDays: string;
  rewardMeta: string;
};

const emptyBadgeForm: BadgeFormState = {
  code: "",
  name: "",
  description: "",
  category: "MARKETPLACE",
  requirementText: "",
  rewardImpactText: "",
  badgeScope: "USER_PROFILE",
  roleScope: "ANY",
  triggerType: "MANUAL",
  threshold: "",
  secondaryThreshold: "",
  isPersistent: true,
  isActive: true,
  rewardType: "RECOGNITION_ONLY",
  rewardValue: "",
  validityDays: "",
  refreshWindowDays: "",
  gracePeriodDays: "",
  rewardMeta: "",
};

const formatLabel = (value?: string | null) => (value ? value.replace(/_/g, " ") : "-");

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const compactNumber = (value: number | undefined | null) =>
  new Intl.NumberFormat().format(value ?? 0);

const getErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") return "Action failed. Please try again.";
  const data = "data" in error ? (error as { data?: unknown }).data : undefined;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (Array.isArray(record.message)) return record.message.join(" ");
  }
  return "Action failed. Please try again.";
};

const statusStyle = (status?: string | boolean) => {
  const normalized = String(status).toUpperCase();
  if (status === true || ["ACTIVE", "SUCCESS", "EARNED", "PROCESSED"].includes(normalized)) return { bg: "#F0FDF4", text: "#008236" };
  if (["PENDING", "PROCESSING", "ELIGIBLE", "WARNING"].includes(normalized)) return { bg: "#FFF7ED", text: "#CA3500" };
  if (["FAILED", "REVOKED"].includes(normalized)) return { bg: "#FEF2F2", text: "#C10007" };
  return { bg: "#F3F4F6", text: "#6A7282" };
};

const parseNumber = (value: string) => (value.trim() ? Number(value) : undefined);

const toPayload = (form: BadgeFormState, isEdit: boolean): Partial<BadgeDefinitionPayload> => {
  const sharedPayload: Partial<BadgeDefinitionPayload> = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    requirementText: form.requirementText.trim() || undefined,
    rewardImpactText: form.rewardImpactText.trim() || undefined,
    threshold: parseNumber(form.threshold),
    secondaryThreshold: parseNumber(form.secondaryThreshold),
    isPersistent: form.isPersistent,
    isActive: form.isActive,
    rewardType: form.rewardType,
    rewardValue: parseNumber(form.rewardValue),
    validityDays: parseNumber(form.validityDays),
    refreshWindowDays: parseNumber(form.refreshWindowDays),
    gracePeriodDays: parseNumber(form.gracePeriodDays),
  };

  if (form.rewardMeta.trim()) {
    sharedPayload.rewardMeta = JSON.parse(form.rewardMeta) as Record<string, unknown>;
  }

  if (isEdit) {
    return sharedPayload;
  }

  return {
    ...sharedPayload,
    code: form.code.trim().toUpperCase(),
    category: form.category,
    badgeScope: form.badgeScope,
    roleScope: form.roleScope,
    triggerType: form.triggerType,
  };
};

const StatCard = ({ icon: Icon, title, value, subtitle, tone = "blue" }: { icon: React.ElementType; title: string; value: string; subtitle: string; tone?: "blue" | "green" | "orange" | "gray" | "red" }) => {
  const tones = {
    blue: { bg: "#EFF6FF", color: "#155DFC" },
    green: { bg: "#F0FDF4", color: "#00A63E" },
    orange: { bg: "#FFF7ED", color: "#F54900" },
    gray: { bg: "#F3F4F6", color: "#6A7282" },
    red: { bg: "#FEF2F2", color: "#C10007" },
  }[tone];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[142px]">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: tones.bg }}>
        <Icon size={22} style={{ color: tones.color }} />
      </div>
      <p className="text-[34px] font-bold text-[#000000] leading-none break-words">{value}</p>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{title}</p>
      <p className="text-[11px] font-medium text-gray-400 mt-1 leading-tight">{subtitle}</p>
    </div>
  );
};

const StatusPill = ({ value }: { value: string | boolean }) => {
  const style = statusStyle(value);
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: style.bg, color: style.text }}>
      {typeof value === "boolean" ? (value ? "Active" : "Inactive") : formatLabel(value)}
    </span>
  );
};

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="px-6 py-10 text-center">
    <p className="text-[13px] font-bold text-gray-700 uppercase tracking-wider">{title}</p>
    <p className="text-[12px] font-medium text-gray-400 mt-1">{description}</p>
  </div>
);

const LoadingState = () => (
  <div className="px-6 py-10 flex items-center justify-center gap-2 text-gray-400">
    <Loader2 size={18} className="animate-spin" />
    <span className="text-[12px] font-bold uppercase tracking-wider">Loading rewards data</span>
  </div>
);

const PaginationControls = ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) => (
  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Page {page} of {Math.max(1, totalPages)}</p>
    <div className="flex items-center gap-2">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-bold uppercase disabled:opacity-40">Previous</button>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-bold uppercase disabled:opacity-40">Next</button>
    </div>
  </div>
);

const BadgeFormModal = ({ badgeId, initial, isOpen, isSaving, isDetailLoading, onClose, onSubmit }: { badgeId: string | null; initial: BadgeFormState; isOpen: boolean; isSaving: boolean; isDetailLoading?: boolean; onClose: () => void; onSubmit: (form: BadgeFormState) => void }) => {
  const [form, setForm] = useState(initial);
  React.useEffect(() => setForm(initial), [initial]);
  if (!isOpen) return null;

  const setValue = <K extends keyof BadgeFormState>(key: K, value: BadgeFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <form
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[860px] max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="flex items-start justify-between px-7 py-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center flex-shrink-0">
                <Award size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[#000000] uppercase tracking-wide">{badgeId ? "Edit Badge Definition" : "Create Badge Definition"}</h2>
                <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Admin controlled reward badge configuration</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 transition-colors" aria-label="Close badge form">
              <X size={22} />
            </button>
          </div>

          <div className="px-7 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {!badgeId && <Field label="Badge Code"><input required value={form.code} onChange={(e) => setValue("code", e.target.value)} className="admin-input" placeholder="HIGH_APPROVAL" /></Field>}
            <Field label="Badge Name"><input required value={form.name} onChange={(e) => setValue("name", e.target.value)} className="admin-input" placeholder="High Approval" /></Field>
            <Field label="Category"><Select value={form.category} values={CATEGORIES} disabled={Boolean(badgeId)} onChange={(value) => setValue("category", value as BadgeCategory)} /></Field>
            <Field label="Role Scope"><Select value={form.roleScope} values={ROLE_SCOPES} disabled={Boolean(badgeId)} onChange={(value) => setValue("roleScope", value as BadgeRoleScope)} /></Field>
            <Field label="Badge Scope"><Select value={form.badgeScope} values={BADGE_SCOPES} disabled={Boolean(badgeId)} onChange={(value) => setValue("badgeScope", value as BadgeScope)} /></Field>
            <Field label="Trigger Type"><Select value={form.triggerType} values={TRIGGER_TYPES} disabled={Boolean(badgeId)} onChange={(value) => setValue("triggerType", value as BadgeTriggerType)} /></Field>
            <Field label="Reward Type"><Select value={form.rewardType} values={REWARD_TYPES} onChange={(value) => setValue("rewardType", value as BadgeRewardType)} /></Field>
            <Field label="Reward Value"><input value={form.rewardValue} onChange={(e) => setValue("rewardValue", e.target.value)} className="admin-input" type="number" min="0" /></Field>
            <Field label="Primary Threshold"><input value={form.threshold} onChange={(e) => setValue("threshold", e.target.value)} className="admin-input" type="number" /></Field>
            <Field label="Secondary Threshold"><input value={form.secondaryThreshold} onChange={(e) => setValue("secondaryThreshold", e.target.value)} className="admin-input" type="number" /></Field>
            <Field label="Validity Days"><input value={form.validityDays} onChange={(e) => setValue("validityDays", e.target.value)} className="admin-input" type="number" min="1" /></Field>
            <Field label="Refresh Window Days"><input value={form.refreshWindowDays} onChange={(e) => setValue("refreshWindowDays", e.target.value)} className="admin-input" type="number" min="1" /></Field>
            <Field label="Grace Period Days"><input value={form.gracePeriodDays} onChange={(e) => setValue("gracePeriodDays", e.target.value)} className="admin-input" type="number" min="0" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <label className="h-[44px] rounded-lg border border-gray-200 px-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider"><input type="checkbox" checked={form.isPersistent} onChange={(e) => setValue("isPersistent", e.target.checked)} /> Persistent</label>
              <label className="h-[44px] rounded-lg border border-gray-200 px-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider"><input type="checkbox" checked={form.isActive} onChange={(e) => setValue("isActive", e.target.checked)} /> Active</label>
            </div>
            <Field label="Description" wide><textarea value={form.description} onChange={(e) => setValue("description", e.target.value)} className="admin-input min-h-[76px] py-3" /></Field>
            <Field label="Requirement Text" wide><textarea value={form.requirementText} onChange={(e) => setValue("requirementText", e.target.value)} className="admin-input min-h-[76px] py-3" /></Field>
            <Field label="Reward Impact Text" wide><textarea value={form.rewardImpactText} onChange={(e) => setValue("rewardImpactText", e.target.value)} className="admin-input min-h-[76px] py-3" /></Field>
            <Field label="Reward Metadata JSON" wide><textarea value={form.rewardMeta} onChange={(e) => setValue("rewardMeta", e.target.value)} className="admin-input min-h-[96px] py-3 font-mono text-[12px]" placeholder='{"multiplier":1.2}' /></Field>
          </div>

          <div className="px-7 py-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <button type="button" onClick={onClose} className="h-[42px] px-5 rounded-lg border border-gray-200 text-[12px] font-bold uppercase tracking-wider">Cancel</button>
            <button type="submit" disabled={isSaving || isDetailLoading} className="h-[42px] px-5 rounded-lg bg-brand-indigo text-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60">
              {isSaving || isDetailLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Badge
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body,
  );
};

const Field = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <label className={wide ? "md:col-span-2" : ""}>
    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</span>
    {children}
  </label>
);

const Select = ({ value, values, onChange, disabled }: { value: string; values: string[]; onChange: (value: string) => void; disabled?: boolean }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="admin-input bg-white disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400">
    {values.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
  </select>
);

export default function RewardsAdminPage() {
  // ── Permission flags for REWARDS section ──────────────────────────────────
  const { can } = usePermissions();
  const canCreate = can("REWARDS", "canCreate");
  const canUpdate = can("REWARDS", "canUpdate");
  const canDelete = can("REWARDS", "canDelete");

  const [activeTab, setActiveTab] = useState<TabKey>("badges");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [badgePage, setBadgePage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [outboxPage, setOutboxPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [userBadgePage, setUserBadgePage] = useState(1);
  const [badgeSearch, setBadgeSearch] = useState("");
  const [badgeCategory, setBadgeCategory] = useState<BadgeCategory | "">("");
  const [badgeActive, setBadgeActive] = useState<"" | "true" | "false">("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerType, setLedgerType] = useState<RewardLedgerType | "">("");
  const [outboxStatus, setOutboxStatus] = useState<RewardOutboxStatus | "">("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatus, setAuditStatus] = useState<RewardAuditStatus | "">("");
  const [auditActorType, setAuditActorType] = useState<RewardAuditActorType | "">("");
  const [userId, setUserId] = useState("");
  const [loadedUserId, setLoadedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedBadgeRow, setSelectedBadgeRow] = useState<AdminBadgeRow | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ badgeId: "", reason: "", overridePerformanceBadge: false });
  const [assignNotice, setAssignNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [revokeForm, setRevokeForm] = useState({ badgeId: "", reason: "" });
  const [revokeNotice, setRevokeNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const badgeParams = useMemo(() => ({
    page: badgePage,
    limit: 20,
    search: badgeSearch.trim() || undefined,
    category: badgeCategory || undefined,
    isActive: badgeActive ? badgeActive === "true" : undefined,
  }), [badgePage, badgeSearch, badgeCategory, badgeActive]);

  const ledgerParams = useMemo(() => ({
    page: ledgerPage,
    limit: 20,
    search: ledgerSearch.trim() || undefined,
    type: ledgerType || undefined,
  }), [ledgerPage, ledgerSearch, ledgerType]);

  const auditParams = useMemo(() => ({
    page: auditPage,
    limit: 20,
    search: auditSearch.trim() || undefined,
    status: auditStatus || undefined,
    actorType: auditActorType || undefined,
  }), [auditPage, auditSearch, auditStatus, auditActorType]);

  const { data: badgesResponse, isLoading: badgesLoading, isFetching: badgesFetching } = useGetRewardBadgesQuery(badgeParams);
  const { data: badgeDetailResponse, isLoading: badgeDetailLoading, isFetching: badgeDetailFetching } = useGetRewardBadgeQuery(selectedBadgeId || "", { skip: !selectedBadgeId || !badgeModalOpen });
  const { data: ledgerResponse, isLoading: ledgerLoading, isFetching: ledgerFetching } = useGetRewardLedgerQuery(ledgerParams);
  const { data: outboxHealthResponse, isLoading: outboxHealthLoading } = useGetRewardOutboxHealthQuery();
  const { data: outboxResponse, isLoading: outboxLoading, isFetching: outboxFetching } = useGetRewardOutboxQuery({ page: outboxPage, limit: 20, status: outboxStatus || undefined });
  const { data: auditResponse, isLoading: auditLoading, isFetching: auditFetching } = useGetRewardAuditLogsQuery(auditParams);
  const { data: auditDetailResponse } = useGetRewardAuditLogDetailQuery(selectedAuditId || "", { skip: !selectedAuditId });
  const { data: userResponse, isLoading: userLoading, isFetching: userFetching, isError: userError } = useGetUserRewardDetailQuery(loadedUserId, { skip: loadedUserId.length < 8 });
  const userSearchTerm = userSearch.trim();
  const { data: userRegistryResponse, isFetching: userRegistryFetching } = useGetUserRegistryQuery({ page: 1, limit: 6, search: userSearchTerm || undefined }, { skip: activeTab !== "user" || userSearchTerm.length < 2 });

  const [createBadge, { isLoading: creatingBadge }] = useCreateRewardBadgeMutation();
  const [updateBadge, { isLoading: updatingBadge }] = useUpdateRewardBadgeMutation();
  const [disableBadge, { isLoading: disablingBadge }] = useDisableRewardBadgeMutation();
  const [seedDefaults, { isLoading: seedingDefaults }] = useSeedRewardDefaultsMutation();
  const [recoverOutbox, { isLoading: recoveringOutbox }] = useRecoverStaleRewardOutboxMutation();
  const [refreshDynamicBadges, { isLoading: refreshingBadges }] = useRefreshDynamicBadgesMutation();
  const [expireBenefits, { isLoading: expiringBenefits }] = useExpireRewardBenefitsMutation();
  const [assignBadge, { isLoading: assigningBadge }] = useAssignUserRewardBadgeMutation();
  const [revokeBadge, { isLoading: revokingBadge }] = useRevokeUserRewardBadgeMutation();

  const rawBadges = badgesResponse?.data.data ?? [];
  const tableBadges = rawBadges;
  const badgeMeta = badgesResponse?.data.meta;
  const effectiveBadgeMeta = badgeMeta;
  const ledgerRows = ledgerResponse?.data.data ?? [];
  const ledgerMeta = ledgerResponse?.data.meta;
  const outboxRows = outboxResponse?.data.data ?? [];
  const outboxMeta = outboxResponse?.data.meta;
  const auditRows = auditResponse?.data.items ?? [];
  const auditPagination = auditResponse?.data.pagination;
  const outboxHealth = outboxHealthResponse?.data;
  const userDetail = userResponse?.data;
  const userSearchResults = userRegistryResponse?.data.items ?? [];
  const allUserBadges = userDetail ? Object.values(userDetail.badges).flat() : [];
  const userBadgeTotalPages = Math.max(1, Math.ceil(allUserBadges.length / USER_BADGES_PAGE_SIZE));
  const visibleUserBadges = allUserBadges.slice((userBadgePage - 1) * USER_BADGES_PAGE_SIZE, userBadgePage * USER_BADGES_PAGE_SIZE);

  const selectedBadgeForm = useMemo<BadgeFormState>(() => {
    const badge = badgeDetailResponse?.data;

    if (!badge && selectedBadgeRow) {
      return {
        ...emptyBadgeForm,
        code: selectedBadgeRow.code,
        name: selectedBadgeRow.name,
        category: selectedBadgeRow.category,
        roleScope: selectedBadgeRow.roleScope,
        triggerType: selectedBadgeRow.triggerType,
        isPersistent: selectedBadgeRow.isPermanent,
        isActive: selectedBadgeRow.isActive,
        rewardType: selectedBadgeRow.rewardType,
        validityDays: selectedBadgeRow.validityDays == null ? "" : String(selectedBadgeRow.validityDays),
      };
    }

    if (!badge) return emptyBadgeForm;

    return {
      code: badge.code,
      name: badge.name,
      description: badge.description ?? "",
      category: badge.category,
      requirementText: badge.requirementText ?? "",
      rewardImpactText: badge.rewardImpactText ?? "",
      badgeScope: badge.badgeScope,
      roleScope: badge.roleScope,
      triggerType: badge.triggerType,
      threshold: badge.threshold == null ? "" : String(badge.threshold),
      secondaryThreshold: badge.secondaryThreshold == null ? "" : String(badge.secondaryThreshold),
      isPersistent: badge.isPersistent ?? badge.isPermanent,
      isActive: badge.isActive,
      rewardType: badge.rewardType,
      rewardValue: badge.rewardValue == null ? "" : String(badge.rewardValue),
      validityDays: badge.validityDays == null ? "" : String(badge.validityDays),
      refreshWindowDays: badge.refreshWindowDays == null ? "" : String(badge.refreshWindowDays),
      gracePeriodDays: badge.gracePeriodDays == null ? "" : String(badge.gracePeriodDays),
      rewardMeta: badge.rewardMeta ? JSON.stringify(badge.rewardMeta, null, 2) : "",
    };
  }, [badgeDetailResponse, selectedBadgeRow]);

  const badgeSummary = useMemo(() => {
    const active = rawBadges.filter((badge) => badge.isActive).length;
    return {
      total: badgeMeta?.total ?? rawBadges.length,
      active,
      earned: rawBadges.reduce((sum, badge) => sum + (badge.earnedCount ?? 0), 0),
    };
  }, [rawBadges, badgeMeta]);

  const showNotice = (type: "success" | "error", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const runMutation = async (
    action: () => Promise<unknown>,
    successText: string,
    setInlineNotice?: (notice: { type: "success" | "error"; text: string } | null) => void,
  ) => {
    try {
      setInlineNotice?.(null);
      await action();
      showNotice("success", successText);
      setInlineNotice?.({ type: "success", text: successText });
    } catch (error) {
      const message = getErrorMessage(error);
      showNotice("error", message);
      setInlineNotice?.({ type: "error", text: message });
    }
  };

  const openCreateBadge = () => {
    setSelectedBadgeId(null);
    setSelectedBadgeRow(null);
    setBadgeModalOpen(true);
  };

  const openEditBadge = (badge: AdminBadgeRow) => {
    setSelectedBadgeId(badge.id);
    setSelectedBadgeRow(badge);
    setBadgeModalOpen(true);
  };

  const handleSaveBadge = async (form: BadgeFormState) => {
    try {
      const payload = toPayload(form, Boolean(selectedBadgeId));
      if (selectedBadgeId) {
        await updateBadge({ id: selectedBadgeId, body: payload }).unwrap();
        showNotice("success", "Badge definition updated successfully.");
      } else {
        await createBadge(payload as BadgeDefinitionPayload).unwrap();
        showNotice("success", "Badge definition created successfully.");
      }
      setBadgeModalOpen(false);
    } catch (error) {
      showNotice("error", error instanceof SyntaxError ? "Reward metadata must be valid JSON." : getErrorMessage(error));
    }
  };

  const loadUserRewards = (nextUserId: string) => {
    const trimmed = nextUserId.trim();
    if (!trimmed) return;
    setUserId(trimmed);
    setLoadedUserId(trimmed);
    setUserBadgePage(1);
    setAssignForm({ badgeId: "", reason: "", overridePerformanceBadge: false });
    setAssignNotice(null);
    setRevokeForm({ badgeId: "", reason: "" });
    setRevokeNotice(null);
  };

  const allAssignableBadges = [
    ...(userDetail?.availableManualBadges ?? []),
    ...(userDetail?.availableKickstarterBadges ?? []),
    ...(userDetail?.availableHallOfFameBadges ?? []),
  ];
  const selectedAssignableBadge = allAssignableBadges.find((badge) => badge.id === assignForm.badgeId);
  const selectedBadgeRequiresOverride = Boolean(
    selectedAssignableBadge &&
    selectedAssignableBadge.category === "MARKETPLACE" &&
    PERFORMANCE_TRIGGER_TYPES.has(selectedAssignableBadge.triggerType),
  );
  const assignDisabled =
    !assignForm.badgeId ||
    assignForm.reason.trim().length < 3 ||
    (selectedBadgeRequiresOverride && !assignForm.overridePerformanceBadge);

  return (
    <div className="w-full font-arimo space-y-6">
      <style>{`.admin-input{height:44px;width:100%;border:1px solid #E5E7EB;border-radius:8px;padding:0 12px;font-size:13px;font-weight:500;color:#111827}.admin-input-with-icon{padding-left:38px!important}.admin-select-with-icon{padding-right:38px!important}.admin-input:focus{border-color:#331ffd;box-shadow:0 0 0 2px #ebe9ff}.admin-input::placeholder{color:#9CA3AF}`}</style>
      <section className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">Rewards & Badges</h1>
          <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">Admin management for badge definitions, reward ledger, outbox health, and manual user grants</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate && <ActionButton icon={Sparkles} label="Seed Defaults" loading={seedingDefaults} onClick={() => runMutation(() => seedDefaults().unwrap(), "Default rewards and badges seeded.")} />}
          {canUpdate && <ActionButton icon={RefreshCw} label="Refresh Dynamic" loading={refreshingBadges} onClick={() => runMutation(() => refreshDynamicBadges({ limit: 100 }).unwrap(), "Dynamic badge refresh queued.")} />}
          {canUpdate && <ActionButton icon={Clock} label="Expire Benefits" loading={expiringBenefits} onClick={() => runMutation(() => expireBenefits({ limit: 100 }).unwrap(), "Stale reward benefits expired.")} />}
        </div>
      </section>

      {notice && (
        <div className="rounded-xl border px-4 py-3 flex items-start gap-3" style={{ borderColor: notice.type === "success" ? "#B9F8CF" : "#FFA2A2", backgroundColor: notice.type === "success" ? "#F0FDF4" : "#FEF2F2" }}>
          {notice.type === "success" ? <CheckCircle2 size={18} className="text-[#008236] mt-0.5" /> : <AlertTriangle size={18} className="text-[#C10007] mt-0.5" />}
          <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: notice.type === "success" ? "#008236" : "#C10007" }}>{notice.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Award} title="Badge Definitions" value={compactNumber(badgeSummary.total)} subtitle={`${compactNumber(badgeSummary.active)} active definitions`} />
        <StatCard icon={ShieldCheck} title="Earned Assignments" value={compactNumber(badgeSummary.earned)} subtitle="Across loaded badge definitions" tone="green" />
        <StatCard icon={Database} title="Outbox Failures" value={compactNumber(outboxHealth?.counts.FAILED)} subtitle={`${compactNumber(outboxHealth?.staleProcessingCount)} stale processing rows`} tone={(outboxHealth?.counts.FAILED ?? 0) > 0 ? "red" : "gray"} />
        <StatCard icon={History} title="Ledger Events" value={compactNumber(ledgerMeta?.total)} subtitle="Paginated reward history" tone="orange" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="flex min-w-max border-b border-gray-100">
            {([
              ["badges", Award, "Badge Definitions"],
              ["ledger", History, "Reward Ledger"],
              ["outbox", Database, "Outbox Health"],
              ["audit", Activity, "Audit Logs"],
              ["user", UserRound, "User Rewards"],
            ] as const).map(([key, Icon, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`h-[54px] px-5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === key ? "border-brand-indigo text-brand-indigo bg-[#F8F7FF]" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "badges" && (
          <div>
            <Toolbar>
              <SearchInput value={badgeSearch} onChange={(value) => { setBadgeSearch(value); setBadgePage(1); }} placeholder="Search code, name, description" />
              <FilterSelect value={badgeCategory} onChange={(value) => { setBadgeCategory(value as BadgeCategory | ""); setBadgePage(1); }} values={CATEGORIES} placeholder="All categories" />
              <FilterSelect value={badgeActive} onChange={(value) => { setBadgeActive(value as "" | "true" | "false"); setBadgePage(1); }} values={["true", "false"]} labels={{ true: "Active", false: "Inactive" }} placeholder="All states" />
              {canCreate && <button onClick={openCreateBadge} className="h-[42px] px-4 rounded-lg bg-brand-indigo text-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"><Plus size={16} />New Badge</button>}
            </Toolbar>
            {badgesLoading ? <LoadingState /> : (
              <Table minWidth="1120px" headers={["Code", "Name", "Category", "Role", "Trigger", "Reward", "Usage", "Status", "Updated", "Actions"]}>
                {tableBadges.length === 0 ? <tr><td colSpan={10}><EmptyState title="No badge definitions found" description="Seed defaults or create a badge definition to begin." /></td></tr> : tableBadges.map((badge) => (
                  <tr key={badge.id} className="hover:bg-gray-50/50 transition-colors">
                    <Cell strong>{badge.code}</Cell>
                    <Cell>{badge.name}</Cell>
                    <Cell>{formatLabel(badge.category)}</Cell>
                    <Cell>{formatLabel(badge.roleScope)}</Cell>
                    <Cell>{formatLabel(badge.triggerType)}</Cell>
                    <Cell>{formatLabel(badge.rewardType)}</Cell>
                    <Cell>{compactNumber(badge.earnedCount)} earned / {compactNumber(badge.activeCount)} active</Cell>
                    <Cell><StatusPill value={badge.isActive} /></Cell>
                    <Cell>{formatDateTime(badge.updatedAt)}</Cell>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && <IconButton title="Edit badge" icon={Edit3} onClick={() => openEditBadge(badge)} />}
                        {canDelete && <IconButton title="Disable badge" icon={Trash2} danger disabled={!badge.isActive || disablingBadge} onClick={() => runMutation(() => disableBadge(badge.id).unwrap(), "Badge definition disabled.")} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
            <PaginationControls page={effectiveBadgeMeta?.page ?? badgePage} totalPages={effectiveBadgeMeta?.totalPages ?? 1} onPageChange={setBadgePage} />
            {badgesFetching && <FetchingBar />}
          </div>
        )}

        {activeTab === "ledger" && (
          <div>
            <Toolbar>
              <SearchInput value={ledgerSearch} onChange={(value) => { setLedgerSearch(value); setLedgerPage(1); }} placeholder="Search reward code or reason" />
              <FilterSelect value={ledgerType} onChange={(value) => { setLedgerType(value as RewardLedgerType | ""); setLedgerPage(1); }} values={LEDGER_TYPES} placeholder="All ledger types" />
            </Toolbar>
            {ledgerLoading ? <LoadingState /> : (
              <Table minWidth="1050px" headers={["Event ID", "User", "Ledger Type", "Reward Code", "Badge", "Context", "Task", "Created"]}>
                {ledgerRows.length === 0 ? <tr><td colSpan={8}><EmptyState title="No reward history yet" description="Ledger events will appear after badges or reward benefits are granted, changed, or revoked." /></td></tr> : ledgerRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <Cell strong>{row.id.slice(0, 12)}</Cell>
                    <Cell>{row.user?.name ?? row.user?.email ?? row.user?.id ?? "-"}</Cell>
                    <Cell><StatusPill value={row.ledgerType} /></Cell>
                    <Cell strong>{formatLabel(row.rewardType)}</Cell>
                    <Cell>{row.badge?.name ?? "-"}</Cell>
                    <Cell>{row.description}</Cell>
                    <Cell>{row.task?.projectTitle ?? row.task?.id ?? "-"}</Cell>
                    <Cell>{formatDateTime(row.createdAt)}</Cell>
                  </tr>
                ))}
              </Table>
            )}
            <PaginationControls page={ledgerMeta?.page ?? ledgerPage} totalPages={ledgerMeta?.totalPages ?? 1} onPageChange={setLedgerPage} />
            {ledgerFetching && <FetchingBar />}
          </div>
        )}

        {activeTab === "outbox" && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 p-5 border-b border-gray-100">
              {outboxHealthLoading ? <div className="xl:col-span-5"><LoadingState /></div> : OUTBOX_STATUSES.map((status) => <MiniStat key={status} label={formatLabel(status)} value={compactNumber(outboxHealth?.counts[status])} status={status} />)}
            </div>
            <Toolbar>
              <FilterSelect value={outboxStatus} onChange={(value) => { setOutboxStatus(value as RewardOutboxStatus | ""); setOutboxPage(1); }} values={OUTBOX_STATUSES} placeholder="All statuses" />
              <button onClick={() => runMutation(() => recoverOutbox({ limit: 100 }).unwrap(), "Stale outbox rows recovered.")} disabled={recoveringOutbox} className="h-[42px] px-4 rounded-lg border border-gray-200 text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-60">{recoveringOutbox ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Recover Stale</button>
            </Toolbar>
            {outboxLoading ? <LoadingState /> : (
              <Table minWidth="980px" headers={["Outbox ID", "Task ID", "Status", "Attempts", "Last Error", "Processed", "Updated"]}>
                {outboxRows.length === 0 ? <tr><td colSpan={7}><EmptyState title="No outbox rows found" description="Reward processing jobs will appear here after approved task events are queued." /></td></tr> : outboxRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <Cell strong>{row.id.slice(0, 12)}</Cell>
                    <Cell>{row.taskId}</Cell>
                    <Cell><StatusPill value={row.status} /></Cell>
                    <Cell>{compactNumber(row.attempts)}</Cell>
                    <Cell>{row.lastError ?? "-"}</Cell>
                    <Cell>{formatDateTime(row.processedAt)}</Cell>
                    <Cell>{formatDateTime(row.updatedAt)}</Cell>
                  </tr>
                ))}
              </Table>
            )}
            <PaginationControls page={outboxMeta?.page ?? outboxPage} totalPages={outboxMeta?.totalPages ?? 1} onPageChange={setOutboxPage} />
            {outboxFetching && <FetchingBar />}
          </div>
        )}

        {activeTab === "audit" && (
          <div>
            <Toolbar>
              <SearchInput value={auditSearch} onChange={(value) => { setAuditSearch(value); setAuditPage(1); }} placeholder="Search action, source, reason, user, badge" />
              <FilterSelect value={auditStatus} onChange={(value) => { setAuditStatus(value as RewardAuditStatus | ""); setAuditPage(1); }} values={AUDIT_STATUSES} placeholder="All statuses" />
              <FilterSelect value={auditActorType} onChange={(value) => { setAuditActorType(value as RewardAuditActorType | ""); setAuditPage(1); }} values={ACTOR_TYPES} placeholder="All actors" />
            </Toolbar>
            {auditLoading ? <LoadingState /> : (
              <Table minWidth="1100px" headers={["Audit ID", "Action", "Actor", "Target User", "Badge", "Source", "Status", "Reason", "Created", "Actions"]}>
                {auditRows.length === 0 ? <tr><td colSpan={10}><EmptyState title="No audit events found" description="Adjust filters or perform an admin reward action to create audit rows." /></td></tr> : auditRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <Cell strong>{row.id.slice(0, 12)}</Cell>
                    <Cell strong>{formatLabel(row.action)}</Cell>
                    <Cell>{row.actor?.name ?? formatLabel(row.actorType)}</Cell>
                    <Cell>{row.targetUser?.name ?? "-"}</Cell>
                    <Cell>{row.badge?.name ?? "-"}</Cell>
                    <Cell>{row.source ?? "-"}</Cell>
                    <Cell><StatusPill value={row.status} /></Cell>
                    <Cell>{row.reason ?? "-"}</Cell>
                    <Cell>{formatDateTime(row.createdAt)}</Cell>
                    <td className="px-3 py-4 text-right"><IconButton title="View audit detail" icon={Eye} onClick={() => setSelectedAuditId(row.id)} /></td>
                  </tr>
                ))}
              </Table>
            )}
            <PaginationControls page={auditPagination?.page ?? auditPage} totalPages={auditPagination?.totalPages ?? 1} onPageChange={setAuditPage} />
            {auditFetching && <FetchingBar />}
          </div>
        )}

        {activeTab === "user" && (
          <div className="p-5 space-y-5">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Find User</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="admin-input" placeholder="Search by user email" />
                  <button type="button" onClick={() => userSearchResults[0] && loadUserRewards(userSearchResults[0].id)} className="h-[44px] px-5 rounded-lg border border-gray-200 bg-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50" disabled={userSearchResults.length === 0 || userRegistryFetching}><Search size={16} /> Use First Match</button>
                </div>
              </div>

              {userSearchTerm.length >= 2 && (
                <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                  {userRegistryFetching ? (
                    <div className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-gray-400">Searching users...</div>
                  ) : userSearchResults.length === 0 ? (
                    <div className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-gray-400">No users found</div>
                  ) : userSearchResults.map((user) => (
                    <button key={user.id} type="button" onClick={() => loadUserRewards(user.id)} className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        <span className="block text-[13px] font-bold text-black">{user.emailIdentity}</span>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">{user.userNumber} - {user.accountTypeLabel}</span>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#331ffd]">Load rewards</span>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">User UUID</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={userId} onChange={(e) => setUserId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && userId.trim().length >= 8) loadUserRewards(userId); }} className="admin-input" placeholder="Paste user UUID if known" />
                  <button type="button" onClick={() => loadUserRewards(userId)} className="h-[44px] px-5 rounded-lg bg-brand-indigo text-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60" disabled={userId.trim().length < 8 || userFetching}><Search size={16} /> Load User</button>
                </div>
              </div>
            </div>
            {userLoading || userFetching ? <LoadingState /> : userError ? <EmptyState title="User reward detail not found" description="Check the user ID and confirm the account exists." /> : userDetail ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                  <StatCard icon={UserRound} title="User" value={userDetail.user.name ?? "-"} subtitle={userDetail.user.email ?? userDetail.user.id} tone="gray" />
                  <StatCard icon={Award} title="Earned Badges" value={compactNumber(userDetail.summary.earnedBadgeCount)} subtitle={`${compactNumber(userDetail.summary.activeBadgeCount)} active badges`} />
                  <StatCard icon={Gift} title="Active Rewards" value={compactNumber(userDetail.summary.activeRewardCount)} subtitle="Current reward benefits" tone="green" />
                  <StatCard icon={History} title="Ledger Rows" value={compactNumber(userDetail.ledgerSummary.totalRows)} subtitle={`Last: ${formatDateTime(userDetail.ledgerSummary.lastEventAt)}`} tone="orange" />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {canCreate && (
                    <UserActionPanel title="Assign Badge" loading={assigningBadge} disabled={assignDisabled} buttonLabel="Assign Badge" notice={assignNotice} onSubmit={() => runMutation(() => assignBadge({ userId: userDetail.user.id, badgeId: assignForm.badgeId, reason: assignForm.reason, overridePerformanceBadge: assignForm.overridePerformanceBadge }).unwrap(), "Badge assigned to user.", setAssignNotice)}>
                      <FilterSelect value={assignForm.badgeId} onChange={(value) => { setAssignForm((prev) => ({ ...prev, badgeId: value, overridePerformanceBadge: false })); setAssignNotice(null); }} values={allAssignableBadges.map((badge) => badge.id)} labels={Object.fromEntries(allAssignableBadges.map((badge) => [badge.id, `${badge.name} (${formatLabel(badge.category)} / ${formatLabel(badge.triggerType)})`]))} placeholder="Select assignable badge" />
                      <input value={assignForm.reason} onChange={(e) => setAssignForm((prev) => ({ ...prev, reason: e.target.value }))} className="admin-input" placeholder="Reason, minimum 3 characters" />
                      <label className="h-[42px] rounded-lg border border-gray-200 px-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider"><input type="checkbox" checked={assignForm.overridePerformanceBadge} onChange={(e) => setAssignForm((prev) => ({ ...prev, overridePerformanceBadge: e.target.checked }))} /> Override performance badge</label>
                      {selectedBadgeRequiresOverride && !assignForm.overridePerformanceBadge && <InlineNotice type="error" text="This performance badge is normally earned automatically. Enable override to manually assign it." />}
                    </UserActionPanel>
                  )}
                  {canDelete && (
                    <UserActionPanel title="Revoke Badge" loading={revokingBadge} disabled={!revokeForm.badgeId || revokeForm.reason.trim().length < 3} buttonLabel="Revoke Badge" danger notice={revokeNotice} onSubmit={() => runMutation(() => revokeBadge({ userId: userDetail.user.id, badgeId: revokeForm.badgeId, reason: revokeForm.reason }).unwrap(), "Badge revoked from user.", setRevokeNotice)}>
                      <FilterSelect value={revokeForm.badgeId} onChange={(value) => setRevokeForm((prev) => ({ ...prev, badgeId: value }))} values={Object.values(userDetail.badges).flat().map((badge) => badge.badgeId)} labels={Object.fromEntries(Object.values(userDetail.badges).flat().map((badge) => [badge.badgeId, `${badge.name} (${formatLabel(badge.status)})`]))} placeholder="Select user badge" />
                      <input value={revokeForm.reason} onChange={(e) => setRevokeForm((prev) => ({ ...prev, reason: e.target.value }))} className="admin-input" placeholder="Reason, minimum 3 characters" />
                    </UserActionPanel>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex flex-col gap-1 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-black">User Badges</h3>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{compactNumber(allUserBadges.length)} total badges</p>
                  </div>
                  {visibleUserBadges.length === 0 ? (
                    <EmptyState title="No user badges found" description="This user has no reward badges available in the current backend response." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                      {visibleUserBadges.map((badge) => <UserBadgeCard key={badge.badgeId} badge={badge} />)}
                    </div>
                  )}
                  <PaginationControls page={Math.min(userBadgePage, userBadgeTotalPages)} totalPages={userBadgeTotalPages} onPageChange={setUserBadgePage} />
                </div>
              </div>
            ) : <EmptyState title="No user loaded" description="Paste a user UUID and click Load User to inspect rewards, assign badges, and revoke badges." />}
          </div>
        )}
      </div>

      <BadgeFormModal badgeId={selectedBadgeId} initial={selectedBadgeId ? selectedBadgeForm : emptyBadgeForm} isOpen={badgeModalOpen} isSaving={creatingBadge || updatingBadge} isDetailLoading={Boolean(selectedBadgeId) && (badgeDetailLoading || badgeDetailFetching) && !badgeDetailResponse?.data} onClose={() => setBadgeModalOpen(false)} onSubmit={handleSaveBadge} />
      {selectedAuditId && <AuditDetailModal data={auditDetailResponse?.data} onClose={() => setSelectedAuditId(null)} />}
    </div>
  );
}

const Toolbar = ({ children }: { children: React.ReactNode }) => <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row gap-3 lg:items-center">{children}</div>;
const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => <div className="relative flex-1 min-w-[240px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /><input value={value} onChange={(e) => onChange(e.target.value)} className="admin-input admin-input-with-icon" placeholder={placeholder} /></div>;
const FilterSelect = ({ value, values, onChange, placeholder, labels }: { value: string; values: string[]; onChange: (value: string) => void; placeholder: string; labels?: Record<string, string> }) => <div className="relative min-w-[190px]"><Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /><select value={value} onChange={(e) => onChange(e.target.value)} className="admin-input admin-input-with-icon admin-select-with-icon bg-white"><option value="">{placeholder}</option>{values.map((item) => <option key={item} value={item}>{labels?.[item] ?? formatLabel(item)}</option>)}</select></div>;
const ActionButton = ({ icon: Icon, label, loading, onClick }: { icon: React.ElementType; label: string; loading?: boolean; onClick: () => void }) => <button onClick={onClick} disabled={loading} className="h-[42px] px-4 rounded-lg border border-gray-200 bg-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}{label}</button>;
const IconButton = ({ icon: Icon, title, onClick, danger, disabled }: { icon: React.ElementType; title: string; onClick: () => void; danger?: boolean; disabled?: boolean }) => <button title={title} onClick={onClick} disabled={disabled} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40" style={{ color: danger ? "#C10007" : "#155DFC", backgroundColor: danger ? "#FEF2F2" : "#EFF6FF" }}><Icon size={16} /></button>;
const Table = ({ headers, children, minWidth }: { headers: string[]; children: React.ReactNode; minWidth: string }) => <div className="overflow-x-auto custom-scrollbar"><table className="w-full text-left" style={{ minWidth }}><thead><tr className="border-b border-gray-100">{headers.map((header) => <th key={header} className="px-3 py-3.5 first:pl-6 last:pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider last:text-right">{header}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{children}</tbody></table></div>;
const Cell = ({ children, strong }: { children: React.ReactNode; strong?: boolean }) => <td className="px-3 first:pl-6 py-4 align-top"><span className={`text-[12px] ${strong ? "font-bold text-[#000000] uppercase" : "font-medium text-gray-600"}`}>{children}</span></td>;
const MiniStat = ({ label, value, status }: { label: string; value: string; status: string }) => <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><div className="mt-2 flex items-center justify-between"><p className="text-[26px] font-bold text-black leading-none">{value}</p><StatusPill value={status} /></div></div>;
const FetchingBar = () => <div className="h-1 bg-[#EBE9FF]"><div className="h-1 w-1/3 bg-brand-indigo animate-pulse" /></div>;
const InlineNotice = ({ type, text }: { type: "success" | "error"; text: string }) => <div className="rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ borderColor: type === "success" ? "#B9F8CF" : "#FFA2A2", backgroundColor: type === "success" ? "#F0FDF4" : "#FEF2F2", color: type === "success" ? "#008236" : "#C10007" }}>{text}</div>;
const UserActionPanel = ({ title, children, loading, disabled, buttonLabel, onSubmit, danger, notice }: { title: string; children: React.ReactNode; loading: boolean; disabled?: boolean; buttonLabel: string; onSubmit: () => void; danger?: boolean; notice?: { type: "success" | "error"; text: string } | null }) => <div className="bg-white rounded-xl border border-gray-200 p-5"><h3 className="text-[13px] font-bold text-black uppercase tracking-wider mb-4">{title}</h3><div className="space-y-3">{children}{notice && <InlineNotice type={notice.type} text={notice.text} />}<button onClick={onSubmit} disabled={loading || disabled} className="h-[42px] w-full rounded-lg text-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: danger ? "#C10007" : "#331ffd" }}>{loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{buttonLabel}</button></div></div>;
const UserBadgeCard = ({ badge }: { badge: UserRewardBadge }) => { const style = statusStyle(badge.status); return <div className="rounded-xl p-5 border" style={{ backgroundColor: style.bg, borderColor: style.bg }}><div className="flex items-start justify-between gap-3"><Award size={24} style={{ color: style.text }} /><StatusPill value={badge.status} /></div><h3 className="text-[15px] font-bold text-black mt-3">{badge.name}</h3><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{formatLabel(badge.category)} - {formatLabel(badge.rewardType)}</p><p className="text-[12px] font-medium text-gray-600 mt-3 leading-relaxed">{badge.requirementText ?? badge.description ?? "No requirement text configured."}</p><p className="text-[11px] font-medium text-gray-500 mt-2">Earned: {formatDateTime(badge.earnedAt ?? badge.activatedAt)}</p></div>; };
const getNestedLabel = (value: unknown, keys: string[]) => {
  if (!value || typeof value !== "object") return "-";
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const nested = record[key];
    if (typeof nested === "string" && nested.trim()) return nested;
  }
  return "-";
};

const AuditInfo = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
    <div className="mt-1 break-words text-[13px] font-bold text-black">{value || "-"}</div>
  </div>
);

const AuditDetailModal = ({ data, onClose }: { data?: Record<string, unknown>; onClose: () => void }) => {
  const actor = data?.actor;
  const targetUser = data?.targetUser;
  const badge = data?.badge;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[820px] max-h-[90vh] overflow-y-auto pointer-events-auto">
          <div className="flex items-start justify-between px-7 py-6 border-b border-gray-100">
            <div>
              <h2 className="text-[18px] font-bold text-black uppercase tracking-wide">Audit Detail</h2>
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mt-1">Admin reward audit record</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700" aria-label="Close audit detail"><X size={22} /></button>
          </div>

          {!data ? (
            <LoadingState />
          ) : (
            <div className="p-7 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AuditInfo label="Action" value={formatLabel(String(data.action ?? ""))} />
                <AuditInfo label="Status" value={<StatusPill value={String(data.status ?? "-")} />} />
                <AuditInfo label="Actor" value={getNestedLabel(actor, ["name", "email", "id"])} />
                <AuditInfo label="Target User" value={getNestedLabel(targetUser, ["name", "email", "id"])} />
                <AuditInfo label="Badge" value={getNestedLabel(badge, ["name", "code", "id"])} />
                <AuditInfo label="Source" value={String(data.source ?? "-")} />
                <AuditInfo label="Reason" value={String(data.reason ?? "-")} />
                <AuditInfo label="Created" value={formatDateTime(String(data.createdAt ?? ""))} />
              </div>

              <div>
                <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-black">Raw Payload</h3>
                <pre className="max-h-[360px] overflow-x-auto rounded-xl bg-gray-950 p-4 text-[12px] text-gray-100 custom-scrollbar">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};























