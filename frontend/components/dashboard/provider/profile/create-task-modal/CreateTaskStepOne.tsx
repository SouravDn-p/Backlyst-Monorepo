"use client";

import { Check, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Website, WebsiteVerificationStatus } from "@/types/website/websiteTypes";
import type {
  PlacementOption,
  TaskFormField,
  TaskFormValues,
} from "./types";

interface CreateTaskStepOneProps {
  fieldErrors: Partial<Record<TaskFormField, string>>;
  formValues: TaskFormValues;
  inputIds: {
    projectTitle: string;
  };
  isWebsitesFetching: boolean;
  isWebsitesLoading: boolean;
  openWebsitesPage: () => void;
  onRefetchWebsites: () => void;
  onUpdateField: <K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) => void;
  placementOptions: PlacementOption[];
  resolvedWebsiteId: string;
  selectedWebsite: Website | null;
  statusStyles: Record<WebsiteVerificationStatus, string>;
  websites: Website[];
  websitesErrorMessage: string | null;
}

export default function CreateTaskStepOne({
  fieldErrors,
  formValues,
  inputIds,
  isWebsitesFetching,
  isWebsitesLoading,
  openWebsitesPage,
  onRefetchWebsites,
  onUpdateField,
  placementOptions,
  resolvedWebsiteId,
  selectedWebsite,
  statusStyles,
  websites,
  websitesErrorMessage,
}: CreateTaskStepOneProps) {
  return (
    <div className="flex flex-col gap-7">
      <div className="text-center">
        <h3 className="text-[28px] md:text-[32px] font-bold text-[#101828]">
          Task Setup
        </h3>
        <p className="text-base md:text-lg text-[#667085] mt-2">
          Choose the website that owns the request and define the task title.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="space-y-3">
          <Label className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]">
            Requester Website
          </Label>

          {isWebsitesLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#e9eaeb] bg-[#fafafa] px-5 py-4 text-base text-[#667085]">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading your websites...
            </div>
          ) : websites.length > 0 ? (
            <Select
              value={resolvedWebsiteId}
              onValueChange={(value) => onUpdateField("requesterWebsiteId", value)}
            >
              <SelectTrigger
                className={cn(
                  "min-h-15",
                  fieldErrors.requesterWebsiteId &&
                    "border-[#f04438] focus:border-[#f04438]",
                )}
              >
                <SelectValue placeholder="Select a website" />
              </SelectTrigger>
              <SelectContent>
                {websites.map((website) => (
                  <SelectItem key={website.id} value={website.id}>
                    <div className="flex flex-col">
                      <span className="font-semibold">{website.name}</span>
                      <span className="text-xs text-[#717680]">
                        {website.websiteUrl}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d0d5dd] bg-[#fafafa] p-5">
              <p className="text-base font-semibold text-[#181d27]">
                No websites available yet
              </p>
              <p className="text-sm md:text-base text-[#667085] mt-1.5">
                Connect and verify at least one website before creating a
                requester task.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={openWebsitesPage}
                  className="text-xs md:text-sm"
                >
                  Go to Websites
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={onRefetchWebsites}
                  className="text-xs md:text-sm"
                >
                  {isWebsitesFetching ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          )}

          {fieldErrors.requesterWebsiteId && (
            <p className="text-sm text-[#b42318]">
              {fieldErrors.requesterWebsiteId}
            </p>
          )}

          {websitesErrorMessage && (
            <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-5 py-4 text-sm md:text-base text-[#b42318]">
              <p>{websitesErrorMessage}</p>
              <button
                type="button"
                onClick={onRefetchWebsites}
                className="mt-2 cursor-pointer font-semibold underline underline-offset-2"
              >
                Retry loading websites
              </button>
            </div>
          )}
        </div>

        {selectedWebsite && (
          <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm md:text-base font-bold text-[#181d27]">
                  {selectedWebsite.name}
                </p>
                <p className="text-xs md:text-sm text-[#175cd3] break-all">
                  {selectedWebsite.websiteUrl}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-[#414651] bg-white border border-[#dbeafe] px-2 py-1 rounded-full">
                    {selectedWebsite.industry || "No industry"}
                  </span>
                  <span className="text-[11px] font-semibold text-[#414651] bg-white border border-[#dbeafe] px-2 py-1 rounded-full">
                    {selectedWebsite.country || "No country"}
                  </span>
                  <span className="text-[11px] font-semibold text-[#414651] bg-white border border-[#dbeafe] px-2 py-1 rounded-full">
                    Added{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(selectedWebsite.createdAt))}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide",
                  statusStyles[selectedWebsite.verificationStatus],
                )}
              >
                {selectedWebsite.verificationStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label
            htmlFor={inputIds.projectTitle}
            className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]"
          >
            Project Title
          </Label>
          <Input
            id={inputIds.projectTitle}
            placeholder="Guest post campaign"
            value={formValues.projectTitle}
            onChange={(event) => onUpdateField("projectTitle", event.target.value)}
            className={cn(
              "h-15 rounded-2xl border border-[#d0d5dd] px-5 text-base md:text-lg placeholder:text-[#98a2b3] focus-visible:border-[#fd751f] focus-visible:ring-0",
              fieldErrors.projectTitle &&
                "border-[#f04438] focus:border-[#f04438]",
            )}
          />
          {fieldErrors.projectTitle && (
            <p className="text-sm text-[#b42318]">{fieldErrors.projectTitle}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-[28px] md:text-[32px] font-bold text-[#101828]">
            Placement Preference
          </h4>
          <p className="text-base md:text-lg text-[#667085] mt-2">
            Choose how you want the backlink to be published.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {placementOptions.map((option) => (
            <label
              key={option.id}
              onClick={() => onUpdateField("placementType", option.id)}
              className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${formValues.placementType === option.id ? "border-[#fd751f] bg-[#fff7ed]" : "border-[#e9eaeb] bg-white hover:border-[#fca067]"}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${formValues.placementType === option.id ? "bg-[#fd751f] text-white" : "bg-[#f5f5f5] text-[#717680]"}`}
              >
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-xs md:text-base text-[#181d27]">
                    {option.label}
                  </span>
                  {option.recommended && (
                    <span className="text-[9px] md:text-[10px] font-bold bg-[#fd751f] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-base text-[#717680] mt-0.5">
                  {option.desc}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${formValues.placementType === option.id ? "border-[#fd751f] bg-[#fd751f]" : "border-[#d5d7da]"}`}
              >
                {formValues.placementType === option.id && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#f97316] shrink-0 mt-0.5" />
          <p className="text-sm md:text-base text-[#9a3412]">
            Flexible gives publishers room to suggest the best fit. Use Guest
            Post or Backlink Insertion when you need tighter control over
            fulfillment.
          </p>
        </div>
      </div>
    </div>
  );
}
