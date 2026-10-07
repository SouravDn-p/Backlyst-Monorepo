"use client";

import { useState } from "react";
import {
  FileText,
  ClipboardList,
  Clock,
  CheckCircle2,
  Star,
  Globe,
  ThumbsDown,
  ThumbsUp,
  Plus,
  UserCheck,
} from "lucide-react";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import { StatusBadge } from "@/components/ui/common/StatusBadge";
import { Button } from "@/components/ui/Button";
import type { OrderItem } from "../OrderCard";

type Tab = "summary" | "proposal" | "timeline";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "proposal", label: "Proposal", icon: ClipboardList },
  { id: "timeline", label: "Timeline", icon: Clock },
];

type Props = { order: OrderItem; open: boolean; onClose: () => void };

export default function OrderAppliedModal({ order, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(
    null,
  );

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setActiveTab("summary");
      setDecision(null);
    }, 200);
  };

  return (
    <ModalShell open={open} onClose={handleClose}>
      <section className="flex flex-col max-h-[88vh]">
        <div className="pt-4 md:pt-6 pb-0 shrink-0 border-b border-[#e9eaeb]">
          <div className="flex items-start gap-3 md:gap-4 px-3 md:px-6 pr-4 md:pr-8 py-3 md:py-4">
            <div className="w-9 md:w-11 h-9 md:h-11 bg-[#FFF4ED] rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 md:w-6 h-5 md:h-6 text-secondary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h2 className="text-lg md:text-2xl font-bold text-[#181d27]">
                  {order.name}
                </h2>
                <StatusBadge status={order.id} />
              </div>
              <p className="text-xs md:text-sm text-[#535862] mt-1 md:mt-2">
                1 provider has applied — review their proposal
              </p>
            </div>
          </div>

          <div className="flex mt-4 bg-[#FFF4ED] p-1 gap-1 px-3 md:px-6">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 cursor-pointer flex items-center justify-center gap-2 py-2 md:py-3 px-2 md:px-3 rounded-lg font-semibold transition text-xs sm:text-sm ${
                    isActive
                      ? "text-secondary  "
                      : "text-[#535862] hover:text-secondary "
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl ${
                      isActive
                        ? "bg-secondary text-white"
                        : "bg-white text-secondary/80"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6">
          {activeTab === "summary" && <SummaryTab />}
          {activeTab === "proposal" && (
            <ProposalTab decision={decision} setDecision={setDecision} />
          )}
          {activeTab === "timeline" && <TimelineTab />}
        </div>

        <div className="shrink-0 px-6 md:px-10 lg:px-16 pb-4 md:pb-5 pt-3 md:pt-4 border-t border-[#e9eaeb] flex items-center justify-end bg-white">
          <Button
            variant="white"
            onClick={handleClose}
            className="rounded-lg text-xs md:text-sm"
          >
            Close Oversight
          </Button>
        </div>
      </section>
    </ModalShell>
  );
}

function SummaryTab() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="border border-[#e9eaeb] rounded-xl p-3 md:p-5 space-y-2 bg-white hover:shadow-sm transition">
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Status
          </p>
          <div className="flex items-center gap-2">
            <div className="w-7 md:w-8 h-7 md:h-8 rounded-full bg-[#FFF4ED] flex items-center justify-center">
              <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 text-secondary" />
            </div>
            <span className="text-base md:text-lg font-semibold text-secondary">
              Applied
            </span>
          </div>
          <p className="text-xs md:text-sm text-[#9DA4AE]">
            Provider proposal under review
          </p>
        </div>

        <div className="border border-[#e9eaeb] rounded-xl p-3 md:p-5 space-y-2 bg-white hover:shadow-sm transition">
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#535862]">
            Deadline
          </p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 md:w-5 h-4 md:h-5 text-secondary" />
            <span className="text-base md:text-lg font-semibold text-[#181d27]">
              Oct 24, 2026
            </span>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#181d27] mb-3 md:mb-4">
          Placement Requirements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 py-4 md:py-5 border-t border-b border-[#e9eaeb]">
          <div>
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2">
              Anchor Text
            </p>
            <p className="text-xs md:text-sm font-medium text-[#181d27]">
              &quot;SaaS&quot; Scaling Infrastructure
            </p>
          </div>
          <div>
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2">
              Required DR
            </p>
            <p className="text-xs md:text-sm font-medium text-[#181d27]">
              DR 72+ Guaranteed
            </p>
          </div>
        </div>
      </section>

      <div>
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#181d27] mb-2 md:mb-3">
          Placement Guidelines
        </p>
        <p className="text-xs md:text-sm text-[#535862] leading-relaxed">
          The backlink must be placed within a contextually relevant paragraph.
          Minimum 800 words • 2+ high-authority outbound links • Permanent
          placement.
        </p>
      </div>

      <div className="flex items-center gap-3 bg-[#FFF4ED] border border-[#FDCFBE] rounded-xl px-3 md:px-5 py-2.5 md:py-3.5">
        <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 text-secondary shrink-0" />
        <p className="text-xs md:text-sm font-medium text-secondary">
          Escrow Protection Active — funds held until approval
        </p>
      </div>
    </div>
  );
}

function ProposalTab({
  decision,
  setDecision,
}: {
  decision: "accepted" | "rejected" | null;
  setDecision: (v: "accepted" | "rejected" | null) => void;
}) {
  if (decision === "accepted") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-[#ECFDF3] flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-[#027A48]" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-[#181d27]">
            Provider Accepted
          </h3>
          <p className="text-base text-[#535862] mt-2 max-w-md">
            The provider has been notified and the task is now moving to In
            Progress.
          </p>
        </div>
      </div>
    );
  }

  if (decision === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FEF3F2] flex items-center justify-center">
          <ThumbsDown className="w-9 h-9 text-[#B42318]" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-[#181d27]">
            Proposal Rejected
          </h3>
          <p className="text-base text-[#535862] mt-2 max-w-md">
            The provider has been notified. This opportunity will return to the
            marketplace.
          </p>
        </div>
        <button
          onClick={() => setDecision(null)}
          className="cursor-pointer mt-3 text-base font-semibold text-secondary hover:underline"
        >
          View proposal again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="border border-[#e9eaeb] rounded-xl overflow-hidden bg-white">
        <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-[#f9fafb] border-b border-[#e9eaeb]">
          <div className="w-12 md:w-14 h-12 md:h-14 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-lg md:text-xl shrink-0">
            V
          </div>
          <div className="flex-1">
            <p className="text-sm md:text-base font-bold text-[#181d27]">
              Vini B.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-3 md:w-4 h-3 md:h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs md:text-sm font-semibold text-[#181d27]">
                4.9
              </span>
              <span className="text-xs text-[#9DA4AE]">(84 reviews)</span>
            </div>
          </div>
          <span className="text-[10px] md:text-xs font-bold bg-[#ECFDF3] text-[#027A48] border border-[#6CE9A6] px-2 md:px-3 py-1 rounded-full uppercase tracking-wide">
            VERIFIED
          </span>
        </div>

        <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-[#e9eaeb]">
          <Globe className="w-4 md:w-5 h-4 md:h-5 text-secondary shrink-0" />
          <div>
            <p className="text-sm md:text-base font-medium text-[#181d27]">
              techtrends.net
            </p>
            <p className="text-xs font-semibold text-[#9DA4AE] uppercase tracking-wide mt-0.5">
              DR 84 • VERIFIED DOMAIN
            </p>
          </div>
        </div>

        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-[#e9eaeb]">
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#535862] mb-2">
            Proposal Note
          </p>
          <p className="text-xs md:text-sm text-[#535862] leading-relaxed italic">
            &quot;I can place this link in a high-traffic SaaS roundup article
            currently ranking on page 1. Turnaround is 3 days. Content is
            original, 1,200+ words.&quot;
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#e9eaeb]">
          {[
            { label: "Tasks Completed", value: "142" },
            { label: "Avg. Delivery", value: "2.1d" },
            { label: "Success Rate", value: "98%" },
          ].map((s) => (
            <div key={s.label} className="py-3 md:py-5 text-center">
              <p className="text-lg md:text-xl font-bold text-[#181d27]">
                {s.value}
              </p>
              <p className="text-[10px] md:text-xs font-semibold text-[#9DA4AE] uppercase tracking-wide mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
        <button
          onClick={() => setDecision("rejected")}
          className="cursor-pointer flex items-center justify-center gap-2 border-2 border-[#FDA29B] bg-[#FEF3F2] hover:bg-[#FEE4E2] text-[#B42318] font-semibold text-xs md:text-base py-2.5 md:py-3.5 rounded-lg transition-colors"
        >
          <ThumbsDown className="w-5 h-5" />
          Reject Provider
        </button>
        <button
          onClick={() => setDecision("accepted")}
          className="cursor-pointer flex items-center justify-center gap-2 bg-secondary hover:bg-[#d94118] text-white font-semibold text-xs md:text-base py-2.5 md:py-3.5 rounded-lg transition-colors shadow-sm"
        >
          <ThumbsUp className="w-5 h-5" />
          Accept Provider
        </button>
      </div>
    </div>
  );
}

function TimelineTab() {
  return (
    <div className="space-y-4 md:space-y-6 py-2">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="w-10 md:w-11 h-10 md:h-11 rounded-full border-2 border-secondary bg-white flex items-center justify-center shrink-0">
          <Plus className="w-4 md:w-5 h-4 md:h-5 text-secondary" />
        </div>
        <div className="pt-0.5 md:pt-1">
          <p className="text-sm md:text-base font-semibold text-[#181d27]">
            Placement Task Created
          </p>
          <p className="text-xs md:text-sm text-[#9DA4AE] mt-0.5 md:mt-1">
            Oct 08, 09:42 AM
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 md:gap-4">
        <div className="w-10 md:w-11 h-10 md:h-11 rounded-full border-2 border-secondary bg-white flex items-center justify-center shrink-0">
          <UserCheck className="w-4 md:w-5 h-4 md:h-5 text-secondary" />
        </div>
        <div className="pt-0.5 md:pt-1">
          <p className="text-sm md:text-base font-semibold text-[#181d27]">
            Provider Applied
          </p>
          <p className="text-xs md:text-sm text-[#9DA4AE] mt-0.5 md:mt-1">
            Oct 08, 02:15 PM
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 md:gap-4 opacity-50">
        <div className="w-10 md:w-11 h-10 md:h-11 rounded-full border-2 border-dashed border-[#9DA4AE] bg-white flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 text-[#9DA4AE]" />
        </div>
        <div className="pt-0.5 md:pt-1">
          <p className="text-sm md:text-base font-semibold text-[#9DA4AE]">
            Awaiting Requester Decision
          </p>
          <p className="text-xs md:text-sm text-[#9DA4AE] mt-0.5 md:mt-1">
            Pending
          </p>
        </div>
      </div>
    </div>
  );
}
