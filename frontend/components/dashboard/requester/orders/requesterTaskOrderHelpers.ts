import type { OrderItem } from "./OrderCard";
import {
  RequesterTaskLifecycleStatus,
  type RequesterTask,
} from "@/types/requesterTask/requesterTaskTypes";

export function formatTaskReference(taskId: string): string {
  return `#${taskId.slice(0, 8).toUpperCase()}`;
}

export function getRequesterTaskApplicantsCount(task?: RequesterTask | null): number {
  if (!task) return 0;

  return (
    task._count?.placementApplications ??
    task.placementApplications?.length ??
    task.applicationsCount ??
    0
  );
}

export function getRequesterTaskProvider(
  task?: RequesterTask | null,
): { id: string; name: string; avatar?: string | null } | null {
  if (!task) return null;

  const providerUser = task.selectedProvider ?? task.provider ?? null;

  return providerUser
    ? {
        id: providerUser.id,
        name: providerUser.name,
        avatar: providerUser.imageUrl ?? null,
      }
    : null;
}

export function getOrderStatusLabel(
  lifecycleStatus: RequesterTaskLifecycleStatus,
  applicationsCount = 0,
): string {
  switch (lifecycleStatus) {
    case RequesterTaskLifecycleStatus.OPEN:
      return applicationsCount > 0 ? "WAITING FOR APPLICANTS" : "OPEN";
    case RequesterTaskLifecycleStatus.WAITING_FOR_APPLICANTS:
      return "WAITING FOR APPLICANTS";
    case RequesterTaskLifecycleStatus.IN_PROGRESS:
      return "In Progress";
    case RequesterTaskLifecycleStatus.ASSIGNED:
      return "Assigned";
    case RequesterTaskLifecycleStatus.SUBMITTED:
      return "Submitted";
    case RequesterTaskLifecycleStatus.REVISION_REQUESTED:
      return "Revision Requested";
    case RequesterTaskLifecycleStatus.APPROVED:
    case RequesterTaskLifecycleStatus.COMPLETED:
      return "Completed";
    case RequesterTaskLifecycleStatus.DRAFT:
      return "Draft";
    case RequesterTaskLifecycleStatus.CANCELLED:
      return "Cancelled";
    case RequesterTaskLifecycleStatus.EXPIRED:
      return "Expired";
    case RequesterTaskLifecycleStatus.FROZEN:
      return "Frozen";
    case RequesterTaskLifecycleStatus.DISPUTED:
      return "Disputed";
    default:
      return String(lifecycleStatus).replaceAll("_", " ");
  }
}

export function mapRequesterTaskToOrderItem(task: RequesterTask): OrderItem {
  const applicantsCount = getRequesterTaskApplicantsCount(task);
  const provider = getRequesterTaskProvider(task);

  return {
    taskId: task.id,
    id: formatTaskReference(task.id),
    name: task.projectTitle,
    status: getOrderStatusLabel(task.lifecycleStatus, applicantsCount),
    applicants: applicantsCount,
    provider,
    requester: provider,
    rawTask: task,
  };
}
