"use client";

import { useGetReceivedDirectTasksQuery } from "@/redux/features/api/directTask/directTaskApi";
import { AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function PendingDirectTasksBanner() {
  const { data, isLoading } = useGetReceivedDirectTasksQuery({ limit: 1, status: "PENDING" });
  
  if (isLoading) return null;
  
  const pendingCount = data?.data?.meta?.totalItems || 0;
  
  if (pendingCount === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-red-800">
            {pendingCount} Direct Task {pendingCount === 1 ? "Request" : "Requests"} Pending
          </h3>
          <p className="text-sm text-red-600">
            You have received direct placement requests that require your review.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/jobs?tab=direct-tasks"
        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        Review Requests
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

