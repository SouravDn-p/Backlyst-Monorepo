import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  type DashboardPeriod,
  useGetAdminDashboardOverviewQuery,
  useGetAdminTaskLifecyclePanelQuery,
} from "../redux/feature/dashboard/dashboardApi";

type TimeRange = DashboardPeriod;

const SECURITY_AUDIT_ITEMS = [
  { id: 1, title: "MULTI-ROLE DISABLED OVERLAP RESTRICTED IND AU…", date: "SCAN DATE" },
  { id: 2, title: "USER-DATA PORTABILITY BLOCKED BY: 868", date: "SCAN DATE" },
  { id: 3, title: "VERIFICATION-SIGNAL MISMATCH (EVENT: 5)…", date: "SCAN DATE" },
];

const GOVERNANCE_FEED = [
  { title: "EDCGM REFERRAL", meta: "TODAY · POLICY ADMIN" },
  { title: "UNITY SUSPENSION", meta: "YESTERDAY · AUTOMATION SET" },
  { title: "THRESHOLD OVERRIDE", meta: "JAN 16TH · SUPER ADMIN" },
];

const formatNumber = (value?: number) =>
  typeof value === "number" ? value.toLocaleString("en-US") : "...";

const formatDisplayValue = (value?: string) => value ?? "...";

const DashboardPage = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("DAILY");
  const {
    data: overviewResponse,
    isFetching,
    isError,
  } = useGetAdminDashboardOverviewQuery(timeRange);
  const overview = overviewResponse?.data;

  const {
    data: lifecycleResponse,
    isFetching: isFetchingLifecycle,
  } = useGetAdminTaskLifecyclePanelQuery({ range: timeRange });
  const lifecycleData = lifecycleResponse?.data;

  const activeWebsiteStats = [
    {
      tag: "VERIFIED",
      color: "#00C950",
      value: formatNumber(overview?.activeWebsites.verified),
    },
    {
      tag: "PENDING",
      color: "#FF6900",
      value: formatNumber(overview?.activeWebsites.pending),
    },
    {
      tag: "FLAGGED",
      color: "#FB2C36",
      value: formatNumber(overview?.activeWebsites.flagged),
    },
  ];

  const creditSimulationStats = [
    {
      label: "Subscriptions",
      value: formatDisplayValue(
        overview?.creditSimulation.subscriptionCredits.displayValue
      ),
    },
    {
      label: "Referral/Earned",
      value: formatDisplayValue(
        overview?.creditSimulation.referralEarnedCredits.displayValue
      ),
    },
    {
      label: "Visibility",
      value: formatDisplayValue(
        overview?.creditSimulation.visibilityCredits.displayValue
      ),
    },
  ];

  return (
    <div className="w-full font-arimo space-y-6">
      {/* ═══ HEADER ═══ */}
      <section>
        <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
          Institutional Operations Dashboard
        </h1>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-2 uppercase tracking-[0.03em] leading-relaxed">
          Aggregate Daily Institutional Oversight, Real-Time Monitoring of
          Operational Transparency, Enhanced Risk, Task Lifecycle Analysis
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {(["DAILY", "WEEKLY", "MONTHLY"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-5 py-2 rounded-md text-[13px] font-bold uppercase tracking-wider
                transition-all duration-150
                ${
                  timeRange === range
                    ? "bg-[#000000] text-white"
                    : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>

        {isError && (
          <p className="text-[12px] font-bold text-red-500 uppercase tracking-wider mt-3">
            Dashboard overview could not be loaded.
          </p>
        )}
      </section>

      {/* ═══ STAT CARDS ═══ */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity ${
          isFetching ? "opacity-70" : "opacity-100"
        }`}
      >
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Active Users
          </p>
          <p className="text-[40px] font-bold text-[#000000] leading-none">
            {formatNumber(overview?.activeUsers.count)}
          </p>
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-3">
            {overview?.activeUsers.description ?? "..."}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Active Websites
          </p>
          <div className="space-y-2.5">
            {activeWebsiteStats.map((item) => (
              <div key={item.tag} className="flex items-center justify-between">
                <span
                  className="text-[11px] font-bold text-white uppercase px-3 py-[3px] rounded"
                  style={{ backgroundColor: item.color }}
                >
                  {item.tag}
                </span>
                <span className="text-[18px] font-bold text-[#000000]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Task Oversight
          </p>
          <p className="text-[40px] font-bold text-[#000000] leading-none">
            {formatNumber(overview?.taskOversight.totalTasks)}
          </p>
          <div className="flex items-center mt-3">
            <div className="flex-1">
              <span className="text-[22px] font-bold text-[#000000]">
                {formatNumber(overview?.taskOversight.totalUsers)}
              </span>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                Total Users
              </p>
            </div>
            <div className="w-px h-10 bg-gray-200 mx-4" />
            <div className="flex-1 text-right">
              <span className="text-[22px] font-bold text-status-flagged">
                {formatNumber(overview?.taskOversight.disputedTasks)}
              </span>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                Disputed
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Credit Simulation
          </p>
          <div className="space-y-2.5">
            {creditSimulationStats.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-gray-500 uppercase">
                  {item.label}
                </span>
                <span className="text-[18px] font-bold text-[#000000]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <div className={`bg-white rounded-xl border border-gray-200 p-5 sm:p-6 transition-opacity ${
            isFetchingLifecycle ? "opacity-70" : "opacity-100"
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#000000] flex-shrink-0" />
                <h2 className="text-[16px] font-bold text-[#000000] uppercase tracking-[0.05em]">
                  Task Lifecycle Management
                </h2>
              </div>
              <button className="text-[13px] font-bold text-brand-indigo uppercase tracking-wider hover:underline">
                Comprehensive View
              </button>
            </div>

            {/* Lifecycle Numbers — all BLACK, only labels colored */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { value: formatNumber(lifecycleData?.lifecycle.created), label: "Created", labelColor: "#9CA3AF" },
                { value: formatNumber(lifecycleData?.lifecycle.accepted), label: "Accepted", labelColor: "#155DFC" },
                { value: formatNumber(lifecycleData?.lifecycle.completed), label: "Completed", labelColor: "#9CA3AF" },
                { value: formatNumber(lifecycleData?.lifecycle.disputed), label: "Disputed", labelColor: "#FB2C36" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-[36px] lg:text-[42px] font-bold text-[#000000] leading-none">
                    {item.value}
                  </p>
                  <p
                    className="text-[12px] font-bold uppercase tracking-wider mt-2"
                    style={{ color: item.labelColor }}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mb-6">
              <h3 className="text-[15px] font-bold text-[#000000] uppercase tracking-wider mb-3">
                Visibility Mode Status
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[32px] lg:text-[36px] font-bold text-[#000000] leading-none">2,142</p>
                  <p className="text-[12px] font-bold text-status-visible uppercase tracking-wider mt-1">Visible</p>
                </div>
                <div>
                  <p className="text-[32px] lg:text-[36px] font-bold text-[#000000] leading-none">42</p>
                  <p className="text-[12px] font-bold text-status-grace uppercase tracking-wider mt-1">Grace Period</p>
                </div>
                <div>
                  <p className="text-[32px] lg:text-[36px] font-bold text-[#000000] leading-none">38</p>
                  <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mt-1">Hidden</p>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-[15px] font-bold text-[#000000] uppercase tracking-wider mb-2">
                Backlink Trust Ratio
              </h3>
              <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-trust-bar rounded-full transition-all duration-500" 
                  style={{ width: `${lifecycleData?.backlinkTrustRatio.followRatio ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[12px] font-bold mt-2">
                <span className="text-trust-bar uppercase tracking-wider">Follow: {lifecycleData?.backlinkTrustRatio.followRatio ?? 0}%</span>
                <span className="text-gray-400 uppercase tracking-wider">No Follow: {lifecycleData?.backlinkTrustRatio.noFollowRatio ?? 0}%</span>
              </div>
            </div>
            <div className="pt-5 border-t border-gray-100">
              <h3 className="text-[15px] font-bold text-[#000000] uppercase tracking-wider mb-3">
                Operational Actions
              </h3>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-[15px] font-medium text-gray-600 uppercase tracking-wide">
                  Open Violation Protocol
                </span>
                <button className="bg-brand-indigo text-white text-[13px] font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-brand-indigo-light transition-colors">
                  Compliance Center
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider">
                  Security Audit
                </h3>
              </div>
              <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">
                Current Emergent Violations
              </span>
            </div>
            <div className="space-y-3">
              {SECURITY_AUDIT_ITEMS.map((item) => (
                <div key={item.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start gap-2">
                    <span className="text-[12px] font-bold text-gray-400 mt-0.5 flex-shrink-0">
                      {item.id}.
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-[#000000] leading-tight">{item.title}</p>
                      <p className="text-[12px] font-medium text-gray-400 mt-1 uppercase tracking-wide">{item.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-4">
              Recent Governance Feed
            </h3>
            <div className="space-y-4">
              {GOVERNANCE_FEED.map((item, i) => (
                <div key={i}>
                  <p className="text-[14px] font-bold text-[#000000]">{item.title}</p>
                  <p className="text-[12px] font-medium text-gray-400 mt-0.5">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <Link
              to="/logs"
              className="block text-center text-[14px] font-bold text-[#000000] uppercase tracking-wider hover:text-brand-indigo transition-colors py-1"
            >
              Access Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
