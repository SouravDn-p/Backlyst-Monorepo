import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  Clock,
  Globe,
  ShieldCheck,
} from "lucide-react";
import type {
  RequesterTask,
  RequesterTaskLifecycleStatus,
} from "@/types/requesterTask/requesterTaskTypes";

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

type Props = {
  task?: RequesterTask | null;
  workflowStatus?: RequesterTaskLifecycleStatus | null;
};

function getStageCopy(status?: RequesterTaskLifecycleStatus | null): {
  label: string;
  description: string;
} {
  switch (status) {
    case "IN_PROGRESS":
    case "ASSIGNED":
      return {
        label: "In Progress",
        description: "The provider is working on the task and has not submitted yet.",
      };
    case "SUBMITTED":
      return {
        label: "Submitted",
        description: "The provider has submitted work and it is ready for review.",
      };
    case "REVISION_REQUESTED":
      return {
        label: "Revision Requested",
        description:
          "A revision was requested, so the provider is preparing an updated submission.",
      };
    default:
      return {
        label: status?.replaceAll("_", " ") || "In Progress",
        description: "Task progress is being tracked here.",
      };
  }
}

export default function SummaryTab({ task, workflowStatus }: Props) {
  const lifecycleStatus = task?.lifecycleStatus
    ? task.lifecycleStatus.replaceAll("_", " ")
    : "In Progress";
  const stageCopy = getStageCopy(workflowStatus ?? task?.lifecycleStatus ?? null);
  const deadline =
    formatDate(task?.deliveryDeadline) !== "Not available"
      ? formatDate(task?.deliveryDeadline)
      : task?.requestedDeadlineDays
        ? `${task.requestedDeadlineDays} days`
        : "Flexible";
  const targetSite =
    task?.requesterWebsite?.websiteUrl || task?.targetUrl || "Not available";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-[#e9eaeb] rounded-xl p-4 space-y-1.5 bg-white hover:shadow-sm transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Status
          </p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-secondary" />
            <span className="font-semibold text-secondary">
              {lifecycleStatus}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#667085]">
            {stageCopy.description}
          </p>
        </div>

        <div className="border border-[#e9eaeb] rounded-xl p-4 space-y-1.5 bg-white hover:shadow-sm transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Deadline
          </p>
          <div className="flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-secondary" />
            <span className="font-semibold text-[#181d27]">{deadline}</span>
            {task?.deadlineExtensionCount && task.deadlineExtensionCount > 0 ? (
              <span className="ml-1 rounded-full bg-[#fffaeb] px-2 py-0.5 text-[10px] font-bold text-[#b54708] border border-[#fef0c7]">
                EXTENDED
              </span>
            ) : null}
          </div>
        </div>

        <div className="border border-[#e9eaeb] rounded-xl p-4 space-y-1.5 bg-white hover:shadow-sm transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Target Site
          </p>
          <div className="flex items-center gap-2">
            <Globe className="w-4.5 h-4.5 text-secondary" />
            <a
              href={task?.targetUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-secondary hover:underline"
            >
              {targetSite}
            </a>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-4">
          Placement Requirements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-t border-b border-[#e9eaeb]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-1.5">
              Anchor Text
            </p>
            <p className="text-sm font-medium text-[#181d27]">
              {task?.anchorText || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#535862] mb-1.5">
              Required DR
            </p>
            <p className="text-sm font-medium text-[#181d27]">
              {typeof task?.requiredDomainRating === "number"
                ? `DR ${task.requiredDomainRating}+`
                : "Not specified"}
            </p>
          </div>
        </div>
      </section>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3">
          Placement Guidelines
        </p>
        <p className="text-sm text-[#535862] leading-relaxed">
          {task?.placementGuidelines?.trim() ||
            "No extra placement guidelines were provided."}
        </p>
      </div>

      <div className="bg-accent rounded-xl p-2 lg:p-3 flex items-start justify-between lg:items-center gap-2.5 border-2 border-secondary">
        <section className="flex  gap-1">
          <div className="w-6 h-6 lg:w-8 lg:h-8  rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 lg:w-5 lg:h-5 text-secondary" />
          </div>
          <div>
            <p className="text-xs">Escrow Protection Active</p>
            <p className="text-xs  text-[#535862]">
              120.00 credit assured until final confirmation.
            </p>
          </div>
        </section>

        <Button variant="ghost" className="text-secondary tracking-wider">
          {" "}
          View Policy{" "}
        </Button>
      </div>
    </div>
  );
}
