"use client";

import { useState } from "react";
import {
  FileText,
  Send,
  ShieldCheck,
  History,
  CheckCircle2,
  Info,
  MessageSquare,
  LucideIcon,
} from "lucide-react";
import ModalShell from "./ModalShell";
import type { DeliveryItem } from "../DeliveryCard";
import BriefOverviewTab from "./inProgressTabs/BriefOverviewTab";
import SubmitDeliveryTab from "./inProgressTabs/SubmitDeliveryTab";
import { DeliveryProofTab } from "./inProgressTabs/DeliveryProofTab";
import { ProjectHistoryTab } from "./inProgressTabs/ProjectHistoryTab";
import { StatusBadge } from "@/components/ui/common/StatusBadge";
import { Button } from "@/components/ui/Button";

type Tab = "brief" | "submit" | "proof" | "history";
type SubModal = "propose" | "success" | null;

type Props = {
  task: DeliveryItem;
  open: boolean;
  onClose: () => void;
};

const TABS: {
  id: Tab;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    id: "brief",
    label: "Brief Overview",
    icon: FileText,
  },
  {
    id: "submit",
    label: "Submit Delivery",
    icon: Send,
  },
  {
    id: "proof",
    label: "Delivery Proof",
    icon: ShieldCheck,
  },
  {
    id: "history",
    label: "Project History",
    icon: History,
  },
];

export default function DeliveryInProgressModal({
  task,
  open,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("brief");
  const [subModal, setSubModal] = useState<SubModal>(null);
  const [note, setNote] = useState("");

  const handleSubmitProposal = () => {
    setSubModal("success");
  };

  const handleReturnToDashboard = () => {
    setSubModal(null);
    onClose();
  };

  return (
    <div className="relative">
      <ModalShell open={open && !subModal} onClose={onClose}>
        <section className="flex flex-col max-h-[85vh]">
          <div className="pt-4 md:pt-6 pb-0 shrink-0">
            <div className="flex items-start gap-2 md:gap-3 px-4 md:px-6 pr-6 md:pr-8 py-3 md:py-4">
              <div className="w-8 md:w-10 h-8 md:h-10 mt-1 md:mt-2 bg-[#FFF4ED] flex items-center justify-center shrink-0">
                <FileText className="w-5 md:w-6 h-5 md:h-6 text-secondary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h2 className="text-lg md:text-2xl font-bold text-[#181d27]">
                    {task.title}
                  </h2>
                  <StatusBadge status="OPPORTUNITY #DP-7821" />
                </div>

                <p className="text-xs md:text-sm text-[#535862] mt-0.5 md:mt-1">
                  Requester Entity:{" "}
                  <span className="font-medium text-[#181d27]">
                    Alpha Brands Inc.
                  </span>{" "}
                  <span className="text-yellow-400">★</span>{" "}
                  <span className="font-medium text-[#181d27]">4.8</span>
                </p>
              </div>
            </div>

            <div className="flex mt-3 md:mt-5 bg-[#FFF4ED] p-1 gap-1 px-4 md:px-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-3 px-2 rounded-lg font-semibold transition ${
                      isActive
                        ? "text-secondary"
                        : "text-black hover:text-secondary"
                    }`}
                  >
                    <div
                      className={`p-1 md:p-1.5 rounded-2xl ${
                        isActive
                          ? "bg-secondary text-white"
                          : "bg-white text-secondary"
                      }`}
                    >
                      <Icon className="w-4 md:w-5 h-4 md:h-5" />
                    </div>
                    <span className="hidden md:inline text-xs md:text-sm">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5">
            {activeTab === "brief" && <BriefOverviewTab />}
            {activeTab === "submit" && <SubmitDeliveryTab />}
            {activeTab === "proof" && <DeliveryProofTab />}
            {activeTab === "history" && <ProjectHistoryTab />}
          </div>

          <div className="shrink-0 px-6 md:px-16 pb-3 md:pb-5 flex flex-col md:flex-row items-center justify-between border-t border-[#e9eaeb] pt-3 md:pt-4 bg-white gap-2 md:gap-0">
            <Button
              variant="white"
              className="flex border-none items-center gap-1 md:gap-2 text-xs md:text-base w-full md:w-auto justify-center md:justify-start"
            >
              <MessageSquare className="w-4 md:w-6 h-4 md:h-6" />
              <span className="hidden sm:inline">OPEN CHAT</span>
            </Button>

            <button
              onClick={() => setSubModal("propose")}
              className="flex items-center gap-1 md:gap-2 bg-secondary hover:bg-[#d94118] text-white font-semibold text-xs md:text-sm px-4 md:px-6 py-2 md:py-2.5 rounded-lg transition w-full md:w-auto justify-center"
            >
              <Send className="w-4 md:w-5 h-4 md:h-5" />
              <span className="hidden sm:inline">PROPOSE FULFILLMENT</span>
            </button>
          </div>
        </section>
      </ModalShell>

      <ModalShell
        open={subModal === "propose"}
        onClose={() => setSubModal(null)}
        minHeightClass="min-h-[70vh]"
        widthClass="max-w-5xl"
      >
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 flex items-start gap-2 md:gap-3">
          <div className="w-8 md:w-10 h-8 md:h-10 rounded-xl bg-[#FFF4ED] border border-[#FDCFBE] flex flex-col items-center justify-center shrink-0">
            <ShieldCheck className="w-4 md:w-5 h-4 md:h-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-[#181d27]">
              Submit Fulfillment Proposal
            </h3>
            <p className="text-[10px] md:text-xs text-[#535862] uppercase tracking-wide font-medium mt-0.5">
              Formal Intent Submission
            </p>
          </div>
        </div>

        <div className=" max-w-2xl mx-auto py-4 md:py-6 space-y-4 md:space-y-5 px-4 md:px-0">
          <div className="bg-[#f9fafb] rounded-xl p-3 md:p-4">
            <p className="text-[9px] md:text-xs font-semibold uppercase tracking-wide text-[#535862] mb-1 md:mb-2">
              Project Scope
            </p>
            <p className="text-sm md:text-base text-[#181d27] font-semibold">
              High Authority SaaS Guest Post Placement
            </p>
            <p className="text-xs md:text-sm text-[#535862] mt-2">
              This will notify the requester that your organization is
              interested in fulfilling this opportunity.{" "}
              <span className="font-semibold text-[#181d27]">
                No work begins until approval is granted.
              </span>
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1 md:gap-2 text-[9px] md:text-xs font-semibold uppercase tracking-wide text-[#535862] mb-1 md:mb-2">
              <MessageSquare className="w-3 md:w-3.5 h-3 md:h-3.5" />
              Short Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional message to requester (scope, availability, clarification)"
              className="w-full border border-[#e9eaeb] rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-[#181d27] placeholder:text-[#9DA4AE] resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition"
            />
          </div>

          <div className="flex items-start gap-2 md:gap-3 bg-[#FFF4ED] border border-[#FDCFBE] rounded-xl px-3 md:px-4 py-2 md:py-3">
            <Info className="w-3.5 md:w-4 h-3.5 md:h-4 text-secondary shrink-0 mt-0.5" />
            <p className="text-xs md:text-sm text-secondary">
              By submitting, you agree to the platform&apos;s escrow-protected
              fulfillment guidelines.
            </p>
          </div>
        </div>
        <div className="flex justify-between px-6 md:px-12 mt-16 md:mt-28 border-t gap-2 md:gap-3 pt-2">
          <button
            onClick={() => setSubModal(null)}
            className="flex w-24 md:w-28 justify-center cursor-pointer border border-[#e9eaeb] text-[#535862] rounded-lg py-2 md:py-2.5 text-center text-xs md:text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            CANCEL
          </button>
          <Button
            variant="secondary"
            className="rounded-lg text-xs md:text-sm px-4 md:px-6"
            onClick={handleSubmitProposal}
          >
            <Send className="w-3.5 md:w-4 h-3.5 md:h-4" />
            SUBMIT PROPOSAL
          </Button>
        </div>
      </ModalShell>

      <ModalShell
        open={subModal === "success"}
        onClose={handleReturnToDashboard}
        minHeightClass="w-md"
      >
        <div className="px-6 md:px-8 py-8 md:py-10 flex flex-col items-center text-center ">
          <div className="w-12 md:w-14 h-12 md:h-14 rounded-full bg-[#ECFDF3] flex items-center justify-center mb-4 md:mb-5">
            <CheckCircle2 className="w-6 md:w-8 h-6 md:h-8 text-[#027A48]" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-[#181d27] mb-2 md:mb-3">
            Submission Successful
          </h3>
          <p className="text-xs md:text-sm text-[#535862] leading-relaxed max-w-xs">
            Your delivery has been submitted and is now awaiting requester
            review.
          </p>
          <Button
            variant="secondary"
            onClick={handleReturnToDashboard}
            className="rounded-sm mt-4 md:mt-6 h-10 md:h-11"
          >
            RETURN TO DASHBOARD
          </Button>
        </div>
      </ModalShell>
    </div>
  );
}
