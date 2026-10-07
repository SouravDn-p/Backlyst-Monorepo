"use client";

import { useEffect, useState } from "react";
import React from "react";
import {
  Ban,
  Globe,
  PlayCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import ModalShell from "./ModalShell";
import { Button } from "@/components/ui/Button";
import ProviderTaskSubmissionModal from "./ProviderTaskSubmissionModal";
import {
  useRespondProviderCancelRequestMutation,
  useResubmitProviderTaskMutation,
  useStartProviderTaskWorkMutation,
  useSubmitProviderTaskMutation,
  useRequestProviderDeadlineExtensionMutation,
} from "@/redux/features/api/providerTask/providerTaskApi";
import {
  formatCredits,
  formatDate,
  formatDomain,
  formatDueDate,
  formatLifecycleStatus,
  formatLinkAttribute,
  formatPlacementType,
  getApiErrorMessage,
} from "@/components/dashboard/provider/providerTaskHelpers";
import {
  ProviderTaskCancelAction,
  ProviderTaskLifecycleStatus,
  type ProviderTask,
  type SubmitProviderTaskPayload,
} from "@/types/providerTask/providerTaskTypes";
import OpenDisputeModal from "@/components/dashboard/shared/OpenDisputeModal";

interface ProviderTaskOverviewModalProps {
  open: boolean;
  onClose: () => void;
  task: ProviderTask | null;
}

function InfoBlock({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#eaecf0] bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-sm font-semibold text-[#101828]">{value}</p>
        {children}
      </div>
    </div>
  );
}

export default function ProviderTaskOverviewModal({
  open,
  onClose,
  task,
}: ProviderTaskOverviewModalProps) {
  const [currentTask, setCurrentTask] = useState(task);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [cancelResponseOpen, setCancelResponseOpen] = useState(false);
  const [cancelAction, setCancelAction] = useState<ProviderTaskCancelAction>(
    ProviderTaskCancelAction.ACCEPT,
  );
  const [cancelNote, setCancelNote] = useState("");
  const [startProviderTaskWork, { isLoading: isStartingWork }] =
    useStartProviderTaskWorkMutation();
  const [submitProviderTask, { isLoading: isSubmitting }] =
    useSubmitProviderTaskMutation();
  const [resubmitProviderTask, { isLoading: isResubmitting }] =
    useResubmitProviderTaskMutation();
  const [respondProviderCancelRequest, { isLoading: isRespondingToCancel }] =
    useRespondProviderCancelRequestMutation();
  
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState<number>(3);
  const [extensionReason, setExtensionReason] = useState("");
  const [requestProviderDeadlineExtension, { isLoading: isRequestingExtension }] =
    useRequestProviderDeadlineExtensionMutation();

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  if (!currentTask) return null;

  const canStartWork =
    currentTask.lifecycleStatus === ProviderTaskLifecycleStatus.ASSIGNED ||
    currentTask.lifecycleStatus === ProviderTaskLifecycleStatus.SELECTED;
  const canSubmit =
    currentTask.lifecycleStatus === ProviderTaskLifecycleStatus.IN_PROGRESS ||
    currentTask.lifecycleStatus === ProviderTaskLifecycleStatus.REVISION_REQUESTED;
  const isRevision = currentTask.lifecycleStatus === ProviderTaskLifecycleStatus.REVISION_REQUESTED;
  const canRespondToCancelRequest =
    currentTask.cancellationRequestStatus === "PENDING";
  const latestCancellationRequestFlow = currentTask.taskFlows
    ?.slice()
    .reverse()
    .find((flow) => flow.eventType === "CANCELLATION_REQUESTED");
  const latestCancellationResolvedFlow = currentTask.taskFlows
    ?.slice()
    .reverse()
    .find(
      (flow) =>
        flow.eventType === "CANCELLATION_REJECTED" ||
        flow.eventType === "CANCELLATION_ACCEPTED" ||
        flow.eventType === "CANCELLATION_RESPONDED",
    );
  const cancellationRequestNote = latestCancellationRequestFlow?.note ?? null;
  const cancellationResponseNote = latestCancellationResolvedFlow?.note ?? null;
  const hasCancellationStatus = !!currentTask.cancellationRequestStatus;
  const cancellationStatusStyles =
    currentTask.cancellationRequestStatus === "PENDING"
      ? {
          border: "border-[#fda29b]",
          bg: "bg-[#fef3f2]",
          title: "text-[#b42318]",
          body: "text-[#7a271a]",
        }
      : currentTask.cancellationRequestStatus === "REJECTED"
        ? {
            border: "border-[#fda29b]",
            bg: "bg-[#fff7ed]",
            title: "text-[#b54708]",
            body: "text-[#7c2d12]",
          }
        : {
            border: "border-[#abefc6]",
            bg: "bg-[#ecfdf3]",
            title: "text-[#027a48]",
            body: "text-[#166534]",
          };

  const pendingExtensionRequest = currentTask.deadlineExtensions?.find(
    (ext) => ext.status === "PENDING"
  );
  
  const canRequestExtension =
    !pendingExtensionRequest &&
    (currentTask.deadlineExtensionCount || 0) < 3 &&
    (currentTask.lifecycleStatus === ProviderTaskLifecycleStatus.IN_PROGRESS ||
      currentTask.lifecycleStatus === ProviderTaskLifecycleStatus.ASSIGNED);

  // Provider can dispute when the task is in an active or stalled state
  const canDispute =
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.DISPUTED &&
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.COMPLETED &&
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.CANCELLED &&
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.EXPIRED &&
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.DRAFT &&
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.OPEN &&
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.WAITING_FOR_APPLICANTS &&
    currentTask.lifecycleStatus !== ProviderTaskLifecycleStatus.APPLIED;

  const handleStartWork = async () => {
    const loadingToastId = toast.loading("Starting work...");

    try {
      const response = await startProviderTaskWork({
        taskId: currentTask.id,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Work started successfully.");
      setCurrentTask((previous) =>
        previous
          ? {
              ...previous,
              lifecycleStatus: response.data.lifecycleStatus,
            }
          : previous,
      );
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleSubmitDelivery = async ({
    data,
    files,
  }: {
    data: SubmitProviderTaskPayload;
    files: File[];
  }) => {
    const loadingToastId = toast.loading(
      isRevision ? "Resubmitting delivery..." : "Submitting delivery...",
    );

    try {
      const response = isRevision
        ? await resubmitProviderTask({
            taskId: currentTask.id,
            data,
            files,
          }).unwrap()
        : await submitProviderTask({
            taskId: currentTask.id,
            data,
            files,
          }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(
        response.message ||
          (isRevision ? "Delivery resubmitted successfully." : "Delivery submitted successfully."),
      );

      setCurrentTask((previous) =>
        previous
          ? {
              ...previous,
              ...response.data,
              lifecycleStatus:
                response.data?.lifecycleStatus ||
                ProviderTaskLifecycleStatus.SUBMITTED,
            }
          : previous,
      );
      setSubmissionModalOpen(false);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleRespondToCancelRequest = async () => {
    const loadingToastId = toast.loading("Submitting cancellation response...");

    try {
      const response = await respondProviderCancelRequest({
        taskId: currentTask.id,
        action: cancelAction,
        note: cancelNote.trim() || undefined,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Cancellation response submitted.");
      setCurrentTask((previous) =>
        previous
          ? {
              ...previous,
              ...response.data,
              lifecycleStatus:
                response.data?.lifecycleStatus || previous.lifecycleStatus,
            }
          : previous,
      );
      setCancelResponseOpen(false);
      setCancelNote("");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleRequestExtension = async () => {
    const loadingToastId = toast.loading("Requesting extension...");

    try {
      const response = await requestProviderDeadlineExtension({
        taskId: currentTask.id,
        extendDays,
        reason: extensionReason.trim() || undefined,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Extension requested successfully.");
      
      setCurrentTask((previous) =>
        previous
          ? {
              ...previous,
              deadlineExtensions: [
                ...(previous.deadlineExtensions || []),
                response.data,
              ],
            }
          : previous,
      );
      setExtensionModalOpen(false);
      setExtensionReason("");
      setExtendDays(3);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <>
      <ModalShell
        open={open && !submissionModalOpen && !cancelResponseOpen && !disputeModalOpen}
        onClose={onClose}
        widthClass="max-w-4xl"
        minHeightClass="min-h-0"
      >
        <div className="flex flex-col">
          <div className="border-b border-[#eaecf0] px-6 pb-5 pt-6 md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c4320a]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {formatLifecycleStatus(currentTask.lifecycleStatus)}
                </div>
                <h2 className="mt-4 text-2xl font-bold text-[#101828]">
                  {currentTask.projectTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[#667085]">
                  Review the requester brief, timeline, and target details before
                  continuing fulfillment work.
                </p>
              </div>
              <div className="rounded-2xl border border-[#d0d5dd] bg-[#fcfcfd] px-4 py-3 m-4 text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                  Estimated Reward
                </p>
                <p className="mt-2 text-lg font-bold text-[#027a48]">
                  {formatCredits(currentTask)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoBlock
                label="Placement Type"
                value={formatPlacementType(currentTask.placementType)}
              />
              <InfoBlock
                label="Link Attribute"
                value={formatLinkAttribute(currentTask.linkAttribute)}
              />
              <InfoBlock label="Deadline" value={formatDueDate(currentTask)}>
                {currentTask.deadlineExtensionCount && currentTask.deadlineExtensionCount > 0 ? (
                  <span
                    className="rounded-full bg-[#fffaeb] px-2 py-0.5 text-[10px] font-bold text-[#b54708] border border-[#fef0c7]"
                    title={`${3 - (currentTask.deadlineExtensionCount || 0)} extensions remaining`}
                  >
                    EXTENDED
                  </span>
                ) : null}
              </InfoBlock>
              <InfoBlock label="Created" value={formatDate(currentTask.createdAt)} />
            </div>

            {pendingExtensionRequest && (
              <div className="rounded-xl border border-[#fef0c7] bg-[#fffaeb] px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fef0c7] text-[#b54708]">
                    <TimerReset className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#b54708]">
                      Extension Request Sent (Awaiting Requester Approval)
                    </h4>
                    <p className="mt-1 text-xs text-[#b54708]">
                      You requested {pendingExtensionRequest.extendDays} extra days. 
                      {pendingExtensionRequest.reason && ` Reason: ${pendingExtensionRequest.reason}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-[#eaecf0] bg-[#f8fafc] p-5">
              <div className="flex items-center gap-2 text-[#344054]">
                <Globe className="h-5 w-5 text-[#fd751f]" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">
                  Target URL
                </span>
              </div>
              <a
                href={currentTask.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-base font-semibold text-[#175cd3] underline-offset-4 hover:underline"
              >
                {currentTask.targetUrl}
              </a>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#344054] shadow-sm">
                  Domain: {formatDomain(currentTask.targetUrl)}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#344054] shadow-sm">
                  Anchor: {currentTask.anchorText}
                </span>
                {typeof currentTask.requiredDomainRating === "number" && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#344054] shadow-sm">
                    Required DR: {currentTask.requiredDomainRating}+
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] border border-[#eaecf0] bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                  Placement Guidelines
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#475467]">
                  {currentTask.placementGuidelines?.trim() ||
                    "No extra placement guidelines were included for this task."}
                </p>
              </div>

              <div className="rounded-[28px] border border-[#eaecf0] bg-[#fffaf5] p-5">
                <div className="flex items-center gap-2 text-[#344054]">
                  <TimerReset className="h-5 w-5 text-[#fd751f]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                    Request Snapshot
                  </p>
                </div>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">
                      Requester Website
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[#101828]">
                      {currentTask.requesterWebsite?.name || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">
                      Scope Window
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[#101828]">
                      {currentTask.requestedDeadlineDays
                        ? `${currentTask.requestedDeadlineDays} days`
                        : "Flexible"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">
                      Current Status
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[#101828]">
                      {formatLifecycleStatus(currentTask.lifecycleStatus)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {currentTask.providerProofDocuments &&
              currentTask.providerProofDocuments.length > 0 && (
                <div className="rounded-[28px] border border-[#eaecf0] bg-white p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                    Submitted Proof
                  </p>
                  <div className="mt-4 space-y-3">
                    {currentTask.providerProofDocuments.map((document, index) => (
                      <a
                        key={`${document}-${index}`}
                        href={document}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-[#eaecf0] px-4 py-3 text-sm font-semibold text-[#175cd3] underline-offset-4 hover:underline"
                      >
                        Proof Document {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {hasCancellationStatus && (
              <div
                className={`rounded-[28px] border p-5 ${cancellationStatusStyles.border} ${cancellationStatusStyles.bg}`}
              >
                <p
                  className={`text-[11px] font-bold uppercase tracking-[0.18em] ${cancellationStatusStyles.title}`}
                >
                  Cancellation Request Status
                </p>
                <div
                  className={`mt-3 space-y-2 text-sm ${cancellationStatusStyles.body}`}
                >
                  <p>
                    Status:{" "}
                    <span className="font-semibold">
                      {currentTask.cancellationRequestStatus}
                    </span>
                  </p>
                  <p>
                    Requested at:{" "}
                    <span className="font-semibold">
                      {formatDate(currentTask.cancellationRequestedAt)}
                    </span>
                  </p>
                  {cancellationRequestNote && (
                    <p>
                      Requester note:{" "}
                      <span className="font-semibold">{cancellationRequestNote}</span>
                    </p>
                  )}
                  {currentTask.cancellationRespondedAt && (
                    <p>
                      Responded at:{" "}
                      <span className="font-semibold">
                        {formatDate(currentTask.cancellationRespondedAt)}
                      </span>
                    </p>
                  )}
                  {cancellationResponseNote && !canRespondToCancelRequest && (
                    <p>
                      Response note:{" "}
                      <span className="font-semibold">{cancellationResponseNote}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#eaecf0] bg-white px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
            <Button variant="white" onClick={onClose} className="rounded-2xl">
              Close Overview
            </Button>

            <div className="flex flex-col gap-3 md:flex-row">
              {canDispute && (
                <Button
                  variant="white"
                  onClick={() => setDisputeModalOpen(true)}
                  className="rounded-2xl border-[#fda29b] text-[#d92d20]"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Open Dispute
                </Button>
              )}
              {canRespondToCancelRequest && (
                <Button
                  variant="white"
                  onClick={() => {
                    setSubmissionModalOpen(false);
                    setCancelResponseOpen(true);
                  }}
                  className="rounded-2xl border-[#fda29b] text-[#d92d20]"
                  disabled={isRespondingToCancel}
                >
                  <Ban className="h-4 w-4" />
                  Respond to Cancel Request
                </Button>
              )}
              {canStartWork && (
                <Button
                  variant="secondary"
                  onClick={handleStartWork}
                  className="rounded-2xl"
                  disabled={isStartingWork}
                >
                  <PlayCircle className="h-4 w-4" />
                  {isStartingWork ? "Starting..." : "Start Work"}
                </Button>
              )}

              {canSubmit && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCancelResponseOpen(false);
                    setSubmissionModalOpen(true);
                  }}
                  className="rounded-2xl"
                  disabled={isSubmitting || isResubmitting}
                >
                  <Send className="h-4 w-4" />
                  {isRevision ? "Resubmit Work" : "Submit Work"}
                </Button>
              )}
              
              {canRequestExtension && (
                <Button
                  variant="white"
                  onClick={() => setExtensionModalOpen(true)}
                  className="rounded-2xl"
                >
                  <TimerReset className="h-4 w-4" />
                  Request Extension
                </Button>
              )}
            </div>
          </div>
        </div>
      </ModalShell>

      {submissionModalOpen && (
        <ProviderTaskSubmissionModal
          isSubmitting={isSubmitting || isResubmitting}
          mode={isRevision ? "resubmit" : "submit"}
          onClose={() => setSubmissionModalOpen(false)}
          onSubmit={handleSubmitDelivery}
          open={submissionModalOpen}
          task={currentTask}
        />
      )}

      <ModalShell
        open={cancelResponseOpen}
        onClose={() => setCancelResponseOpen(false)}
        widthClass="max-w-2xl"
        minHeightClass="min-h-0"
      >
        <div className="flex flex-col gap-5 px-5 pb-6 pt-6 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef3f2] text-[#d92d20]">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#101828]">
                Respond to Cancel Request
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                Confirm whether you accept or reject the requester&apos;s
                cancellation request.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setCancelAction(ProviderTaskCancelAction.ACCEPT)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                cancelAction === ProviderTaskCancelAction.ACCEPT
                  ? "border-[#fd751f] bg-[#fff7ed]"
                  : "border-[#d0d5dd] bg-white"
              }`}
            >
              <p className="text-sm font-semibold text-[#101828]">Accept</p>
              <p className="mt-1 text-xs text-[#667085]">
                Accept the cancellation and stop the fulfillment flow.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setCancelAction(ProviderTaskCancelAction.REJECT)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                cancelAction === ProviderTaskCancelAction.REJECT
                  ? "border-[#fd751f] bg-[#fff7ed]"
                  : "border-[#d0d5dd] bg-white"
              }`}
            >
              <p className="text-sm font-semibold text-[#101828]">Reject</p>
              <p className="mt-1 text-xs text-[#667085]">
                Keep the task active and explain why fulfillment should continue.
              </p>
            </button>
          </div>

          <textarea
            value={cancelNote}
            onChange={(event) => setCancelNote(event.target.value)}
            rows={5}
            placeholder="Optional response note..."
            className="w-full resize-none rounded-2xl border border-[#d0d5dd] bg-white px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
          />

          <div className="flex flex-col gap-3 border-t border-[#eaecf0] pt-4 md:flex-row md:items-center md:justify-between">
            <Button
              variant="white"
              onClick={() => setCancelResponseOpen(false)}
              className="rounded-2xl"
              disabled={isRespondingToCancel}
            >
              Close
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleRespondToCancelRequest()}
              className="rounded-2xl"
              disabled={isRespondingToCancel}
            >
              {isRespondingToCancel ? "Submitting..." : "Submit Response"}
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        widthClass="max-w-xl"
        minHeightClass="min-h-0"
      >
        <div className="flex flex-col gap-5 px-5 pb-6 pt-6 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] text-[#fd751f]">
              <TimerReset className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#101828]">
                Request Deadline Extension
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                Request more time from the requester to complete this task.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                Extension Days
              </label>
              <select
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#d0d5dd] bg-white px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={5}>5 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                Reason (Optional)
              </label>
              <textarea
                value={extensionReason}
                onChange={(event) => setExtensionReason(event.target.value)}
                rows={4}
                placeholder="Why do you need more time?"
                className="w-full resize-none rounded-2xl border border-[#d0d5dd] bg-white px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#eaecf0] pt-4 md:flex-row md:items-center md:justify-between">
            <Button
              variant="white"
              onClick={() => setExtensionModalOpen(false)}
              className="rounded-2xl"
              disabled={isRequestingExtension}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleRequestExtension()}
              className="rounded-2xl"
              disabled={isRequestingExtension}
            >
              {isRequestingExtension ? "Requesting..." : "Send Request"}
            </Button>
          </div>
        </div>
      </ModalShell>

      <OpenDisputeModal
        open={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        taskId={currentTask.id}
        onSuccess={onClose}
      />
    </>
  );
}
