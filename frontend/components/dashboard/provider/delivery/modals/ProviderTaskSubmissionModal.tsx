"use client";

import { useState } from "react";
import { FolderOpen, Info, Link2, Send, Upload } from "lucide-react";
import ModalShell from "./ModalShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProviderTaskFinalTaskType,
  ProviderTaskPlacementType,
  type ProviderTask,
  type SubmitProviderTaskPayload,
} from "@/types/providerTask/providerTaskTypes";

interface ProviderTaskSubmissionModalProps {
  isSubmitting: boolean;
  mode: "submit" | "resubmit";
  onClose: () => void;
  onSubmit: (payload: {
    data: SubmitProviderTaskPayload;
    files: File[];
  }) => void;
  open: boolean;
  task: ProviderTask;
}

// Sentinel value used only inside this component so Shadcn Select
// always has a non-empty string as its value prop.
const UNSET = "__unset__";

export default function ProviderTaskSubmissionModal({
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
  task,
}: ProviderTaskSubmissionModalProps) {
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  // Use undefined internally — convert to/from UNSET only at the Select boundary.
  const [finalTaskType, setFinalTaskType] = useState<ProviderTaskFinalTaskType | undefined>(
    undefined,
  );
  const [files, setFiles] = useState<File[]>([]);

  const isFlexibleTask = task.placementType === ProviderTaskPlacementType.FLEXIBLE;

  // Called by <Select onValueChange>. The only valid real values are the two
  // enum members; anything else (including our sentinel) means "nothing chosen".
  const handleFinalTaskTypeChange = (value: string) => {
    if (
      value === ProviderTaskFinalTaskType.BACKLINK ||
      value === ProviderTaskFinalTaskType.GUEST_POST
    ) {
      setFinalTaskType(value);
    } else {
      setFinalTaskType(undefined);
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setFiles(Array.from(event.target.files));
    event.target.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = () => {
    const normalizedMessage = deliveryMessage.trim();
    if (!normalizedMessage) return;
    if (isFlexibleTask && !finalTaskType) return;

    const payloadData: any = {
      deliveryMessage: normalizedMessage,
      proofUrl: proofUrl.trim() || undefined,
      additionalNotes: additionalNotes.trim() || undefined,
    };
    if (isFlexibleTask) {
      payloadData.finalTaskType = finalTaskType;
    }

    onSubmit({
      data: payloadData,
      files,
    });
  };

  const canSubmit = !isSubmitting && !!deliveryMessage.trim() && (isFlexibleTask ? !!finalTaskType : true);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      widthClass="max-w-4xl"
      minHeightClass="min-h-0"
    >
      <div className="flex max-h-[88vh] flex-col">
        {/* Header */}
        <div className="border-b border-[#eaecf0] px-5 pb-4 pt-6 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FDCFBE] bg-[#FFF4ED]">
              <Send className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#181d27] md:text-xl">
                {mode === "resubmit" ? "Resubmit Delivery" : "Submit Delivery"}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#667085]">
                {task.projectTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-6">
          <div className="rounded-2xl border border-[#e9eaeb] bg-[#fcfcfd] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
              Submission Guidance
            </p>
            <p className="mt-3 text-sm leading-7 text-[#475467]">
              Submit the live placement summary, share proof if available, and include any
              delivery notes the requester may need for review.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
              Delivery Message
            </label>
            <textarea
              value={deliveryMessage}
              onChange={(e) => setDeliveryMessage(e.target.value)}
              placeholder="Delivered placement with all requested requirements."
              rows={5}
              className="w-full resize-none rounded-2xl border border-[#d0d5dd] px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                Proof URL
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
                <Input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="h-12 rounded-2xl pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                Additional Notes
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Password for archive: 1234"
                rows={2}
                className="w-full resize-none rounded-2xl border border-[#d0d5dd] px-4 py-3 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
              />
            </div>
          </div>

          {/* ── Final Task Type ── */}
          {isFlexibleTask && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                Final Task Type
              </label>
              {/*
                Shadcn Select requires `value` to always be a non-empty string for
                controlled usage. We use a UNSET sentinel so the placeholder renders
                correctly, and we never expose UNSET outside this component.
              */}
              <Select
                value={finalTaskType ?? UNSET}
                onValueChange={handleFinalTaskTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the final delivery format" />
                </SelectTrigger>
                <SelectContent >
                  {/* Hidden sentinel item that keeps Shadcn happy when nothing is chosen */}
                  <SelectItem value={UNSET} className="hidden" aria-hidden>
                    Select the final delivery format
                  </SelectItem>
                  <SelectItem value={ProviderTaskFinalTaskType.BACKLINK}>
                    Backlink
                  </SelectItem>
                  <SelectItem value={ProviderTaskFinalTaskType.GUEST_POST}>
                    Guest Post
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}


          {/* ── File upload ── */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
              Files
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-[#d0d5dd] bg-[#fcfcfd] px-5 py-8 text-center transition hover:border-[#fd751f]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff4ed]">
                <Upload className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#101828]">Upload delivery files</p>
                <p className="mt-1 text-xs text-[#667085]">
                  Screenshots, reports, archives, or supporting documents.
                </p>
              </div>
              <input type="file" multiple className="hidden" onChange={handleFiles} />
            </label>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-[#eaecf0] bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="text-sm font-semibold text-[#101828]">{file.name}</p>
                        <p className="text-xs text-[#667085]">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-xs font-semibold uppercase tracking-wide text-[#b42318]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-[#FDCFBE] bg-[#FFF4ED] px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <p className="text-xs leading-relaxed text-secondary">
              {isFlexibleTask
                ? "Flexible tasks still need a final task type before submission."
                : "Choose the final task type before sending the delivery."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-[#eaecf0] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <Button variant="white" onClick={onClose} className="rounded-2xl">
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSubmit}
            className="rounded-2xl"
            disabled={!canSubmit}
          >
            <Send className="h-4 w-4" />
            {isSubmitting
              ? mode === "resubmit"
                ? "Resubmitting..."
                : "Submitting..."
              : mode === "resubmit"
                ? "Resubmit Delivery"
                : "Submit Delivery"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}