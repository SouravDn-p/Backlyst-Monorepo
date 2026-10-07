"use client";

import type { ChangeEvent, DragEvent, RefObject } from "react";
import { AlertCircle, FileText, Upload, X } from "lucide-react";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";
import type { TaskFormField, TaskFormValues } from "./types";

interface CreateTaskStepThreeProps {
  dragOver: boolean;
  fieldErrors: Partial<Record<TaskFormField, string>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: File[];
  formValues: TaskFormValues;
  inputIds: {
    fileUpload: string;
  };
  maxFiles: number;
  onDragLeave: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenFilePicker: () => void;
  onRemoveFile: (index: number) => void;
  placementTypeLabel: string;
  selectedWebsiteName: string;
  walletLabel: string;
  linkAttributeLabel: string;
}

export default function CreateTaskStepThree({
  dragOver,
  fieldErrors,
  fileInputRef,
  files,
  formValues,
  inputIds,
  maxFiles,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileInputChange,
  onOpenFilePicker,
  onRemoveFile,
  placementTypeLabel,
  selectedWebsiteName,
  walletLabel,
  linkAttributeLabel,
}: CreateTaskStepThreeProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-2xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#fd751f]/10 rounded-full" />
        <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-[#fd751f]/5 rounded-full" />

        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest">
                Request Summary
              </p>
              <h3 className="text-2xl font-bold text-[#fd751f] mt-2">
                {formValues.projectTitle || "Untitled Task"}
              </h3>
              <p className="text-sm text-[#717680] mt-1">
                {selectedWebsiteName || "No website selected"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest">
                Wallet Source
              </p>
              <p className="text-sm md:text-base font-bold text-[#fd751f] mt-1">
                {walletLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest mb-1">
                Placement Type
              </p>
              <p className="font-bold text-[#181d27] text-sm md:text-base">
                {placementTypeLabel}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest mb-1">
                Link Attribute
              </p>
              <p className="font-bold text-[#181d27] text-sm md:text-base">
                {linkAttributeLabel}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest mb-1">
                Anchor Text
              </p>
              <p className="font-bold text-[#181d27] text-sm md:text-base">
                {formValues.anchorText || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest mb-1">
                Deadline
              </p>
              <p className="font-bold text-[#181d27] text-sm md:text-base">
                {formValues.requestedDeadlineDays || "0"} day(s)
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest mb-1">
                Required DR
              </p>
              <p className="font-bold text-[#181d27] text-sm md:text-base">
                {formValues.requiredDomainRating || "Not specified"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest mb-1">
              Target Destination
            </p>
            <p className="text-xs md:text-base text-[#fd751f] break-all">
              {formValues.targetUrl || "No target URL provided"}
            </p>
          </div>

          {formValues.placementGuidelines && (
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#717680] uppercase tracking-widest mb-1">
                Placement Guidelines
              </p>
              <p className="text-sm md:text-base text-[#414651] leading-relaxed">
                {formValues.placementGuidelines}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label
          htmlFor={inputIds.fileUpload}
          className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]"
        >
          Support Files (Optional)
        </Label>
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={onOpenFilePicker}
          className={cn(
            "border-2 border-dashed rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
            dragOver
              ? "border-[#fd751f] bg-[#fff7ed]"
              : "border-[#e0e0e0] bg-[#f9f9f9] hover:border-[#c5c5c5] hover:bg-[#f5f5f5]",
            fieldErrors.files && "border-[#f04438] bg-[#fef3f2]",
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              dragOver ? "bg-[#fd751f]/10" : "bg-[#f0f0f0]",
            )}
          >
            <Upload
              className={cn(
                "w-6 h-6 transition-colors",
                dragOver ? "text-[#fd751f]" : "text-[#a4a7ae]",
              )}
            />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#414651] uppercase tracking-wide">
              Drag and drop files here
            </p>
            <p className="text-sm text-[#98a2b3] mt-1">
              Upload briefs, screenshots, or reference docs. Maximum {maxFiles}{" "}
              files.
            </p>
          </div>
          <input
            id={inputIds.fileUpload}
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFileInputChange}
          />
        </div>
        {fieldErrors.files && (
          <p className="text-sm text-[#b42318]">{fieldErrors.files}</p>
        )}

        {files.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-[#f5f5f5] border border-[#e9eaeb] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#fd751f] shrink-0" />
                  <span className="text-xs font-medium text-[#414651] truncate">
                    {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="w-5 h-5 rounded-full bg-[#e9eaeb] flex items-center justify-center hover:bg-[#d5d7da] transition-colors shrink-0 ml-2"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3 h-3 text-[#717680]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-[#475467] shrink-0 mt-0.5" />
        <p className="text-xs md:text-sm text-[#475467]">
          This request is submitted as multipart form data. The task fields are
          JSON encoded in the `data` part and any uploaded files are attached
          under `files`.
        </p>
      </div>
    </div>
  );
}
