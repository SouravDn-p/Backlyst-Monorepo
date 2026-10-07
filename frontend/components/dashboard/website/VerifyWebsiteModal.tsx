"use client";

import { useState, useEffect, useRef } from "react";
import {
  Globe,
  Info,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Copy,
  CheckCircle2,
  RefreshCw,
  Code2,
  FileText,
  FileImage,
} from "lucide-react";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell"; 
import {
  useCreateWebsiteMutation,
  useLazyGetMetaTagsQuery,
  useLazyGetWebsiteQuery,
  useRequestDNSVerificationMutation,
  useRequestMetaTagVerificationMutation,
  useRequestScreenshotVerificationMutation,
} from "@/redux/features/api/website/websiteApi";
import {
  Website,
  WebsiteVerification,
  WebsiteVerificationStatus,
  WebsiteVerificationType,
} from "@/types/website/websiteTypes";

type Step = "info" | "verify" | "success";
type VerifyMethod = "dns" | "meta" | "screenshot";

type Props = {
  open: boolean;
  onClose: () => void;
  existingWebsite?: Website | null;
};

const VERIFY_TOKEN = "backlyst-site-verification-bl-hdfysud657567tydhfb";

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getNameFromUrl(value: string) {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, "");
  } catch {
    return value.trim() || "Website";
  }
}

export default function VerifyWebsiteModal({ open, onClose, existingWebsite }: Props) {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Technology");
  const [country, setCountry] = useState("United States");
  const [method, setMethod] = useState<VerifyMethod>("dns");
  const [copied, setCopied] = useState(false);
  const [websiteId, setWebsiteId] = useState("");
  const [metaTag, setMetaTag] = useState("");
  const [dnsTxt, setDnsTxt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [showMethodsOverride, setShowMethodsOverride] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  
  const [createWebsite, { isLoading: isCreatingWebsite }] =
    useCreateWebsiteMutation();
  const [getMetaTags, { isFetching: isFetchingMetaTags }] =
    useLazyGetMetaTagsQuery();
  const [requestDNSVerification, { isLoading: isRequestingDNS }] =
    useRequestDNSVerificationMutation();
  const [requestMetaTagVerification, { isLoading: isRequestingMeta }] =
    useRequestMetaTagVerificationMutation();
  const [requestScreenshotVerification, { isLoading: isRequestingScreenshot }] =
    useRequestScreenshotVerificationMutation();
  const [getWebsite, { isFetching: isFetchingWebsite }] =
    useLazyGetWebsiteQuery();

  const isBusy =
    isCreatingWebsite ||
    isFetchingMetaTags ||
    isRequestingDNS ||
    isRequestingMeta ||
    isRequestingScreenshot ||
    isFetchingWebsite;

  useEffect(() => {
    if (open) {
      setShowMethodsOverride(false);
      if (existingWebsite) {
        setStep("verify");
        setWebsiteId(existingWebsite.id);
        setName(existingWebsite.name);
        setUrl(existingWebsite.websiteUrl);
        setSelectedFile(null);
        
        getMetaTags(existingWebsite.id)
          .unwrap()
          .then((metaResponse) => {
            setMetaTag(metaResponse.data.metaTag);
            setDnsTxt(metaResponse.data.dnsTxt ?? "");
          })
          .catch((err) => {
            console.error("Failed to load existing website verification details:", err);
          });
      }
    }
  }, [open, existingWebsite, getMetaTags]);

  const latestVerification = existingWebsite?.websiteVerifications?.[0];

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("info");
      setName("");
      setUrl("");
      setCategory("Technology");
      setCountry("United States");
      setMethod("dns");
      setCopied(false);
      setWebsiteId("");
      setMetaTag("");
      setDnsTxt("");
      setSelectedFile(null);
      setError("");
    }, 200);
  };
  const handleCopy = () => {
    const token = method === "dns" ? dnsTxt || VERIFY_TOKEN : metaTag || VERIFY_TOKEN;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = async () => {
    setError("");

    try {
      const websiteUrl = normalizeUrl(url);
      const response = await createWebsite({
        name: name.trim() || getNameFromUrl(websiteUrl),
        websiteUrl,
        industry: category,
        country,
      }).unwrap();
      const createdWebsiteId = response.data.id;
      const metaResponse = await getMetaTags(createdWebsiteId).unwrap();

      setWebsiteId(createdWebsiteId);
      setMetaTag(metaResponse.data.metaTag);
      setDnsTxt(metaResponse.data.dnsTxt ?? "");
      setStep("verify");
    } catch (err) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String(err.data.message)
          : "Failed to create website. Please try again.";

      setError(message);
    }
  };

  const handleVerify = async () => {
    if (!websiteId) return;
    setError("");

    try {
      if (method === "dns") {
        const response = await requestDNSVerification({ websiteId }).unwrap();
        setDnsTxt(response.data?.dnsTxtRecord ?? dnsTxt);
      } else if (method === "meta") {
        await requestMetaTagVerification({ websiteId }).unwrap();
      } else if (method === "screenshot") {
        if (!selectedFile) {
          setError("Please select a screenshot file first.");
          return;
        }
        await requestScreenshotVerification({ websiteId, file: selectedFile }).unwrap();
      }

      await getWebsite(websiteId).unwrap();
      setStep("success");
    } catch (err) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String(err.data.message)
          : "Verification request failed. Please try again.";

      setError(message);
    }
  };

  return (
    <ModalShell open={open} onClose={handleClose}>
      <div className="flex flex-col ">
        <div className="px-6 pt-6 pb-5 pr-12">
          <h2 className="text-2xl font-bold text-[#181d27]">
            Connect a Website
          </h2>
          <p className="text-sm text-[#535862] mt-1">
            Add a website to use it for tasks, visibility, and trust scoring.
          </p>
        </div>
        {step === "verify" && (
          latestVerification &&
          !showMethodsOverride &&
          (latestVerification.status === WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW ||
            latestVerification.status === WebsiteVerificationStatus.PENDING) ? (
            <StepVerificationDetails
              verification={latestVerification}
              onReset={() => setShowMethodsOverride(true)}
            />
          ) : (
            <StepVerify
              method={method}
              setMethod={setMethod}
              copied={copied}
              onCopy={handleCopy}
              metaTag={metaTag}
              dnsTxt={dnsTxt}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              triggerFileInput={triggerFileInput}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
            />
          )
        )}
        
        {step === "success" && <StepSuccess url={url} method={method} />}

        {error && (
          <p className="mx-6 mt-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="px-6 pb-6 mt-18 pt-4 border-t border-[#e9eaeb] flex flex-col gap-4 md:flex-row items-center justify-between">
          {step === "info" && (
            <>
              <button
                onClick={handleClose}
                className="text-sm font-semibold text-[#535862] hover:text-[#181d27] tracking-wide transition-colors"
              >
                CANCEL &amp; EXIT
              </button>
              <button
                onClick={handleContinue}
                disabled={!url.trim()}
                className="flex items-center gap-2 bg-secondary hover:bg-[#d94118] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors tracking-wide"
              >
                {isBusy ? "CREATING WEBSITE..." : "CONTINUE TO VERIFICATION"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
          {step === "verify" && (
            latestVerification &&
            !showMethodsOverride &&
            (latestVerification.status === WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW ||
              latestVerification.status === WebsiteVerificationStatus.PENDING) ? (
              <>
                <button
                  onClick={handleClose}
                  className="text-sm font-semibold text-[#535862] hover:text-[#181d27] tracking-wide transition-colors uppercase"
                >
                  Close
                </button>
                <div />
              </>
            ) : (
              <>
                {!existingWebsite ? (
                  <button
                    onClick={() => setStep("info")}
                    className="flex items-center gap-2 text-sm font-semibold text-[#535862] hover:text-[#181d27] tracking-wide transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    BACK TO DETAILS
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={handleVerify}
                  disabled={isBusy || (method === "screenshot" && !selectedFile)}
                  className="flex items-center gap-2 bg-secondary hover:bg-[#d94118] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors tracking-wide"
                >
                  {isBusy ? "REQUESTING..." : "VERIFY WEBSITE"}
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </>
            )
          )}

          {step === "success" && (
            <button
              onClick={handleClose}
              className="w-full bg-secondary hover:bg-[#d94118] text-white font-bold text-sm py-3 rounded-xl transition-colors tracking-wide"
            >
              DONE
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}


type VerifyMethodConfig = {
  id: VerifyMethod;
  label: string;
  icon: React.ReactNode;
};

const VERIFY_METHODS: VerifyMethodConfig[] = [
  { id: "dns", label: "DNS Record", icon: <RefreshCw className="w-6 h-6" /> },
  { id: "meta", label: "Meta Tag", icon: <Code2 className="w-6 h-6" /> },
  { id: "screenshot", label: "Screenshot", icon: <FileImage className="w-6 h-6" /> },
];

const METHOD_CONTENT: Record<
  VerifyMethod,
  { title: string; sub: string; token: string }
> = {
  dns: {
    title: "DNS TXT Configuration",
    sub: "Add this TXT record to your domain DNS",
    token: VERIFY_TOKEN,
  },
  meta: {
    title: "Meta Tag",
    sub: "Add this meta tag to your homepage <head>",
    token: `<meta name="backlyst-site-verification" content="${VERIFY_TOKEN}" />`,
  },
  screenshot: {
    title: "Screenshot Proof",
    sub: "Upload a screenshot of your site admin dashboard",
    token: "",
  },
};

function StepVerify({
  method,
  setMethod,
  copied,
  onCopy,
  metaTag,
  dnsTxt,
  selectedFile,
  setSelectedFile,
  triggerFileInput,
  fileInputRef,
  handleFileChange,
}: {
  method: VerifyMethod;
  setMethod: (v: VerifyMethod) => void;
  copied: boolean;
  onCopy: () => void;
  metaTag: string;
  dnsTxt: string;
  selectedFile: File | null;
  setSelectedFile: (v: File | null) => void;
  triggerFileInput: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const methodContent = METHOD_CONTENT[method];
  const content = {
    ...methodContent,
    token:
      method === "dns"
        ? dnsTxt || methodContent.token
        : metaTag || methodContent.token,
  };
  return (
    <div className="px-6 pb-2 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ECFDF3] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#027A48]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#181d27]">
            Verify Website Ownership
          </span>
        </div>
        <span className="text-[10px] font-bold bg-[#FFF6ED] text-[#B54708] border border-[#FEE6C0] px-3 py-1 rounded-full tracking-widest">
          VERIFICATION PENDING
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {VERIFY_METHODS.map((m) => {
          const active = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${
                active
                  ? "border-[#027A48] bg-white"
                  : "border-[#e9eaeb] bg-[#f9fafb] hover:border-[#9DA4AE]"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  active ? "bg-[#027A48] text-white" : "bg-white text-[#9DA4AE]"
                }`}
              >
                {m.icon}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  active ? "text-[#027A48]" : "text-[#535862]"
                }`}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#181d27] mb-1">
          {content.title}
        </p>
        <p className="text-sm text-[#535862] mb-3">{content.sub}</p>

        {method === "screenshot" ? (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center gap-3 w-full bg-white border border-[#e9eaeb] rounded-xl px-4 py-3">
                <FileImage className="w-8 h-8 text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#181d27] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[#535862]">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center border-2 border-dashed border-[#e9eaeb] rounded-xl p-6 bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={triggerFileInput}
              >
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-[#e9eaeb] mb-3 group-hover:scale-110 transition-transform">
                  <FileImage className="text-secondary" size={20} />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  Click to upload screenshot
                </p>
                <p className="text-xs text-[#535862] mt-1">
                  SVG, PNG, JPG or GIF (max. 800x400px)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 border border-[#e9eaeb] rounded-xl px-4 py-3 bg-[#f9fafb]">
            <code className="flex-1 text-xs text-[#535862] font-mono truncate">
              {content.token}
            </code>
            <button
              onClick={onCopy}
              className="shrink-0 text-[#9DA4AE] hover:text-[#535862] transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-[#027A48]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 bg-[#FEF3F2] border border-[#FDA29B] rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
        <p className="text-sm text-[#B42318] leading-relaxed">
          Propagation can take between 5 minutes and 24 hours depending on your
          host. Automated verification will re-run every hour.
        </p>
      </div>
    </div>
  );
}

function StepSuccess({ url, method }: { url: string; method?: VerifyMethod }) {
  const displayName = url
    ? url.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "NovaAI";

  const isScreenshot = method === "screenshot";

  return (
    <div className="px-6 pb-2 space-y-5">
      <div className="flex flex-col items-center text-center py-4 space-y-3">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isScreenshot ? "bg-[#EFF8FF]" : "bg-[#ECFDF3]"
          }`}
        >
          {isScreenshot ? (
            <ShieldCheck className="w-9 h-9 text-[#175CD3]" />
          ) : (
            <CheckCircle2 className="w-9 h-9 text-[#027A48]" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#181d27]">
            {isScreenshot ? "Verification Request Submitted!" : "Website Connected!"}
          </p>
          <p className="text-sm text-[#535862] mt-1 max-w-sm">
            {isScreenshot
              ? "Your screenshot verification request has been submitted. Our admin team will review and accept it if everything looks correct."
              : "Verification successful. Your domain is now part of the Backlyst verified ecosystem."}
          </p>
        </div>
      </div>

      <div className="border border-[#e9eaeb] rounded-xl px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full border border-[#e9eaeb] bg-[#f9fafb] flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-[#535862]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#181d27] truncate">
            {displayName}
          </p>
          {isScreenshot ? (
            <span className="inline-block mt-1 text-[10px] font-bold text-[#175CD3] bg-[#EFF8FF] border border-[#B2DDFF] px-2.5 py-0.5 rounded-full tracking-wide uppercase">
              STATUS: UNDER REVIEW
            </span>
          ) : (
            <span className="inline-block mt-1 text-[10px] font-bold text-[#027A48] bg-[#ECFDF3] border border-[#6CE9A6] px-2.5 py-0.5 rounded-full tracking-wide uppercase">
              STATUS: VERIFIED
            </span>
          )}
        </div>

       
      </div>

      <div
        className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
          isScreenshot
            ? "bg-[#EFF8FF] border-[#B2DDFF] text-[#175CD3]"
            : "bg-[#ECFDF3] border-[#6CE9A6] text-[#027A48]"
        }`}
      >
        <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isScreenshot ? "text-[#175CD3]" : "text-[#027A48]"}`} />
        <p className="text-sm leading-relaxed">
          {isScreenshot
            ? "Your website is pending manual review. Once verified, you'll be able to access tasks, manage credits, and view trust score metrics."
            : "Verified websites can request or apply for tasks. Each website has its own task history, credits, and visibility metrics to maintain high data integrity."}
        </p>
      </div>
    </div>
  );
}

function StepVerificationDetails({
  verification,
  onReset,
}: {
  verification: WebsiteVerification;
  onReset?: () => void;
}) {
  const getStatusBadge = (status: WebsiteVerificationStatus) => {
    switch (status) {
      case WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW:
        return (
          <span className="text-[10px] font-bold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF] px-3 py-1 rounded-full tracking-widest uppercase">
            Under Review
          </span>
        );
      case WebsiteVerificationStatus.VERIFICATION_FAILED:
      case WebsiteVerificationStatus.REJECTED:
        return (
          <span className="text-[10px] font-bold bg-[#FEF3F2] text-[#B42318] border border-[#FDA29B] px-3 py-1 rounded-full tracking-widest uppercase">
            Failed
          </span>
        );
      case WebsiteVerificationStatus.PENDING:
        return (
          <span className="text-[10px] font-bold bg-[#FFF6ED] text-[#B54708] border border-[#FEE6C0] px-3 py-1 rounded-full tracking-widest uppercase">
            Pending
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-full tracking-widest uppercase">
            {status}
          </span>
        );
    }
  };

  const getMethodLabel = (type: WebsiteVerificationType) => {
    switch (type) {
      case WebsiteVerificationType.SCREENSHOT_URL:
        return "Screenshot Proof";
      case WebsiteVerificationType.DNS_TXT_RECORD:
        return "DNS TXT Record";
      case WebsiteVerificationType.HTML_META_TAG:
        return "HTML Meta Tag";
      default:
        return type;
    }
  };

  const formattedDate = new Date(verification.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isFailed =
    verification.status === WebsiteVerificationStatus.VERIFICATION_FAILED ||
    verification.status === WebsiteVerificationStatus.REJECTED;

  return (
    <div className="px-6 pb-2 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F2F4F7] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#535862]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#181d27]">
            Verification Status
          </span>
        </div>
        {getStatusBadge(verification.status)}
      </div>

      <div className="bg-white border border-[#e9eaeb] rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#535862]">
              Method Used
            </p>
            <p className="font-semibold text-[#181d27] mt-1">
              {getMethodLabel(verification.type)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#535862]">
              Submitted At
            </p>
            <p className="font-semibold text-[#181d27] mt-1">{formattedDate}</p>
          </div>
        </div>

        {verification.screenshotUrl && (
          <div className="border-t border-[#e9eaeb] pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#535862] mb-2">
              Uploaded Screenshot
            </p>
            <a
              href={verification.screenshotUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:underline"
            >
              <FileImage className="w-4 h-4" />
              View Submitted Image
            </a>
          </div>
        )}

        {(verification.rejectReason || verification.errorMessage) && (
          <div className="border-t border-[#e9eaeb] pt-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">
              Reason for Failure
            </p>
            <p className="text-sm text-[#B42318] bg-red-50 border border-red-100 rounded-xl px-4 py-3 leading-relaxed">
              {verification.rejectReason || verification.errorMessage}
            </p>
          </div>
        )}

        {verification.manualReviewNotes && (
          <div className="border-t border-[#e9eaeb] pt-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#535862]">
              Admin Notes
            </p>
            <p className="text-sm text-[#535862] bg-[#f9fafb] border border-[#e9eaeb] rounded-xl px-4 py-3 leading-relaxed">
              {verification.manualReviewNotes}
            </p>
          </div>
        )}
      </div>

      {verification.status === WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW && (
        <div className="flex items-start gap-3 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-[#175CD3] shrink-0 mt-0.5" />
          <p className="text-sm text-[#175CD3] leading-relaxed">
            Your verification request is currently under review. This usually takes
            24-48 hours. We will notify you once the process is complete.
          </p>
        </div>
      )}

      {isFailed && onReset && (
        <button
          onClick={onReset}
          className="w-full bg-[#f9fafb] hover:bg-[#fafafa] text-[#181d27] border border-[#e9eaeb] font-bold text-sm py-3 rounded-xl transition-colors tracking-wide"
        >
          TRY VERIFICATION AGAIN
        </button>
      )}
    </div>
  );
}
