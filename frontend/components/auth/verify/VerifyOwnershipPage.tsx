"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  Globe,
  Code,
  FileImage,
  ShieldCheck,
} from "lucide-react";
import logo from "@/public/backlyst-logo.png";
import Image from "next/image";
import { 
  useRequestDNSVerificationMutation,
  useRequestMetaTagVerificationMutation,
  useRequestScreenshotVerificationMutation,
  useGetMetaTagsQuery 
} from "@/redux/features/api/website/websiteApi";

type VerifyMethod = "dns" | "meta" | "screenshot";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error != null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data != null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return fallback;
};

const VerifyOwnershipPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const websiteId = searchParams.get("websiteId") || "";

  const [selectedMethod, setSelectedMethod] = useState<VerifyMethod>("meta");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requestDNSVerification, { isLoading: isRequestingDNS }] =
    useRequestDNSVerificationMutation();
  const [requestMetaTagVerification, { isLoading: isRequestingMeta }] =
    useRequestMetaTagVerificationMutation();
  const [
    requestScreenshotVerification,
    { isLoading: isRequestingScreenshot },
  ] = useRequestScreenshotVerificationMutation();

  const {
    data: metaTagsData,
    isLoading: metaTagsLoading,
    isError: isMetaTagsError,
    refetch: refetchMetaTags,
  } = useGetMetaTagsQuery(websiteId, {
    skip: !websiteId,
  });

  const isLoading =
    isRequestingDNS || isRequestingMeta || isRequestingScreenshot;

  const handleSubmit = async () => {
    setError("");

    if (!websiteId) {
      setError("Website ID is missing. Return to the previous step.");
      return;
    }

    if (selectedMethod === "screenshot" && !selectedFile) {
      setError("Select a screenshot before continuing.");
      return;
    }

    try {
      const response =
        selectedMethod === "dns"
          ? await requestDNSVerification({ websiteId }).unwrap()
          : selectedMethod === "meta"
            ? await requestMetaTagVerification({ websiteId }).unwrap()
            : await requestScreenshotVerification({
                websiteId,
                file: selectedFile!,
              }).unwrap();

      if (response.success) {
        const params = new URLSearchParams({ websiteId });
        const verificationId = response.data?.websiteVerificationId;

        if (verificationId) {
          params.set("verificationId", verificationId);
        }

        router.push(`/auth/verify-3?${params.toString()}`);
      } else {
        setError(response.message || "Verification request failed. Please try again.");
      }
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          "Verification request failed. Please try again.",
        ),
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-[664px] flex flex-col gap-12">
        {/* Header with Logo and Breadcrumb */}
        <div className="flex flex-col items-center gap-8 w-full">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Backlyst"
              className="w-14 h-12 object-contain"
              priority
            />
            <span className="text-[28px] font-semibold font-sora text-gray-900">
              backlyst
            </span>
          </Link>

          <div className="w-full flex flex-col gap-3">
            <div
              className="flex flex-col leading-12 md:flex-row
             items-center justify-between w-full"
            >
              <div className="bg-[#fff1e9] border border-[#fea369] px-2 py-1 rounded-[30px] flex items-center justify-center">
                <span className="text-[#fd751f] text-xs font-medium font-inter">
                  STEP 2 OF 3
                </span>
              </div>
              <h2 className="text-[20px] font-semibold font-inter text-[#181d27] text-center">
                Verify Ownership
              </h2>
              <span className="text-[#535862] font-medium font-inter text-sm uppercase text-center w-[160px]">
                NEXT: SITE DETAILS
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#e9eaeb] rounded-full relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[66%] bg-[#fd751f] rounded-full" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-8 w-full">
          <div className=" flex justify-center items-center w-16 h-16  bg-[#E0EAFF]! border-b border-[#d5d7da] rounded-[22px] relative overflow-hidden shrink-0">
            <ShieldCheck
              size={56}
              className="text-[#392db9] w-18 bg-[#E0EAFF] p-4 rounded-2xl font-normal"
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-[30px] font-semibold font-sora text-black leading-[38px]">
              Verify your website
            </h1>
            <p className="text-[16px] text-[#535862] font-normal font-inter leading-[24px]">
              Choose a verification method to prove ownership and activate your
              placement.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isMetaTagsError && (
            <div className="flex w-full items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">
                Failed to load the verification records.
              </p>
              <button
                type="button"
                onClick={() => refetchMetaTags()}
                className="text-sm font-semibold text-red-700 underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="w-full flex flex-col gap-4 text-left">
            {/* HTML Meta Tag Option */}
            <div
              onClick={() => setSelectedMethod("meta")}
              className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedMethod === "meta"
                  ? "bg-white border-[#7a5af8] shadow-xs"
                  : "bg-white border-[#d5d7da] shadow-xs"
              }`}
            >
              <div className="p-0.5 rounded-md">
                {selectedMethod === "meta" ? (
                  <Code className="text-[#7a5af8]" size={24} />
                ) : (
                  <Code className="text-[#717680]" size={24} />
                )}
              </div>
              <div className="flex-1 flex flex-col items-start gap-1">
                <span className="text-[16px] font-semibold font-inter text-[#181d27] leading-[24px]">
                  HTML Meta Tag
                </span>
                <span className="text-[14px] font-normal font-inter text-[#717680] leading-[20px]">
                  Add a {"<meta>"} tag to the {"<head>"} section of your
                  homepage.
                </span>
              </div>
              {selectedMethod === "meta" && (
                <div className="text-[#7a5af8]">
                  <CheckCircle2 size={24} />
                </div>
              )}
            </div>

            {selectedMethod === "meta" && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg bg-white border border-[#d5d7da] shadow-xs">
                <div className="flex-1 flex flex-col gap-2.5">
                  <span className="text-[16px] font-semibold font-inter text-[#181d27] uppercase">
                    COPY AND PASTE THIS CODE:
                  </span>
                  <div
                    className="bg-[#414651] rounded-md p-4 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                    title="Click to copy"
                    onClick={() => {
                      if (metaTagsData?.data?.metaTag) {
                        navigator.clipboard.writeText(metaTagsData.data.metaTag);
                      }
                    }}
                  >
                    <span className="text-[14px] font-normal font-inter text-white break-all">
                      {metaTagsLoading ? "Loading..." : (metaTagsData?.data?.metaTag || "Meta tag not available")}
                    </span>
                  </div>
                  <span className="text-[14px] font-normal font-inter text-[#717680]">
                    Place this in the {"<head>"} section of your index.html
                    file.
                  </span>
                </div>
              </div>
            )}

            {/* DNS TXT Record Option */}
            <div
              onClick={() => setSelectedMethod("dns")}
              className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedMethod === "dns"
                  ? "bg-white border-[#7a5af8] shadow-xs"
                  : "bg-white border-[#d5d7da] shadow-xs"
              }`}
            >
              <div className="p-0.5 rounded-md">
                {selectedMethod === "dns" ? (
                  <Globe className="text-primary" size={24} />
                ) : (
                  <Globe className="text-primary" size={24} />
                )}
              </div>
              <div className="flex-1 flex flex-col items-start gap-1">
                <span className="text-[16px] font-semibold font-inter text-[#181d27] leading-[24px]">
                  DNS TXT Record
                </span>
                <span className="text-[14px] font-normal font-inter text-[#717680] leading-[20px]">
                  Add a TXT record to your DNS configuration.
                </span>
              </div>
              {selectedMethod === "dns" && (
                <div className="text-[#7a5af8]">
                  <CheckCircle2 size={24} />
                </div>
              )}
            </div>

            {selectedMethod === "dns" && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg bg-white border border-[#d5d7da] shadow-xs">
                <div className="flex-1 flex flex-col gap-2.5">
                  <span className="text-[16px] font-semibold font-inter text-[#181d27] uppercase">
                    ADD THIS TXT RECORD:
                  </span>
                  <div
                    className="bg-[#414651] rounded-md p-4 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                    title="Click to copy"
                    onClick={() => {
                      if (metaTagsData?.data?.dnsTxt) {
                        navigator.clipboard.writeText(metaTagsData.data.dnsTxt);
                      }
                    }}
                  >
                    <span className="text-[14px] font-normal font-inter text-white break-all">
                      {metaTagsLoading ? "Loading..." : (metaTagsData?.data?.dnsTxt || "DNS TXT record not available")}
                    </span>
                  </div>
                  <span className="text-[14px] font-normal font-inter text-[#717680]">
                    Add this as a TXT record in your domain provider&apos;s DNS
                    settings.
                  </span>
                </div>
              </div>
            )}

            {/* Screenshot Proof Option */}
            <div
              onClick={() => setSelectedMethod("screenshot")}
              className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedMethod === "screenshot"
                  ? "bg-white border-[#7a5af8] shadow-xs"
                  : "bg-white border-[#331FFD] shadow-xs"
              }`}
            >
              <div className="p-0.5 rounded-md">
                {selectedMethod === "screenshot" ? (
                  <FileImage className="text-primary" size={24} />
                ) : (
                  <FileImage className="text-primary" size={24} />
                )}
              </div>
              <div className="flex-1 flex flex-col items-start gap-1">
                <span className="text-[16px] font-semibold font-inter text-[#181d27] leading-[24px]">
                  Screenshot Proof
                </span>
                <span className="text-[14px] font-normal font-inter text-[#717680] leading-[20px]">
                  Upload a screenshot of your site admin dashboard.
                </span>
              </div>
              {selectedMethod === "screenshot" && (
                <div className="text-[#7a5af8]">
                  <CheckCircle2 size={24} />
                </div>
              )}
            </div>

            {selectedMethod === "screenshot" && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg bg-white border border-[#d5d7da] shadow-xs">
                <div className="w-full flex flex-col gap-4">
                  <div 
                    className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <FileImage className="text-[#7a5af8]" size={20} />
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile
                        ? selectedFile.name
                        : "Click to upload screenshot"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      SVG, PNG, JPG or GIF (max. 800x400px)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        setSelectedFile(event.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex flex-col gap-4">
            <Button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                !websiteId ||
                (selectedMethod !== "screenshot" &&
                  (metaTagsLoading || isMetaTagsError)) ||
                (selectedMethod === "screenshot" && !selectedFile)
              }
              className="w-full py-3 h-auto bg-[#331ffd] cursor-pointer hover:bg-[#2815d6] text-white font-semibold md:text-base rounded-lg shadow-xs transition-all flex gap-2 justify-center uppercase disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "REQUESTING VERIFICATION..." : "CONTINUE TO SITE DETAILS"}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium text-[#535862] cursor-pointer hover:text-gray-800 transition-colors uppercase tracking-widest"
            >
              I&apos;LL DO THIS LATER
            </button>
          </div>

          <p className="text-[14px] text-[#717680] font-normal lowercase">
            verified sites get 40% more task interest
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOwnershipPage;
