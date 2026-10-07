"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Globe,
  Link2,
  Loader2,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCreateRequesterTaskMutation,
  useGetRequesterMyWebsitesQuery,
} from "@/redux/features/api/requesterTask/requesterTaskApi";
import {
  RequesterTaskDeadlineDays,
  RequesterTaskLinkAttribute,
  RequesterTaskPlacementType,
  RequesterTaskWalletType,
} from "@/types/requesterTask/requesterTaskTypes";
import { WebsiteVerificationStatus } from "@/types/website/websiteTypes";
import CreateTaskStepOne from "./create-task-modal/CreateTaskStepOne";
import CreateTaskStepTwo from "./create-task-modal/CreateTaskStepTwo";
import CreateTaskStepThree from "./create-task-modal/CreateTaskStepThree";
import type {
  PlacementOption,
  TaskFormField,
  TaskFormValues,
} from "./create-task-modal/types";

interface CreateTaskModalProps {
  onClose: () => void;
}

const DEFAULT_WEBSITE_QUERY = { page: 1, limit: 10 };
const MAX_FILES = 5;

const placementOptions: PlacementOption[] = [
  {
    id: RequesterTaskPlacementType.GUEST_POST,
    icon: <FileText className="w-5 h-5" />,
    label: "Guest Post",
    desc: "Publish a new, original article including your backlink.",
  },
  {
    id: RequesterTaskPlacementType.BACKLINK_INSERTION,
    icon: <Link2 className="w-5 h-5" />,
    label: "Backlink Insertion",
    desc: "Insert your backlink into an existing, relevant article.",
  },
  {
    id: RequesterTaskPlacementType.FLEXIBLE,
    icon: <Zap className="w-5 h-5" />,
    label: "Flexible",
    desc: "Allow publishers to recommend the best placement option.",
    recommended: true,
  },
];

const walletOptions = [
  {
    value: RequesterTaskWalletType.SUBSCRIPTION,
    label: "Subscription Credits",
    description: "Use recurring subscription credits first.",
  },
  {
    value: RequesterTaskWalletType.PURCHASED,
    label: "Purchased Credits",
    description: "Spend purchased credits from your wallet balance.",
  },
  {
    value: RequesterTaskWalletType.REFERRAL,
    label: "Referral Credits",
    description: "Use credits earned from successful referrals.",
  },
  {
    value: RequesterTaskWalletType.EARNED,
    label: "Earned Credits",
    description: "Spend credits earned from completed platform activity.",
  },
];

const linkAttributeOptions = [
  {
    value: RequesterTaskLinkAttribute.DOFOLLOW,
    label: "Dofollow",
    description: "Pass authority and ranking signals to the target URL.",
  },
  {
    value: RequesterTaskLinkAttribute.NOFOLLOW,
    label: "Nofollow",
    description: "Keep the link visible without passing authority.",
  },
  {
    value: RequesterTaskLinkAttribute.UGC,
    label: "UGC",
    description: "Mark the link as user-generated content.",
  },
  {
    value: RequesterTaskLinkAttribute.SPONSORED,
    label: "Sponsored",
    description: "Use when the placement is part of paid sponsorship.",
  },
];

const deadlineOptions = [
  {
    value: RequesterTaskDeadlineDays.THREE,
    label: "3 days",
    description: "Fastest turnaround for urgent campaigns.",
  },
  {
    value: RequesterTaskDeadlineDays.FIVE,
    label: "5 days",
    description: "Short turnaround with more publisher flexibility.",
  },
  {
    value: RequesterTaskDeadlineDays.SEVEN,
    label: "7 days",
    description: "Balanced deadline for most standard tasks.",
  },
  {
    value: RequesterTaskDeadlineDays.TEN,
    label: "10 days",
    description: "More time for content planning and outreach.",
  },
  {
    value: RequesterTaskDeadlineDays.FOURTEEN,
    label: "14 days",
    description: "Ideal for quality-first placements.",
  },
  {
    value: RequesterTaskDeadlineDays.TWENTY_ONE,
    label: "21 days",
    description: "Longer runway for niche or high-DR requests.",
  },
  {
    value: RequesterTaskDeadlineDays.THIRTY,
    label: "30 days",
    description: "Best for broad discovery and premium placements.",
  },
];

const statusStyles: Record<WebsiteVerificationStatus, string> = {
  [WebsiteVerificationStatus.PENDING]: "bg-[#fff6ed] text-[#b54708]",
  [WebsiteVerificationStatus.VERIFIED]: "bg-[#ecfdf3] text-[#027a48]",
  [WebsiteVerificationStatus.VERIFICATION_FAILED]:
    "bg-[#fef3f2] text-[#b42318]",
  [WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW]:
    "bg-[#f2f4f7] text-[#535862]",
  [WebsiteVerificationStatus.APPEALED]: "bg-[#eef4ff] text-[#175cd3]",
  [WebsiteVerificationStatus.REJECTED]: "bg-[#fef3f2] text-[#b42318]",
};

const initialFormValues: TaskFormValues = {
  requesterWebsiteId: "",
  projectTitle: "",
  targetUrl: "",
  anchorText: "",
  placementGuidelines: "",
  requiredDomainRating: "",
  placementType: RequesterTaskPlacementType.FLEXIBLE,
  linkAttribute: RequesterTaskLinkAttribute.DOFOLLOW,
  requestedDeadlineDays: String(RequesterTaskDeadlineDays.SEVEN) as `${RequesterTaskDeadlineDays}`,
  walletType: RequesterTaskWalletType.SUBSCRIPTION,
};

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

function getPlacementLabel(value: RequesterTaskPlacementType): string {
  return (
    placementOptions.find((option) => option.id === value)?.label ?? "Flexible"
  );
}

function getWalletLabel(value: RequesterTaskWalletType): string {
  return (
    walletOptions.find((option) => option.value === value)?.label ??
    "Subscription Credits"
  );
}

function getLinkAttributeLabel(value: RequesterTaskLinkAttribute): string {
  return (
    linkAttributeOptions.find((option) => option.value === value)?.label ??
    "Dofollow"
  );
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const router = useRouter();
  const inputIds = {
    projectTitle: useId(),
    targetUrl: useId(),
    anchorText: useId(),
    requiredDomainRating: useId(),
    placementGuidelines: useId(),
    fileUpload: useId(),
  };

  const [step, setStep] = useState(1);
  const [formValues, setFormValues] = useState<TaskFormValues>(initialFormValues);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<TaskFormField, string>>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastWebsiteErrorMessageRef = useRef<string | null>(null);

  const {
    data: websitesResponse,
    isLoading: isWebsitesLoading,
    isFetching: isWebsitesFetching,
    error: websitesError,
    refetch,
  } = useGetRequesterMyWebsitesQuery({
    ...DEFAULT_WEBSITE_QUERY,
    verificationStatus: WebsiteVerificationStatus.VERIFIED,
  });
  const [createRequesterTask, { isLoading: isSubmitting }] =
    useCreateRequesterTaskMutation();

  const websites = websitesResponse?.data?.data ?? [];
  const websitesErrorMessage = websitesError
    ? getApiErrorMessage(websitesError)
    : null;
  const websiteIdExists = websites.some(
    (website) => website.id === formValues.requesterWebsiteId,
  );
  const resolvedWebsiteId = websiteIdExists
    ? formValues.requesterWebsiteId
    : websites[0]?.id || "";
  const selectedWebsite =
    websites.find((website) => website.id === resolvedWebsiteId) ?? null;

  useEffect(() => {
    if (!websitesErrorMessage) {
      lastWebsiteErrorMessageRef.current = null;
      return;
    }

    if (lastWebsiteErrorMessageRef.current !== websitesErrorMessage) {
      toast.error(websitesErrorMessage);
      lastWebsiteErrorMessageRef.current = websitesErrorMessage;
    }
  }, [websitesErrorMessage]);

  const updateField = <K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const handleFilesAdded = (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;

    setFiles((current) => {
      const combinedFiles = [...current, ...incomingFiles];

      if (combinedFiles.length > MAX_FILES) {
        toast.error(`You can upload up to ${MAX_FILES} support files.`);
        setFieldErrors((errors) => ({
          ...errors,
          files: `You can upload up to ${MAX_FILES} support files.`,
        }));
        return combinedFiles.slice(0, MAX_FILES);
      }

      setFieldErrors((errors) => ({
        ...errors,
        files: undefined,
      }));

      return combinedFiles;
    });

    toast.success(
      `${incomingFiles.length} file${incomingFiles.length > 1 ? "s" : ""} ready to upload.`,
    );
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    handleFilesAdded(Array.from(event.target.files));
    event.target.value = "";
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
    setFieldErrors((errors) => ({
      ...errors,
      files: undefined,
    }));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    handleFilesAdded(Array.from(event.dataTransfer.files));
  };

  const validateStep = (targetStep: number) => {
    const nextErrors: Partial<Record<TaskFormField, string>> = {};

    if (targetStep === 1) {
      if (!resolvedWebsiteId) {
        nextErrors.requesterWebsiteId =
          "Select a requester website before continuing.";
      }

      if (!formValues.projectTitle.trim()) {
        nextErrors.projectTitle = "Project title is required.";
      }
    }

    if (targetStep === 2) {
      if (!formValues.targetUrl.trim()) {
        nextErrors.targetUrl = "Target URL is required.";
      } else if (!isValidUrl(formValues.targetUrl.trim())) {
        nextErrors.targetUrl =
          "Enter a valid URL including http:// or https://.";
      }

      if (!formValues.anchorText.trim()) {
        nextErrors.anchorText = "Anchor text is required.";
      }

      if (formValues.requiredDomainRating.trim()) {
        const requiredDomainRating = Number(formValues.requiredDomainRating);

        if (
          !Number.isInteger(requiredDomainRating) ||
          requiredDomainRating < 1 ||
          requiredDomainRating > 100
        ) {
          nextErrors.requiredDomainRating =
            "Required domain rating must be a whole number between 1 and 100.";
        }
      }

      if (!deadlineOptions.some((option) => String(option.value) === formValues.requestedDeadlineDays)) {
        nextErrors.requestedDeadlineDays =
          "Select a valid requested deadline.";
      }
    }

    if (targetStep === 3 && files.length > MAX_FILES) {
      nextErrors.files = `You can upload up to ${MAX_FILES} support files.`;
    }

    setFieldErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const handleNextStep = () => {
    if (!validateStep(step)) {
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }

    setStep((current) => Math.min(current + 1, 3));
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      setStep(1);
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    if (!validateStep(2)) {
      setStep(2);
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    if (!validateStep(3)) {
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    const loadingToastId = toast.loading("Creating placement task...");
    const targetUrl = formValues.targetUrl.trim();
    const createTaskPayload = {
      requesterWebsiteId: resolvedWebsiteId,
      projectTitle: formValues.projectTitle.trim(),
      targetUrl,
      anchorText: formValues.anchorText.trim(),
      placementGuidelines: formValues.placementGuidelines.trim() || undefined,
      requiredDomainRating: formValues.requiredDomainRating.trim()
        ? Number(formValues.requiredDomainRating)
        : undefined,
      placementType: formValues.placementType,
      linkAttribute: formValues.linkAttribute,
      requestedDeadlineDays: Number(
        formValues.requestedDeadlineDays,
      ) as RequesterTaskDeadlineDays,
      walletType: formValues.walletType,
    };

    try {
      const createTaskResult = await createRequesterTask({
        data: createTaskPayload,
        files,
      }).unwrap();

      toast.dismiss(loadingToastId);
      toast.success(createTaskResult.message || "Task created successfully.");

      window.setTimeout(() => {
        onClose();
      }, 800);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(getApiErrorMessage(error));
    }
  };

  const isTaskSubmissionPending = isSubmitting;

  const openWebsitesPage = () => {
    router.push("/dashboard/websites");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[28px] shadow-[0_32px_80px_rgba(15,23,42,0.18)] w-full max-w-sm md:max-w-5xl max-h-[92vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 border-b border-[#eaecf0] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] leading-none md:text-[40px] font-bold text-[#101828]">
              Create Placement Task
            </h2>
            <p className="text-sm md:text-lg text-[#667085] mt-2">
              Pick a verified website, define the backlink brief, and submit the
              task in one flow.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[#f2f4f7] flex cursor-pointer items-center justify-center hover:bg-[#e4e7ec] transition-colors shrink-0"
            type="button"
            aria-label="Close create task modal"
          >
            <X className="w-5 h-5 text-[#475467]" />
          </button>
        </div>

        <div className="px-5 md:px-8 py-4 bg-[#fff7ed] border-b border-[#fed7aa]">
          <div className="flex items-center gap-1 md:gap-2 w-full overflow-x-auto">
            {[
              { n: 1, label: "SETUP" },
              { n: 2, label: "REQUIREMENTS" },
              { n: 3, label: "REVIEW" },
            ].map(({ n, label }, index) => (
              <div
                key={n}
                className="flex items-center gap-1 md:gap-2 md:w-1/3 shrink-0 md:shrink"
              >
                <div className="flex items-center gap-1 mx-auto">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs md:text-base font-bold transition-colors ${step >= n ? "bg-[#fd751f] text-white" : "bg-white border-2 border-[#e9eaeb] text-secondary"}`}
                  >
                    {n}
                  </div>
                  <span
                    className={`text-xs md:text-base font-bold uppercase tracking-wide hidden sm:inline ${step >= n ? "text-[#fd751f]" : "text-gray-900"}`}
                  >
                    {label}
                  </span>
                </div>
                {index < 2 && (
                  <ArrowRight
                    className={`w-5 md:w-8 h-5 md:h-8 shrink-0 ${step >= n ? "text-[#fd751f]" : "text-gray-900"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 md:px-8 py-3.5 bg-[#f0f4ff] border-b border-[#c7d2fe] flex flex-col md:flex-row items-center justify-between gap-3">
          {selectedWebsite ? (
            <>
              <div className="flex flex-col md:flex-row items-center gap-2 text-center md:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[#6366f1] rounded-full flex items-center justify-center">
                    <Globe className="w-3 h-3 text-white" />
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#6366f1]" />
                </div>
                <div className="text-xs md:text-sm font-semibold text-[#414651]">
                  REQUESTER WEBSITE: {selectedWebsite.name}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs md:text-sm font-bold px-2 py-0.5 rounded shrink-0 uppercase",
                  statusStyles[selectedWebsite.verificationStatus],
                )}
              >
                {selectedWebsite.verificationStatus.replaceAll("_", " ")}
              </span>
            </>
          ) : (
            <div className="text-xs md:text-sm font-semibold text-[#414651]">
              Connect a website first so the task can be attached to your domain.
            </div>
          )}
        </div>

        <div className="p-5 md:p-8">
          {step === 1 && (
            <CreateTaskStepOne
              fieldErrors={fieldErrors}
              formValues={formValues}
              inputIds={{ projectTitle: inputIds.projectTitle }}
              isWebsitesFetching={isWebsitesFetching}
              isWebsitesLoading={isWebsitesLoading}
              openWebsitesPage={openWebsitesPage}
              onRefetchWebsites={refetch}
              onUpdateField={updateField}
              placementOptions={placementOptions}
              resolvedWebsiteId={resolvedWebsiteId}
              selectedWebsite={selectedWebsite}
              statusStyles={statusStyles}
              websites={websites}
              websitesErrorMessage={websitesErrorMessage}
            />
          )}

          {step === 2 && (
            <CreateTaskStepTwo
              deadlineOptions={deadlineOptions}
              fieldErrors={fieldErrors}
              formValues={formValues}
              inputIds={{
                anchorText: inputIds.anchorText,
                placementGuidelines: inputIds.placementGuidelines,
                requiredDomainRating: inputIds.requiredDomainRating,
                targetUrl: inputIds.targetUrl,
              }}
              linkAttributeOptions={linkAttributeOptions}
              onUpdateField={updateField}
              walletOptions={walletOptions}
            />
          )}

          {step === 3 && (
            <CreateTaskStepThree
              dragOver={dragOver}
              fieldErrors={fieldErrors}
              fileInputRef={fileInputRef}
              files={files}
              formValues={formValues}
              inputIds={{ fileUpload: inputIds.fileUpload }}
              linkAttributeLabel={getLinkAttributeLabel(formValues.linkAttribute)}
              maxFiles={MAX_FILES}
              onDragLeave={() => setDragOver(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDrop={handleDrop}
              onFileInputChange={handleFileInput}
              onOpenFilePicker={() => fileInputRef.current?.click()}
              onRemoveFile={handleRemoveFile}
              placementTypeLabel={getPlacementLabel(formValues.placementType)}
              selectedWebsiteName={selectedWebsite?.name || ""}
              walletLabel={getWalletLabel(formValues.walletType)}
            />
          )}
        </div>

        <div className="px-5 md:px-8 py-4 md:py-5 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-white rounded-b-[28px]">
          {step > 1 ? (
            <button
              onClick={() => setStep((current) => current - 1)}
              className="flex cursor-pointer items-center justify-center gap-2 bg-[#f5f5f5] hover:bg-[#e9eaeb] transition-colors text-[#414651] font-bold text-sm md:text-base px-5 md:px-6 py-3 rounded-2xl w-full md:w-auto"
              type="button"
              disabled={isTaskSubmissionPending}
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> PREVIOUS STEP
            </button>
          ) : (
            <div className="w-full md:w-auto" />
          )}

          {step < 3 ? (
            <Button
              variant="secondary"
              onClick={handleNextStep}
              className="w-full md:w-auto text-sm md:text-base px-6 py-3.5 rounded-2xl"
              type="button"
              disabled={
                isTaskSubmissionPending || isWebsitesLoading || websites.length === 0
              }
            >
              CONTINUE TO NEXT STEP <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleSubmit}
              className="w-full md:w-auto text-sm md:text-base px-6 py-3.5 rounded-2xl"
              type="button"
              disabled={isTaskSubmissionPending || websites.length === 0}
            >
              {isTaskSubmissionPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  CREATING TASK...
                </>
              ) : (
                <>
                  CONFIRM & SUBMIT <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
