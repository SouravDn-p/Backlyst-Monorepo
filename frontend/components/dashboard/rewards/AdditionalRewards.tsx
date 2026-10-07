import React from "react";
import { Lock, Unlock } from "lucide-react";
import { AdditionalReward } from "@/types/rewards/rewardsTypes";

interface AdditionalRewardsProps {
  rewards: AdditionalReward[];
}

export const AdditionalRewards: React.FC<AdditionalRewardsProps> = ({ rewards }) => {
  if (!rewards || rewards.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Reward Opportunities</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => (
          <div key={reward.code} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors bg-gray-50/50">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
                {reward.status === "ACTIVE" || reward.status === "UNLOCKED" ? (
                  <Unlock className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${reward.status === "ACTIVE" || reward.status === "UNLOCKED"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600"
                }`}>
                {reward.status}
              </span>
            </div>

            <h4 className="font-bold text-gray-900 mb-1">{reward.title}</h4>
            <p className="text-sm text-gray-600 mb-3 min-h-[40px] line-clamp-2">{reward.requirementText}</p>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-indigo-700">Reward: {reward.rewardValueText}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
