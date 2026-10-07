"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import { Button } from "@/components/ui/Button";
import {
  useGetRequesterTaskQuery,
  useGetRequesterTaskTimelineQuery,
} from "@/redux/features/api/requesterTask/requesterTaskApi";
import { getRequesterTaskProvider } from "../requesterTaskOrderHelpers";
import type {
  RequesterTask,
  RequesterTaskLifecycleStatus,
  RequesterTaskTimelineEvent,
} from "@/types/requesterTask/requesterTaskTypes";
import type { OrderItem } from "../OrderCard";
import OpenDisputeModal from "@/components/dashboard/shared/OpenDisputeModal";

type Tab = "summary" | "submission" | "timeline";

type Props = {
  order: OrderItem;
  open: boolean;
  onClose: () => void;
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "submission", label: "Submission", icon: CheckSquare },
  { id: "timeline", label: "Timeline", icon: Clock },
];

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

  return "Failed to load task details.";
}

function formatDate(date?: string | null): string {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function formatDateTime(date?: string | null): string {
  if (!date) return "Pending";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function normalizeTimeline(
  responseData:
    | RequesterTaskTimelineEvent[]
    | { data: RequesterTaskTimelineEvent[] }
    | undefined,
  task: RequesterTask,
) {
  if (Array.isArray(responseData) && responseData.length > 0) {
    return responseData.map((event, index) => ({
      key: event.id || `${event.label || "event"}-${index}`,
      label:
        event.label ||
        event.status?.replaceAll("_", " ") ||
        "Task Timeline Event",
      time: formatDateTime(event.createdAt),
    }));
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData &&
    Array.isArray(responseData.data) &&
    responseData.data.length > 0
  ) {
    return responseData.data.map((event, index) => ({
      key: event.id || `${event.label || "event"}-${index}`,
      label:
        event.label ||
        event.status?.replaceAll("_", " ") ||
        "Task Timeline Event",
      time: formatDateTime(event.createdAt),
    }));
  }

  if (task.timeline?.length) {
    return task.timeline.map((event, index) => ({
      key: event.id || `${event.label || "event"}-${index}`,
      label:
        event.label ||
        event.status?.replaceAll("_", " ") ||
        "Task Timeline Event",
      time: formatDateTime(event.createdAt),
    }));
  }

  return [
    {
      key: "created",
      label: "Task Created",
      time: formatDateTime(task.createdAt),
    },
    {
      key: "status",
      label: task.lifecycleStatus.replaceAll("_", " "),
      time: formatDateTime(task.updatedAt || task.createdAt),
    },
    {
      key: "completed",
      label:
        task.lifecycleStatus === "COMPLETED" || task.lifecycleStatus === "APPROVED"
          ? "Task Completed"
          : "Latest Update",
      time: formatDateTime(task.completedAt || task.updatedAt),
    },
  ];
}

export default function OrderCompletedModal({ order, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

  const { data, error, isFetching, isLoading } = useGetRequesterTaskQuery(
    order.taskId,
    {
      skip: !open || !order.taskId,
    },
  );
  const { data: timelineResponse, error: timelineError } =
    useGetRequesterTaskTimelineQuery(order.taskId, {
      skip: !open || !order.taskId,
    });

  const task = data?.data ?? order.rawTask ?? null;

  useEffect(() => {
    if (error && open) {
      toast.error(getApiErrorMessage(error));
    }
  }, [error, open]);

  useEffect(() => {
    if (timelineError && open) {
      toast.error(getApiErrorMessage(timelineError));
    }
  }, [timelineError, open]);

  const timeline = useMemo(
    () => (task ? normalizeTimeline(timelineResponse?.data, task) : []),
    [task, timelineResponse],
  );

  // Allow disputing APPROVED tasks that have not yet been fully settled —
  // the requester may notice a problem after approval but before final completion.
  const canDispute =
    !!task &&
    task.lifecycleStatus !== ("DISPUTED" as RequesterTaskLifecycleStatus) &&
    task.lifecycleStatus !== ("CANCELLED" as RequesterTaskLifecycleStatus) &&
    task.lifecycleStatus !== ("EXPIRED" as RequesterTaskLifecycleStatus);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setActiveTab("summary");
      setDisputeModalOpen(false);
    }, 200);
  };

  return (
    <>
      <ModalShell open={open && !disputeModalOpen} onClose={handleClose}>
      <section className="flex flex-col max-h-[88vh]">
        <div className="pt-4 md:pt-6 pb-0 shrink-0">
          <div className="flex items-start gap-3 md:gap-4 px-3 md:px-6 pr-4 md:pr-10 py-3 md:py-4">
            <div className="w-9 md:w-11 h-9 md:h-11 bg-[#FFF4ED] rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 md:w-6 h-5 md:h-6 text-secondary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h2 className="text-lg md:text-2xl font-bold text-[#181d27]">
                  {task?.projectTitle ?? order.name}
                </h2>
                <span className="text-[9px] md:text-xs font-bold uppercase tracking-wide bg-[#f2f4f7] text-[#535862] px-2 py-0.5 rounded-full">
                  {order.id}
                </span>
              </div>
              <p className="text-xs md:text-sm text-[#535862] mt-1 md:mt-2">
                Completed for{" "}
                <span className="font-semibold text-[#181d27]">
                  {getRequesterTaskProvider(task)?.name ??
                    order.provider?.name ??
                    "Provider"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex mt-4 bg-[#FFF4ED] p-1 gap-1 px-3 md:px-6">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 cursor-pointer flex items-center justify-center gap-2 py-2 md:py-3 px-2 md:px-3 rounded-lg font-semibold transition text-xs sm:text-sm ${
                    isActive
                      ? "text-secondary"
                      : "text-[#535862] hover:text-secondary"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl ${
                      isActive
                        ? "bg-secondary text-white"
                        : "bg-white text-secondary/80"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-100 max-h-100 px-6 md:px-12 py-4 md:py-6">
          {isLoading || isFetching ? (
            <div className="text-sm text-[#667085]">Loading task details...</div>
          ) : task ? (
            <>
              {activeTab === "summary" && <SummaryTab task={task} />}
              {activeTab === "submission" && <SubmissionTab task={task} />}
              {activeTab === "timeline" && <TimelineTab timeline={timeline} />}
            </>
          ) : (
            <div className="text-sm text-[#667085]">
              Task details are not available right now.
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 md:px-10 lg:px-16 pb-4 md:pb-5 pt-3 md:pt-4 border-t border-[#e9eaeb] flex items-center justify-between bg-white">
          {canDispute ? (
            <Button
              variant="white"
              onClick={() => setDisputeModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[#fda29b] text-xs text-[#d92d20] md:text-sm"
            >
              <ShieldAlert className="h-4 w-4" />
              Open Dispute
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="white"
            onClick={handleClose}
            className="rounded-lg text-xs md:text-sm"
          >
            Close Oversight
          </Button>
        </div>
      </section>
    </ModalShell>

    <OpenDisputeModal
      open={disputeModalOpen}
      onClose={() => setDisputeModalOpen(false)}
      taskId={task?.id ?? order.taskId}
      onSuccess={handleClose}
    />
    </>
  );
}

function SummaryTab({ task }: { task: RequesterTask }) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="border border-[#e9eaeb] rounded-xl p-3 md:p-5 space-y-2 bg-white">
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Status
          </p>
          <div className="flex items-center gap-2">
            <div className="w-7 md:w-8 h-7 md:h-8 rounded-full bg-[#ECFDF3] flex items-center justify-center">
              <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 text-[#027A48]" />
            </div>
            <span className="text-base md:text-lg font-semibold text-[#027A48]">
              {task.lifecycleStatus.replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <div className="border border-[#e9eaeb] rounded-xl p-3 md:p-5 space-y-2 bg-white">
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Website
          </p>
          <div className="flex items-center gap-2">
            <Globe className="w-4 md:w-5 h-4 md:h-5 text-[#6366f1]" />
            <span className="text-sm md:text-base font-semibold text-[#6366f1] break-all">
              {task.requesterWebsite?.websiteUrl || task.targetUrl}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-t border-b border-[#e9eaeb]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2">
            Anchor Text
          </p>
          <p className="text-sm font-medium text-[#181d27]">{task.anchorText}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2">
            Required DR
          </p>
          <p className="text-sm font-medium text-[#181d27]">
            {task.requiredDomainRating ? `DR ${task.requiredDomainRating}+` : "Not specified"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2">
            Link Attribute
          </p>
          <p className="text-sm font-medium text-[#181d27]">
            {task.linkAttribute}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2">
            Deadline
          </p>
          <p className="text-sm font-medium text-[#181d27]">
            {task.requestedDeadlineDays} days
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2.5">
          Placement Guidelines
        </p>
        <p className="text-sm text-[#535862] leading-relaxed">
          {task.placementGuidelines || "No extra placement guidelines were provided."}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2.5">
          Created
        </p>
        <p className="text-sm text-[#181d27]">{formatDate(task.createdAt)}</p>
      </div>
    </div>
  );
}

function SubmissionTab({ task }: { task: RequesterTask }) {
  const attachments = task.files ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2.5">
          Provider Note
        </p>
        <div className="bg-[#FFF4ED] border border-[#FDCFBE] rounded-xl px-5 py-4">
          <p className="text-sm text-[#535862] leading-relaxed">
            {task.providerNote || "No provider note has been added yet."}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2.5">
          Target URL
        </p>
        <div className="border border-[#e9eaeb] rounded-xl overflow-hidden hover:border-secondary/40 transition-colors">
          <a
            href={task.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 cursor-pointer"
          >
            <ExternalLink className="w-5 h-5 text-secondary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#181d27] truncate">
                {task.targetUrl}
              </p>
              <p className="text-xs font-bold text-[#027A48] uppercase tracking-wide mt-1">
                Submission Status: {task.submissionStatus.replaceAll("_", " ")}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#535862]" />
          </a>
        </div>
      </div>

      {attachments.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Uploaded Files
          </p>
          {attachments.map((file, index) => {
            const href = file.fileUrl || file.url;
            const label = file.fileName || file.name || `Attachment ${index + 1}`;

            return href ? (
              <a
                key={`${label}-${index}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-[#e9eaeb] px-4 py-3 hover:border-secondary/40 transition-colors"
              >
                <FileText className="w-5 h-5 text-secondary shrink-0" />
                <span className="text-sm font-medium text-[#181d27] truncate">
                  {label}
                </span>
              </a>
            ) : (
              <div
                key={`${label}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-[#e9eaeb] px-4 py-3"
              >
                <FileText className="w-5 h-5 text-secondary shrink-0" />
                <span className="text-sm font-medium text-[#181d27] truncate">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#f9fafb] border border-dashed border-[#e9eaeb] rounded-xl flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#e9eaeb]/60 flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-[#9DA4AE]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#181d27]">
              No files or screenshots uploaded
            </p>
            <p className="text-sm text-[#9DA4AE] mt-2 max-w-md">
              This task does not currently include uploaded proof files.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineTab({
  timeline,
}: {
  timeline: { key: string; label: string; time: string }[];
}) {
  return (
    <div className="space-y-5 py-2">
      {timeline.map((event) => (
        <div key={event.key} className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-secondary bg-white flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-secondary" />
          </div>
          <div className="pt-1">
            <p className="text-sm font-semibold text-[#181d27]">{event.label}</p>
            <p className="text-xs text-[#9DA4AE] mt-0.5">{event.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
