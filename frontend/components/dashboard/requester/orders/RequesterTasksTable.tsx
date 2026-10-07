"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import RecentOrders from "./RecentOrders";
import { mapRequesterTaskToOrderItem } from "./requesterTaskOrderHelpers";
import { useGetRequesterTasksQuery } from "@/redux/features/api/requesterTask/requesterTaskApi";
import type {
  GetRequesterTasksRequest,
  RequesterTaskLifecycleStatus,
} from "@/types/requesterTask/requesterTaskTypes";

interface RequesterTasksTableProps {
  limit?: number;
  role: string;
  showSearch?: boolean;
  status?: RequesterTaskLifecycleStatus;
  title: string;
}

function getApiErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return "Failed to load requester tasks.";
}

export default function RequesterTasksTable({
  limit = 5,
  role,
  showSearch = false,
  status,
  title,
}: RequesterTasksTableProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const queryParams: GetRequesterTasksRequest = {
    limit,
    page,
    status,
  };

  const { data, error, isFetching, isLoading } =
    useGetRequesterTasksQuery(queryParams);

  useEffect(() => {
    if (error) {
      toast.error(getApiErrorMessage(error));
    }
  }, [error]);

  const tasks = useMemo(() => data?.data?.items ?? [], [data]);
  const meta = data?.data?.meta;

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tasks
      .map(mapRequesterTaskToOrderItem)
      .filter((order) => {
        if (!normalizedSearch) return true;

        return [
          order.name,
          order.id,
          order.provider?.name ?? "",
          order.requester?.name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [searchTerm, tasks]);

  return (
    <div className="flex flex-col gap-5  rounded-2xl max-w-[90vw]">
      {showSearch && (
        <div className="relative w-full md:w-80 self-end">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#535862]" />
          <input
            type="text"
            placeholder="Search by task, ID, or provider..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-11 pr-4 py-3 w-[90vw] md:w-full bg-white border border-[#e2e2e2] rounded-full text-sm focus:outline-none focus:border-[#6366f1] placeholder:text-[#535862]"
          />
        </div>
      )}

      {isLoading || isFetching ? (
        <div className="bg-white border border-[#e9eaeb] rounded-2xl p-8 text-sm text-[#667085]">
          Loading requester tasks...
        </div>
      ) : (
        <RecentOrders
          title={title}
          role={role}
          orders={filteredOrders}
          currentPage={meta?.currentPage ?? meta?.page ?? 1}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
