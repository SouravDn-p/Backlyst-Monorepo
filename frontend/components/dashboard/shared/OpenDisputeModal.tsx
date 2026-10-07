"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import { Button } from "@/components/ui/Button";
import { useOpenDisputeMutation } from "@/redux/features/api/dispute/disputeApi";

interface OpenDisputeModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  /** Optional: called after a dispute is successfully opened */
  onSuccess?: () => void;
}

const DISPUTE_REASON_PRESETS = [
  "Work not delivered as agreed",
  "Wrong anchor text or link",
  "Link is not live or accessible",
  "Content quality does not meet requirements",
  "Provider is unresponsive",
  "Fraudulent or misleading submission",
  "Other",
];

function getApiErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof (error.data as Record<string, unknown>).message === "string"
  ) {
    return (error.data as Record<string, string>).message;
  }
  return "Something went wrong. Please try again.";
}

export default function OpenDisputeModal({
  open,
  onClose,
  taskId,
  onSuccess,
}: OpenDisputeModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");

  const [openDispute, { isLoading }] = useOpenDisputeMutation();

  const isOther = selectedPreset === "Other";
  const reason = isOther ? customReason.trim() : selectedPreset;
  const canSubmit = reason.length > 0;

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    // reset after close animation
    window.setTimeout(() => {
      setSelectedPreset("");
      setCustomReason("");
      setEvidenceNotes("");
    }, 200);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please select or enter a reason for the dispute.");
      return;
    }

    const loadingToastId = toast.loading("Opening dispute...");

    try {
      const response = await openDispute({
        taskId,
        reason,
        evidence: evidenceNotes.trim()
          ? { notes: evidenceNotes.trim() }
          : undefined,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Dispute opened successfully.");
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      widthClass="max-w-2xl"
      minHeightClass="min-h-0"
    >
      <div className="flex flex-col gap-5 px-5 pb-6 pt-6 md:px-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fef3f2] text-[#d92d20]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#101828]">Open a Dispute</h3>
            <p className="mt-1 text-sm text-[#667085]">
              Disputes are reviewed by our team. Funds remain held in escrow
              until a resolution is reached.
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 rounded-xl border border-[#fda29b] bg-[#fef3f2] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d92d20]" />
          <p className="text-xs leading-relaxed text-[#7a271a]">
            Only open a dispute if you have a genuine concern that cannot be
            resolved through chat or a revision request. Abuse of the dispute
            system may result in account suspension.
          </p>
        </div>

        {/* Reason presets */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#344054]">
            Reason for Dispute <span className="text-[#d92d20]">*</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISPUTE_REASON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSelectedPreset(preset)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                  selectedPreset === preset
                    ? "border-[#d92d20] bg-[#fef3f2] text-[#7a271a]"
                    : "border-[#d0d5dd] bg-white text-[#344054] hover:border-[#fda29b] hover:bg-[#fef3f2]"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom reason textarea (shown when "Other" selected) */}
        {isOther && (
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#344054]">
              Describe the Issue <span className="text-[#d92d20]">*</span>
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              placeholder="Explain the issue in detail..."
              className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#d92d20] focus:ring-2 focus:ring-[#d92d20]/20"
            />
          </div>
        )}

        {/* Evidence notes */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#344054]">
            Supporting Evidence{" "}
            <span className="font-normal normal-case text-[#98a2b3]">
              (optional)
            </span>
          </label>
          <textarea
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            rows={4}
            placeholder="Paste links, describe screenshots, or add any extra context that supports your claim..."
            className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#d92d20] focus:ring-2 focus:ring-[#d92d20]/20"
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-[#eaecf0] pt-4 md:flex-row md:items-center md:justify-between">
          <Button
            variant="white"
            onClick={handleClose}
            className="rounded-2xl"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            className="rounded-2xl bg-[#d92d20] text-white hover:bg-[#b42318] disabled:opacity-50"
            disabled={!canSubmit || isLoading}
          >
            <ShieldAlert className="h-4 w-4" />
            {isLoading ? "Submitting..." : "Submit Dispute"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
