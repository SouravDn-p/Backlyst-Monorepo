"use client";

import { ArrowRight, Calendar, Link2 } from "lucide-react";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  RequesterTaskDeadlineDays,
  RequesterTaskLinkAttribute,
  RequesterTaskWalletType,
} from "@/types/requesterTask/requesterTaskTypes";
import type { TaskFormField, TaskFormValues } from "./types";

interface SelectOption<TValue extends string | number> {
  value: TValue;
  label: string;
  description: string;
}

interface CreateTaskStepTwoProps {
  deadlineOptions: SelectOption<RequesterTaskDeadlineDays>[];
  fieldErrors: Partial<Record<TaskFormField, string>>;
  formValues: TaskFormValues;
  inputIds: {
    anchorText: string;
    placementGuidelines: string;
    requiredDomainRating: string;
    targetUrl: string;
  };
  linkAttributeOptions: SelectOption<RequesterTaskLinkAttribute>[];
  onUpdateField: <K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) => void;
  walletOptions: SelectOption<RequesterTaskWalletType>[];
}

export default function CreateTaskStepTwo({
  deadlineOptions,
  fieldErrors,
  formValues,
  inputIds,
  linkAttributeOptions,
  onUpdateField,
  walletOptions,
}: CreateTaskStepTwoProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-5">
        <div className="space-y-3">
          <Label
            htmlFor={inputIds.targetUrl}
            className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]"
          >
            Target URL (Destination)
          </Label>
          <div
            className={cn(
              "flex items-center gap-3 border rounded-2xl px-4 md:px-5 py-4 bg-white transition-colors",
              fieldErrors.targetUrl
                ? "border-[#f04438]"
                : "border-[#d0d5dd] focus-within:border-[#fd751f]",
            )}
          >
            <Link2 className="w-4 h-4 text-[#a4a7ae] shrink-0" />
            <input
              id={inputIds.targetUrl}
              type="url"
              placeholder="https://example.com/seo-article"
              value={formValues.targetUrl}
              onChange={(event) => onUpdateField("targetUrl", event.target.value)}
              className="flex-1 text-sm md:text-base text-[#181d27] outline-none bg-transparent placeholder-[#a4a7ae]"
            />
          </div>
          {fieldErrors.targetUrl && (
            <p className="text-sm text-[#b42318]">{fieldErrors.targetUrl}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label
              htmlFor={inputIds.anchorText}
              className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]"
            >
              Primary Anchor Text
            </Label>
            <div
              className={cn(
                "flex items-center gap-2 border rounded-2xl px-4 py-4 bg-[#fafafa] transition-colors",
                fieldErrors.anchorText
                  ? "border-[#f04438]"
                  : "border-[#d0d5dd] focus-within:border-[#fd751f]",
              )}
            >
              <ArrowRight className="w-4 h-4 rotate-45 text-[#a4a7ae] shrink-0" />
              <input
                id={inputIds.anchorText}
                type="text"
                placeholder="best seo"
                value={formValues.anchorText}
                onChange={(event) =>
                  onUpdateField("anchorText", event.target.value)
                }
                className="flex-1 text-sm md:text-base text-[#181d27] outline-none bg-transparent placeholder-[#a4a7ae]"
              />
            </div>
            {fieldErrors.anchorText && (
              <p className="text-sm text-[#b42318]">{fieldErrors.anchorText}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label
              htmlFor={inputIds.requiredDomainRating}
              className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]"
            >
              Required Domain Rating
            </Label>
            <div
              className={cn(
                "flex items-center gap-2 border rounded-2xl px-4 py-4 bg-[#fafafa] transition-colors",
                fieldErrors.requiredDomainRating
                  ? "border-[#f04438]"
                  : "border-[#d0d5dd] focus-within:border-[#fd751f]",
              )}
            >
              <input
                id={inputIds.requiredDomainRating}
                type="number"
                min="1"
                max="100"
                placeholder="40"
                value={formValues.requiredDomainRating}
                onChange={(event) =>
                  onUpdateField("requiredDomainRating", event.target.value)
                }
                className="flex-1 text-sm md:text-base text-[#181d27] outline-none bg-transparent placeholder-[#a4a7ae]"
              />
            </div>
            {fieldErrors.requiredDomainRating && (
              <p className="text-sm text-[#b42318]">
                {fieldErrors.requiredDomainRating}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label
            htmlFor={inputIds.placementGuidelines}
            className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]"
          >
            Placement Guidelines
          </Label>
          <textarea
            id={inputIds.placementGuidelines}
            rows={5}
            placeholder="Optional notes for preferred content context, disallowed sites, tone, or editorial expectations..."
            value={formValues.placementGuidelines}
            onChange={(event) =>
              onUpdateField("placementGuidelines", event.target.value)
            }
            className="w-full rounded-2xl border border-[#d0d5dd] bg-[#fafafa] px-4 py-4 text-sm md:text-base text-[#181d27] outline-none transition-colors placeholder:text-[#a4a7ae] focus:border-[#fd751f]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <Label className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]">
              Link Attribute
            </Label>
            <Select
              value={formValues.linkAttribute}
              onValueChange={(value: RequesterTaskLinkAttribute) =>
                onUpdateField("linkAttribute", value)
              }
            >
              <SelectTrigger className="min-h-15 border border-[#d0d5dd] px-5 focus:border-[#fd751f]">
                <SelectValue placeholder="Choose a link attribute" />
              </SelectTrigger>
              <SelectContent>
                {linkAttributeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-xs text-[#717680]">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]">
              Requested Deadline
            </Label>
            <Select
              value={formValues.requestedDeadlineDays}
              onValueChange={(value) =>
                onUpdateField(
                  "requestedDeadlineDays",
                  value as TaskFormValues["requestedDeadlineDays"],
                )
              }
            >
              <SelectTrigger className="min-h-15 border border-[#d0d5dd] px-5 focus:border-[#fd751f]">
                <SelectValue placeholder="Choose deadline" />
              </SelectTrigger>
              <SelectContent>
                {deadlineOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    <div className="flex flex-col">
                      <span className="font-semibold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#667085]" />
                        {option.label}
                      </span>
                      <span className="text-xs text-[#717680]">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.requestedDeadlineDays && (
              <p className="text-sm text-[#b42318]">
                {fieldErrors.requestedDeadlineDays}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-[#344054]">
              Wallet Type
            </Label>
            <Select
              value={formValues.walletType}
              onValueChange={(value: RequesterTaskWalletType) =>
                onUpdateField("walletType", value)
              }
            >
              <SelectTrigger className="min-h-15 border border-[#d0d5dd] px-5 focus:border-[#fd751f]">
                <SelectValue placeholder="Choose a wallet source" />
              </SelectTrigger>
              <SelectContent>
                {walletOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-xs text-[#717680]">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
