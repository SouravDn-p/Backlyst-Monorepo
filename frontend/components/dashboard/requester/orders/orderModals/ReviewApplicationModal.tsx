"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  Info,
  Shield,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import SuccessModal from "@/components/dashboard/SuccessModal";
import { Button } from "@/components/ui/Button";
import { useSelectRequesterTaskProviderMutation } from "@/redux/features/api/requesterTask/requesterTaskApi";
import type { OrderItem } from "../OrderCard";
import type {
  RequesterTaskApplicant,
  SelectRequesterTaskProviderResponse,
} from "@/types/requesterTask/requesterTaskTypes";

type View = "profile" | "confirm" | "success";

interface Props {
  applicant: RequesterTaskApplicant | null;
  open: boolean;
  order: OrderItem;
  onClose: () => void;
  onSelected?: (
    applicant: RequesterTaskApplicant,
    result: SelectRequesterTaskProviderResponse["data"],
  ) => void;
}

function getApiErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return "Something went wrong. Please try again.";
}

function getApplicantName(applicant: RequesterTaskApplicant): string {
  return (
    applicant.providerWebsite?.name ||
    applicant.provider?.name ||
    "Unknown Provider"
  );
}

function getWebsiteLabel(applicant: RequesterTaskApplicant): string {
  return (
    applicant.providerWebsite?.websiteUrl ||
    applicant.providerWebsite?.name ||
    "Website not provided"
  );
}

function getAvatarText(applicant: RequesterTaskApplicant): string {
  return getApplicantName(applicant)
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function formatDate(value?: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReviewApplicationModal({
  applicant,
  open,
  order,
  onClose,
  onSelected,
}: Props) {
  const [view, setView] = useState<View>("profile");
  const [selectProvider, { isLoading: isSelecting }] =
    useSelectRequesterTaskProviderMutation();
  const [selectionResult, setSelectionResult] =
    useState<SelectRequesterTaskProviderResponse["data"] | null>(null);

  if (!applicant) return null;

  const handleClose = () => {
    onClose();

    window.setTimeout(() => {
      setView("profile");
      setSelectionResult(null);
    }, 200);
  };

  const handleConfirm = async () => {
    const loadingToastId = toast.loading("Selecting provider...");

    try {
      const response = await selectProvider({
        taskId: order.taskId,
        applicationId: applicant.id,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Provider selected successfully.");
      setSelectionResult(response.data);
      setView("success");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  if (view === "success" && selectionResult) {
    return (
      <ModalShell open={open} onClose={handleClose} minHeightClass="min-h-0">
        <SuccessModal
          title="Provider Selected"
          message={`${getApplicantName(applicant)} is now assigned to this task. The task has moved into the assigned workflow.`}
          buttonText="RETURN TO TIMELINE"
          onAction={() => {
            onSelected?.(applicant, selectionResult);
            handleClose();
          }}
        >
          <div className="mb-2 w-full space-y-3 rounded-2xl border border-[#e9eaeb] bg-[#f9fafb] p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fd751f] text-sm font-bold text-white">
                {getAvatarText(applicant)}
              </div>
              <div>
                <p className="text-sm font-bold text-[#181d27]">
                  {getApplicantName(applicant)}
                </p>
                <p className="text-xs text-[#667085]">{getWebsiteLabel(applicant)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#e9eaeb] pt-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-[#9DA4AE]">
                Delivery Deadline
              </span>
              <span className="font-bold text-[#181d27]">
                {formatDate(selectionResult.deliveryDeadline)}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803d]" />
              <p className="text-xs font-semibold uppercase tracking-wide text-[#15803d]">
                Escrow protection remains active
              </p>
            </div>
          </div>
        </SuccessModal>
      </ModalShell>
    );
  }

  if (view === "confirm") {
    return (
      <ModalShell open={open} onClose={() => setView("profile")} minHeightClass="min-h-0">
        <div className="flex max-h-[88vh] flex-col">
          <div className="border-b border-[#f0f0f0] px-4 pb-4 pt-5 md:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fd751f] text-sm font-bold text-white">
                {getAvatarText(applicant)}
              </div>
              <div>
                <p className="text-base font-bold text-[#181d27]">
                  Confirm Provider Selection
                </p>
                <p className="mt-0.5 text-xs text-[#717680]">
                  You are about to assign {getApplicantName(applicant)} to{" "}
                  {order.name}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6">
            <div className="rounded-2xl border border-[#e9eaeb] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4ed] text-sm font-bold text-secondary">
                  {getAvatarText(applicant)}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#181d27]">
                    {getApplicantName(applicant)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#667085]">
                    {getWebsiteLabel(applicant)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoPill
                  label="Domain Rating"
                  value={
                    typeof applicant.domainRating === "number"
                      ? String(applicant.domainRating)
                      : "Not shared"
                  }
                />
                <InfoPill
                  label="Applied On"
                  value={formatDate(applicant.createdAt)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#e9eaeb] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#717680]">
                Provider Note
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#414651]">
                {applicant.note?.trim() ||
                  "No custom note was provided with this application."}
              </p>
            </div>

            <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <p className="text-xs leading-relaxed text-[#9a3412]">
                  Selecting this provider assigns the task immediately and starts
                  the delivery deadline window returned by the platform.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#f0f0f0] bg-[#fafafa] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <button
              onClick={() => setView("profile")}
              className="text-left text-sm font-semibold text-[#717680] transition-colors hover:text-[#414651]"
            >
              Back to profile
            </button>
            <Button
              variant="secondary"
              onClick={handleConfirm}
              className="h-11 w-full text-xs md:w-auto md:text-sm"
              disabled={isSelecting}
            >
              <Check className="h-4 w-4" />
              {isSelecting ? "SELECTING..." : "CONFIRM SELECTION"}
            </Button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell open={open} onClose={handleClose} minHeightClass="min-h-0">
      <div className="flex max-h-[88vh] flex-col">
        <div className="border-b border-[#f0f0f0] px-4 pb-4 pt-5 md:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fd751f] text-sm font-bold text-white">
                {getAvatarText(applicant)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-[#181d27]">
                    {getApplicantName(applicant)}
                  </p>
                  {applicant.providerWebsite && (
                    <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#15803d]">
                      Verified Website
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#717680]">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
                    <span className="font-semibold text-[#181d27]">
                      {typeof applicant.rating === "number"
                        ? applicant.rating.toFixed(1)
                        : "4.8"}
                    </span>
                  </span>
                  <span>
                    ({typeof applicant.reviews === "number" ? applicant.reviews : 0} reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileStat
              icon={Globe}
              label="Website"
              value={getWebsiteLabel(applicant)}
            />
            <ProfileStat
              icon={Shield}
              label="Domain Rating"
              value={
                typeof applicant.domainRating === "number"
                  ? `${applicant.domainRating}`
                  : "Not provided"
              }
            />
          </div>

          <div className="rounded-2xl border border-[#e9eaeb] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#717680]">
              Application Note
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#414651]">
              {applicant.note?.trim() ||
                "This provider applied without an additional note."}
            </p>
          </div>

          <div className="rounded-2xl border border-[#e9eaeb] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#717680]">
              Fit Snapshot
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#414651]">
                Applied {formatDate(applicant.createdAt)}
              </span>
              {applicant.providerWebsite?.industry && (
                <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#414651]">
                  {applicant.providerWebsite.industry}
                </span>
              )}
              {applicant.providerWebsite?.country && (
                <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#414651]">
                  {applicant.providerWebsite.country}
                </span>
              )}
              {(applicant.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#fff4ed] px-3 py-1 text-xs font-semibold text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#d5d7da] bg-[#f9fafb] p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#667085]" />
              <p className="text-xs leading-relaxed text-[#475467]">
                The requester selection step assigns this application and moves
                the task into the active delivery workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#f0f0f0] bg-[#fafafa] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <button
            onClick={handleClose}
            className="text-left text-sm font-semibold text-[#717680] transition-colors hover:text-[#414651]"
          >
            Close profile
          </button>
          <Button
            variant="secondary"
            onClick={() => setView("confirm")}
            className="h-11 w-full text-xs md:w-auto md:text-sm"
          >
            SELECT PROVIDER
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ProfileStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e9eaeb] bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-secondary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#717680]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-sm font-semibold text-[#181d27]">{value}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e9eaeb] bg-[#f9fafb] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#9DA4AE]">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-[#181d27]">{value}</p>
    </div>
  );
}
