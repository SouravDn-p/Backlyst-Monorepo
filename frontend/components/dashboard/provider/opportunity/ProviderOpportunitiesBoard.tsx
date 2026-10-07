"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleAlert,
  Globe,
  Loader2,
  Search,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpportunityDetailModal } from "./OpportunityDetailModal";
import OpportunitySuccessModal from "./OpportunitySuccessModal";
import {
  useApplyToProviderTaskMutation,
  useGetProviderOpportunitiesQuery,
} from "@/redux/features/api/providerTask/providerTaskApi";
import { useGetMyWebsitesQuery } from "@/redux/features/api/website/websiteApi";
import {
  formatCredits,
  formatDomain,
  formatDueDate,
  formatLifecycleStatus,
  formatPlacementType,
  getApiErrorMessage,
  getTimeLeft,
} from "@/components/dashboard/provider/providerTaskHelpers";
import {
  ProviderOpportunityStatus,
  ProviderTaskLinkAttribute,
  ProviderTaskPlacementType,
  type GetProviderOpportunitiesRequest,
  type ProviderTask,
} from "@/types/providerTask/providerTaskTypes";
import { WebsiteVerificationStatus } from "@/types/website/websiteTypes";

const DEFAULT_LIMIT = 8;

const placementFilterOptions = [
  { label: "All placements", value: "ALL" },
  { label: "Guest post", value: ProviderTaskPlacementType.GUEST_POST },
  {
    label: "Backlink insertion",
    value: ProviderTaskPlacementType.BACKLINK_INSERTION,
  },
  { label: "Flexible", value: ProviderTaskPlacementType.FLEXIBLE },
];

const linkFilterOptions = [
  { label: "All link types", value: "ALL" },
  { label: "Dofollow", value: ProviderTaskLinkAttribute.DOFOLLOW },
  { label: "Nofollow", value: ProviderTaskLinkAttribute.NOFOLLOW },
  { label: "UGC", value: ProviderTaskLinkAttribute.UGC },
  { label: "Sponsored", value: ProviderTaskLinkAttribute.SPONSORED },
];

const statusFilterOptions = [
  { label: "All open tasks", value: "ALL" },
  { label: "Open", value: ProviderOpportunityStatus.OPEN },
  {
    label: "Waiting for applicants",
    value: ProviderOpportunityStatus.WAITING_FOR_APPLICANTS,
  },
];

export default function ProviderOpportunitiesBoard() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [placementType, setPlacementType] = useState<string>("ALL");
  const [linkAttribute, setLinkAttribute] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<ProviderTask | null>(null);
  const [successRequesterName, setSuccessRequesterName] = useState("");

  const queryParams: GetProviderOpportunitiesRequest = {
    limit: DEFAULT_LIMIT,
    page,
    placementType:
      placementType === "ALL"
        ? undefined
        : (placementType as ProviderTaskPlacementType),
    linkAttribute:
      linkAttribute === "ALL"
        ? undefined
        : (linkAttribute as ProviderTaskLinkAttribute),
    status:
      status === "ALL" ? undefined : (status as ProviderOpportunityStatus),
  };

  const {
    data: opportunitiesResponse,
    error: opportunitiesError,
    isFetching: isFetchingOpportunities,
    isLoading: isLoadingOpportunities,
  } = useGetProviderOpportunitiesQuery(queryParams);
  const {
    data: websitesResponse,
    error: websitesError,
    isLoading: isLoadingWebsites,
  } = useGetMyWebsitesQuery({
    page: 1,
    limit: 100,
    verificationStatus: WebsiteVerificationStatus.VERIFIED,
  });
  const [applyToProviderTask, { isLoading: isApplying }] =
    useApplyToProviderTaskMutation();

  useEffect(() => {
    if (opportunitiesError) {
      toast.error(getApiErrorMessage(opportunitiesError));
    }
  }, [opportunitiesError]);

  useEffect(() => {
    if (websitesError) {
      toast.error(getApiErrorMessage(websitesError));
    }
  }, [websitesError]);

  const providerWebsites = useMemo(
    () => websitesResponse?.data?.data ?? [],
    [websitesResponse],
  );
  const opportunities = useMemo(
    () => opportunitiesResponse?.data?.items ?? opportunitiesResponse?.data?.data ?? [],
    [opportunitiesResponse],
  );
  const meta = opportunitiesResponse?.data?.meta;
  const currentPage = meta?.currentPage ?? meta?.page ?? page;
  const totalItems = meta?.totalItems ?? opportunities.length;
  const pageItemCount =
    meta?.pageItemCount ?? opportunities.length;

  const filteredOpportunities = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      if (!normalizedSearch) return true;

      return [
        opportunity.projectTitle,
        opportunity.anchorText,
        opportunity.requester?.name ?? "",
        opportunity.requester?.email ?? "",
        opportunity.requesterWebsite?.name ?? "",
        opportunity.requesterWebsite?.websiteUrl ?? "",
        opportunity.targetUrl,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [opportunities, searchQuery]);

  const handleApply = async ({
    note,
    providerWebsiteId,
  }: {
    note: string;
    providerWebsiteId: string;
  }) => {
    if (!selectedOpportunity) return;

    const loadingToastId = toast.loading("Submitting application...");

    try {
      const response = await applyToProviderTask({
        taskId: selectedOpportunity.id,
        providerWebsiteId,
        note: note || undefined,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(response.message || "Applied successfully.");
      setSuccessRequesterName(
        selectedOpportunity.requester?.name ||
          selectedOpportunity.requesterWebsite?.name ||
          "the requester",
      );
      setSelectedOpportunity(null);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="flex w-full max-w-[90vw] flex-col gap-2 lg:max-w-[72vw] 2xl:max-w-[80vw]">
      <div className="">
        <div className="flex flex-col gap-6 px-5 md:px-0 py-6 md:py-0">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-[#181d27] lg:text-3xl">
                  Opportunity Board
                </h1>
                <p className="mt-1 text-base font-medium text-[#535862]">
                  Review open placement requests, match them to your verified
                  websites, and apply without leaving the workflow.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-[#f5f5f5] p-3 lg:items-center">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
                <CircleAlert className="h-4 w-4 text-[#2AB516]" />
              </div>
              <p className="text-sm text-[#535862] lg:text-md">
                Browse live opportunities, compare fit, and apply from your
                verified provider websites. All applications and fulfillment stay
                inside the task workflow.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_2.05fr]">
        <div className="rounded-[28px] border border-[#eaecf0] bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-[#fd751f]" />
              <h2 className="text-lg font-bold text-[#101828]">Filters</h2>
            </div>
            <button
              type="button"
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a2b3]"
              onClick={() => {
                setPlacementType("ALL");
                setLinkAttribute("ALL");
                setStatus("ALL");
                setSearchQuery("");
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="Results on page" value={String(pageItemCount)} />
            <StatCard label="Total results" value={String(totalItems)} />
            <StatCard
              label="Verified websites"
              value={String(providerWebsites.length)}
            />
          </div>

          <div className="mt-5 space-y-4">
            <FilterSelect
              label="Placement Type"
              value={placementType}
              onChange={(value) => {
                setPlacementType(value);
                setPage(1);
              }}
              options={placementFilterOptions}
            />
            <FilterSelect
              label="Link Attribute"
              value={linkAttribute}
              onChange={(value) => {
                setLinkAttribute(value);
                setPage(1);
              }}
              options={linkFilterOptions}
            />
            <FilterSelect
              label="Task Status"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={statusFilterOptions}
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-[#f2f4f7] bg-[#fcfcfd] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
              Website readiness
            </p>
            <p className="mt-3 text-sm leading-6 text-[#475467]">
              {providerWebsites.length > 0
                ? `${providerWebsites.length} verified website${providerWebsites.length === 1 ? "" : "s"} available for applications.`
                : "No verified provider websites found yet. Connect and verify a website before applying."}
            </p>
            {providerWebsites.length === 0 && !isLoadingWebsites && (
              <Button
                variant="secondary"
                className="mt-4 w-full rounded-2xl"
                onClick={() => router.push("/dashboard/websites")}
              >
                Open Websites
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[28px] border border-[#eaecf0] bg-white p-4 shadow-[0_12px_40px_rgba(16,24,40,0.04)] md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#98a2b3]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, website, anchor, or URL..."
                className="h-14 w-full rounded-2xl border border-[#e4e7ec] bg-[#fcfcfd] pl-12 pr-4 text-sm text-[#101828] outline-none transition focus:border-[#fd751f]"
              />
            </div>
            <div className="rounded-full bg-[#fff7ed] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c4320a]">
              {isFetchingOpportunities
                ? "Refreshing..."
                : `${filteredOpportunities.length} on page ${currentPage}`}
            </div>
          </div>

          {isLoadingOpportunities || isLoadingWebsites ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-[#eaecf0] bg-white">
              <div className="flex items-center gap-3 text-sm font-medium text-[#667085]">
                <Loader2 className="h-5 w-5 animate-spin text-[#fd751f]" />
                Loading provider opportunities...
              </div>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#d0d5dd] bg-white px-6 py-16 text-center">
              <p className="text-lg font-semibold text-[#101828]">
                No opportunities match the current filters.
              </p>
              <p className="mt-2 text-sm text-[#667085]">
                Reset the filters or try a broader search to surface more open
                tasks.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 2xl:grid-cols-2">
              {filteredOpportunities.map((opportunity) => (
                <article
                  key={opportunity.id}
                  className="group rounded-[28px] border border-[#eaecf0] bg-white p-5 shadow-[0_12px_40px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(16,24,40,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#027a48]">
                          {formatPlacementType(opportunity.placementType)}
                        </span>
                        <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#475467]">
                          {opportunity.linkAttribute}
                        </span>
                      </div>
                      <h3 className="mt-4 text-xl font-bold text-[#101828]">
                        {opportunity.projectTitle}
                      </h3>
                      <p className="mt-2 text-sm text-[#667085]">
                        {opportunity.requester?.name ||
                          opportunity.requesterWebsite?.name ||
                          formatDomain(opportunity.targetUrl)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#f2f4f7] bg-[#fcfcfd] px-3 py-2 text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a2b3]">
                        Window
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#101828]">
                        {getTimeLeft(opportunity)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[24px] bg-[#f8fafc] p-4">
                    <div className="flex items-center gap-2 text-[#fd751f]">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        {formatDomain(opportunity.targetUrl)}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#475467]">
                      {opportunity.placementGuidelines?.trim() ||
                        `Anchor text: ${opportunity.anchorText}. Publish a contextual placement that aligns with the target URL and requester standards.`}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#027a48]">
                      {formatLifecycleStatus(opportunity.lifecycleStatus)}
                    </span>
                    <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#c4320a]">
                      Due {formatDueDate(opportunity)}
                    </span>
                    <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#475467]">
                      Anchor: {opportunity.anchorText}
                    </span>
                    {typeof opportunity.requiredDomainRating === "number" && (
                      <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#027a48]">
                        DR {opportunity.requiredDomainRating}+
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a2b3]">
                        Estimated Reward
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#027a48]">
                        {formatCredits(opportunity)}
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      className="rounded-2xl px-5 py-3"
                      onClick={() => setSelectedOpportunity(opportunity)}
                    >
                      View Details & Apply
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {(meta?.totalPages ?? 1) > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {selectedOpportunity && (
        <OpportunityDetailModal
          key={selectedOpportunity.id}
          isApplying={isApplying}
          isOpen={!!selectedOpportunity}
          onApply={handleApply}
          onClose={() => setSelectedOpportunity(null)}
          opportunity={selectedOpportunity}
          providerWebsites={providerWebsites}
        />
      )}

      <OpportunitySuccessModal
        isOpen={!!successRequesterName}
        onClose={() => setSuccessRequesterName("")}
        requesterName={successRequesterName}
      />
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#667085]">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#f2f4f7] bg-[#fcfcfd] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a2b3]">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-[#101828]">{value}</p>
    </div>
  );
}
