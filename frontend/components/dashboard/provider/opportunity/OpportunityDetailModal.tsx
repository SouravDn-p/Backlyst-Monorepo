"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Globe,
  Loader2,
  Plus,
  ShieldCheck,
  Star,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import {
  formatCredits,
  formatDomain,
  formatDueDate,
  formatLifecycleStatus,
  formatLinkAttribute,
  formatPlacementType,
  getApiErrorMessage,
  getTimeLeft,
} from "@/components/dashboard/provider/providerTaskHelpers";
import { useGetProviderTaskDetailQuery } from "@/redux/features/api/providerTask/providerTaskApi";
import type { ProviderTask } from "@/types/providerTask/providerTaskTypes";
import type { Website } from "@/types/website/websiteTypes";

interface OpportunityDetailModalProps {
  isApplying: boolean;
  isOpen: boolean;
  onApply: (values: { providerWebsiteId: string; note: string }) => void;
  onClose: () => void;
  opportunity: ProviderTask;
  providerWebsites: Website[];
}

export function OpportunityDetailModal({
  isApplying,
  isOpen,
  onApply,
  onClose,
  opportunity,
  providerWebsites,
}: OpportunityDetailModalProps) {
  const [providerWebsiteId, setProviderWebsiteId] = useState("");
  const [note, setNote] = useState("");

  const {
    data: detailResponse,
    error: detailError,
    isFetching: isFetchingDetail,
    isLoading: isLoadingDetail,
  } = useGetProviderTaskDetailQuery(opportunity.id, {
    skip: !isOpen || !opportunity.id,
  });

  const resolvedOpportunity = detailResponse?.data ?? opportunity;
  const effectiveProviderWebsiteId =
    providerWebsiteId || providerWebsites[0]?.id || "";
  const selectedWebsite = useMemo(
    () =>
      providerWebsites.find(
        (website) => website.id === effectiveProviderWebsiteId,
      ) ?? null,
    [effectiveProviderWebsiteId, providerWebsites],
  );

  useEffect(() => {
    if (detailError && isOpen) {
      toast.error(getApiErrorMessage(detailError));
    }
  }, [detailError, isOpen]);

  if (!isOpen) return null;

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      widthClass="max-w-6xl"
      minHeightClass="min-h-0"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-[#eaecf0] px-6 pb-6 pt-6 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between px-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfdf3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#027a48]">
                <ShieldCheck className="h-3.5 w-3.5" />
                {formatLifecycleStatus(resolvedOpportunity.lifecycleStatus)}
              </div>
              <h2 className="mt-4 text-2xl font-bold text-[#101828] md:text-3xl leading-tight">
                {resolvedOpportunity.projectTitle}
              </h2>
              <p className="mt-2 text-sm text-[#667085]">
                {formatDomain(resolvedOpportunity.targetUrl)}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#667085]">
                <span className="font-semibold text-[#101828]">
                  {resolvedOpportunity.requester?.name ||
                    resolvedOpportunity.requesterWebsite?.name ||
                    "Verified Requester"}
                </span>
                {resolvedOpportunity.requester?.email && (
                  <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#475467]">
                    {resolvedOpportunity.requester.email}
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#475467]">
                  <Star className="h-3.5 w-3.5 fill-[#fdb022] text-[#fdb022]" />
                  {resolvedOpportunity.requesterRating?.toFixed(1) || "4.9"}
                  <span className="text-[#98a2b3]">
                    ({resolvedOpportunity.requesterReviewCount ?? 0})
                  </span>
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#d0d5dd] bg-[#fcfcfd] p-5  md:min-w-[280px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                Estimated Reward
              </p>
              <p className="mt-2 text-3xl font-bold text-[#027a48]">
                {formatCredits(resolvedOpportunity)}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <MiniStat
                  label="Applicants"
                  value={String(resolvedOpportunity.applicationsCount ?? 0)}
                />
                <MiniStat
                  label="Time Left"
                  value={getTimeLeft(resolvedOpportunity)}
                />
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Placement Type"
              value={formatPlacementType(resolvedOpportunity.placementType)}
            />
            <MetricCard
              label="Link Attribute"
              value={formatLinkAttribute(resolvedOpportunity.linkAttribute)}
            />
            <MetricCard
              label="Deadline"
              value={formatDueDate(resolvedOpportunity)}
            />
            <MetricCard
              label="Required DR"
              value={
                typeof resolvedOpportunity.requiredDomainRating === "number"
                  ? `DR ${resolvedOpportunity.requiredDomainRating}+`
                  : "No minimum"
              }
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          {(isLoadingDetail || isFetchingDetail) && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm font-medium text-[#c4320a]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading latest opportunity details...
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Left Column - Task Info */}
            <section className="space-y-6">
              <div className="rounded-[28px] border border-[#eaecf0] bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                <div className="flex items-center gap-2 text-[#344054]">
                  <Globe className="h-5 w-5 text-[#fd751f]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                    TASK SNAPSHOT
                  </p>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <DetailPair
                    label="Target URL"
                    value={resolvedOpportunity.targetUrl}
                    link={resolvedOpportunity.targetUrl}
                  />
                  <DetailPair
                    label="Anchor Text"
                    value={resolvedOpportunity.anchorText}
                  />
                  <DetailPair
                    label="Requester"
                    value={
                      resolvedOpportunity.requester?.name ||
                      resolvedOpportunity.requesterWebsite?.name ||
                      "Not provided"
                    }
                  />
                  <DetailPair
                    label="Requester Email"
                    value={resolvedOpportunity.requester?.email || "Not provided"}
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-[#eaecf0] bg-[#fffaf5] p-6 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                <div className="flex items-center gap-2 text-[#344054]">
                  <Clock className="h-5 w-5 text-[#fd751f]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                    PLACEMENT GUIDELINES
                  </p>
                </div>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#475467]">
                  {resolvedOpportunity.placementGuidelines?.trim() ||
                    "No extra instructions were provided. Deliver a clean, contextual placement that matches the target page and anchor intent."}
                </p>

                <div className="mt-6 rounded-2xl border border-[#fde68a] bg-[#fff7ed] px-5 py-4 text-sm text-[#9a3412]">
                  {resolvedOpportunity.lateAt
                    ? "This opportunity is marked as late. Confirm your timeline before applying."
                    : "The opportunity is still open for providers who can meet the requested timeline."}
                </div>
              </div>
            </section>

            {/* Right Column - Apply Section */}
            <aside className="space-y-6">
              <div className="rounded-[28px] border border-[#eaecf0] bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
                <div className="flex items-center gap-2 text-[#344054]">
                  <TimerReset className="h-5 w-5 text-[#fd751f]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                    APPLY WITH YOUR WEBSITE
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                      PROVIDER WEBSITE
                    </label>
                    <Select
                      disabled={providerWebsites.length === 0}
                      value={providerWebsites.length > 0 ? effectiveProviderWebsiteId : undefined}
                      onValueChange={setProviderWebsiteId}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Select a verified website" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerWebsites.map((website) => (
                          <SelectItem key={website.id} value={website.id}>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#101828]">
                                {website.name}
                              </span>
                              <span className="text-xs text-[#667085]">
                                {website.websiteUrl}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {providerWebsites.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      You need at least one verified provider website before applying.
                    </div>
                  ) : selectedWebsite ? (
                    <div className="rounded-2xl border border-[#f2f4f7] bg-[#fcfcfd] px-5 py-4">
                      <p className="font-semibold text-[#101828]">{selectedWebsite.name}</p>
                      <p className="text-xs text-[#667085] mt-1">{selectedWebsite.websiteUrl}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedWebsite.industry && (
                          <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#475467]">
                            {selectedWebsite.industry}
                          </span>
                        )}
                        {selectedWebsite.country && (
                          <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#475467]">
                            {selectedWebsite.country}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                      SHORT NOTE
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={6}
                      placeholder="Mention turnaround, editorial fit, or anything the requester should know..."
                      className="w-full resize-none rounded-2xl border border-[#d0d5dd] bg-white px-4 py-3.5 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#eaecf0] bg-[#fcfcfd] p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
                  FINAL CHECKLIST
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-[#475467]">
                  <li>• Use a verified website that matches the opportunity</li>
                  <li>• Confirm anchor text and target URL</li>
                  <li>• Keep the note professional and concise</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#eaecf0] bg-[#fcfcfd] px-6 py-5 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Button
            onClick={onClose}
            variant="white"
            className="rounded-2xl px-8 py-3"
          >
            Close Overview
          </Button>

          <Button
            variant="secondary"
            className="rounded-2xl px-8 py-3 text-sm font-semibold flex items-center gap-2"
            onClick={() =>
              onApply({
                note: note.trim(),
                providerWebsiteId: effectiveProviderWebsiteId,
              })
            }
            disabled={isApplying || !effectiveProviderWebsiteId || providerWebsites.length === 0}
          >
            <Plus className="h-4 w-4" />
            {isApplying ? "Submitting Application..." : "Apply For The Task"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Reusable Components ───────────────────────────────────── */

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[#eaecf0] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
        {label}
      </p>
      <p className="mt-3 text-sm font-semibold text-[#101828]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eaecf0] bg-white px-4 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#667085]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#101828]">{value}</p>
    </div>
  );
}

function DetailPair({
  label,
  link,
  value,
}: {
  label: string;
  link?: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
        {label}
      </p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-semibold text-[#175cd3] hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm font-semibold text-[#101828]">{value}</p>
      )}
    </div>
  );
}