"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  Link2,
  MessageSquare,
} from "lucide-react";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import {
  useGetRequesterTaskQuery,
  useGetRequesterTaskTimelineQuery,
} from "@/redux/features/api/requesterTask/requesterTaskApi";
import {
  getRequesterTaskApplicantsCount,
  getRequesterTaskProvider,
} from "../../requester/orders/requesterTaskOrderHelpers";
import type {
  RequesterTask,
  RequesterTaskLifecycleStatus,
  RequesterTaskTimelineEvent,
} from "@/types/requesterTask/requesterTaskTypes";
import WebsiteViewTaskTabContent from "./tabs/WebsiteViewTaskTabContent";
import { getApiErrorMessage, normalizeTimeline } from "../../provider/providerTaskHelpers";

export type TaskStatus =
  | "Assigned"
  | "Completed"
  | "In Progress"
  | "Pending"
  | "Revision Requested"
  | "Submitted";

export interface TaskDetail {
  id: string;
  name: string;
  type: "Follow" | "No-Follow";
  status: TaskStatus;
  provider: string;
  created: string;
  domain: string;
  targetUrl: string;
  anchorText: string;
  creditCost: number;
  applicantsCount: number;
}

type Tab = "overview" | "content" | "messages" | "audit";

type Props = {
  task: TaskDetail | null;
  open: boolean;
  onClose: () => void;
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  Assigned: "bg-[#EFF8FF] text-[#175CD3]",
  Completed: "bg-[#ECFDF3] text-[#027A48]",
  "In Progress": "bg-[#FFF4ED] text-[#B54708]",
  Pending: "bg-[#FFF6ED] text-[#B54708]",
  "Revision Requested": "bg-[#FEF3F2] text-[#B42318]",
  Submitted: "bg-[#F4F3FF] text-[#6941C6]",
};

export interface WebsiteTaskViewModel {
  id: string;
  title: string;
  type: "Follow" | "No-Follow";
  status: TaskStatus;
  provider: string;
  created: string;
  domain: string;
  targetUrl: string;
  anchorText: string;
  creditCost: number;
  applicantsCount: number;
  placementType: string;
  linkAttribute: string;
  requestedDeadline: string;
  requiredDomainRating: number | null;
  requesterName: string;
  placementGuidelines: string;
  liveLinkUrl: string;
  proofUrl: string;
  deliveryMessage: string;
  providerNote: string;
  files: RequesterTask["files"];
  updatedAt: string;
}


function formatDate(value?: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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
    return value;
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function getHostname(value?: string | null): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function formatPlacementType(value?: RequesterTask["placementType"]): string {
  switch (value) {
    case "BACKLINK_INSERTION":
      return "Backlink Insertion";
    case "GUEST_POST":
      return "Guest Post";
    case "FLEXIBLE":
      return "Flexible";
    default:
      return "Not available";
  }
}

function formatLinkAttribute(
  value?: RequesterTask["linkAttribute"],
): string {
  switch (value) {
    case "DOFOLLOW":
      return "Do-Follow";
    case "NOFOLLOW":
      return "No-Follow";
    case "UGC":
      return "UGC";
    case "SPONSORED":
      return "Sponsored";
    default:
      return "Not available";
  }
}

function getTaskStatusLabel(
  status?: RequesterTaskLifecycleStatus | null,
  fallback: TaskStatus = "Pending",
): TaskStatus {
  switch (status) {
    case "ASSIGNED":
      return "Assigned";
    case "IN_PROGRESS":
      return "In Progress";
    case "SUBMITTED":
      return "Submitted";
    case "REVISION_REQUESTED":
      return "Revision Requested";
    case "APPROVED":
    case "COMPLETED":
      return "Completed";
    case "OPEN":
    case "WAITING_FOR_APPLICANTS":
    case "DRAFT":
    case "CANCELLED":
    case "EXPIRED":
    case "FROZEN":
    case "DISPUTED":
      return fallback;
    default:
      return fallback;
  }
}

function getTaskCreditCost(task?: RequesterTask | null): number {
  if (!task) return 0;

  return (
    task.finalCreditCost ??
    task.creditCost ??
    task.reservedCreditAmount ??
    task.providerRewardCredits ??
    0
  );
}

function buildViewModel(
  task: RequesterTask | null,
  fallback: TaskDetail | null,
): WebsiteTaskViewModel | null {
  if (!task && !fallback) {
    return null;
  }

  const providerName =
    getRequesterTaskProvider(task)?.name ?? fallback?.provider ?? "Unassigned";
  const applicantsCount = task
    ? getRequesterTaskApplicantsCount(task)
    : fallback?.applicantsCount ?? 0;

  return {
    id: task?.id ?? fallback!.id,
    title: task?.projectTitle ?? fallback!.name ?? "Task details",
    type:
      fallback?.type ??
      (task?.linkAttribute === "NOFOLLOW" ? "No-Follow" : "Follow"),
    status: task
      ? getTaskStatusLabel(task.lifecycleStatus, fallback?.status ?? "Pending")
      : fallback!.status,
    provider: providerName,
    created: task?.createdAt ? formatDate(task.createdAt) : fallback!.created,
    domain:
      fallback?.domain ??
      (task?.requesterWebsite?.websiteUrl
        ? getHostname(task.requesterWebsite.websiteUrl)
        : undefined) ??
      task?.targetUrl ??
      "Website task",
    targetUrl: task?.targetUrl ?? fallback!.targetUrl,
    anchorText: task?.anchorText ?? fallback!.anchorText,
    creditCost: task ? getTaskCreditCost(task) : fallback!.creditCost,
    applicantsCount,
    placementType: formatPlacementType(task?.placementType),
    linkAttribute: formatLinkAttribute(task?.linkAttribute),
    requestedDeadline: task?.deliveryDeadline
      ? formatDate(task.deliveryDeadline)
      : task?.requestedDeadlineDays
        ? `${task.requestedDeadlineDays} days`
        : "Flexible",
    requiredDomainRating: task?.requiredDomainRating ?? null,
    requesterName: task?.requester?.name ?? "Backlyst Admin",
    placementGuidelines: task?.placementGuidelines?.trim() || "",
    liveLinkUrl: task?.liveLinkUrl ?? "",
    proofUrl: task?.proofUrl ?? "",
    deliveryMessage: task?.deliveryMessage?.trim() || "",
    providerNote: task?.providerNote?.trim() || "",
    files: task?.files ?? [],
    updatedAt: formatDateTime(
      task?.updatedAt ?? task?.submittedAt ?? task?.createdAt,
    ),
  };
}



export default function ViewTaskModal({ task, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const taskId = task?.id ?? "";

  const {
    data: taskResponse,
    error: taskError,
    isFetching: isFetchingTask,
    isLoading: isLoadingTask,
  } = useGetRequesterTaskQuery(taskId, {
    skip: !open || !taskId,
  });

  const {
    data: timelineResponse,
    error: timelineError,
    isFetching: isFetchingTimeline,
    isLoading: isLoadingTimeline,
  } = useGetRequesterTaskTimelineQuery(taskId, {
    skip: !open || !taskId,
  });

  const apiTask = taskResponse?.data ?? null;
  const viewModel = useMemo(
    () => buildViewModel(apiTask, task),
    [apiTask, task],
  );
  const timeline = useMemo(
    () => normalizeTimeline(timelineResponse?.data, apiTask, task),
    [apiTask, task, timelineResponse],
  );

  useEffect(() => {
    if (taskError && open) {
      console.error(
        "Failed to load task details:",
        getApiErrorMessage(taskError),
      );
    }
  }, [taskError, open]);

  useEffect(() => {
    if (timelineError && open) {
      console.error(
        "Failed to load task timeline:",
        getApiErrorMessage(timelineError),
      );
    }
  }, [timelineError, open]);

  if (!task || !viewModel) return null;

  const isLoading = isLoadingTask || isFetchingTask;
  const isLoadingActivity = isLoadingTimeline || isFetchingTimeline;

  const handleClose = () => {
    onClose();
    window.setTimeout(() => setActiveTab("overview"), 200);
  };

  return (
    <ModalShell open={open} onClose={handleClose} widthClass="max-w-4xl">
      <div className="flex flex-col max-h-[90vh]">
        <div className="px-6 pt-5 pb-4 border-b border-[#e9eaeb] shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#181d27] flex items-center justify-center text-white font-bold text-base shrink-0">
                {viewModel.domain[0]?.toUpperCase() ?? "W"}
              </div>
              <div>
                <p className="text-sm font-bold text-[#181d27]">
                  {viewModel.domain}
                </p>
                <p className="text-xs text-[#9DA4AE]">Website Task Workspace</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className="text-sm font-semibold text-[#181d27]">
                {viewModel.title}
              </p>
              <span className="text-[10px] font-bold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF] px-3 py-0.5 rounded-full">
                {viewModel.type}
              </span>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_BADGE[viewModel.status]}`}
            >
              {viewModel.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-2 mt-4 text-sm">
            <MetaRow label="Task ID" value={viewModel.id} />
            <MetaRow label="Provider Name" value={viewModel.provider} />
            <MetaRow label="Created Date" value={viewModel.created} />
            <MetaRow label="Placement Type" value={viewModel.placementType} />
            <MetaRow label="Applicants" value={String(viewModel.applicantsCount)} />
            <MetaRow label="Credit Cost" value={`${viewModel.creditCost} CR`} />
            <MetaRow label="Link Attribute" value={viewModel.linkAttribute} />
            <MetaRow label="Current Stage" value={viewModel.status} bold green />
          </div>

          {isLoading && (
            <p className="mt-3 text-xs text-[#9DA4AE]">
              Loading live task details...
            </p>
          )}
        </div>

        <div className="flex border-b border-[#e9eaeb] shrink-0 px-6">
          {(
            [
              { id: "overview", label: "Task Overview" },
              { id: "content", label: "Content & Requirements" },
              { id: "messages", label: "Activity & Messages" },
              { id: "audit", label: "Audit Trail" },
            ] as { id: Tab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 cursor-pointer py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-b-secondary text-secondary"
                  : "border-transparent text-[#535862] hover:text-[#181d27]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-80 max-h-80">
          {activeTab === "overview" && <TabOverview task={viewModel} />}
          {activeTab === "content" && (
            <WebsiteViewTaskTabContent task={viewModel} />
          )}
          {activeTab === "messages" && (
            <TabMessages task={viewModel} timeline={timeline} />
          )}
          {activeTab === "audit" && (
            <TabAudit
              task={viewModel}
              timeline={timeline}
              isLoading={isLoadingActivity}
            />
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-[#e9eaeb] flex items-center justify-between">
          <p className="text-xs text-[#9DA4AE]">
            This task belongs to the selected website and keeps a live activity
            history.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="border border-[#e9eaeb] text-[#535862] font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Website
            </button>
            <button className="bg-secondary hover:bg-[#d94118] text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              Mark as Review
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function TabOverview({ task }: { task: WebsiteTaskViewModel }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard
          label="Status"
          value={task.status}
          description={`Assigned provider: ${task.provider}`}
        />
        <InfoCard
          label="Deadline"
          value={task.requestedDeadline}
          description={`Created on ${task.created}`}
        />
        <InfoCard
          label="Credit Cost"
          value={`${task.creditCost} CR`}
          description={`${task.applicantsCount} applicant${task.applicantsCount === 1 ? "" : "s"} tracked`}
        />
      </div>

      <div className="border border-[#e9eaeb] rounded-xl p-5 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-[#535862]" />
          <p className="text-sm font-bold text-[#181d27]">
            Placement Snapshot
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ValueCard label="Target URL" value={task.targetUrl} />
          <ValueCard label="Anchor Text" value={task.anchorText} />
          <ValueCard label="Placement Type" value={task.placementType} />
          <ValueCard label="Link Attribute" value={task.linkAttribute} />
          <ValueCard
            label="Required DR"
            value={
              typeof task.requiredDomainRating === "number"
                ? `DR ${task.requiredDomainRating}+`
                : "Not specified"
            }
          />
          <ValueCard label="Requester" value={task.requesterName} />
        </div>
      </div>

      <div className="rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          <div>
            <p className="text-sm font-semibold text-secondary">
              Live task context loaded from the requester API
            </p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">
              The modal updates with the latest provider, deadline, and timeline
              data whenever the task endpoint returns fresh values.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabMessages({
  task,
  timeline,
}: {
  task: WebsiteTaskViewModel;
  timeline: RequesterTaskTimelineEvent[];
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#e9eaeb] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-[#535862]" />
          <p className="text-sm font-bold text-[#181d27]">Conversation Snapshot</p>
        </div>
        <div className="space-y-3">
          <MessageBlock
            title="Requester Brief"
            text={
              task.placementGuidelines ||
              "The requester has not added any additional brief yet."
            }
          />
          <MessageBlock
            title="Provider Update"
            text={
              task.deliveryMessage ||
              task.providerNote ||
              "No provider updates have been submitted yet."
            }
          />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
          Activity Feed
        </p>
        <div className="space-y-4">
          {timeline.length > 0 ? (
            timeline.map((event, index) => (
              <TimelineItem
                key={event.id ?? `${event.label ?? "event"}-${index}`}
                event={event}
                providerName={task.provider}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[#e9eaeb] bg-[#f9fafb] px-4 py-10 text-center text-sm text-[#9DA4AE]">
              No activity has been recorded for this task yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TabAudit({
  task,
  timeline,
  isLoading,
}: {
  task: WebsiteTaskViewModel;
  timeline: RequesterTaskTimelineEvent[];
  isLoading: boolean;
}) {
  const rows = useMemo(
    () =>
      timeline.length > 0
        ? timeline.map((event, index) => ({
            timestamp: formatDateTime(event.createdAt),
            action:
              event.label ||
              event.eventType?.replaceAll("_", " ") ||
              event.status ||
              "Activity updated",
            actor: getAuditActor(event, task, index),
            details: event.description || event.note || "No extra details.",
            severity: event.status?.toLowerCase().includes("fail")
              ? "Error"
              : event.status?.toLowerCase().includes("warn")
                ? "Warning"
                : "Info",
          }))
        : [
            {
              timestamp: task.created,
              action: "Task Snapshot",
              actor: task.requesterName,
              details:
                "The modal is showing the latest task snapshot from the requester API.",
              severity: "Info",
            },
          ],
    [task, timeline],
  );

  return (
    <div className="space-y-3">
      {isLoading && (
        <p className="text-xs text-[#9DA4AE]">Loading timeline events...</p>
      )}

      <div className="overflow-hidden rounded-xl border border-[#e9eaeb] bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#e9eaeb]">
              {["Timestamp", "Action", "Actor", "Details", "Severity"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#535862]"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9eaeb]">
            {rows.map((row) => (
              <tr key={`${row.action}-${row.timestamp}`} className="hover:bg-[#fafafa] transition-colors">
                <td className="px-4 py-3 text-xs text-[#535862] font-mono">
                  {row.timestamp}
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-[#181d27]">
                  {row.action}
                </td>
                <td className="px-4 py-3 text-xs text-[#535862]">{row.actor}</td>
                <td className="px-4 py-3 text-xs text-[#535862]">{row.details}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getSeverityBadge(row.severity)}`}
                  >
                    {row.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  bold,
  green,
}: {
  label: string;
  value: string;
  bold?: boolean;
  green?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[#9DA4AE]">{label}</span>
      <span
        className={`text-xs text-right ${
          bold ? "font-bold text-[#181d27]" : green ? "font-bold text-[#027A48]" : "text-[#535862]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function InfoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#e9eaeb] bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#535862]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#181d27]">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#9DA4AE]">{description}</p>
    </div>
  );
}

function ValueCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e9eaeb] bg-[#f9fafb] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9DA4AE]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#181d27] break-words">
        {value}
      </p>
    </div>
  );
}

function MessageBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[#e9eaeb] bg-[#f9fafb] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#535862]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#535862]">{text}</p>
    </div>
  );
}

function TimelineItem({
  event,
  providerName,
}: {
  event: RequesterTaskTimelineEvent;
  providerName: string;
}) {
  const isProviderEvent =
    /assign|submit|provider/i.test(
      `${event.label ?? ""} ${event.eventType ?? ""} ${event.status ?? ""}`,
    ) || !!event.note;

  return (
    <div className="flex items-start gap-4 rounded-xl border border-[#e9eaeb] bg-white p-4">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isProviderEvent ? "bg-[#EFF8FF]" : "bg-[#FFF4ED]"
        }`}
      >
        <Clock
          className={`w-5 h-5 ${
            isProviderEvent ? "text-[#175CD3]" : "text-secondary"
          }`}
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#181d27]">
            {event.label ||
              event.eventType?.replaceAll("_", " ") ||
              event.status ||
              "Activity updated"}
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#9DA4AE]">
            {formatDateTime(event.createdAt)}
          </span>
        </div>
        {event.description && (
          <p className="mt-1 text-sm leading-relaxed text-[#535862]">
            {event.description}
          </p>
        )}
        {event.note && (
          <p className="mt-1 text-sm leading-relaxed text-[#535862]">
            {event.note}
          </p>
        )}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#9DA4AE]">
          {isProviderEvent ? providerName : "System"}
        </p>
      </div>
    </div>
  );
}

function getAuditActor(
  event: RequesterTaskTimelineEvent,
  task: WebsiteTaskViewModel,
  index: number,
): string {
  const label = `${event.label ?? ""} ${event.eventType ?? ""}`.toLowerCase();

  if (label.includes("created")) return task.requesterName;
  if (label.includes("assigned")) return task.provider;
  if (label.includes("submitted") || label.includes("revision")) {
    return task.provider;
  }
  if (event.note) return task.provider;
  return index === 0 ? task.requesterName : "System";
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case "Error":
      return "bg-[#FEF3F2] text-[#B42318]";
    case "Warning":
      return "bg-[#FFF6ED] text-[#B54708]";
    default:
      return "bg-[#EFF8FF] text-[#175CD3]";
  }
}
