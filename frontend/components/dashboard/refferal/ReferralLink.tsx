"use client";

import { useState } from "react";
import { Copy, Share2, CheckCircle2 } from "lucide-react";

import { useGetMeQuery } from "@/redux/features/api/auth/authApi";
import { useGetReferralSummaryQuery } from "@/redux/features/api/refferal/refferalApi";

const ReferralLink = () => {
  const [copied, setCopied] = useState(false);

  const { data: userResponse } = useGetMeQuery();

  const { data: referralSummary, isLoading } = useGetReferralSummaryQuery();

  const referralCode =
    referralSummary?.referralCode ??
    userResponse?.data?.referralCode ??
    "";

  // Backend referral link (may be null)
  const rawReferralLink = referralSummary?.referralLink ?? "";

  // If backend didn't return a link, build one from the referral code
  const referralLink = rawReferralLink
    ? rawReferralLink.replace(
        "/ref/",
        "/auth/register?refferalCode="
      )
    : referralCode
    ? `${window.location.origin}/auth/register?refferalCode=${referralCode}`
    : "Referral code unavailable";

  const handleCopy = async () => {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(referralLink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy referral link:", error);
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Backlyst",
          text: "Join Backlyst using my referral link and start building backlinks.",
          url: referralLink,
        });

        return;
      } catch {
        // User cancelled share dialog
      }
    }

    handleCopy();
  };

  return (
    <div className="bg-white border border-[#e9eaeb] rounded-xl p-6 space-y-4">
      <div>
        <p className="text-sm font-bold text-[#181d27]">
          Your Referral Link
        </p>

        <p className="text-xs text-[#535862] mt-0.5">
          Share this link with potential contributors
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 border border-[#e9eaeb] rounded-lg px-4 py-2.5 text-sm text-[#535862] bg-[#f9fafb] font-mono truncate">
          {isLoading ? "Loading referral link..." : referralLink}
        </div>

        <button
          onClick={handleCopy}
          disabled={!referralCode}
          className="flex items-center gap-2 border border-[#e9eaeb] rounded-lg px-4 py-2.5 text-sm font-semibold text-[#535862] hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-[#027A48]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}

          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <p className="text-xs text-[#9DA4AE]">
        No rewards are granted on signup alone.
      </p>

      <button
        onClick={handleShare}
        disabled={!referralCode}
        className="w-full bg-[#4169E1] hover:bg-[#2952BE] text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Share2 className="w-4 h-4" />
        SHARE
      </button>
    </div>
  );
};

export default ReferralLink;