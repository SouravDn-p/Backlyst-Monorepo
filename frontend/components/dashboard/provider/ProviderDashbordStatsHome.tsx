"use client";

import { StatCard } from "@/components/ui/common/StatCard";
import {
  Layers,
  CheckCircle,
  Database,
  Star,
  Clock,
  Briefcase,
  RefreshCw,
  CreditCard,
  XCircle,
  AlertTriangle,
  Timer,
} from "lucide-react";

import { useGetCreditsMeQuery } from "@/redux/features/api/credit/creditApi";
import { useGetProviderDashboardSummaryQuery } from "@/redux/features/api/provider/dashboard/providerDashboardApi";

const ProviderDashbordStatsHome = () => {
  const { data: dashboardData } =
    useGetProviderDashboardSummaryQuery({
      range: "30d",
    });

  const { data: creditsData } = useGetCreditsMeQuery();

  const summary = dashboardData?.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">

      {/* CREDITS */}
      <StatCard
        icon={Database}
        label="TOTAL CREDITS EARNED"
        value={(creditsData?.completedTaskTotalCredits ?? 0).toString()}
        subtext="Updated real-time"
      />

      <StatCard
        icon={CreditCard}
        label="PURCHASED CREDITS"
        value={(creditsData?.purchasedTaskCredits ?? 0).toString()}
        subtext="Manually bought credits"
      />

      {/* APPLICATIONS */}
      <StatCard
        icon={Briefcase}
        label="TOTAL APPLIED"
        value={(summary?.applications.totalApplied ?? 0).toString()}
        subtext="Applications submitted"
      />

      <StatCard
        icon={Clock}
        label="PENDING APPLICATIONS"
        value={(summary?.applications.pending ?? 0).toString()}
        subtext="Awaiting review"
      />

      {/* TASK STATUS */}
      <StatCard
        icon={Layers}
        label="IN PROGRESS TASKS"
        value={(summary?.tasks.inProgress ?? 0).toString()}
        subtext="Currently active"
      />

      <StatCard
        icon={CheckCircle}
        label="COMPLETED TASKS"
        value={(summary?.tasks.completed ?? 0).toString()}
        subtext="Successfully completed"
      />

      <StatCard
        icon={RefreshCw}
        label="REVISION RATE"
        value={`${summary?.performance.revisionRate ?? 0}%`}
        subtext="Tasks needing revision"
      />

      <StatCard
        icon={Star}
        label="APPROVAL RATE"
        value={`${summary?.performance.approvalRate ?? 0}%`}
        subtext="Performance metric"
      />

      {/* EXTRA TASK STATES (NEW) */}

      <StatCard
        icon={RefreshCw}
        label="REVISION REQUESTED"
        value={(summary?.tasks.revisionRequested ?? 0).toString()}
        subtext="Needs updates"
      />

      <StatCard
        icon={XCircle}
        label="CANCELLED TASKS"
        value={(summary?.tasks.cancelled ?? 0).toString()}
        subtext="Cancelled by system/user"
      />

      <StatCard
        icon={AlertTriangle}
        label="DISPUTED TASKS"
        value={(summary?.tasks.disputed ?? 0).toString()}
        subtext="Under review"
      />

      <StatCard
        icon={Timer}
        label="EXPIRED TASKS"
        value={(summary?.tasks.expired ?? 0).toString()}
        subtext="Deadline passed"
      />
    </div>
  );
};

export default ProviderDashbordStatsHome;