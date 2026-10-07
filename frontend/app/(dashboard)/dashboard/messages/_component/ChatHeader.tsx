import { Menu, ChevronRight, FileText, ShieldAlert, MoreVertical, Globe } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { isValidUrl } from "@/lib/utils";
import { useGetRequesterTaskQuery } from "@/redux/features/api/requesterTask/requesterTaskApi";
import { useGetProviderTaskDetailQuery } from "@/redux/features/api/providerTask/providerTaskApi";
import { useAppSelector } from "@/redux/store/hooks";
import { useReportMessageMutation, useGetRecipientChatQuery } from "@/redux/features/api/message/MessageApi";
import { toast } from "sonner";

import ProviderTaskOverviewModal from "@/components/dashboard/provider/delivery/modals/ProviderTaskOverviewModal";
import OrderInProgressModal from "@/components/dashboard/requester/orders/orderModals/OrderInProgressModal";
import OrderWaitingModal from "@/components/dashboard/requester/orders/orderModals/OrderWaitingModal";
import ReviewAllApplications from "@/components/dashboard/requester/orders/orderModals/ReviewAllApplications";
import OrderCompletedModal from "@/components/dashboard/requester/orders/orderModals/OrderCompletedModal";
import { mapRequesterTaskToOrderItem } from "@/components/dashboard/requester/orders/requesterTaskOrderHelpers";

interface ChatHeaderProps {
  selectedThread: any;
  setShowSidebarOnMobile: (show: boolean) => void;
  overrideStatus?: string | null;
}

export function ChatHeader({
  selectedThread,
  setShowSidebarOnMobile,
  overrideStatus,
}: ChatHeaderProps) {
  const participant = selectedThread.participant;
  const taskId = selectedThread.task?.id;

  const currentUser = useAppSelector((state: any) => state.auth.user);
  const isProvider = currentUser?.role === "PROVIDER";

  // Fetch task details dynamically
  const { data: requesterTaskData } = useGetRequesterTaskQuery(taskId || "", {
    skip: !taskId || isProvider,
  });

  const { data: providerTaskData } = useGetProviderTaskDetailQuery(taskId || "", {
    skip: !taskId || !isProvider,
  });

  const fetchedTask = isProvider ? providerTaskData?.data : requesterTaskData?.data;
  const task = taskId ? (fetchedTask || selectedThread.task) : null;
  const currentStatus = overrideStatus || task?.lifecycleStatus;

  const hasCancellationEvent = task?.timeline?.some(
    (event: any) =>
      event.actionTaken === "CANCELLATION_REQUESTED" ||
      event.uiAction === "CANCELLATION_REQUESTED" ||
      event.actionTaken === "CANCELLED" ||
      event.uiAction === "CANCELLED"
  );

  const isCancelledOrDeclined =
    currentStatus === "CANCELLED" ||
    currentStatus === "DECLINED" ||
    currentStatus === "EXPIRED" ||
    currentStatus === "FROZEN" ||
    !!task?.cancellationRequestedAt ||
    task?.cancellationRequestStatus === "PENDING" ||
    task?.cancellationRequestStatus === "APPROVED" ||
    hasCancellationEvent;

  // Report chat state and mutation
  const recipientId = selectedThread?.participant?.id;
  const [reportedThreadKeys, setReportedThreadKeys] = useState<Record<string, boolean>>({});

  const threadKey = `${recipientId}-${taskId || "direct"}`;
  const isReported = !!reportedThreadKeys[threadKey];

  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportNote, setReportNote] = useState("Suspicious off-platform payment request.");

  const reasonLabels: Record<string, string> = {
    SPAM: "Spam",
    ABUSE: "Abuse",
    FAKE_PROOF: "Fake Proof",
    OFF_PLATFORM_PAYMENT: "Off-platform Payment Request",
    SENSITIVE_INFORMATION: "Sensitive Information Shared",
    THREAT: "Threat / Harassment",
    OTHER: "Other",
  };

  const [reportMessage, { isLoading: isReporting }] = useReportMessageMutation();

  const { data: chatData } = useGetRecipientChatQuery(
    { recipientId: recipientId || "", taskId: taskId || undefined, limit: 50 },
    { skip: !recipientId }
  );

  const messages = chatData?.data?.data || [];
  const lastMessageId = messages[messages.length - 1]?.id || selectedThread?.lastMessage?.id;

  const handleReportSubmit = async () => {
    if (!lastMessageId) {
      toast.error("No messages found in this chat to report.");
      return;
    }

    try {
      await reportMessage({
        messageId: lastMessageId,
        reason: reportReason,
        note: reportNote,
      }).unwrap();

      setReportedThreadKeys(prev => ({ ...prev, [threadKey]: true }));
      setShowReportConfirm(false);
      toast.success("Chat reported successfully.");
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.data?.message || "Failed to report chat. Please try again.";
      toast.error(errorMsg);
      if (err?.status === 409 || err?.data?.statusCode === 409 || errorMsg.toLowerCase().includes("already reported")) {
        setReportedThreadKeys(prev => ({ ...prev, [threadKey]: true }));
        setShowReportConfirm(false);
      }
    }
  };

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Requester order details construction
  const order = task && !isProvider ? mapRequesterTaskToOrderItem(task) : null;
  const lifecycleStatus = order?.rawTask?.lifecycleStatus;
  const hasApplicants = order ? order.applicants > 0 : false;
  const isOpenTask =
    lifecycleStatus === "OPEN" || lifecycleStatus === "WAITING_FOR_APPLICANTS";
  const isWorkTask =
    lifecycleStatus === "ASSIGNED" ||
    lifecycleStatus === "IN_PROGRESS" ||
    lifecycleStatus === "SUBMITTED" ||
    lifecycleStatus === "REVISION_REQUESTED";
  const isFinishedTask =
    lifecycleStatus === "APPROVED" || lifecycleStatus === "COMPLETED";

  const participantName = participant?.name || "User";
  const initial = participantName.charAt(0).toUpperCase();
  const participantAvatar = participant?.imageKey;

  const getHostname = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return urlStr || "";
    }
  };

  const domain = task?.domain || (task?.targetUrl ? getHostname(task.targetUrl) : "N/A");
  const authority = task?.requiredDomainRating ? `DR ${task.requiredDomainRating} Metric` : "DR 72 Metric";

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={() => setShowSidebarOnMobile(true)}
          className="text-gray-700 hover:text-gray-900"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-medium text-gray-700 truncate">
          {participantName}
        </span>
      </div>

      {/* Top User Header Row */}
      <div className="bg-white py-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0">
              {isValidUrl(participantAvatar) ? (
                <Image
                  src={participantAvatar}
                  alt={participantName}
                  fill
                  className="object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.fallback-initial') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="fallback-initial flex items-center justify-center w-full h-full rounded-full bg-accent text-secondary font-bold text-lg border border-orange-100"
                style={{ display: isValidUrl(participantAvatar) ? 'none' : 'flex' }}
              >
                {initial}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#12B76A] border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {participantName}
                </p>
                <span className="bg-[#EEF4FF] text-[#3538CD] text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                  {participant?.role?.toLowerCase() || "Participant"}
                </span>
              </div>
              <p className="text-[#FD751F] text-[10px] font-bold tracking-wider mt-1 uppercase">
                • SECURE TASK FLOW ACTIVE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isReported) return;
                setShowReportConfirm(true);
              }}
              disabled={isReported}
              className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${isReported
                ? "text-red-500 cursor-default"
                : "text-gray-400 hover:text-gray-600"
                }`}
            >
              <ShieldAlert size={16} />
              {isReported ? "Reported" : "Report Activity"}
            </button>
            {/* <button className="text-gray-400 hover:text-gray-600 transition-colors p-1.5">
              <MoreVertical size={20} />
            </button> */}
          </div>
        </div>
      </div>

      {/* Task Brief Banner Below User Header */}
      {task && (
        <div className={`mx-4 md:mx-6 mt-4 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border ${isCancelledOrDeclined
          ? "bg-gray-50 border-gray-200"
          : "bg-[#FFF9F6] border-[#FFE7DB]"
          }`}>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 bg-white rounded-xl flex items-center justify-center shrink-0 border ${isCancelledOrDeclined ? "border-gray-200" : "border-[#FFE7DB]"
              }`}>
              <FileText size={20} className={isCancelledOrDeclined ? "text-gray-400" : "text-[#FD751F]"} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-bold tracking-wide ${isCancelledOrDeclined ? "text-gray-400" : "text-[#FD751F]"
                  }`}>
                  TASK #{task.id?.slice(0, 4)}
                </span>
                <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white ${isCancelledOrDeclined
                  ? "border-gray-300 text-gray-400"
                  : "border-[#FD751F] text-[#FD751F]"
                  }`}>
                  {isCancelledOrDeclined ? "CANCELED" : (currentStatus?.replace(/_/g, " ") || "UNKNOWN")}
                </span>
              </div>
              <h2 className="text-xs text-gray-500 mt-1 font-medium">
                {task.projectTitle || "No Title"}
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 md:gap-8">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isCancelledOrDeclined ? "text-gray-400" : "text-[#FF8540]"
                }`}>
                Placement Domain
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-700 font-semibold mt-1">
                <Globe size={14} className={isCancelledOrDeclined ? "text-gray-400" : "text-[#FF8540]"} />
                <span>{domain}</span>
              </div>
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isCancelledOrDeclined ? "text-gray-400" : "text-[#FF8540]"
                }`}>
                Authority
              </p>
              <p className="text-xs text-gray-700 font-semibold mt-1">
                {authority}
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                if (isCancelledOrDeclined) return;
                setIsModalOpen(true);
              }}
              className={`border font-bold px-4 py-2.5 rounded-lg text-[10px] tracking-wider flex items-center gap-1.5 transition-colors uppercase ${isCancelledOrDeclined
                ? "bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed"
                : "bg-white border-[#FD751F] text-[#FD751F] hover:bg-orange-50 cursor-pointer"
                }`}
            >
              <span>{isCancelledOrDeclined ? "Canceled" : "VIEW TASK BRIEF"}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {isProvider ? (
        <ProviderTaskOverviewModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          task={task}
        />
      ) : (
        order && (
          <>
            {isWorkTask && (
              <OrderInProgressModal
                order={order}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
              />
            )}
            {isOpenTask && !hasApplicants && (
              <OrderWaitingModal
                order={order}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
              />
            )}
            {isOpenTask && hasApplicants && (
              <ReviewAllApplications
                order={order}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
              />
            )}
            {isFinishedTask && (
              <OrderCompletedModal
                order={order}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
              />
            )}
          </>
        )
      )}

      {showReportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 font-sora">Report Conversation</h3>
            <p className="text-sm text-gray-500 mt-2">
              Please specify the reason for reporting this chat. This will be reviewed by our moderation team.
            </p>

            <div className="mt-4 space-y-4">
              <div className="relative">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Reason</label>
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                  className="w-full flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none text-left focus:border-[#FD751F] focus:ring-1 focus:ring-[#FD751F] cursor-pointer"
                >
                  <span>{reasonLabels[reportReason] || reportReason}</span>
                  <ChevronRight size={16} className={`transform transition-transform ${isPopoverOpen ? "rotate-90" : ""}`} />
                </button>

                {isPopoverOpen && (
                  <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
                    {Object.entries(reasonLabels).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setReportReason(value);
                          setIsPopoverOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition-colors first:rounded-t-xl last:rounded-b-xl cursor-pointer ${reportReason === value ? "bg-orange-50 text-[#FD751F] font-semibold" : "text-gray-700"
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Notes</label>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Provide details..."
                  className="w-full h-24 p-3 border border-gray-200 rounded-xl text-sm outline-none resize-none focus:border-[#FD751F] focus:ring-1 focus:ring-[#FD751F]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReportConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isReporting}
                onClick={handleReportSubmit}
                className="flex-1 py-2.5 bg-[#FD751F] hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isReporting ? "Reporting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
