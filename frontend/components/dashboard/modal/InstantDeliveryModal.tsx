"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import {
  X,
  Search,
  Link2,
  AlertCircle,
  Zap,
  FileText,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import DeliverySuccessModal from "./DeliverySuccessModal";
import { FulfillmentProposalModal } from "./FulfillmentProposalModal";
import InstantDeliveryFileUpload from "./FileUpload";
import { useGetProviderTasksQuery, useSubmitProviderTaskMutation } from "@/redux/features/api/providerTask/providerTaskApi";
import {
  formatCredits,
  formatDueDate,
  formatDomain,
  formatLifecycleStatus,
  getApiErrorMessage,
} from "@/components/dashboard/provider/providerTaskHelpers";
import {
  ProviderTaskFinalTaskType,
  ProviderTaskLifecycleStatus,
  ProviderTaskScope,
  type ProviderTask,
  type SubmitProviderTaskPayload,
} from "@/types/providerTask/providerTaskTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InstantDeliveryModalProps {
  onClose: () => void;
}

const MAX_TASKS = 100;
const UNSET_FINAL_TASK = "__unset__";

export function InstantDeliveryModal({ onClose }: InstantDeliveryModalProps) {
  const [taskQuery, setTaskQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [showProposal, setShowProposal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalTaskType, setFinalTaskType] = useState<
    ProviderTaskFinalTaskType | undefined
  >(undefined);

  const { data, error, isFetching, isLoading } = useGetProviderTasksQuery({
    scope: ProviderTaskScope.INVOLVED,
    lifecycleStatus: ProviderTaskLifecycleStatus.IN_PROGRESS,
    page: 1,
    limit: MAX_TASKS,
  });
  const [submitProviderTask, { isLoading: isSubmitting }] =
    useSubmitProviderTaskMutation();

  useEffect(() => {
    if (error) {
      toast.error(getApiErrorMessage(error));
    }
  }, [error]);

  const tasks = useMemo(
    () => data?.data?.items ?? data?.data?.data ?? [],
    [data],
  );

  const filteredTasks = useMemo(() => {
    const normalizedQuery = taskQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesLifecycle =
        task.lifecycleStatus === ProviderTaskLifecycleStatus.IN_PROGRESS;

      if (!matchesLifecycle) return false;
      if (!normalizedQuery) return true;

      return [
        task.projectTitle,
        task.anchorText,
        task.targetUrl,
        task.requesterWebsite?.name ?? "",
        task.requesterWebsite?.websiteUrl ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [taskQuery, tasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const handleTaskInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTaskQuery(event.target.value);
    setSelectedTaskId("");
    setShowTaskDropdown(true);
  };

  const handleTaskInputClick = (event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setShowTaskDropdown(true);
  };

  const handleSelectTask = (task: ProviderTask) => {
    setSelectedTaskId(task.id);
    setTaskQuery(task.projectTitle);
    setShowTaskDropdown(false);

    if (!finalTaskType) {
      setFinalTaskType(ProviderTaskFinalTaskType.BACKLINK);
    }
  };

  const handleSaveDraft = () => {
    setShowProposal(true);
  };

  const handleSubmitDelivery = async () => {
    const normalizedMessage = deliveryMessage.trim();

    if (!selectedTask || !normalizedMessage) return;

    const loadingToastId = toast.loading("Submitting delivery...");

    try {
      const payload: SubmitProviderTaskPayload = {
        deliveryMessage: normalizedMessage,
        proofUrl: proofUrl.trim() || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        finalTaskType,
      };

      const response = await submitProviderTask({
        taskId: selectedTask.id,
        data: payload,
        files,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Delivery submitted successfully.");
      setShowSuccess(true);
    } catch (submissionError) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(submissionError));
    }
  };

  const handleProposalSubmit = () => {
    setShowProposal(false);
    setShowSuccess(true);
  };

  const handleCloseProposal = () => {
    setShowProposal(false);
  };

  const handleBackdropClick = () => onClose();
  const handleContentClick = (event: MouseEvent<HTMLDivElement>) =>
    event.stopPropagation();

  if (showSuccess) {
    return <DeliverySuccessModal onClose={onClose} />;
  }

  return (
    <>
      {!showProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[95vh]"
            onClick={handleContentClick}
          >
            <div className="px-7 pt-6 pb-5 flex items-center justify-between border-b border-[#f0f0f0] shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#fd751f] flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-white fill-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#181d27] tracking-tight uppercase">
                    Instant Submit Delivery
                  </h1>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fd751f]">
                    In-progress projects only
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-[#e9eaeb] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
              >
                <X className="w-4 h-4 text-[#717680]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-6">
              <div className="rounded-2xl border border-[#e9eaeb] bg-[#fcfcfd] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                  Delivery Guidance
                </p>
                <p className="mt-2 text-sm leading-6 text-[#475467]">
                  Choose an in-progress project, attach proof if needed, and submit the
                  live delivery details directly from this panel.
                </p>
              </div>

              <div className="flex flex-col gap-2 relative">
                <label className="text-xs font-bold text-[#181d27] uppercase tracking-widest">
                  Select Task to Deliver
                </label>
                <div
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-white transition-colors cursor-pointer ${
                    showTaskDropdown
                      ? "border-[#fd751f]"
                      : "border-[#e9eaeb] hover:border-[#d5d7da]"
                  }`}
                  onClick={() => setShowTaskDropdown((value) => !value)}
                >
                  <Search className="w-4 h-4 text-[#a4a7ae] shrink-0" />
                  <input
                    type="text"
                    placeholder="Choose an active task..."
                    value={selectedTask ? selectedTask.projectTitle : taskQuery}
                    onChange={handleTaskInputChange}
                    onClick={handleTaskInputClick}
                    className="flex-1 text-sm text-[#181d27] placeholder-[#a4a7ae] outline-none bg-transparent cursor-text"
                  />
                  <ChevronDown className="w-4 h-4 text-[#a4a7ae] shrink-0" />
                </div>

                {showTaskDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e9eaeb] rounded-xl shadow-lg z-10 overflow-hidden max-h-72 overflow-y-auto">
                    {isLoading || isFetching ? (
                      <div className="px-4 py-3 text-sm text-[#9ca3af]">
                        Loading in-progress projects...
                      </div>
                    ) : filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm text-[#181d27] hover:bg-[#fff7ed] hover:text-[#fd751f] transition-colors flex items-start gap-3"
                          onClick={() => handleSelectTask(task)}
                        >
                          <FileText className="w-4 h-4 text-[#a4a7ae] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{task.projectTitle}</div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#667085]">
                              <span>{task.requesterWebsite?.name ?? formatDomain(task.targetUrl)}</span>
                              <span>{formatLifecycleStatus(task.lifecycleStatus)}</span>
                              <span>{formatCredits(task, "Protected")}</span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-[#9ca3af]">
                        No in-progress projects available.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedTask && (
                <div className="rounded-2xl border border-[#e9eaeb] bg-[#fcfcfd] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                        Selected Project
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-[#181d27]">
                        {selectedTask.projectTitle}
                      </h3>
                      <p className="mt-1 text-sm text-[#667085]">
                        {selectedTask.requesterWebsite?.name ?? formatDomain(selectedTask.targetUrl)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-xs font-semibold text-[#fd751f]">
                        {formatCredits(selectedTask)}
                      </span>
                      <span className="text-[11px] text-[#667085]">
                        Due {formatDueDate(selectedTask)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#181d27] uppercase tracking-widest">
                  Delivery Message
                </label>
                <textarea
                  value={deliveryMessage}
                  onChange={(event) => setDeliveryMessage(event.target.value)}
                  placeholder="Write a brief submission note the requester..."
                  rows={4}
                  className="w-full bg-[#f9f9f9] border border-[#e9eaeb] rounded-xl px-4 py-3 text-sm text-[#181d27] placeholder-[#a4a7ae] outline-none resize-none focus:border-[#fd751f] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#181d27] uppercase tracking-widest">
                  Final Task Type
                </label>
                <Select
                  value={finalTaskType ?? UNSET_FINAL_TASK}
                  onValueChange={(value) => {
                    if (
                      value === ProviderTaskFinalTaskType.BACKLINK ||
                      value === ProviderTaskFinalTaskType.GUEST_POST
                    ) {
                      setFinalTaskType(value);
                    } else {
                      setFinalTaskType(undefined);
                    }
                  }}
                >
                  <SelectTrigger className="h-12 rounded-xl border-[#e9eaeb] text-sm text-[#181d27]">
                    <SelectValue placeholder="Select the final delivery format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_FINAL_TASK} className="hidden" aria-hidden>
                      Select the final delivery format
                    </SelectItem>
                    <SelectItem value={ProviderTaskFinalTaskType.BACKLINK}>
                      Backlink
                    </SelectItem>
                    <SelectItem value={ProviderTaskFinalTaskType.GUEST_POST}>
                      Guest Post
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <InstantDeliveryFileUpload
                files={files}
                onFilesChange={setFiles}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#181d27] uppercase tracking-widest">
                    Proof URL (Optional)
                  </label>
                  <div
                    className={`flex items-center gap-2.5 border rounded-xl px-3 py-3 bg-white transition-colors ${
                      proofUrl ? "border-[#fd751f]" : "border-[#e9eaeb]"
                    }`}
                  >
                    <Link2 className="w-4 h-4 text-[#a4a7ae] shrink-0" />
                    <input
                      type="url"
                      placeholder="https://google.drive/....."
                      value={proofUrl}
                      onChange={(event) => setProofUrl(event.target.value)}
                      className="flex-1 text-sm text-[#181d27] placeholder-[#a4a7ae] outline-none bg-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#181d27] uppercase tracking-widest">
                    Additional Notes (Optional)
                  </label>
                  <div
                    className={`flex items-center gap-2.5 border rounded-xl px-3 py-3 bg-white transition-colors ${
                      additionalNotes ? "border-[#fd751f]" : "border-[#e9eaeb]"
                    }`}
                  >
                    <input
                      type="text"
                      placeholder="Password for archives, etc..."
                      value={additionalNotes}
                      onChange={(event) => setAdditionalNotes(event.target.value)}
                      className="flex-1 text-sm text-[#181d27] placeholder-[#a4a7ae] outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-7 py-4 border-t border-[#f0f0f0] flex items-center justify-between gap-4 bg-[#fafafa] rounded-b-2xl shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#717680] shrink-0" />
                <p className="text-xs font-semibold text-[#717680] uppercase tracking-wide">
                  Submission is final. Ensure all files are correct.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="bg-[#f5f5f5] border cursor-pointer rounded-lg border-[#e9eaeb] hover: transition-colors text-[#414651] font-bold text-sm px-6 py-2.5"
                >
                  SAVE DRAFT
                </button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => void handleSubmitDelivery()}
                  className="rounded-lg"
                  disabled={!selectedTask || !deliveryMessage.trim() || !finalTaskType || isSubmitting}
                >
                  <Zap className="w-4 h-4 fill-white" />
                  {isSubmitting ? "SUBMITTING..." : "SUBMIT DELIVERY"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProposal && (
        <FulfillmentProposalModal
          taskLabel={selectedTask?.projectTitle}
          onClose={handleCloseProposal}
          onSubmit={handleProposalSubmit}
        />
      )}
    </>
  );
}
