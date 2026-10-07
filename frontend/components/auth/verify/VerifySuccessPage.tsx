"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ChevronRight, ShieldCheck, ExternalLink } from "lucide-react";
import logo from "@/public/backlyst-logo.png";
import Image from "next/image";
import { useGetWebsiteQuery } from "@/redux/features/api/website/websiteApi";
import { WebsiteVerificationStatus } from "@/types/website/websiteTypes";

const VerifySuccessPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const websiteId = searchParams.get("websiteId") || "";

  const {
    data: websiteData,
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useGetWebsiteQuery(websiteId, {
    skip: !websiteId,
    pollingInterval: 5000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const website = websiteData?.data;
  const isVerified =
    website?.verificationStatus === WebsiteVerificationStatus.VERIFIED;
  const hasFailed =
    website?.verificationStatus === WebsiteVerificationStatus.VERIFICATION_FAILED ||
    website?.verificationStatus === WebsiteVerificationStatus.REJECTED;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-[530px] flex flex-col gap-12">
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
        </div>

        {/* Success Card Content */}
        <div className="flex flex-col items-center gap-8 text-center w-full">
          {/* Decorative Top Card */}
          <div className=" flex justify-center items-center w-full h-39.25 bg-indigo border-b border-[#d5d7da] rounded-[22px] relative overflow-hidden shrink-0">
            <ShieldCheck
              size={64}
              className="text-primary w-18 bg-white p-4 rounded-2xl"
            />
          </div>

          <div className="space-y-3 w-full">
            <h1 className="text-[30px] font-semibold font-sora text-[#181d27] leading-[38px]">
              {isVerified
                ? "Website Approved!"
                : hasFailed
                  ? "Verification Failed"
                  : "Verification in Progress"}
            </h1>
            {website?.name && (
              <p className="text-[14px] font-medium text-[#331ffd] font-inter">
                {website.name}
                {website.websiteUrl && (
                  <span className="ml-1 text-[#535862] font-normal">
                    &mdash; {website.websiteUrl}
                  </span>
                )}
              </p>
            )}
            <p className="text-[16px] text-[#535862] font-normal font-inter leading-[24px]">
              {isVerified
                ? "Success! Your website has been verified. You can now start creating tasks offering placement in the marketplace."
                : hasFailed
                  ? "Verification failed. Please try a different verification method or contact support."
                  : "Your verification request has been submitted for review. We’ll notify you once it is approved."}
            </p>
          </div>

          {!websiteId && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              Website ID is missing. Return to the previous step.
            </div>
          )}

          {fetchError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              Failed to check verification status. Please refresh the page.
            </div>
          )}

          <div className="flex items-center gap-12 justify-center w-full">
            <div className="flex flex-col items-center gap-2.5 ">
              <div className=" flex justify-center items-center w-16 h-16  bg-[#E0EAFF]! border-b border-[#d5d7da] rounded-[22px] relative overflow-hidden shrink-0">
                <ShieldCheck
                  size={56}
                  className="text-[#2E1CE6] w-18 bg-[#E0EAFF] p-4 rounded-2xl font-normal"
                />
              </div>
              <span className="text-[14px] font-medium font-inter text-[#717680]">
                Trust Level High
              </span>
            </div>
            <div className="flex flex-col items-center gap-2.5 ">
              <div className=" flex justify-center items-center w-16 h-16  bg-[#E0EAFF]! border-b border-[#d5d7da] rounded-[22px] relative overflow-hidden shrink-0">
                <ExternalLink
                  size={56}
                  className="text-[#392db9] w-18 bg-[#E0EAFF] p-4 rounded-2xl font-normal"
                />
              </div>
              <span className="text-[14px] font-medium font-inter text-[#717680]">
                {website?.verificationStatus
                  ? isVerified
                    ? "Visibility: Active"
                    : hasFailed
                      ? "Visibility: Inactive"
                      : "Visibility: Pending"
                  : "Visibility: Unknown"}
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm text-gray-600">Checking verification status...</span>
              </div>
            ) : isVerified ? (
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 h-auto bg-[#331ffd] cursor-pointer hover:bg-[#2815d6] text-white font-semibold md:text-base rounded-lg shadow-xs transition-all flex gap-2 justify-center uppercase"
              >
                START USING BACKLYST <ChevronRight size={20} />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => refetch()}
                  disabled={isFetching || !websiteId}
                  className="w-full py-3 h-auto bg-[#331ffd] cursor-pointer hover:bg-[#2815d6] text-white font-semibold md:text-base rounded-lg shadow-xs transition-all flex gap-2 justify-center uppercase"
                >
                  {isFetching ? "CHECKING STATUS..." : "CHECK STATUS AGAIN"}
                </Button>
                <button
                  type="button"
                  onClick={() => router.push(`/auth/verify-2?websiteId=${websiteId}`)}
                  className="text-sm font-normal text-[#535862] cursor-pointer uppercase tracking-normal hover:text-gray-800 transition-colors"
                >
                  TRY DIFFERENT METHOD
                </button>
              </>
            )}
            
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-sm font-normal text-[#535862] cursor-pointer uppercase tracking-normal hover:text-gray-800 transition-colors"
            >
              SKIP FOR NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifySuccessPage;
