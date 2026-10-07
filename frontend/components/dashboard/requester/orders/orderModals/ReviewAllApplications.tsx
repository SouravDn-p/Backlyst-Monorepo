"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  FileText,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import Pagination from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import ReviewApplicationModal from "@/components/dashboard/requester/orders/orderModals/ReviewApplicationModal";
import {
  useGetRequesterTaskApplicantsQuery,
  useGetRequesterTaskQuery,
  useGetRequesterTaskTimelineQuery,
} from "@/redux/features/api/requesterTask/requesterTaskApi";
import {
  getRequesterTaskApplicantsCount,
  getRequesterTaskProvider,
} from "../requesterTaskOrderHelpers";
import type { OrderItem } from "../OrderCard";
import type {
  RequesterTask,
  RequesterTaskApplicant,
  RequesterTaskListMeta,
  RequesterTaskPlacementApplication,
  RequesterTaskTimelineEvent,
} from "@/types/requesterTask/requesterTaskTypes";

type Tab = "summary" | "applicants" | "timeline";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "SUMMARY", icon: FileText },
  { id: "applicants", label: "APPLICANTS", icon: Users },
  { id: "timeline", label: "TIMELINE", icon: Clock },
];

type Props = { order: OrderItem; open: boolean; onClose: () => void };

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

function formatDateTime(value?: string | null): string {
  if (!value) return "Pending";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
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
    applicant.providerWebsiteId ||
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

function mapPlacementApplication(
  application: RequesterTaskPlacementApplication,
): RequesterTaskApplicant {
  return {
    id: application.id,
    placementTaskId: application.placementTaskId,
    providerId: application.providerId,
    providerWebsiteId: application.providerWebsiteId,
    status: application.status,
    note: application.note,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    provider: application.provider
      ? {
          id: application.provider.id,
          name: application.provider.name,
          email: application.provider.email,
          imageUrl: application.provider.imageUrl ?? null,
          imageKey: application.provider.imageKey ?? null,
          role: application.provider.role ?? null,
        }
      : null,
    providerWebsite: application.providerWebsite ?? null,
    domainRating: application.domainRating ?? null,
    rating: application.rating ?? null,
    reviews: application.reviews ?? null,
    tags: application.tags ?? [],
  };
}

function normalizeTimeline(
  responseData:
    | RequesterTaskTimelineEvent[]
    | { data: RequesterTaskTimelineEvent[] }
    | undefined,
  task: RequesterTask | undefined,
  applicantsCount: number,
): RequesterTaskTimelineEvent[] {
  if (Array.isArray(responseData) && responseData.length > 0) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData &&
    Array.isArray(responseData.data) &&
    responseData.data.length > 0
  ) {
    return responseData.data;
  }

  if (task?.taskFlows?.length) {
    return task.taskFlows;
  }

  if (task?.timeline?.length) {
    return task.timeline;
  }

  const fallback: RequesterTaskTimelineEvent[] = [
    {
      id: "created",
      label: "Placement Task Created",
      createdAt: task?.createdAt,
      description: "The task was published to the marketplace.",
    },
  ];

  if (applicantsCount > 0) {
    fallback.push({
      id: "applications",
      label: "Providers Applied",
      description: `${applicantsCount} application${applicantsCount === 1 ? "" : "s"} received.`,
    });
  }

  if (task?.selectedApplicationId) {
    fallback.push({
      id: "selected",
      label: "Provider Selected",
      createdAt: task.updatedAt ?? task.deliveryDeadline ?? undefined,
      description: "A provider was assigned and the task moved into delivery.",
    });
  }

  return fallback;
}

export default function ReviewAllApplications({ order, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("applicants");
  const [selectedApplicant, setSelectedApplicant] =
    useState<RequesterTaskApplicant | null>(null);
  const [page, setPage] = useState(1);

  const {
    data: taskResponse,
    error: taskError,
    refetch: refetchTask,
  } = useGetRequesterTaskQuery(order.taskId, {
    skip: !open,
  });
  const {
    data: applicantsResponse,
    error: applicantsError,
    isFetching: isFetchingApplicants,
    isLoading: isLoadingApplicants,
    refetch: refetchApplicants,
  } = useGetRequesterTaskApplicantsQuery(
    {
      taskId: order.taskId,
      page,
      limit: 6,
    },
    {
      skip: !open || (taskResponse?.data?.placementApplications?.length ?? 0) > 0,
    },
  );
  const {
    data: timelineResponse,
    error: timelineError,
    refetch: refetchTimeline,
  } = useGetRequesterTaskTimelineQuery(order.taskId, {
    skip: !open,
  });

  useEffect(() => {
    if (taskError) {
      toast.error(getApiErrorMessage(taskError));
    }
  }, [taskError]);

  useEffect(() => {
    if (applicantsError) {
      toast.error(getApiErrorMessage(applicantsError));
    }
  }, [applicantsError]);

  useEffect(() => {
    if (timelineError) {
      toast.error(getApiErrorMessage(timelineError));
    }
  }, [timelineError]);

  const task = taskResponse?.data ?? order.rawTask;
  const applicantsFromTask = useMemo(
    () =>
      task?.placementApplications?.map(mapPlacementApplication) ?? [],
    [task],
  );
  const fallbackApplicants = useMemo(
    () => applicantsResponse?.data?.items ?? [],
    [applicantsResponse],
  );
  const usingTaskApplicants = applicantsFromTask.length > 0;
  const applicants = usingTaskApplicants ? applicantsFromTask : fallbackApplicants;
  const applicantsMeta = usingTaskApplicants ? undefined : applicantsResponse?.data?.meta;
  const applicantsCount =
    getRequesterTaskApplicantsCount(task) || order.applicants || applicants.length;
  const timeline = useMemo(
    () => normalizeTimeline(timelineResponse?.data, task, applicantsCount),
    [applicantsCount, task, timelineResponse],
  );
  const selectedProviderName =
    getRequesterTaskProvider(task)?.name || order.provider?.name || "No provider selected";

  const handleClose = () => {
    onClose();
    window.setTimeout(() => {
      setActiveTab("applicants");
      setSelectedApplicant(null);
      setPage(1);
    }, 200);
  };

  const handleSelected = async () => {
    setSelectedApplicant(null);
    setActiveTab("applicants");

    await Promise.allSettled([
      refetchTask(),
      refetchApplicants(),
      refetchTimeline(),
    ]);
  };

  return (
    <>
      <ModalShell open={open} onClose={handleClose} minHeightClass="min-h-0">
        <div className="flex max-h-[88vh] flex-col">
          <div className="shrink-0 px-3 pb-0 pt-6 md:px-6">
            <div className="flex items-start gap-3 pb-4 pr-6 md:gap-4 md:pr-10">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] md:h-11 md:w-11">
                <FileText className="h-5 w-5 text-secondary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h2 className="text-lg font-bold text-[#181d27] md:text-xl">
                    {order.name}
                  </h2>
                  <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[9px] font-bold tracking-wide text-[#535862] md:text-[10px]">
                    {order.id}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-0.5 text-xs font-semibold text-[#15803d]">
                    <Users className="h-3 w-3" />
                    {applicantsCount} Applicants
                  </span>
                  <span className="text-xs text-[#535862]">
                    {selectedProviderName}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-1 bg-[#FFF4ED] p-1 px-3 md:px-6">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm md:py-3 md:px-3 ${
                      active
                        ? "text-secondary"
                        : "text-[#535862] hover:text-secondary"
                    }`}
                  >
                    <div
                      className={`rounded-xl p-1.5 ${
                        active
                          ? "bg-secondary text-white"
                          : "bg-white text-secondary/80"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-100 max-h-100 flex-1 overflow-y-auto px-6 py-4 md:px-12 md:py-6">
            {activeTab === "summary" && (
              <SummaryTab applicantsCount={applicantsCount} task={task} />
            )}
            {activeTab === "applicants" && (
              <ApplicantsTab
                applicants={applicants}
                applicantsMeta={applicantsMeta}
                isLoading={isLoadingApplicants || isFetchingApplicants}
                onPageChange={setPage}
                onViewProfile={setSelectedApplicant}
                selectedApplicationId={task?.selectedApplicationId ?? null}
                usingTaskApplicants={usingTaskApplicants}
              />
            )}
            {activeTab === "timeline" && <TimelineTab timeline={timeline} />}
          </div>

          <div className="flex items-center justify-between border-t border-[#e9eaeb] bg-white px-4 pb-4 pt-3 md:px-6 md:pb-5 md:pt-4">
            <Button
              variant="white"
              onClick={handleClose}
              className="rounded-xl text-xs md:text-sm"
            >
              CLOSE OVERVIEW
            </Button>

            {activeTab !== "applicants" && (
              <Button
                variant="secondary"
                onClick={() => setActiveTab("applicants")}
                className="rounded-xl text-xs md:text-sm"
              >
                <Users className="h-3.5 w-3.5" /> VIEW APPLICANTS
              </Button>
            )}
          </div>
        </div>
      </ModalShell>

      {selectedApplicant && (
        <ReviewApplicationModal
          applicant={selectedApplicant}
          open={!!selectedApplicant}
          order={order}
          onClose={() => setSelectedApplicant(null)}
          onSelected={handleSelected}
        />
      )}
    </>
  );
}

function SummaryTab({
  applicantsCount,
  task,
}: {
  applicantsCount: number;
  task?: RequesterTask;
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <div className="space-y-2 rounded-xl border border-[#e9eaeb] p-3 md:p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#535862] md:text-[10px]">
            Lifecycle Status
          </p>
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-[#15803d] md:h-4 md:w-4" />
            <span className="text-xs font-bold text-[#15803d] md:text-sm">
              {task?.lifecycleStatus?.replaceAll("_", " ") ||
                "WAITING FOR APPLICANTS"}
            </span>
          </div>
          <p className="text-[10px] text-[#9DA4AE] md:text-xs">
            {applicantsCount} provider
            {applicantsCount === 1 ? "" : "s"} applied
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-[#e9eaeb] p-3 md:p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#535862] md:text-[10px]">
            Delivery Deadline
          </p>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-[#6366f1] md:h-4 md:w-4" />
            <span className="text-xs font-bold text-[#181d27] md:text-sm">
              {formatDate(task?.deliveryDeadline) !== "Not available"
                ? formatDate(task?.deliveryDeadline)
                : task?.requestedDeadlineDays
                  ? `${task.requestedDeadlineDays} day window`
                  : "Flexible"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-y border-[#e9eaeb] py-3 md:gap-6 md:py-4">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:mb-2 md:text-[10px]">
            Anchor Text
          </p>
          <p className="text-xs text-[#181d27] md:text-sm">
            {task?.anchorText || "Not provided"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:mb-2 md:text-[10px]">
            Required Domain Rating
          </p>
          <p className="text-xs text-[#181d27] md:text-sm">
            {typeof task?.requiredDomainRating === "number"
              ? `DR ${task.requiredDomainRating}+`
              : "No minimum DR"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:mb-2 md:text-[10px]">
            Selected Provider
          </p>
          <p className="text-xs text-[#181d27] md:text-sm">
            {getRequesterTaskProvider(task)?.name || "Not selected"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:mb-2 md:text-[10px]">
            Target URL
          </p>
          <p className="truncate text-xs text-[#181d27] md:text-sm">
            {task?.targetUrl || "Not provided"}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#535862] md:text-[10px]">
          Placement Guidelines
        </p>
        <p className="text-xs leading-relaxed text-[#535862] md:text-sm">
          {task?.placementGuidelines?.trim() ||
            "No extra placement guidelines were added for this task."}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#FDCFBE] bg-[#FFF4ED] px-3 py-2.5 md:px-4 md:py-3">
        <Shield className="h-3 w-3 shrink-0 text-secondary md:h-4 md:w-4" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary md:text-xs">
          Escrow Protection Active
        </p>
      </div>
    </div>
  );
}

function ApplicantsTab({
  applicants,
  applicantsMeta,
  isLoading,
  onPageChange,
  onViewProfile,
  selectedApplicationId,
  usingTaskApplicants,
}: {
  applicants: RequesterTaskApplicant[];
  applicantsMeta?: RequesterTaskListMeta;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onViewProfile: (applicant: RequesterTaskApplicant) => void;
  selectedApplicationId: string | null;
  usingTaskApplicants: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          { label: "Applicants", value: String(applicants.length) },
          {
            label: "Selected",
            value: selectedApplicationId ? "1" : "0",
          },
          { label: "Source", value: usingTaskApplicants ? "Task" : "List" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#e9eaeb] p-2 text-center md:p-4"
          >
            <p className="text-lg font-bold text-[#181d27] md:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[#9DA4AE] md:text-[10px]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[#e9eaeb] p-8 text-center text-sm text-[#667085]">
          Loading applicants...
        </div>
      ) : applicants.length === 0 ? (
        <div className="rounded-2xl border border-[#e9eaeb] p-8 text-center text-sm text-[#667085]">
          No applicants found yet for this task.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {applicants.map((applicant) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                isSelected={selectedApplicationId === applicant.id}
                onViewProfile={onViewProfile}
              />
            ))}
          </div>

          {!usingTaskApplicants && applicantsMeta && applicantsMeta.totalPages > 1 && (
            <Pagination
              currentPage={applicantsMeta.currentPage ?? applicantsMeta.page ?? 1}
              totalPages={applicantsMeta.totalPages}
              onPageChange={onPageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ApplicantCard({
  applicant,
  isSelected,
  onViewProfile,
}: {
  applicant: RequesterTaskApplicant;
  isSelected: boolean;
  onViewProfile: (applicant: RequesterTaskApplicant) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e9eaeb] bg-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fd751f] text-xs font-bold text-white">
            {getAvatarText(applicant)}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-[#181d27]">
              {getApplicantName(applicant)}
            </p>
            <p className="mt-0.5 text-[10px] text-[#9DA4AE]">
              {getWebsiteLabel(applicant)}
            </p>
          </div>
        </div>
        {isSelected && (
          <span className="rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#027a48]">
            Selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-0.5 text-[8px] font-bold uppercase tracking-widest text-secondary">
            Domain Rating
          </p>
          <p className="text-base font-bold text-[#181d27]">
            {typeof applicant.domainRating === "number"
              ? applicant.domainRating
              : "--"}
          </p>
        </div>
        <div>
          <p className="mb-0.5 text-[8px] font-bold uppercase tracking-widest text-secondary">
            Status
          </p>
          <p className="text-xs font-bold uppercase text-[#181d27]">
            {applicant.status || "APPLIED"}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-[#f9fafb] px-2.5 py-2 text-xs text-[#667085]">
        {applicant.note?.trim() || "No application note provided."}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[#667085]">
        <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
        <span>{typeof applicant.rating === "number" ? applicant.rating.toFixed(1) : "4.8"}</span>
        <span>({typeof applicant.reviews === "number" ? applicant.reviews : 0} reviews)</span>
      </div>

      <button
        onClick={() => onViewProfile(applicant)}
        className="mt-auto flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-secondary/90"
      >
        VIEW PROFILE
      </button>
    </div>
  );
}

function TimelineTab({ timeline }: { timeline: RequesterTaskTimelineEvent[] }) {
  return (
    <div className="space-y-4 py-2 md:space-y-5">
      {timeline.map((event, index) => (
        <div
          key={event.id ?? `${event.label}-${index}`}
          className="flex items-start gap-3 md:gap-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-secondary bg-white md:h-10 md:w-10">
            <Clock className="h-3.5 w-3.5 text-secondary md:h-4 md:w-4" />
          </div>
          <div className="pt-0.5 md:pt-1">
            <p className="text-xs font-semibold text-[#181d27] md:text-sm">
              {event.label ||
                event.eventType?.replaceAll("_", " ") ||
                event.status ||
                "Activity updated"}
            </p>
            <p className="mt-0.5 text-[10px] text-[#9DA4AE] md:mt-1 md:text-xs">
              {formatDateTime(event.createdAt)}
            </p>
            {event.description && (
              <p className="mt-1 text-xs leading-relaxed text-[#667085] md:text-sm">
                {event.description}
              </p>
            )}
            {event.note && (
              <p className="mt-1 text-xs leading-relaxed text-[#667085] md:text-sm">
                {event.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
