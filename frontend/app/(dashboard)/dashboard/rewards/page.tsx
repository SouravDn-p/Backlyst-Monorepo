"use client";

import { Award, Loader2, AlertCircle } from "lucide-react";
import {
  useGetRewardsOverviewQuery,
  useGetAdditionalRewardsQuery
} from "@/redux/features/api/rewards/rewardsApi";

import { RewardsSummaryCards } from "@/components/dashboard/rewards/RewardsSummaryCards";
import { NextAchievement } from "@/components/dashboard/rewards/NextAchievement";
import { ActiveBenefits } from "@/components/dashboard/rewards/ActiveBenefits";
import { BadgeTabs } from "@/components/dashboard/rewards/BadgeTabs";
import { AdditionalRewards } from "@/components/dashboard/rewards/AdditionalRewards";
import { RewardHistory } from "@/components/dashboard/rewards/RewardHistory";

export default function RewardsPage() {
  const { data: overviewResponse, isLoading: isLoadingOverview, isError: isErrorOverview, refetch } = useGetRewardsOverviewQuery();
  const { data: additionalResponse } = useGetAdditionalRewardsQuery();

  if (isLoadingOverview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Loading your achievements...</h2>
        <p className="text-gray-500 mt-2">Fetching your rewards and badges</p>
      </div>
    );
  }

  if (isErrorOverview || !overviewResponse?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-6 max-w-md">
          We couldn't load your rewards and badges. Please try refreshing the page.
        </p>
        <button
          onClick={() => refetch()}
          className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, activeBenefits } = overviewResponse.data;
  const additionalRewards = additionalResponse?.data || [];

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" />
            Rewards & Badges
          </h1>
          <p className="text-gray-600 mt-1">
            Track your achievements, active benefits, and unlock new rewards.
          </p>
        </div>
      </div>

      {/* Top Summary Cards */}
      <RewardsSummaryCards summary={summary} />

      {/* Next Achievement & Active Benefits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <NextAchievement nextBadge={summary.nextBadge} />
        <ActiveBenefits benefits={activeBenefits} />
      </div>

      {/* Badges Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Badges</h2>
        <BadgeTabs />
      </div>

      {/* Additional Rewards */}
      {additionalRewards.length > 0 && (
        <AdditionalRewards rewards={additionalRewards} />
      )}

      {/* Reward History */}
      <RewardHistory />
    </div>
  );
}
