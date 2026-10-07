"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Eye, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import Pagination from "@/components/ui/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProviderTaskOverviewModal from "./modals/ProviderTaskOverviewModal";
import {
  useGetProviderDeadlineStatusQuery,
  useGetProviderTaskDetailQuery,
  useGetProviderTasksQuery,
} from "@/redux/features/api/providerTask/providerTaskApi";
import {
  formatCredits,
  formatDueDate,
  formatLifecycleStatus,
  formatLinkAttribute,
  formatPlacementType,
  getApiErrorMessage,
} from "@/components/dashboard/provider/providerTaskHelpers";
import {
  ProviderTaskLifecycleStatus,
  ProviderTaskScope,
  type GetProviderTasksRequest,
  type ProviderTask,
} from "@/types/providerTask/providerTaskTypes";

// ─── Scope tabs mapped to match the screenshot labels ────────────────────────
const SCOPE_TABS = [
  { label: "ALL", value: ProviderTaskScope.INVOLVED },
  { label: "AVAILABLE", value: ProviderTaskScope.APPLIED },   // adjust enum values as needed
  { label: "APPLIED", value: ProviderTaskScope.SELECTED },    // adjust enum values as needed
  { label: "ASSIGNED", value: "ASSIGNED" as ProviderTaskScope },
  { label: "IN PROGRESS", value: "IN_PROGRESS" as ProviderTaskScope },
  { label: "SUBMITTED", value: "SUBMITTED" as ProviderTaskScope },
];

const LIFECYCLE_FILTERS = [
  { label: "All statuses", value: ProviderTaskLifecycleStatus.ALL },
  { label: "Open", value: ProviderTaskLifecycleStatus.OPEN },
  {
    label: "Waiting for applicants",
    value: ProviderTaskLifecycleStatus.WAITING_FOR_APPLICANTS,
  },
  { label: "Applied", value: ProviderTaskLifecycleStatus.APPLIED },
  { label: "Selected", value: ProviderTaskLifecycleStatus.SELECTED },
  { label: "Assigned", value: ProviderTaskLifecycleStatus.ASSIGNED },
  { label: "In progress", value: ProviderTaskLifecycleStatus.IN_PROGRESS },
  { label: "Submitted", value: ProviderTaskLifecycleStatus.SUBMITTED },
  {
    label: "Revision requested",
    value: ProviderTaskLifecycleStatus.REVISION_REQUESTED,
  },
  { label: "Approved", value: ProviderTaskLifecycleStatus.APPROVED },
  { label: "Completed", value: ProviderTaskLifecycleStatus.COMPLETED },
  { label: "Cancelled", value: ProviderTaskLifecycleStatus.CANCELLED },
  { label: "Expired", value: ProviderTaskLifecycleStatus.EXPIRED },
  { label: "Frozen", value: ProviderTaskLifecycleStatus.FROZEN },
  { label: "Disputed", value: ProviderTaskLifecycleStatus.DISPUTED },
];

// ─── Status pill colour map ───────────────────────────────────────────────────
function getStatusStyle(status: string): { bg: string; text: string; border?: string } {
  const s = status?.toLowerCase();
  if (s === "completed") return { bg: "#dcfce7", text: "#16a34a" };
  if (s === "available_to_apply" || s === "open") return { bg: "#fef9c3", text: "#ca8a04" };
  if (s === "submitted") return { bg: "#fee2e2", text: "#dc2626" };
  if (s === "applied") return { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
  if (s === "in_progress") return { bg: "#dbeafe", text: "#1d4ed8" };
  if (s === "assigned") return { bg: "#ede9fe", text: "#7c3aed" };
  if (s === "revision_requested") return { bg: "#ffedd5", text: "#ea580c" };
  if (s === "approved") return { bg: "#d1fae5", text: "#059669" };
  if (s === "cancelled") return { bg: "#f3f4f6", text: "#6b7280" };
  if (s === "expired") return { bg: "#fce7f3", text: "#be185d" };
  if (s === "frozen") return { bg: "#e0f2fe", text: "#0369a1" };
  if (s === "disputed") return { bg: "#fef3c7", text: "#b45309" };
  return { bg: "#f3f4f6", text: "#374151" };
}

// ─── DR badge colour by rating ────────────────────────────────────────────────
function getDrStyle(dr: number): { bg: string; text: string } {
  if (dr >= 80) return { bg: "#dcfce7", text: "#15803d" };
  if (dr >= 60) return { bg: "#d1fae5", text: "#065f46" };
  if (dr >= 40) return { bg: "#fef9c3", text: "#a16207" };
  return { bg: "#fee2e2", text: "#b91c1c" };
}

export default function ProviderTasksBoard() {
  const [scope, setScope] = useState<ProviderTaskScope>(ProviderTaskScope.INVOLVED);
  const [lifecycleStatus, setLifecycleStatus] = useState<ProviderTaskLifecycleStatus>(
    ProviderTaskLifecycleStatus.ALL,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<ProviderTask | null>(null);

  const queryParams: GetProviderTasksRequest = {
    scope,
    page: currentPage,
    limit: 10,
    lifecycleStatus:
      lifecycleStatus === ProviderTaskLifecycleStatus.ALL ? undefined : lifecycleStatus,
  };

  const { data, error, isFetching, isLoading } = useGetProviderTasksQuery(queryParams);
  const { data: deadlineStatusResponse, error: deadlineStatusError } =
    useGetProviderDeadlineStatusQuery();
  const {
    data: selectedTaskResponse,
    error: selectedTaskError,
  } = useGetProviderTaskDetailQuery(selectedTask?.id ?? "", {
    skip: !selectedTask?.id,
  });

  useEffect(() => {
    if (error) toast.error(getApiErrorMessage(error));
  }, [error]);

  useEffect(() => {
    if (deadlineStatusError) toast.error(getApiErrorMessage(deadlineStatusError));
  }, [deadlineStatusError]);

  useEffect(() => {
    if (selectedTaskError && selectedTask) {
      toast.error(getApiErrorMessage(selectedTaskError));
    }
  }, [selectedTask, selectedTaskError]);

  const tasks = useMemo(() => data?.data?.items ?? data?.data?.data ?? [], [data]);
  const meta = data?.data?.meta;

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!normalizedSearch) return true;
      return [
        task.projectTitle,
        task.anchorText,
        task.targetUrl,
        task.requesterWebsite?.name ?? "",
        task.requesterWebsite?.websiteUrl ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [searchTerm, tasks]);

  return (
    <>
      <div className="min-h-screen w-full bg-[#f9fafb] px-6 py-8">
        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-[#111827]">My Jobs</h1>
            <p className="mt-1 text-sm text-[#6b7280]">
              Browse available placements, manage assigned work, and submit live links.
            </p>
          </div>

          {/* Search bar — top right */}
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by site, ID, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/10"
            />
          </div>
        </div>

        {/* ── Main card ─────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">

          {/* Scope tabs */}
          <div className="flex items-center gap-0 border-b border-[#e5e7eb] px-6">
            {SCOPE_TABS.map((tab) => {
              const active = scope === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setScope(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`relative mr-6 py-4 text-xs font-semibold tracking-[0.08em] transition-colors ${active
                    ? "text-[#f97316]"
                    : "text-[#9ca3af] hover:text-[#374151]"
                    }`}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-[#f97316]" />
                  )}
                </button>
              );
            })}

            {/* Lifecycle filter pushed to right side of tab bar */}
            <div className="ml-auto py-2">
              <Select
                value={lifecycleStatus}
                onValueChange={(value) => {
                  setLifecycleStatus(value as ProviderTaskLifecycleStatus);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 min-w-[180px] rounded-lg border-[#e5e7eb] text-xs text-[#374151]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_FILTERS.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value} className="text-xs">
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  {[
                    { label: "PLACEMENT REQUIREMENTS", width: "w-[30%]" },
                    { label: "REQUIREMENTS SNAPSHOT", width: "w-[28%]" },
                    { label: "EARNINGS (CR)", width: "w-[16%]" },
                    { label: "WORK STATUS", width: "w-[16%]" },
                    { label: "ACTION", width: "w-[10%]" },
                  ].map(({ label, width }) => (
                    <th
                      key={label}
                      className={`${width} px-6 py-4 text-left text-[11px] font-semibold tracking-[0.1em] text-[#9ca3af]`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f3f4f6]">
                {isLoading || isFetching ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-[#9ca3af]">
                      Loading provider tasks…
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-[#9ca3af]">
                      No provider tasks matched this scope and filter.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onOpen={() => setSelectedTask(task)} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination inside card */}
          {(meta?.totalPages ?? 1) > 1 && (
            <div className="border-t border-[#f3f4f6] px-6 py-4">
              <Pagination
                currentPage={meta?.currentPage ?? meta?.page ?? 1}
                totalPages={meta?.totalPages ?? 1}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      <ProviderTaskOverviewModal
        key={selectedTask?.id ?? "provider-task-overview"}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTaskResponse?.data ?? selectedTask}
      />
    </>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ onOpen, task }: { onOpen: () => void; task: ProviderTask }) {
  const router = useRouter();
  const statusStyle = getStatusStyle(task.lifecycleStatus);
  const drStyle = typeof task.requiredDomainRating === "number"
    ? getDrStyle(task.requiredDomainRating)
    : null;

  return (
    <tr className="group transition-colors hover:bg-[#fafafa]">
      {/* Placement requirements */}
      <td className="px-6 py-6">
        <div className="text-[15px] font-semibold text-[#111827]">{task.projectTitle}</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-[#6b7280]">
            {task.requesterWebsite?.websiteUrl || task.requesterWebsite?.name || "—"}
          </span>
          {drStyle && typeof task.requiredDomainRating === "number" && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: drStyle.bg, color: drStyle.text }}
            >
              DR {task.requiredDomainRating}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#9ca3af]">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            ID-{task.id.slice(0, 4).toUpperCase()}&nbsp;&nbsp;DUE {formatDueDate(task)}
          </span>
        </div>
      </td>

      {/* Requirements snapshot */}
      <td className="px-6 py-6">
        <div className="flex flex-wrap gap-2">
          <Chip color="indigo">{formatPlacementType(task.placementType).toUpperCase()}</Chip>
          <Chip color="violet">{formatLinkAttribute(task.linkAttribute).toUpperCase()}</Chip>
          {task.anchorText && (
            <Chip color="emerald">{task.anchorText}</Chip>
          )}
        </div>
      </td>

      {/* Earnings */}
      <td className="px-6 py-6">
        <div className="text-[22px] font-bold tracking-tight text-[#111827]">
          {formatCredits(task, "—")}
        </div>
        <div className="mt-1 text-[10px] font-medium leading-snug text-[#9ca3af]">
          EARNED ON APPROVAL
          <br />
          NON-WITHDRAWABLE
        </div>
      </td>

      {/* Work status */}
      <td className="px-6 py-6">
        <span
          className="inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-wide"
          style={{
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            border: statusStyle.border ? `1px solid ${statusStyle.border}` : undefined,
          }}
        >
          {formatLifecycleStatus(task.lifecycleStatus).toUpperCase()}
        </span>
      </td>

      {/* Action */}
      <td className="px-6 py-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpen}
            aria-label="View details"
            className="text-[#22c55e] transition-colors hover:text-[#16a34a] cursor-pointer"
          >
            <Eye className="h-5 w-5" />
          </button>
          {task.lifecycleStatus !== ProviderTaskLifecycleStatus.WAITING_FOR_APPLICANTS &&
            task.lifecycleStatus !== ProviderTaskLifecycleStatus.DRAFT && (
              <button
                type="button"
                onClick={() => {
                  const recipientId = task.requester?.id;
                  const name = task.requester?.name || "";
                  const avatar = task.requester?.imageUrl || "";
                  if (recipientId) {
                    router.push(
                      `/dashboard/messages?recipientId=${recipientId}&taskId=${task.id}&recipientName=${encodeURIComponent(name)}&recipientAvatar=${encodeURIComponent(avatar)}`
                    );
                  } else {
                    router.push("/dashboard/messages");
                  }
                }}
                aria-label="Message"
                className="text-[#9E77ED] hover:text-[#7f56d9] cursor-pointer transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            )}
        </div>
      </td>
    </tr>
  );
}

// ─── Chip helper ──────────────────────────────────────────────────────────────
function Chip({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "indigo" | "violet" | "emerald";
}) {
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
