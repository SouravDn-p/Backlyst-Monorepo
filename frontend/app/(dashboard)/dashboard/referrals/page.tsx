"use client";

import { Search, Grid3X3 } from "lucide-react";
import { useState } from "react";

import ReferralLink from "@/components/dashboard/refferal/ReferralLink";
import HowRewardsUnlock from "@/components/dashboard/refferal/HowRewardsUnlock";
import ReferralProgressTable from "@/components/dashboard/refferal/ReferralProgressTable";
import LimitsAndCompliance from "@/components/dashboard/refferal/LimitsAndCompliance";
import { useGetReferralSummaryQuery } from "@/redux/features/api/refferal/refferalApi";

export default function ReferralsPage() {
  const [search, setSearch] = useState("");

  const { data: referralSummary } = useGetReferralSummaryQuery();

  const taskCreditsEarned =
    referralSummary?.earnedTaskCredits ?? 0;

  const visibilityCreditsEarned =
    referralSummary?.earnedVisibilityCredits ?? 0;

  const rewardedReferrals =
    referralSummary?.convertedReferrals ?? 0;

  const totalReferrals =
    referralSummary?.totalReferrals ?? 0;

  return (
    <div className="flex flex-col gap-6 font-inter w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row items-start justify-between">
        <div>
          <h1 className="text-xl md:text-[30px] font-semibold font-sora text-[#181d27] leading-none">
            Referrals
          </h1>

          <p className="text-sm font-medium text-[#535862] mt-1">
            Invite real contributors. Rewards unlock as referrals verify,
            contribute, and subscribe.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535862]" />

            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-[#e2e2e2] rounded-full text-sm text-[#535862] focus:outline-none focus:border-[#6366f1] w-60 bg-white placeholder:text-[#9DA4AE]"
            />
          </div>

          <button className="p-2 border border-[#e2e2e2] rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <Grid3X3 className="w-4 h-4 text-[#535862]" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e9eaeb] rounded-xl bg-white overflow-hidden">
        {[
          {
            label: "TASK CREDITS EARNED",
            value: taskCreditsEarned,
            sub: "From referrals only",
          },
          {
            label: "VISIBILITY CREDITS EARNED",
            value: visibilityCreditsEarned,
            sub: "Earned at subscription stage",
          },
          {
            label: "REWARDED REFERRALS",
            value: rewardedReferrals,
            sub: `${totalReferrals} total referrals`,
          },
        ].map((item, index) => (
          <div
            key={item.label}
            className={`p-6 ${
              index < 2 ? "border-r border-[#e9eaeb]" : ""
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#535862]">
              {item.label}
            </p>

            <p className="text-3xl font-bold text-[#181d27] mt-2">
              {item.value}
            </p>

            <p className="text-xs text-[#9DA4AE] mt-1">
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      <ReferralLink />

      <HowRewardsUnlock />

      <ReferralProgressTable />

      <LimitsAndCompliance />
    </div>
  );
}