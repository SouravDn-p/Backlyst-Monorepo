"use client";

import { useState, type ChangeEvent, type MouseEvent } from "react";
import { X, MessageSquare, Info, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FulfillmentProposalModalProps {
  taskLabel: string | undefined;
  onClose: () => void;
  onSubmit: () => void;
}

export function FulfillmentProposalModal({
  taskLabel,
  onClose,
  onSubmit,
}: FulfillmentProposalModalProps) {
  const [note, setNote] = useState<string>("");

  const handleBackdropClick = () => onClose();
  const handleContentClick = (e: MouseEvent<HTMLDivElement>) =>
    e.stopPropagation();
  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) =>
    setNote(e.target.value);

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4"
        onClick={handleContentClick}
      >
        <div className="px-7 pt-6 pb-5 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg border-1 border-secondary bg-[#fff7ed] flex items-center justify-center shrink-0 ">
              <ShieldCheck className="w-6 h-6 text-[#fd751f] " />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#181d27]">
                Submit Fulfillment Proposal
              </h2>
              <p className="text-xs font-semibold text-[#a4a7ae] uppercase tracking-widest mt-0.5">
                Formal Intent Submission
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 cursor-pointer rounded-full bg-[#f5f5f5] flex items-center justify-center hover:bg-[#e9eaeb] transition-colors mt-1"
          >
            <X className="w-4 h-4 text-[#414651]" />
          </button>
        </div>
        <div className="px-7 pb-6 flex flex-col gap-5 max-w-lg mx-auto py-8">
          <div className="border border-[#e9eaeb] rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-1.5">
              Project Scope
            </p>
            <p className="text-base font-semibold text-[#181d27]">
              {taskLabel ?? "High Authority SaaS Guest Post Placement"}
            </p>
          </div>
          <p className="text-sm text-[#535862] leading-relaxed">
            This will notify the requester that your organization is interested{" "}
            <span className="font-semibold text-[#181d27]">
              No work begins until approval is granted.
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#717680]" />
              <p className="text-xs font-semibold text-[#414651] uppercase tracking-widest">
                Short Note (Optional)
              </p>
            </div>
            <textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Optional message to requester (scope, availability, clarification)"
              rows={3}
              className="w-full bg-[#f9f9f9] border border-[#e9eaeb] text-xs rounded-xl px-4 py-3  text-[#181d27] placeholder-[#a4a7ae] outline-none resize-none focus:border-[#fd751f] transition-colors"
            />
          </div>
          <div className="bg-[#fff7ed] border-1 border-secondary rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#fd751f]  shrink-0 mt-0.5" />
            <p className="text-xs text-secondary">
              By submitting, you agree to the platform&apos;s escrow-protected
              fulfillment guidelines.
            </p>
          </div>
        </div>
        <div className="px-7 py-4 border-t border-[#f0f0f0] flex items-center justify-between gap-3 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-80 cursor-pointer bg-[#f5f5f5] hover:bg-[#e9eaeb] transition-colors text-[#414651] font-bold text-sm py-3 rounded-xl"
          >
            CANCEL
          </button>
          <Button
            type="button"
            onClick={onSubmit}
            variant="secondary"
            className="w-80"
          >
            <Send className="w-4 h-4" />
            SUBMIT PROPOSAL
          </Button>
        </div>
      </div>
    </div>
  );
}
