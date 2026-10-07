"use client";

import { StatCard } from "@/components/ui/common/StatCard";
import { useGetRequesterDashboardSummaryQuery } from "@/redux/features/api/requester/dashboard/requesterDashboardStatsApi";
import {
  Layers,
  CheckCircle,
  Clock,
  PlayCircle,
  Send,
  RefreshCw,
  Shield,
  AlertTriangle,
  XCircle,
  Timer,
  Database,
  Star,
} from "lucide-react";

const RequesterDashbordStatsHome = () => {
  const { data } = useGetRequesterDashboardSummaryQuery({
    range: "30d",
  });

  const summary = data?.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
      <StatCard
        icon={Layers}
        label="TASKS CREATED"
        value={(summary?.tasks.created ?? 0).toString()}
        subtext="Total created tasks"
      />

      <StatCard
        icon={Clock}
        label="OPEN TASKS"
        value={(summary?.tasks.open ?? 0).toString()}
        subtext="Accepting applications"
      />

      <StatCard
        icon={PlayCircle}
        label="IN PROGRESS"
        value={(summary?.tasks.inProgress ?? 0).toString()}
        subtext="Currently active"
      />

      <StatCard
        icon={Send}
        label="SUBMITTED"
        value={(summary?.tasks.submitted ?? 0).toString()}
        subtext="Awaiting review"
      />

      <StatCard
        icon={RefreshCw}
        label="REVISION REQUESTED"
        value={(summary?.tasks.revisionRequested ?? 0).toString()}
        subtext="Needs changes"
      />

      <StatCard
        icon={CheckCircle}
        label="COMPLETED"
        value={(summary?.tasks.completed ?? 0).toString()}
        subtext="Successfully finished"
      />

      <StatCard
        icon={Shield}
        label="APPROVED"
        value={(summary?.tasks.approved ?? 0).toString()}
        subtext="Approved tasks"
      />

      <StatCard
        icon={XCircle}
        label="CANCELLED"
        value={(summary?.tasks.cancelled ?? 0).toString()}
        subtext="Cancelled tasks"
      />

      <StatCard
        icon={AlertTriangle}
        label="DISPUTED"
        value={(summary?.tasks.disputed ?? 0).toString()}
        subtext="Under dispute"
      />

      <StatCard
        icon={Timer}
        label="EXPIRED"
        value={(summary?.tasks.expired ?? 0).toString()}
        subtext="Past deadline"
      />

      <StatCard
        icon={Database}
        label="CREDITS SPENT"
        value={(summary?.spend.totalTaskCreditsSpent ?? 0).toString()}
        subtext="Total credits used"
      />

      <StatCard
        icon={Star}
        label="APPROVAL RATE"
        value={`${summary?.performance.approvalRate ?? 0}%`}
        subtext="Performance metric"
      />
    </div>
  );
};

export default RequesterDashbordStatsHome;