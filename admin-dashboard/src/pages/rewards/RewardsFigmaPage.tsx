import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  Award,
  BadgeCheck,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  useExpireRewardBenefitsMutation,
  useGetRewardBadgesQuery,
  useGetRewardLedgerQuery,
  useGetRewardOutboxHealthQuery,
  useRefreshDynamicBadgesMutation,
  useSeedRewardDefaultsMutation,
} from "@/redux/feature/rewards/rewardsApi";
import type {
  AdminBadgeRow,
  BadgeCategory,
  RewardLedgerRow,
} from "@/redux/feature/rewards/rewardTypes";

const CATEGORIES: BadgeCategory[] = [
  "MARKETPLACE",
  "KICKSTARTER",
  "HALL_OF_FAME",
  "ADMIN_FEATURED",
];

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ") : "-";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
};

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

const compactNumber = (value?: number | null) =>
  new Intl.NumberFormat().format(value ?? 0);

const statusColors = (status: string | boolean | undefined) => {
  const normalized = String(status).toUpperCase();
  if (status === true || ["ACTIVE", "SUCCESS", "PROCESSED", "BADGE_EARNED", "BADGE_ACTIVATED"].includes(normalized)) {
    return { bg: "#EAFBF0", text: "#00984A", border: "#9EF2BC" };
  }
  if (["PENDING", "PROCESSING", "WARNING"].includes(normalized)) {
    return { bg: "#FFF3E8", text: "#E75B00", border: "#FFC88A" };
  }
  if (["FAILED", "REVOKED", "BADGE_REVOKED"].includes(normalized)) {
    return { bg: "#FFF0F0", text: "#D71920", border: "#FF9E9E" };
  }
  return { bg: "#F3F4F6", text: "#7C8798", border: "#E5E7EB" };
};

const getErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") return "Action failed. Please try again.";
  const data = "data" in error ? (error as { data?: unknown }).data : undefined;
  if (data && typeof data === "object") {
    const message = (data as Record<string, unknown>).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(" ");
  }
  return "Action failed. Please try again.";
};

export default function RewardsFigmaPage() {
  const [badgeSearch, setBadgeSearch] = useState("");
  const [badgeCategory, setBadgeCategory] = useState<BadgeCategory | "">("");
  const [selectedLedger, setSelectedLedger] = useState<RewardLedgerRow | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const badgeParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: badgeSearch.trim() || undefined,
      category: badgeCategory || undefined,
    }),
    [badgeSearch, badgeCategory],
  );

  const { data: badgesResponse, isLoading: badgesLoading, isFetching: badgesFetching } =
    useGetRewardBadgesQuery(badgeParams);
  const { data: ledgerResponse, isLoading: ledgerLoading, isFetching: ledgerFetching } =
    useGetRewardLedgerQuery({ page: 1, limit: 20 });
  const { data: outboxResponse, isLoading: outboxLoading } = useGetRewardOutboxHealthQuery();

  const [seedDefaults, { isLoading: seeding }] = useSeedRewardDefaultsMutation();
  const [refreshDynamic, { isLoading: refreshing }] = useRefreshDynamicBadgesMutation();
  const [expireBenefits, { isLoading: expiring }] = useExpireRewardBenefitsMutation();

  const badges = badgesResponse?.data.data ?? [];
  const ledgerRows = ledgerResponse?.data.data ?? [];
  const outbox = outboxResponse?.data;

  const summary = useMemo(() => {
    const activeDefinitions = badges.filter((badge) => badge.isActive).length;
    const earnedAssignments = badges.reduce(
      (sum, badge) => sum + (badge.earnedCount ?? 0),
      0,
    );
    const activeAssignments = badges.reduce(
      (sum, badge) => sum + (badge.activeCount ?? 0),
      0,
    );

    return {
      totalDefinitions: badgesResponse?.data.meta.total ?? badges.length,
      activeDefinitions,
      earnedAssignments,
      activeAssignments,
      ledgerEvents: ledgerResponse?.data.meta.total ?? ledgerRows.length,
      outboxFailures: outbox?.counts.FAILED ?? 0,
      outboxPending: outbox?.counts.PENDING ?? 0,
    };
  }, [badges, badgesResponse, ledgerResponse, ledgerRows.length, outbox]);

  const visibleBadges = badges.slice(0, 6);

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      setNotice({ type: "success", text: message });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  };

  return (
    <div className="w-full font-arimo">
      <section className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[24px] font-bold uppercase tracking-tight text-black sm:text-[28px]">
            Rewards & Badges
          </h1>
          <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.03em] text-gray-400">
            Visibility-driven incentives and contribution-based recognition
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="Seed Defaults"
            icon={Sparkles}
            loading={seeding}
            onClick={() => runAction(() => seedDefaults().unwrap(), "Default rewards and badges synced.")}
          />
          <ActionButton
            label="Refresh Dynamic"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => runAction(() => refreshDynamic({ limit: 100 }).unwrap(), "Dynamic badge refresh completed.")}
          />
          <ActionButton
            label="Expire Benefits"
            icon={Clock}
            loading={expiring}
            onClick={() => runAction(() => expireBenefits({ limit: 100 }).unwrap(), "Expired benefits processed.")}
          />
        </div>
      </section>

      {notice && (
        <div
          className="mb-5 rounded-lg border px-4 py-3 text-[12px] font-bold uppercase tracking-wide"
          style={{
            backgroundColor: notice.type === "success" ? "#F0FDF4" : "#FEF2F2",
            borderColor: notice.type === "success" ? "#9EF2BC" : "#FF9E9E",
            color: notice.type === "success" ? "#008236" : "#C10007",
          }}
        >
          {notice.text}
        </div>
      )}

      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Eye}
          value={compactNumber(summary.totalDefinitions)}
          title="Badge Definitions"
          detail={`${compactNumber(summary.activeDefinitions)} active definitions`}
          tone="blue"
        />
        <MetricCard
          icon={Zap}
          value={compactNumber(summary.earnedAssignments)}
          title="Earned Assignments"
          detail={`${compactNumber(summary.activeAssignments)} currently active`}
          tone="green"
        />
        <MetricCard
          icon={Award}
          value={compactNumber(summary.ledgerEvents)}
          title="Reward Ledger Events"
          detail={ledgerFetching ? "Refreshing ledger" : "From admin reward history"}
          tone="orange"
        />
        <MetricCard
          icon={Shield}
          value={compactNumber(summary.outboxFailures)}
          title="Outbox Failures"
          detail={`${compactNumber(summary.outboxPending)} pending reward jobs`}
          tone={summary.outboxFailures > 0 ? "red" : "gray"}
        />
      </section>

      <Panel title="Reward Ledger">
        {ledgerLoading ? (
          <LoadingState label="Loading reward ledger" />
        ) : ledgerRows.length === 0 ? (
          <EmptyState title="No reward ledger entries found" />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Reward ID", "Reward Type", "Source", "Reward Details", "Status", "Applied To", "Granted Date", "Actions"].map((header) => (
                    <th key={header} className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 first:pl-6 last:pr-6 last:text-right">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerRows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-gray-50/70">
                    <TableCell strong>{row.id.slice(0, 12)}</TableCell>
                    <TableCell strong>{formatLabel(row.ledgerType)}</TableCell>
                    <TableCell>{row.metadataSummary?.actionSource ? String(row.metadataSummary.actionSource) : "-"}</TableCell>
                    <TableCell strong>{row.description}</TableCell>
                    <td className="px-4 py-5 align-top">
                      <StatusPill value={row.ledgerType} />
                    </td>
                    <TableCell>{row.user?.name ?? row.user?.email ?? row.user?.id ?? "-"}</TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <td className="px-4 py-5 pr-6 text-right align-top">
                      <button
                        onClick={() => setSelectedLedger(row)}
                        className="min-h-[42px] rounded-none border border-[#BEDBFF] bg-[#EFF6FF] px-4 text-[11px] font-bold uppercase tracking-wider text-[#155DFC]"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Badges & Recognition"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchField value={badgeSearch} onChange={setBadgeSearch} />
            <select
              value={badgeCategory}
              onChange={(event) => setBadgeCategory(event.target.value as BadgeCategory | "")}
              className="h-[42px] rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-bold uppercase text-gray-600"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatLabel(category)}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {badgesLoading ? (
          <LoadingState label="Loading badge definitions" />
        ) : visibleBadges.length === 0 ? (
          <EmptyState title="No badge definitions found" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        )}
        {badgesFetching && <div className="mt-4 h-1 rounded-full bg-[#EBE9FF]"><div className="h-1 w-1/3 rounded-full bg-brand-indigo" /></div>}
      </Panel>

      {!outboxLoading && outbox && (
        <Panel title="Reward Processing Health">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(["PENDING", "PROCESSING", "PROCESSED", "FAILED"] as const).map((status) => (
              <HealthCard key={status} label={formatLabel(status)} value={outbox.counts[status]} status={status} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-[12px] font-semibold text-gray-500 md:grid-cols-3">
            {outbox.oldestPendingAt && <p>Oldest pending: {formatDateTime(outbox.oldestPendingAt)}</p>}
            {outbox.oldestFailedAt && <p>Oldest failed: {formatDateTime(outbox.oldestFailedAt)}</p>}
            {outbox.latestProcessedAt && <p>Latest processed: {formatDateTime(outbox.latestProcessedAt)}</p>}
          </div>
        </Panel>
      )}

      {selectedLedger && (
        <RewardDetailModal
          row={selectedLedger}
          onClose={() => setSelectedLedger(null)}
        />
      )}
    </div>
  );
}

const ActionButton = ({
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  loading?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="flex h-[42px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-[11px] font-bold uppercase tracking-wider text-gray-700 disabled:opacity-50"
  >
    {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
    {label}
  </button>
);

const MetricCard = ({
  icon: Icon,
  value,
  title,
  detail,
  tone,
}: {
  icon: React.ElementType;
  value: string;
  title: string;
  detail: string;
  tone: "blue" | "green" | "orange" | "gray" | "red";
}) => {
  const color = {
    blue: { bg: "#EFF6FF", icon: "#155DFC" },
    green: { bg: "#F0FDF4", icon: "#00A63E" },
    orange: { bg: "#FFF7ED", icon: "#F54900" },
    gray: { bg: "#F3F4F6", icon: "#6A7282" },
    red: { bg: "#FEF2F2", icon: "#C10007" },
  }[tone];

  return (
    <div className="min-h-[142px] rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: color.bg }}>
          <Icon size={18} style={{ color: color.icon }} />
        </div>
      </div>
      <p className="mt-5 text-[28px] font-bold leading-none text-black">{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</p>
      <p className="mt-1 text-[11px] font-semibold leading-snug text-gray-400">{detail}</p>
    </div>
  );
};

const Panel = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mb-5 rounded-xl border border-gray-200 bg-white">
    <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.05em] text-black">{title}</h2>
      {action}
    </div>
    <div className="px-6 pb-6">{children}</div>
  </section>
);

const SearchField = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <div className="relative min-w-[240px]">
    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-[42px] w-full rounded-lg border border-gray-200 pl-9 pr-3 text-[12px] font-semibold text-gray-700 placeholder:text-gray-400"
      placeholder="Search badges"
    />
  </div>
);

const TableCell = ({ children, strong }: { children: React.ReactNode; strong?: boolean }) => (
  <td className="px-4 py-5 align-top first:pl-6">
    <span className={`text-[12px] ${strong ? "font-bold uppercase text-black" : "font-semibold text-gray-500"}`}>
      {children}
    </span>
  </td>
);

const StatusPill = ({ value }: { value: string | boolean }) => {
  const colors = statusColors(value);
  return (
    <span
      className="inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {typeof value === "boolean" ? (value ? "Active" : "Inactive") : formatLabel(value)}
    </span>
  );
};

const BadgeCard = ({ badge }: { badge: AdminBadgeRow }) => {
  const colors = badge.isActive
    ? { bg: "#ECFDF3", border: "#86EFAC", icon: "#00C950" }
    : { bg: "#F9FAFB", border: "#E5E7EB", icon: "#9CA3AF" };

  return (
    <article
      className="min-h-[190px] rounded-lg border p-5"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/75">
          <BadgeCheck size={22} style={{ color: colors.icon }} />
        </div>
        <StatusPill value={badge.isActive} />
      </div>
      <h3 className="mt-4 text-[15px] font-bold text-black">{badge.name}</h3>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Category</p>
      <p className="mt-1 text-[12px] font-semibold text-gray-600">{formatLabel(badge.category)}</p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Reward Type</p>
      <p className="mt-1 text-[12px] font-semibold text-gray-600">{formatLabel(badge.rewardType)}</p>
      <div className="mt-4 border-t border-black/10 pt-3 text-[11px] font-semibold text-gray-500">
        {compactNumber(badge.earnedCount)} earned / {compactNumber(badge.activeCount)} active
      </div>
    </article>
  );
};

const HealthCard = ({ label, value, status }: { label: string; value: number; status: string }) => {
  const colors = statusColors(status);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[24px] font-bold text-black">{compactNumber(value)}</p>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.text }} />
      </div>
    </div>
  );
};

const LoadingState = ({ label }: { label: string }) => (
  <div className="flex min-h-[160px] items-center justify-center gap-2 text-gray-400">
    <Loader2 size={18} className="animate-spin" />
    <span className="text-[12px] font-bold uppercase tracking-wider">{label}</span>
  </div>
);

const EmptyState = ({ title }: { title: string }) => (
  <div className="flex min-h-[160px] items-center justify-center text-center">
    <p className="text-[12px] font-bold uppercase tracking-wider text-gray-400">{title}</p>
  </div>
);

const RewardDetailModal = ({
  row,
  onClose,
}: {
  row: RewardLedgerRow;
  onClose: () => void;
}) =>
  ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-none bg-white shadow-2xl pointer-events-auto">
          <div className="flex items-start justify-between border-b border-gray-100 px-7 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#111827]">
                <Award size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold uppercase tracking-wide text-black">
                  {row.id.slice(0, 12)}
                </h2>
                <p className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                  Reward Details & Impact
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Close reward detail">
              <X size={22} />
            </button>
          </div>

          <div className="space-y-6 px-7 py-7">
            <section className="rounded-xl bg-[#246BFF] p-6 text-white">
              <h3 className="mb-6 text-[12px] font-bold uppercase tracking-[0.12em] text-white/85">
                Reward Identification
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <DetailValue label="Reward Type" value={formatLabel(row.ledgerType)} />
                {row.metadataSummary?.actionSource && (
                  <DetailValue label="Source" value={String(row.metadataSummary.actionSource)} />
                )}
                <DetailValue label="Granted Date" value={formatDate(row.createdAt)} />
              </div>
              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Status</p>
                <p className="mt-2 flex items-center gap-2 text-[16px] font-bold uppercase text-[#7BF1A8]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#7BF1A8]" />
                  {formatLabel(row.ledgerType)}
                </p>
              </div>
            </section>

            <DetailSection title="Reward Description">
              <p className="text-[14px] font-medium leading-relaxed text-gray-700">{row.description}</p>
            </DetailSection>

            {(row.badge || row.task || row.user) && (
              <DetailSection title="Related Records">
                <div className="space-y-3">
                  {row.badge && <KeyValue label="Badge" value={`${row.badge.name} (${row.badge.code})`} />}
                  {row.task && <KeyValue label="Task" value={row.task.projectTitle ?? row.task.id} />}
                  {row.user && <KeyValue label="User" value={row.user.name ?? row.user.email ?? row.user.id} />}
                </div>
              </DetailSection>
            )}

            {row.metadataSummary && (
              <DetailSection title="Metadata Summary">
                <pre className="overflow-x-auto rounded-lg bg-gray-950 p-4 text-[12px] text-gray-100">
                  {JSON.stringify(row.metadataSummary, null, 2)}
                </pre>
              </DetailSection>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );

const DetailValue = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{label}</p>
    <p className="mt-2 text-[16px] font-bold uppercase text-white">{value}</p>
  </div>
);

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h3 className="mb-4 text-[12px] font-bold uppercase tracking-wider text-black">{title}</h3>
    <div className="rounded-lg border border-gray-200 p-5">{children}</div>
  </section>
);

const KeyValue = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
    <span className="text-[12px] font-bold uppercase tracking-wider text-[#246BFF]">{label}</span>
    <span className="text-right text-[13px] font-bold text-black">{value}</span>
  </div>
);


