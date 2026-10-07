"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, MessageSquare, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/common/StatusBadge";
import ProviderProfileModal from "@/components/dashboard/provider/profile/ProviderProfileModal";
import OrderInProgressModal from "./orderModals/OrderInProgressModal";
import OrderWaitingModal from "./orderModals/OrderWaitingModal";
import OrderCompletedModal from "./orderModals/OrderCompletedModal";
import ReviewAllApplications from "./orderModals/ReviewAllApplications";
import type { RequesterTask } from "@/types/requesterTask/requesterTaskTypes";

export type OrderItem = {
  taskId: string;
  name: string;
  id: string;
  status: string;
  applicants: number;
  rawTask?: RequesterTask;
  provider?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  requester?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
};

type Props = { order: OrderItem };

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "PR"
  );
}

export default function OrderCard({ order }: Props) {
  const [open, setOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const lifecycleStatus = order.rawTask?.lifecycleStatus;
  const hasApplicants = order.applicants > 0;
  const isOpenTask =
    lifecycleStatus === "OPEN" || lifecycleStatus === "WAITING_FOR_APPLICANTS";
  const isWorkTask =
    lifecycleStatus === "ASSIGNED" ||
    lifecycleStatus === "IN_PROGRESS" ||
    lifecycleStatus === "SUBMITTED" ||
    lifecycleStatus === "REVISION_REQUESTED";
  const isFinishedTask =
    lifecycleStatus === "APPROVED" || lifecycleStatus === "COMPLETED";
  const providerDisplay = order.provider || order.requester;

  return (
    <>
      <div
        className="grid items-center px-8 py-5 text-sm transition-colors hover:bg-[#fafafa]"
        style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1.5fr 1fr" }}
      >
        <div className="space-y-1">
          <p className="font-semibold text-[#181d27]">{order.name}</p>
          <p className="text-[#535862]">{order.id}</p>
        </div>

        <div className="flex justify-center">
          <StatusBadge status={order.status} />
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-[#f5f5f5] px-4 py-2">
            <Users className="h-4 w-4 text-[#535862]" />
            <span className="font-semibold text-[#181d27]">
              {order.applicants}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {providerDisplay ? (
            <>
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-3 text-left"
              >
                {providerDisplay.avatar ? (
                  <Image
                    src={providerDisplay.avatar}
                    alt={providerDisplay.name || "Provider"}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center  rounded-full bg-[#fd751f] text-xs font-bold text-white">
                    {getInitials(providerDisplay.name)}
                  </div>
                )}
                <span className=" font-semibold text-[#181d27] hover:text-[#fd751f]  transition-colors">
                  {providerDisplay.name}
                </span>
              </button>
            </>
          ) : (
            <span className="font-semibold text-[#b2b5b4]">NOT ASSIGNED</span>
          )}
        </div>

        <div className="flex justify-center gap-5">
          <button
            onClick={() => setOpen(true)}
            className="cursor-pointer text-[#2AB516] transition-colors hover:text-[#22a010]"
            aria-label="View order details"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            disabled={!order.provider}
            onClick={() => {
              const recipientId = order.provider?.id;
              const name = order.provider?.name || "";
              const avatar = order.provider?.avatar || "";
              if (recipientId) {
                router.push(
                  `/dashboard/messages?recipientId=${recipientId}&taskId=${order.taskId}&recipientName=${encodeURIComponent(name)}&recipientAvatar=${encodeURIComponent(avatar)}`
                );
              }
            }}
            className={`transition-colors ${order.provider
              ? "text-[#9E77ED] hover:text-[#6366f1] cursor-pointer"
              : "text-[#d1d5db] cursor-not-allowed opacity-50"
              }`}
            aria-label="Open chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isWorkTask && (
        <OrderInProgressModal
          order={order}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}

      {isOpenTask && !hasApplicants && (
        <OrderWaitingModal
          order={order}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}

      {isOpenTask && hasApplicants && (
        <ReviewAllApplications
          order={order}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}

      {isFinishedTask && (
        <OrderCompletedModal
          order={order}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}

      {providerDisplay && (
        <ProviderProfileModal
          open={isProfileOpen}
          provider={{
            id: providerDisplay.id,
            name: providerDisplay.name,
            avatar: getInitials(providerDisplay.name),
            avatarBg: "#fd751f",
          }}
          showFooterActions={false}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
}
