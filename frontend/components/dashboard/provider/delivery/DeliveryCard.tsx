"use client";

import { useState } from "react";
import { Clock, Eye, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/ui/common/StatusBadge";
import ProviderTaskOverviewModal from "./modals/ProviderTaskOverviewModal";
import {
  formatCredits,
  formatDueDate,
  formatDomain,
} from "@/components/dashboard/provider/providerTaskHelpers";
import type { ProviderTask } from "@/types/providerTask/providerTaskTypes";

export type DeliveryItem = {
  title: string;
  requester: string;
  reward: string;
  timeLeft: string;
  status:
    | "AVAILABLE TO APPLY"
    | "APPLIED"
    | "SUBMITTED"
    | "IN PROGRESS"
    | "COMPLETED";
  image?: string | null;
};

type Props = {
  task: ProviderTask;
};

export default function DeliveryCard({ task }: Props) {
  const [open, setOpen] = useState(false);
  const imageSrc = task.requesterWebsite?.websiteUrl || task.targetUrl;
  const placeholder = task.projectTitle.trim().charAt(0).toUpperCase() || "D";

  return (
    <>
      <div className="rounded-xl border border-[#e9eaeb] bg-white p-5 transition-shadow hover:shadow-sm">
        <div
          className="grid items-center"
          style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1.5fr 1fr" }}
        >
          <div className="flex items-center gap-4 px-6">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {imageSrc ? (
                <div className="flex h-full w-full items-center justify-center bg-[#f3f4f6] text-[10px] font-semibold uppercase tracking-wide text-[#98a2b3]">
                  {formatDomain(imageSrc).slice(0, 2)}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#f3f4f6] text-sm font-semibold text-[#98a2b3]">
                  {placeholder}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <p className="font-medium text-[#181d27]">{task.projectTitle}</p>
              <p className="mt-0.5 text-sm text-[#535862]">
                {task.requesterWebsite?.name ||
                  task.requester?.name ||
                  formatDomain(task.targetUrl)}
              </p>
            </div>
          </div>

          <div className="px-6 text-center">
            <p className="w-full rounded bg-[#ECFDF3] font-semibold text-[#027A48]">
              {formatCredits(task)}
            </p>
            <p className="text-sm text-[#535862]">REWARD</p>
          </div>

          <div className="px-6 text-center text-sm">
            <div className="flex items-center justify-center gap-1 pb-1 text-[#535862]">
              <Clock className="h-6 w-6" />
              <p className="font-medium text-[#181d27]">{formatDueDate(task)}</p>
            </div>
            DUE DATE
          </div>

          <div className="flex items-center justify-center px-6">
            <StatusBadge status={task.lifecycleStatus} />
          </div>

          <div className="flex items-center justify-center gap-4 px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="cursor-pointer text-[#2AB516] hover:text-[#2fe912]"
            >
              <Eye className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="cursor-pointer text-[#9E77ED] hover:text-primary"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <ProviderTaskOverviewModal
        open={open}
        onClose={() => setOpen(false)}
        task={task}
      />
    </>
  );
}
