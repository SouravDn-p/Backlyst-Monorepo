import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X, ChevronDown, ExternalLink, FileText, CheckCircle2, ShieldX, RefreshCw, Coins, Eye } from "lucide-react";
import {
  useForceWebsiteReverificationMutation,
  useApproveWebsiteVerificationMutation,
  useFlagWebsiteMutation,
  useGetWebsitesQuery,
  useGetWebsiteByIdQuery,
  useRejectWebsiteVerificationMutation,
  type WebsiteListItem,
} from "../redux/feature/website/websiteApi";
import { creditApi } from "../redux/feature/credit/creditApi";
import WebsiteOperationsPanel from "../components/website/WebsiteOperationsPanel";
import { usePermissions } from "../utils/usePermissions";

type CreditAdjustmentMode = "task" | "visibility";
type VerificationDecisionMode = "approve" | "reject";
type WebsiteVerificationStatus =
  | "VERIFIED"
  | "PENDING"
  | "REQUESTED_FOR_MANUAL_REVIEW"
  | "REJECTED";

const WEBSITE_VERIFICATION_STATUSES: WebsiteVerificationStatus[] = [
  "VERIFIED",
  "PENDING",
  "REQUESTED_FOR_MANUAL_REVIEW",
  "REJECTED",
];

const REVIEWABLE_VERIFICATION_STATUSES: WebsiteVerificationStatus[] = [
  "PENDING",
  "REQUESTED_FOR_MANUAL_REVIEW",
];

const isWebsiteVerificationStatus = (
  status: string
): status is WebsiteVerificationStatus =>
  WEBSITE_VERIFICATION_STATUSES.includes(status as WebsiteVerificationStatus);

interface WebsiteRecord {
  id: string;
  displayId: string;
  domain: string;
  name: string;
  localAccount: string;
  verification: WebsiteVerificationStatus;
  verifiedMethod: string | null;
  industry: string | null;
  country: string | null;
  visibility: "VISIBLE" | "GRACE_PERIOD" | "HIDDEN" | string;
  latestVerification: {
    id: string;
    type: string;
    status: string;
    createdAt: string;
  } | null;
}

function shortId(id: string) {
  return id ? id.slice(0, 8).toUpperCase() : "N/A";
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "N/A";
}

function formatPercent(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "N/A";
}

function toRecord(item: WebsiteListItem): WebsiteRecord {
  const url = item.websiteUrl ?? "";
  const latestVerification = item.websiteVerifications?.[0] ?? null;
  const verif: WebsiteVerificationStatus =
    isWebsiteVerificationStatus(item.verificationStatus)
      ? item.verificationStatus
      : "PENDING";

  return {
    id: item.id,
    displayId: shortId(item.id),
    domain: url.replace(/^https?:\/\//, "").toUpperCase(),
    name: item.name,
    localAccount: (item.author?.name ?? "UNKNOWN").toUpperCase(),
    verification: verif,
    verifiedMethod: item.verifiedMethod,
    industry: item.industry,
    country: item.country,
    visibility: item.marketplaceVisibilityStatus ?? "VISIBLE",
    latestVerification: latestVerification
      ? {
          id: latestVerification.id,
          type: latestVerification.type,
          status: latestVerification.status,
          createdAt: latestVerification.createdAt,
        }
      : null,
  };
}
const VISIBILITY_STYLES: Record<string, { bg: string; text: string }> = {
  VISIBLE: { bg: "#EFF6FF", text: "#1447E6" },
  GRACE_PERIOD: { bg: "#FFFBEB", text: "#CA3500" },
  HIDDEN: { bg: "#F3F4F6", text: "#364153" },
};
const VERIF_STYLES: Record<string, { dot: string; text: string }> = {
  VERIFIED: { dot: "#00C950", text: "#00C950" },
  PENDING: { dot: "#FF6900", text: "#FF6900" },
  REQUESTED_FOR_MANUAL_REVIEW: { dot: "#155DFC", text: "#155DFC" },
  REJECTED: { dot: "#FB2C36", text: "#FB2C36" },
};

const VERIF_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  VERIFIED: { bg: "#F0FDF4", text: "#008236" },
  PENDING: { bg: "#FFFBEB", text: "#CA3500" },
  REQUESTED_FOR_MANUAL_REVIEW: { bg: "#EFF6FF", text: "#155DFC" },
  REJECTED: { bg: "#FEF2F2", text: "#C10007" },
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (error as { data?: unknown }).data;

    if (typeof data === "string") {
      return data;
    }

    if (typeof data === "object" && data !== null) {
      const message = (data as { message?: unknown }).message;
      const errorText = (data as { error?: unknown }).error;

      if (Array.isArray(message)) {
        return message.join(" ");
      }

      if (typeof message === "string") {
        return message;
      }

      if (typeof errorText === "string") {
        return errorText;
      }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
// ─── Detail Modal (fetches by id, keeps original layout) ────────────────────
const ProfileModal: React.FC<{ id: string; site: WebsiteRecord; onClose: () => void }> = ({ id, site, onClose }) => {
  const { can } = usePermissions();
  const canUpdate = can("WEBSITES", "canUpdate");

  const { data, isFetching, isError, refetch } = useGetWebsiteByIdQuery(id);
  const [approveWebsiteVerification, { isLoading: isApprovingVerification }] =
    useApproveWebsiteVerificationMutation();
  const [rejectWebsiteVerification, { isLoading: isRejectingVerification }] =
    useRejectWebsiteVerificationMutation();
  const [forceWebsiteReverification, { isLoading: isForcingReverification }] =
    useForceWebsiteReverificationMutation();
  const [flagWebsite, { isLoading: isTogglingFlag }] =
    useFlagWebsiteMutation();
  const [addWebsiteTaskCredits, { isLoading: isAddingTaskCredits }] =
    creditApi.endpoints.addWebsiteTaskCredits.useMutation();
  const [addWebsiteVisibilityCredits, { isLoading: isAddingVisibilityCredits }] =
    creditApi.endpoints.addWebsiteVisibilityCredits.useMutation();
  const [creditAdjustmentMode, setCreditAdjustmentMode] = useState<CreditAdjustmentMode | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditMessage, setCreditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [verificationDecisionMode, setVerificationDecisionMode] =
    useState<VerificationDecisionMode | null>(null);
  const [isForceReverificationOpen, setIsForceReverificationOpen] =
    useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [manualReviewNotes, setManualReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [verificationMessage, setVerificationMessage] =
    useState<{ type: "success" | "error"; text: string } | null>(null);
  const detail = data?.data;
  const moz = detail?.mozAnalytics;
  const isAddingCredits = isAddingTaskCredits || isAddingVisibilityCredits;
  const isSubmittingVerification =
    isApprovingVerification || isRejectingVerification || isForcingReverification;
  const isFlagged = Boolean(detail?.isFlag);

  const domain = (detail?.websiteUrl ?? site.domain).replace(/^https?:\/\//, "").toUpperCase();
  const visibility = detail?.isDeleted
    ? "HIDDEN"
    : detail?.marketplaceVisibilityStatus ?? site.visibility;
  const da = moz?.metrics?.domainAuthority ?? detail?.domainRating ?? null;
  const pageAuthority = moz?.metrics?.pageAuthority ?? null;
  const spamScore = moz?.metrics?.spamScore ?? null;
  const blTotal = moz?.backlink?.totalBacklinks ?? moz?.metrics?.totalBacklinks ?? null;
  const linkingDomains = moz?.backlink?.linkingRootDomains ?? moz?.metrics?.linkingRootDomains ?? null;
  const externalBacklinks = moz?.backlink?.externalBacklinks ?? moz?.metrics?.externalBacklinks ?? null;
  const follow = moz?.dofollowNofollow?.dofollowRefDomainRatio;
  const nofollow = moz?.dofollowNofollow?.nofollowRefDomainRatio;
  const visibilityStyle = VISIBILITY_STYLES[visibility] || VISIBILITY_STYLES.VISIBLE;

  const enriched: WebsiteRecord = {
    ...site,
    domain,
    name: detail?.name ?? site.name,
    verification: (detail?.verificationStatus ?? site.verification) as WebsiteRecord["verification"],
    verifiedMethod: detail?.verifiedMethod ?? site.verifiedMethod,
    industry: detail?.industry ?? site.industry,
    country: detail?.country ?? site.country,
    visibility,
  };  const isReviewableVerification = REVIEWABLE_VERIFICATION_STATUSES.includes(
    enriched.verification
  );
  const verificationBadgeStyle = VERIF_BADGE_STYLES[enriched.verification] || {
    bg: "#F3F4F6",
    text: "#364153",
  };

  const openCreditAdjustment = (mode: CreditAdjustmentMode) => {
    setCreditAdjustmentMode(mode);
    setCreditAmount("");
    setCreditReason("");
    setCreditMessage(null);
  };

  const closeCreditAdjustment = () => {
    if (isAddingCredits) return;
    setCreditAdjustmentMode(null);
    setCreditAmount("");
    setCreditReason("");
    setCreditMessage(null);
  };

  const openForceReverification = () => {
    setIsForceReverificationOpen(true);
    setVerificationMessage(null);
  };

  const closeForceReverification = () => {
    if (isForcingReverification) return;
    setIsForceReverificationOpen(false);
  };

  const openFlagDialog = () => {
    setIsFlagDialogOpen(true);
    setVerificationMessage(null);
  };

  const closeFlagDialog = () => {
    if (isTogglingFlag) return;
    setIsFlagDialogOpen(false);
  };

  const openVerificationDecision = (mode: VerificationDecisionMode) => {
    setVerificationDecisionMode(mode);
    setManualReviewNotes("");
    setRejectionReason("");
    setVerificationMessage(null);
  };

  const closeVerificationDecision = () => {
    if (isSubmittingVerification) return;
    setVerificationDecisionMode(null);
    setManualReviewNotes("");
    setRejectionReason("");
  };

  const handleVerificationDecision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verificationDecisionMode) return;

    const cleanNotes = manualReviewNotes.trim();
    const cleanReason = rejectionReason.trim();

    if (verificationDecisionMode === "reject" && !cleanReason) {
      setVerificationMessage({
        type: "error",
        text: "Rejection reason is required.",
      });
      return;
    }

    try {
      const response =
        verificationDecisionMode === "approve"
          ? await approveWebsiteVerification({
              websiteId: id,
              manualReviewNotes:
                cleanNotes || "Ownership proof reviewed and accepted by admin.",
            }).unwrap()
          : await rejectWebsiteVerification({
              websiteId: id,
              rejectionReason: cleanReason,
              manualReviewNotes:
                cleanNotes || "User needs to submit valid ownership proof.",
            }).unwrap();

      setVerificationMessage({
        type: "success",
        text: response.message,
      });
      setVerificationDecisionMode(null);
      setManualReviewNotes("");
      setRejectionReason("");
      refetch();
    } catch (error) {
      setVerificationMessage({
        type: "error",
        text: getApiErrorMessage(
          error,
          verificationDecisionMode === "approve"
            ? "Website verification approval failed."
            : "Website verification rejection failed."
        ),
      });
    }
  };

  const handleCreditAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creditAdjustmentMode) return;

    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCreditMessage({ type: "error", text: "Positive credit amount is required." });
      return;
    }

    const payload = {
      websiteId: id,
      amount,
      reason: creditReason.trim() || "Compensation after manual review.",
      idempotencyKey: `admin-${creditAdjustmentMode}-${id}-${Date.now()}`,
    };

    try {
      const response =
        creditAdjustmentMode === "task"
          ? await addWebsiteTaskCredits(payload).unwrap()
          : await addWebsiteVisibilityCredits(payload).unwrap();

      const visibilityNote =
        "visibilityDays" in response.data
          ? ` Visibility days: ${response.data.visibilityDays}.`
          : "";

      setCreditMessage({
        type: "success",
        text: `${response.message}. Balance: ${response.data.balanceBefore} -> ${response.data.balanceAfter}.${visibilityNote}`,
      });
      setCreditAdjustmentMode(null);
      setCreditAmount("");
      setCreditReason("");
    } catch (error) {
      setCreditMessage({
        type: "error",
        text: getApiErrorMessage(error, "Credit adjustment failed. Try again."),
      });
    }
  };

  const handleForceReverification = async () => {
    try {
      const response = await forceWebsiteReverification(id).unwrap();

      setVerificationMessage({
        type: "success",
        text: response.message,
      });
      setIsForceReverificationOpen(false);
      refetch();
    } catch (error) {
      setVerificationMessage({
        type: "error",
        text: getApiErrorMessage(
          error,
          "Failed to force website re-verification."
        ),
      });
    }
  };

  const handleFlagToggle = async () => {
    try {
      const response = await flagWebsite(id).unwrap();

      setVerificationMessage({
        type: "success",
        text: response.message,
      });
      setIsFlagDialogOpen(false);
      refetch();
    } catch (error) {
      setVerificationMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to update website flag state."),
      });
    }
  };

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-7 pt-7 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#1F2937] flex items-center justify-center">
                <span className="text-[20px] font-bold text-white">
                  {enriched.domain.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-[#000000] uppercase tracking-wide">
                  {enriched.domain}
                </h2>
                <p className="text-[13px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">
                  {enriched.name || "Asset Governance Oversight"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
              <X size={22} />
            </button>
          </div>
          <div className="border-t border-gray-100" />
          <div className="px-7 py-6 space-y-6">
            {isFetching && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] font-bold text-[#155DFC] uppercase tracking-wide">
                Loading latest website profile...
              </div>
            )}
            {isError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-bold text-red-500 uppercase tracking-wide">
                Failed to load latest website details. Showing registry snapshot.
              </div>
            )}
            {detail && (
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Industry</p>
                  <p className="text-[14px] font-bold text-[#000000] uppercase">{detail.industry || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Country</p>
                  <p className="text-[14px] font-bold text-[#000000] uppercase">{detail.country || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Verification Method</p>
                  <p className="text-[14px] font-bold text-[#000000] uppercase">{detail.verifiedMethod || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Wallet Lock</p>
                  <p className="text-[14px] font-bold text-[#000000] uppercase">{detail.isWalletLock ? "LOCKED" : "UNLOCKED"}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Verification Standing</p>
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[14px] font-bold uppercase"
                  style={{
                    backgroundColor: verificationBadgeStyle.bg,
                    color: verificationBadgeStyle.text,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: verificationBadgeStyle.text }} />
                  {enriched.verification.replaceAll("_", " ")}
                </span>
              </div>
              <div>
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Marketplace Visibility</p>
                <span className="inline-block px-3 py-1.5 rounded-md text-[14px] font-bold uppercase" style={{ backgroundColor: visibilityStyle.bg, color: visibilityStyle.text }}>
                  {enriched.visibility}
                </span>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider">Performance Snapshot</h3>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-1">
                    Live MOZ and marketplace trust signals returned by the backend.
                  </p>
                </div>
                {detail?.mozAnalyticsError && (
                  <span className="rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#C10007]">
                    MOZ unavailable
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 px-4 py-3 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Domain Authority</p>
                  <p className="text-[24px] font-bold text-black leading-tight">{formatNumber(da)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Page Authority</p>
                  <p className="text-[24px] font-bold text-black leading-tight">{formatNumber(pageAuthority)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Backlinks</p>
                  <p className="text-[20px] font-bold text-black leading-tight break-words">{formatNumber(blTotal)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Linking Domains</p>
                  <p className="text-[20px] font-bold text-black leading-tight break-words">{formatNumber(linkingDomains)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">External Backlinks</p>
                  <p className="text-[20px] font-bold text-black leading-tight break-words">{formatNumber(externalBacklinks)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Spam Score</p>
                  <p className="text-[20px] font-bold text-black leading-tight">{formatNumber(spamScore)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-100 px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Follow Ratio</p>
                  <p className="text-[18px] font-bold text-[#008236]">{formatPercent(follow)}</p>
                </div>
                <div className="rounded-lg border border-gray-100 px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nofollow Ratio</p>
                  <p className="text-[18px] font-bold text-gray-500">{formatPercent(nofollow)}</p>
                </div>
              </div>
              {detail?.trust && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-[10px] font-bold text-[#155DFC] uppercase tracking-wider mb-2">Trust Signals</p>
                  <div className="grid grid-cols-2 gap-3 text-[12px] font-bold uppercase text-gray-700">
                    <span>Reliability: {formatNumber(detail.trust.reliabilityScore)}</span>
                    <span>Reputation: {formatNumber(detail.trust.reputationScore)}</span>
                    <span>Completed: {formatNumber(detail.trust.completedInteractions)}</span>
                    <span>Completion: {formatNumber(detail.trust.completionRate)}%</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-4">Governance Enforcement Actions</h3>
              {canUpdate ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => openVerificationDecision("approve")}
                  disabled={isSubmittingVerification || !isReviewableVerification}
                  className="h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#F0FDF4", color: "#008236", border: "1px solid #BBF7D0" }}
                  title={
                    isReviewableVerification
                      ? "Approve this pending verification."
                      : "Only pending or manual-review verifications can be approved."
                  }
                >
                  Approve Verification
                </button>
                <button
                  onClick={() => openVerificationDecision("reject")}
                  disabled={isSubmittingVerification || !isReviewableVerification}
                  className="h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#FEF2F2", color: "#C10007", border: "1px solid #FFA2A2" }}
                  title={
                    isReviewableVerification
                      ? "Reject this pending verification."
                      : "Only pending or manual-review verifications can be rejected."
                  }
                >
                  Reject Verification
                </button>
                <button
                  onClick={() => openCreditAdjustment("task")}
                  disabled={isAddingCredits}
                  className="h-[46px] border border-gray-200 rounded-lg text-[13px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Credits
                </button>
                <button
                  onClick={() => openCreditAdjustment("visibility")}
                  disabled={isAddingCredits}
                  className="h-[46px] border border-gray-200 rounded-lg text-[13px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Visibility Credits
                </button>
        
                <button
                  onClick={openFlagDialog}
                  disabled={isTogglingFlag}
                  className="h-[46px] border border-gray-200 rounded-lg text-[13px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFlagged ? "Unflag Abuse" : "Flag as Abuse"}
                </button>
      
                <button
                  onClick={openForceReverification}
                  disabled={isSubmittingVerification}
                  className="h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#FEF2F2", color: "#C10007", border: "1px solid #FFA2A2" }}
                  title={
                    enriched.verification === "VERIFIED"
                      ? "Mark this website as pending so the owner must verify again."
                      : "Testing enabled. Backend may reject if this website is not verified."
                  }
                >
                  Force Re-Verification
                </button>
              </div>
              ) : (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-amber-700">
                  Read-only access — governance actions are restricted for this admin.
                </div>
              )}
              {!isReviewableVerification && canUpdate && (
                <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[#CA3500]">
                  This website is not currently eligible for manual approve/reject. Backend accepts only pending or requested-for-manual-review verification records.
                </div>
              )}
              {verificationMessage && (
                <div
                  className={`mt-4 rounded-lg border px-4 py-3 text-[12px] font-bold uppercase tracking-wide ${
                    verificationMessage.type === "success"
                      ? "border-green-100 bg-green-50 text-[#008236]"
                      : "border-red-100 bg-red-50 text-[#C10007]"
                  }`}
                >
                  {verificationMessage.text}
                </div>
              )}
              {creditMessage && !creditAdjustmentMode && (
                <div
                  className={`mt-4 rounded-lg border px-4 py-3 text-[12px] font-bold uppercase tracking-wide ${
                    creditMessage.type === "success"
                      ? "border-green-100 bg-green-50 text-[#008236]"
                      : "border-red-100 bg-red-50 text-[#C10007]"
                  }`}
                >
                  {creditMessage.text}
                </div>
              )}
              {creditAdjustmentMode && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeCreditAdjustment} />
                  <form
                    onSubmit={handleCreditAdjustment}
                    className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 pointer-events-auto"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-gray-100">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor:
                              creditAdjustmentMode === "task" ? "#F5F3FF" : "#EFF6FF",
                            color:
                              creditAdjustmentMode === "task" ? "#5B21B6" : "#155DFC",
                          }}
                        >
                          {creditAdjustmentMode === "task" ? (
                            <Coins size={22} />
                          ) : (
                            <Eye size={22} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">
                            {creditAdjustmentMode === "task" ? "Add Credits" : "Add Visibility Credits"}
                          </h4>
                          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-1 leading-relaxed">
                            {enriched.domain} / Website ID: {id}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={closeCreditAdjustment}
                        disabled={isAddingCredits}
                        className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={creditAmount}
                          onChange={(event) => {
                            setCreditAmount(event.target.value);
                            setCreditMessage(null);
                          }}
                          className="w-full h-[44px] border border-gray-200 rounded-lg px-3 text-[14px] font-medium text-gray-700 focus:border-gray-400 transition-colors outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                          Reason
                        </label>
                        <textarea
                          value={creditReason}
                          onChange={(event) => {
                            setCreditReason(event.target.value);
                            setCreditMessage(null);
                          }}
                          rows={3}
                          placeholder="Compensation after manual review."
                          className="w-full border border-gray-200 rounded-lg px-3 py-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-gray-400 transition-colors outline-none resize-none"
                        />
                      </div>

                      {creditMessage?.type === "error" && (
                        <p className="text-[12px] font-bold uppercase tracking-wide text-[#C10007]">
                          {creditMessage.text}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 px-6 pb-6">
                      <button
                        type="button"
                        onClick={closeCreditAdjustment}
                        disabled={isAddingCredits}
                        className="flex-1 h-[44px] border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAddingCredits}
                        className="flex-1 h-[44px] rounded-lg text-[12px] font-bold text-white uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor:
                            creditAdjustmentMode === "task" ? "#5B21B6" : "#155DFC",
                        }}
                      >
                        {isAddingCredits ? "Adding..." : "Confirm Add"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {verificationDecisionMode && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeVerificationDecision} />
                  <form
                    onSubmit={handleVerificationDecision}
                    className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 pointer-events-auto"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-gray-100">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor:
                              verificationDecisionMode === "approve" ? "#F0FDF4" : "#FEF2F2",
                            color:
                              verificationDecisionMode === "approve" ? "#008236" : "#C10007",
                          }}
                        >
                          {verificationDecisionMode === "approve" ? (
                            <CheckCircle2 size={22} />
                          ) : (
                            <ShieldX size={22} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">
                            {verificationDecisionMode === "approve"
                              ? "Approve Verification"
                              : "Reject Verification"}
                          </h4>
                          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-1 leading-relaxed">
                            {enriched.domain} / Website ID: {id}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={closeVerificationDecision}
                        disabled={isSubmittingVerification}
                        className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      {verificationDecisionMode === "reject" && (
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                            Rejection Reason <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(event) => {
                              setRejectionReason(event.target.value);
                              setVerificationMessage(null);
                            }}
                            rows={3}
                            placeholder="Verification proof is invalid or incomplete."
                            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-gray-400 transition-colors outline-none resize-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                          Manual Review Notes
                        </label>
                        <textarea
                          value={manualReviewNotes}
                          onChange={(event) => {
                            setManualReviewNotes(event.target.value);
                            setVerificationMessage(null);
                          }}
                          rows={4}
                          placeholder={
                            verificationDecisionMode === "approve"
                              ? "Ownership proof reviewed and accepted."
                              : "User needs to submit valid ownership proof."
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-gray-400 transition-colors outline-none resize-none"
                        />
                      </div>

                      {verificationMessage?.type === "error" && (
                        <p className="text-[12px] font-bold uppercase tracking-wide text-[#C10007]">
                          {verificationMessage.text}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 px-6 pb-6">
                      <button
                        type="button"
                        onClick={closeVerificationDecision}
                        disabled={isSubmittingVerification}
                        className="flex-1 h-[44px] border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingVerification}
                        className="flex-1 h-[44px] rounded-lg text-[12px] font-bold text-white uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor:
                            verificationDecisionMode === "approve" ? "#008236" : "#C10007",
                        }}
                      >
                        {isSubmittingVerification
                          ? "Submitting..."
                          : verificationDecisionMode === "approve"
                          ? "Confirm Approval"
                          : "Confirm Rejection"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {isForceReverificationOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeForceReverification} />
                  <div
                    className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 pointer-events-auto"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-red-50 text-[#C10007] flex items-center justify-center flex-shrink-0">
                          <RefreshCw size={22} />
                        </div>
                        <div>
                          <h4 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">
                            Force Re-Verification
                          </h4>
                          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-1 leading-relaxed">
                            {enriched.domain} / Website ID: {id}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={closeForceReverification}
                        disabled={isForcingReverification}
                        className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="text-[12px] font-bold text-[#C10007] uppercase tracking-wide leading-relaxed">
                          This will remove the current verified state and set the website back to pending verification.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 p-4">
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Current Status
                          </p>
                          <p className="text-[13px] font-bold text-[#000000] uppercase">
                            {enriched.verification.replaceAll("_", " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Verified Method
                          </p>
                          <p className="text-[13px] font-bold text-[#000000] uppercase">
                            {detail?.verifiedMethod || "N/A"}
                          </p>
                        </div>
                      </div>
                      {verificationMessage?.type === "error" && (
                        <p className="text-[12px] font-bold uppercase tracking-wide text-[#C10007]">
                          {verificationMessage.text}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 px-6 pb-6">
                      <button
                        type="button"
                        onClick={closeForceReverification}
                        disabled={isForcingReverification}
                        className="flex-1 h-[44px] border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleForceReverification}
                        disabled={isForcingReverification}
                        className="flex-1 h-[44px] rounded-lg text-[12px] font-bold text-white uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: "#C10007" }}
                      >
                        {isForcingReverification ? "Submitting..." : "Confirm Re-Verification"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {isFlagDialogOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeFlagDialog} />
                  <div
                    className="relative w-full max-w-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 pointer-events-auto"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-gray-100">
                      <div>
                        <h4 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">
                          {isFlagged ? "Unflag Website" : "Flag Website"}
                        </h4>
                        <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-1 leading-relaxed">
                          {enriched.domain} / Website ID: {id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeFlagDialog}
                        disabled={isTogglingFlag}
                        className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="px-6 py-5">
                      <div
                        className={`rounded-xl border px-4 py-3 ${
                          isFlagged
                            ? "border-green-100 bg-green-50"
                            : "border-red-100 bg-red-50"
                        }`}
                      >
                        <p
                          className={`text-[12px] font-bold uppercase tracking-wide leading-relaxed ${
                            isFlagged ? "text-[#008236]" : "text-[#C10007]"
                          }`}
                        >
                          {isFlagged
                            ? "This will remove the abuse flag from this website."
                            : "This will mark this website as flagged for abuse review."}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 px-6 pb-6">
                      <button
                        type="button"
                        onClick={closeFlagDialog}
                        disabled={isTogglingFlag}
                        className="flex-1 h-[44px] border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleFlagToggle}
                        disabled={isTogglingFlag}
                        className="flex-1 h-[44px] rounded-lg text-[12px] font-bold text-white uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: isFlagged ? "#008236" : "#C10007" }}
                      >
                        {isTogglingFlag
                          ? "Submitting..."
                          : isFlagged
                          ? "Confirm Unflag"
                          : "Confirm Flag"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <FileText size={22} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider">Backend Audit Snapshot</h4>
                  <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-1">
                    Created {formatDate(detail?.createdAt)} / Updated {formatDate(detail?.updatedAt)}
                  </p>
                  <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-1 break-all">
                    Latest Verification ID: {detail?.latestVerificationId || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const WebsitePage = () => {
  const [searchVal, setSearchVal] = useState("");
  const [verifVal, setVerifVal] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; record: WebsiteRecord } | null>(null);

  const { data, isFetching } = useGetWebsitesQuery({ page: 1, limit: 50 });
  const apiItems = data?.data?.data ?? [];
  const WEBSITES = apiItems.map((item) => toRecord(item));
  const filteredWebsites = WEBSITES.filter((site) => {
    const search = searchVal.trim().toLowerCase();
    const matchesSearch = !search || site.domain.toLowerCase().includes(search);
    const matchesVerification = !verifVal || site.verification === verifVal;

    return matchesSearch && matchesVerification;
  });

  const handleApplyFilters = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
  };

  const handleCloseModal = () => setSelectedEntry(null);

  return (
    <div className="w-full font-arimo space-y-6">
      <section>
        <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
          Websites
        </h1>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
          Governance and Monitoring of Websites Linked to Platform Users.
        </p>
      </section>
      <form onSubmit={handleApplyFilters} className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
        <div className="flex-1 min-w-0">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Search Domain
          </label>
          <input
            type="text"
            placeholder="e.g. techdeminor.com"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-[#331FFD] transition-colors"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Verification
          </label>
          <div className="relative">
            <select value={verifVal} onChange={(e) => setVerifVal(e.target.value)} className="w-full h-[44px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors">
              <option value="">ALL STATUSES</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="PENDING">PENDING</option>
              <option value="REQUESTED_FOR_MANUAL_REVIEW">MANUAL REVIEW</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
        <button type="submit" className="h-[44px] bg-[#000000] text-white px-7 rounded-lg text-[13px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex-shrink-0">
          Filter Domains
        </button>
      </form>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#000000]" />
            <h2 className="text-[15px] font-bold text-[#000000] uppercase tracking-[0.05em]">
              Website Registry Ledger
            </h2>
          </div>
          <span className="text-[13px] font-medium text-gray-400 uppercase tracking-wider">
            {filteredWebsites.length} of {WEBSITES.length} Corporate Domains Indexed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[920px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Domain / ID</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Verification</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Industry / Country</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Visibility</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Latest Request</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredWebsites.map((site) => {
                const visibilityStyle = VISIBILITY_STYLES[site.visibility] || VISIBILITY_STYLES.VISIBLE;
                const verifStyle = VERIF_STYLES[site.verification] || {
                  dot: "#9CA3AF",
                  text: "#9CA3AF",
                };

                return (
                  <tr key={site.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <span className="text-[14px] font-bold block leading-tight underline cursor-pointer hover:opacity-80" style={{ color: "#155DFC" }}>
                        {site.domain}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-0.5 block">
                        ID {site.displayId}
                      </span>
                    </td>
                    <td className="px-4 py-5"><span className="text-[13px] font-medium text-gray-700">{site.localAccount}</span></td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: verifStyle.dot }} />
                        <span className="text-[12px] font-bold uppercase" style={{ color: verifStyle.text }}>{site.verification.replaceAll("_", " ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-[12px] font-bold uppercase text-gray-700">{site.verifiedMethod || "N/A"}</td>
                    <td className="px-4 py-5">
                      <span className="text-[13px] font-bold uppercase text-black block">{site.industry || "N/A"}</span>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{site.country || "N/A"}</span>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded inline-block" style={{ backgroundColor: visibilityStyle.bg, color: visibilityStyle.text }}>
                        {site.visibility.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      {site.latestVerification ? (
                        <div>
                          <span className="text-[12px] font-bold uppercase text-gray-700 block">{site.latestVerification.type.replaceAll("_", " ")}</span>
                          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{site.latestVerification.status.replaceAll("_", " ")}</span>
                        </div>
                      ) : (
                        <span className="text-[12px] font-bold uppercase text-gray-300">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-5 text-right pr-6">
                      <button onClick={() => setSelectedEntry({ id: site.id, record: site })} className="text-[12px] font-bold uppercase tracking-wider hover:underline leading-tight" style={{ color: "#155DFC" }}>
                        View<br />Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <WebsiteOperationsPanel />
      {selectedEntry && (
        <ProfileModal id={selectedEntry.id} site={selectedEntry.record} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default WebsitePage;

