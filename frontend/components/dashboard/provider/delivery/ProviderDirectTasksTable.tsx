"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import Pagination from "@/components/ui/Pagination";
import AcceptDirectTaskModal from "./modals/AcceptDirectTaskModal";
import RejectDirectTaskModal from "./modals/RejectDirectTaskModal";
import { useGetReceivedDirectTasksQuery } from "@/redux/features/api/directTask/directTaskApi";
import type {
  GetDirectTasksRequest,
  DirectTaskRequestItem,
  DirectTaskRequestStatus,
} from "@/types/directTask/directTaskTypes";
import { formatPlacementType, formatLinkAttribute } from "@/components/dashboard/provider/providerTaskHelpers";

const SCOPE_TABS = [
  { label: "ALL", value: "ALL" },
  { label: "PENDING", value: "PENDING" },
  { label: "ACCEPTED", value: "ACCEPTED" },
  { label: "REJECTED", value: "REJECTED" },
  { label: "CANCELLED", value: "CANCELLED" },
];

function getStatusStyle(status: string): { bg: string; text: string; border?: string } {
  const s = status?.toUpperCase();
  if (s === "PENDING") return { bg: "#fef9c3", text: "#ca8a04" };
  if (s === "ACCEPTED") return { bg: "#dcfce7", text: "#16a34a" };
  if (s === "REJECTED") return { bg: "#fee2e2", text: "#dc2626" };
  if (s === "CANCELLED") return { bg: "#f3f4f6", text: "#6b7280" };
  return { bg: "#f3f4f6", text: "#374151" };
}

function Chip({ children, color }: { children: React.ReactNode; color: "indigo" | "violet" | "emerald" }) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}

export default function ProviderDirectTasksTable() {
  const [scope, setScope] = useState<DirectTaskRequestStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [taskToAccept, setTaskToAccept] = useState<string | null>(null);
  const [taskToReject, setTaskToReject] = useState<string | null>(null);

  const queryParams: GetDirectTasksRequest = {
    page: currentPage,
    limit: 10,
    status: scope === "ALL" ? undefined : scope,
  };

  const { data, error, isFetching, isLoading } = useGetReceivedDirectTasksQuery(queryParams);

  useEffect(() => {
    if (error) {
      const err = error as any;
      toast.error(err?.data?.message || "Failed to load direct tasks.");
    }
  }, [error]);

  const tasks = useMemo(() => data?.data?.items ?? [], [data]);
  const meta = data?.data?.meta;

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!normalizedSearch) return true;
      return [
        task.projectTitle,
        task.anchorText,
        task.targetUrl,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [searchTerm, tasks]);

  return (
    <>
      <div className="w-full bg-[#f9fafb] py-8 pt-0">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-bold leading-tight text-[#111827]">Received Direct Tasks</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Review and manage direct placement task requests sent directly to you by requesters.
            </p>
          </div>
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by title, url..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/10"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
          <div className="flex items-center gap-0 border-b border-[#e5e7eb] px-6">
            {SCOPE_TABS.map((tab) => {
              const active = scope === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setScope(tab.value as any);
                    setCurrentPage(1);
                  }}
                  className={`relative mr-6 py-4 text-xs font-semibold tracking-[0.08em] transition-colors ${
                    active ? "text-[#f97316]" : "text-[#9ca3af] hover:text-[#374151]"
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-[#f97316]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="w-[30%] px-6 py-4 text-left text-[11px] font-semibold tracking-[0.1em] text-[#9ca3af]">PROJECT DETAILS</th>
                  <th className="w-[28%] px-6 py-4 text-left text-[11px] font-semibold tracking-[0.1em] text-[#9ca3af]">REQUIREMENTS SNAPSHOT</th>
                  <th className="w-[16%] px-6 py-4 text-left text-[11px] font-semibold tracking-[0.1em] text-[#9ca3af]">EARNINGS (CR)</th>
                  <th className="w-[16%] px-6 py-4 text-left text-[11px] font-semibold tracking-[0.1em] text-[#9ca3af]">STATUS</th>
                  <th className="w-[10%] px-6 py-4 text-left text-[11px] font-semibold tracking-[0.1em] text-[#9ca3af]">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f3f4f6]">
                {isLoading || isFetching ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-[#9ca3af]">
                      Loading direct requests...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-[#9ca3af]">
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskRow 
                      key={task.id} 
                      task={task} 
                      onAccept={() => setTaskToAccept(task.id)}
                      onReject={() => setTaskToReject(task.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(meta?.totalPages ?? 1) > 1 && (
            <div className="border-t border-[#f3f4f6] px-6 py-4">
              <Pagination
                currentPage={meta?.currentPage ?? 1}
                totalPages={meta?.totalPages ?? 1}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      <AcceptDirectTaskModal
        isOpen={!!taskToAccept}
        onClose={() => setTaskToAccept(null)}
        taskId={taskToAccept!}
      />
      
      <RejectDirectTaskModal
        isOpen={!!taskToReject}
        onClose={() => setTaskToReject(null)}
        taskId={taskToReject!}
      />
    </>
  );
}

function TaskRow({ task, onAccept, onReject }: { task: DirectTaskRequestItem; onAccept: () => void; onReject: () => void }) {
  const statusStyle = getStatusStyle(task.status);
  
  return (
    <tr className="group transition-colors hover:bg-[#fafafa]">
      <td className="px-6 py-6">
        <div className="text-[15px] font-semibold text-[#111827]">{task.projectTitle}</div>
        <div className="mt-2 text-sm text-[#6b7280]">
          ID: {task.id.slice(0, 8).toUpperCase()}
        </div>
      </td>
      <td className="px-6 py-6">
        <div className="flex flex-wrap gap-2">
          <Chip color="indigo">{formatPlacementType(task.placementType).toUpperCase()}</Chip>
          <Chip color="violet">{formatLinkAttribute(task.linkAttribute).toUpperCase()}</Chip>
          {task.anchorText && (
            <Chip color="emerald">{task.anchorText}</Chip>
          )}
        </div>
      </td>
      <td className="px-6 py-6">
        <div className="text-[22px] font-bold tracking-tight text-[#111827]">
          {task.creditCost} CR
        </div>
        <div className="mt-1 text-[10px] font-medium leading-snug text-[#9ca3af]">
          IN {task.requestedDeadlineDays} DAYS
        </div>
      </td>
      <td className="px-6 py-6">
        <span
          className="inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-wide"
          style={{
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            border: statusStyle.border ? `1px solid ${statusStyle.border}` : undefined,
          }}
        >
          {task.status}
        </span>
      </td>
      <td className="px-6 py-6">
        {task.status === "PENDING" ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAccept}
              aria-label="Accept Task"
              className="text-[#16a34a] transition-colors hover:text-[#15803d] cursor-pointer"
            >
              <CheckCircle className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={onReject}
              aria-label="Reject Task"
              className="text-[#dc2626] transition-colors hover:text-[#b91c1c] cursor-pointer"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}
