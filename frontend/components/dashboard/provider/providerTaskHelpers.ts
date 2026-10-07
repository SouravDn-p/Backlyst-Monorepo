"use client";

import { RequesterTask, RequesterTaskTimelineEvent } from "@/types/requesterTask/requesterTaskTypes";
import { getRequesterTaskProvider } from "../requester/orders/requesterTaskOrderHelpers";
import type { DeliveryItem } from "./delivery/DeliveryCard";
import type { ProviderTask } from "@/types/providerTask/providerTaskTypes";
import { TaskDetail } from "../website/view/Viewtaskmodal";

export function getApiErrorMessage(error: unknown): string {
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

export function formatPlacementType(value?: string | null): string {
  if (!value) return "Flexible";

  return value
    .split("_")
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatLifecycleStatus(value?: string | null): string {
  if (!value) return "Unknown";

  return value
    .split("_")
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatLinkAttribute(value?: string | null): string {
  if (!value) return "Dofollow";

  return value
    .split("_")
    .map((part) => `${part.charAt(0)}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatDate(value?: string | null): string {
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

export function formatDomain(value?: string | null): string {
  if (!value) return "Not provided";

  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
}

export function getDueDate(task: ProviderTask): Date | null {
  if (task.deliveryDeadline) {
    const deliveryDate = new Date(task.deliveryDeadline);

    if (!Number.isNaN(deliveryDate.getTime())) {
      return deliveryDate;
    }
  }

  if (!task.createdAt || !task.requestedDeadlineDays) {
    return null;
  }

  const createdAt = new Date(task.createdAt);

  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  const dueDate = new Date(createdAt);
  dueDate.setDate(dueDate.getDate() + task.requestedDeadlineDays);

  return dueDate;
}

export function formatDueDate(task: ProviderTask): string {
  const dueDate = getDueDate(task);

  if (!dueDate) {
    return task.requestedDeadlineDays
      ? `${task.requestedDeadlineDays} day window`
      : "Flexible deadline";
  }

  return dueDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getTimeLeft(task: ProviderTask): string {
  const dueDate = getDueDate(task);

  if (!dueDate) {
    return task.requestedDeadlineDays
      ? `${task.requestedDeadlineDays} days`
      : "Flexible";
  }

  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();

  if (diff <= 0) {
    return "Closed";
  }

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return `${days} day${days === 1 ? "" : "s"}`;
}

export function formatCredits(
  task: ProviderTask,
  fallback = "Escrow Protected",
): string {
  const credits =
    task.providerRewardCredits ??
    task.finalCreditCost ??
    task.creditCost ??
    task.reservedCreditAmount ??
    task.rewardCredits ??
    task.estimatedCredits;

  if (typeof credits !== "number" || Number.isNaN(credits)) {
    return fallback;
  }

  return `${credits.toFixed(2)} CR`;
}

export function getProviderTaskLifecycleStyle(
  status?: string | null,
): { bg: string; text: string; border?: string } {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "completed") {
    return { bg: "#dcfce7", text: "#16a34a" };
  }

  if (
    normalizedStatus === "available_to_apply" ||
    normalizedStatus === "open"
  ) {
    return { bg: "#fef9c3", text: "#ca8a04" };
  }

  if (normalizedStatus === "submitted") {
    return { bg: "#fee2e2", text: "#dc2626" };
  }

  if (normalizedStatus === "applied") {
    return { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
  }

  if (normalizedStatus === "in_progress") {
    return { bg: "#dbeafe", text: "#1d4ed8" };
  }

  if (normalizedStatus === "assigned") {
    return { bg: "#ede9fe", text: "#7c3aed" };
  }

  if (normalizedStatus === "revision_requested") {
    return { bg: "#ffedd5", text: "#ea580c" };
  }

  if (normalizedStatus === "approved") {
    return { bg: "#d1fae5", text: "#059669" };
  }

  if (normalizedStatus === "cancelled") {
    return { bg: "#f3f4f6", text: "#6b7280" };
  }

  if (normalizedStatus === "expired") {
    return { bg: "#fce7f3", text: "#be185d" };
  }

  if (normalizedStatus === "frozen") {
    return { bg: "#e0f2fe", text: "#0369a1" };
  }

  if (normalizedStatus === "disputed") {
    return { bg: "#fef3c7", text: "#b45309" };
  }

  return { bg: "#f3f4f6", text: "#374151" };
}

export function getDomainRatingStyle(
  domainRating: number,
): { bg: string; text: string } {
  if (domainRating >= 80) return { bg: "#dcfce7", text: "#15803d" };
  if (domainRating >= 60) return { bg: "#d1fae5", text: "#065f46" };
  if (domainRating >= 40) return { bg: "#fef9c3", text: "#a16207" };
  return { bg: "#fee2e2", text: "#b91c1c" };
}

export function mapProviderTaskToDeliveryItem(task: ProviderTask): DeliveryItem {
  const lifecycleStatus = task.lifecycleStatus;

  let status: DeliveryItem["status"] = "APPLIED";

  if (
    lifecycleStatus === "OPEN" ||
    lifecycleStatus === "WAITING_FOR_APPLICANTS"
  ) {
    status = "AVAILABLE TO APPLY";
  } else if (lifecycleStatus === "IN_PROGRESS" || lifecycleStatus === "ASSIGNED") {
    status = "IN PROGRESS";
  } else if (lifecycleStatus === "SUBMITTED" || lifecycleStatus === "APPROVED") {
    status = "SUBMITTED";
  } else if (lifecycleStatus === "COMPLETED") {
    status = "COMPLETED";
  }

  return {
    title: task.projectTitle,
    requester:
      task.requesterWebsite?.name ||
      task.requester?.name ||
      formatDomain(task.targetUrl),
    reward: formatCredits(task, "Protected"),
    timeLeft: getTimeLeft(task),
    status,
    image: null,
  };
}


export function normalizeTimeline(
  responseData:
    | RequesterTaskTimelineEvent[]
    | { data: RequesterTaskTimelineEvent[] }
    | undefined,
  task: RequesterTask | null,
  snapshot: TaskDetail | null,
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

  if (task?.taskFlows?.length) {
    return task.taskFlows;
  }

  if (task?.timeline?.length) {
    return task.timeline;
  }

  const fallback: RequesterTaskTimelineEvent[] = [
    {
      id: "created",
      label: "Task Created",
      createdAt: task?.createdAt ?? snapshot?.created,
      description: "The task was opened from the website workspace.",
    },
  ];

  const providerName =
    getRequesterTaskProvider(task)?.name ?? snapshot?.provider ?? "Provider";

  if (task?.selectedProvider || task?.provider || task?.selectedProviderId) {
    fallback.push({
      id: "assigned",
      label: "Provider Assigned",
      createdAt: task?.assignedAt ?? task?.updatedAt ?? task?.createdAt,
      description: `${providerName} is attached to this task.`,
    });
  }

  if (task?.submittedAt || task?.deliveryMessage) {
    fallback.push({
      id: "submitted",
      label: "Submission Updated",
      createdAt: task?.submittedAt ?? task?.updatedAt,
      description:
        task?.deliveryMessage?.trim() ||
        "The provider submitted an update for this task.",
    });
  }

  if (task?.providerNote) {
    fallback.push({
      id: "provider-note",
      label: "Provider Note",
      createdAt: task?.updatedAt ?? task?.createdAt,
      description: task.providerNote,
    });
  }

  if (task?.completedAt) {
    fallback.push({
      id: "completed",
      label: "Task Completed",
      createdAt: task.completedAt,
      description: "The task moved into its final completed state.",
    });
  }

  return fallback;
}