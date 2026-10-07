import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  X,
  ChevronDown,
  ExternalLink,
  FileText,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { getTaskStatusStyle, toTaskRecord } from "../utils/adminTaskMapper";
import { AdminTaskListParams, TaskRecord, AdminTaskAction } from "@/redux/feature/task/taskTypes";
import { useGetAdminTasksQuery, useRunAdminTaskActionMutation } from "@/redux/feature/task/taskApi";
import { usePermissions } from "../utils/usePermissions";

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<
  AdminTaskAction,
  { label: string; confirmLabel: string; confirmColor: string; confirmBg: string; needsAmount?: boolean; needsDisputeResolution?: boolean }
> = {
  FORCE_APPROVE:    { label: "Force Approve Task",   confirmLabel: "Force Approve",    confirmColor: "#008236", confirmBg: "#00A63E" },
  FORCE_REJECT:     { label: "Force Reject Task",    confirmLabel: "Force Reject",     confirmColor: "#FB2C36", confirmBg: "#FB2C36" },
  CREDIT_REFUND:    { label: "Refund Credits",        confirmLabel: "Refund Credits",   confirmColor: "#155DFC", confirmBg: "#155DFC", needsAmount: true },
  CREDIT_REVERSE:   { label: "Reverse Credits",       confirmLabel: "Reverse Credits",  confirmColor: "#FB2C36", confirmBg: "#FB2C36", needsAmount: true },
  FREEZE:           { label: "Freeze Task",           confirmLabel: "Freeze Task",      confirmColor: "#CA3500", confirmBg: "#CA3500" },
  RESOLVE_DISPUTE:  { label: "Resolve Dispute",       confirmLabel: "Resolve Dispute",  confirmColor: "#155DFC", confirmBg: "#155DFC", needsDisputeResolution: true },
  FLAG_ABUSE:       { label: "Flag Abuse Pattern",    confirmLabel: "Flag Abuse",       confirmColor: "#000000", confirmBg: "#1F2937" },
};

const TasksPage = () => {
  const { can } = usePermissions();
  const canUpdate = can("TASKS", "canUpdate");

  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [taskTypeVal, setTaskTypeVal] = useState("ALL TYPES");
  const [linkAttrVal, setLinkAttrVal] = useState("ALL ATTRIBUTES");
  const [statusVal, setStatusVal] = useState("ALL STATUSES");
  const [postingSiteVal, setPostingSiteVal] = useState("");
  const [counterpartyVal, setCounterpartyVal] = useState("");
  const [deadlineStatusVal, setDeadlineStatusVal] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<AdminTaskListParams>({
    page: 1,
    limit: 10,
  });

  // ── Action modal state ────────────────────────────────────────────────────
  const [actionType, setActionType] = useState<AdminTaskAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionAmount, setActionAmount] = useState("");
  const [actionDisputeResolution, setActionDisputeResolution] = useState<"REQUEST_REVISION" | "APPROVE" | "REJECT">("REQUEST_REVISION");
  const [actionMessage, setActionMessage] = useState("");
  const [actionSuccess, setActionSuccess] = useState(false);
  const [runAdminTaskAction, { isLoading: isActioning }] = useRunAdminTaskActionMutation();

  const openAction = (action: AdminTaskAction) => {
    setActionType(action);
    setActionReason("");
    setActionAmount("");
    setActionDisputeResolution("REQUEST_REVISION");
    setActionMessage("");
    setActionSuccess(false);
  };

  const closeAction = () => {
    if (isActioning) return;
    setActionType(null);
  };

  const handleRunAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !actionType) return;
    setActionMessage("");
    const cfg = ACTION_CONFIG[actionType];
    if (!actionReason.trim()) {
      setActionMessage("Reason is required.");
      return;
    }
    if (cfg.needsAmount && (!actionAmount || Number(actionAmount) <= 0)) {
      setActionMessage("A valid positive amount is required.");
      return;
    }
    try {
      const payload: Parameters<typeof runAdminTaskAction>[0] = {
        taskId: selectedTask.taskId,
        action: actionType,
        reason: actionReason.trim(),
        ...(cfg.needsAmount ? { amount: Number(actionAmount) } : {}),
        ...(cfg.needsDisputeResolution ? { disputeResolution: actionDisputeResolution } : {}),
      };
      const res = await runAdminTaskAction(payload).unwrap();
      setActionSuccess(true);
      setActionMessage(res.message || "Action completed successfully.");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err && err.data &&
        typeof err.data === "object" && "message" in err.data
          ? String((err.data as { message: string }).message)
          : "Action failed. Please try again.";
      setActionSuccess(false);
      setActionMessage(msg);
    }
  };

  const { data: taskResponse, isFetching, isError } = useGetAdminTasksQuery(appliedFilters);
  const meta = taskResponse?.data?.meta;
  const tasks = (taskResponse?.data?.items ?? []).map(toTaskRecord);

  const handleApplyFilters = () => {
    const search = [postingSiteVal.trim(), counterpartyVal.trim()].filter(Boolean).join(" ");

    setAppliedFilters({
      page: 1,
      limit: 10,
      placementType: taskTypeVal === "ALL TYPES" ? undefined : taskTypeVal,
      linkAttribute: linkAttrVal === "ALL ATTRIBUTES" ? undefined : linkAttrVal,
      status: statusVal === "ALL STATUSES" ? undefined : statusVal,
      search: search || undefined,
      deadlineStatus: deadlineStatusVal.trim() || undefined,
    });
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
    setActionType(null);
  };

  return (
    <div className="w-full font-arimo space-y-6">
      <section>
        <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
          Tasks
        </h1>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
          Centralized Monitoring and Governance of All Marketplace Tasks.
        </p>
      </section>
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-end flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Task Type
          </label>
          <div className="relative">
            <select
              value={taskTypeVal}
              onChange={(e) => setTaskTypeVal(e.target.value)}
              className="w-full h-[44px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors"
            >
              <option value="ALL TYPES">ALL TYPES</option>
              <option value="BACKLINK">BACKLINK</option>
              <option value="GUEST POST">GUEST POST</option>
              <option value="FLEXIBLE">FLEXIBLE</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Link Attribute
          </label>
          <div className="relative">
            <select
              value={linkAttrVal}
              onChange={(e) => setLinkAttrVal(e.target.value)}
              className="w-full h-[44px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors"
            >
              <option value="ALL ATTRIBUTES">ALL ATTRIBUTES</option>
              <option value="DOFOLLOW">DOFOLLOW</option>
              <option value="NOFOLLOW">NOFOLLOW</option>
              <option value="SPONSORED">SPONSORED</option>
              <option value="UGC">UGC</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Task Status
          </label>
          <div className="relative">
            <select
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value)}
              className="w-full h-[44px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors"
            >
              <option value="ALL STATUSES">ALL STATUSES</option>
              <option value="OPEN">PENDING</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DISPUTED">DISPUTED</option>
              <option value="FROZEN">FROZEN</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Posting Site
          </label>
          <input
            type="text"
            value={postingSiteVal}
            onChange={(e) => setPostingSiteVal(e.target.value)}
            placeholder="Domain"
            className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-[#331FFD] transition-colors"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Counterparty
          </label>
          <input
            type="text"
            value={counterpartyVal}
            onChange={(e) => setCounterpartyVal(e.target.value)}
            placeholder="Entity"
            className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-[#331FFD] transition-colors"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Date Range
          </label>
          <input
            type="text"
            value={deadlineStatusVal}
            onChange={(e) => setDeadlineStatusVal(e.target.value)}
            placeholder="dd/mm/yyyy"
            className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-[#331FFD] transition-colors"
          />
        </div>
        <button
          onClick={handleApplyFilters}
          className="h-[44px] bg-[#000000] text-white px-7 rounded-lg text-[13px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex-shrink-0 self-end"
        >
          Filter Records
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px] font-medium uppercase tracking-wide">
          Failed to load task ledger data. Please try again.
        </div>
      )}

      <div className={`bg-white rounded-xl border border-gray-200 transition-opacity duration-200 ${isFetching ? "opacity-75" : "opacity-100"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#000000]" />
            <h2 className="text-[15px] font-bold text-[#000000] uppercase tracking-[0.05em]">
              Marketplace Task Ledger
            </h2>
          </div>
          <span className="text-[13px] font-medium text-gray-400 uppercase tracking-wider">
            {meta?.totalItems ?? tasks.length} Live Governance Entries
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[110px]">
                  Task ID /<br />Created
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Sites (Source + Target)
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Destination URL
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[100px]">
                  Type /<br />Attr
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[80px]">
                  Credits
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right pr-6 w-[90px]">
                  Authority<br />Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task: any) => {
                const ss = getTaskStatusStyle(task.status);
                return (
                  <tr
                    key={task.taskId}
                    className="hover:bg-gray-50/50 transition-colors align-top"
                  >
                    <td className="px-6 py-5">
                      <span
                        className="text-[14px] font-bold block leading-tight"
                        style={{ color: "#155DFC" }}
                      >
                        {task.taskId}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 mt-0.5 block">
                        {task.created}
                      </span>
                    </td>

                    {/* Sites (Source → Target) */}
                    <td className="px-4 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div>
                            <span className="text-[13px] font-bold text-[#000000] block">
                              {task.sourceSite}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 uppercase">
                              {task.sourceOrg}
                            </span>
                          </div>
                          <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                          <div>
                            <span className="text-[13px] font-bold text-[#000000] block">
                              {task.targetSite}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 uppercase">
                              {task.targetOrg}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span
                        className="text-[12px] font-medium block leading-tight underline cursor-pointer hover:opacity-80"
                        style={{ color: "#155DFC" }}
                      >
                        {task.destinationUrl}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            task.urlStatus === "ACTIVE"
                              ? "bg-[#008236]"
                              : "bg-[#FB2C36]"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-bold uppercase ${
                            task.urlStatus === "ACTIVE"
                              ? "text-[#008236]"
                              : "text-[#FB2C36]"
                          }`}
                        >
                          {task.urlStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-[13px] font-bold text-[#000000] block">
                        {task.taskType}
                      </span>
                      <span
                        className="text-[11px] font-bold uppercase block mt-0.5"
                        style={{
                          color:
                            task.linkAttr === "FOLLOW"
                              ? "#155DFC"
                              : task.linkAttr === "SPONSORED"
                              ? "#CA3500"
                              : "#364153",
                        }}
                      >
                        {task.linkAttr}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-[20px] font-bold text-[#000000] block leading-none">
                        {task.credits}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        CR
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-1.5">
                        {ss.dot && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ss.dot }}
                          />
                        )}
                        <span
                          className="text-[12px] font-bold uppercase"
                          style={{ color: ss.text }}
                        >
                          {task.status}
                        </span>
                      </div>
                      {task.statusDetail && (
                        <span
                          className="text-[10px] font-bold uppercase block mt-1"
                          style={{ color: "#FB2C36" }}
                        >
                          {task.statusDetail}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-5 text-right pr-6">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="text-[12px] font-bold uppercase tracking-wider hover:underline leading-tight"
                        style={{ color: "#155DFC" }}
                      >
                        View<br />Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isFetching && tasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 uppercase tracking-wider font-medium">
                    No task ledger entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {meta && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl gap-4">
            <span className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
              {meta.totalItems > 0
                ? `Showing ${Math.min((meta.currentPage - 1) * meta.perPage + 1, meta.totalItems)}-${Math.min(
                    meta.currentPage * meta.perPage,
                    meta.totalItems,
                  )} of ${meta.totalItems} tasks`
                : "No tasks"}
            </span>
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(meta.currentPage - 1)}
                  disabled={!meta.hasPrevPage}
                  className={`px-3 py-1.5 rounded-lg border text-[13px] font-bold uppercase tracking-wider transition-colors ${
                    meta.hasPrevPage
                      ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  Prev
                </button>
                {Array.from({ length: meta.totalPages }, (_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === meta.currentPage;
                  return (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      className={`w-[32px] h-[32px] rounded-lg text-[13px] font-bold flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-[#000000] text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(meta.currentPage + 1)}
                  disabled={!meta.hasNextPage}
                  className={`px-3 py-1.5 rounded-lg border text-[13px] font-bold uppercase tracking-wider transition-colors ${
                    meta.hasNextPage
                      ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] sm:text-[12px] text-gray-400 font-medium leading-relaxed uppercase tracking-wide">
        Marketplace Transactions: All task submissions, status changes, and
        settlement releases are cryptographically signed and immutable.
        Force actions (approvals, rejections, reversals) are high-authority
        interventions that bypass standard automated lifecycle settlement.
        Unauthorized attempts to manipulate task status or credit flows are
        automatically flagged for security forensics.
      </p>
      <div className="flex items-center justify-between text-[12px] font-medium text-gray-400 uppercase tracking-wider">
        <span>Unverified Operational Controls</span>
        <div className="flex items-center gap-3">
          <span>Reports</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="w-2 h-2 rounded-full bg-gray-500" />
          </div>
          <span>Strict Confidentiality Protocol Active</span>
        </div>
      </div>
      {selectedTask && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={handleCloseModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-7 pt-7 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#1F2937] flex items-center justify-center">
                    <span className="text-[20px] font-bold text-white">T</span>
                  </div>
                  <div>
                    <h2 className="text-[20px] font-bold text-[#000000] uppercase tracking-wide">
                      {selectedTask.taskId} Oversight
                    </h2>
                    <p className="text-[13px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">
                      Institutional Task Forensic Profile
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="border-t border-gray-100" />
              <div className="px-7 py-6 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Operational Status
                    </p>
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[14px] font-bold uppercase"
                      style={{
                        backgroundColor:
                          selectedTask.status === "COMPLETED" ||
                          selectedTask.status.includes("ACCEPTED")
                            ? "#F0FDF4"
                            : selectedTask.status === "DISPUTED"
                            ? "#FEF2F2"
                            : "#F3F4F6",
                        color:
                          selectedTask.status === "COMPLETED" ||
                          selectedTask.status.includes("ACCEPTED")
                            ? "#008236"
                            : selectedTask.status === "DISPUTED"
                            ? "#FB2C36"
                            : "#364153",
                      }}
                    >
                      {(selectedTask.status === "COMPLETED" ||
                        selectedTask.status.includes("ACCEPTED")) && (
                        <span className="w-2 h-2 rounded-full bg-[#008236]" />
                      )}
                      {selectedTask.status === "DISPUTED" && (
                        <span className="w-2 h-2 rounded-full bg-[#FB2C36]" />
                      )}
                      {selectedTask.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Dispute Protocol
                    </p>
                    <span
                      className="inline-block px-3 py-1.5 rounded-md text-[14px] font-bold uppercase"
                      style={{
                        backgroundColor:
                          selectedTask.status === "DISPUTED"
                            ? "#FEF2F2"
                            : "#F0FDF4",
                        color:
                          selectedTask.status === "DISPUTED"
                            ? "#FB2C36"
                            : "#008236",
                      }}
                    >
                      {selectedTask.status === "DISPUTED"
                        ? "ACTIVE DISPUTE"
                        : "NORMAL / CLEAR"}
                    </span>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-5">
                    Task Metadata & Flow
                  </h3>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Task Type
                      </p>
                      <p className="text-[16px] font-bold text-[#000000] uppercase">
                        {selectedTask.taskType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Link Attribute
                      </p>
                      <p
                        className="text-[16px] font-bold uppercase"
                        style={{ color: "#155DFC" }}
                      >
                        {selectedTask.linkAttr}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Posting Site (Provider)
                      </p>
                      <p className="text-[16px] font-bold text-[#000000]">
                        {selectedTask.sourceSite}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Receiving Site (Requester)
                      </p>
                      <p className="text-[16px] font-bold text-[#000000]">
                        {selectedTask.targetSite.replace(".IO", ".IO")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Destination URL Target
                      </p>
                      <p
                        className="text-[14px] font-medium underline break-all"
                        style={{ color: "#155DFC" }}
                      >
                        {selectedTask.destinationUrl}
                      </p>
                    </div>
                    <div className="flex items-end justify-end pb-1">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-bold uppercase"
                        style={{
                          backgroundColor:
                            selectedTask.urlStatus === "ACTIVE"
                              ? "#F0FDF4"
                              : "#FEF2F2",
                          color:
                            selectedTask.urlStatus === "ACTIVE"
                              ? "#008236"
                              : "#FB2C36",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              selectedTask.urlStatus === "ACTIVE"
                                ? "#008236"
                                : "#FB2C36",
                          }}
                        />
                        {selectedTask.urlStatus}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Escrow Value
                      </p>
                      <p className="text-[28px] font-bold text-[#000000] leading-none">
                        {selectedTask.escrowValue}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Verification Signal
                      </p>
                      <p className="text-[12px] font-bold text-gray-500 uppercase leading-tight mt-1">
                        {selectedTask.verificationSignal}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-4 italic">
                    Institutional Lifecycle Log
                  </h3>
                  <div className="space-y-4">
                    {selectedTask.lifecycle.map((item, i) => (
                      <div key={i} className="flex items-start justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="text-[14px] font-bold text-[#000000] uppercase">
                            {item.event}
                          </p>
                          <p className="text-[12px] font-medium text-gray-400 mt-0.5">
                            {item.datetime}
                          </p>
                        </div>
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex-shrink-0 ml-4 mt-1">
                          {item.node}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* ── Governance Enforcement Actions — only for admins with TASKS update permission ── */}
                {canUpdate && (
                  <div>
                    <h3
                      className="text-[14px] font-bold uppercase tracking-wider mb-4"
                      style={{ color: "#FB2C36" }}
                    >
                      Governance Enforcement Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => openAction("FORCE_APPROVE")}
                        className="h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                        style={{ backgroundColor: "#F0FDF4", color: "#008236", border: "1px solid #BBF7D0" }}
                      >
                        Force Approve Task
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction("FORCE_REJECT")}
                        className="h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                        style={{ backgroundColor: "#FEF3F2", color: "#F97066", border: "1px solid #F97066" }}
                      >
                        Force Reject Task
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction("CREDIT_REFUND")}
                        className="h-[46px] border border-gray-200 rounded-lg text-[13px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors"
                      >
                        Refund Credits
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction("FREEZE")}
                        className="h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                        style={{ backgroundColor: "#FEF3F2", color: "#F97066", border: "1px solid #F97066" }}
                      >
                        Freeze Task
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction("RESOLVE_DISPUTE")}
                        className="h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                        style={{ backgroundColor: "#EFF6FF", color: "#1447E6", border: "1px solid #BFDBFE" }}
                      >
                        Resolve Dispute
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction("FLAG_ABUSE")}
                        className="h-[46px] border border-gray-200 rounded-lg text-[13px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors"
                      >
                        Flag Abuse Pattern
                      </button>
                    </div>

                    {/* ── Action confirmation sub-modal ─── */}
                    {actionType && (() => {
                    const cfg = ACTION_CONFIG[actionType];
                    return (
                      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
                        <div
                          className="w-full max-w-[440px] rounded-xl shadow-2xl p-6"
                          style={{ backgroundColor: "#101828" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                              <h4 className="text-[14px] font-bold text-white uppercase tracking-wider">
                                {cfg.label}
                              </h4>
                              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-1">
                                Task: {selectedTask?.taskId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={closeAction}
                              disabled={isActioning}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-colors"
                            >
                              <X size={15} />
                            </button>
                          </div>

                          <form onSubmit={handleRunAction} className="space-y-3">
                            {/* Amount (CREDIT_REFUND / CREDIT_REVERSE only) */}
                            {cfg.needsAmount && (
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Credit Amount
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={actionAmount}
                                  onChange={(e) => setActionAmount(e.target.value)}
                                  placeholder="e.g. 1"
                                  className="mt-1 h-[44px] w-full rounded-lg border border-white/20 bg-transparent px-4 text-[13px] font-medium text-white outline-none placeholder:text-gray-500 focus:border-white/40"
                                />
                              </div>
                            )}

                            {/* Dispute resolution (RESOLVE_DISPUTE only) */}
                            {cfg.needsDisputeResolution && (
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Resolution Type
                                </label>
                                <div className="relative mt-1">
                                  <select
                                    value={actionDisputeResolution}
                                    onChange={(e) => setActionDisputeResolution(e.target.value as typeof actionDisputeResolution)}
                                    className="w-full h-[44px] rounded-lg border border-white/20 bg-[#1F2937] px-4 pr-10 text-[13px] font-medium text-white outline-none appearance-none focus:border-white/40 cursor-pointer"
                                  >
                                    <option value="REQUEST_REVISION">Request Revision</option>
                                    <option value="APPROVE">Approve</option>
                                    <option value="REJECT">Reject</option>
                                  </select>
                                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                              </div>
                            )}

                            {/* Reason (always required) */}
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                Audit Reason <span className="text-red-400">*</span>
                              </label>
                              <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Provide a mandatory audit reason for this action…"
                                rows={3}
                                className="mt-1 w-full resize-none rounded-lg border border-white/20 bg-transparent px-4 py-3 text-[13px] font-medium text-white outline-none placeholder:text-gray-500 focus:border-white/40"
                              />
                            </div>

                            {/* Feedback message */}
                            {actionMessage && (
                              <p
                                className="rounded-lg border px-3 py-2 text-[11px] font-medium uppercase tracking-wide"
                                style={{
                                  borderColor: actionSuccess ? "#00A63E55" : "#FB2C3655",
                                  backgroundColor: actionSuccess ? "#00A63E15" : "#FB2C3615",
                                  color: actionSuccess ? "#00C950" : "#FF6166",
                                }}
                              >
                                {actionMessage}
                              </p>
                            )}

                            {/* Buttons */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <button
                                type="button"
                                onClick={closeAction}
                                disabled={isActioning}
                                className="h-[44px] rounded-lg border border-white/20 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isActioning || actionSuccess}
                                className="h-[44px] rounded-lg text-[12px] font-bold text-white uppercase tracking-wider transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{ backgroundColor: cfg.confirmBg }}
                              >
                                {isActioning && <Loader2 size={14} className="animate-spin" />}
                                {isActioning ? "Processing…" : cfg.confirmLabel}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    );
                   })()}
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <FileText
                      size={22}
                      className="text-gray-400 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <h4 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider">
                        Forensic Accountability Note
                      </h4>
                      <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-1.5 leading-relaxed">
                        All task interventions are cryptographically logged
                        and subject to institutional audit review.
                      </p>
                      <button
                        className="text-[13px] font-bold uppercase tracking-wider mt-2 hover:underline"
                        style={{ color: "#008236" }}
                      >
                        Access Global Audit Chain
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default TasksPage;
