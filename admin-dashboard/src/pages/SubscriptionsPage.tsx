import React, { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import {
  AdminSubscriptionRow,
  useGetAdminSubscriptionsQuery,
} from "../redux/feature/subscription/adminSubscriptionApi";

const STATUS_OPTIONS = ["ALL", "ACTIVE", "PENDING", "CANCELLED", "EXPIRED"];

const formatCurrency = (value?: number | string | null) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const statusClassName = (status: string) => {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "EXPIRED":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-100";
  }
};

const tierClassName = (tier?: string) => {
  switch ((tier ?? "").toUpperCase()) {
    case "FREE":
      return "bg-gray-100 text-gray-700";
    case "SILVER":
      return "bg-slate-100 text-slate-700";
    case "GOLD":
      return "bg-yellow-50 text-yellow-700";
    case "PLATINUM":
      return "bg-cyan-50 text-cyan-700";
    case "ENTERPRISE":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const matchesSearch = (subscription: AdminSubscriptionRow, search: string) => {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;

  return [
    subscription.id,
    subscription.user?.name,
    subscription.user?.email,
    subscription.user?.role,
    subscription.plan?.name,
    subscription.plan?.tier,
    subscription.plan?.billingInterval,
    subscription.status,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
};

const MetricCard = ({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-4 min-h-[112px] flex items-start justify-between gap-4">
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-gray-950 tracking-tight">
        {value}
      </p>
    </div>
    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
      <Icon size={20} strokeWidth={2.2} />
    </div>
  </div>
);

const SubscriptionRow = ({ subscription }: { subscription: AdminSubscriptionRow }) => {
  const plan = subscription.plan;
  const user = subscription.user;

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors">
      <td className="px-4 py-4 align-top min-w-[240px]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[12px] font-bold text-gray-500 flex-shrink-0">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.name ?? user.email}
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-950 truncate">
              {user?.name || "Unnamed User"}
            </p>
            <p className="text-[12px] font-medium text-gray-500 truncate">
              {user?.email ?? "No email available"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top min-w-[220px]">
        <p className="text-[13px] font-bold text-gray-950">
          {plan?.name ?? "No plan attached"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${tierClassName(plan?.tier)}`}>
            {plan?.tier ?? "Unknown"}
          </span>
          <span className="text-[11px] font-semibold text-gray-500 uppercase">
            {plan?.credit ?? 0} credits
          </span>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusClassName(subscription.status)}`}>
          {subscription.status}
        </span>
      </td>
      <td className="px-4 py-4 align-top min-w-[150px]">
        <p className="text-[13px] font-bold text-gray-950">
          {formatCurrency(plan?.price)}
        </p>
        <p className="text-[11px] font-semibold text-gray-400 uppercase mt-1">
          {plan?.billingInterval ?? "-"}
        </p>
      </td>
      <td className="px-4 py-4 align-top min-w-[190px]">
        <p className="text-[12px] font-semibold text-gray-700">
          {formatDate(subscription.startDate)}
        </p>
        <p className="text-[11px] font-semibold text-gray-400 uppercase mt-1">
          Ends {formatDate(subscription.endDate)}
        </p>
      </td>
      <td className="px-4 py-4 align-top">
        <span className={`inline-flex h-6 w-11 items-center rounded-full px-1 transition-colors ${subscription.autoRenew ? "bg-emerald-500" : "bg-gray-300"}`}>
          <span className={`h-4 w-4 rounded-full bg-white transition-transform ${subscription.autoRenew ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </td>
      <td className="px-4 py-4 align-top min-w-[130px] text-[12px] font-semibold text-gray-500">
        {formatDate(subscription.createdAt)}
      </td>
    </tr>
  );
};

const SubscriptionsPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading, isFetching, isError, refetch } =
    useGetAdminSubscriptionsQuery({ page, limit });

  const payload = data?.data;
  const subscriptions = payload?.data ?? [];
  const analytics = payload?.analytics;
  const meta = payload?.meta;

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => {
      const statusMatches =
        statusFilter === "ALL" ||
        subscription.status.toUpperCase() === statusFilter.toUpperCase();
      return statusMatches && matchesSearch(subscription, search);
    });
  }, [subscriptions, search, statusFilter]);

  const currentPage = meta?.currentPage ?? page;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const totalItems = meta?.totalItems ?? subscriptions.length;
  const pageItemCount = meta?.pageItemCount ?? subscriptions.length;

  const changeLimit = (nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const metricCards = [
    {
      label: "Total Subscriptions",
      value: analytics?.totalSubscriptions ?? 0,
      icon: Users,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Active",
      value: analytics?.activeSubscriptions ?? 0,
      icon: CheckCircle2,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pending",
      value: analytics?.pendingSubscriptions ?? 0,
      icon: CalendarClock,
      accent: "bg-amber-50 text-amber-600",
    },
    {
      label: "Cancelled / Expired",
      value: `${analytics?.cancelledSubscriptions ?? 0} / ${analytics?.expiredSubscriptions ?? 0}`,
      icon: XCircle,
      accent: "bg-rose-50 text-rose-600",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(analytics?.totalRevenue ?? 0),
      icon: BadgeDollarSign,
      accent: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="space-y-5 font-arimo">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-[22px] font-bold uppercase tracking-tight text-gray-950">
            Subscription Management
          </h2>
          <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Live subscription registry, billing plans, lifecycle status, and revenue analytics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-[12px] font-bold uppercase tracking-[0.06em] text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          Refresh Live Data
        </button>
      </section>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-bold uppercase tracking-[0.04em] text-red-700">
          Subscription data failed to load. Check admin token and backend availability.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 p-4 lg:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-950 text-white flex items-center justify-center">
                <CreditCard size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold uppercase tracking-[0.04em] text-gray-950">
                  Subscriptions
                </h3>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  {pageItemCount} shown on page {currentPage} of {totalPages} / {totalItems} total
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_120px] xl:min-w-[560px]">
              <label className="relative block">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search current page"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-[13px] font-semibold text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-bold uppercase tracking-[0.04em] text-gray-700 outline-none focus:border-gray-400"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All Status" : status}
                  </option>
                ))}
              </select>

              <select
                value={limit}
                onChange={(event) => changeLimit(Number(event.target.value))}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-bold uppercase tracking-[0.04em] text-gray-700 outline-none focus:border-gray-400"
              >
                {[10, 20, 50].map((value) => (
                  <option key={value} value={value}>
                    {value} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Subscriber", "Plan", "Status", "Billing", "Period", "Auto Renew", "Created"].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-gray-500">
                      <Loader2 size={17} className="animate-spin" />
                      Loading subscriptions
                    </div>
                  </td>
                </tr>
              ) : filteredSubscriptions.length > 0 ? (
                filteredSubscriptions.map((subscription) => (
                  <SubscriptionRow key={subscription.id} subscription={subscription} />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-gray-700">
                      No subscriptions found
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-gray-400">
                      Adjust the current-page search or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(value - 1, 1))}
              disabled={!meta?.hasPrevPage || isFetching}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={15} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
              disabled={!meta?.hasNextPage || isFetching}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SubscriptionsPage;
