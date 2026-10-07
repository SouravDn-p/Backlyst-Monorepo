"use client";

import { useState } from "react";
import { Search, Coins } from "lucide-react";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import ViewTaskModal, { TaskDetail } from "./view/Viewtaskmodal";
import type { Website } from "@/app/(dashboard)/dashboard/websites/page";
import type { Website as ApiWebsite } from "@/types/website/websiteTypes";
import {
  useGetRequesterTasksQuery,
} from "@/redux/features/api/requesterTask/requesterTaskApi";
import {
  useGetWebsiteCreditSummaryQuery,
  useAllocatePurchasedCreditsMutation,
  useBuyVisibilityCreditsMutation,
  useGetCreditsMeQuery,
} from "@/redux/features/api/credit/creditApi";
import {
  RequesterTask,
  RequesterTaskLinkAttribute,
  RequesterTaskLifecycleStatus,
} from "@/types/requesterTask/requesterTaskTypes";
import WebsiteCreditSection from "./view/WebsiteCreditSection";
import {
  getRequesterTaskApplicantsCount,
  getRequesterTaskProvider,
} from "../requester/orders/requesterTaskOrderHelpers";

// ─── Local types ─────────────────────────────────────────────────────────────

type TaskTab = "requested" | "provided";

interface Task {
  id: string;
  name: string;
  type: "Follow" | "No-Follow";
  status: "In Progress" | "Completed" | "Pending";
  provider: string;
  created: string;
  targetUrl: string;
  anchorText: string;
  creditCost: number;
  applicantsCount: number;
}

// ─── Style maps ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Task["status"], string> = {
  "In Progress": "bg-[#EFF8FF] text-[#175CD3]",
  Completed: "bg-[#ECFDF3] text-[#027A48]",
  Pending: "bg-[#FFF6ED] text-[#B54708]",
};

const TYPE_STYLES: Record<Task["type"], string> = {
  Follow: "bg-[#EFF8FF] text-[#175CD3]",
  "No-Follow": "bg-[#f2f4f7] text-[#535862]",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getTaskStatus(task: RequesterTask): Task["status"] {
  if (task.lifecycleStatus === "COMPLETED" || task.completedAt) {
    return "Completed";
  }
  if (
    task.lifecycleStatus === RequesterTaskLifecycleStatus.OPEN ||
    task.lifecycleStatus === RequesterTaskLifecycleStatus.WAITING_FOR_APPLICANTS
  ) {
    return "Pending";
  }
  return "In Progress";
}

function getTaskType(task: RequesterTask): Task["type"] {
  return task.linkAttribute === RequesterTaskLinkAttribute.NOFOLLOW
    ? "No-Follow"
    : "Follow";
}

function mapRequesterTask(task: RequesterTask): Task {
  return {
    id: task.id,
    name: task.projectTitle,
    type: getTaskType(task),
    status: getTaskStatus(task),
    provider: getRequesterTaskProvider(task)?.name ?? "Unassigned",
    created: getDisplayDate(task.createdAt),
    targetUrl: task.targetUrl,
    anchorText: task.anchorText,
    creditCost:
      task.finalCreditCost ?? task.creditCost ?? task.reservedCreditAmount ?? 0,
    applicantsCount: getRequesterTaskApplicantsCount(task),
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  website: Website | null;
  apiWebsite: ApiWebsite | null;
  open: boolean;
  onClose: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function WebsiteWorkspaceModal({
  website,
  apiWebsite,
  open,
  onClose,
}: Props) {
  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TaskTab>("requested");
  const [search, setSearch] = useState("");
  const [viewTask, setViewTask] = useState<TaskDetail | null>(null);
  const [viewTaskOpen, setViewTaskOpen] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  // Credit form state
  const [allocateAmount, setAllocateAmount] = useState("");
  const [allocateNote, setAllocateNote] = useState("");
  const [visibilityAmount, setVisibilityAmount] = useState("");
  const [visibilityNote, setVisibilityNote] = useState("");
  const [showAllocateForm, setShowAllocateForm] = useState(false);
  const [showVisibilityForm, setShowVisibilityForm] = useState(false);

  // Feedback
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // ── Derived values ──────────────────────────────────────────────────────
  const isVerified = apiWebsite?.verificationStatus === "VERIFIED";
  const websiteId = website?.id ?? "";

  // ── RTK Query hooks ─────────────────────────────────────────────────────
  const { data: tasksResponse, isLoading: isTasksLoading } =
    useGetRequesterTasksQuery({ page: 1, limit: 100 }, { skip: !open });

  const { data: creditSummary, isLoading: isCreditLoading } =
    useGetWebsiteCreditSummaryQuery(websiteId, {
      skip: !open || !isVerified || !websiteId,
    });

  const { data: masterCredits } = useGetCreditsMeQuery(undefined, {
    skip: !open || !isVerified,
  });

  const [allocatePurchasedCredits, { isLoading: isAllocating }] =
    useAllocatePurchasedCreditsMutation();

  const [buyVisibilityCredits, { isLoading: isBuyingVisibility }] =
    useBuyVisibilityCreditsMutation();

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!website) return null;

  // ── Task data ────────────────────────────────────────────────────────────
  const requestedTasks =
    tasksResponse?.data?.items
      ?.filter((task) => task.requesterWebsiteId === website.id)
      .map(mapRequesterTask) ?? [];

  const tasks = activeTab === "requested" ? requestedTasks : [];

  const filtered = tasks.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.provider.toLowerCase().includes(search.toLowerCase()),
  );

  const balances = creditSummary?.balances;
  const meta = creditSummary?.meta;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setActiveTab("requested");
      setSearch("");
      setShowCredits(false);
      setShowAllocateForm(false);
      setShowVisibilityForm(false);
      setAllocateAmount("");
      setAllocateNote("");
      setVisibilityAmount("");
      setVisibilityNote("");
      setActionMessage("");
      setActionError("");
    }, 200);
  };

  const openViewTask = async (task: Task) => {
    setViewTask({
      id: task.id,
      name: task.name,
      type: task.type,
      status: task.status,
      provider: task.provider,
      created: task.created,
      domain: website.domain,
      targetUrl: task.targetUrl,
      anchorText: task.anchorText,
      creditCost: task.creditCost,
      applicantsCount: task.applicantsCount,
    });
    setViewTaskOpen(true);
  };

  const handleAllocateCredits = async () => {
    const amount = Number(allocateAmount);
    if (!amount || amount <= 0) {
      setActionError("Please enter a valid amount.");
      return;
    }
    if (amount > (masterCredits?.purchasedTaskCredits ?? 0)) {
      setActionError("Insufficient purchased credits available.");
      return;
    }
    setActionError("");
    setActionMessage("");
    try {
      const res = await allocatePurchasedCredits({
        websiteId,
        amount,
        note: allocateNote.trim() || undefined,
      }).unwrap();
      setActionMessage(
        `Successfully allocated ${res.allocatedAmount} credits. Master balance: ${res.masterPurchasedTaskCredits}`,
      );
      setShowAllocateForm(false);
      setAllocateAmount("");
      setAllocateNote("");
    } catch (err) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String((err.data as Record<string, unknown>).message)
          : "Failed to allocate credits.";
      setActionError(message);
    }
  };

  const handleBuyVisibility = async () => {
    const amount = Number(visibilityAmount);
    if (!amount || amount <= 0) {
      setActionError("Please enter a valid amount.");
      return;
    }
    setActionError("");
    setActionMessage("");
    try {
      const res = await buyVisibilityCredits({
        websiteId,
        amount,
        note: visibilityNote.trim() || undefined,
      }).unwrap();
      if (res.data?.url) {
        window.open(res.data.url, "_blank");
        setActionMessage("Redirecting to Stripe checkout...");
      }
      setShowVisibilityForm(false);
      setVisibilityAmount("");
      setVisibilityNote("");
    } catch (err) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String((err.data as Record<string, unknown>).message)
          : "Failed to buy visibility credits.";
      setActionError(message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <ViewTaskModal
        task={viewTask}
        open={viewTaskOpen}
        onClose={() => {
          setViewTaskOpen(false);
          setViewTask(null);
        }}
      />

      <ModalShell
        open={open && !viewTaskOpen}
        onClose={handleClose}
        widthClass="max-w-5xl"
      >
        <div className="flex flex-col max-h-[90vh]">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-4 flex items-start gap-4 pr-14">
            <div className="w-12 h-12 rounded-xl bg-[#181d27] flex items-center justify-center text-white font-bold text-lg shrink-0">
              {website.domain[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[#181d27]">
                {website.domain}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-semibold bg-[#ECFDF3] text-[#027A48] px-2.5 py-0.5 rounded-full border border-[#6CE9A6]">
                  {website.status}
                </span>
                <span className="text-sm text-[#535862] font-medium">
                  DR {website.dr}
                </span>
              </div>
            </div>
            {isVerified && (
              <button
                onClick={() => setShowCredits((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  showCredits
                    ? "bg-[#FFF4ED] border-secondary text-secondary"
                    : "bg-white border-[#e9eaeb] text-[#535862] hover:border-secondary hover:text-secondary"
                }`}
              >
                <Coins className="w-4 h-4" />
                CREDITS
              </button>
            )}
          </div>

          {/* ── Meta strip ──────────────────────────────────────────────── */}
          <div className="mx-6 bg-[#f9fafb] rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-[#9DA4AE] font-medium">
              Website Workspace
            </p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[#181d27]">
                Connected since {website.connectedSince}
              </p>
              <span className="text-xs font-semibold bg-white border border-[#e9eaeb] text-[#535862] px-2.5 py-0.5 rounded-full">
                {website.category}
              </span>
            </div>
          </div>

          {/* ── Credit section (verified only) ──────────────────────────── */}
          {isVerified && showCredits && (
            <WebsiteCreditSection
              actionMessage={actionMessage}
              actionError={actionError}
              setActionMessage={setActionMessage}
              setActionError={setActionError}
              isCreditLoading={isCreditLoading}
              isAllocating={isAllocating}
              isBuyingVisibility={isBuyingVisibility}
              balances={balances}
              meta={meta}
              masterCredits={masterCredits}
              allocateAmount={allocateAmount}
              setAllocateAmount={setAllocateAmount}
              allocateNote={allocateNote}
              setAllocateNote={setAllocateNote}
              visibilityAmount={visibilityAmount}
              setVisibilityAmount={setVisibilityAmount}
              visibilityNote={visibilityNote}
              setVisibilityNote={setVisibilityNote}
              showAllocateForm={showAllocateForm}
              setShowAllocateForm={setShowAllocateForm}
              showVisibilityForm={showVisibilityForm}
              setShowVisibilityForm={setShowVisibilityForm}
              handleAllocateCredits={handleAllocateCredits}
              handleBuyVisibility={handleBuyVisibility}
            />
          )}

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="mx-6 flex rounded-full bg-[#f2f4f7] p-1 mb-4">
            <button
              onClick={() => setActiveTab("requested")}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === "requested"
                  ? "bg-secondary text-white shadow-sm"
                  : "text-[#535862] hover:text-[#181d27]"
              }`}
            >
              Requested Tasks
            </button>
            <button
              onClick={() => setActiveTab("provided")}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === "provided"
                  ? "bg-secondary text-white shadow-sm"
                  : "text-[#535862] hover:text-[#181d27]"
              }`}
            >
              Provided Tasks
            </button>
          </div>

          {/* ── Search ──────────────────────────────────────────────────── */}
          <div className="mx-6 mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9DA4AE]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-[#e2e2e2] rounded-full text-sm text-[#535862] focus:outline-none focus:border-secondary placeholder:text-[#9DA4AE] bg-white"
            />
          </div>

          {/* ── Task table ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto mx-6 border border-[#e9eaeb] rounded-xl bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e9eaeb] bg-[#f9fafb]">
                  {["Task Name", "Type", "Status", "Provider", "Created", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#535862]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9eaeb]">
                {isTasksLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm text-[#9DA4AE]"
                    >
                      Loading tasks...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-[#fafafa] transition-colors"
                    >
                      <td className="px-4 py-4 text-sm text-[#181d27] font-medium">
                        {task.name}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[task.type]}`}
                        >
                          {task.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[task.status]}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#535862]">
                        {task.provider}
                      </td>
                      <td className="px-4 py-4 text-sm text-[#535862]">
                        {task.created}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => openViewTask(task)}
                          className="bg-secondary hover:bg-[#d94118] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          View Task
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm text-[#9DA4AE]"
                    >
                      No tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
