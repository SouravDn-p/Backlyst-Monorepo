"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Plus,
  Hourglass,
  Ban,
  ArrowUpRight,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCancelRequesterTaskMutation,
  useGetRequesterTaskQuery,
  useGetRequesterTaskTimelineQuery,
  useUpdateRequesterTaskDeadlineMutation,
} from "@/redux/features/api/requesterTask/requesterTaskApi";
import {
  getRequesterTaskApplicantsCount,
} from "../requesterTaskOrderHelpers";
import type { OrderItem } from "../OrderCard";
import type {
  RequesterTaskDeadlineDays,
  RequesterTask,
  RequesterTaskTimelineEvent,
} from "@/types/requesterTask/requesterTaskTypes";

type Tab = "summary" | "applicants" | "timeline";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "SUMMARY", icon: FileText },
  { id: "applicants", label: "APPLICANTS", icon: Users },
  { id: "timeline", label: "TIMELINE", icon: Clock },
];

type Props = { order: OrderItem; open: boolean; onClose: () => void };

const DEADLINE_OPTIONS = [3, 5, 7, 10, 14, 21, 30] as const;

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

  return "Something went wrong. Please try again.";
}

function formatDate(value?: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Pending";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function normalizeTimeline(
  responseData:
    | RequesterTaskTimelineEvent[]
    | { data: RequesterTaskTimelineEvent[] }
    | undefined,
  task?: RequesterTask,
): RequesterTaskTimelineEvent[] {
  if (Array.isArray(responseData) && responseData.length > 0) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData &&
    Array.isArray(responseData.data) &&
    responseData.data.length > 0
  ) {
    return responseData.data;
  }

  if (task?.timeline?.length) {
    return task.timeline;
  }

  return [
    {
      id: "created",
      label: "Placement Task Created",
      createdAt: task?.createdAt,
      description: "The task was published to the marketplace.",
    },
    {
      id: "pending-applicants",
      label: "Awaiting Provider Application",
      description: "The marketplace is still collecting provider interest.",
    },
  ];
}

export default function OrderWaitingModal({ order, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [requestedDeadlineDays, setRequestedDeadlineDays] = useState("7");
  const {
    data: taskResponse,
    error: taskError,
    isFetching,
    isLoading,
    refetch: refetchTask,
  } = useGetRequesterTaskQuery(order.taskId, {
    skip: !open || !order.taskId,
  });
  const {
    data: timelineResponse,
    error: timelineError,
    refetch: refetchTimeline,
  } = useGetRequesterTaskTimelineQuery(order.taskId, {
    skip: !open || !order.taskId,
  });
  const [cancelRequesterTask, { isLoading: isCancelling }] =
    useCancelRequesterTaskMutation();
  const [updateRequesterTaskDeadline, { isLoading: isUpdatingDeadline }] =
    useUpdateRequesterTaskDeadlineMutation();

  useEffect(() => {
    if (taskError && open) {
      toast.error(getApiErrorMessage(taskError));
    }
  }, [open, taskError]);

  useEffect(() => {
    if (timelineError && open) {
      toast.error(getApiErrorMessage(timelineError));
    }
  }, [open, timelineError]);

  const task = taskResponse?.data ?? order.rawTask;
  const timeline = useMemo(
    () => normalizeTimeline(timelineResponse?.data, task),
    [task, timelineResponse],
  );

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setActiveTab("summary");
      setCancelOpen(false);
      setCancelNote("");
      setDeadlineOpen(false);
    }, 200);
  };

  const handleCancelTask = async () => {
    if (!task?.id) {
      toast.error("Task details are not available right now.");
      return;
    }

    const loadingToastId = toast.loading("Cancelling task...");

    try {
      const response = await cancelRequesterTask({
        taskId: task.id,
        note: cancelNote.trim() || undefined,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Task cancelled successfully.");
      setCancelOpen(false);
      setCancelNote("");
      await Promise.allSettled([refetchTask(), refetchTimeline()]);
      handleClose();
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleUpdateDeadline = async () => {
    if (!task?.id) {
      toast.error("Task details are not available right now.");
      return;
    }

    const nextDeadline = Number(requestedDeadlineDays);

    if (!DEADLINE_OPTIONS.includes(nextDeadline as (typeof DEADLINE_OPTIONS)[number])) {
      toast.error("Select a valid requested deadline.");
      return;
    }

    const loadingToastId = toast.loading("Updating requested deadline...");

    try {
      const response = await updateRequesterTaskDeadline({
        taskId: task.id,
        requestedDeadlineDays: nextDeadline as RequesterTaskDeadlineDays,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Requested deadline updated successfully.");
      setDeadlineOpen(false);
      await Promise.allSettled([refetchTask(), refetchTimeline()]);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleOpenDeadlineModal = () => {
    setRequestedDeadlineDays(String(task?.requestedDeadlineDays ?? 7));
    setDeadlineOpen(true);
  };

  return (
    <>
      <ModalShell open={open} onClose={handleClose}>
        <div className="flex max-h-[88vh] flex-col">
          <div className="shrink-0 px-3 pb-0 pt-6 md:px-6">
            <div className="flex items-start gap-3 pb-4 pr-6 md:gap-4 md:pr-10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] md:h-11 md:w-11">
                <FileText className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h2 className="text-lg font-bold text-[#181d27] md:text-xl">
                    {task?.projectTitle ?? order.name}
                  </h2>
                  <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[9px] font-bold tracking-wide text-[#535862] md:text-[10px]">
                    {order.id}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#535862] md:mt-1 md:text-sm">
                  No provider assigned yet
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-1 bg-[#FFF4ED] p-1 px-3 md:px-6">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm md:px-3 md:py-3 ${
                      active
                        ? "text-secondary"
                        : "text-[#535862] hover:text-secondary"
                    }`}
                  >
                    <div
                      className={`rounded-xl p-1.5 ${
                        active
                          ? "bg-secondary text-white"
                          : "bg-white text-secondary/80"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-100 max-h-100 flex-1 overflow-y-auto px-6 py-4 md:px-12 md:py-6">
            {isLoading || isFetching ? (
              <div className="text-sm text-[#667085]">Loading task details...</div>
            ) : activeTab === "summary" ? (
              <SummaryTab
                onOpenDeadlineModal={handleOpenDeadlineModal}
                task={task}
              />
            ) : activeTab === "applicants" ? (
              <ApplicantsTab applicantsCount={getRequesterTaskApplicantsCount(task)} />
            ) : (
              <TimelineTab timeline={timeline} />
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-[#e9eaeb] bg-white px-4 pb-4 pt-3 md:px-6 md:pb-5 md:pt-4">
            <Button
              variant="white"
              onClick={handleClose}
              className="rounded-xl text-xs md:text-sm"
            >
              CLOSE OVERSIGHT
            </Button>

            <Button
              variant="ghost"
              onClick={() => setCancelOpen(true)}
              className="rounded-xl border bg-[#fef3f2] text-[#b42318]"
            >
              <Ban className="h-4 w-4" />
              Cancel Task
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={deadlineOpen}
        onClose={() => setDeadlineOpen(false)}
        widthClass="max-w-2xl"
      >
        <div className="flex flex-col gap-5 px-5 pb-6 pt-6 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff8ff] text-[#175cd3]">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#181d27]">
                Update Requested Deadline
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                This works before provider selection. Choose one of the allowed
                requester deadline windows.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
              Requested Deadline
            </label>
            <Select
              value={requestedDeadlineDays}
              onValueChange={setRequestedDeadlineDays}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose deadline" />
              </SelectTrigger>
              <SelectContent>
                {DEADLINE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#eaecf0] pt-4 md:flex-row md:items-center md:justify-between">
            <Button
              variant="white"
              onClick={() => setDeadlineOpen(false)}
              className="rounded-2xl"
              disabled={isUpdatingDeadline}
            >
              Keep Current Deadline
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleUpdateDeadline()}
              className="rounded-2xl"
              disabled={isUpdatingDeadline}
            >
              {isUpdatingDeadline ? "Updating..." : "Update Deadline"}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        widthClass="max-w-2xl"
      >
        <div className="flex flex-col gap-5 px-5 pb-6 pt-6 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef3f2] text-[#d92d20]">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#181d27]">Cancel Task</h3>
              <p className="mt-1 text-sm text-[#667085]">
                This will stop the task before provider assignment. Add an optional
                reason for your records.
              </p>
            </div>
          </div>

          <textarea
            value={cancelNote}
            onChange={(event) => setCancelNote(event.target.value)}
            rows={5}
            placeholder="Optional cancellation reason..."
            className="w-full resize-none rounded-2xl border border-[#d0d5dd] bg-white px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
          />

          <div className="flex flex-col gap-3 border-t border-[#eaecf0] pt-4 md:flex-row md:items-center md:justify-between">
            <Button
              variant="white"
              onClick={() => setCancelOpen(false)}
              className="rounded-2xl"
              disabled={isCancelling}
            >
              Keep Task Active
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleCancelTask()}
              className="rounded-2xl"
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}

function SummaryTab({
  onOpenDeadlineModal,
  task,
}: {
  onOpenDeadlineModal: () => void;
  task?: RequesterTask;
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <div className="space-y-2 rounded-xl border border-[#e9eaeb] p-3 md:p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#535862] md:text-[10px]">
            Lifecycle Status
          </p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-secondary md:h-4 md:w-4" />
            <span className="text-xs font-bold text-secondary md:text-sm">
              {(task?.lifecycleStatus || "WAITING_FOR_APPLICANTS").replaceAll(
                "_",
                " ",
              )}
            </span>
          </div>
          <p className="text-[10px] text-[#9DA4AE] md:text-xs">
            {getRequesterTaskApplicantsCount(task)
              ? `${getRequesterTaskApplicantsCount(task)} provider application(s) received`
              : "No provider applied yet"}
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-[#e9eaeb] p-3 md:p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#535862] md:text-[10px]">
            Delivery Deadline
          </p>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-[#6366f1] md:h-4 md:w-4" />
            <span className="text-xs font-bold text-[#181d27] md:text-sm">
              {formatDate(task?.deliveryDeadline) !== "Not available"
                ? formatDate(task?.deliveryDeadline)
                : task?.requestedDeadlineDays
                  ? `${task.requestedDeadlineDays} day window`
                  : "Flexible"}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenDeadlineModal}
            className="flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#175cd3] transition hover:text-[#0f4bb8] md:text-xs"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Update Deadline
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-y border-[#e9eaeb] py-3 md:gap-6 md:py-4">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:mb-2 md:text-[10px]">
            Anchor Text
          </p>
          <p className="text-xs text-[#181d27] md:text-sm">
            {task?.anchorText || "Not provided"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:mb-2 md:text-[10px]">
            Required Domain Rating
          </p>
          <p className="text-xs text-[#181d27] md:text-sm">
            {typeof task?.requiredDomainRating === "number"
              ? `DR ${task.requiredDomainRating}+`
              : "No minimum DR"}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:text-[10px]">
          Placement Guidelines
        </p>
        <p className="text-xs leading-relaxed text-[#535862] md:text-sm">
          {task?.placementGuidelines?.trim() ||
            "No extra placement guidelines were added for this task."}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] px-3 py-2.5 md:px-4 md:py-3">
        <CheckCircle2 className="h-3 w-3 shrink-0 text-secondary md:h-4 md:w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary md:text-xs">
          Escrow Protection Active
        </p>
      </div>
    </div>
  );
}

function ApplicantsTab({ applicantsCount }: { applicantsCount: number }) {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center md:gap-4 md:py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#FDCFBE] bg-[#FFF4ED] md:h-16 md:w-16">
          <Hourglass className="h-7 w-7 text-secondary md:h-8 md:w-8" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#181d27] md:text-base">
            {applicantsCount > 0 ? "Applications are coming in" : "No applicants yet"}
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#9DA4AE] md:text-sm">
            {applicantsCount > 0
              ? `${applicantsCount} provider application(s) have reached this task. Review them from the applied state once the marketplace advances the workflow.`
              : "Your task is live on the marketplace. Qualified providers will apply once they find a match."}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[#B2DDFF] bg-[#EFF8FF] px-3 py-3 md:gap-3 md:px-4 md:py-4">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#175CD3] md:h-4 md:w-4" />
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#175CD3] md:text-xs">
            Increase Visibility
          </p>
          <p className="text-xs leading-relaxed text-[#175CD3] md:text-sm">
            Tasks with higher reward credits and flexible DR thresholds attract
            more applicants faster.
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ timeline }: { timeline: RequesterTaskTimelineEvent[] }) {
  return (
    <div className="space-y-4 py-2 md:space-y-5">
      {timeline.map((event, index) => {
        const pending = !event.createdAt;
        const Icon = index === 0 ? Plus : pending ? UserPlus : Clock;

        return (
          <div
            key={event.id ?? `${event.label}-${index}`}
            className={`flex items-start gap-3 md:gap-4 ${pending ? "opacity-40" : ""}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white md:h-10 md:w-10 ${
                pending
                  ? "border-2 border-dashed border-[#9DA4AE]"
                  : "border-2 border-secondary"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                  pending ? "text-[#9DA4AE]" : "text-secondary"
                }`}
              />
            </div>
            <div className="pt-0.5 md:pt-1">
              <p
                className={`text-xs font-semibold md:text-sm ${
                  pending ? "text-[#9DA4AE]" : "text-[#181d27]"
                }`}
              >
                {event.label || "Activity updated"}
              </p>
              <p className="mt-0.5 text-[10px] text-[#9DA4AE] md:mt-1 md:text-xs">
                {formatDateTime(event.createdAt)}
              </p>
              {event.description && (
                <p className="mt-1 text-xs leading-relaxed text-[#667085] md:text-sm">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
