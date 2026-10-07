"use client";

import {
  Clock,
  Globe,
  AlertCircle,
  Check,
  ClipboardList,
  CheckSquare,
  Clock3,
  ClipboardClock,
} from "lucide-react";
import ModalShell from "./ModalShell";
import type { DeliveryItem } from "../DeliveryCard";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  task: DeliveryItem;
  open: boolean;
  onClose: () => void;
};

export default function DeliverySubmittedModal({ task, open, onClose }: Props) {
  const [subModal, setSubModal] = useState<string | null>(null);

  const handleReturnToDashboard = () => {
    setSubModal(null);
    onClose();
  };
  return (
    <>
      <ModalShell open={open} onClose={onClose}>
        <div className="flex flex-col max-h-[90vh]">
          <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-[#e9eaeb] shrink-0 ">
            <div className="flex items-start gap-3 md:gap-4 pr-6 md:pr-8">
              <div className="w-12 md:w-14 h-12 md:h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 32 32"
                  className="w-6 md:w-8 h-6 md:h-8 fill-[#7C3AED]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 4a2 2 0 0 0-2 2v20l10-5 10 5V6a2 2 0 0 0-2-2H8Z" />
                </svg>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-[#181d27]">
                    Alpha Brands Inc.
                  </h2>
                  <span className="text-[8px] md:text-[10px] font-semibold bg-[#ECFDF3] text-[#027A48] px-2 md:px-2.5 py-0.5 rounded-full border border-[#6CE9A6] tracking-wide">
                    VERIFIED REQUESTER
                  </span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs md:text-sm">
                    <span className="text-yellow-400 text-sm md:text-base leading-none">
                      ★
                    </span>
                    <span className="font-semibold text-[#181d27]">4.9</span>
                    <span className="text-[#9DA4AE]">(102 Reviews)</span>
                  </span>
                  <span className="text-[#e9eaeb] select-none hidden md:inline">
                    |
                  </span>
                  <span className="text-[8px] md:text-xs text-[#9DA4AE] font-medium tracking-wide">
                    REFERENCE: PROJ-0217
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-2 md:mt-3">
              <span className="text-[8px] md:text-[10px] font-semibold bg-secondary text-white px-2 md:px-2.5 py-0.5 rounded-full border border-[#6CE9A6]">
                SUBMITTED{" "}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-5 md:space-y-6">
            <section>
              <SectionHeading>Technical Specifications</SectionHeading>

              <div className="border border-[#e9eaeb] rounded-xl mt-2 md:mt-3 space-y-2 ">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 px-4 md:px-5 pt-4">
                  <SpecField
                    label="Project Title"
                    value="Guest Post Placement - 'Startuply.io'"
                  />
                  <SpecField label="Settlement (CR)" value="+1.0 Credit" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 p-4 md:p-5">
                  <SpecField
                    label="Placement Type"
                    value="Guest Post Placement"
                  />
                  <SpecField label="Link Protocol" value="Do Follow" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 px-4 md:px-5">
                  <SpecField label="Responsibility" value="Provider Content" />
                  <div>
                    <SpecLabel>Deadline</SpecLabel>
                    <div className="flex items-center gap-1.5 mt-1 text-xs md:text-sm text-[#535862]">
                      <Clock className="w-3.5 md:w-4 h-3.5 md:h-4 shrink-0" />
                      Oct 28, 2026
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-5">
                  <SpecLabel>Target URL</SpecLabel>
                  <div className="flex items-center gap-2 mt-2 bg-[#f2f4f7] rounded-lg px-2 md:px-3 py-2">
                    <Globe className="w-3.5 md:w-4 h-3.5 md:h-4 text-[#4169E1] shrink-0" />
                    <a
                      href="https://startuply.io.com"
                      className="text-xs md:text-sm text-[#535862] hover:text-[#4169E1] transition-colors truncate"
                    >
                      https://startuply.io.com
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionHeading>Required Notes &amp; Standards</SectionHeading>

              <div className="border border-[#e9eaeb] rounded-xl p-5 mt-3 space-y-4">
                <p className="text-sm text-[#535862] leading-relaxed">
                  &ldquo;Standard editorial placement required. Anchor text
                  should be integrated naturally within the body content. We do
                  not accept placements on pages with adult or gambling
                  content.&rdquo;
                </p>

                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <AlertCircle className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-secondary">
                      Rejection Conditions
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Placements labeled as "Sponsored"',
                      "Links that are not permanent",
                    ].map((c) => (
                      <li
                        key={c}
                        className="flex items-center gap-2 text-sm text-[#535862]"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0 text-[#535862]" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <SectionHeading>Marketplace History</SectionHeading>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-2 md:mt-3">
                <StatCard
                  icon={<ClipboardList className="w-5 md:w-6 h-5 md:h-6" />}
                  label="Total Tasks Posted"
                  value="65"
                />
                <StatCard
                  icon={<CheckSquare className="w-5 md:w-6 h-5 md:h-6" />}
                  label="Completed Tasks"
                  value="40"
                />
                <StatCard
                  icon={<Clock3 className="w-5 md:w-6 h-5 md:h-6" />}
                  label="Avg. Approval Time"
                  value="2.4h"
                />
                <StatCard
                  icon={<ClipboardClock className="w-5 md:w-6 h-5 md:h-6" />}
                  label="Dispute Rate"
                  value="0%"
                />
              </div>
            </section>
          </div>

          <div className="shrink-0 px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-4 flex justify-between border-t border-[#e9eaeb] gap-3">
            <button
              onClick={onClose}
              className="flex-1 cursor-pointer bg-[#f2f4f7] max-w-100 hover:bg-[#e9eaeb] text-[#535862] font-semibold text-xs md:text-sm py-3 md:py-3.5 rounded-xl transition-colors tracking-wide"
            >
              CLOSE OVERSIGHT
            </button>
          </div>
        </div>
      </ModalShell>
      <ModalShell
        open={subModal === "success"}
        onClose={handleReturnToDashboard}
        minHeightClass="w-md"
      >
        <div className="px-6 md:px-8 py-8 md:py-10 flex flex-col items-center text-center">
          <div className="w-12 md:w-14 h-12 md:h-14 rounded-full bg-[#ECFDF3] flex items-center justify-center mb-4 md:mb-5">
            <svg
              viewBox="0 0 24 24"
              className="w-6 md:w-8 h-6 md:h-8 fill-[#027A48]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-[#181d27] mb-2 md:mb-3">
            Application Submitted
          </h3>
          <p className="text-xs md:text-sm text-[#535862] leading-relaxed max-w-xs">
            Your application has been sent to the requester. They will review
            and respond shortly.
          </p>
          <Button
            variant="secondary"
            onClick={handleReturnToDashboard}
            className="mt-4 md:mt-6 h-10 md:h-11"
          >
            RETURN TO DASHBOARD
          </Button>
        </div>
      </ModalShell>
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#181d27]">
      {children}
    </h3>
  );
}

function SpecLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-[#181d27]">
      {children}
    </p>
  );
}

function SpecField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SpecLabel>{label}</SpecLabel>
      <p className="text-xs md:text-sm text-[#535862] mt-1">{value}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#f9fafb] rounded-xl p-2 md:p-4 flex flex-col items-center text-center gap-1 md:gap-2">
      <span className="text-[#535862] w-4 md:w-6 h-4 md:h-6">{icon}</span>
      <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-wide text-[#535862] leading-snug">
        {label}
      </p>
      <p className="text-xl md:text-2xl font-bold text-[#181d27]">{value}</p>
    </div>
  );
}
