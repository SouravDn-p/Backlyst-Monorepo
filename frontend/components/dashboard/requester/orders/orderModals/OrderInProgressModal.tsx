"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  Info,
  AlertTriangle,
  ArrowUpRight,
  Ban,
  LucideIcon,
  ClipboardCheck,
  OctagonX,
  ShieldAlert,
  Star,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import { StatusBadge } from "@/components/ui/common/StatusBadge";
import { Button } from "@/components/ui/Button";
import RequestStatusModal from "@/components/dashboard/modal/RequestStatusModal";
import {
  useCancelRequesterTaskMutation,
  useGetRequesterTaskQuery,
  useGetRequesterTaskTimelineQuery,
  useReviewRequesterTaskMutation,
  useSubmitQualityRubricMutation,
  useRespondRequesterDeadlineExtensionMutation,
} from "@/redux/features/api/requesterTask/requesterTaskApi";
import {
  getRequesterTaskProvider,
} from "../requesterTaskOrderHelpers";
import {
  RequesterTaskLifecycleStatus,
  RequesterTaskReviewAction,
  RequesterTaskSubmissionStatus,
  type RequesterTask,
  type RequesterTaskTimelineEvent,
  type DeadlineExtension,
} from "@/types/requesterTask/requesterTaskTypes";
import type { OrderItem } from "../OrderCard";
import SummaryTab from "./orderTabs/SummaryTab";
import SubmissionTab from "./orderTabs/SubmissionTab";
import TimelineTab from "./orderTabs/TimelineTab";
import OpenDisputeModal from "@/components/dashboard/shared/OpenDisputeModal";

type Tab = "summary" | "submission" | "timeline";
type SubModal = "revision" | "approve" | "cancel" | "rubric" | null;
type StatusModalState = {
  description: string;
  title: string;
  type: "accepted" | "rejected";
};

type Props = {
  order: OrderItem;
  open: boolean;
  onClose: () => void;
};

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "submission", label: "Submission", icon: ClipboardCheck },
  { id: "timeline", label: "Timeline", icon: Clock },
];

const ISSUES = [
  "Wrong Link",
  "Wrong Anchor Text",
  "Poor Content Context",
  "Missing Metrics",
];

const CHECKLIST = [
  "Link is live and accessible on the domain",
  "Anchor text matches my requirements",
  "The destination URL is functional",
  "Placement relevance is satisfactory",
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

  return "Something went wrong. Please try again.";
}

function normalizeTimeline(
  responseData:
    | RequesterTaskTimelineEvent[]
    | { data: RequesterTaskTimelineEvent[] }
    | undefined,
  task?: RequesterTask | null,
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

  const fallback: RequesterTaskTimelineEvent[] = [
    {
      id: "created",
      label: "Order Created",
      createdAt: task?.createdAt,
      description: "The task brief was created and published.",
    },
  ];

  if (task?.selectedApplicationId) {
    fallback.push({
      id: "assigned",
      label: "Provider Assigned",
      createdAt: task.updatedAt || task.deliveryDeadline || task.createdAt,
      description: "A provider was selected for fulfillment.",
    });
  }

  fallback.push({
    id: "latest",
    label:
      task?.lifecycleStatus?.replaceAll("_", " ") ||
      "Awaiting Delivery Submission",
    createdAt:
      task?.lifecycleStatus === RequesterTaskLifecycleStatus.IN_PROGRESS
        ? undefined
        : task?.updatedAt,
    description:
      task?.submissionStatus === "SUBMITTED"
        ? "Submitted work is ready for requester review."
        : "Waiting for the provider to complete the requested work.",
  });

  return fallback;
}

function buildReviewNote({
  action,
  checklist,
  instructions,
  issues,
}: {
  action: RequesterTaskReviewAction;
  checklist: string[];
  instructions: string;
  issues: string[];
}) {
  if (action === RequesterTaskReviewAction.APPROVE) {
    const summary =
      checklist.length > 0 ? `Checklist confirmed: ${checklist.join(", ")}.` : "";

    return `Looks good.${summary ? ` ${summary}` : ""}`.trim();
  }

  const issueSummary =
    issues.length > 0 ? `Issues: ${issues.join(", ")}.` : "Issues: Not specified.";
  const note = instructions.trim();

  return `${issueSummary} ${note}`.trim();
}

export default function OrderInProgressModal({ order, open, onClose }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [subModal, setSubModal] = useState<SubModal>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [cancelNote, setCancelNote] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalState, setStatusModalState] = useState<StatusModalState>({
    type: "accepted",
    title: "Task Approved",
    description: "The task has been approved successfully.",
  });
  const [approveRating, setApproveRating] = useState(0);
  const [approveHover, setApproveHover] = useState(0);
  const [approveReview, setApproveReview] = useState("");
  // Quality rubric state
  const [rubricRatings, setRubricRatings] = useState({
    contentRelevance: 0,
    technicalQuality: 0,
    communication: 0,
    timeliness: 0,
    overallSatisfaction: 0,
  });
  const [rubricComments, setRubricComments] = useState("");
  const [rubricHover, setRubricHover] = useState<Record<string, number>>({});

  const {
    data: taskResponse,
    error: taskError,
    isFetching: isFetchingTask,
    isLoading: isLoadingTask,
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
  const [reviewRequesterTask, { isLoading: isReviewing }] =
    useReviewRequesterTaskMutation();
  const [cancelRequesterTask, { isLoading: isCancelling }] =
    useCancelRequesterTaskMutation();
  const [submitQualityRubric, { isLoading: isSubmittingRubric }] =
    useSubmitQualityRubricMutation();
  const [respondRequesterDeadlineExtension, { isLoading: isRespondingExtension }] =
    useRespondRequesterDeadlineExtensionMutation();

  const task = taskResponse?.data ?? order.rawTask ?? null;
  const timeline = useMemo(
    () => normalizeTimeline(timelineResponse?.data, task),
    [task, timelineResponse],
  );
  const lifecycleStatusLabel =
    task?.lifecycleStatus?.replaceAll("_", " ") || order.status.toUpperCase();
  const lifecycleStatus = task?.lifecycleStatus ?? null;
  const submissionStatus = task?.submissionStatus ?? null;
  const assignedTo =
    getRequesterTaskProvider(task)?.name || order.provider?.name || "Provider";
  const isAwaitingSubmission =
    lifecycleStatus === RequesterTaskLifecycleStatus.IN_PROGRESS ||
    lifecycleStatus === RequesterTaskLifecycleStatus.ASSIGNED ||
    submissionStatus === RequesterTaskSubmissionStatus.NOT_SUBMITTED;
  const canReviewSubmittedWork =
    lifecycleStatus === RequesterTaskLifecycleStatus.SUBMITTED ||
    submissionStatus === RequesterTaskSubmissionStatus.SUBMITTED;
  const hasPendingCancellationRequest =
    task?.cancellationRequestStatus === "PENDING";
  const canCancelTask =
    !hasPendingCancellationRequest &&
    (task?.lifecycleStatus === RequesterTaskLifecycleStatus.ASSIGNED ||
      task?.lifecycleStatus === RequesterTaskLifecycleStatus.IN_PROGRESS ||
      task?.lifecycleStatus === RequesterTaskLifecycleStatus.SUBMITTED ||
      task?.lifecycleStatus === RequesterTaskLifecycleStatus.REVISION_REQUESTED);

  const pendingExtensionRequest = task?.deadlineExtensions?.find(
    (ext: DeadlineExtension) => ext.status === "PENDING" && ext.requestedById === task.selectedProviderId
  );

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

  // Requester can dispute once work has been assigned and is active/stalled
  const canDispute =
    !!task &&
    task.lifecycleStatus !== RequesterTaskLifecycleStatus.DISPUTED &&
    task.lifecycleStatus !== RequesterTaskLifecycleStatus.COMPLETED &&
    task.lifecycleStatus !== RequesterTaskLifecycleStatus.CANCELLED &&
    task.lifecycleStatus !== RequesterTaskLifecycleStatus.EXPIRED &&
    task.lifecycleStatus !== RequesterTaskLifecycleStatus.DRAFT &&
    task.lifecycleStatus !== RequesterTaskLifecycleStatus.OPEN &&
    task.lifecycleStatus !== RequesterTaskLifecycleStatus.WAITING_FOR_APPLICANTS;

  useEffect(() => {
    if (taskError && open) {
      toast.error(getApiErrorMessage(taskError));
    }
  }, [taskError, open]);

  useEffect(() => {
    if (timelineError && open) {
      toast.error(getApiErrorMessage(timelineError));
    }
  }, [timelineError, open]);

  const toggleIssue = (issue: string) =>
    setIssues((previous) =>
      previous.includes(issue)
        ? previous.filter((currentIssue) => currentIssue !== issue)
        : [...previous, issue],
    );

  const toggleCheck = (item: string) =>
    setChecklist((previous) =>
      previous.includes(item)
        ? previous.filter((currentItem) => currentItem !== item)
        : [...previous, item],
    );

  const resetModalState = () => {
    setActiveTab("summary");
    setSubModal(null);
    setIssues([]);
    setInstructions("");
    setChecklist([]);
    setCancelNote("");
    setApproveRating(0);
    setApproveHover(0);
    setApproveReview("");
    setRubricRatings({
      contentRelevance: 0,
      technicalQuality: 0,
      communication: 0,
      timeliness: 0,
      overallSatisfaction: 0,
    });
    setRubricComments("");
    setRubricHover({});
  };

  const handleClose = () => {
    onClose();

    window.setTimeout(() => {
      resetModalState();
      setShowStatusModal(false);
    }, 200);
  };

  const closeMainModal = () => {
    onClose();

    window.setTimeout(() => {
      resetModalState();
    }, 200);
  };

  const handleStatusModalClose = () => {
    setShowStatusModal(false);
  };

  const handleReviewAction = async (action: RequesterTaskReviewAction) => {
    if (!task?.id) {
      toast.error("Task details are not available right now.");
      return;
    }

    if (!canReviewSubmittedWork) {
      toast.error("Provider work has not been submitted yet.");
      return;
    }

    if (action !== RequesterTaskReviewAction.APPROVE && !instructions.trim()) {
      toast.error("Please add a review note before continuing.");
      return;
    }

    if (
      action === RequesterTaskReviewAction.APPROVE &&
      checklist.length < CHECKLIST.length
    ) {
      toast.error("Please complete the full verification checklist first.");
      return;
    }

    if (action === RequesterTaskReviewAction.APPROVE && approveRating === 0) {
      toast.error("Please provide a rating before approving.");
      return;
    }

    const loadingMessage =
      action === RequesterTaskReviewAction.APPROVE
        ? "Approving task..."
        : action === RequesterTaskReviewAction.REQUEST_REVISION
          ? "Sending revision request..."
          : "Rejecting task...";
    const loadingToastId = toast.loading(loadingMessage);

    try {
      const payload: any = {
        taskId: task.id,
        action,
        note: buildReviewNote({
          action,
          checklist,
          instructions,
          issues,
        }),
      };

      if (action === RequesterTaskReviewAction.APPROVE) {
        payload.rating = approveRating;
        if (approveReview.trim()) {
          payload.review = approveReview.trim();
        }
      }

      const response = await reviewRequesterTask(payload).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Task review submitted successfully.");

      await Promise.allSettled([refetchTask(), refetchTimeline()]);
      setSubModal(null);

      if (action === RequesterTaskReviewAction.APPROVE) {
        setStatusModalState({
          type: "accepted",
          title: "Task Approved",
          description:
            "The submission has been approved and the task moved to settlement successfully.",
        });
        closeMainModal();
        // Since we are taking the review in the approve modal, we might not need the rubric modal 
        // but we'll show it just in case or we can just show the status modal.
        // I will just show the status modal directly.
        setShowStatusModal(true);
        return;
      }

      setStatusModalState({
        type: "rejected",
        title:
          action === RequesterTaskReviewAction.REQUEST_REVISION
            ? "Revision Requested"
            : "Task Rejected",
        description:
          action === RequesterTaskReviewAction.REQUEST_REVISION
            ? "The provider has been asked to revise the submitted work."
            : "The task has been rejected and moved into dispute handling.",
      });
      closeMainModal();
      setShowStatusModal(true);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleRubricSubmit = async () => {
    if (!task?.id) return;

    const allRated = Object.values(rubricRatings).every((v) => v > 0);
    if (!allRated) {
      toast.error("Please rate all categories before submitting.");
      return;
    }

    const loadingToastId = toast.loading("Submitting quality review...");
    try {
      await submitQualityRubric({
        taskId: task.id,
        ...rubricRatings,
        comments: rubricComments.trim() || undefined,
      }).unwrap();
      toast.dismiss(loadingToastId);
      toast.success("Quality review submitted. Thank you!");
    } catch (error: unknown) {
      toast.dismiss(loadingToastId);
      // Treat "already submitted" as a non-fatal warning
      const msg = getApiErrorMessage(error);
      if (msg.toLowerCase().includes("already submitted")) {
        toast.info("Quality review was already submitted for this task.");
      } else {
        toast.error(msg);
        return;
      }
    }
    setSubModal(null);
    setShowStatusModal(true);
  };

  const handleRubricSkip = () => {
    setSubModal(null);
    setShowStatusModal(true);
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
      await Promise.allSettled([refetchTask(), refetchTimeline()]);
      setSubModal(null);
      handleClose();
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleRespondExtension = async (requestId: string, action: "APPROVE" | "REJECT") => {
    if (!task?.id) return;

    const loadingToastId = toast.loading(
      action === "APPROVE" ? "Approving extension..." : "Rejecting extension..."
    );

    try {
      const response = await respondRequesterDeadlineExtension({
        taskId: task.id,
        requestId,
        action,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || `Extension ${action.toLowerCase()}d successfully.`);
      await refetchTask();
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="relative">
      <ModalShell
        open={open && !subModal}
        onClose={handleClose}
        widthClass="max-w-4xl"
      >
        <section className="flex max-h-[88vh] flex-col">
          <div className="shrink-0 border-b border-[#e9eaeb] pb-0 pt-4 md:pt-6">
            <div className="flex items-start gap-3 px-3 py-3 pr-4 md:gap-4 md:px-6 md:py-4 md:pr-8">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF4ED] md:h-11 md:w-11">
                <FileText className="h-5 w-5 text-secondary md:h-6 md:w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h2 className="text-lg font-bold text-gray-600 md:text-2xl">
                    {task?.projectTitle ?? order.name}
                  </h2>
                  <StatusBadge status={lifecycleStatusLabel} />
                </div>
                <p className="mt-1 text-xs text-[#535862] md:mt-2 md:text-sm">
                  Assigned to{" "}
                  <span className="font-semibold text-gray-600">
                    {assignedTo}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-1 bg-[#FFF4ED] p-1 px-3 md:px-6">
              {TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;

                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm md:px-3 md:py-3 ${
                      isActive
                        ? "text-secondary"
                        : "text-[#535862] hover:text-secondary"
                    }`}
                  >
                    <div
                      className={`rounded-xl p-1.5 ${
                        isActive
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
            {pendingExtensionRequest && (
              <div className="mb-6 rounded-xl border border-[#fef0c7] bg-[#fffaeb] px-5 py-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fef0c7] text-[#b54708]">
                    <TimerReset className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#b54708] md:text-base">
                      Extension Request Pending Approval
                    </h4>
                    <p className="mt-1 text-xs text-[#b54708] md:text-sm">
                      The provider has requested a deadline extension of{" "}
                      <span className="font-semibold">{pendingExtensionRequest.extendDays}</span> extra days.
                    </p>
                    {pendingExtensionRequest.reason && (
                      <p className="mt-1 text-xs text-[#b54708] md:text-sm">
                        Reason: <span className="font-medium italic">{pendingExtensionRequest.reason}</span>
                      </p>
                    )}
                    
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="white"
                        onClick={() => void handleRespondExtension(pendingExtensionRequest.id, "REJECT")}
                        disabled={isRespondingExtension}
                        className="rounded-lg border-[#fda29b] px-4 py-2 text-xs text-[#d92d20] md:text-sm"
                      >
                        Reject Request
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void handleRespondExtension(pendingExtensionRequest.id, "APPROVE")}
                        disabled={isRespondingExtension}
                        className="rounded-lg px-4 py-2 text-xs md:text-sm"
                      >
                        Approve Extension
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {isLoadingTask || isFetchingTask ? (
              <div className="text-sm text-[#667085]">Loading task details...</div>
            ) : task ? (
              <>
                {activeTab === "summary" && (
                  <SummaryTab task={task} workflowStatus={lifecycleStatus} />
                )}
                {activeTab === "submission" && (
                  <SubmissionTab
                    task={task}
                    workflowStatus={lifecycleStatus}
                  />
                )}
                {activeTab === "timeline" && <TimelineTab timeline={timeline} />}
              </>
            ) : (
              <div className="text-sm text-[#667085]">
                Task details are not available right now.
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-[#e9eaeb] bg-white px-4 pb-4 pt-3 md:flex-row md:gap-4 md:px-6 md:pb-5 md:pt-4 lg:px-16">
            <Button
              variant="white"
              onClick={() => {
                if (order.requester?.id) {
                  router.push(
                    `/dashboard/messages?recipientId=${order.requester.id}&taskId=${order.taskId}`
                  );
                } else {
                  router.push("/dashboard/messages");
                }
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-lg text-xs md:w-auto md:text-base"
            >
              <MessageSquare className="h-5 w-5" />
              Open Chat
            </Button>

            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:gap-4">
              {hasPendingCancellationRequest && (
                <div className="flex items-center rounded-lg border border-[#fda29b] bg-[#fef3f2] px-4 py-2 text-xs font-medium text-[#b42318] md:text-sm">
                  Cancellation requested
                  {task?.cancellationRequestedAt
                    ? ` on ${new Date(task.cancellationRequestedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : ""}
                </div>
              )}
              {canCancelTask && (
                <Button
                  variant="white"
                  onClick={() => setSubModal("cancel")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#fda29b] text-xs text-[#d92d20] md:text-sm"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Task
                </Button>
              )}
              {canDispute && (
                <Button
                  variant="white"
                  onClick={() => setDisputeModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#fda29b] text-xs text-[#d92d20] md:text-sm"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Open Dispute
                </Button>
              )}
              {canReviewSubmittedWork ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setSubModal("revision")}
                    className="flex items-center justify-center gap-2 rounded-lg border bg-gray-300 text-xs text-black uppercase md:justify-start md:text-sm"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Request Revision
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setSubModal("approve")}
                    className="flex items-center justify-center gap-2 rounded-lg text-xs md:text-sm"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Approve & Release
                  </Button>
                </>
              ) : (
                <div className="flex items-center rounded-lg border border-dashed border-[#d0d5dd] bg-[#f9fafb] px-4 py-2 text-xs font-medium text-[#667085] md:text-sm">
                  {hasPendingCancellationRequest
                    ? "Cancellation request is pending review"
                    : isAwaitingSubmission
                    ? "Awaiting provider submission"
                    : "Task review actions will appear here"}
                </div>
              )}
            </div>
          </div>
        </section>
      </ModalShell>

      <ModalShell
        open={subModal === "cancel"}
        onClose={() => setSubModal(null)}
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
                Use this if the placement should stop before final settlement.
                Add an optional note for the provider.
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
              onClick={() => setSubModal(null)}
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

      <ModalShell
        open={subModal === "revision"}
        onClose={() => setSubModal(null)}
        widthClass="max-w-4xl"
      >
        <div className="flex max-h-[85vh] flex-col gap-4 px-4 pb-8 pt-6 md:gap-6 md:px-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] md:h-11 md:w-11">
              <RotateCcw className="h-5 w-5 text-secondary md:h-5.5 md:w-5.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-600 md:text-xl">
                Request Revision
              </h3>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#535862] md:text-xs">
                Revision Request
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] px-4 py-2.5 md:mt-12 md:px-5 md:py-3.5">
            <Info className="h-4 w-4 shrink-0 text-secondary md:h-4.5 md:w-4.5" />
            <p className="text-xs font-medium text-secondary md:text-sm">
              ESCROW REMAINS LOCKED DURING REVISION
            </p>
          </div>

          <div className="px-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 md:mb-3 md:text-xs">
              Identify Main Issues
            </p>
            <div className="space-y-2">
              {ISSUES.map((issue) => (
                <label
                  key={issue}
                  className="flex cursor-pointer items-center gap-3 rounded px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 md:text-sm"
                >
                  <input
                    type="checkbox"
                    checked={issues.includes(issue)}
                    onChange={() => toggleIssue(issue)}
                    className="h-4.5 w-4.5 cursor-pointer appearance-none rounded border border-[#d1d5db] accent-secondary transition-all checked:bg-[#fd751f] focus:outline-none focus:ring-2 focus:ring-[#fd751f]/20"
                  />
                  {issue}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-600 md:text-xs">
              Detailed Instructions <span className="text-secondary">*</span>
            </label>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={5}
              placeholder="Describe exactly what needs to be fixed or improved..."
              className="w-full resize-none rounded-xl border border-[#e9eaeb] px-4 py-3.5 text-xs text-gray-600 placeholder:text-[#9DA4AE] transition focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 md:text-sm"
            />
          </div>

          <div className="mt-2 flex flex-col gap-2 border-t border-[#e9eaeb] pt-4 md:flex-row md:justify-between md:gap-4">
            <button
              onClick={() => setSubModal(null)}
              className="px-6 py-2.5 text-xs font-semibold text-[#535862] transition hover:text-gray-600 md:text-sm"
              disabled={isReviewing}
            >
              Cancel
            </button>

            <div className="flex flex-col gap-2 md:flex-row">
              <Button
                onClick={() =>
                  void handleReviewAction(RequesterTaskReviewAction.REJECT)
                }
                variant="white"
                className="rounded-lg border border-[#fda29b] text-[#d92d20]"
                disabled={isReviewing}
              >
                <OctagonX className="h-4 w-4" />
                {isReviewing ? "Submitting..." : "Reject Task"}
              </Button>
              <Button
                onClick={() =>
                  void handleReviewAction(
                    RequesterTaskReviewAction.REQUEST_REVISION,
                  )
                }
                variant="secondary"
                className="rounded-lg"
                disabled={isReviewing}
              >
                {isReviewing ? "Sending..." : "Send Revision Request"}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={subModal === "approve"}
        onClose={() => setSubModal(null)}
        widthClass="max-w-4xl"
      >
        <div className="flex flex-col gap-4 px-4 pb-8 pt-6 md:gap-6 md:px-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#6CE9A6] bg-accent md:h-11 md:w-11">
              <CheckCircle2 className="h-5 w-5 text-secondary md:h-5.5 md:w-5.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-600 md:text-xl">
                Approve & Release Funds
              </h3>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#535862] md:text-xs">
                Final Confirmation
              </p>
            </div>
          </div>

          <div className="mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] p-3 md:p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary md:h-5 md:w-5" />
            <div>
              <p className="text-xs font-semibold text-secondary md:text-sm">
                Irreversible Action
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-secondary md:text-xs">
                Releasing funds is final and cannot be undone. Make sure all
                requirements are met.
              </p>
            </div>
          </div>

          <div className="px-2 md:px-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 md:mb-3 md:text-xs">
              Verification Checklist
            </p>
            <div className="space-y-2 md:space-y-3">
              {CHECKLIST.map((item) => (
                <label
                  key={item}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-gray-50 p-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-200 hover:bg-gray-50 md:text-sm"
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={checklist.includes(item)}
                      onChange={() => toggleCheck(item)}
                      className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-white transition-all checked:border-secondary checked:bg-[#fd751f] checked:ring-1 checked:ring-inset checked:ring-white focus:outline-none focus:ring-2 focus:ring-secondary/20 md:h-7 md:w-7"
                    />
                    <svg
                      className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="px-2 md:px-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 md:mb-3 md:text-xs">
              Rate Your Experience
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= (approveHover || approveRating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setApproveRating(star)}
                    onMouseEnter={() => setApproveHover(star)}
                    onMouseLeave={() => setApproveHover(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        active
                          ? "fill-[#fd751f] text-[#fd751f]"
                          : "fill-transparent text-[#d0d5dd]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-600 md:text-xs">
                Review Comments <span className="font-normal normal-case text-[#9DA4AE]">(optional)</span>
              </label>
              <textarea
                value={approveReview}
                onChange={(e) => setApproveReview(e.target.value)}
                rows={3}
                placeholder="Leave a review for the provider..."
                className="w-full resize-none rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#e9eaeb] pt-4 md:flex-row md:justify-between md:gap-4 md:pt-5">
            <Button
              variant="white"
              onClick={() => setSubModal(null)}
              className="border-none text-xs uppercase transition md:text-lg"
              disabled={isReviewing}
            >
              Return to Summery
            </Button>
            <Button
              onClick={() =>
                void handleReviewAction(RequesterTaskReviewAction.APPROVE)
              }
              variant="secondary"
              className="rounded-lg text-xs md:text-sm"
              disabled={checklist.length < CHECKLIST.length || approveRating === 0 || isReviewing}
            >
              {isReviewing ? "Releasing..." : "Confirm & Release Funds"}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={subModal === "rubric"}
        onClose={handleRubricSkip}
        widthClass="max-w-2xl"
      >
        <div className="flex flex-col gap-5 px-5 pb-7 pt-6 md:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#027A48]">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#181d27]">
                Rate Your Experience
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                Help us improve by rating the provider&apos;s work quality.
                This takes less than a minute.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {([
              { key: "contentRelevance", label: "Content Relevance" },
              { key: "technicalQuality", label: "Technical Quality" },
              { key: "communication", label: "Communication" },
              { key: "timeliness", label: "Timeliness" },
              { key: "overallSatisfaction", label: "Overall Satisfaction" },
            ] as { key: keyof typeof rubricRatings; label: string }[]).map(
              ({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="min-w-[140px] text-sm font-medium text-[#344054]">
                    {label}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active =
                        star <= (rubricHover[key] ?? rubricRatings[key]);
                      return (
                        <button
                          key={star}
                          type="button"
                          aria-label={`Rate ${label} ${star} star${star > 1 ? "s" : ""}`}
                          onClick={() =>
                            setRubricRatings((prev) => ({
                              ...prev,
                              [key]: star,
                            }))
                          }
                          onMouseEnter={() =>
                            setRubricHover((prev) => ({ ...prev, [key]: star }))
                          }
                          onMouseLeave={() =>
                            setRubricHover((prev) => ({
                              ...prev,
                              [key]: 0,
                            }))
                          }
                          className="transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              active
                                ? "fill-[#fd751f] text-[#fd751f]"
                                : "fill-transparent text-[#d0d5dd]"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#535862]">
              Additional Comments{" "}
              <span className="font-normal normal-case tracking-normal text-[#9DA4AE]">
                (optional)
              </span>
            </label>
            <textarea
              value={rubricComments}
              onChange={(e) => setRubricComments(e.target.value)}
              rows={3}
              placeholder="Share any additional feedback about this task..."
              className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f] focus:ring-2 focus:ring-[#fd751f]/20"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-[#eaecf0] pt-4 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={handleRubricSkip}
              className="text-xs font-medium text-[#667085] underline-offset-2 hover:underline md:text-sm"
              disabled={isSubmittingRubric}
            >
              Skip for now
            </button>
            <Button
              variant="secondary"
              onClick={() => void handleRubricSubmit()}
              className="rounded-2xl"
              disabled={isSubmittingRubric}
            >
              {isSubmittingRubric ? "Submitting..." : "Submit Review"}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ModalShell>

      <OpenDisputeModal
        open={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        taskId={task?.id ?? order.taskId}
        onSuccess={onClose}
      />

      <RequestStatusModal
        type={statusModalState.type}
        title={statusModalState.title}
        description={statusModalState.description}
        isOpen={showStatusModal}
        onClose={handleStatusModalClose}
        autoCloseDelay={2200}
      />
    </div>
  );
}
