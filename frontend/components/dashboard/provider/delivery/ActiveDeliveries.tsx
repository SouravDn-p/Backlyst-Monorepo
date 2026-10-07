"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Calendar, Eye, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import Pagination from "@/components/ui/Pagination";
import ProviderTaskOverviewModal from "./modals/ProviderTaskOverviewModal";
import {
  useGetProviderTaskDetailQuery,
  useGetProviderTasksQuery,
} from "@/redux/features/api/providerTask/providerTaskApi";
import {
  formatCredits,
  formatDueDate,
  formatDomain,
  formatLifecycleStatus,
  formatLinkAttribute,
  formatPlacementType,
  getApiErrorMessage,
  getDomainRatingStyle,
  getProviderTaskLifecycleStyle,
} from "@/components/dashboard/provider/providerTaskHelpers";
import { ProviderTaskScope, type ProviderTask } from "@/types/providerTask/providerTaskTypes";

type Props = {
  title?: string;
};

export default function ActiveDeliveries({ title = "Active Deliveries" }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<ProviderTask | null>(null);

  const { data, error, isFetching, isLoading } = useGetProviderTasksQuery({
    scope: ProviderTaskScope.INVOLVED,
    page: currentPage,
    limit: 5,
  });

  const {
    data: selectedTaskResponse,
    error: selectedTaskError,
  } = useGetProviderTaskDetailQuery(selectedTask?.id ?? "", {
    skip: !selectedTask?.id,
  });

  useEffect(() => {
    if (error) {
      toast.error(getApiErrorMessage(error));
    }
  }, [error]);

  useEffect(() => {
    if (selectedTaskError && selectedTask) {
      toast.error(getApiErrorMessage(selectedTaskError));
    }
  }, [selectedTask, selectedTaskError]);

  const tasks = useMemo(
    () => data?.data?.items ?? data?.data?.data ?? [],
    [data],
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return tasks;

    return tasks.filter((task) =>
      [
        task.projectTitle,
        task.anchorText,
        task.targetUrl,
        task.requesterWebsite?.name ?? "",
        task.requesterWebsite?.websiteUrl ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [searchTerm, tasks]);

  const meta = data?.data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const page = meta?.currentPage ?? meta?.page ?? currentPage;
  const totalCount = meta?.totalItems ?? tasks.length;

  return (
    <>
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="md:text-2xl font-semibold font-sora text-[#181d27]">
              {title} ({totalCount})
            </h2>
            <p className="mt-1 text-sm text-[#535862]">
              Live provider tasks from the task API, shown in the same row format as
              the jobs board.
            </p>
          </div>

          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/10"
            />
          </div>
        </div>

        <div className="mt-4 w-full overflow-x-auto">
          <table className="w-full min-w-[900px]">
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
                    className={`${width} px-4 py-4 text-left text-[11px] font-semibold tracking-[0.1em] text-[#9ca3af]`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f3f4f6]">
              {isLoading || isFetching ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-[#9ca3af]">
                    Loading active deliveries...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-[#9ca3af]">
                    No active deliveries found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <ActiveDeliveryRow
                    key={task.id}
                    task={task}
                    onOpen={() => setSelectedTask(task)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 w-full">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              className="w-full"
              onPageChange={setCurrentPage}
            />
          </div>
        )}
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

function ActiveDeliveryRow({
  task,
  onOpen,
}: {
  task: ProviderTask;
  onOpen: () => void;
}) {
  const statusStyle = getProviderTaskLifecycleStyle(task.lifecycleStatus);
  const drStyle =
    typeof task.requiredDomainRating === "number"
      ? getDomainRatingStyle(task.requiredDomainRating)
      : null;

  return (
    <tr className="group transition-colors hover:bg-[#fafafa]">
      <td className="px-4 py-5 align-top">
        <div className="text-[15px] font-semibold text-[#111827]">
          {task.projectTitle}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#6b7280]">
            {task.requesterWebsite?.websiteUrl ||
              task.requesterWebsite?.name ||
              formatDomain(task.targetUrl)}
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
            ID-{task.id.slice(0, 4).toUpperCase()}&nbsp;&nbsp;DUE{" "}
            {formatDueDate(task)}
          </span>
        </div>
      </td>

      <td className="px-4 py-5 align-top">
        <div className="flex flex-wrap gap-2">
          <Chip color="indigo">{formatPlacementType(task.placementType).toUpperCase()}</Chip>
          <Chip color="violet">{formatLinkAttribute(task.linkAttribute).toUpperCase()}</Chip>
          {task.anchorText && <Chip color="emerald">{task.anchorText}</Chip>}
        </div>
      </td>

      <td className="px-4 py-5 align-top">
        <div className="text-[22px] font-bold tracking-tight text-[#111827]">
          {formatCredits(task, "—")}
        </div>
        <div className="mt-1 text-[10px] font-medium leading-snug text-[#9ca3af]">
          EARNED ON APPROVAL
          <br />
          NON-WITHDRAWABLE
        </div>
      </td>

      <td className="px-4 py-5 align-top">
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

      <td className="px-4 py-5 align-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpen}
            aria-label="View details"
            className="text-[#22c55e] transition-colors hover:text-[#16a34a]"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Message"
            className="text-[#d1d5db] transition-colors hover:text-[#9ca3af]"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function Chip({
  children,
  color,
}: {
  children: ReactNode;
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
